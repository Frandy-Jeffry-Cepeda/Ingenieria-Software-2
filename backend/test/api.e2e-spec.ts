import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// Pruebas de integración de la API completa (E4, paquete 2.7).
// Requieren una base PostgreSQL con el seed cargado y las variables
// TEST_USER_EMAIL y TEST_USER_PASSWORD del técnico de prueba.
// Cada corrida crea sus propios datos (números de serie y correos únicos),
// así que se puede repetir sobre la misma base.

describe('API de Inventario TI (e2e)', () => {
  let app: INestApplication;
  let token: string;
  const sufijo = Date.now().toString(36);
  const http = () => request(app.getHttpServer());
  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);
  let empleadoId: number;
  let equipos: Array<{ id: number; numeroSerie: string }>;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    const login = await http().post('/auth/login')
      .send({ email: process.env.TEST_USER_EMAIL, password: process.env.TEST_USER_PASSWORD });
    expect(login.status).toBe(201);
    token = login.body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Autenticación', () => {
    it('/health es público y reporta la base de datos', async () => {
      const r = await http().get('/health');
      expect(r.status).toBe(200);
      expect(r.body.db).toBe('ok');
    });

    it('rechaza las rutas protegidas sin token (401)', async () => {
      expect((await http().get('/equipos')).status).toBe(401);
      expect((await http().get('/usuarios')).status).toBe(401);
      expect((await http().post('/compras').send({})).status).toBe(401);
    });

    it('rechaza un token alterado (401)', async () => {
      const r = await http().get('/equipos').set('Authorization', `Bearer ${token}x`);
      expect(r.status).toBe(401);
    });

    it('rechaza credenciales incorrectas (401)', async () => {
      const r = await http().post('/auth/login').send({ email: process.env.TEST_USER_EMAIL, password: 'incorrecta' });
      expect(r.status).toBe(401);
    });
  });

  describe('Usuarios', () => {
    it('crea un empleado y lo lista con su cantidad de equipos', async () => {
      const r = await auth(http().post('/usuarios')).send({ nombre: 'Empleado E2E', email: `e2e-${sufijo}@empresa.com`, departamento: 'QA' });
      expect(r.status).toBe(201);
      expect(r.body.rol).toBe('empleado');
      expect(r.body.passwordHash).toBeUndefined();
      empleadoId = r.body.id;
      const lista = await auth(http().get('/usuarios'));
      expect(lista.body.find((u: { id: number }) => u.id === empleadoId).cantidadEquipos).toBe(0);
    });

    it('no permite correos repetidos (400)', async () => {
      const r = await auth(http().post('/usuarios')).send({ nombre: 'Otro', email: `e2e-${sufijo}@empresa.com` });
      expect(r.status).toBe(400);
    });

    it('no crea un técnico sin contraseña (400)', async () => {
      const r = await auth(http().post('/usuarios')).send({ nombre: 'Técnico', email: `tec-${sufijo}@ti.com`, rol: 'tecnico' });
      expect(r.status).toBe(400);
    });

    it('valida el formato del correo (400)', async () => {
      const r = await auth(http().post('/usuarios')).send({ nombre: 'X', email: 'no-es-correo' });
      expect(r.status).toBe(400);
    });
  });

  describe('Compras', () => {
    it('registra una compra con sus equipos, todos disponibles', async () => {
      const r = await auth(http().post('/compras')).send({
        proveedor: 'Proveedor E2E', fechaCompra: '2026-11-19', costoTotal: 2500,
        equipos: [1, 2, 3, 4].map((n) => ({ tipo: 'laptop', marca: 'Dell', modelo: 'E2E', numeroSerie: `E2E-${sufijo}-${n}` })),
      });
      expect(r.status).toBe(201);
      equipos = r.body.equipos;
      expect(equipos).toHaveLength(4);
      for (const e of equipos) {
        const d = await auth(http().get(`/equipos/${e.id}`));
        expect(d.body.estado).toBe('disponible');
      }
    });

    it('rechaza una compra sin equipos (400)', async () => {
      const r = await auth(http().post('/compras')).send({ proveedor: 'X', fechaCompra: '2026-11-19', equipos: [] });
      expect(r.status).toBe(400);
    });

    it('rechaza un número de serie repetido (400)', async () => {
      const r = await auth(http().post('/compras')).send({
        proveedor: 'X', fechaCompra: '2026-11-19', equipos: [{ tipo: 'laptop', numeroSerie: `E2E-${sufijo}-1` }],
      });
      expect(r.status).toBe(400);
    });

    it('responde 404 para una compra inexistente', async () => {
      expect((await auth(http().get('/compras/999999'))).status).toBe(404);
    });
  });

  describe('Ciclo de vida de un equipo', () => {
    it('un técnico no puede dar de baja un equipo: solo el administrador (403)', async () => {
      const clave = `Tec-${sufijo}-clave-segura`;
      const correo = `tec-baja-${sufijo}@ti.com`;
      const alta = await auth(http().post('/usuarios')).send({ nombre: 'Técnico Baja', email: correo, rol: 'tecnico', password: clave });
      expect(alta.status).toBe(201);
      const login = await http().post('/auth/login').send({ email: correo, password: clave });
      expect(login.status).toBe(201);
      const id = equipos[0].id;
      const r = await http().post(`/equipos/${id}/baja`).set('Authorization', `Bearer ${login.body.token}`).send({ motivo: 'obsolescencia' });
      expect(r.status).toBe(403);
      expect((await auth(http().get(`/equipos/${id}`))).body.estado).toBe('disponible');
    });

    it('entrega, rechaza la baja de un equipo entregado, devuelve y da de baja', async () => {
      const id = equipos[0].id;
      expect((await auth(http().post(`/equipos/${id}/entrega`)).send({ usuarioId: empleadoId })).status).toBe(201);
      expect((await auth(http().get(`/equipos/${id}`))).body.usuarioActual.id).toBe(empleadoId);
      expect((await auth(http().post(`/equipos/${id}/entrega`)).send({ usuarioId: empleadoId })).status).toBe(400);
      expect((await auth(http().post(`/equipos/${id}/baja`)).send({ motivo: 'obsolescencia' })).status).toBe(400);
      expect((await auth(http().post(`/equipos/${id}/devolucion`)).send({})).status).toBe(201);
      expect((await auth(http().post(`/equipos/${id}/baja`)).send({ motivo: 'obsolescencia' })).status).toBe(201);
      const d = await auth(http().get(`/equipos/${id}`));
      expect(d.body.estado).toBe('de_baja');
      expect(d.body.usuarioActual).toBeNull();
    });

    it('un equipo de baja ya no admite ninguna operación', async () => {
      const id = equipos[0].id;
      expect((await auth(http().post(`/equipos/${id}/entrega`)).send({ usuarioId: empleadoId })).status).toBe(400);
      expect((await auth(http().post(`/equipos/${id}/devolucion`)).send({})).status).toBe(400);
      expect((await auth(http().post(`/equipos/${id}/mantenimiento`)).send({ descripcion: 'x', fecha: '2026-11-19', tecnico: 'x' })).status).toBe(400);
    });

    it('el historial registra cada transición con el técnico del token', async () => {
      const r = await auth(http().get(`/equipos/${equipos[0].id}/movimientos`));
      expect(r.body.map((m: { tipo: string }) => m.tipo).sort()).toEqual(['devolucion', 'entrega', 'salida']);
      expect(r.body.every((m: { tecnico: { id: number } | null }) => m.tecnico !== null)).toBe(true);
    });


it('no entrega equipos a técnicos ni a empleados inexistentes (400)', async () => {
  const id = equipos[1].id;

  // Crear un técnico propio para evitar depender de los datos del seed.
  const tecnico = await auth(http().post('/usuarios')).send({
    nombre: 'Tecnico E2E',
    email: `tecnico-entrega-${sufijo}@ti.com`,
    rol: 'tecnico',
    password: `Clave-E2E-${sufijo}-Segura!`,
  });

  // Confirmar que el técnico de prueba se creó correctamente.
  expect(tecnico.status).toBe(201);
  expect(tecnico.body.rol).toBe('tecnico');

  // Un equipo no puede entregarse a un técnico.
  const entregaTecnico = await auth(
    http().post(`/equipos/${id}/entrega`),
  ).send({ usuarioId: tecnico.body.id });

  expect(entregaTecnico.status).toBe(400);

  // Tampoco puede entregarse a un usuario inexistente.
  const entregaInexistente = await auth(
    http().post(`/equipos/${id}/entrega`),
  ).send({ usuarioId: 999999 });

  expect(entregaInexistente.status).toBe(400);
});


    it('no entrega equipos a un empleado desactivado (400)', async () => {
      const r = await auth(http().post('/usuarios')).send({ nombre: 'Inactivo', email: `inactivo-${sufijo}@empresa.com` });
      await auth(http().patch(`/usuarios/${r.body.id}`)).send({ activo: false });
      expect((await auth(http().post(`/equipos/${equipos[1].id}/entrega`)).send({ usuarioId: r.body.id })).status).toBe(400);
    });

    it('responde 404 para un equipo inexistente y 400 para un id no numérico', async () => {
      expect((await auth(http().get('/equipos/999999'))).status).toBe(404);
      expect((await auth(http().get('/equipos/abc'))).status).toBe(400);
    });
  });

  describe('Mantenimiento', () => {
    it('envía a mantenimiento, lista la orden y finaliza', async () => {
      const id = equipos[1].id;
      const env = await auth(http().post(`/equipos/${id}/mantenimiento`)).send({ descripcion: 'Cambio de batería', fecha: '2026-11-19', tecnico: 'Alan' });
      expect(env.status).toBe(201);
      expect(env.body.equipo.estado).toBe('en_mantenimiento');
      const ordenes = await auth(http().get(`/equipos/${id}/mantenimiento`));
      expect(ordenes.body).toHaveLength(1);
      expect(ordenes.body[0].fechaFinalizacion).toBeNull();
      const resumen = await auth(http().get('/equipos/resumen'));
      expect(resumen.body.enMantenimiento).toBeGreaterThanOrEqual(1);
      const filtro = await auth(http().get('/equipos?estado=en_mantenimiento'));
      expect(filtro.body.map((e: { id: number }) => e.id)).toContain(id);
      expect((await auth(http().post(`/equipos/${id}/devolucion`)).send({})).status).toBe(400);
      expect((await auth(http().post(`/equipos/${id}/mantenimiento/finalizar`))).status).toBe(201);
      expect((await auth(http().get(`/equipos/${id}`))).body.estado).toBe('disponible');
      expect((await auth(http().post(`/equipos/${id}/mantenimiento/finalizar`))).status).toBe(400);
    });

    it('valida los datos de la orden (400)', async () => {
      const r = await auth(http().post(`/equipos/${equipos[1].id}/mantenimiento`)).send({ descripcion: '', fecha: 'ayer', tecnico: 'x' });
      expect(r.status).toBe(400);
    });

    it('una orden creada por POST /mantenimientos queda en el historial del equipo', async () => {
      const id = equipos[2].id;
      const r = await auth(http().post('/mantenimientos')).send({ equipoId: id, responsableId: empleadoId, descripcionFalla: 'No enciende' });
      expect(r.status).toBe(201);
      const movs = await auth(http().get(`/equipos/${id}/movimientos`));
      expect(movs.body.map((m: { tipo: string }) => m.tipo)).toContain('mantenimiento');
    });

    it('un equipo enviado por POST /mantenimientos se puede finalizar', async () => {
      const id = equipos[2].id;
      expect((await auth(http().post(`/equipos/${id}/mantenimiento/finalizar`))).status).toBe(201);
      expect((await auth(http().get(`/equipos/${id}`))).body.estado).toBe('disponible');
    });
  });

  describe('Concurrencia', () => {
    it('diez entregas simultáneas del mismo equipo: solo una se acepta y queda un solo movimiento', async () => {
      const id = equipos[3].id;
      const respuestas = await Promise.all(
        Array.from({ length: 10 }, () => auth(http().post(`/equipos/${id}/entrega`)).send({ usuarioId: empleadoId })),
      );
      expect(respuestas.filter((r) => r.status === 201)).toHaveLength(1);
      const movs = await auth(http().get(`/equipos/${id}/movimientos`));
      expect(movs.body.filter((m: { tipo: string }) => m.tipo === 'entrega')).toHaveLength(1);
    });
  });

  // E4, paquete 2.4: bitácora de accesos (casos BA-01 a BA-07).
  describe('Bitácora de accesos', () => {
    type Registro = { email: string; resultado: string; motivo: string | null; usuario: { id: number } | null };
    const accesos = async () => (await auth(http().get('/auth/accesos?limite=200'))).body as Registro[];
    const clave = `Bitacora-${sufijo}-Clave!`;
    const correo = `tec-bitacora-${sufijo}@ti.com`;
    let tecnicoId: number;

    beforeAll(async () => {
      const alta = await auth(http().post('/usuarios')).send({ nombre: 'Técnico Bitácora', email: correo, rol: 'tecnico', password: clave });
      expect(alta.status).toBe(201);
      tecnicoId = alta.body.id;
    });

    it('BA-01: un login válido queda como EXITO con la cuenta', async () => {
      expect((await http().post('/auth/login').send({ email: correo, password: clave })).status).toBe(201);
      const r = (await accesos()).find((a) => a.email === correo && a.resultado === 'EXITO');
      expect(r?.usuario?.id).toBe(tecnicoId);
      expect(r?.motivo).toBeNull();
    });

    it('BA-02: una contraseña incorrecta queda como FALLIDO', async () => {
      expect((await http().post('/auth/login').send({ email: correo, password: 'no-es-la-clave' })).status).toBe(401);
      const r = (await accesos()).find((a) => a.email === correo && a.resultado === 'FALLIDO');
      expect(r?.motivo).toBe('contrasena_incorrecta');
    });

    it('BA-03: una cuenta inexistente queda como FALLIDO sin usuario', async () => {
      const nadie = `nadie-${sufijo}@ti.com`;
      expect((await http().post('/auth/login').send({ email: nadie, password: 'x' })).status).toBe(401);
      const r = (await accesos()).find((a) => a.email === nadie);
      expect(r).toMatchObject({ resultado: 'FALLIDO', motivo: 'cuenta_inexistente', usuario: null });
    });

    it('BA-04: una cuenta desactivada es rechazada y queda como FALLIDO', async () => {
      expect((await auth(http().patch(`/usuarios/${tecnicoId}`)).send({ activo: false })).status).toBe(200);
      expect((await http().post('/auth/login').send({ email: correo, password: clave })).status).toBe(401);
      const r = (await accesos()).find((a) => a.email === correo && a.motivo === 'cuenta_inactiva');
      expect(r?.resultado).toBe('FALLIDO');
    });

    it('BA-05: cada intento consecutivo deja su propio registro', async () => {
      const otro = `consecutivo-${sufijo}@ti.com`;
      for (let i = 0; i < 3; i++) await http().post('/auth/login').send({ email: otro, password: 'x' });
      expect((await accesos()).filter((a) => a.email === otro)).toHaveLength(3);
    });

    it('BA-06: solo el administrador consulta la bitácora; un técnico recibe 403', async () => {
      const claveTec = `Lector-${sufijo}-Clave!`;
      const correoTec = `tec-lector-${sufijo}@ti.com`;
      await auth(http().post('/usuarios')).send({ nombre: 'Técnico Lector', email: correoTec, rol: 'tecnico', password: claveTec });
      const login = await http().post('/auth/login').send({ email: correoTec, password: claveTec });
      const r = await http().get('/auth/accesos').set('Authorization', `Bearer ${login.body.token}`);
      expect(r.status).toBe(403);
      expect((await http().get('/auth/accesos')).status).toBe(401);
    });

    it('BA-07: la bitácora no expone contraseñas, hashes ni tokens', async () => {
      const r = await auth(http().get('/auth/accesos?limite=200'));
      const texto = JSON.stringify(r.body);
      expect(texto).not.toContain(clave);
      expect(texto).not.toContain('no-es-la-clave');
      expect(texto).not.toMatch(/password|passwordHash|token|\$2[aby]\$/i);
    });
  });
});

