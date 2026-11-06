import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { Equipo, EstadoEquipo } from './equipo.entity';
import { Mantenimiento } from './mantenimiento.entity';
import { Movimiento, TipoMovimiento } from './movimiento.entity';
import { Usuario, RolUsuario } from '../usuarios/usuario.entity';
import {
  ActualizarEquipoDto,
  BajaEquipoDto,
  CrearMantenimientoDto,
  DevolverEquipoDto,
  EntregarEquipoDto,
} from './equipos.dto';
import { MailtrapService } from '../integraciones/mailtrap/mailtrap.service';

@Injectable()
export class EquiposService {
  // Aquí se definen los únicos cambios de estado permitidos para un equipo.
  private readonly transiciones: Record<EstadoEquipo, EstadoEquipo[]> = {
    [EstadoEquipo.DISPONIBLE]: [
      EstadoEquipo.ENTREGADO,
      EstadoEquipo.EN_MANTENIMIENTO,
      EstadoEquipo.DE_BAJA,
    ],
    [EstadoEquipo.ENTREGADO]: [EstadoEquipo.DISPONIBLE],
    [EstadoEquipo.EN_MANTENIMIENTO]: [EstadoEquipo.DISPONIBLE],
    [EstadoEquipo.DE_BAJA]: [],
  };

  constructor(
    @InjectRepository(Equipo) private equiposRepo: Repository<Equipo>,
    @InjectRepository(Movimiento) private movimientosRepo: Repository<Movimiento>,
    @InjectRepository(Usuario) private usuariosRepo: Repository<Usuario>,
    @InjectRepository(Mantenimiento) private mantenimientosRepo: Repository<Mantenimiento>,
    private dataSource: DataSource,
    private mailtrapService: MailtrapService,
  ) {}

  // Se bloquea el equipo dentro de la transacción para evitar dos cambios al mismo tiempo.
  private async cambiarEstado(
    manager: EntityManager,
    equipoId: number,
    nuevoEstado: EstadoEquipo,
    mensajeError: string,
    estadoOrigen?: EstadoEquipo,
  ) {
    const equipo = await manager.findOne(Equipo, {
      where: { id: equipoId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!equipo) {
      throw new NotFoundException('Equipo no encontrado');
    }

    // Dos operaciones llevan a «disponible» (devolver y finalizar mantenimiento):
    // cada una exige además su estado de origen para no confundirse entre sí.
    if (estadoOrigen && equipo.estado !== estadoOrigen) {
      throw new BadRequestException(mensajeError);
    }

    if (!this.transiciones[equipo.estado].includes(nuevoEstado)) {
      throw new BadRequestException(mensajeError);
    }

    equipo.estado = nuevoEstado;
    return equipo;
  }

  listar(estado?: EstadoEquipo, q?: string) {
    const consulta = this.equiposRepo
      .createQueryBuilder('equipo')
      .leftJoinAndSelect('equipo.usuarioActual', 'usuarioActual')
      .orderBy('equipo.id', 'DESC');
    if (estado) {
      consulta.andWhere('equipo.estado = :estado', { estado });
    }
    if (q) {
      consulta.andWhere(
        '(equipo.numeroSerie ILIKE :q OR equipo.tipo ILIKE :q OR equipo.marca ILIKE :q OR equipo.modelo ILIKE :q)',
        { q: `%${q}%` },
      );
    }
    return consulta.getMany();
  }

  async resumen() {
    const disponibles = await this.equiposRepo.countBy({ estado: EstadoEquipo.DISPONIBLE });
    const entregados = await this.equiposRepo.countBy({ estado: EstadoEquipo.ENTREGADO });
    const deBaja = await this.equiposRepo.countBy({ estado: EstadoEquipo.DE_BAJA });
    const ultimasEntregas = await this.movimientosRepo.find({
      where: { tipo: TipoMovimiento.ENTREGA },
      relations: { equipo: true, usuario: true, tecnico: true },
      order: { fecha: 'DESC', id: 'DESC' },
      take: 5,
    });
    return { disponibles, entregados, deBaja, ultimasEntregas };
  }

  async detalle(id: number) {
    const equipo = await this.equiposRepo.findOne({
      where: { id },
      relations: { usuarioActual: true },
    });
    if (!equipo) {
      throw new NotFoundException('Equipo no encontrado');
    }
    return equipo;
  }

  async movimientos(id: number) {
    await this.detalle(id);
    return this.movimientosRepo.find({
      where: { equipoId: id },
      relations: { usuario: true, tecnico: true },
      order: { fecha: 'DESC', id: 'DESC' },
    });
  }

  // Órdenes de mantenimiento de un equipo, de la más reciente a la más antigua (lista 1.3.2).
  async ordenesMantenimiento(id: number) {
    await this.detalle(id);
    return this.mantenimientosRepo.find({
      where: { equipoId: id },
      order: { creadoEn: 'DESC', id: 'DESC' },
    });
  }

  async actualizar(id: number, dto: ActualizarEquipoDto) {
    const equipo = await this.detalle(id);
    Object.assign(equipo, dto);
    try {
  await this.equiposRepo.save(equipo);
} catch (error) {
  if (error instanceof Error && 'driverError' in error) {
    const driverError = error.driverError as { code?: string };

    if (driverError.code === '23505') {
      throw new BadRequestException(
        'Ya existe un equipo con ese número de serie',
      );
    }
  }

  throw error;
    }
    return this.detalle(id);
  }

  async entregar(id: number, dto: EntregarEquipoDto, tecnicoId: number) {
    const empleado = await this.usuariosRepo.findOneBy({ id: dto.usuarioId });
    if (!empleado || !empleado.activo || empleado.rol !== RolUsuario.EMPLEADO) {
      throw new BadRequestException('El destinatario debe ser un empleado activo');
    }

    await this.dataSource.transaction(async (manager) => {
      const equipo = await this.cambiarEstado(
        manager,
        id,
        EstadoEquipo.ENTREGADO,
        'El equipo no está disponible para entrega',
      );
      equipo.usuarioActualId = empleado.id;

      await manager.save(Movimiento, {
        equipoId: equipo.id,
        tipo: TipoMovimiento.ENTREGA,
        usuarioId: empleado.id,
        tecnicoId,
        observacion: dto.observacion,
      });
      await manager.save(Equipo, equipo);
    });

    return this.detalle(id);
  }

  async devolver(id: number, dto: DevolverEquipoDto, tecnicoId: number) {
    await this.dataSource.transaction(async (manager) => {
      const equipo = await this.cambiarEstado(
        manager,
        id,
        EstadoEquipo.DISPONIBLE,
        'El equipo no está entregado, no hay nada que devolver',
        EstadoEquipo.ENTREGADO,
      );
      const empleadoId = equipo.usuarioActualId;
      equipo.usuarioActualId = null;

      await manager.save(Movimiento, {
        equipoId: equipo.id,
        tipo: TipoMovimiento.DEVOLUCION,
        usuarioId: empleadoId,
        tecnicoId,
        observacion: dto.observacion,
      });
      await manager.save(Equipo, equipo);
    });

    return this.detalle(id);
  }

  async darDeBaja(id: number, dto: BajaEquipoDto, tecnicoId: number) {
    await this.dataSource.transaction(async (manager) => {
      const equipo = await this.cambiarEstado(
        manager,
        id,
        EstadoEquipo.DE_BAJA,
        'Solo un equipo disponible puede darse de baja',
      );

      await manager.save(Movimiento, {
        equipoId: equipo.id,
        tipo: TipoMovimiento.SALIDA,
        motivoSalida: dto.motivo,
        tecnicoId,
        observacion: dto.observacion,
      });
      await manager.save(Equipo, equipo);
    });

    return this.detalle(id);
  }

  async enviarMantenimiento(id: number, dto: CrearMantenimientoDto, tecnicoId: number) {
    const orden = await this.dataSource.transaction(async (manager) => {
      const equipo = await this.cambiarEstado(
        manager,
        id,
        EstadoEquipo.EN_MANTENIMIENTO,
        'Solo un equipo disponible puede enviarse a mantenimiento',
      );

      const nuevaOrden = await manager.save(Mantenimiento, {
        equipoId: equipo.id,
        descripcion: dto.descripcion,
        fecha: dto.fecha,
        tecnico: dto.tecnico,
        fechaFinalizacion: null,
      });

      await manager.save(Movimiento, {
        equipoId: equipo.id,
        tipo: TipoMovimiento.MANTENIMIENTO,
        tecnicoId,
        observacion: dto.descripcion,
      });

      await manager.save(Equipo, equipo);
      return nuevaOrden;
    });

    // El correo se envía después de guardar los datos para no dejar una transacción abierta.
    const equipo = await this.detalle(id);
    const notificacion = await this.mailtrapService.enviarAvisoMantenimiento({
      numeroSerie: equipo.numeroSerie,
      descripcion: orden.descripcion,
      fecha: orden.fecha,
      tecnico: orden.tecnico,
    });

    return { orden, equipo, notificacion };
  }

  async finalizarMantenimiento(id: number, tecnicoId: number) {
    await this.dataSource.transaction(async (manager) => {
      const equipo = await this.cambiarEstado(
        manager,
        id,
        EstadoEquipo.DISPONIBLE,
        'El equipo no se encuentra en mantenimiento',
        EstadoEquipo.EN_MANTENIMIENTO,
      );

      const orden = await manager.findOne(Mantenimiento, {
        where: { equipoId: id, fechaFinalizacion: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });

      if (!orden) {
        throw new BadRequestException('No existe una orden de mantenimiento pendiente');
      }

      orden.fechaFinalizacion = new Date();
      await manager.save(Mantenimiento, orden);
      await manager.save(Movimiento, {
        equipoId: equipo.id,
        tipo: TipoMovimiento.FIN_MANTENIMIENTO,
        tecnicoId,
        observacion: `Mantenimiento finalizado: ${orden.descripcion}`,
      });
      await manager.save(Equipo, equipo);
    });

    return this.detalle(id);
  }
}

// (A J A D)
