
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Compra } from '../compras/compra.entity';
import { Usuario } from '../usuarios/usuario.entity';

export enum EstadoEquipo {
  DISPONIBLE = 'disponible',
  ENTREGADO = 'entregado',
  EN_MANTENIMIENTO = 'en_mantenimiento',
  DE_BAJA = 'de_baja',
}

@Entity('equipos')
export class Equipo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'compra_id' })
  compraId!: number;

  @ManyToOne(() => Compra, (compra) => compra.equipos)
  @JoinColumn({ name: 'compra_id' })
  compra!: Compra;

  @Column({ length: 50 })
  tipo!: string;

  @Column({ length: 50, nullable: true })
  marca!: string | null;

  @Column({ length: 80, nullable: true })
  modelo!: string | null;

  @Column({ name: 'numero_serie', length: 100, unique: true })
  numeroSerie!: string;

  @Index()
  @Column({
    type: 'enum',
    enum: EstadoEquipo,
    enumName: 'estado_equipo',
    default: EstadoEquipo.DISPONIBLE,
  })
  estado!: EstadoEquipo;

  @Column({ name: 'usuario_actual_id', nullable: true })
  usuarioActualId!: number | null;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_actual_id' })
  usuarioActual!: Usuario | null;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn!: Date;
}
