import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ComprasService } from './compras.service';
import { Compra } from './compra.entity';
import { Equipo } from '../equipos/equipo.entity';

function crear(opciones: { falla?: unknown; compra?: Partial<Compra> | null } = {}) {
  const guardados: Array<{ entidad: unknown; datos: unknown }> = [];
  const manager = {
    save: jest.fn(async (entidad: unknown, datos: unknown) => {
      if (opciones.falla && entidad === Equipo) throw opciones.falla;
      guardados.push({ entidad, datos });
      return entidad === Compra ? { id: 4, ...(datos as object) } : datos;
    }),
  } as unknown as EntityManager;
  const dataSource = { transaction: jest.fn(async (f: (m: EntityManager) => unknown) => f(manager)) } as unknown as DataSource;
  const repo = {
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => (opciones.compra === undefined ? { id: 4 } : opciones.compra)),
  } as unknown as Repository<Compra>;
  return { servicio: new ComprasService(repo, dataSource), guardados };
}
const dto = {
  proveedor: 'TecnoRD', fechaCompra: '2026-11-01', costoTotal: 1000,
  equipos: [{ tipo: 'laptop', numeroSerie: 'A1' }, { tipo: 'monitor', numeroSerie: 'B2' }],
};

describe('ComprasService', () => {
  it('registra la compra y sus equipos en una sola transacción, con el técnico del token', async () => {
    const { servicio, guardados } = crear();
    const r = await servicio.crear(dto, 3);
    expect((guardados[0].datos as { registradaPor: number }).registradaPor).toBe(3);
    expect(guardados[1].datos).toEqual([
      { tipo: 'laptop', numeroSerie: 'A1', compraId: 4 },
      { tipo: 'monitor', numeroSerie: 'B2', compraId: 4 },
    ]);
    expect(r.equipos).toHaveLength(2);
  });

  it('un número de serie repetido (23505) responde 400', async () => {
    const { servicio } = crear({ falla: { code: '23505' } });
    await expect(servicio.crear(dto, 3)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('propaga otros errores de la base de datos', async () => {
    const { servicio } = crear({ falla: new Error('caída') });
    await expect(servicio.crear(dto, 3)).rejects.toThrow('caída');
  });

  it('responde 404 si la compra no existe', async () => {
    await expect(crear({ compra: null }).servicio.detalle(9)).rejects.toBeInstanceOf(NotFoundException);
  });
});
