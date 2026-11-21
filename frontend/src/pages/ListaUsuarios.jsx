import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Spinner,} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getUsuarios, crearUsuario, actualizarUsuario } from '../api/api';
import { useAuth } from '../context/AuthContext';

const crearFormVacio = () => ({
  nombre: '',
  email: '',
  departamento: '',
  rol: 'empleado',
  password: '',
  activo: true,
});

const etiquetasRol = {
  empleado: 'Empleado',
  tecnico: 'Técnico',
  administrador: 'Administrador',
};

const requiereContrasena = (rol) =>
  rol === 'tecnico' || rol === 'administrador';

const obtenerMensajeError = (err, mensajePorDefecto) => {
  const mensaje = err.response?.data?.message;
  return Array.isArray(mensaje)
    ? mensaje.join(' ')
    : typeof mensaje === 'string'
      ? mensaje
      : mensajePorDefecto;
};

function ListaUsuarios() {
  const { rol } = useAuth();
  const esAdministrador = rol === 'administrador';

  const [usuarios, setUsuarios] = useState([]);
  const [filtroRol, setFiltroRol] = useState('todos');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [usuarioEditado, setUsuarioEditado] = useState(null);
  const [form, setForm] = useState(crearFormVacio);
  const [errorFormulario, setErrorFormulario] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = () => {
    setError('');
    getUsuarios()
      .then(setUsuarios)
      .catch((err) => {
        setError(obtenerMensajeError(err, 'Error al cargar los usuarios'));
      });
  };

  useEffect(() => {
    cargar();
  }, []);

  const cerrarModal = () => {
    if (guardando) return;
    setMostrarModal(false);
    setErrorFormulario('');
    setUsuarioEditado(null);
    setForm(crearFormVacio());
  };

  const abrirCrear = () => {
    if (!esAdministrador) return;
    setUsuarioEditado(null);
    setForm(crearFormVacio());
    setErrorFormulario('');
    setExito('');
    setMostrarModal(true);
  };

  const abrirEditar = (usuario) => {
    if (!esAdministrador) return;
    setUsuarioEditado(usuario);
    setForm({
      nombre: usuario.nombre,
      email: usuario.email,
      departamento: usuario.departamento || '',
      rol: usuario.rol,
      password: '', // Nunca precargar ni mostrar contraseñas existentes.
      activo: usuario.activo,
    });
    setErrorFormulario('');
    setExito('');
    setMostrarModal(true);
  };

  const actualizarCampo = (campo, valor) => {
    setForm((anterior) => ({
      ...anterior,
      [campo]: valor,
      // Un empleado no inicia sesión, por lo que no recibe contraseña.
      ...(campo === 'rol' && valor === 'empleado' ? { password: '' } : {}),
    }));
    setErrorFormulario('');
  };

  const esEdicion = usuarioEditado !== null;
  const rolConAcceso = requiereContrasena(form.rol);
  const promocionDesdeEmpleado =
    esEdicion &&
    usuarioEditado.rol === 'empleado' &&
    rolConAcceso;
  const passwordObligatoria = rolConAcceso &&
    (!esEdicion || promocionDesdeEmpleado);

  const guardar = async (e) => {
    e.preventDefault();
    if (!esAdministrador || guardando) return;

    setErrorFormulario('');
    const nombre = form.nombre.trim();
    const email = form.email.trim();
    const departamento = form.departamento.trim();
    const password = form.password;

    if (!nombre || !email) {
      setErrorFormulario('El nombre y el correo electrónico son obligatorios.');
      return;
    }

    if (passwordObligatoria && !password) {
      setErrorFormulario('Debes asignar una contraseña para este rol.');
      return;
    }

    if (rolConAcceso && password) {
      if (password.length < 12 || !password.trim()) {
        setErrorFormulario('La contraseña debe tener al menos 12 caracteres.');
        return;
      }
      if (password.length > 72 || new TextEncoder().encode(password).length > 72) {
        setErrorFormulario('La contraseña no puede superar 72 caracteres ni 72 bytes.');
        return;
      }
    }

    setGuardando(true);
    try {
      if (esEdicion) {
        await actualizarUsuario(usuarioEditado.id, {
          nombre,
          email,
          departamento,
          activo: form.activo,
          rol: form.rol,
          ...(rolConAcceso && password ? { password } : {}),
        });
      } else {
        await crearUsuario({
          nombre,
          email,
          departamento: departamento || undefined,
          rol: form.rol,
          ...(rolConAcceso ? { password } : {}),
        });
      }

      setMostrarModal(false);
      setUsuarioEditado(null);
      setForm(crearFormVacio());
      setExito(esEdicion
        ? 'Usuario actualizado correctamente.'
        : 'Usuario creado correctamente.');
      cargar();
    } catch (err) {
      setErrorFormulario(obtenerMensajeError(err, 'Error al guardar el usuario'));
    } finally {
      setGuardando(false);
    }
  };

  const usuariosFiltrados = filtroRol === 'todos'
    ? usuarios
    : usuarios.filter((usuario) => usuario.rol === filtroRol);

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h2 className="mb-0">Gestión de usuarios</h2>
        {esAdministrador && (
          <Button onClick={abrirCrear}>Nuevo usuario</Button>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {exito && <Alert variant="success" onClose={() => setExito('')} dismissible>{exito}</Alert>}

      <div className="d-flex align-items-center gap-3 mb-3 flex-wrap">
        <Form.Label htmlFor="filtro-rol" className="mb-0 fw-semibold">
          Filtrar por rol:
        </Form.Label>
        <Form.Select
          id="filtro-rol"
          value={filtroRol}
          onChange={(e) => setFiltroRol(e.target.value)}
          style={{ maxWidth: '240px' }}
        >
          <option value="todos">Todos los usuarios</option>
          <option value="empleado">Empleados</option>
          <option value="tecnico">Técnicos</option>
          <option value="administrador">Administradores</option>
        </Form.Select>
        <span className="text-muted small">
          {usuariosFiltrados.length} de {usuarios.length} usuarios
        </span>
      </div>

      {usuariosFiltrados.length === 0 ? (
        <Alert variant="light" className="border text-center py-4">
          No hay usuarios para el filtro seleccionado.
        </Alert>
      ) : (
        <Row xs={1} md={2} xl={3} className="g-3">
          {usuariosFiltrados.map((u) => (
            <Col key={u.id}>
              <Card className="h-100 shadow-sm border-0">
                <Card.Body className="d-flex flex-column gap-3">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div className="min-w-0">
                      <Card.Title className="h6 mb-1">
                        <Link to={`/usuarios/${u.id}`} className="text-decoration-none">
                          {u.nombre}
                        </Link>
                      </Card.Title>
                      <Card.Subtitle className="small text-muted text-break">
                        {u.email}
                      </Card.Subtitle>
                    </div>
                    <Badge bg={u.activo ? 'success' : 'secondary'}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>

                  <div className="d-flex flex-wrap gap-2">
                    <Badge bg="secondary">
                      {etiquetasRol[u.rol] || u.rol || 'Sin rol'}
                    </Badge>
                  </div>

                  <div className="small">
                    <div className="mb-2">
                      <span className="text-muted">Departamento: </span>
                      <span>{u.departamento || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted">Equipos asignados: </span>
                      <strong>{u.cantidadEquipos ?? u.equipos?.length ?? 0}</strong>
                    </div>
                  </div>

                  <div className="mt-auto d-flex flex-wrap gap-2 pt-2 border-top">
                    <Button
                      as={Link}
                      to={`/usuarios/${u.id}`}
                      variant="outline-primary"
                      size="sm"
                    >
                      Ver detalles
                    </Button>
                    {esAdministrador && (
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={() => abrirEditar(u)}
                      >
                        Editar
                      </Button>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {esAdministrador && (
        <Modal show={mostrarModal} onHide={cerrarModal} centered>
          <Form onSubmit={guardar}>
            <Modal.Header closeButton={!guardando}>
              <Modal.Title>
                {esEdicion ? 'Editar usuario' : 'Nuevo usuario'}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {errorFormulario && (
                <Alert variant="danger">{errorFormulario}</Alert>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Nombre</Form.Label>
                <Form.Control
                  value={form.nombre}
                  onChange={(e) => actualizarCampo('nombre', e.target.value)}
                  disabled={guardando}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Correo electrónico</Form.Label>
                <Form.Control
                  type="email"
                  value={form.email}
                  onChange={(e) => actualizarCampo('email', e.target.value)}
                  disabled={guardando}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Departamento</Form.Label>
                <Form.Control
                  value={form.departamento}
                  onChange={(e) => actualizarCampo('departamento', e.target.value)}
                  disabled={guardando}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Rol</Form.Label>
                <Form.Select
                  value={form.rol}
                  onChange={(e) => actualizarCampo('rol', e.target.value)}
                  disabled={guardando}
                  required
                >
                  <option value="empleado">Empleado</option>
                  <option value="tecnico">Técnico</option>
                  <option value="administrador">Administrador</option>
                </Form.Select>
                {esEdicion && form.rol !== usuarioEditado.rol && (
                  <Form.Text className="text-warning-emphasis">
                    El cambio de rol modificará los permisos de acceso de esta cuenta.
                  </Form.Text>
                )}
              </Form.Group>

              {rolConAcceso && (
                <Form.Group className="mb-3">
                  <Form.Label>
                    {esEdicion ? 'Nueva contraseña de acceso' : 'Contraseña inicial'}
                  </Form.Label>
                  <Form.Control
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => actualizarCampo('password', e.target.value)}
                    disabled={guardando}
                    minLength={passwordObligatoria ? 12 : undefined}
                    maxLength={72}
                    required={passwordObligatoria}
                  />
                  <Form.Text className="text-muted">
                    {passwordObligatoria
                      ? 'Obligatoria para habilitar el acceso. Entre 12 y 72 caracteres, sin superar 72 bytes.'
                      : 'Opcional. Si la cambias, utiliza entre 12 y 72 caracteres (máximo 72 bytes). Déjala vacía para conservar la contraseña actual.'}
                  </Form.Text>
                </Form.Group>
              )}

              {esEdicion && (
                <Form.Check
                  type="switch"
                  id="usuario-activo"
                  label="Usuario activo"
                  checked={form.activo}
                  onChange={(e) => actualizarCampo('activo', e.target.checked)}
                  disabled={guardando}
                />
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={cerrarModal} disabled={guardando}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando}>
                {guardando ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>
      )}
    </>
  );
}

export default ListaUsuarios;
