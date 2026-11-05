
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { MotivoSalida } from './movimiento.entity';

export class ActualizarEquipoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tipo?: string;

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsString()
  modelo?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  numeroSerie?: string;
}

export class EntregarEquipoDto {
  @IsInt()
  usuarioId!: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}

export class DevolverEquipoDto {
  @IsOptional()
  @IsString()
  observacion?: string;
}

export class BajaEquipoDto {
  @IsEnum(MotivoSalida)
  motivo!: MotivoSalida;

  @IsOptional()
  @IsString()
  observacion?: string;
}

export class CrearMantenimientoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  descripcion!: string;

  @IsDateString()
  fecha!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  tecnico!: string;
}
