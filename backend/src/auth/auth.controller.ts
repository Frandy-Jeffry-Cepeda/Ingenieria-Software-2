
import {
  Body,
  Controller,
  Post,
  Req,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { LoginDto } from './login.dto';
import { ChangePasswordDto } from './change-password.dto';
import { Public } from './public.decorator';
import { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  // ==========================================
  // INICIO DE SESIÓN
  // ==========================================
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(
      dto.email,
      dto.password,
    );
  }

  // ==========================================
  // CAMBIO DE CONTRASEÑA - E4, PAQUETE 2.3
  // ==========================================
  @Post('change-password')
  changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );
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
