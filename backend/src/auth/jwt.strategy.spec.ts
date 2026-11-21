import { UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { JwtStrategy } from './jwt.strategy';
import { RolUsuario, Usuario } from '../usuarios/usuario.entity';

describe('JwtStrategy · validación de cuenta activa', () => {
  const crear = (usuario: Partial<Usuario> | null) => {
    const repo = { findOne: jest.fn().mockResolvedValue(usuario) } as unknown as Repository<Usuario>;
    return { strategy: new JwtStrategy(repo), repo };
  };

  it('consulta el usuario y devuelve sus datos actuales', async () => {
    const { strategy, repo } = crear({ id: 7, nombre: 'Técnico actualizado', rol: RolUsuario.TECNICO, activo: true });
    await expect(strategy.validate({ sub: 7, nombre: 'Nombre anterior' })).resolves.toEqual({
      id: 7, nombre: 'Técnico actualizado', rol: RolUsuario.TECNICO,
    });
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 7 }, select: { id: true, nombre: true, rol: true, activo: true },
    });
  });

  it('rechaza un usuario desactivado aunque el JWT siga vigente', async () => {
    const { strategy } = crear({ id: 7, activo: false });
    await expect(strategy.validate({ sub: 7, nombre: 'Técnico' })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza un usuario eliminado', async () => {
    const { strategy } = crear(null);
    await expect(strategy.validate({ sub: 7, nombre: 'Técnico' })).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
