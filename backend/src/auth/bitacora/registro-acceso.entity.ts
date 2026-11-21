import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from '../../usuarios/usuario.entity';

export enum ResultadoAcceso {
  EXITO = 'EXITO',
  FALLIDO = 'FALLIDO',
}

// E4, paquete 2.4: bitácora de accesos. Cada intento de inicio de sesión deja
// un registro. Nunca se guardan contraseñas, hashes ni tokens.
@Entity('registros_acceso')
export class RegistroAcceso {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;

  // Correo escrito en el formulario (normalizado); permite ver intentos sobre cuentas inexistentes.
  @Column({ length: 150 })
  email: string;

  @Column({ type: 'enum', enum: ResultadoAcceso, enumName: 'resultado_acceso' })
  resultado: ResultadoAcceso;

  // Motivo del rechazo; null cuando el acceso fue exitoso.
  @Column({ length: 40, nullable: true })
  motivo: string | null;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario | null;

  @Column({ length: 64, nullable: true })
  ip: string | null;
}
