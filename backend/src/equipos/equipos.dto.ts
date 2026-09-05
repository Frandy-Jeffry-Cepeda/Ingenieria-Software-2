import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
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
  usuarioId: number;

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
  motivo: MotivoSalida;

  @IsOptional()
  @IsString()
  observacion?: string;
}
