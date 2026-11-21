import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { Usuario, RolUsuario } from '../usuarios/usuario.entity';

// Pruebas unitarias del inicio de sesión (E4, paquete 2.6).
describe('AuthService · login', () => {
  const hash = bcrypt.hashSync('clave-de-prueba', 4);
  const crear = (usuario: Partial<Usuario> | null) => {
    const repo = { findOne: jest.fn(async () => usuario) } as unknown as Repository<Usuario>;
    const jwt = { sign: jest.fn(() => 'token-firmado') } as unknown as JwtService;
    return { servicio: new AuthService(repo, jwt), repo, jwt };
  };

  it('devuelve un token con sub y nombre cuando las credenciales son correctas', async () => {
    const { servicio, jwt, repo } = crear({ id: 5, nombre: 'Técnica', activo: true, rol: RolUsuario.TECNICO, passwordHash: hash });
    await expect(servicio.login('t@ti.com', 'clave-de-prueba')).resolves.toEqual({ token: 'token-firmado', nombre: 'Técnica', rol: RolUsuario.TECNICO });
    expect(jwt.sign).toHaveBeenCalledWith({ sub: 5, nombre: 'Técnica', rol: RolUsuario.TECNICO });
    expect(repo.findOne).toHaveBeenCalledWith(expect.objectContaining({ where: { email: 't@ti.com' } }));
  });


  it('permite iniciar sesión a un administrador activo', async () => {
    const { servicio, jwt } = crear({ id: 8, nombre: 'Admin', activo: true, rol: RolUsuario.ADMINISTRADOR, passwordHash: hash });
    await expect(servicio.login('admin@ti.com', 'clave-de-prueba')).resolves.toEqual({ token: 'token-firmado', nombre: 'Admin', rol: RolUsuario.ADMINISTRADOR });
    expect(jwt.sign).toHaveBeenCalledWith({ sub: 8, nombre: 'Admin', rol: RolUsuario.ADMINISTRADOR });
  });

  it('rechaza una contraseña incorrecta', async () => {
    const { servicio, jwt } = crear({ id: 5, nombre: 'T', activo: true, rol: RolUsuario.TECNICO, passwordHash: hash });
    await expect(servicio.login('t@ti.com', 'otra')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('rechaza a un técnico desactivado', async () => {
    const { servicio } = crear({ id: 5, nombre: 'T', activo: false, rol: RolUsuario.TECNICO, passwordHash: hash });
    await expect(servicio.login('t@ti.com', 'clave-de-prueba')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza un correo que no corresponde a ningún técnico, con el mismo mensaje', async () => {
    const { servicio } = crear(null);
    await expect(servicio.login('nadie@ti.com', 'x')).rejects.toThrow('Credenciales inválidas');
  });
});
