import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getUsuarios, crearUsuario, actualizarUsuario } from '../api/api';

const formVacio = { nombre: '', email: '', departamento: '', activo: true };

function ListaUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [usuarioEditado, setUsuarioEditado] = useState(null);
  const [form, setForm] = useState(formVacio);

  const cargar = () => {
    getUsuarios('empleado')
      .then(setUsuarios)
      .catch((err) => setError(err.response?.data?.message || 'Error al cargar los empleados'));
  };

  useEffect(() => {
    cargar();
  }, []);

  const abrirCrear = () => {
    setUsuarioEditado(null);
    setForm(formVacio);
    setMostrarModal(true);
  };

  const abrirEditar = (usuario) => {
    setUsuarioEditado(usuario);
    setForm({
      nombre: usuario.nombre,
      email: usuario.email,
      departamento: usuario.departamento || '',
      activo: usuario.activo,
    });
    setMostrarModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    try {
      if (usuarioEditado) {
        await actualizarUsuario(usuarioEditado.id, {
          nombre: form.nombre,
          email: form.email,
          departamento: form.departamento || undefined,
          activo: form.activo,
        });
      } else {
        await crearUsuario({
          nombre: form.nombre,
          email: form.email,
          departamento: form.departamento || undefined,
        });
      }
      setMostrarModal(false);
      cargar();
    } catch (err) {
      alert(err.response?.data?.message || 'Error al guardar el empleado');
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Empleados</h2>
        <Button onClick={abrirCrear}>Nuevo empleado</Button>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}

      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Departamento</th>
            <th>Equipos asignados</th>
            <th>Activo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td>
                <Link to={`/usuarios/${u.id}`}>{u.nombre}</Link>
              </td>
              <td>{u.email}</td>
              <td>{u.departamento || '—'}</td>
              <td>{u.cantidadEquipos ?? u.equipos?.length ?? 0}</td>
              <td>{u.activo ? 'Sí' : 'No'}</td>
              <td>
                <Button size="sm" variant="outline-secondary" onClick={() => abrirEditar(u)}>
                  Editar
                </Button>
              </td>
            </tr>
          ))}
          {usuarios.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center text-muted">No hay empleados.</td>
            </tr>
          )}
        </tbody>
      </Table>

      <Modal show={mostrarModal} onHide={() => setMostrarModal(false)}>
        <Form onSubmit={guardar}>
          <Modal.Header closeButton>
            <Modal.Title>{usuarioEditado ? 'Editar empleado' : 'Nuevo empleado'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Departamento</Form.Label>
              <Form.Control
                value={form.departamento}
                onChange={(e) => setForm({ ...form, departamento: e.target.value })}
              />
            </Form.Group>
            {usuarioEditado && (
              <Form.Check
                type="switch"
                id="empleado-activo"
                label="Activo"
                checked={form.activo}
                onChange={(e) => setForm({ ...form, activo: e.target.checked })}
              />
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setMostrarModal(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}

export default ListaUsuarios;
