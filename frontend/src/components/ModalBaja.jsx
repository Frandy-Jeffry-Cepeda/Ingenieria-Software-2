import { useEffect, useState } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

function ModalBaja({ show, onCerrar, onDarDeBaja }) {
  const [motivo, setMotivo] = useState('desahucio');
  const [observacion, setObservacion] = useState('');

  useEffect(() => {
    if (show) {
      setMotivo('desahucio');
      setObservacion('');
    }
  }, [show]);

  const confirmar = () => {
    onDarDeBaja({ motivo, observacion: observacion || undefined });
  };

  return (
    <Modal show={show} onHide={onCerrar}>
      <Modal.Header closeButton>
        <Modal.Title>Dar de baja</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Motivo</Form.Label>
          <Form.Check
            type="radio"
            id="motivo-desahucio"
            label="Desahucio"
            checked={motivo === 'desahucio'}
            onChange={() => setMotivo('desahucio')}
          />
          <Form.Check
            type="radio"
            id="motivo-obsolescencia"
            label="Obsolescencia"
            checked={motivo === 'obsolescencia'}
            onChange={() => setMotivo('obsolescencia')}
          />
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
        <Button variant="danger" onClick={confirmar}>Dar de baja</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ModalBaja;
