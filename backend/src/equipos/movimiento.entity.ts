import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Equipo } from './equipo.entity';
import { Usuario } from '../usuarios/usuario.entity';

export enum TipoMovimiento {
  ENTREGA = 'entrega',
  DEVOLUCION = 'devolucion',
  SALIDA = 'salida',
  // Registra el inicio y el cierre del mantenimiento en el historial.
  MANTENIMIENTO = 'mantenimiento',
  FIN_MANTENIMIENTO = 'fin_mantenimiento',
}

export enum MotivoSalida {
  DESAHUCIO = 'desahucio',
  OBSOLESCENCIA = 'obsolescencia',
}

@Entity('movimientos')
export class Movimiento {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'equipo_id' })
  equipoId: number;

  @ManyToOne(() => Equipo)
  @JoinColumn({ name: 'equipo_id' })
  equipo: Equipo;

  @Column({ type: 'enum', enum: TipoMovimiento, enumName: 'tipo_movimiento' })
  tipo: TipoMovimiento;

  @Column({ name: 'usuario_id', nullable: true })
  usuarioId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Column({ name: 'tecnico_id' })
  tecnicoId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'tecnico_id' })
  tecnico: Usuario;

  @Column({
    name: 'motivo_salida',
    type: 'enum',
    enum: MotivoSalida,
    enumName: 'motivo_salida',
    nullable: true,
  })
  motivoSalida: MotivoSalida;

  @Column({ type: 'text', nullable: true })
  observacion: string;

  @CreateDateColumn({ name: 'fecha' })
  fecha: Date;
}

// (A J A D)
