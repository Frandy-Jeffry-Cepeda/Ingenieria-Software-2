import { Body, Controller, Get, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import { ComprasService } from './compras.service';
import { CrearCompraDto } from './compras.dto';

@Controller('compras')
export class ComprasController {
  constructor(private comprasService: ComprasService) {}

  @Post()
  crear(@Body() dto: CrearCompraDto, @Req() req: any) {
    return this.comprasService.crear(dto, req.user.id);
  }

  @Get()
  listar() {
    return this.comprasService.listar();
  }

  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.comprasService.detalle(id);
  }
}
