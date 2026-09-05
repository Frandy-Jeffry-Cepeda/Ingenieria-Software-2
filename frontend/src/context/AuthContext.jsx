import { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

export function useAuth() {
  return useContext(AuthContext);
}
