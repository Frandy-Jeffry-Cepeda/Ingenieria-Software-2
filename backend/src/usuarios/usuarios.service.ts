import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario, RolUsuario } from './usuario.entity';
import { Equipo } from '../equipos/equipo.entity';
import { CrearUsuarioDto, ActualizarUsuarioDto } from './usuarios.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario) private usuariosRepo: Repository<Usuario>,
    @InjectRepository(Equipo) private equiposRepo: Repository<Equipo>,
  ) {}

  async listar(rol?: RolUsuario) {
    const usuarios = await this.usuariosRepo.find({
      where: rol ? { rol } : {},
      order: { nombre: 'ASC' },
    });
    const conteos = await this.equiposRepo
      .createQueryBuilder('equipo')
      .select('equipo.usuarioActualId', 'usuarioId')
      .addSelect('COUNT(*)', 'cantidad')
      .where('equipo.usuarioActualId IS NOT NULL')
      .groupBy('equipo.usuarioActualId')
      .getRawMany();
    return usuarios.map((u) => ({
      ...u,
      cantidadEquipos: Number(conteos.find((c) => c.usuarioId === u.id)?.cantidad || 0),
    }));
  }

  async detalle(id: number) {
    const usuario = await this.usuariosRepo.findOneBy({ id });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const equipos = await this.equiposRepo.find({
      where: { usuarioActualId: id },
      order: { id: 'ASC' },
    });
    return { ...usuario, equipos };
  }

  async crear(dto: CrearUsuarioDto) {
    const rol = dto.rol || RolUsuario.EMPLEADO;
    const requierePassword = rol === RolUsuario.ADMINISTRADOR || rol === RolUsuario.TECNICO;
    const password = dto.password;
    if (requierePassword) {
      if (!password) {
        throw new BadRequestException('Un administrador o técnico necesita contraseña');
      }
      this.validarContrasena(password);
    }
    const usuario = this.usuariosRepo.create({
      nombre: dto.nombre,
      email: dto.email,
      departamento: dto.departamento,
      rol,
    });
    if (requierePassword && password) {
      usuario.passwordHash = await bcrypt.hash(password, 12);
    }
    const guardado = await this.guardar(usuario);
    return this.usuariosRepo.findOneBy({ id: guardado.id });
  }
  async actualizar(id: number, dto: ActualizarUsuarioDto) {
    // Incluir passwordHash porque la entidad lo tiene con select: false.
    const usuario = await this.usuariosRepo
      .createQueryBuilder('usuario')
      .addSelect('usuario.passwordHash')
      .where('usuario.id = :id', { id })
      .getOne();

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const nuevoRol = dto.rol ?? usuario.rol;
    const dejaDeSerAdministradorActivo =
      usuario.rol === RolUsuario.ADMINISTRADOR &&
      usuario.activo === true &&
      (nuevoRol !== RolUsuario.ADMINISTRADOR || dto.activo === false);

    // Evitar dejar el sistema sin administradores activos.
    if (dejaDeSerAdministradorActivo) {
      const cantidadAdministradoresActivos = await this.usuariosRepo.count({
        where: {
          rol: RolUsuario.ADMINISTRADOR,
          activo: true,
        },
      });

      if (cantidadAdministradoresActivos <= 1) {
        throw new BadRequestException(
          'No se puede desactivar o cambiar el rol del último administrador activo',
        );
      }
    }

    const requierePassword =
      nuevoRol === RolUsuario.ADMINISTRADOR || nuevoRol === RolUsuario.TECNICO;

    // Un empleado necesita credenciales nuevas al obtener acceso.
    const promocionDesdeEmpleado =
      usuario.rol === RolUsuario.EMPLEADO && requierePassword;

    if (
      requierePassword &&
      (promocionDesdeEmpleado || !usuario.passwordHash) &&
      !dto.password
    ) {
      throw new BadRequestException(
        'Para asignar este rol debes proporcionar una contraseña',
      );
    }

    if (dto.password !== undefined) {
      if (!requierePassword) {
        throw new BadRequestException(
          'Solo los técnicos y administradores pueden tener contraseña',
        );
      }

      this.validarContrasena(dto.password);
      usuario.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    // Actualizar únicamente los campos permitidos.
    if (dto.nombre !== undefined) {
      usuario.nombre = dto.nombre;
    }
    if (dto.email !== undefined) {
      usuario.email = dto.email;
    }
    if (dto.departamento !== undefined) {
      usuario.departamento = dto.departamento;
    }
    if (dto.activo !== undefined) {
      usuario.activo = dto.activo;
    }
    usuario.rol = nuevoRol;

    await this.guardar(usuario);
    // Devolver los datos sin exponer el hash de la contraseña.
    return this.usuariosRepo.findOneBy({ id });
  }

  // Aplicar la misma regla a la creación y al cambio de credenciales.
  private validarContrasena(password: string): void {
    if (password.length < 12 || !password.trim()) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 12 caracteres',
      );
    }

    if (password.length > 72 || Buffer.byteLength(password, 'utf8') > 72) {
      throw new BadRequestException(
        'La contraseña no puede superar 72 caracteres ni 72 bytes',
      );
    }
  }

  private async guardar(usuario: Usuario) {
    try {
      return await this.usuariosRepo.save(usuario);
    } catch (error) {
      if (error.code === '23505') {
        throw new BadRequestException('Ya existe un usuario con ese email');
      }
      throw error;
    }
  }
}
