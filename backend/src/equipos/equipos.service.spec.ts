import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { EquiposService } from './equipos.service';
import { Equipo, EstadoEquipo } from './equipo.entity';
import { Mantenimiento } from './mantenimiento.entity';
import { Movimiento, TipoMovimiento } from './movimiento.entity';
import { Usuario, RolUsuario } from '../usuarios/usuario.entity';
import { MailtrapService } from '../integraciones/mailtrap/mailtrap.service';
import { OrdenMantenimiento } from '../mantenimientos/orden-mantenimiento.entity';

// Pruebas unitarias del paquete 1.4.1: reglas de transición de estado de un equipo.
// La base de datos se simula: el EntityManager devuelve el equipo con el estado de cada caso.

type Guardado = { entidad: unknown; datos: Record<string, unknown> };

function crearServicio(estadoInicial: EstadoEquipo | null, opciones: { ordenPendiente?: boolean; ordenApi?: boolean } = {}) {
  const equipo = estadoInicial
    ? ({ id: 1, numeroSerie: 'SN-001', estado: estadoInicial, usuarioActualId: 7 } as Equipo)
    : null;
  const guardados: Guardado[] = [];

  const manager = {
    findOne: jest.fn(async (entidad: unknown) => {
      if (entidad === Equipo) return equipo;
      if (entidad === OrdenMantenimiento) {
        return opciones.ordenApi ? { id: 8, descripcion_falla: 'No enciende', estado_orden: 'PENDIENTE' } : null;
      }
      if (entidad === Mantenimiento) {
        return opciones.ordenPendiente
          ? { id: 3, equipoId: 1, descripcion: 'Cambio de disco', fechaFinalizacion: null }
          : null;
      }
      return null;
    }),
    save: jest.fn(async (entidad: unknown, datos: Record<string, unknown>) => {
      guardados.push({ entidad, datos });
      return { id: 3, ...datos };
    }),
  } as unknown as EntityManager;

  const dataSource = {
    transaction: jest.fn(async (trabajo: (m: EntityManager) => Promise<unknown>) => trabajo(manager)),
  } as unknown as DataSource;

  const qb = { leftJoinAndSelect: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(), getMany: jest.fn(async () => [equipo]) };
  const equiposRepo = {
    findOne: jest.fn(async () => equipo),
    countBy: jest.fn(async ({ estado }: { estado: EstadoEquipo }) => ({ disponible: 3, entregado: 2, en_mantenimiento: 1, de_baja: 4 })[estado]),
    createQueryBuilder: jest.fn(() => qb),
    save: jest.fn(async (e: unknown) => e),
  } as unknown as Repository<Equipo>;
  const usuariosRepo = {
    findOneBy: jest.fn(async () => ({ id: 7, activo: true, rol: RolUsuario.EMPLEADO })),
  } as unknown as Repository<Usuario>;
  const mantenimientosRepo = {
    find: jest.fn(async () => [{ id: 3, equipoId: 1 }]),
  } as unknown as Repository<Mantenimiento>;
  const mailtrap = {
    enviarAvisoMantenimiento: jest.fn(async () => ({ enviado: true })),
  } as unknown as MailtrapService;

  const servicio = new EquiposService(
    equiposRepo,
    { find: jest.fn(async () => []) } as unknown as Repository<Movimiento>,
    usuariosRepo,
    mantenimientosRepo,
    dataSource,
    mailtrap,
  );
  return { servicio, equipo, guardados, mailtrap, mantenimientosRepo, equiposRepo, qb };
}

const tiposGuardados = (g: Guardado[]) =>
  g.filter((x) => x.entidad === Movimiento).map((x) => x.datos.tipo);

describe('EquiposService · transiciones válidas', () => {
  it('disponible → entregado al entregar', async () => {
    const { servicio, equipo, guardados } = crearServicio(EstadoEquipo.DISPONIBLE);
    await servicio.entregar(1, { usuarioId: 7 }, 99);
    expect(equipo!.estado).toBe(EstadoEquipo.ENTREGADO);
    expect(tiposGuardados(guardados)).toEqual([TipoMovimiento.ENTREGA]);
  });

  it('entregado → disponible al devolver', async () => {
    const { servicio, equipo, guardados } = crearServicio(EstadoEquipo.ENTREGADO);
    await servicio.devolver(1, {}, 99);
    expect(equipo!.estado).toBe(EstadoEquipo.DISPONIBLE);
    expect(equipo!.usuarioActualId).toBeNull();
    expect(tiposGuardados(guardados)).toEqual([TipoMovimiento.DEVOLUCION]);
  });

  it('disponible → de_baja al dar de baja', async () => {
    const { servicio, equipo } = crearServicio(EstadoEquipo.DISPONIBLE);
    await servicio.darDeBaja(1, { motivo: 'obsolescencia' } as never, 99);
    expect(equipo!.estado).toBe(EstadoEquipo.DE_BAJA);
  });

  it('disponible → en_mantenimiento: guarda la orden, el movimiento y avisa por Mailtrap', async () => {
    const { servicio, equipo, guardados, mailtrap } = crearServicio(EstadoEquipo.DISPONIBLE);
    const r = await servicio.enviarMantenimiento(
      1,
      { descripcion: 'Cambio de disco', fecha: '2026-11-06', tecnico: 'Alan' },
      99,
    );
    expect(equipo!.estado).toBe(EstadoEquipo.EN_MANTENIMIENTO);
    expect(guardados.some((g) => g.entidad === Mantenimiento)).toBe(true);
    expect(tiposGuardados(guardados)).toEqual([TipoMovimiento.MANTENIMIENTO]);
    expect(mailtrap.enviarAvisoMantenimiento).toHaveBeenCalledTimes(1);
    expect(r.notificacion).toEqual({ enviado: true });
  });

  it('en_mantenimiento → disponible al finalizar, cerrando la orden pendiente', async () => {
    const { servicio, equipo, guardados } = crearServicio(EstadoEquipo.EN_MANTENIMIENTO, { ordenPendiente: true });
    await servicio.finalizarMantenimiento(1, 99);
    expect(equipo!.estado).toBe(EstadoEquipo.DISPONIBLE);
    const orden = guardados.find((g) => g.entidad === Mantenimiento)!.datos;
    expect(orden.fechaFinalizacion).toBeInstanceOf(Date);
    expect(tiposGuardados(guardados)).toEqual([TipoMovimiento.FIN_MANTENIMIENTO]);
  });
});

describe('EquiposService · transiciones que se rechazan', () => {
  const casos: Array<[string, EstadoEquipo, (s: EquiposService) => Promise<unknown>]> = [
    ['entregar un equipo ya entregado', EstadoEquipo.ENTREGADO, (s) => s.entregar(1, { usuarioId: 7 }, 99)],
    ['entregar un equipo en mantenimiento', EstadoEquipo.EN_MANTENIMIENTO, (s) => s.entregar(1, { usuarioId: 7 }, 99)],
    ['entregar un equipo de baja', EstadoEquipo.DE_BAJA, (s) => s.entregar(1, { usuarioId: 7 }, 99)],
    ['devolver un equipo disponible', EstadoEquipo.DISPONIBLE, (s) => s.devolver(1, {}, 99)],
    ['devolver un equipo en mantenimiento', EstadoEquipo.EN_MANTENIMIENTO, (s) => s.devolver(1, {}, 99)],
    ['dar de baja un equipo entregado', EstadoEquipo.ENTREGADO, (s) => s.darDeBaja(1, { motivo: 'obsolescencia' } as never, 99)],
    ['dar de baja un equipo en mantenimiento', EstadoEquipo.EN_MANTENIMIENTO, (s) => s.darDeBaja(1, { motivo: 'obsolescencia' } as never, 99)],
    ['enviar a mantenimiento un equipo entregado', EstadoEquipo.ENTREGADO, (s) => s.enviarMantenimiento(1, { descripcion: 'x', fecha: '2026-11-06', tecnico: 'x' }, 99)],
    ['enviar a mantenimiento un equipo ya en mantenimiento', EstadoEquipo.EN_MANTENIMIENTO, (s) => s.enviarMantenimiento(1, { descripcion: 'x', fecha: '2026-11-06', tecnico: 'x' }, 99)],
    ['finalizar el mantenimiento de un equipo entregado', EstadoEquipo.ENTREGADO, (s) => s.finalizarMantenimiento(1, 99)],
    ['reactivar un equipo de baja', EstadoEquipo.DE_BAJA, (s) => s.devolver(1, {}, 99)],
  ];

  it.each(casos)('rechaza %s y no guarda nada', async (_nombre, estado, accion) => {
    const { servicio, equipo, guardados, mailtrap } = crearServicio(estado);
    await expect(accion(servicio)).rejects.toBeInstanceOf(BadRequestException);
    expect(equipo!.estado).toBe(estado);
    expect(guardados).toHaveLength(0);
    expect(mailtrap.enviarAvisoMantenimiento).not.toHaveBeenCalled();
  });

  it('finaliza también una orden creada con POST /mantenimientos (defecto D-09)', async () => {
    const { servicio, equipo, guardados } = crearServicio(EstadoEquipo.EN_MANTENIMIENTO, { ordenApi: true });
    await servicio.finalizarMantenimiento(1, 99);
    expect(equipo!.estado).toBe(EstadoEquipo.DISPONIBLE);
    expect(guardados.find((g) => g.entidad === OrdenMantenimiento)!.datos.estado_orden).toBe('COMPLETADO');
    expect(tiposGuardados(guardados)).toEqual([TipoMovimiento.FIN_MANTENIMIENTO]);
  });

  it('rechaza finalizar si no hay una orden pendiente', async () => {
    const { servicio } = crearServicio(EstadoEquipo.EN_MANTENIMIENTO, { ordenPendiente: false });
    await expect(servicio.finalizarMantenimiento(1, 99)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('responde 404 si el equipo no existe', async () => {
    const { servicio } = crearServicio(null);
    await expect(servicio.devolver(1, {}, 99)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('EquiposService · lista de órdenes (GET /equipos/:id/mantenimiento)', () => {
  it('devuelve las órdenes del equipo de la más reciente a la más antigua', async () => {
    const { servicio, mantenimientosRepo } = crearServicio(EstadoEquipo.DISPONIBLE);
    const ordenes = await servicio.ordenesMantenimiento(1);
    expect(ordenes).toHaveLength(1);
    expect(mantenimientosRepo.find).toHaveBeenCalledWith({
      where: { equipoId: 1 },
      order: { creadoEn: 'DESC', id: 'DESC' },
    });
  });
});

describe('EquiposService · consultas', () => {
  it('el resumen cuenta los cuatro estados, incluido en_mantenimiento (defecto D-10)', async () => {
    const { servicio } = crearServicio(EstadoEquipo.DISPONIBLE);
    await expect(servicio.resumen()).resolves.toMatchObject({ disponibles: 3, entregados: 2, enMantenimiento: 1, deBaja: 4 });
  });

  it('el listado filtra por estado y busca por serie, tipo, marca o modelo', async () => {
    const { servicio, qb } = crearServicio(EstadoEquipo.DISPONIBLE);
    await servicio.listar(EstadoEquipo.EN_MANTENIMIENTO, 'dell');
    expect(qb.andWhere).toHaveBeenCalledWith('equipo.estado = :estado', { estado: EstadoEquipo.EN_MANTENIMIENTO });
    expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('ILIKE'), { q: '%dell%' });
  });

  it('actualizar traduce un número de serie repetido en un error 400', async () => {
    const { servicio, equiposRepo } = crearServicio(EstadoEquipo.DISPONIBLE);
    const err = Object.assign(new Error('dup'), { driverError: { code: '23505' } });
    (equiposRepo.save as jest.Mock).mockRejectedValueOnce(err);
    await expect(servicio.actualizar(1, { numeroSerie: 'X' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('actualizar guarda los cambios y devuelve el equipo', async () => {
    const { servicio, equiposRepo } = crearServicio(EstadoEquipo.DISPONIBLE);
    await expect(servicio.actualizar(1, { marca: 'HP' })).resolves.toMatchObject({ marca: 'HP' });
    expect(equiposRepo.save).toHaveBeenCalled();
  });
});
