import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario, RolUsuario } from '../usuarios/usuario.entity';
import { BitacoraAccesosService, MotivoRechazo } from './bitacora/bitacora-accesos.service';
import { ResultadoAcceso } from './bitacora/registro-acceso.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private usuariosRepo: Repository<Usuario>,
    private jwtService: JwtService,
    private bitacora: BitacoraAccesosService,
  ) {}

  async login(email: string, password: string, ip?: string) {
    const usuario = await this.usuariosRepo.findOne({
      where: { email },
      select: { id: true, nombre: true, activo: true, passwordHash: true, rol: true },
    });
    // E4, paquete 2.4: se identifica el motivo solo para la bitácora; al cliente
    // siempre se le responde lo mismo para no revelar qué cuentas existen.
    let motivo: MotivoRechazo | null = null;
    if (!usuario) motivo = 'cuenta_inexistente';
    else if (!usuario.activo) motivo = 'cuenta_inactiva';
    else if (![RolUsuario.ADMINISTRADOR, RolUsuario.TECNICO].includes(usuario.rol) || !usuario.passwordHash) motivo = 'rol_sin_acceso';
    else if (!bcrypt.compareSync(password, usuario.passwordHash)) motivo = 'contrasena_incorrecta';

    if (motivo) {
      await this.bitacora.registrar({ email, resultado: ResultadoAcceso.FALLIDO, usuarioId: usuario?.id ?? null, motivo, ip });
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const cuenta = usuario as Usuario;
    const token = this.jwtService.sign({ sub: cuenta.id, nombre: cuenta.nombre, rol: cuenta.rol });
    await this.bitacora.registrar({ email, resultado: ResultadoAcceso.EXITO, usuarioId: cuenta.id, ip });
    return { token, nombre: cuenta.nombre, rol: cuenta.rol };
  }

  // E4 - paquete 2.3: validar contraseña actual antes de sustituir el hash.
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    // 1. Comprobar que se recibió la contraseña actual.
    if (
      typeof currentPassword !== 'string' ||
      currentPassword.length === 0
    ) {
      throw new BadRequestException(
        'Debe proporcionar la contraseña actual',
      );
    }

    // 2. Validar la nueva contraseña.
    if (
      typeof newPassword !== 'string' ||
      newPassword.length < 12 ||
      newPassword.length > 72 ||
      Buffer.byteLength(newPassword, 'utf8') > 72
    ) {
      throw new BadRequestException(
        'La nueva contraseña debe tener entre 12 y 72 caracteres y no superar 72 bytes',
      );
    }

    // 3. Buscar al usuario autenticado en PostgreSQL.
    const usuario = await this.usuariosRepo.findOne({
      where: { id: userId },
      select: {
        id: true,
        activo: true,
        passwordHash: true,
      },
    });

    // 4. Comprobar que la cuenta existe y está activa.
    if (!usuario || !usuario.activo || !usuario.passwordHash) {
      throw new UnauthorizedException(
        'Usuario no autorizado',
      );
    }

    // 5. Verificar la contraseña actual.
    const passwordValida = await bcrypt.compare(
      currentPassword,
      usuario.passwordHash,
    );

    if (!passwordValida) {
      throw new UnauthorizedException(
        'La contraseña actual es incorrecta',
      );
    }

    // 6. Impedir reutilizar la contraseña actual.
    const mismaPassword = await bcrypt.compare(
      newPassword,
      usuario.passwordHash,
    );

    if (mismaPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente de la actual',
      );
    }

    // 7. Generar el hash de la nueva contraseña.
    const nuevoHash = await bcrypt.hash(newPassword, 12);

    // 8. Actualizar la contraseña solamente si
    // la cuenta continúa activa.
    const resultado = await this.usuariosRepo.update(
      { id: usuario.id, activo: true },
      { passwordHash: nuevoHash },
    );

    if (resultado.affected !== 1) {
      throw new UnauthorizedException(
        'No fue posible actualizar la contraseña',
      );
    }

    // 9. Confirmar la operación sin revelar contraseñas.
    return {
      message: 'Contraseña actualizada correctamente',
    };
  }
}
