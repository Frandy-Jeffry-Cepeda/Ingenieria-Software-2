import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { RolesGuard } from './roles.guard';
import { RolUsuario, Usuario } from '../usuarios/usuario.entity';

type UsuarioSimulado = Partial<Usuario> | null;

/**
 * Simula un usuario autenticado y permite cambiar el estado de la cuenta
 * en la "base de datos" sin modificar la solicitud ni su sesión.
 */
function preparar(
  rolesPermitidos: RolUsuario[],
  usuarioInicial: UsuarioSimulado,
  rolAnteriorDelToken?: RolUsuario,
) {
  let usuarioEnBaseDeDatos = usuarioInicial;

  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(rolesPermitidos),
  } as unknown as Reflector;

  const usuariosRepo = {
    findOne: jest.fn(async () => usuarioEnBaseDeDatos),
  } as unknown as Repository<Usuario>;

  const guard = new RolesGuard(reflector, usuariosRepo);

  // Se mantiene exactamente la misma petición autenticada entre comprobaciones.
  // El guard debe usar el rol de la BD, NO el rol antiguo de la sesión/JWT.
  const solicitud = {
    user: { id: 7, rol: rolAnteriorDelToken },
  };

  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => solicitud }),
  } as unknown as ExecutionContext;

  return {
    guard,
    context,
    usuariosRepo,
    cambiarUsuarioEnBaseDeDatos: (nuevoUsuario: UsuarioSimulado) => {
      usuarioEnBaseDeDatos = nuevoUsuario;
    },
  };
}

describe('RolesGuard', () => {
  it('permite al administrador entrar a una ruta administrativa', async () => {
    const { guard, context } = preparar(
      [RolUsuario.ADMINISTRADOR],
      { id: 7, rol: RolUsuario.ADMINISTRADOR, activo: true },
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rechaza al técnico en una ruta exclusiva del administrador', async () => {
    const { guard, context } = preparar(
      [RolUsuario.ADMINISTRADOR],
      { id: 7, rol: RolUsuario.TECNICO, activo: true },
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('permite al técnico acceder a rutas compartidas', async () => {
    const { guard, context } = preparar(
      [RolUsuario.ADMINISTRADOR, RolUsuario.TECNICO],
      { id: 7, rol: RolUsuario.TECNICO, activo: true },
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rechaza una cuenta desactivada', async () => {
    const { guard, context } = preparar(
      [RolUsuario.TECNICO],
      { id: 7, rol: RolUsuario.TECNICO, activo: false },
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('revoca permisos administrativos tras degradar a un administrador, sin cambiar su sesión', async () => {
    const { guard, context, cambiarUsuarioEnBaseDeDatos, usuariosRepo } = preparar(
      [RolUsuario.ADMINISTRADOR],
      { id: 7, rol: RolUsuario.ADMINISTRADOR, activo: true },
      RolUsuario.ADMINISTRADOR,
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);

    cambiarUsuarioEnBaseDeDatos({
      id: 7,
      rol: RolUsuario.TECNICO,
      activo: true,
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(usuariosRepo.findOne).toHaveBeenCalledTimes(2);
  });

  it('concede permisos administrativos tras ascender a un técnico, sin cambiar su sesión', async () => {
    const { guard, context, cambiarUsuarioEnBaseDeDatos } = preparar(
      [RolUsuario.ADMINISTRADOR],
      { id: 7, rol: RolUsuario.TECNICO, activo: true },
      RolUsuario.TECNICO,
    );

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    cambiarUsuarioEnBaseDeDatos({
      id: 7,
      rol: RolUsuario.ADMINISTRADOR,
      activo: true,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('revoca el acceso al desactivar una cuenta durante su sesión', async () => {
    const { guard, context, cambiarUsuarioEnBaseDeDatos } = preparar(
      [RolUsuario.TECNICO],
      { id: 7, rol: RolUsuario.TECNICO, activo: true },
      RolUsuario.TECNICO,
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);

    cambiarUsuarioEnBaseDeDatos({
      id: 7,
      rol: RolUsuario.TECNICO,
      activo: false,
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
