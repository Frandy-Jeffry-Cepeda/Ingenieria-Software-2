
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

@Entity('mantenimientos')
export class Mantenimiento {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ name: 'equipo_id' })
  equipoId!: number;

  @ManyToOne(() => Equipo)
  @JoinColumn({ name: 'equipo_id' })
  equipo!: Equipo;

  @Column({ type: 'text' })
  descripcion!: string;

  @Column({ type: 'date' })
  fecha!: string;

  @Column({ length: 100 })
  tecnico!: string;

  @Column({
    name: 'fecha_finalizacion',
    type: 'timestamp',
    nullable: true,
  })
  fechaFinalizacion!: Date | null;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn!: Date;
}
