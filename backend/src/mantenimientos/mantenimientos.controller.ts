import { Controller, Post, Body, Req } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { MantenimientosService } from './mantenimientos.service';
import { CrearOrdenMantenimientoDto } from './mantenimientos.dto';

@Controller('mantenimientos')
export class MantenimientosController {
  constructor(private readonly mantenimientosService: MantenimientosService) {}

  @Post()
  crearOrden(@Body() dto: CrearOrdenMantenimientoDto, @Req() req: AuthenticatedRequest) {
    return this.mantenimientosService.crearOrden(dto, req.user.id);
  }
}