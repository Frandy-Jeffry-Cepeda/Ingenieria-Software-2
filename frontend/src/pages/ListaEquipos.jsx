import { useEffect, useState } from 'react';
import { Table, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import { getEquipos } from '../api/api';
import EstadoBadge from '../components/EstadoBadge';

function ListaEquipos() {
  const [searchParams] = useSearchParams();
  const [equipos, setEquipos] = useState([]);
  const [estado, setEstado] = useState(searchParams.get('estado') || '');
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState('');

  const cargar = (filtroEstado, texto) => {
    getEquipos({
      estado: filtroEstado || undefined,
      q: texto || undefined,
    })
      .then(setEquipos)
      .catch((err) => setError(err.response?.data?.message || 'Error al cargar los equipos'));
  };

  useEffect(() => {
    cargar(estado, busqueda);
  }, [estado]);

  const buscar = (e) => {
    e.preventDefault();
    cargar(estado, busqueda);
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Equipos</h2>
        <Button as={Link} to="/compras/nueva" variant="primary">
          Registrar compra
        </Button>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}

      <Form onSubmit={buscar}>
        <Row className="mb-3">
          <Col md={3}>
            <Form.Select value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="disponible">Disponible</option>
              <option value="entregado">Entregado</option>
              <option value="en_mantenimiento">En mantenimiento</option>
              <option value="de_baja">De baja</option>
            </Form.Select>
          </Col>
          <Col md={5}>
            <Form.Control
              placeholder="Buscar por serie, tipo, marca o modelo"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </Col>
          <Col md={2}>
            <Button type="submit" variant="outline-primary" className="w-100">Buscar</Button>
          </Col>
        </Row>
      </Form>

      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Número de serie</th>
            <th>Tipo</th>
            <th>Marca / Modelo</th>
            <th>Estado</th>
            <th>Usuario asignado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {equipos.map((eq) => (
            <tr key={eq.id}>
              <td>{eq.numeroSerie}</td>
              <td>{eq.tipo}</td>
              <td>{[eq.marca, eq.modelo].filter(Boolean).join(' ') || '—'}</td>
              <td><EstadoBadge estado={eq.estado} /></td>
              <td>{eq.usuarioActual?.nombre || '—'}</td>
              <td>
                <Button as={Link} to={`/equipos/${eq.id}`} size="sm" variant="outline-secondary">
                  Ver detalle
                </Button>
              </td>
            </tr>
          ))}
          {equipos.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center text-muted">No hay equipos.</td>
            </tr>
          )}
        </tbody>
      </Table>
    </>
  );
}

export default ListaEquipos;
