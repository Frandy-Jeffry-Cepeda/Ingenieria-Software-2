// D-13 (NC-4): la clave de firma JWT no puede tener un valor por defecto en el código.
// Si JWT_SECRET no está definida, la aplicación no arranca.
export function obtenerJwtSecret(): string {
  const secreto = process.env.JWT_SECRET;
  if (!secreto || secreto.trim().length === 0) {
    throw new Error('Configura la variable de entorno JWT_SECRET antes de iniciar la API.');
  }
  return secreto;
}
