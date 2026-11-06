import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource,Repository } from 'typeorm';
import { OrdenMantenimiento } from './orden-mantenimiento.entity';
import { Equipo, EstadoEquipo } from '../equipos/equipo.entity';
import { CrearOrdenMantenimientoDto } from './mantenimientos.dto';

@Injectable()
export class MantenimientosService {
  constructor(
    @InjectRepository(OrdenMantenimiento)
    private ordenRepository: Repository<OrdenMantenimiento>,
    @InjectRepository(Equipo)
    private equipoRepository: Repository<Equipo>,
    private readonly dataSource: DataSource,
  ) {}

  async crearOrden(dto: CrearOrdenMantenimientoDto): Promise<OrdenMantenimiento> {
return this.dataSource.transaction(async (manager) => {

    // 1. Buscar los equipo

const equipo = await manager.findOne(Equipo, {
  where: { id: dto.equipoId },
  lock: { mode: 'pessimistic_write' },
});
    if (!equipo) {
      throw new NotFoundException(`Equipo con ID ${dto.equipoId} no encontrado`);
    }

if (equipo.estado !== EstadoEquipo.DISPONIBLE) {
  throw new ConflictException(
    'El equipo debe estar disponible para enviarse a mantenimiento',
  );
}

    // 2. Se crea la orden de mantenimiento
    const nuevaOrden = manager.create(OrdenMantenimiento, {
      equipo: { id: dto.equipoId },
      responsable: { id: dto.responsableId },
      descripcion_falla: dto.descripcionFalla,
      estado_orden: 'PENDIENTE',
    });

const ordenGuardada = await manager.save(OrdenMantenimiento, nuevaOrden);

    // 3. Se actualiza el estado del equipo
    equipo.estado = EstadoEquipo.EN_MANTENIMIENTO
    await manager.save(Equipo, equipo);
    return ordenGuardada;
  });
  }
}