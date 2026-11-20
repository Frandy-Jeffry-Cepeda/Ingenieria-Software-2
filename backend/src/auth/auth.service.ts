
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario, RolUsuario } from '../usuarios/usuario.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private usuariosRepo: Repository<Usuario>,
    private jwtService: JwtService,
  ) {}

  // ==========================================
  // INICIO DE SESIÓN
  // ==========================================
  async login(email: string, password: string) {
    const usuario = await this.usuariosRepo.findOne({
      where: {
        email,
        rol: RolUsuario.TECNICO,
      },
      select: {
        id: true,
        nombre: true,
        activo: true,
        passwordHash: true,
      },
    });

    if (
      !usuario ||
      !usuario.activo ||
      !usuario.passwordHash ||
      !(await bcrypt.compare(password, usuario.passwordHash))
    ) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const token = this.jwtService.sign({
      sub: usuario.id,
      nombre: usuario.nombre,
    });

    return {
      token,
      nombre: usuario.nombre,
    };
  }

  // ==========================================
  // CAMBIO DE CONTRASEÑA - E4, PAQUETE 2.3
  // ==========================================
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
