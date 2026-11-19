import { useEffect, useState } from 'react';
import { Row, Col, Card, Table, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { getResumen } from '../api/api';

function Dashboard() {
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getResumen()
      .then(setResumen)
      .catch((err) => setError(err.response?.data?.message || 'Error al cargar el resumen'));
  }, []);

  const tarjetas = [
    { titulo: 'Disponibles', valor: resumen?.disponibles ?? 0, color: 'success', filtro: 'disponible' },
    { titulo: 'Entregados', valor: resumen?.entregados ?? 0, color: 'primary', filtro: 'entregado' },
    { titulo: 'En mantenimiento', valor: resumen?.enMantenimiento ?? 0, color: 'warning', filtro: 'en_mantenimiento' },
    { titulo: 'De baja', valor: resumen?.deBaja ?? 0, color: 'secondary', filtro: 'de_baja' },
  ];

  return (
    <>
      <h2 className="mb-4">Dashboard</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      <Row className="mb-4">
        {tarjetas.map((t) => (
          <Col md={3} key={t.titulo}>
            <Card
              bg={t.color}
              text="white"
              className="text-center mb-3"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/equipos?estado=${t.filtro}`)}
            >
              <Card.Body>
                <Card.Title>{t.titulo}</Card.Title>
                <h1>{t.valor}</h1>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <h4>Últimas entregas</h4>
      {(resumen?.ultimasEntregas ?? []).length === 0 ? (
        <p className="text-muted">No hay entregas registradas.</p>
      ) : (
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Equipo</th>
              <th>Empleado</th>
              <th>Técnico</th>
            </tr>
          </thead>
          <tbody>
            {resumen.ultimasEntregas.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.fecha).toLocaleString()}</td>
                <td>
                  {m.equipo ? (
                    <Link to={`/equipos/${m.equipo.id}`}>
                      {m.equipo.tipo} — {m.equipo.numeroSerie}
                    </Link>
                  ) : ('—')}
                </td>
                <td>{m.usuario?.nombre || '—'}</td>
                <td>{m.tecnico?.nombre || '—'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}

export default Dashboard;
