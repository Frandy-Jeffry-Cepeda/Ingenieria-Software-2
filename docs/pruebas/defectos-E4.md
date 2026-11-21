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
| D-08 | `POST /mantenimientos` cambiaba el estado del equipo sin registrar el movimiento en el historial ni el técnico del token | Prueba de integración | Mayor | PR #13 |
| D-09 | Un equipo enviado con `POST /mantenimientos` no se podía finalizar: quedaba en mantenimiento para siempre | Prueba de integración | Mayor | PR #13 |
| D-10 | El resumen del panel no contaba los equipos en mantenimiento | Prueba unitaria y revisión del panel | Menor | PR #13 |
| D-11 | El filtro de la lista de equipos no ofrecía el estado «En mantenimiento» | Revisión de la interfaz | Menor | PR #13 |
| D-12 | La sesión de un técnico desactivado seguía válida hasta que vencía el token (NC-5) | Sonda contra la API | Mayor | PR #17 |
| D-13 | La clave de firma JWT tenía un valor por defecto en el código si faltaba `JWT_SECRET` (NC-4); ahora la API no arranca sin ella | Revisión de código | Mayor | PR #22 |
| D-14 | Las credenciales del seed estaban escritas en el código y la documentación (NC-2); ahora se exige `SEED_ADMIN_PASSWORD` | Revisión de código | Mayor | PR #19 |
| D-15 | Los botones de entregar, dar de baja y enviar a mantenimiento no se deshabilitaban mientras se enviaba (NC-3) | Revisión de la interfaz | Menor | Incremento 2 (paquete 2.5) |
| D-16 | Dos modelos de orden de mantenimiento en paralelo (`mantenimientos` y `ordenes_mantenimiento`) | Revisión de código | Menor | PR #13 |
| D-17 | ESLint no corría en el frontend: `eslint.config.js` importaba dos veces `js` y `globals` | Ejecución de ESLint | Menor | PR #21 |
| D-18 | `test/mantenimientos.e2e-spec.ts` usaba los equipos 3 y 6 fijos y fallaba al repetirse sobre la misma base | Ejecución repetida de las pruebas | Menor | PR #20 |
| D-19 | La fusión del PR #19 duplicó `POST /auth/change-password` y quitó `GET /auth/me` en `auth.controller.ts`: el backend no compilaba en main | GitHub Actions sobre main | Crítica | PR #22 |
| D-20 | Un técnico podía dar de baja un equipo (`POST /equipos/:id/baja`), en contra de la separación de funciones del análisis A2 | Revisión de código (checklist OWASP A01) | Mayor | PR #22 |

## Pendientes

Ninguno al 21/11/2026.
