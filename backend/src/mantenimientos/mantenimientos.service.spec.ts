import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { MantenimientosService } from './mantenimientos.service';
import { OrdenMantenimiento } from './orden-mantenimiento.entity';
import { Equipo, EstadoEquipo } from '../equipos/equipo.entity';

function crear(equipo: Partial<Equipo> | null) {
  const guardados: unknown[] = [];
  const manager = {
    findOne: jest.fn(async () => equipo),
    create: jest.fn((_e: unknown, d: unknown) => d),
    save: jest.fn(async (_e: unknown, d: unknown) => { guardados.push(d); return { id: 1, ...(d as object) }; }),
  } as unknown as EntityManager;
  const dataSource = { transaction: jest.fn(async (f: (m: EntityManager) => unknown) => f(manager)) } as unknown as DataSource;
  const servicio = new MantenimientosService({} as Repository<OrdenMantenimiento>, {} as Repository<Equipo>, dataSource);
  return { servicio, guardados };
}
const dto = { equipoId: 3, responsableId: 4, descripcionFalla: 'No enciende' };

describe('MantenimientosService · POST /mantenimientos', () => {
  it('crea la orden pendiente y deja el equipo en mantenimiento', async () => {
    const equipo = { id: 3, estado: EstadoEquipo.DISPONIBLE } as Equipo;
    const { servicio, guardados } = crear(equipo);
    const orden = await servicio.crearOrden(dto, 99);
    expect(orden).toMatchObject({ descripcion_falla: 'No enciende', estado_orden: 'PENDIENTE' });
    expect(equipo.estado).toBe(EstadoEquipo.EN_MANTENIMIENTO);
    expect(guardados).toHaveLength(3);
    expect(guardados[2]).toMatchObject({ equipoId: 3, tipo: 'mantenimiento', tecnicoId: 99 });
  });

  it('responde 409 si el equipo no está disponible', async () => {
    const { servicio, guardados } = crear({ id: 3, estado: EstadoEquipo.ENTREGADO });
    await expect(servicio.crearOrden(dto, 99)).rejects.toBeInstanceOf(ConflictException);
    expect(guardados).toHaveLength(0);
  });

  it('responde 404 si el equipo no existe', async () => {
    await expect(crear(null).servicio.crearOrden(dto, 99)).rejects.toBeInstanceOf(NotFoundException);
  });
});
