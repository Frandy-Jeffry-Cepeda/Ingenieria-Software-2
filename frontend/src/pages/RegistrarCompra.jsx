import { useState } from 'react';
import { Form, Button, Card, Row, Col, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { crearCompra } from '../api/api';

const equipoVacio = { tipo: '', marca: '', modelo: '', numeroSerie: '' };

function RegistrarCompra() {
  const [proveedor, setProveedor] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [fechaCompra, setFechaCompra] = useState('');
  const [costoTotal, setCostoTotal] = useState('');
  const [equipos, setEquipos] = useState([{ ...equipoVacio }]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const cambiarEquipo = (indice, campo, valor) => {
    const copia = [...equipos];
    copia[indice] = { ...copia[indice], [campo]: valor };
    setEquipos(copia);
  };

  const agregarEquipo = () => setEquipos([...equipos, { ...equipoVacio }]);

  const quitarEquipo = (indice) => setEquipos(equipos.filter((_, i) => i !== indice));

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await crearCompra({
        proveedor,
        numeroFactura: numeroFactura || undefined,
        fechaCompra,
        costoTotal: costoTotal ? Number(costoTotal) : undefined,
        equipos: equipos.map((eq) => ({
          tipo: eq.tipo,
          marca: eq.marca || undefined,
          modelo: eq.modelo || undefined,
          numeroSerie: eq.numeroSerie,
        })),
      });
      navigate('/equipos');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrar la compra');
    }
  };

  return (
    <>
      <h2 className="mb-4">Registrar compra</h2>
      {error && <Alert variant="danger">{error}</Alert>}

      <Form onSubmit={enviar}>
        <Card className="mb-4">
          <Card.Header>Datos de la compra</Card.Header>
          <Card.Body>
            <Row>
              <Col md={4} className="mb-3">
                <Form.Label>Proveedor</Form.Label>
                <Form.Control
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  required
                />
              </Col>
              <Col md={3} className="mb-3">
                <Form.Label>Número de factura</Form.Label>
                <Form.Control
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                />
              </Col>
              <Col md={3} className="mb-3">
                <Form.Label>Fecha de compra</Form.Label>
                <Form.Control
                  type="date"
                  value={fechaCompra}
                  onChange={(e) => setFechaCompra(e.target.value)}
                  required
                />
              </Col>
              <Col md={2} className="mb-3">
                <Form.Label>Costo total</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0"
                  value={costoTotal}
                  onChange={(e) => setCostoTotal(e.target.value)}
                />
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <Card className="mb-4">
          <Card.Header>Equipos de la compra</Card.Header>
          <Card.Body>
            {equipos.map((eq, indice) => (
              <Row key={indice} className="align-items-end mb-3">
                <Col md={3}>
                  <Form.Label>Tipo</Form.Label>
                  <Form.Control
                    placeholder="laptop, monitor..."
                    value={eq.tipo}
                    onChange={(e) => cambiarEquipo(indice, 'tipo', e.target.value)}
                    required
                  />
                </Col>
                <Col md={2}>
                  <Form.Label>Marca</Form.Label>
                  <Form.Control
                    value={eq.marca}
                    onChange={(e) => cambiarEquipo(indice, 'marca', e.target.value)}
                  />
                </Col>
                <Col md={3}>
                  <Form.Label>Modelo</Form.Label>
                  <Form.Control
                    value={eq.modelo}
                    onChange={(e) => cambiarEquipo(indice, 'modelo', e.target.value)}
                  />
                </Col>
                <Col md={3}>
                  <Form.Label>Número de serie</Form.Label>
                  <Form.Control
                    value={eq.numeroSerie}
                    onChange={(e) => cambiarEquipo(indice, 'numeroSerie', e.target.value)}
                    required
                  />
                </Col>
                <Col md={1}>
                  <Button
                    variant="outline-danger"
                    onClick={() => quitarEquipo(indice)}
                    disabled={equipos.length === 1}
                  >
                    X
                  </Button>
                </Col>
              </Row>
            ))}
            <Button variant="outline-primary" onClick={agregarEquipo}>
              Agregar otro equipo
            </Button>
          </Card.Body>
        </Card>

        <Button type="submit" size="lg">Registrar compra</Button>
      </Form>
    </>
  );
}

export default RegistrarCompra;
