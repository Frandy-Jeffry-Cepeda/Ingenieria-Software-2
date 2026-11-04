import PropTypes from 'prop-types';
import { Badge } from 'react-bootstrap';

const colores = {
  disponible: 'success',
  entregado: 'primary',
  en_mantenimiento: 'warning',
  de_baja: 'secondary',
};

const textos = {
  disponible: 'Disponible',
  entregado: 'Entregado',
  en_mantenimiento: 'En mantenimiento',
  de_baja: 'De baja',
};

function EstadoBadge({ estado }) {
  return (
    <Badge bg={colores[estado] || 'light'}>
      {textos[estado] || estado}
    </Badge>
  );
}

EstadoBadge.propTypes = {
  estado: PropTypes.oneOf([
    'disponible',
    'entregado',
    'en_mantenimiento',
    'de_baja',
  ]).isRequired,
}; //Aqui establecemos que el prop estado debe ser uno de los valores especificados y es obligatorio para los equipos que se ingresen. (A.J.A.D)

export default EstadoBadge;
