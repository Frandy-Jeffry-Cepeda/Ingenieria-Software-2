import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Row,
  Spinner,
} from 'react-bootstrap';
import { cambiarContrasena } from '../api/api';

const MIN_CARACTERES = 12;
const MAX_CARACTERES = 72;
const MAX_BYTES = 72;

function CambiarContrasena() {
  const [datos, setDatos] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [mostrar, setMostrar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const actualizarCampo = (e) => {
    const { name, value } = e.target;

    setDatos((anterior) => ({
      ...anterior,
      [name]: value,
    }));

    setError('');
    setExito('');
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (guardando) return;

    setError('');
    setExito('');

    const { currentPassword, newPassword, confirmPassword } = datos;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    if (newPassword.length < MIN_CARACTERES) {
      setError(`La nueva contraseña debe tener al menos ${MIN_CARACTERES} caracteres.`);
      return;
    }

    if (newPassword.length > MAX_CARACTERES) {
      setError(`La nueva contraseña no puede superar ${MAX_CARACTERES} caracteres.`);
      return;
    }

    if (new TextEncoder().encode(newPassword).length > MAX_BYTES) {
      setError(`La nueva contraseña no puede superar ${MAX_BYTES} bytes.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('La nueva contraseña debe ser diferente de la actual.');
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await cambiarContrasena(currentPassword, newPassword);

      setExito(respuesta?.message || 'Contraseña actualizada correctamente.');
      setDatos({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      const mensaje = err.response?.data?.message;

      if (Array.isArray(mensaje)) {
        setError(mensaje.join(' '));
      } else if (typeof mensaje === 'string') {
        setError(mensaje);
      } else {
        setError('No se pudo actualizar la contraseña. Verifica tu sesión y vuelve a intentarlo.');
      }
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Row className="justify-content-center">
      <Col xs={12} md={9} lg={6}>
        <Card className="shadow-sm">
          <Card.Header className="bg-white py-3">
            <h4 className="mb-1">Cambiar contraseña</h4>
            <p className="text-muted mb-0 small">
              Actualiza la contraseña de tu cuenta.
            </p>
          </Card.Header>

          <Card.Body className="p-4">
            {error && <Alert variant="danger" role="alert">{error}</Alert>}
            {exito && <Alert variant="success" role="status">{exito}</Alert>}

            <Form onSubmit={enviar}>
              <Form.Group className="mb-3" controlId="contrasena-actual">
                <Form.Label>Contraseña actual</Form.Label>
                <Form.Control
                  type={mostrar ? 'text' : 'password'}
                  name="currentPassword"
                  value={datos.currentPassword}
                  onChange={actualizarCampo}
                  autoComplete="current-password"
                  disabled={guardando}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="nueva-contrasena">
                <Form.Label>Nueva contraseña</Form.Label>
                <Form.Control
                  type={mostrar ? 'text' : 'password'}
                  name="newPassword"
                  value={datos.newPassword}
                  onChange={actualizarCampo}
                  autoComplete="new-password"
                  minLength={MIN_CARACTERES}
                  maxLength={MAX_CARACTERES}
                  disabled={guardando}
                  required
                />
                <Form.Text className="text-muted">
                  Entre 12 y 72 caracteres, sin superar 72 bytes. Los caracteres acentuados pueden ocupar más de un byte.
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-3" controlId="confirmar-contrasena">
                <Form.Label>Confirmar nueva contraseña</Form.Label>
                <Form.Control
                  type={mostrar ? 'text' : 'password'}
                  name="confirmPassword"
                  value={datos.confirmPassword}
                  onChange={actualizarCampo}
                  autoComplete="new-password"
                  disabled={guardando}
                  required
                />
              </Form.Group>

              <Form.Check
                type="checkbox"
                id="mostrar-contrasenas"
                label="Mostrar contraseñas"
                checked={mostrar}
                onChange={(e) => setMostrar(e.target.checked)}
                disabled={guardando}
                className="mb-4"
              />

              <Button type="submit" variant="primary" className="w-100" disabled={guardando}>
                {guardando ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                    Actualizando...
                  </>
                ) : (
                  'Actualizar contraseña'
                )}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

export default CambiarContrasena;
