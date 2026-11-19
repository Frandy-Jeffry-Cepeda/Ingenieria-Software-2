import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { MailtrapService } from './mailtrap.service';

const datos = { numeroSerie: 'SN-1', descripcion: 'Cambio de disco', fecha: '2026-11-19', tecnico: 'Alan' };
function servicio(valores: Record<string, string | undefined>) {
  const config = { get: (k: string) => valores[k] } as unknown as ConfigService;
  return new MailtrapService(config);
}
const configurado = { MAILTRAP_API_TOKEN: 'token-de-prueba', MAILTRAP_INBOX_ID: '123' };

describe('MailtrapService', () => {
  const fetchOriginal = global.fetch;
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => { global.fetch = fetchOriginal; });

  it('no llama a la API si faltan el token o el buzón', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    await expect(servicio({}).enviarAvisoMantenimiento(datos)).resolves.toEqual({ enviado: false, motivo: 'Mailtrap no está configurado' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('envía el aviso al buzón del sandbox con el token en la cabecera', async () => {
    global.fetch = jest.fn(async () => ({ ok: true, status: 200 })) as unknown as typeof fetch;
    await expect(servicio(configurado).enviarAvisoMantenimiento(datos)).resolves.toEqual({ enviado: true });
    const [url, opciones] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://sandbox.api.mailtrap.io/api/send/123');
    expect(opciones.method).toBe('POST');
    expect(opciones.headers.Authorization).toBe('Bearer token-de-prueba');
    expect(JSON.parse(opciones.body).subject).toContain('SN-1');
  });

  it('informa el fallo sin lanzar excepción si Mailtrap responde con error', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 401 })) as unknown as typeof fetch;
    await expect(servicio(configurado).enviarAvisoMantenimiento(datos)).resolves.toMatchObject({ enviado: false });
  });

  it('informa el fallo sin lanzar excepción si no hay conexión', async () => {
    global.fetch = jest.fn(async () => { throw new Error('sin red'); }) as unknown as typeof fetch;
    await expect(servicio(configurado).enviarAvisoMantenimiento(datos)).resolves.toMatchObject({ enviado: false });
  });
});
