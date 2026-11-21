import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RolUsuario } from '../usuarios/usuario.entity';
import { AuthenticatedRequest } from './interfaces/authenticated-request.interface';

describe('AuthController', () => {
  it('devuelve el perfil actual que JwtStrategy ya validó', () => {
    const servicio = { login: jest.fn() } as unknown as AuthService;
    const controlador = new AuthController(servicio);
    const solicitud = {
      user: { id: 7, nombre: 'Ana', rol: RolUsuario.TECNICO },
    };

    expect(controlador.me(solicitud)).toEqual({
      id: 7,
      nombre: 'Ana',
      rol: RolUsuario.TECNICO,
    });
  });

  it('mantiene la delegación del inicio de sesión al servicio', async () => {
    const login = jest.fn().mockResolvedValue({ token: 'token-prueba' });
    const servicio = { login } as unknown as AuthService;
    const controlador = new AuthController(servicio);
    const dto = { email: 'ana@example.com', password: 'clave-segura' };

    await expect(controlador.login(dto)).resolves.toEqual({ token: 'token-prueba' });
    expect(login).toHaveBeenCalledWith(dto.email, dto.password);
  });
  it('delega el cambio de contraseña al servicio con el usuario autenticado', async () => {
    const changePassword = jest.fn().mockResolvedValue({ message: 'Contraseña actualizada correctamente' });
    const servicio = { changePassword } as unknown as AuthService;
    const controlador = new AuthController(servicio);
    const solicitud = {
      user: { id: 7, nombre: 'Ana', rol: RolUsuario.TECNICO },
    } as unknown as AuthenticatedRequest;
    const dto = { currentPassword: 'AnteriorSegura123!', newPassword: 'NuevaSegura123!' };

    await expect(controlador.changePassword(solicitud, dto))
      .resolves.toEqual({ message: 'Contraseña actualizada correctamente' });
    expect(changePassword).toHaveBeenCalledWith(7, dto.currentPassword, dto.newPassword);
  });
});
