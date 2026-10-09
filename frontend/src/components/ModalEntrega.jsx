import { useEffect, useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import { getUsuarios } from '../api/api';
import PropTypes from 'prop-types'; // Agregamos el import de PropTypes para validar los props del componente ModalEntrega. (A.J.A.D)

function ModalEntrega({ show, onCerrar, onEntregar }) {
  const [empleados, setEmpleados] = useState([]);
  const [usuarioId, setUsuarioId] = useState('');
  const [observacion, setObservacion] = useState('');

  useEffect(() => {
    if (show) {
      getUsuarios('empleado').then(setEmpleados).catch(() => setEmpleados([]));
      setUsuarioId('');
      setObservacion('');
    }
  }, [show]);

  const confirmar = () => {
    if (!usuarioId) {
      alert('Seleccione un empleado');
      return;
    }
    onEntregar({ usuarioId: Number(usuarioId), observacion: observacion || undefined });
  };

  return (
    <Modal show={show} onHide={onCerrar}>
      <Modal.Header closeButton>
        <Modal.Title>Entregar equipo</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Empleado</Form.Label>
          <Form.Select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}>
            <option value="">Seleccione un empleado</option>
            {empleados.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.nombre} {emp.departamento ? `(${emp.departamento})` : ''}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <Form.Group>
          <Form.Label>Observación (opcional)</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
        <Button variant="primary" onClick={confirmar}>Entregar</Button>
      </Modal.Footer>
    </Modal>
  );
}


ModalEntrega.propTypes = {
  show: PropTypes.bool.isRequired,
  onCerrar: PropTypes.func.isRequired,
  onEntregar: PropTypes.func.isRequired,
}; //Aqui establecemos que los props show, onCerrar y onEntregar son obligatorios y deben ser de tipo booleano y función respectivamente. (A.J.A.D)

export default ModalEntrega;
