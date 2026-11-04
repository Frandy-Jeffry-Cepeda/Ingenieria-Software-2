import { useEffect, useState } from 'react';
import { Card, Table, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import {
  getEquipo,
  getMovimientos,
  actualizarEquipo,
  entregarEquipo,
  devolverEquipo,
  darDeBajaEquipo,
  enviarMantenimientoEquipo,
} from '../api/api';
import EstadoBadge from '../components/EstadoBadge';
import ModalEntrega from '../components/ModalEntrega';
import ModalBaja from '../components/ModalBaja';
import ModalMantenimiento from '../components/ModalMantenimiento';

function DetalleEquipo() {
  const { id } = useParams();
  const [equipo, setEquipo] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [error, setError] = useState('');
  const [mostrarEntrega, setMostrarEntrega] = useState(false);
  const [mostrarBaja, setMostrarBaja] = useState(false);
  const [mostrarMantenimiento, setMostrarMantenimiento] = useState(false);
  const [editando, setEditando] = useState(false);
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');

  const cargar = () => {
    getEquipo(id)
      .then(setEquipo)
      .catch((err) => setError(err.response?.data?.message || 'Error al cargar el equipo'));
    getMovimientos(id)
      .then(setMovimientos)
      .catch(() => setMovimientos([]));
  };

  useEffect(() => {
    cargar();
  }, [id]);

  const entregar = async (datos) => {
    try {
      await entregarEquipo(id, datos);
      setMostrarEntrega(false);
      cargar();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al entregar el equipo');
    }
  };

  const devolver = async () => {
    if (!window.confirm('¿Recibir la devolución de este equipo?')) return;
    try {
      await devolverEquipo(id, {});
      cargar();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al registrar la devolución');
    }
  };

  const darDeBaja = async (datos) => {
    try {
      await darDeBajaEquipo(id, datos);
      setMostrarBaja(false);
      cargar();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al dar de baja el equipo');
    }
  };

  const enviarMantenimiento = async (datos) => {
    try {
      await enviarMantenimientoEquipo(id, datos);
      setMostrarMantenimiento(false);
      cargar();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al enviar a mantenimiento');
    }
  };

  const abrirEdicion = () => {
    setMarca(equipo.marca || '');
    setModelo(equipo.modelo || '');
    setEditando(true);
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    try {
      await actualizarEquipo(id, { marca, modelo });
      setEditando(false);
      cargar();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al actualizar el equipo');
    }
  };

  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!equipo) return <p>Cargando...</p>;

  return (
    <>
      <h2 className="mb-3">
        {equipo.tipo} — {equipo.numeroSerie} <EstadoBadge estado={equipo.estado} />
      </h2>

      <Card className="mb-4">
        <Card.Body>
          {editando ? (
            <Form onSubmit={guardarEdicion}>
              <Row className="align-items-end">
                <Col md={4}>
                  <Form.Label>Marca</Form.Label>
                  <Form.Control value={marca} onChange={(e) => setMarca(e.target.value)} />
                </Col>
                <Col md={4}>
                  <Form.Label>Modelo</Form.Label>
                  <Form.Control value={modelo} onChange={(e) => setModelo(e.target.value)} />
                </Col>
                <Col md={4}>
                  <Button type="submit" className="me-2">Guardar</Button>
                  <Button variant="secondary" onClick={() => setEditando(false)}>Cancelar</Button>
                </Col>
              </Row>
            </Form>
          ) : (
            <>
              <p className="mb-1"><strong>Marca:</strong> {equipo.marca || '—'}</p>
              <p className="mb-1"><strong>Modelo:</strong> {equipo.modelo || '—'}</p>
              <p className="mb-1">
                <strong>Usuario actual:</strong>{' '}
                {equipo.usuarioActual ? (
                  <Link to={`/usuarios/${equipo.usuarioActual.id}`}>{equipo.usuarioActual.nombre}</Link>
                ) : ('—')}
              </p>
              <div className="mt-3">
                {equipo.estado === 'disponible' && (
                  <>
                    <Button className="me-2" onClick={() => setMostrarEntrega(true)}>
                      Entregar
                    </Button>
                    <Button variant="danger" className="me-2" onClick={() => setMostrarBaja(true)}>
                      Dar de baja
                    </Button>
                    <Button variant="warning" className="me-2" onClick={() => setMostrarMantenimiento(true)}>
                      Enviar a mantenimiento
                    </Button>
                  </>
                )}
                {equipo.estado === 'entregado' && (
                  <Button variant="warning" className="me-2" onClick={devolver}>
                    Recibir devolución
                  </Button>
                )}
                <Button variant="outline-secondary" onClick={abrirEdicion}>
                  Editar datos
                </Button>
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      <h4>Historial de movimientos</h4>
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Empleado</th>
            <th>Técnico</th>
            <th>Observación</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.map((m) => (
            <tr key={m.id}>
              <td>{new Date(m.fecha).toLocaleString()}</td>
              <td>
                {m.tipo}
                {m.motivoSalida ? ` (${m.motivoSalida})` : ''}
              </td>
              <td>{m.usuario?.nombre || '—'}</td>
              <td>{m.tecnico?.nombre || '—'}</td>
              <td>{m.observacion || '—'}</td>
            </tr>
          ))}
          {movimientos.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center text-muted">Sin movimientos.</td>
            </tr>
          )}
        </tbody>
      </Table>

      <ModalEntrega
        show={mostrarEntrega}
        onCerrar={() => setMostrarEntrega(false)}
        onEntregar={entregar}
      />
      <ModalBaja
        show={mostrarBaja}
        onCerrar={() => setMostrarBaja(false)}
        onDarDeBaja={darDeBaja}
      />
      <ModalMantenimiento
        show={mostrarMantenimiento}
        onCerrar={() => setMostrarMantenimiento(false)}
        onEnviarMantenimiento={enviarMantenimiento}
      />
    </>
  );
}

export default DetalleEquipo;
