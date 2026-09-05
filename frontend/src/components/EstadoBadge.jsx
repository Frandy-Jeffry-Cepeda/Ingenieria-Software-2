import { Badge } from 'react-bootstrap';

const colores = { disponible: 'success', entregado: 'primary', de_baja: 'secondary' };
const textos = { disponible: 'Disponible', entregado: 'Entregado', de_baja: 'De baja' };

function EstadoBadge({ estado }) {
  return <Badge bg={colores[estado] || 'light'}>{textos[estado] || estado}</Badge>;
}

export default EstadoBadge;
