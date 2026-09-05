import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { RolUsuario } from './usuario.entity';
import { CrearUsuarioDto, ActualizarUsuarioDto } from './usuarios.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Get()
  listar(@Query('rol') rol?: RolUsuario) {
    return this.usuariosService.listar(rol);
  }

  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.detalle(id);
  }

  @Post()
  crear(@Body() dto: CrearUsuarioDto) {
    return this.usuariosService.crear(dto);
  }

  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarUsuarioDto) {
    return this.usuariosService.actualizar(id, dto);
  }
}
