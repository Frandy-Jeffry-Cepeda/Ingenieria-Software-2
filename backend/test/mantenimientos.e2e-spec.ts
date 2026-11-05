import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('MantenimientosController (e2e)', () => {
  let app: INestApplication;

  const dtoOrden = {
    equipoId: 3,
    responsableId: 4,
    descripcionFalla: 'Prueba de integración: monitor parpadea',
  };

const equipoConcurrenciaId = 6;

let jwtToken: string;
const testEmail = process.env.TEST_USER_EMAIL;
const testPassword = process.env.TEST_USER_PASSWORD;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
if (!testEmail || !testPassword) {
  throw new Error(
    'Debes configurar TEST_USER_EMAIL y TEST_USER_PASSWORD',
  );
}

console.log('Diagnóstico del email:', {
  definido: typeof testEmail !== 'undefined',
  tipo: typeof testEmail,
  longitud: testEmail?.length,
  contieneArroba: testEmail?.includes('@'),
});

const loginResponse = await request(app.getHttpServer())
  .post('/auth/login')
  .send({
    email: testEmail,
    password: testPassword,
  });

expect(loginResponse.status).toBe(201);
expect(loginResponse.body.token).toBeDefined();

jwtToken = loginResponse.body.token;

  });

  it('/mantenimientos (POST) - Debe crear la orden exitosamente (1ra vez)', async () => {
    const res = await request(app.getHttpServer())
      .post('/mantenimientos')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send(dtoOrden);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.descripcion_falla).toEqual(dtoOrden.descripcionFalla);
  });

  it('/mantenimientos (POST) - Debe rechazar solicitud doble para el mismo equipo', async () => {
    const res = await request(app.getHttpServer())
      .post('/mantenimientos')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send(dtoOrden);

    // Como ya está en mantenimiento, debe retornar un error de validación/conflicto
      expect(res.status).toBe(409);
  });

it('/mantenimientos (POST) - Debe controlar solicitudes simultáneas', async () => {
  const dto = {
    ...dtoOrden,
    equipoId: equipoConcurrenciaId,
  };

  const [respuesta1, respuesta2] = await Promise.all([
    request(app.getHttpServer())
      .post('/mantenimientos')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send(dto),

    request(app.getHttpServer())
      .post('/mantenimientos')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send(dto),
  ]);

  const estados = [respuesta1.status, respuesta2.status].sort();

  expect(estados).toEqual([201, 409]);
});

  afterAll(async () => {
    await app.close();
  });
});