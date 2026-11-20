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
    if (requierePassword && !password) {
      throw new BadRequestException('Un administrador o técnico necesita contraseña');
    }
    const usuario = this.usuariosRepo.create({
      nombre: dto.nombre,
      email: dto.email,
      departamento: dto.departamento,
      rol,
    });
    if (requierePassword && password) {
      usuario.passwordHash = bcrypt.hashSync(password, 10);
    }
    const guardado = await this.guardar(usuario);
    return this.usuariosRepo.findOneBy({ id: guardado.id });
  }

  async actualizar(id: number, dto: ActualizarUsuarioDto) {
    const usuario = await this.usuariosRepo.findOneBy({ id });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    Object.assign(usuario, dto);
    await this.guardar(usuario);
    return this.usuariosRepo.findOneBy({ id });
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
