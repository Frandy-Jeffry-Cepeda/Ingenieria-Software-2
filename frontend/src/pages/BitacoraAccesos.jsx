import { useEffect, useState } from 'react';
import { Alert, Badge, Card, Form, Spinner, Table } from 'react-bootstrap';
import { getAccesos } from '../api/api';
import { useAuth } from '../context/AuthContext';

// E4, paquete 2.4: consulta de la bitácora de accesos (solo administradores).
const etiquetasMotivo = {
  cuenta_inexistente: 'Cuenta inexistente',
  cuenta_inactiva: 'Cuenta desactivada',
  rol_sin_acceso: 'Rol sin acceso',
  contrasena_incorrecta: 'Contraseña incorrecta',
};

function BitacoraAccesos() {
  const { rol } = useAuth();
  const [registros, setRegistros] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (rol !== 'administrador') return;
    getAccesos(200)
      .then(setRegistros)
      .catch(() => setError('No se pudo cargar la bitácora de accesos.'))
      .finally(() => setCargando(false));
  }, [rol]);

  if (rol !== 'administrador') {
    return <Alert variant="warning">Solo un administrador puede consultar la bitácora de accesos.</Alert>;
  }

  const visibles = registros.filter((r) => filtro === 'todos' || r.resultado === filtro);

  return (
    <Card>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Card.Title className="mb-0">Bitácora de accesos</Card.Title>
          <Form.Select style={{ maxWidth: 220 }} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="todos">Todos los intentos</option>
            <option value="EXITO">Solo exitosos</option>
            <option value="FALLIDO">Solo fallidos</option>
          </Form.Select>
        </div>
        {error && <Alert variant="danger">{error}</Alert>}
        {cargando ? (
          <Spinner animation="border" size="sm" />
        ) : (
          <Table striped hover responsive size="sm">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Correo</th>
                <th>Resultado</th>
                <th>Motivo</th>
                <th>Usuario</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.fecha).toLocaleString('es-DO')}</td>
                  <td>{r.email}</td>
                  <td>
                    <Badge bg={r.resultado === 'EXITO' ? 'success' : 'danger'}>
                      {r.resultado === 'EXITO' ? 'Exitoso' : 'Fallido'}
                    </Badge>
                  </td>
                  <td>{r.motivo ? etiquetasMotivo[r.motivo] || r.motivo : '—'}</td>
                  <td>{r.usuario?.nombre || '—'}</td>
                  <td>{r.ip || '—'}</td>
                </tr>
              ))}
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted">Sin registros</td>
                </tr>
              )}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}

export default BitacoraAccesos;
