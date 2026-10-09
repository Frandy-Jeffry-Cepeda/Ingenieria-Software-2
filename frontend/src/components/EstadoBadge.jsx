
import PropTypes from 'prop-types';
import { Badge } from 'react-bootstrap';

const colores = {
  disponible: 'success',
  entregado: 'primary',
  de_baja: 'secondary',
};

const textos = {
  disponible: 'Disponible',
  entregado: 'Entregado',
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
    'de_baja',
  ]).isRequired,
}; //Aqui establecemos que el prop estado debe ser uno de los valores especificados y es obligatorio para los equipos que se ingresen. (A.J.A.D)

export default EstadoBadge;
