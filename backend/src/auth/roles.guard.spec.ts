import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { RolesGuard } from './roles.guard';
import { RolUsuario, Usuario } from '../usuarios/usuario.entity';

describe('RolesGuard', () => {
  const ejecutar = async (roles: RolUsuario[], usuario?: Partial<Usuario> | null) => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(roles) } as unknown as Reflector;
    const repo = { findOne: jest.fn().mockResolvedValue(usuario ?? null) } as unknown as Repository<Usuario>;
    const guard = new RolesGuard(reflector, repo);
    const context = { getHandler: jest.fn(), getClass: jest.fn(), switchToHttp: () => ({ getRequest: () => ({ user: { id: 7 } }) }) } as unknown as ExecutionContext;
    return guard.canActivate(context);
  };
  it('permite al administrador entrar a una ruta administrativa', async () => expect(ejecutar([RolUsuario.ADMINISTRADOR], { id: 7, rol: RolUsuario.ADMINISTRADOR, activo: true })).resolves.toBe(true));
  it('rechaza al técnico en una ruta exclusiva del administrador', async () => expect(ejecutar([RolUsuario.ADMINISTRADOR], { id: 7, rol: RolUsuario.TECNICO, activo: true })).rejects.toBeInstanceOf(ForbiddenException));
  it('permite al técnico acceder a rutas compartidas', async () => expect(ejecutar([RolUsuario.ADMINISTRADOR, RolUsuario.TECNICO], { id: 7, rol: RolUsuario.TECNICO, activo: true })).resolves.toBe(true));
  it('rechaza una cuenta desactivada', async () => expect(ejecutar([RolUsuario.TECNICO], { id: 7, rol: RolUsuario.TECNICO, activo: false })).rejects.toBeInstanceOf(ForbiddenException));
});
