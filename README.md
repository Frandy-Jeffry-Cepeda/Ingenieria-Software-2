# Sistema de Inventario de Equipos de TI

Inventario interno para el departamento de TI de una organización. Los equipos entran por **registro de compra**, se **entregan** a empleados, se **devuelven** al almacén y salen del inventario por **baja** —desahucio u obsolescencia—, dejando un historial inmutable de cada movimiento con el técnico responsable.

**INF-5250 · Ingeniería de Software II** — Sección Z01 · Prof. Amancio Lorenzo Lorenzo
Universidad Autónoma de Santo Domingo · Facultad de Ciencias · Escuela de Informática
Período 2026-20 · **Equipo #6**

---

## Integrantes

| Integrante | Matrícula |
|---|---|
| Alan Javier Aquino De los Santos | 100398940 |
| Melany Estrella | 100654507 |
| Frandy Jeffry Cepeda | 100653570 |
| Juan Armando López Méndez | 100536291 |

---

## Qué hace el sistema

Un equipo nace `disponible` al registrarse la compra que lo trajo. Pasa a `entregado` cuando se asigna a un empleado y vuelve a `disponible` al devolverse, tantas veces como haga falta. Desde el Entregable 3 también puede ir a `en_mantenimiento` y volver a `disponible` al finalizar el mantenimiento. Sale del ciclo únicamente hacia `de_baja`, que es un estado terminal.

| Desde | Operación | Hacia |
|---|---|---|
| (compra) | registro de la compra | `disponible` |
| `disponible` | entrega a un empleado (RF-08) | `entregado` |
| `entregado` | devolución (RF-09) | `disponible` |
| `disponible` | envío a mantenimiento (E3) | `en_mantenimiento` |
| `en_mantenimiento` | fin del mantenimiento (E3) | `disponible` |
| `disponible` | baja por desahucio u obsolescencia | `de_baja` (terminal, el equipo no se borra) |

**Reglas duras**, validadas exclusivamente en el servidor:

- Solo un equipo `disponible` puede entregarse, enviarse a mantenimiento o darse de baja. Devolver exige `entregado` y finalizar un mantenimiento exige `en_mantenimiento`.
- La baja solo procede desde `disponible`. Un equipo entregado debe devolverse primero; la transición directa `entregado → de_baja` no existe.
- `de_baja` es terminal. El equipo no se elimina: sigue consultable con todo su historial.
- Cada transición inserta una fila en el historial y actualiza el equipo **en la misma transacción**.
- El identificador del técnico se toma siempre del token de sesión, nunca del cuerpo de la petición.

Solo los **técnicos de TI** inician sesión. Los **empleados** existen como registros a los que se asignan equipos y no tienen acceso al sistema.

---

## Módulo de mantenimientos (Entregable 3)

Incremento funcional 1. Un técnico envía un equipo disponible a mantenimiento desde su ficha, indicando la descripción del problema, la fecha y el técnico responsable. El cambio de estado, la orden y el movimiento del historial se guardan en la misma transacción, con el equipo bloqueado (`pessimistic_write`) para que dos solicitudes simultáneas no lo envíen dos veces. Después de guardar, el servidor avisa por correo mediante Mailtrap.

| Método y ruta | Qué hace |
|---|---|
| `POST /equipos/:id/mantenimiento` | Envía el equipo a mantenimiento. Cuerpo: `descripcion`, `fecha` (AAAA-MM-DD) y `tecnico`. Crea la orden, registra el movimiento `mantenimiento` y envía el aviso |
| `POST /equipos/:id/mantenimiento/finalizar` | Cierra la orden pendiente, registra el movimiento `fin_mantenimiento` y devuelve el equipo a `disponible` |
| `GET /equipos/:id/mantenimiento` | Lista las órdenes del equipo, de la más reciente a la más antigua. La usa la ficha del equipo |
| `POST /mantenimientos` | Registra una orden en la tabla `ordenes_mantenimiento` (paquete 1.2.3); la usan las pruebas de integración |

Todas las rutas exigen el token JWT.

**Aviso por correo (Mailtrap).** El servicio está en `backend/src/integraciones/mailtrap` y usa el buzón de pruebas (Email Sandbox), así que ningún correo llega a una persona real. Se configura en `backend/.env` con `MAILTRAP_API_TOKEN`, `MAILTRAP_INBOX_ID`, `MAILTRAP_FROM_EMAIL`, `MAILTRAP_FROM_NAME` y `MAILTRAP_TO_EMAIL` (ver `backend/.env.example`). Si faltan el token o el buzón, el sistema registra el mantenimiento igual y solo omite el correo. Un fallo de Mailtrap tampoco deshace el cambio de estado.

**Interfaz.** El botón «Enviar a mantenimiento» aparece en la ficha de un equipo disponible y abre `ModalMantenimiento`. La ficha muestra la lista de órdenes (`ListaOrdenes`) y la insignia del estado reconoce `en_mantenimiento`.

### Pruebas

Desde `backend/`:

```bash
npm test               # pruebas unitarias de las transiciones (Jest, sin base de datos)
npm run test:cov       # lo mismo, con reporte de cobertura en backend/coverage
npm run test:e2e       # pruebas de integración con Supertest (requieren la base de datos de desarrollo)
```

Las pruebas unitarias (`src/equipos/equipos.service.spec.ts`) cubren las cinco transiciones válidas y comprueban que las inválidas se rechazan sin guardar nada. Las de integración (`test/mantenimientos.e2e-spec.ts`) envían dos solicitudes simultáneas sobre el mismo equipo y esperan una respuesta 201 y otra 409; usan registros de la base de desarrollo, que hay que preparar antes de repetirlas.

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Interfaz | React 18 + Vite · react-bootstrap · axios · react-router 6 (JavaScript) |
| Servidor | NestJS 11 + TypeORM 0.3 · Passport-JWT · bcryptjs (TypeScript) |
| Base de datos | PostgreSQL 16, con tipos enumerados nativos |
| Empaquetado | Docker Compose de tres servicios (base de datos, API y nginx) |

---

## Ejecutar en local

### Requisitos previos

- **Node.js 20** o superior
- **pnpm** — `npm install -g pnpm` (o usar `npm`, ver la nota al final)
- **PostgreSQL 16** — durante la instalación se define una contraseña para el usuario `postgres`; hay que anotarla

### 1. Crear la base de datos vacía

Solo la base. Las tablas las crea el sistema al arrancar, no hay scripts que importar.

```bash
psql -U postgres -c "CREATE DATABASE inventario_ti;"
```

### 2. Configurar el servidor

```bash
cd backend
cp .env.example .env      # en Windows: copy .env.example .env
```

En el `.env` recién creado, cambiar **solo** `DB_PASS` por la contraseña definida al instalar PostgreSQL. El resto de las variables ya apuntan a `localhost:5432` y a la base `inventario_ti`.

### 3. Instalar dependencias y sembrar datos

```bash
pnpm install
pnpm run seed
```

El seed crea las tablas, el técnico administrador y datos de demostración: empleados, dos compras y unos ocho equipos en estados variados. Es idempotente — si ya existe un técnico, no hace nada.

### 4. Arrancar, en dos terminales

```bash
# Terminal 1 — servidor
cd backend
pnpm start          # o pnpm run start:dev para recarga en caliente

# Terminal 2 — interfaz
cd frontend
pnpm install
pnpm run dev
```

Abrir **http://localhost:5173**.

> No hace falta configurar la dirección de la API. `vite.config.js` ya redirige `/api` hacia `http://localhost:3000`, igual que hace nginx en producción, así que el código es idéntico en ambos entornos.

### Credenciales iniciales

```
admin@ti.com / admin123
```

Provienen del seed y son de demostración. **Deben cambiarse en cualquier despliegue real.**

---

## Alternativa: ejecutar con Docker

Si se prefiere no instalar PostgreSQL localmente:

```bash
cp .env.example .env      # definir POSTGRES_PASSWORD y JWT_SECRET
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

- Aplicación: http://localhost:8080
- API directa: http://localhost:3000/health

Para apagar y borrar los datos: `docker compose down -v`.

---

## Estructura del repositorio

```
backend/                  API NestJS
  src/
    auth/                 sesión: controlador, servicio, estrategia y guardia JWT
    usuarios/             entidad Usuario (empleados y técnicos), controlador, servicio
    compras/              entidad Compra; al crear una compra se crean sus equipos
    equipos/              entidades Equipo, Movimiento y Mantenimiento; máquina de estados
    mantenimientos/       órdenes de mantenimiento (POST /mantenimientos)
    integraciones/mailtrap/  aviso por correo al enviar un equipo a mantenimiento
  test/                   pruebas de integración (Jest + Supertest)
    health.controller.ts  verificación de salud del servicio
    seed.ts               siembra del técnico inicial y datos de demostración
frontend/                 SPA React
  src/
    api/api.js            instancia axios única, con interceptor de token
    context/              AuthContext
    components/           Layout · RutaPrivada · EstadoBadge · ModalEntrega · ModalBaja ·
                          ModalMantenimiento · ListaOrdenes
    pages/                Login · Dashboard · ListaEquipos · DetalleEquipo ·
                          RegistrarCompra · ListaUsuarios · DetalleUsuario
docker-compose.yml        stack completo de tres servicios
```

---

## Documentación del proyecto

| Documento | Contenido |
|---|---|
| `Documentacion-MVP-Inventario-TI-INF5250-Equipo6.docx` | Especificación de requisitos, modelado y diseño: 23 requisitos funcionales, 10 no funcionales, historias de usuario, casos de uso, seis diagramas UML, matriz MoSCoW y matriz de trazabilidad |
| `DISENO-MVP.md` | Documento de diseño original: decisiones cerradas, modelo de datos, catálogo de endpoints y alcance |
| `DEPLOY.md` | Despliegue en contenedores y publicación |

---

## Nota sobre el gestor de paquetes

El repositorio versiona `package-lock.json`, que es de **npm**. `pnpm` lo ignora y resuelve las versiones por su cuenta, por lo que distintas máquinas podrían terminar con dependencias ligeramente diferentes.

Para que las mediciones del proyecto sean reproducibles entre los cuatro integrantes, conviene que todos usen la misma herramienta: o bien `npm install`, que aprovecha el lockfile existente, o bien `pnpm` versionando también el `pnpm-lock.yaml`.
