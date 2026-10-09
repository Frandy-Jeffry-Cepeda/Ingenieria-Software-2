import { Body, Controller, Get, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { CrearCompraDto } from './compras.dto';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface'; //Agregamos el import de la interfaz AuthenticatedRequest para tipar correctamente el objeto req.

@Controller('compras')
export class ComprasController {
  constructor(private comprasService: ComprasService) {}

  @Post()
  crear(
  @Body() dto: CrearCompraDto,
  @Req() req: AuthenticatedRequest,
) {
  return this.comprasService.crear(dto, req.user.id);
} //Agregamos el parámetro req de tipo AuthenticatedRequest para acceder al id del usuario autenticado y pasarlo al servicio de compras.

  @Get()
  listar() {
    return this.comprasService.listar();
  }

  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.comprasService.detalle(id);
  }
}
