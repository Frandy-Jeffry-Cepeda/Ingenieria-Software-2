import { useEffect, useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import PropTypes from "prop-types";

function ModalMantenimiento({ show, onCerrar, onEnviarMantenimiento }) {
  const [descripcion, setDescripcion] = useState('');
  const [tecnico, setTecnico] = useState('');
  const [fecha, setFecha] = useState('');

  useEffect(() => {
    if (show) {
      setDescripcion('');
      setTecnico('');
      setFecha('');
    }
  }, [show]);

  const confirmar = (e) => {
    e.preventDefault();
    onEnviarMantenimiento({ descripcion, tecnico, fecha });
  };

  return (
    <Modal show={show} onHide={onCerrar}>
      <Form onSubmit={confirmar}>
        <Modal.Header closeButton>
          <Modal.Title>Enviar a mantenimiento</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Descripci&oacute;n del problema</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>T&eacute;cnico responsable</Form.Label>
            <Form.Control
              value={tecnico}
              onChange={(e) => setTecnico(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Fecha programada</Form.Label>
            <Form.Control
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" variant="warning">Confirmar</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
ModalMantenimiento.propTypes = {
  show: PropTypes.bool.isRequired,
  onCerrar: PropTypes.func.isRequired,
  onEnviarMantenimiento: PropTypes.func.isRequired,
};
export default ModalMantenimiento;