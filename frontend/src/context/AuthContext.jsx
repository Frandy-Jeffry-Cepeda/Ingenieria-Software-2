import { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState({
    token: localStorage.getItem('token'),
    nombre: localStorage.getItem('nombre'),
  });
  const navigate = useNavigate();

  const login = (token, nombre) => {
    localStorage.setItem('token', token);
    localStorage.setItem('nombre', nombre);
    setSesion({ token, nombre });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('nombre');
    setSesion({ token: null, nombre: null });
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ ...sesion, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
}; //Aqui establecemos que el prop children es obligatorio, asi evitamos que el componente padre lo omita o pase un tipo incorrecto. (A.J.A.D)

export function useAuth() {
  return useContext(AuthContext);
}
