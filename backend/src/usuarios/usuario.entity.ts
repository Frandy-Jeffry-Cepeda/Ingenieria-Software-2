import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum RolUsuario {
  ADMINISTRADOR = 'administrador',
  EMPLEADO = 'empleado',
  TECNICO = 'tecnico',
}

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 150, unique: true })
  email: string;

  @Column({ length: 80, nullable: true })
  departamento: string;

  @Column({ type: 'enum', enum: RolUsuario, enumName: 'rol_usuario', default: RolUsuario.EMPLEADO })
  rol: RolUsuario;

  @Column({ name: 'password_hash', length: 255, nullable: true, select: false })
  passwordHash: string;

  @Column({ default: true })
  activo: boolean;
}
