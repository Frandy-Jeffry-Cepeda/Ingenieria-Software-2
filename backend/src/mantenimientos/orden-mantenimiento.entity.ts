import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Equipo } from '../equipos/equipo.entity';
import { Usuario } from '../usuarios/usuario.entity';

@Entity('ordenes_mantenimiento')
export class OrdenMantenimiento {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Equipo)
  @JoinColumn({ name: 'equipo_id' })
  equipo: Equipo;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'responsable_id' })
  responsable: Usuario;

  @Column({ type: 'text' })
  descripcion_falla: string;

  @Column({ type: 'varchar', length: 50, default: 'PENDIENTE' })
  estado_orden: string; // PENDIENTE, EN_PROGRESO, COMPLETADO

  @CreateDateColumn({ name: 'fecha_inicio' })
  fechaInicio: Date;
}