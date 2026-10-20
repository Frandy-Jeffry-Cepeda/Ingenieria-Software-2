import React, { useState } from 'react';
import PropTypes from 'prop-types';

function ModalMantenimiento({ show, onCerrar, onEnviarMantenimiento }) {
  const [descripcion, setDescripcion] = useState('');
  const [tecnico, setTecnico] = useState('');
  const [fecha, setFecha] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!descripcion || !tecnico || !fecha) {
      alert("Por favor completa todos los campos obligatorios.");
      return;
    }
    // Envía los tres campos requeridos al backend
    onEnviarMantenimiento({ descripcion, tecnico, fecha });
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Enviar equipo a mantenimiento</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Descripción del problema:</label>
            <textarea
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalle el motivo del mantenimiento..."
              required
            />
          </div>

          <div className="form-group">
            <label>Técnico responsable:</label>
            <input
              type="text"
              value={tecnico}
              onChange={(e) => setTecnico(e.target.value)}
              placeholder="Nombre del técnico"
              required
            />
          </div>

          <div className="form-group">
            <label>Fecha programada:</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onCerrar}>Cancelar</button>
            <button type="submit">Confirmar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

ModalMantenimiento.propTypes = {
  show: PropTypes.bool.isRequired,
  onCerrar: PropTypes.func.isRequired,
  onEnviarMantenimiento: PropTypes.func.isRequired,
};

export default ModalMantenimiento;