
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { RolUsuario } from './usuario.entity';

export class CrearUsuarioDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  departamento?: string;

  @IsOptional()
  @IsEnum(RolUsuario)
  rol?: RolUsuario;

  @IsOptional()
  @IsString()
  password?: string;
}

export class ActualizarUsuarioDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nombre?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  departamento?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  // Permite modificar el rol del usuario.
  @IsOptional()
  @IsEnum(RolUsuario)
  rol?: RolUsuario;

  // Permite asignar una contraseña cuando sea necesario.
  @IsOptional()
  @IsString()
  password?: string;
}
