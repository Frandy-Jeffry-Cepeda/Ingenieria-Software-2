import { Controller, Post, Body } from '@nestjs/common';
import { MantenimientosService } from './mantenimientos.service';
import { CrearOrdenMantenimientoDto } from './mantenimientos.dto';

@Controller('mantenimientos')
export class MantenimientosController {
  constructor(private readonly mantenimientosService: MantenimientosService) {}

  @Post()
  crearOrden(@Body() dto: CrearOrdenMantenimientoDto) {
    return this.mantenimientosService.crearOrden(dto);
  }
}