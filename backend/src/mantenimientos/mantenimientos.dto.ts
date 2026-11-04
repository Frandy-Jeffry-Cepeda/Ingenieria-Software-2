import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CrearOrdenMantenimientoDto {
  @IsInt()
  @IsNotEmpty()
  equipoId: number;

  @IsInt()
  @IsNotEmpty()
  responsableId: number;

  @IsString()
  @IsNotEmpty()
  descripcionFalla: string;
}