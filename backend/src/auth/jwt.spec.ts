import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtStrategy · validate', () => {
  it('convierte el payload del token en el usuario de la petición', async () => {
    const usuariosRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 9,
        nombre: 'Ana',
        rol: 'tecnico',
        activo: true,
      }),
    };

    const estrategia = new JwtStrategy(usuariosRepo as any);

    await expect(
      estrategia.validate({ sub: 9, nombre: 'Ana' }),
    ).resolves.toEqual({
      id: 9,
      nombre: 'Ana',
      rol: 'tecnico',
    });
  });

  it('rechaza usuarios desactivados', async () => {
    const usuariosRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 9,
        nombre: 'Ana',
        rol: 'tecnico',
        activo: false,
      }),
    };

    const estrategia = new JwtStrategy(usuariosRepo as any);

    await expect(
      estrategia.validate({ sub: 9, nombre: 'Ana' }),
    ).rejects.toThrow('La cuenta está inactiva o ya no existe');
  });

  it('rechaza usuarios que ya no existen', async () => {
    const usuariosRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const estrategia = new JwtStrategy(usuariosRepo as any);

    await expect(
      estrategia.validate({ sub: 9, nombre: 'Ana' }),
    ).rejects.toThrow('La cuenta está inactiva o ya no existe');
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
