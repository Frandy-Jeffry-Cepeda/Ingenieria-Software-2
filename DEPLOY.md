# Despliegue — Inventario TI

## Estado actual: **desplegado y funcionando**

| | |
|---|---|
| **URL** | <http://vkctlgpeczcce9cc672fagkf.209.126.85.73.sslip.io> |
| **Login** | `admin@ti.com` / `admin123` — **cambiala** |
| Servidor | `209.126.85.73` · Coolify v4.1.2 |
| Proyecto Coolify | `Inventario-TI` — uuid `pkme52uffjzb7iv10g87bo41` |
| Aplicación | `inventario-ti` — uuid `vkctlgpeczcce9cc672fagkf` |
| Repositorio | `git@209.126.85.73:frandy/inventario-ti.git` (bare, en el propio servidor) |
| Llave de despliegue | `~/Desktop/coolify-keys/coolify_inventario_deploy` · en Coolify `f5kvzb6axtb71hdf5lgnk9dp` |
| Secretos generados | `~/Desktop/coolify-keys/inventario-ti-secretos.txt` |

Para publicar cambios: `git push origin main` y luego disparar el deploy
(ver [§4](#4-publicar-cambios)).

---

Stack dockerizado en tres contenedores:

| Servicio   | Imagen                | Rol                                              | Público |
| ---------- | --------------------- | ------------------------------------------------ | ------- |
| `db`       | `postgres:16-alpine`  | Base de datos, con volumen persistente            | No      |
| `backend`  | build de `./backend`  | API NestJS en el puerto 3000                      | No      |
| `frontend` | build de `./frontend` | SPA de React servida por nginx + proxy hacia API  | **Sí**  |

El frontend y la API viven bajo **el mismo dominio**: nginx sirve la SPA en `/` y
reenvía todo lo que empieza por `/api/` al backend quitando ese prefijo
(`/api/auth/login` → `backend:3000/auth/login`). Así no hay CORS ni hace falta un
segundo dominio.

```
navegador ──► Traefik (Coolify) ──► nginx :80 ──┬──► /            index.html (SPA)
                                                └──► /api/*       backend :3000 ──► db :5432
```

---

## 1. Probar en local

```bash
cp .env.example .env
```

Editar `.env` y poner una `POSTGRES_PASSWORD` y un `JWT_SECRET` reales, luego:

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

- App: <http://localhost:8080>
- API directa: <http://localhost:3000/health>
- Login inicial: `admin@ti.com` / `admin123`

Para apagar y borrar los datos: `docker compose down -v`.

---

## 2. Cómo está montado el origen Git

Este proyecto **no usa GitHub**. El repositorio vive en el propio servidor Coolify,
servido por SSH con un usuario dedicado sin shell:

- Usuario `git` (uid 997), home `/srv/git`, shell `/usr/bin/git-shell` — sólo
  acepta comandos de Git, no da acceso al sistema.
- Repositorio bare en `/srv/git/frandy/inventario-ti.git`.
- Autorizado únicamente por la llave `coolify_inventario_deploy` (ed25519, sin
  passphrase), presente en `/srv/git/.ssh/authorized_keys`.
- La misma llave está cargada en Coolify para que pueda clonar.

La URL **tiene que** empezar con `git@`: Coolify rechaza `ssh://…` en la
validación (`must start with https://, http://, git://, or git@`). Por eso el
repo está bajo `frandy/`, para que la ruta relativa al home del usuario `git`
tenga la misma forma que una de GitHub.

Recrearlo desde cero, si hiciera falta:

```bash
ssh root@209.126.85.73 'useradd -r -m -d /srv/git -s /usr/bin/git-shell git && mkdir -p /srv/git/.ssh /srv/git/frandy && git init --bare --initial-branch=main /srv/git/frandy/inventario-ti.git && chown -R git:git /srv/git'
```

---

## 3. Cómo está configurado el recurso en Coolify

Creado por API (`POST /applications/private-deploy-key`) con:

| Campo | Valor |
| --- | --- |
| `build_pack` | `dockercompose` |
| `git_repository` | `git@209.126.85.73:frandy/inventario-ti.git` |
| `git_branch` | `main` |
| `base_directory` | `/` |
| `docker_compose_location` | `/docker-compose.yml` |

### Variables de entorno

Coolify las **pre-crea solo** al parsear el compose, con valor vacío. Por eso hay
que cargarlas con `PATCH` (un `POST` devuelve _"already exists"_):

```bash
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"key":"JWT_SECRET","value":"..."}' "$API/applications/vkctlgpeczcce9cc672fagkf/envs"
```

Valores actuales: `POSTGRES_USER=inventario`, `POSTGRES_DB=inventario_ti`,
`POSTGRES_PASSWORD` y `JWT_SECRET` generados al azar (guardados en
`~/Desktop/coolify-keys/inventario-ti-secretos.txt`), `DB_SYNCHRONIZE=true`,
`VITE_API_URL=/api`, `SEED_ON_START=false` (se apagó tras cargar los datos).

El `GET /envs` **no devuelve los valores** — Coolify los oculta. Para confirmar que
un `PATCH` entró, mirá que avance `updated_at`, o leelos del contenedor con
`docker exec <cont> env`.

`VITE_API_URL` queda con `is_buildtime: true` automáticamente, así que **no** hace
falta el parche SQL de la trampa #4 del playbook.

### Dominio

Para apps `dockercompose` la variable mágica `SERVICE_FQDN_FRONTEND_80` **no
alcanza**: hay que poblar además `docker_compose_domains`, o Coolify no genera
ninguna label de Traefik y la app queda inalcanzable. Se manda por API como
**array** (un objeto da _"must be an array"_), y Coolify lo guarda como mapa:

```bash
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"docker_compose_domains":[{"name":"frontend","domain":"http://vkctlgpeczcce9cc672fagkf.209.126.85.73.sslip.io"}]}' "$API/applications/vkctlgpeczcce9cc672fagkf"
```

Después hay que **redesplegar** para que el contenedor levante con las labels.

Para pasar a un dominio propio: cambiar ese `domain` a `https://tu-dominio`,
apuntar un registro DNS A a `209.126.85.73` y redesplegar. Coolify emite el
certificado con Let's Encrypt.

`backend` y `db` no se exponen: sólo viven en la red interna del stack.

---

## 4. Publicar cambios

```bash
git push origin main
```

```bash
curl -s -H "Authorization: Bearer $TOKEN" "http://209.126.85.73:8000/api/v1/deploy?uuid=vkctlgpeczcce9cc672fagkf&force=false"
```

Usá `force=true` para un rebuild sin cache. El deploy tarda ~2–3 min.

> El `status` de la API puede quedar en `failed`/`in_progress` aunque el deploy
> haya salido bien (bug conocido de este Coolify). Confiá en `docker ps` y en que
> el sitio responda.

Verificación rápida:

```bash
curl -s http://vkctlgpeczcce9cc672fagkf.209.126.85.73.sslip.io/api/health
```

---

## 5. Pendientes de seguridad

**Cambiar la contraseña del admin** — el seed crea `admin@ti.com` / `admin123`,
que está a la vista en este repositorio. Entrar y cambiarla.

**El sitio va por HTTP** — el dominio sslip.io no tiene TLS. Los tokens JWT y la
contraseña de login viajan en claro. Para la entrega del proyecto alcanza; si se
va a usar de verdad, poner un dominio propio con certificado (§3).

---

## Variables que entiende el backend

| Variable         | Por defecto     | Para qué sirve                                            |
| ---------------- | --------------- | --------------------------------------------------------- |
| `PORT`           | `3000`          | Puerto de la API                                           |
| `DATABASE_URL`   | —               | URL completa de Postgres; si está, ignora las `DB_*`       |
| `DB_HOST`        | `localhost`     | Host de Postgres                                           |
| `DB_PORT`        | `5432`          | Puerto de Postgres                                         |
| `DB_USER`        | `postgres`      | Usuario                                                    |
| `DB_PASS`        | `postgres`      | Contraseña                                                 |
| `DB_NAME`        | `inventario_ti` | Base de datos                                              |
| `DB_SSL`         | `false`         | `true` si la base es gestionada y exige TLS                |
| `DB_SYNCHRONIZE` | `true`          | TypeORM crea/actualiza el esquema solo                     |
| `JWT_SECRET`     | —               | Firma de los tokens                                        |
| `SEED_ON_START`  | —               | `true` corre el seed antes de arrancar la API              |

`DATABASE_URL` está para el caso de usar el Postgres gestionado de Coolify en vez
del contenedor `db` del compose.

## Variables del frontend

| Variable         | Cuándo          | Por defecto    | Para qué sirve                                  |
| ---------------- | --------------- | -------------- | ----------------------------------------------- |
| `VITE_API_URL`   | build           | `/api`         | Base de las llamadas HTTP (se hornea en el bundle) |
| `BACKEND_ORIGIN` | runtime (nginx) | `backend:3000` | A dónde apunta el proxy `/api/`                 |

`VITE_API_URL` se resuelve **en tiempo de build**: cambiarla exige reconstruir la
imagen, no basta con reiniciar el contenedor.

---

## Problemas comunes

**`502 Bad Gateway` en `/api/...`** — el backend todavía no terminó de arrancar o
se cayó. Ver los logs del servicio `backend` en Coolify.

**El backend reintenta conectar a la base** — normal en el arranque; TypeORM
reintenta 10 veces. Si persiste, revisar que `POSTGRES_PASSWORD` sea idéntica en
los servicios `db` y `backend`.

**Cambié `VITE_API_URL` y no pasó nada** — hay que redesplegar con rebuild; está
horneada en el bundle.

**Recargar una ruta como `/equipos/3` da 404** — no debería: nginx tiene el
fallback a `index.html`. Si pasa, el `frontend` está sirviendo con otra config.

**`non-string key in services.X.environment: 0` al desplegar en Coolify** — el
bloque `environment` de ese servicio está en sintaxis de lista (`- VAR=valor`) y
contiene una variable mágica sin valor (`- SERVICE_FQDN_...`). Coolify reescribe
el compose y genera una clave numérica inválida. Solución: pasar ese
`environment` a sintaxis de mapa (`VAR: valor`), con la variable mágica en una
línea propia terminada en `:` y sin valor.
