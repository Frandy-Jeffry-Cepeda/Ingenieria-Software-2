-- E4, paquete 2.4: bitácora de accesos.
-- Ejecutar una sola vez si la base de producción no usa synchronize (DB_SYNCHRONIZE=false).
DO $$ BEGIN
  CREATE TYPE resultado_acceso AS ENUM ('EXITO', 'FALLIDO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS registros_acceso (
  id SERIAL PRIMARY KEY,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  email VARCHAR(150) NOT NULL,
  resultado resultado_acceso NOT NULL,
  motivo VARCHAR(40),
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  ip VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_registros_acceso_fecha ON registros_acceso (fecha);
