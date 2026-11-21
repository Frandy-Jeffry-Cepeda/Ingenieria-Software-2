import { Body, Controller, DefaultValuePipe, Get, ParseIntPipe, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './login.dto';
import { ChangePasswordDto } from './change-password.dto';
import { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { Public } from './public.decorator';
import { RolUsuario } from '../usuarios/usuario.entity';
import { Roles } from './roles.decorator';
import { BitacoraAccesosService } from './bitacora/bitacora-accesos.service';

interface SolicitudAutenticada {
  user: {
    id: number;
    nombre: string;
    rol: RolUsuario;
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private bitacora: BitacoraAccesosService,
  ) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto.email, dto.password, req.ip);
  }

  // E4, paquete 2.4: consulta de la bitácora de accesos, solo para administradores.
  @Roles(RolUsuario.ADMINISTRADOR)
  @Get('accesos')
  accesos(@Query('limite', new DefaultValuePipe(100), ParseIntPipe) limite: number) {
    return this.bitacora.listar(limite);
  }

  // No lleva @Public(): el JwtAuthGuard global exige un JWT válido.
  // JwtStrategy consulta la base de datos en cada petición y entrega
  // el nombre y el rol actuales en request.user.
  @Get('me')
  me(@Req() request: SolicitudAutenticada) {
    const { id, nombre, rol } = request.user;
    return { id, nombre, rol };
  }
  // Protegido por el JwtAuthGuard global, igual que GET /auth/me.
  @Post('change-password')
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      request.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }
}
