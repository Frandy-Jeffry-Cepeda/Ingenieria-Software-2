# Backend — Inventario de Equipos de TI

API en NestJS + TypeORM + PostgreSQL para el MVP de inventario.

## Requisitos

- Node.js 20 o superior
- PostgreSQL instalado localmente

> Para levantar todo el stack (base de datos + API + frontend) en contenedores,
> o desplegarlo en Coolify, ver [`../DEPLOY.md`](../DEPLOY.md).

## Puesta en marcha

1. Crear la base de datos (una sola vez):

   ```sql
   CREATE DATABASE inventario_ti;
   ```

2. Copiar `.env.example` a `.env` y ajustar credenciales si hace falta.

3. Instalar dependencias:

   ```
   npm install
   ```

4. Cargar datos iniciales (crea el técnico `admin@ti.com` / `admin123` y datos de demo; si ya hay técnicos no hace nada):

   ```
   npm run seed
   ```

5. Levantar el servidor en http://localhost:3000:

   ```
   npm run start:dev
   ```

Todos los endpoints exigen JWT (header `Authorization: Bearer <token>`) excepto
`POST /auth/login` y `GET /health`.

`GET /health` devuelve `{ status, db, uptime }` y es el que usan los healthchecks
de Docker y Coolify.
