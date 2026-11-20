
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entity';

interface JwtPayload {
  sub: number;
  nombre: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectRepository(Usuario) private readonly usuariosRepo: Repository<Usuario>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'secreto-universitario',
    });
  }

  /**
   * Revalida la cuenta en cada petición para revocar inmediatamente sesiones
   * de usuarios desactivados o eliminados, aunque el JWT no haya expirado.
   */
  async validate(payload: JwtPayload) {
    const usuario = await this.usuariosRepo.findOne({
      where: { id: payload.sub },
      select: { id: true, nombre: true, rol: true, activo: true },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('La cuenta está inactiva o ya no existe');
    }

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      rol: usuario.rol,
    };
  }
}
