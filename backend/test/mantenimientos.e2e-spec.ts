
import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('MantenimientosController (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;
  let responsableId: number;
  let equipoId: number;

  beforeAll(async () => {
    // Seguridad: las pruebas modifican datos.
    // Solo se permite utilizar la base de pruebas.
const dbHost = (process.env.DB_HOST ?? '').trim().toLowerCase();
const dbPort = (process.env.DB_PORT ?? '').trim();
const dbName = (process.env.DB_NAME ?? '').trim();

const databaseUrlConfigurada = Boolean(
  process.env.DATABASE_URL?.trim(),
);

if (
  databaseUrlConfigurada ||
  !['localhost', '127.0.0.1'].includes(dbHost) ||
  dbPort !== '55432' ||
  dbName !== 'inventario_ti_test' ||
  process.env.DB_SSL !== 'false'
) {
  throw new Error(
    'D-18: las pruebas solo pueden ejecutarse contra ' +
      'PostgreSQL local (127.0.0.1:55432), con la base ' +
      'inventario_ti_test, SSL desactivado y sin DATABASE_URL.',
  );
}


    const testEmail = process.env.TEST_USER_EMAIL;
    const testPassword = process.env.TEST_USER_PASSWORD;

    if (!testEmail || !testPassword) {
      throw new Error(
        'Configura TEST_USER_EMAIL y TEST_USER_PASSWORD.',
      );
    }

    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(loginResponse.status).toBe(201);
    expect(loginResponse.body.token).toBeDefined();

    jwtToken = loginResponse.body.token;

    // Obtener el ID real del usuario autenticado.
    const payload = JSON.parse(
      Buffer.from(
        jwtToken.split('.')[1],
        'base64url',
      ).toString('utf8'),
    ) as { sub?: number | string };

    responsableId = Number(payload.sub);

    if (
      !Number.isSafeInteger(responsableId) ||
      responsableId <= 0
    ) {
      throw new Error(
        'El token no contiene un ID de usuario válido.',
      );
    }
  });

  beforeEach(async () => {
    // Un equipo nuevo por prueba evita depender de
    // identificadores o estados de ejecuciones anteriores.
    const identificador = randomUUID();

    const respuestaCompra = await request(app.getHttpServer())
      .post('/compras')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        proveedor: 'Proveedor QA - D18',
        numeroFactura: `D18-${identificador}`,
        fechaCompra: new Date().toISOString(),
        equipos: [
          {
            tipo: 'Monitor',
            marca: 'QA',
            modelo: 'Prueba D18',
            numeroSerie: `D18-${identificador}`,
          },
        ],
      });

    expect(respuestaCompra.status).toBe(201);

    equipoId = respuestaCompra.body.equipos?.[0]?.id;

    expect(Number.isInteger(equipoId)).toBe(true);
    expect(equipoId).toBeGreaterThan(0);
  });

  const crearDtoOrden = (
    idEquipo: number,
    idResponsable: number,
  ) => ({
    equipoId: idEquipo,
    responsableId: idResponsable,
    descripcionFalla:
      'Prueba de integración: monitor parpadea',
  });

  it('POST /mantenimientos - crea una orden correctamente', async () => {
    const dto = crearDtoOrden(equipoId, responsableId);

    const respuesta = await request(app.getHttpServer())
      .post('/mantenimientos')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send(dto);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toHaveProperty('id');
    expect(respuesta.body.descripcion_falla).toBe(
      dto.descripcionFalla,
    );
  });

  it('POST /mantenimientos - rechaza una orden duplicada', async () => {
    const dto = crearDtoOrden(equipoId, responsableId);

    const primera = await request(app.getHttpServer())
      .post('/mantenimientos')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send(dto);

    expect(primera.status).toBe(201);

    const segunda = await request(app.getHttpServer())
      .post('/mantenimientos')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send(dto);

    expect(segunda.status).toBe(409);
  });

  it('POST /mantenimientos - controla solicitudes simultáneas', async () => {
    const dto = crearDtoOrden(equipoId, responsableId);

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

    const estados = [
      respuesta1.status,
      respuesta2.status,
    ].sort((a, b) => a - b);

    expect(estados).toEqual([201, 409]);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });
});
