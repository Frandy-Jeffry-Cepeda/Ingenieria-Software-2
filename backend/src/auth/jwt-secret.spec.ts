import { obtenerJwtSecret } from './jwt-secret';

describe('obtenerJwtSecret (D-13)', () => {
  const original = process.env.JWT_SECRET;
  afterEach(() => {
    process.env.JWT_SECRET = original;
  });

  it('devuelve la clave configurada en el entorno', () => {
    process.env.JWT_SECRET = 'clave-de-prueba-unitaria';
    expect(obtenerJwtSecret()).toBe('clave-de-prueba-unitaria');
  });

  it('falla si JWT_SECRET no está definida', () => {
    delete process.env.JWT_SECRET;
    expect(() => obtenerJwtSecret()).toThrow('JWT_SECRET');
  });

  it('falla si JWT_SECRET está vacía', () => {
    process.env.JWT_SECRET = '   ';
    expect(() => obtenerJwtSecret()).toThrow('JWT_SECRET');
  });
});
