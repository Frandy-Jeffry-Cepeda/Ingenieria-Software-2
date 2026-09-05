# Diseño Final — Sistema de Inventario de Equipos de TI (MVP Universitario)

**Stack fijo:** React (frontend) · NestJS (backend) · PostgreSQL (base de datos)
**Convención única de código:** nombres en español. Base de datos en `snake_case` (`numero_serie`), código TypeScript/JS en `camelCase` (`numeroSerie`). Un solo idioma en todo el proyecto.

---

## 1. Resumen del análisis

El sistema es un inventario interno para el departamento de TI: los equipos entran por **registro de compra**, viven en almacén como **disponibles**, se **entregan** a empleados (quedan "en uso"), pueden **devolverse** al almacén y finalmente salen del inventario por **baja** (desahucio u obsolescencia). Los únicos usuarios que operan el sistema son los **técnicos de TI**, que inician sesión; los **empleados** son solo registros a los que se les asignan equipos, no inician sesión.

**Veredicto:** es una idea excelente para un MVP universitario. Tiene un dominio claro, una máquina de estados pequeña y demostrable, CRUDs sencillos y un flujo de negocio real (compra → entrega → devolución → baja) que luce completo en una demo. El riesgo no es técnico sino de alcance: la lista OUT de la sección 6 es el contrato del equipo.

Decisiones globales cerradas (sin alternativas):

| Tema | Decisión única |
|---|---|
| ORM | TypeORM con `synchronize: true` en desarrollo (sin migraciones) |
| Autenticación | JWT mínimo solo para técnicos (`@nestjs/jwt` + `passport-jwt` + `bcrypt`), token de 8h, sin refresh ni recuperación de clave. Primer técnico creado por **script de seed** |
| HTTP en frontend | axios |
| UI | react-bootstrap |
| Lenguaje frontend | JavaScript plano, plantilla `react` de Vite (sin TypeScript en frontend) |
| Estado global frontend | `AuthContext` mínimo que guarda token y nombre del técnico (persiste el token en `localStorage` internamente) |
| Base de datos | PostgreSQL instalado localmente, sin Docker |
| Usuarios y técnicos | **Una sola tabla `usuarios`** con enum de rol (`empleado`, `tecnico`) |
| Historial | Tabla `movimientos` inmutable; **no** existe entidad "asignación" con fecha de devolución editable |

---

## 2. Máquina de estados del equipo (definitiva)

"Entregado" y "en uso" son **un solo estado**: el equipo salió del almacén y lo tiene un empleado. Se llama `entregado`.

```sql
CREATE TYPE estado_equipo AS ENUM ('disponible', 'entregado', 'de_baja');
```

| # | Desde | Evento | Hacia | Quién |
|---|---|---|---|---|
| 1 | *(no existe)* | Registro de compra | `disponible` | Técnico |
| 2 | `disponible` | Entrega a un empleado | `entregado` | Técnico |
| 3 | `entregado` | Devolución al almacén | `disponible` | Técnico |
| 4 | `disponible` | Baja (desahucio u obsolescencia) | `de_baja` | Técnico |

**Reglas duras (una sola fuente de verdad):**
- La baja **solo** procede desde `disponible`. Un equipo `entregado` debe devolverse primero (transición 3 y luego 4). No existe `entregado → de_baja`.
- `de_baja` es terminal: ninguna transición sale de ahí. El equipo no se borra; sigue consultable con su historial.
- Toda transición no listada devuelve `400` con mensaje claro (ej. "El equipo no está disponible para entrega").
- Las transiciones se validan **únicamente en el backend**, en un solo método `cambiarEstado()` de `EquiposService` con un mapa simple de transiciones permitidas. El frontend solo esconde botones. Sin triggers en PostgreSQL.
- Cada transición inserta una fila en `movimientos` y actualiza `equipos` **en la misma transacción**.

---

## 3. Modelo de datos (definitivo)

PKs `SERIAL`. Enums de PostgreSQL:

```sql
CREATE TYPE estado_equipo   AS ENUM ('disponible', 'entregado', 'de_baja');
CREATE TYPE tipo_movimiento AS ENUM ('entrega', 'devolucion', 'salida');
CREATE TYPE motivo_salida   AS ENUM ('desahucio', 'obsolescencia');
CREATE TYPE rol_usuario     AS ENUM ('empleado', 'tecnico');
```

### `usuarios` (empleados y técnicos, diferenciados por rol)

| Columna | Tipo | Restricciones |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| nombre | VARCHAR(100) | NOT NULL |
| email | VARCHAR(150) | NOT NULL, UNIQUE |
| departamento | VARCHAR(80) | NULL |
| rol | rol_usuario | NOT NULL, DEFAULT 'empleado' |
| password_hash | VARCHAR(255) | NULL — solo técnicos; los empleados no inician sesión |
| activo | BOOLEAN | NOT NULL, DEFAULT true |

### `compras` (puerta de entrada de los equipos)

| Columna | Tipo | Restricciones |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| proveedor | VARCHAR(150) | NOT NULL |
| numero_factura | VARCHAR(50) | NULL |
| fecha_compra | DATE | NOT NULL |
| costo_total | NUMERIC(12,2) | NULL |
| registrada_por | INT | NOT NULL, FK → usuarios(id) — técnico, sale del JWT |
| creado_en | TIMESTAMP | NOT NULL, DEFAULT now() |

### `equipos`

| Columna | Tipo | Restricciones |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| compra_id | INT | NOT NULL, FK → compras(id) — todo equipo nace de una compra |
| tipo | VARCHAR(50) | NOT NULL (texto libre: "laptop", "monitor"…) |
| marca | VARCHAR(50) | NULL |
| modelo | VARCHAR(80) | NULL |
| numero_serie | VARCHAR(100) | NOT NULL, UNIQUE |
| estado | estado_equipo | NOT NULL, DEFAULT 'disponible' |
| usuario_actual_id | INT | NULL, FK → usuarios(id) — quién lo tiene; NULL en almacén o de baja |
| creado_en | TIMESTAMP | NOT NULL, DEFAULT now() |

### `movimientos` (historial inmutable — nunca se edita ni se borra)

| Columna | Tipo | Restricciones |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| equipo_id | INT | NOT NULL, FK → equipos(id) |
| tipo | tipo_movimiento | NOT NULL |
| usuario_id | INT | NULL, FK → usuarios(id) — empleado que recibe o devuelve; NULL cuando tipo = 'salida' |
| tecnico_id | INT | NOT NULL, FK → usuarios(id) — técnico que ejecuta (sale del JWT) |
| motivo_salida | motivo_salida | NULL — se llena solo cuando tipo = 'salida' |
| observacion | TEXT | NULL |
| fecha | TIMESTAMP | NOT NULL, DEFAULT now() |

Índices: `movimientos(equipo_id)` y `equipos(estado)`. Suficiente.

**Regla de escritura (misma transacción siempre):**
- **Entrega:** `INSERT movimientos (tipo='entrega', usuario_id=X, tecnico_id=T)` + `UPDATE equipos SET estado='entregado', usuario_actual_id=X`.
- **Devolución:** `INSERT movimientos (tipo='devolucion', usuario_id=X, tecnico_id=T)` — X se toma de `equipos.usuario_actual_id` **antes** de limpiarlo — + `UPDATE equipos SET estado='disponible', usuario_actual_id=NULL`.
- **Baja:** `INSERT movimientos (tipo='salida', motivo_salida=..., tecnico_id=T)` + `UPDATE equipos SET estado='de_baja'`. El motivo de la baja **se persiste aquí**, no en `equipos`.

El historial de un equipo es un solo query: `SELECT * FROM movimientos WHERE equipo_id = $1 ORDER BY fecha DESC`.

---

## 4. Backend NestJS (definitivo)

### Módulos

```
src/
├── auth/        → AuthController (login), AuthService, JwtStrategy, JwtAuthGuard
├── usuarios/    → entity Usuario (empleados y técnicos), controller + service
├── compras/     → entity Compra; al crear una compra se crean sus equipos
├── equipos/     → entities Equipo y Movimiento; enum de estados y TODA la lógica de transición
├── seed.ts      → script que crea el técnico admin inicial (bcrypt) y datos de demo
└── app.module.ts
```

- `JwtAuthGuard` **global**; solo `POST /auth/login` es público.
- `ValidationPipe` global + `class-validator` en los DTOs.
- Controllers solo reciben y devuelven; toda regla vive en services. Sin repositorios custom ni capas extra.
- El `tecnicoId` de todo movimiento y de `registrada_por` **sale del JWT, nunca del body**.

### Endpoints

| Método | Ruta | Qué hace | Body / Query |
|---|---|---|---|
| POST | `/auth/login` | Login de técnico, devuelve JWT + nombre | `{ email, password }` |
| GET | `/usuarios` | Lista usuarios, filtro por rol | `?rol=empleado` |
| GET | `/usuarios/:id` | Detalle + equipos que tiene asignados | — |
| POST | `/usuarios` | Crea usuario (rol `empleado` por defecto; si rol=`tecnico`, exige `password`) | `{ nombre, email, departamento, rol?, password? }` |
| PATCH | `/usuarios/:id` | Actualiza datos / desactiva (`activo`) | campos parciales |
| POST | `/compras` | Registra compra y crea sus N equipos en `disponible` | `{ proveedor, numeroFactura, fechaCompra, costoTotal, equipos: [{ tipo, marca, modelo, numeroSerie }] }` |
| GET | `/compras` | Lista compras | — |
| GET | `/compras/:id` | Detalle de compra con sus equipos | — |
| GET | `/equipos` | Lista equipos con filtros | `?estado=disponible&q=texto` |
| GET | `/equipos/resumen` | Contadores por estado + últimas 5 entregas (dashboard) | — |
| GET | `/equipos/:id` | Detalle + usuario actual si existe | — |
| GET | `/equipos/:id/movimientos` | Historial del equipo (incluye nombre de empleado y técnico) | — |
| PATCH | `/equipos/:id` | Corrige datos (marca, modelo…), **nunca el estado** | campos parciales |
| POST | `/equipos/:id/entrega` | `disponible → entregado` | `{ usuarioId, observacion? }` |
| POST | `/equipos/:id/devolucion` | `entregado → disponible` | `{ observacion? }` |
| POST | `/equipos/:id/baja` | `disponible → de_baja` | `{ motivo: 'desahucio' \| 'obsolescencia', observacion? }` |

Nota de rutas: declarar `GET /equipos/resumen` antes de `GET /equipos/:id` en el controller.

### Reglas de negocio y dónde viven

| Regla | Dónde |
|---|---|
| Mapa de transiciones (el de la sección 2, sin excepciones) | `EquiposService.cambiarEstado()` — único punto de cambio de estado |
| No entregar equipo que no esté `disponible` | `EquiposService.entregar()` → `BadRequestException` |
| Baja solo desde `disponible`; motivo obligatorio y persistido en `movimientos.motivo_salida` | `EquiposService.darDeBaja()` |
| Devolución solo si está `entregado`; registra al empleado que devolvía | `EquiposService.devolver()` |
| Movimiento + actualización de equipo en la misma transacción | `dataSource.transaction()` en los tres métodos anteriores |
| `numero_serie` único | `@Column({ unique: true })` + captura del error en `ComprasService` |
| El empleado destinatario debe existir, estar `activo` y tener rol `empleado` | `EquiposService.entregar()` |
| Técnico identificado en cada acción | JWT global; `req.user.id` |

### Bootstrap (obligatorio)

Script `npm run seed`: si la tabla `usuarios` no tiene técnicos, inserta `admin@ti.com / admin123` (hasheado con bcrypt) y datos de demostración (empleados, 2 compras, ~8 equipos en estados variados). Documentado en el README. Sin esto el sistema no puede arrancar porque todo endpoint exige JWT.

---

## 5. Frontend React (definitivo)

Vite (plantilla `react`, JavaScript), react-router, axios, react-bootstrap.

### Rutas

```
/login            → Login (pública)
/                 → Dashboard
/equipos          → ListaEquipos
/equipos/:id      → DetalleEquipo (con ModalEntrega y ModalBaja)
/compras/nueva    → RegistrarCompra
/usuarios         → ListaUsuarios
/usuarios/:id     → DetalleUsuario
```

`Layout` con navbar (Dashboard | Equipos | Usuarios | Registrar compra | Cerrar sesión) envolviendo las rutas privadas con `<Outlet />`. `RutaPrivada`: si el contexto no tiene token, redirige a `/login`.

### Pantallas

| Pantalla | Qué muestra | Acciones |
|---|---|---|
| **Login** | Email y contraseña | Iniciar sesión (guarda token y nombre en `AuthContext`) |
| **Dashboard** | Contadores: disponibles / entregados / de baja (de `GET /equipos/resumen`) + últimas entregas | Tarjetas clicables hacia las secciones |
| **ListaEquipos** | Tabla: serie, tipo, marca/modelo, estado (`EstadoBadge`), usuario asignado. Filtro por estado y búsqueda por texto | Ver detalle, ir a Registrar compra |
| **DetalleEquipo** | Datos, estado, usuario actual, **historial de movimientos con columna del técnico que ejecutó cada uno** | Entregar (modal), Recibir devolución (botón con confirmación), Dar de baja (modal), editar datos |
| **RegistrarCompra** | Datos de compra una vez (proveedor, fecha, factura, costo) + **lista dinámica de equipos** con botón "Agregar otro equipo" (array en `useState`) | Crear compra con N equipos `disponible` |
| **ListaUsuarios** | Tabla de empleados: nombre, departamento, cantidad de equipos asignados | Crear y editar empleados (la UI solo crea empleados; los técnicos se crean por seed) |
| **DetalleUsuario** | Datos del empleado y equipos que tiene | Recibir devolución desde aquí |

Decisiones cerradas:
- **ModalEntrega** vive en DetalleEquipo: el equipo ya está fijo; solo pide empleado destino (dropdown de `GET /usuarios?rol=empleado`) y observación opcional. No existe pantalla de "seleccionar equipo para entregar".
- **ModalBaja**: radio desahucio/obsolescencia + observación opcional; solo visible si el equipo está `disponible`.
- La devolución es un botón con `window.confirm`, no una pantalla.
- Badges: `success` = disponible, `primary` = entregado, `secondary` = de baja.
- Datos: `useState` + `useEffect` por página; tras cada acción se re-llama la función de carga. **Sin react-query, sin Redux.**
- Un solo `src/api/api.js`: instancia axios con `baseURL` e interceptor que agrega el token; funciones por recurso (`getEquipos()`, `entregarEquipo()`, …). Los componentes nunca llaman axios directo.
- Formularios con estado controlado (`useState`); sin react-hook-form.

### Estructura

```
frontend/src/
├── api/api.js
├── components/  → Layout.jsx, RutaPrivada.jsx, EstadoBadge.jsx, ModalEntrega.jsx, ModalBaja.jsx
├── context/     → AuthContext.jsx
├── pages/       → Login.jsx, Dashboard.jsx, ListaEquipos.jsx, DetalleEquipo.jsx,
│                  RegistrarCompra.jsx, ListaUsuarios.jsx, DetalleUsuario.jsx
├── App.jsx
└── main.jsx
```

---

## 6. Alcance

### Entra (IN)

- Registro de compra con N equipos (entrada al inventario).
- Listado de equipos con filtro por estado y búsqueda por texto.
- Ficha de equipo con historial de movimientos (mostrando técnico y empleado).
- Entrega, devolución y baja con motivo, validadas en backend, con la máquina de estados de la sección 2.
- CRUD de empleados; técnicos creados por seed.
- Login JWT de técnicos; el técnico queda registrado en cada movimiento.
- Dashboard de contadores + últimas entregas.
- Script de seed para bootstrap y demo.

### Queda fuera (OUT — contrato del equipo, sin excepciones)

| Fuera | Razón |
|---|---|
| Módulo de mantenimientos (estado `en_mantenimiento`, órdenes de trabajo) | No es flujo central del enunciado; una nota en `observacion` basta |
| Roles/permisos granulares, refresh tokens, recuperación de clave, registro público | Un solo rol autenticado resuelve el MVP |
| Reportes avanzados, exportar PDF/Excel | El dashboard ya demuestra "reportes" |
| Notificaciones (correo/push) | Infraestructura externa sin valor en demo |
| Fotos/adjuntos de equipos o facturas | Manejo de archivos es esfuerzo alto sin nota extra |
| Catálogos (proveedores, tipos de equipo, departamentos) como tablas | VARCHAR basta; un CRUD extra por dropdown es sobre-ingeniería |
| Códigos QR/barras, multi-almacén, multi-empresa | Fuera del enunciado |
| Soft-delete global, auditoría genérica, UUIDs | `movimientos` + `usuarios.activo` cubren la trazabilidad |
| Docker, migraciones formales, paginación, cache, Swagger | `synchronize: true`, volumen trivial, README como doc |
| Tests E2E exhaustivos | A lo sumo unit tests de `cambiarEstado()` si el curso los exige |

---

## 7. Orden de construcción sugerido

Regla general: **flujo vertical completo (BD → API → pantalla) de una funcionalidad antes de pasar a la siguiente.** Nunca "todo el backend primero". Algo demostrable al final de cada paso.

1. **Esqueleto conectado (días 1-3):** proyecto NestJS + PostgreSQL con entity `Equipo`, proyecto React (Vite) con `ListaEquipos` leyendo de la API, seed con 5 equipos. *Demo: "el sistema lista inventario real".*
2. **Auth + seed de técnico (días 4-5):** módulo `auth`, guard global, script de seed con el técnico admin, pantalla Login y `AuthContext`. Se hace temprano a propósito: desde aquí todo `tecnico_id` sale del token y no hay que retrabajarlo.
3. **Modelo completo + compras (semana 2):** entities `Usuario`, `Compra`, `Movimiento`; endpoint `POST /compras` y pantalla RegistrarCompra con N equipos. *Demo: entrada de equipos.*
4. **Máquina de estados (semana 2):** `cambiarEstado()`, endpoints de entrega/devolución/baja con transacción + fila en `movimientos`. Probar con requests (Postman/REST Client) antes de la UI.
5. **Entrega y devolución en UI (semana 3):** CRUD de empleados, DetalleEquipo con historial, ModalEntrega, botón de devolución, DetalleUsuario. *Demo: ciclo de vida completo en pantalla.*
6. **Baja + filtros (semana 3):** ModalBaja con motivo, filtro por estado y búsqueda en ListaEquipos.
7. **Dashboard (semana 4):** `GET /equipos/resumen` y la pantalla con contadores.
8. **Pulido final (última semana):** seed rico para la demo, mensajes de error legibles en la UI, README con instrucciones de arranque, ensayo del guion de demo: compra → entrega → devolución → baja → historial.

---

## 8. Riesgos y consejos para el equipo

1. **Hundirse en autenticación.** Ya está decidido: JWT mínimo + seed, ~100 líneas, se construye en el paso 2 y no se vuelve a tocar. Prohibido agregar refresh tokens, roles o recuperación de clave.
2. **Validar transiciones solo en frontend.** El profesor intentará romper el flujo con requests directos. La máquina de estados vive en `EquiposService.cambiarEstado()`; el frontend solo esconde botones.
3. **Feature creep.** La lista OUT de la sección 6 es el contrato. Toda idea nueva (QR, fotos, mantenimientos) va a un "backlog post-entrega", no al código.
4. **Perder tiempo en CSS.** react-bootstrap desde el día 1; prohibido CSS a medida salvo ajustes puntuales. Es una app de tablas y formularios: limpia es suficiente.
5. **Integración tardía frontend-backend.** El paso 1 existe justamente para evitarlo: pantalla conectada a datos reales en la primera semana.
6. **Olvidar la transacción.** Movimiento + actualización de equipo siempre juntos en `dataSource.transaction()`; si uno falla, no se guarda nada. Es el detalle que diferencia un historial confiable de uno inconsistente.
7. **No tener datos para la demo.** El seed se mantiene vivo durante todo el proyecto; la demo nunca depende de capturar datos en vivo.
8. **Trabajo desbalanceado.** Git desde el día 1, ramas cortas, y repartir por flujo completo (una persona hace "entrega" de punta a punta: endpoint + modal + historial), no por capas.
9. **Modelar de más.** Las 4 tablas de la sección 3 están congeladas. "Tipo de equipo" es texto, no una jerarquía; si alguien propone la tabla número 5, se discute contra la lista OUT.
