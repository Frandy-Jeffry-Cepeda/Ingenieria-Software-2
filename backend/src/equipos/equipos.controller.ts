import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { EquiposService } from './equipos.service';
import { EstadoEquipo } from './equipo.entity';
import { ActualizarEquipoDto, BajaEquipoDto, DevolverEquipoDto, EntregarEquipoDto } from './equipos.dto';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';

@Controller('equipos')
export class EquiposController {
  constructor(private equiposService: EquiposService) {}

  @Get()
  listar(@Query('estado') estado?: EstadoEquipo, @Query('q') q?: string) {
    return this.equiposService.listar(estado, q);
  }

  @Get('resumen')
  resumen() {
    return this.equiposService.resumen();
  }

  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.equiposService.detalle(id);
  }

  @Get(':id/movimientos')
  movimientos(@Param('id', ParseIntPipe) id: number) {
    return this.equiposService.movimientos(id);
  }

  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarEquipoDto) {
    return this.equiposService.actualizar(id, dto);
  }

  
  @Post(':id/entrega')
  entregar(
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: EntregarEquipoDto,
  @Req() req: AuthenticatedRequest,
  ) {
    return this.equiposService.entregar(id, dto, req.user.id);
  }

  @Post(':id/devolucion')
  devolver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DevolverEquipoDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.equiposService.devolver(id, dto, req.user.id);
  }

  @Post(':id/baja')
  darDeBaja(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: BajaEquipoDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.equiposService.darDeBaja(id, dto, req.user.id);
  } //Agregamos el parámetro req de tipo AuthenticatedRequest para acceder al id del usuario autenticado y pasarlo al servicio de equipos.
}
