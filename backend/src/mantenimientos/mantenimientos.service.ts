import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  async crearOrden(dto: CrearOrdenMantenimientoDto): Promise<OrdenMantenimiento> {
    // 1. Buscar los equipo
    const equipo = await this.equipoRepository.findOne({ where: { id: dto.equipoId } });
    if (!equipo) {
      throw new NotFoundException(`Equipo con ID ${dto.equipoId} no encontrado`);
    }

    // 2. Se crea la orden de mantenimiento
    const nuevaOrden = this.ordenRepository.create({
      equipo: { id: dto.equipoId },
      responsable: { id: dto.responsableId },
      descripcion_falla: dto.descripcionFalla,
      estado_orden: 'PENDIENTE',
    });
    const ordenGuardada = await this.ordenRepository.save(nuevaOrden);

    // 3. Se actualiza el estado del equipo
    equipo.estado = EstadoEquipo.EN_MANTENIMIENTO;
    await this.equipoRepository.save(equipo);

    return ordenGuardada;
  }
}