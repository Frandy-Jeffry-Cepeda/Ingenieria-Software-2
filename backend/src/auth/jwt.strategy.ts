
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
  sub: number;
  nombre: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'secreto-universitario',
    });
  }

// Eliminamos el uso de any en validate y definimos que el token debe contener sub y nombre. (A.J.A.D)

  validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      nombre: payload.nombre,
    };
  }
}
