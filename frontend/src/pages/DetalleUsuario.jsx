import { useEffect, useState } from 'react';
import { Card, Table, Button, Alert } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { getUsuario, devolverEquipo } from '../api/api';
import EstadoBadge from '../components/EstadoBadge';

function DetalleUsuario() {
  const { id } = useParams();
  const [usuario, setUsuario] = useState(null);
  const [error, setError] = useState('');

  const cargar = () => {
    getUsuario(id)
      .then(setUsuario)
      .catch((err) => setError(err.response?.data?.message || 'Error al cargar el empleado'));
  };

  useEffect(() => {
    cargar();
  }, [id]);

  const devolver = async (equipoId) => {
    if (!window.confirm('¿Recibir la devolución de este equipo?')) return;
    try {
      await devolverEquipo(equipoId, {});
      cargar();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al registrar la devolución');
    }
  };

  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!usuario) return <p>Cargando...</p>;

  const equipos = usuario.equipos || [];

  return (
    <>
      <h2 className="mb-3">{usuario.nombre}</h2>

      <Card className="mb-4">
        <Card.Body>
          <p className="mb-1"><strong>Email:</strong> {usuario.email}</p>
          <p className="mb-1"><strong>Departamento:</strong> {usuario.departamento || '—'}</p>
          <p className="mb-0"><strong>Activo:</strong> {usuario.activo ? 'Sí' : 'No'}</p>
        </Card.Body>
      </Card>

      <h4>Equipos asignados</h4>
      {equipos.length === 0 ? (
        <p className="text-muted">No tiene equipos asignados.</p>
      ) : (
        <Table striped bordered hover>
          <thead>
            <tr>
              <th>Número de serie</th>
              <th>Tipo</th>
              <th>Marca / Modelo</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {equipos.map((eq) => (
              <tr key={eq.id}>
                <td>
                  <Link to={`/equipos/${eq.id}`}>{eq.numeroSerie}</Link>
                </td>
                <td>{eq.tipo}</td>
                <td>{[eq.marca, eq.modelo].filter(Boolean).join(' ') || '—'}</td>
                <td><EstadoBadge estado={eq.estado} /></td>
                <td>
                  <Button size="sm" variant="warning" onClick={() => devolver(eq.id)}>
                    Recibir devolución
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}

export default DetalleUsuario;
