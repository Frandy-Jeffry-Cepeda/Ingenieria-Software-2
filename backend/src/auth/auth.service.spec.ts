
import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { Usuario, RolUsuario } from '../usuarios/usuario.entity';

// ==========================================
// PRUEBAS DE INICIO DE SESIÓN
// E4 - PAQUETE 2.6
// ==========================================

describe('AuthService - login', () => {
  const hash = bcrypt.hashSync('clave-de-prueba', 4);

  const crear = (usuario: Partial<Usuario> | null) => {
    const repo = {
      findOne: jest.fn(async () => usuario),
    } as unknown as Repository<Usuario>;

    const jwt = {
      sign: jest.fn(() => 'token-firmado'),
    } as unknown as JwtService;

    return {
      servicio: new AuthService(repo, jwt),
      repo,
      jwt,
    };
  };

  it('devuelve un token cuando las credenciales son correctas', async () => {
    const { servicio, jwt, repo } = crear({
      id: 5,
      nombre: 'Tecnica',
      activo: true,
      passwordHash: hash,
    });

    await expect(
      servicio.login('t@ti.com', 'clave-de-prueba'),
    ).resolves.toEqual({
      token: 'token-firmado',
      nombre: 'Tecnica',
    });

    expect(jwt.sign).toHaveBeenCalledWith({
      sub: 5,
      nombre: 'Tecnica',
    });

    expect(repo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          email: 't@ti.com',
          rol: RolUsuario.TECNICO,
        },
      }),
    );
  });

  it('rechaza una contraseña incorrecta', async () => {
    const { servicio, jwt } = crear({
      id: 5,
      nombre: 'T',
      activo: true,
      passwordHash: hash,
    });

    await expect(
      servicio.login('t@ti.com', 'otra'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('rechaza a un técnico desactivado', async () => {
    const { servicio } = crear({
      id: 5,
      nombre: 'T',
      activo: false,
      passwordHash: hash,
    });

    await expect(
      servicio.login('t@ti.com', 'clave-de-prueba'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza un correo que no pertenece a ningún técnico', async () => {
    const { servicio } = crear(null);

    await expect(
      servicio.login('nadie@ti.com', 'x'),
    ).rejects.toThrow('Credenciales inválidas');
  });
});

// ==========================================
// PRUEBAS DE CAMBIO DE CONTRASEÑA
// E4 - PAQUETE 2.3
// ==========================================

describe('AuthService - changePassword', () => {
  const passwordActual = 'ClaveActual123!';
  const passwordNueva = 'NuevaClaveSegura2026!';
  const hashActual = bcrypt.hashSync(passwordActual, 4);

  const crear = (
    datos: Partial<Usuario> | null = {
      id: 5,
      activo: true,
      passwordHash: hashActual,
    },
    affected = 1,
  ) => {
    const repoMock = {
      findOne: jest.fn(async () => datos),
      update: jest.fn(async () => ({ affected })),
    };

    const jwtMock = {
      sign: jest.fn(() => 'token-firmado'),
    };

    const servicio = new AuthService(
      repoMock as unknown as Repository<Usuario>,
      jwtMock as unknown as JwtService,
    );

    return {
      servicio,
      repoMock,
    };
  };

  // PRUEBA 1
  it('cambia correctamente la contraseña', async () => {
    const { servicio, repoMock } = crear();

    const resultado = await servicio.changePassword(
      5,
      passwordActual,
      passwordNueva,
    );

    expect(resultado).toEqual({
      message: 'Contraseña actualizada correctamente',
    });

    expect(repoMock.update).toHaveBeenCalledWith(
      { id: 5, activo: true },
      {
        passwordHash: expect.any(String),
      },
    );

   const nuevoHash = (repoMock.update as jest.Mock)
  .mock.calls[0][1].passwordHash as string;

    expect(
      await bcrypt.compare(passwordNueva, nuevoHash),
    ).toBe(true);

    expect(
      await bcrypt.compare(passwordActual, nuevoHash),
    ).toBe(false);
  });

  // PRUEBA 2
  it('rechaza una contraseña actual incorrecta', async () => {
    const { servicio, repoMock } = crear();

    await expect(
      servicio.changePassword(
        5,
        'ClaveIncorrecta123!',
        passwordNueva,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(repoMock.update).not.toHaveBeenCalled();
  });

  // PRUEBA 3
  it('impide reutilizar la contraseña actual', async () => {
    const { servicio, repoMock } = crear();

    await expect(
      servicio.changePassword(
        5,
        passwordActual,
        passwordActual,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repoMock.update).not.toHaveBeenCalled();
  });

  // PRUEBA 4
  it('rechaza el cambio si el usuario está desactivado', async () => {
    const { servicio, repoMock } = crear({
      id: 5,
      activo: false,
      passwordHash: hashActual,
    });

    await expect(
      servicio.changePassword(
        5,
        passwordActual,
        passwordNueva,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(repoMock.update).not.toHaveBeenCalled();
  });

  // PRUEBA 5
  it('rechaza contraseñas nuevas menores de 12 caracteres', async () => {
    const { servicio, repoMock } = crear();

    await expect(
      servicio.changePassword(
        5,
        passwordActual,
        'Corta123!',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repoMock.update).not.toHaveBeenCalled();
  });

  // PRUEBA 6
  it('rechaza contraseñas que superan los 72 bytes', async () => {
    const { servicio, repoMock } = crear();

    const passwordLarga = 'á'.repeat(40);

    await expect(
      servicio.changePassword(
        5,
        passwordActual,
        passwordLarga,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repoMock.update).not.toHaveBeenCalled();
  });

  // PRUEBA 7
  it('rechaza el cambio si la actualización no afecta registros', async () => {
    const { servicio } = crear(
      {
        id: 5,
        activo: true,
        passwordHash: hashActual,
      },
      0,
    );

    await expect(
      servicio.changePassword(
        5,
        passwordActual,
        passwordNueva,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
