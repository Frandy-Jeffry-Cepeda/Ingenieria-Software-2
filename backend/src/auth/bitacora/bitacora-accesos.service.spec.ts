import { Repository } from 'typeorm';
import { BitacoraAccesosService } from './bitacora-accesos.service';
import { RegistroAcceso, ResultadoAcceso } from './registro-acceso.entity';

// Pruebas unitarias de la bitácora de accesos (E4, paquete 2.4).
describe('BitacoraAccesosService', () => {
  const crear = (insert = jest.fn(async () => ({}))) => {
    const repo = { insert, find: jest.fn(async () => []) };
    return { servicio: new BitacoraAccesosService(repo as unknown as Repository<RegistroAcceso>), repo };
  };

  it('guarda un acceso exitoso con la cuenta, el correo normalizado y la IP', async () => {
    const { servicio, repo } = crear();
    await servicio.registrar({ email: '  Admin@TI.com ', resultado: ResultadoAcceso.EXITO, usuarioId: 3, ip: '10.0.0.1' });
    expect(repo.insert).toHaveBeenCalledWith({
      email: 'admin@ti.com', resultado: ResultadoAcceso.EXITO, motivo: null, usuario: { id: 3 }, ip: '10.0.0.1',
    });
  });

  it('guarda un intento fallido de una cuenta inexistente sin usuario (BA-03)', async () => {
    const { servicio, repo } = crear();
    await servicio.registrar({ email: 'nadie@ti.com', resultado: ResultadoAcceso.FALLIDO, motivo: 'cuenta_inexistente' });
    expect(repo.insert).toHaveBeenCalledWith(expect.objectContaining({ usuario: null, motivo: 'cuenta_inexistente' }));
  });

  it('no guarda ningún campo de contraseña, hash ni token (BA-07)', async () => {
    const { servicio, repo } = crear();
    await servicio.registrar({ email: 'a@ti.com', resultado: ResultadoAcceso.FALLIDO, motivo: 'contrasena_incorrecta' });
    const guardado = (repo.insert as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(guardado).sort()).toEqual(['email', 'ip', 'motivo', 'resultado', 'usuario']);
  });

  it('si la base falla, no propaga el error al inicio de sesión (BA-08)', async () => {
    const { servicio } = crear(jest.fn(async () => { throw new Error('base caída'); }));
    await expect(servicio.registrar({ email: 'a@ti.com', resultado: ResultadoAcceso.EXITO })).resolves.toBeUndefined();
  });

  it('lista del más reciente al más antiguo y limita la cantidad entre 1 y 500', async () => {
    const { servicio, repo } = crear();
    await servicio.listar(5000);
    expect(repo.find).toHaveBeenCalledWith(expect.objectContaining({ order: { fecha: 'DESC', id: 'DESC' }, take: 500 }));
    await servicio.listar(0);
    expect(repo.find).toHaveBeenLastCalledWith(expect.objectContaining({ take: 100 }));
  });
});
