import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RolUsuario } from '../usuarios/usuario.entity';
import { AuthenticatedRequest } from './interfaces/authenticated-request.interface';
import { BitacoraAccesosService } from './bitacora/bitacora-accesos.service';
import type { Request } from 'express';

const bitacora = { listar: jest.fn(async () => []) } as unknown as BitacoraAccesosService;

describe('AuthController', () => {
  it('devuelve el perfil actual que JwtStrategy ya validó', () => {
    const servicio = { login: jest.fn() } as unknown as AuthService;
    const controlador = new AuthController(servicio, bitacora);
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
    const controlador = new AuthController(servicio, bitacora);
    const dto = { email: 'ana@example.com', password: 'clave-segura' };

    await expect(controlador.login(dto, { ip: '10.0.0.5' } as Request)).resolves.toEqual({ token: 'token-prueba' });
    expect(login).toHaveBeenCalledWith(dto.email, dto.password, '10.0.0.5');
  });
  it('delega el cambio de contraseña al servicio con el usuario autenticado', async () => {
    const changePassword = jest.fn().mockResolvedValue({ message: 'Contraseña actualizada correctamente' });
    const servicio = { changePassword } as unknown as AuthService;
    const controlador = new AuthController(servicio, bitacora);
    const solicitud = {
      user: { id: 7, nombre: 'Ana', rol: RolUsuario.TECNICO },
    } as unknown as AuthenticatedRequest;
    const dto = { currentPassword: 'AnteriorSegura123!', newPassword: 'NuevaSegura123!' };

    await expect(controlador.changePassword(solicitud, dto))
      .resolves.toEqual({ message: 'Contraseña actualizada correctamente' });
    expect(changePassword).toHaveBeenCalledWith(7, dto.currentPassword, dto.newPassword);
  });

  it('consulta la bitácora de accesos con el límite indicado', async () => {
    const servicio = {} as AuthService;
    const controlador = new AuthController(servicio, bitacora);
    await expect(controlador.accesos(20)).resolves.toEqual([]);
    expect(bitacora.listar).toHaveBeenCalledWith(20);
  });
});
