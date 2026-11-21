import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './login.dto';
import { ChangePasswordDto } from './change-password.dto';
import { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { Public } from './public.decorator';
import { RolUsuario } from '../usuarios/usuario.entity';

interface SolicitudAutenticada {
  user: {
    id: number;
    nombre: string;
    rol: RolUsuario;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
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
