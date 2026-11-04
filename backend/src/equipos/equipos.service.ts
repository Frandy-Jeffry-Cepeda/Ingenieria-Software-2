import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Equipo, EstadoEquipo } from './equipo.entity';
import { Movimiento, TipoMovimiento } from './movimiento.entity';
import { Usuario, RolUsuario } from '../usuarios/usuario.entity';
import { ActualizarEquipoDto, BajaEquipoDto, DevolverEquipoDto, EntregarEquipoDto } from './equipos.dto';

@Injectable()
export class EquiposService {
  // única fuente de verdad de la máquina de estados
  private readonly transiciones: Record<EstadoEquipo, EstadoEquipo[]> = {
    [EstadoEquipo.DISPONIBLE]: [EstadoEquipo.ENTREGADO, EstadoEquipo.DE_BAJA],
    [EstadoEquipo.ENTREGADO]: [EstadoEquipo.DISPONIBLE],
    [EstadoEquipo.DE_BAJA]: [],
    [EstadoEquipo.EN_MANTENIMIENTO]: [EstadoEquipo.DISPONIBLE], 
  };

  constructor(
    @InjectRepository(Equipo) private equiposRepo: Repository<Equipo>,
    @InjectRepository(Movimiento) private movimientosRepo: Repository<Movimiento>,
    @InjectRepository(Usuario) private usuariosRepo: Repository<Usuario>,
    private dataSource: DataSource,
  ) {}

  private cambiarEstado(equipo: Equipo, nuevoEstado: EstadoEquipo, mensajeError: string) {
    if (!this.transiciones[equipo.estado].includes(nuevoEstado)) {
      throw new BadRequestException(mensajeError);
    }
    equipo.estado = nuevoEstado;
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

  async actualizar(id: number, dto: ActualizarEquipoDto) {
    const equipo = await this.detalle(id);
    Object.assign(equipo, dto);
    try {
      await this.equiposRepo.save(equipo);
    } catch (error) {
      if (error.code === '23505') {
        throw new BadRequestException('Ya existe un equipo con ese número de serie');
      }
      throw error;
    }
    return this.detalle(id);
  }

  async entregar(id: number, dto: EntregarEquipoDto, tecnicoId: number) {
    const equipo = await this.detalle(id);
    const empleado = await this.usuariosRepo.findOneBy({ id: dto.usuarioId });
    if (!empleado || !empleado.activo || empleado.rol !== RolUsuario.EMPLEADO) {
      throw new BadRequestException('El destinatario debe ser un empleado activo');
    }
    this.cambiarEstado(equipo, EstadoEquipo.ENTREGADO, 'El equipo no está disponible para entrega');
    equipo.usuarioActualId = empleado.id;
    await this.dataSource.transaction(async (manager) => {
      await manager.save(Movimiento, {
        equipoId: equipo.id,
        tipo: TipoMovimiento.ENTREGA,
        usuarioId: empleado.id,
        tecnicoId,
        observacion: dto.observacion,
      });
      await manager.update(Equipo, equipo.id, {
        estado: equipo.estado,
        usuarioActualId: equipo.usuarioActualId,
      });
    });
    return this.detalle(id);
  }

  async devolver(id: number, dto: DevolverEquipoDto, tecnicoId: number) {
    const equipo = await this.detalle(id);
    const empleadoId = equipo.usuarioActualId;
    this.cambiarEstado(equipo, EstadoEquipo.DISPONIBLE, 'El equipo no está entregado, no hay nada que devolver');
    equipo.usuarioActualId = null;
    await this.dataSource.transaction(async (manager) => {
      await manager.save(Movimiento, {
        equipoId: equipo.id,
        tipo: TipoMovimiento.DEVOLUCION,
        usuarioId: empleadoId,
        tecnicoId,
        observacion: dto.observacion,
      });
      await manager.update(Equipo, equipo.id, {
        estado: equipo.estado,
        usuarioActualId: null,
      });
    });
    return this.detalle(id);
  }

  async darDeBaja(id: number, dto: BajaEquipoDto, tecnicoId: number) {
    const equipo = await this.detalle(id);
    this.cambiarEstado(equipo, EstadoEquipo.DE_BAJA, 'Solo un equipo disponible puede darse de baja');
    await this.dataSource.transaction(async (manager) => {
      await manager.save(Movimiento, {
        equipoId: equipo.id,
        tipo: TipoMovimiento.SALIDA,
        motivoSalida: dto.motivo,
        tecnicoId,
        observacion: dto.observacion,
      });
      await manager.update(Equipo, equipo.id, { estado: equipo.estado });
    });
    return this.detalle(id);
  }
}
