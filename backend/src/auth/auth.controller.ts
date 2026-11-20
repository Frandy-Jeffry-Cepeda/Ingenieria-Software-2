
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
}
