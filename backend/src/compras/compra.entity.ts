import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Equipo } from '../equipos/equipo.entity';
import { Usuario } from '../usuarios/usuario.entity';

@Entity('compras')
export class Compra {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  proveedor: string;

  @Column({ name: 'numero_factura', length: 50, nullable: true })
  numeroFactura: string;

  @Column({ name: 'fecha_compra', type: 'date' })
  fechaCompra: string;

  @Column({ name: 'costo_total', type: 'numeric', precision: 12, scale: 2, nullable: true })
  costoTotal: number;

  @Column({ name: 'registrada_por' })
  registradaPor: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'registrada_por' })
  tecnico: Usuario;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @OneToMany(() => Equipo, (equipo) => equipo.compra)
  equipos: Equipo[];
}
