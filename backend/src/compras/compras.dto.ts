import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class EquipoCompraDto {
  @IsString()
  @IsNotEmpty()
  tipo: string;

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsString()
  modelo?: string;

  @IsString()
  @IsNotEmpty()
  numeroSerie: string;
}

export class CrearCompraDto {
  @IsString()
  @IsNotEmpty()
  proveedor: string;

  @IsOptional()
  @IsString()
  numeroFactura?: string;

  @IsDateString()
  fechaCompra: string;

  @IsOptional()
  @IsNumber()
  costoTotal?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EquipoCompraDto)
  equipos: EquipoCompraDto[];
}
