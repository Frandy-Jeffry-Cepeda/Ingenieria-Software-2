# Tabla de defectos · Entregable 4

Defectos encontrados al probar el sistema entre el Entregable 3 y el 4. Severidad: **crítica** (el sistema no compila, no instala o no arranca), **mayor** (una regla de negocio o de seguridad falla), **menor** (afecta la usabilidad, la documentación o el mantenimiento).

## Corregidos

| ID | Defecto | Cómo se encontró | Severidad | Corrección |
|---|---|---|---|---|
| D-01 | `backend/package.json` con dependencias duplicadas y sin coma: `npm install` fallaba | Instalación limpia del repositorio | Crítica | PR #9 |
| D-02 | Estado `en_mantenimiento` repetido en el enum y en el mapa de transiciones: el backend no compilaba | Compilación (`tsc`) | Crítica | PR #9 |
| D-03 | `package-lock.json` del frontend inválido y Vite 8 incompatible con `@vitejs/plugin-react` 4 | Instalación limpia del repositorio | Crítica | PR #9 |
| D-04 | La lista de órdenes llamaba a `GET /equipos/:id/mantenimiento`, que no existía | Revisión de código y prueba funcional | Mayor | PR #9 |
| D-05 | Se podía «devolver» un equipo en mantenimiento (dejando la orden abierta) o «finalizar» el mantenimiento de un equipo entregado | Pruebas unitarias de transiciones | Mayor | PR #9 |
| D-06 | La compilación dejaba `dist/src/main.js` y el contenedor (`node dist/main.js`) no arrancaba | Prueba funcional con base de datos | Crítica | PR #11 |
| D-07 | `docker-compose.yml` no pasaba las variables `MAILTRAP_*` al backend: el correo nunca se enviaba en el despliegue | Revisión del despliegue en Coolify | Mayor | PR #12 |
| D-08 | `POST /mantenimientos` cambiaba el estado del equipo sin registrar el movimiento en el historial ni el técnico del token | Prueba de integración | Mayor | Rama `fix/e4-defectos` |
| D-09 | Un equipo enviado con `POST /mantenimientos` no se podía finalizar: quedaba en mantenimiento para siempre | Prueba de integración | Mayor | Rama `fix/e4-defectos` |
| D-10 | El resumen del panel no contaba los equipos en mantenimiento | Prueba unitaria y revisión del panel | Menor | Rama `fix/e4-defectos` |
| D-11 | El filtro de la lista de equipos no ofrecía el estado «En mantenimiento» | Revisión de la interfaz | Menor | Rama `fix/e4-defectos` |

## Pendientes

| ID | Defecto | Cómo se encontró | Severidad | Responsable |
|---|---|---|---|---|
| D-12 | La sesión de un técnico desactivado sigue válida hasta que vence el token (NC-5): su login da 401, pero su token anterior sigue respondiendo 200 | Sonda contra la API | Mayor | Alan, incremento 2 (paquete 2.2) |
| D-13 | La clave de firma JWT tiene un valor por defecto en el código si falta `JWT_SECRET` (NC-4) | Revisión de código | Mayor | Alan, A3 (OWASP) |
| D-14 | Las credenciales del técnico del seed están escritas en el código y la documentación (NC-2) | Revisión de código | Mayor | Juan, incremento 2 (paquete 2.3) |
| D-15 | Los botones de entregar, dar de baja y enviar a mantenimiento no se deshabilitan mientras se envía (NC-3) | Revisión de la interfaz | Menor | Melany, incremento 2 (paquete 2.5) |
| D-16 | Hay dos modelos de orden de mantenimiento en paralelo (`mantenimientos` y `ordenes_mantenimiento`) | Revisión de código | Menor | Decisión del equipo |
| D-17 | ESLint no corre en el frontend: `eslint.config.js` importa dos veces `js` y `globals` | Ejecución de ESLint | Menor | Pendiente de asignar |
| D-18 | `test/mantenimientos.e2e-spec.ts` usa los equipos 3 y 6 fijos: falla si se repite sobre la misma base | Ejecución repetida de las pruebas | Menor | Juan |
