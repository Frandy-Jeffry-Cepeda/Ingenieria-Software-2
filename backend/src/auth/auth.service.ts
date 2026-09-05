import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario, RolUsuario } from '../usuarios/usuario.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private usuariosRepo: Repository<Usuario>,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const usuario = await this.usuariosRepo.findOne({
      where: { email, rol: RolUsuario.TECNICO },
      select: { id: true, nombre: true, activo: true, passwordHash: true },
    });
    if (!usuario || !usuario.activo || !bcrypt.compareSync(password, usuario.passwordHash)) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const token = this.jwtService.sign({ sub: usuario.id, nombre: usuario.nombre });
    return { token, nombre: usuario.nombre };
  }
}
