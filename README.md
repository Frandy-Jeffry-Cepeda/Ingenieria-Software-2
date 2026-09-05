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

Un equipo nace `disponible` al registrarse la compra que lo trajo. Pasa a `entregado` cuando se asigna a un empleado y vuelve a `disponible` al devolverse, tantas veces como haga falta. Sale del ciclo únicamente hacia `de_baja`, que es un estado terminal.

```
        compra                entrega                 devolución
  ( · ) ──────► disponible ◄──────────────────────────► entregado
                    │            (RF-08 / RF-09)
                    │ baja: desahucio u obsolescencia
                    ▼
                de_baja  ── terminal, el equipo no se borra
```

**Reglas duras**, validadas exclusivamente en el servidor:

- La baja solo procede desde `disponible`. Un equipo entregado debe devolverse primero; la transición directa `entregado → de_baja` no existe.
- `de_baja` es terminal. El equipo no se elimina: sigue consultable con todo su historial.
- Cada transición inserta una fila en el historial y actualiza el equipo **en la misma transacción**.
- El identificador del técnico se toma siempre del token de sesión, nunca del cuerpo de la petición.

Solo los **técnicos de TI** inician sesión. Los **empleados** existen como registros a los que se asignan equipos y no tienen acceso al sistema.

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
    equipos/              entidades Equipo y Movimiento; máquina de estados
    health.controller.ts  verificación de salud del servicio
    seed.ts               siembra del técnico inicial y datos de demostración
frontend/                 SPA React
  src/
    api/api.js            instancia axios única, con interceptor de token
    context/              AuthContext
    components/           Layout · RutaPrivada · EstadoBadge · ModalEntrega · ModalBaja
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
