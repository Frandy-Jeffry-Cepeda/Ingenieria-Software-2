import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { RolUsuario } from './usuario.entity';
import { CrearUsuarioDto, ActualizarUsuarioDto } from './usuarios.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('usuarios')
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.TECNICO)
  @Get()
  listar(@Query('rol') rol?: RolUsuario) {
    return this.usuariosService.listar(rol);
  }

  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.TECNICO)
  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.detalle(id);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Post()
  crear(@Body() dto: CrearUsuarioDto) {
    return this.usuariosService.crear(dto);
  }

  @Roles(RolUsuario.ADMINISTRADOR)
  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarUsuarioDto) {
    return this.usuariosService.actualizar(id, dto);
  }
}
