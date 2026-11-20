import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UsuariosService } from './usuarios.service';
import { Usuario, RolUsuario } from './usuario.entity';
import { Equipo } from '../equipos/equipo.entity';

function crear(opciones: { guardarFalla?: unknown; usuario?: Partial<Usuario> | null } = {}) {
  const guardados: Partial<Usuario>[] = [];
  const usuariosRepo = {
    find: jest.fn(async () => [{ id: 1, nombre: 'Ana' }, { id: 2, nombre: 'Luis' }]),
    findOneBy: jest.fn(async () => (opciones.usuario === undefined ? { id: 1, nombre: 'Ana' } : opciones.usuario)),
    create: jest.fn((d: Partial<Usuario>) => ({ ...d })),
    save: jest.fn(async (u: Partial<Usuario>) => {
      if (opciones.guardarFalla) throw opciones.guardarFalla;
      guardados.push(u);
      return { id: 7, ...u };
    }),
  } as unknown as Repository<Usuario>;
  const qb = {
    select: jest.fn().mockReturnThis(), addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(), groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(async () => [{ usuarioId: 1, cantidad: '2' }]),
  };
  const equiposRepo = {
    createQueryBuilder: jest.fn(() => qb),
    find: jest.fn(async () => [{ id: 10 }]),
  } as unknown as Repository<Equipo>;
  return { servicio: new UsuariosService(usuariosRepo, equiposRepo), guardados, usuariosRepo };
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
    await expect(crear().servicio.crear({ nombre: 'T', email: 't@e.com', rol: RolUsuario.TECNICO }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('exige contraseña para crear un administrador', async () => {
    await expect(crear().servicio.crear({ nombre: 'A', email: 'a@e.com', rol: RolUsuario.ADMINISTRADOR }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('guarda la contraseña de un técnico cifrada con bcrypt, nunca en claro', async () => {
    const { servicio, guardados } = crear();
    await servicio.crear({ nombre: 'T', email: 't@e.com', rol: RolUsuario.TECNICO, password: 'segura-123' });
    expect(guardados[0].passwordHash).not.toBe('segura-123');
    expect(bcrypt.compareSync('segura-123', guardados[0].passwordHash!)).toBe(true);
  });

  it('traduce el correo duplicado (código 23505) en un error 400', async () => {
    const { servicio } = crear({ guardarFalla: { code: '23505' } });
    await expect(servicio.crear({ nombre: 'A', email: 'a@e.com' })).rejects.toThrow('Ya existe un usuario con ese email');
  });

  it('propaga cualquier otro error de la base de datos', async () => {
    const { servicio } = crear({ guardarFalla: new Error('caída') });
    await expect(servicio.crear({ nombre: 'A', email: 'a@e.com' })).rejects.toThrow('caída');
  });

  it('responde 404 al consultar o actualizar un usuario inexistente', async () => {
    const { servicio } = crear({ usuario: null });
    await expect(servicio.detalle(99)).rejects.toBeInstanceOf(NotFoundException);
    await expect(servicio.actualizar(99, { activo: false })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('el detalle incluye los equipos que el usuario tiene asignados', async () => {
    await expect(crear().servicio.detalle(1)).resolves.toEqual({ id: 1, nombre: 'Ana', equipos: [{ id: 10 }] });
  });
});
