import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function RutaPrivada() {
  const { token } = useAuth();

  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

export default RutaPrivada;
