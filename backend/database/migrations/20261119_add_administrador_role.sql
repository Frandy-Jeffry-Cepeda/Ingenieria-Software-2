-- Ejecutar una sola vez sobre la base PostgreSQL existente antes de desplegar feature/roles.
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'administrador';
