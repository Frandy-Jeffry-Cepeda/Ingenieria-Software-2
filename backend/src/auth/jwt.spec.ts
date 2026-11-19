import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtStrategy · validate', () => {
  it('convierte el payload del token en el usuario de la petición', () => {
    const estrategia = new JwtStrategy();
    expect(estrategia.validate({ sub: 9, nombre: 'Ana' })).toEqual({ id: 9, nombre: 'Ana' });
  });
});

describe('JwtAuthGuard', () => {
  const contexto = { getHandler: () => null, getClass: () => null } as unknown as ExecutionContext;

  it('deja pasar sin token las rutas marcadas como públicas', () => {
    const reflector = { getAllAndOverride: jest.fn(() => true) } as unknown as Reflector;
    expect(new JwtAuthGuard(reflector).canActivate(contexto)).toBe(true);
  });

  it('delega en la estrategia JWT las rutas que no son públicas', () => {
    const reflector = { getAllAndOverride: jest.fn(() => false) } as unknown as Reflector;
    const guardia = new JwtAuthGuard(reflector);
    const padre = Object.getPrototypeOf(JwtAuthGuard.prototype);
    const espia = jest.spyOn(padre, 'canActivate').mockReturnValue(false);
    expect(guardia.canActivate(contexto)).toBe(false);
    expect(espia).toHaveBeenCalledWith(contexto);
    espia.mockRestore();
  });
});
