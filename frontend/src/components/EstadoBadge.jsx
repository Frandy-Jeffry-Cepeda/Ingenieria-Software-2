import React from 'react';
import PropTypes from 'prop-types';

function EstadoBadge({ estado }) {
  let badgeClass = 'badge bg-secondary';
  let texto = estado;

  if (estado === 'disponible') {
    badgeClass = 'badge bg-success';
    texto = 'Disponible';
  } else if (estado === 'en_mantenimiento') {
    badgeClass = 'badge bg-warning text-dark';
    texto = 'En Mantenimiento';
  } else if (estado === 'de_baja') {
    badgeClass = 'badge bg-danger';
    texto = 'De Baja';
  }

  return (
    <span className={badgeClass}>
      {texto}
    </span>
  );
}

EstadoBadge.propTypes = {
  estado: PropTypes.string.isRequired,
};

export default EstadoBadge;