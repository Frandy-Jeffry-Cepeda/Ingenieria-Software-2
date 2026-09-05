#!/bin/sh
# Punto de entrada del backend.
# Si SEED_ON_START=true corre el seed antes de levantar la API.
# El seed es idempotente: si ya existe un técnico, no hace nada.
set -e

if [ "${SEED_ON_START}" = "true" ]; then
  echo "[entrypoint] Ejecutando seed inicial..."
  if timeout 180 node dist/seed.js; then
    echo "[entrypoint] Seed terminado."
  else
    echo "[entrypoint] AVISO: el seed no completó (código $?). La API arranca igual."
  fi
fi

echo "[entrypoint] Iniciando API en el puerto ${PORT:-3000}..."
exec "$@"
