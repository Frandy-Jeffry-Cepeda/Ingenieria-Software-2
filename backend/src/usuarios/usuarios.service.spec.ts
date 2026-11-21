import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UsuariosService } from './usuarios.service';
import { Usuario, RolUsuario } from './usuario.entity';
import { Equipo } from '../equipos/equipo.entity';

function crear(
  opciones: {
    guardarFalla?: unknown;
    usuario?: Partial<Usuario> | null;
    administradoresActivos?: number;
  } = {},
) {
  const guardados: Partial<Usuario>[] = [];

  const usuarioActual: Partial<Usuario> | null =
    opciones.usuario === undefined
      ? { id: 1, nombre: 'Ana', rol: RolUsuario.EMPLEADO }
      : opciones.usuario;

  const usuariosQueryBuilder = {
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(async () => usuarioActual),
  };

  const usuariosRepo = {
    find: jest.fn(async () => [
      { id: 1, nombre: 'Ana' },
      { id: 2, nombre: 'Luis' },
    ]),
    findOneBy: jest.fn(async () => usuarioActual),
    createQueryBuilder: jest.fn(() => usuariosQueryBuilder),
    count: jest.fn(async () => opciones.administradoresActivos ?? 1),
    create: jest.fn((datos: Partial<Usuario>) => ({ ...datos })),
    save: jest.fn(async (usuario: Partial<Usuario>) => {
      if (opciones.guardarFalla) throw opciones.guardarFalla;
      guardados.push({ ...usuario });
      return { id: 7, ...usuario };
    }),
  } as unknown as Repository<Usuario>;

  const equiposQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(async () => [
      { usuarioId: 1, cantidad: '2' },
    ]),
  };

  const equiposRepo = {
    createQueryBuilder: jest.fn(() => equiposQueryBuilder),
    find: jest.fn(async () => [{ id: 10 }]),
  } as unknown as Repository<Equipo>;

  return {
    servicio: new UsuariosService(usuariosRepo, equiposRepo),
    guardados,
    usuariosRepo,
  };
}

describe('UsuariosService', () => {
  it('lista usuarios con la cantidad de equipos asignados a cada uno', async () => {
    const lista = await crear().servicio.listar();
    expect(lista).toEqual([
      { id: 1, nombre: 'Ana', cantidadEquipos: 2 },
      { id: 2, nombre: 'Luis', cantidadEquipos: 0 },
    ]);
  });

  it('crea un empleado por defecto, sin contraseña', async () => {
    const { servicio, guardados } = crear();
    await servicio.crear({ nombre: 'Pedro', email: 'p@e.com' });
    expect(guardados[0].rol).toBe(RolUsuario.EMPLEADO);
    expect(guardados[0].passwordHash).toBeUndefined();
  });

  it('exige contraseña para crear un técnico', async () => {
    await expect(
      crear().servicio.crear({
        nombre: 'T',
        email: 't@e.com',
        rol: RolUsuario.TECNICO,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exige contraseña para crear un administrador', async () => {
    await expect(
      crear().servicio.crear({
        nombre: 'A',
        email: 'a@e.com',
        rol: RolUsuario.ADMINISTRADOR,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('guarda la contraseña de un técnico cifrada con bcrypt, nunca en claro', async () => {
    const { servicio, guardados } = crear();
    await servicio.crear({
      nombre: 'T',
      email: 't@e.com',
      rol: RolUsuario.TECNICO,
      password: 'segura-12345',
    });
    expect(guardados[0].passwordHash).not.toBe('segura-12345');
    expect(bcrypt.compareSync('segura-12345', guardados[0].passwordHash!)).toBe(true);
  });

  it('traduce el correo duplicado (código 23505) en un error 400', async () => {
    const { servicio } = crear({ guardarFalla: { code: '23505' } });
    await expect(
      servicio.crear({ nombre: 'A', email: 'a@e.com' }),
    ).rejects.toThrow('Ya existe un usuario con ese email');
  });

  it('propaga cualquier otro error de la base de datos', async () => {
    const { servicio } = crear({ guardarFalla: new Error('caída') });
    await expect(
      servicio.crear({ nombre: 'A', email: 'a@e.com' }),
    ).rejects.toThrow('caída');
  });

  it('responde 404 al consultar o actualizar un usuario inexistente', async () => {
    const { servicio } = crear({ usuario: null });
    await expect(servicio.detalle(99)).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      servicio.actualizar(99, { activo: false }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('el detalle incluye los equipos que el usuario tiene asignados', async () => {
    await expect(crear().servicio.detalle(1)).resolves.toEqual({
      id: 1,
      nombre: 'Ana',
      rol: RolUsuario.EMPLEADO,
      equipos: [{ id: 10 }],
    });
  });

  it('exige contraseña al convertir un empleado en técnico', async () => {
    const { servicio } = crear({
      usuario: { id: 3, rol: RolUsuario.EMPLEADO },
    });

    await expect(
      servicio.actualizar(3, { rol: RolUsuario.TECNICO }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cifra la contraseña al convertir un empleado en técnico', async () => {
    const { servicio, guardados } = crear({
      usuario: { id: 3, rol: RolUsuario.EMPLEADO },
    });

    await servicio.actualizar(3, {
      rol: RolUsuario.TECNICO,
      password: 'segura-12345',
    });

    expect(guardados[0].rol).toBe(RolUsuario.TECNICO);
    expect(guardados[0].passwordHash).not.toBe('segura-12345');
    expect(bcrypt.compareSync('segura-12345', guardados[0].passwordHash!)).toBe(true);
  });

  it('conserva la contraseña al cambiar un técnico a administrador', async () => {
    const hashOriginal = bcrypt.hashSync('clave-original-123', 10);
    const { servicio, guardados } = crear({
      usuario: {
        id: 4,
        rol: RolUsuario.TECNICO,
        passwordHash: hashOriginal,
      },
    });

    await servicio.actualizar(4, { rol: RolUsuario.ADMINISTRADOR });

    expect(guardados[0].rol).toBe(RolUsuario.ADMINISTRADOR);
    expect(guardados[0].passwordHash).toBe(hashOriginal);
  });

  it('rechaza contraseñas que superan 72 bytes', async () => {
    const { servicio } = crear({
      usuario: { id: 5, rol: RolUsuario.EMPLEADO },
    });

    await expect(
      servicio.actualizar(5, {
        rol: RolUsuario.TECNICO,
        password: 'á'.repeat(40),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('impide desactivar al último administrador activo', async () => {
    const { servicio, guardados } = crear({
      usuario: {
        id: 7,
        rol: RolUsuario.ADMINISTRADOR,
        activo: true,
        passwordHash: 'hash-existente',
      },
      administradoresActivos: 1,
    });

    await expect(
      servicio.actualizar(7, { activo: false }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(guardados).toHaveLength(0);
  });

  it('impide cambiar el rol del último administrador activo', async () => {
    const { servicio, guardados } = crear({
      usuario: {
        id: 7,
        rol: RolUsuario.ADMINISTRADOR,
        activo: true,
        passwordHash: 'hash-existente',
      },
      administradoresActivos: 1,
    });

    await expect(
      servicio.actualizar(7, { rol: RolUsuario.TECNICO }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(guardados).toHaveLength(0);
  });

  it('permite desactivar un administrador cuando existe otro activo', async () => {
    const { servicio, guardados } = crear({
      usuario: {
        id: 7,
        rol: RolUsuario.ADMINISTRADOR,
        activo: true,
        passwordHash: 'hash-existente',
      },
      administradoresActivos: 2,
    });

    await servicio.actualizar(7, { activo: false });

    expect(guardados[0].activo).toBe(false);
    expect(guardados[0].rol).toBe(RolUsuario.ADMINISTRADOR);
  });

  it('permite editar el nombre del último administrador activo', async () => {
    const { servicio, guardados, usuariosRepo } = crear({
      usuario: {
        id: 7,
        nombre: 'Administrador',
        rol: RolUsuario.ADMINISTRADOR,
        activo: true,
        passwordHash: 'hash-existente',
      },
      administradoresActivos: 1,
    });

    await servicio.actualizar(7, { nombre: 'Administrador actualizado' });

    expect(guardados[0].nombre).toBe('Administrador actualizado');
    expect(usuariosRepo.count).not.toHaveBeenCalled();
  });


  it.each([RolUsuario.TECNICO, RolUsuario.ADMINISTRADOR])(
    'rechaza una contraseña de menos de 12 caracteres al crear %s',
    async (rol) => {
      const { servicio, guardados } = crear();
      await expect(
        servicio.crear({
          nombre: 'Usuario QA',
          email: 'qa@example.test',
          rol,
          password: 'corta123',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(guardados).toHaveLength(0);
    },
  );

  it('rechaza una contraseña de solo espacios al crear un técnico', async () => {
    const { servicio, guardados } = crear();
    await expect(
      servicio.crear({
        nombre: 'Técnico QA',
        email: 'tecnico@example.test',
        rol: RolUsuario.TECNICO,
        password: ' '.repeat(12),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(guardados).toHaveLength(0);
  });

  it('rechaza al crear una contraseña que excede 72 bytes en UTF-8', async () => {
    const { servicio, guardados } = crear();
    await expect(
      servicio.crear({
        nombre: 'Técnico QA',
        email: 'tecnico@example.test',
        rol: RolUsuario.TECNICO,
        password: 'á'.repeat(37), // 37 caracteres, 74 bytes.
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(guardados).toHaveLength(0);
  });

  it('rechaza más de 72 caracteres al crear un administrador', async () => {
    const { servicio, guardados } = crear();
    await expect(
      servicio.crear({
        nombre: 'Administrador QA',
        email: 'admin@example.test',
        rol: RolUsuario.ADMINISTRADOR,
        password: 'A'.repeat(73),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(guardados).toHaveLength(0);
  });

  it('permite el límite mínimo de 12 caracteres al crear un administrador', async () => {
    const { servicio, guardados } = crear();
    const password = 'Segura-12345'; // 12 caracteres.
    await servicio.crear({
      nombre: 'Administrador QA',
      email: 'admin@example.test',
      rol: RolUsuario.ADMINISTRADOR,
      password,
    });
    expect(guardados).toHaveLength(1);
    expect(guardados[0].passwordHash).not.toBe(password);
    expect(bcrypt.compareSync(password, guardados[0].passwordHash!)).toBe(true);
  });

  it('rechaza una contraseña corta al promover un empleado a técnico', async () => {
    const { servicio, guardados } = crear({
      usuario: { id: 3, rol: RolUsuario.EMPLEADO },
    });
    await expect(
      servicio.actualizar(3, {
        rol: RolUsuario.TECNICO,
        password: 'corta123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(guardados).toHaveLength(0);
  });

  it('rechaza una contraseña corta al cambiar la clave de un administrador', async () => {
    const { servicio, guardados } = crear({
      usuario: {
        id: 7,
        rol: RolUsuario.ADMINISTRADOR,
        activo: true,
        passwordHash: bcrypt.hashSync('Original-12345', 10),
      },
    });
    await expect(
      servicio.actualizar(7, { password: 'corta123' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(guardados).toHaveLength(0);
  });

  it('permite actualizar contraseña con exactamente 12 caracteres', async () => {
    const { servicio, guardados } = crear({
      usuario: { id: 4, rol: RolUsuario.TECNICO, passwordHash: 'hash-anterior' },
    });
    const password = 'Segura-12345';
    await servicio.actualizar(4, { password });
    expect(bcrypt.compareSync(password, guardados[0].passwordHash!)).toBe(true);
  });

  it('rechaza más de 72 caracteres al actualizar una contraseña', async () => {
    const { servicio, guardados } = crear({
      usuario: { id: 4, rol: RolUsuario.TECNICO, passwordHash: 'hash-anterior' },
    });
    await expect(
      servicio.actualizar(4, { password: 'A'.repeat(73) }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(guardados).toHaveLength(0);
  });
});
