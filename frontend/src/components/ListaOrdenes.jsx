import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { getOrdenesMantenimiento } from '../api/api';

function ListaOrdenes({ equipoId }) {
  const [ordenes, setOrdenes] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (equipoId) {
      getOrdenesMantenimiento(equipoId)
        .then((datos) => setOrdenes(datos))
        .catch(() => setError('No se pudieron cargar las órdenes de mantenimiento.'));
    }
  }, [equipoId]);

  return (
    <div className="mt-4">
      <h4>Historial de Órdenes de Mantenimiento</h4>
      {error && <div className="alert alert-danger">{error}</div>}

      {ordenes.length === 0 ? (
        <p className="text-muted">No hay órdenes de mantenimiento registradas para este equipo.</p>
      ) : (
        <table className="table table-striped table-bordered">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Técnico</th>
              <th>Descripción</th>
            </tr>
          </thead>
          <tbody>
            {ordenes.map((orden) => (
              <tr key={orden.id}>
                <td>{orden.id}</td>
                <td>{new Date(orden.fecha).toLocaleDateString()}</td>
                <td>{orden.tecnico}</td>
                <td>{orden.descripcion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

ListaOrdenes.propTypes = {
  equipoId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

export default ListaOrdenes;