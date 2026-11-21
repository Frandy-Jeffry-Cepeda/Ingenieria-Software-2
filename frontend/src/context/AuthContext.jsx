import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { getMiCuenta } from '../api/api';

const AuthContext = createContext(null);

function leerSesionGuardada() {
  const token = localStorage.getItem('token');
  return {
    token,
    nombre: token ? localStorage.getItem('nombre') : null,
    rol: token ? localStorage.getItem('rol') : null,
  };
}

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(leerSesionGuardada);
  // El rol guardado en localStorage puede haber cambiado en el servidor.
  // No mostramos controles administrativos hasta confirmar el perfil al recargar.
  const [perfilVerificado, setPerfilVerificado] = useState(
    () => !localStorage.getItem('token'),
  );
  const sincronizacionEnCurso = useRef(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const sincronizarPerfil = useCallback(async () => {
    const tokenConsultado = sesion.token;
    if (!tokenConsultado || sincronizacionEnCurso.current) return;

    sincronizacionEnCurso.current = true;
    try {
      const perfil = await getMiCuenta();
      if (localStorage.getItem('token') !== tokenConsultado) return;

      if (typeof perfil.nombre !== 'string' || typeof perfil.rol !== 'string') {
        throw new Error('El servidor devolvió un perfil incompleto');
      }

      localStorage.setItem('nombre', perfil.nombre);
      localStorage.setItem('rol', perfil.rol);
      setSesion((actual) => {
        if (actual.token !== tokenConsultado) return actual;
        if (actual.nombre === perfil.nombre && actual.rol === perfil.rol) {
          return actual;
        }
        return { ...actual, nombre: perfil.nombre, rol: perfil.rol };
      });
      setPerfilVerificado(true);
    } catch {
      // El interceptor de api.js maneja un 401 y redirige a /login.
      // Ante errores temporales, evitamos asumir permisos no verificados.
    } finally {
      sincronizacionEnCurso.current = false;
    }
  }, [sesion.token]);

  // Refrescar el perfil al abrir la aplicación o navegar a otra pantalla.
  useEffect(() => {
    void sincronizarPerfil();
  }, [pathname, sincronizarPerfil]);

  // También detectar cambios hechos por otro administrador mientras la pestaña
  // sigue abierta: al regresar a ella y, como respaldo, cada 60 segundos.
  useEffect(() => {
    if (!sesion.token) return undefined;

    const alEnfocar = () => { void sincronizarPerfil(); };
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'visible') {
        void sincronizarPerfil();
      }
    };

    window.addEventListener('focus', alEnfocar);
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void sincronizarPerfil();
      }
    }, 60_000);

    return () => {
      window.removeEventListener('focus', alEnfocar);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      window.clearInterval(intervalo);
    };
  }, [sesion.token, sincronizarPerfil]);

  const login = (token, nombre, rol) => {
    localStorage.setItem('token', token);
    localStorage.setItem('nombre', nombre);
    localStorage.setItem('rol', rol);
    setSesion({ token, nombre, rol });
    // El login ya verificó la identidad y el rol; /auth/me se reconsulta al navegar.
    setPerfilVerificado(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('nombre');
    localStorage.removeItem('rol');
    setSesion({ token: null, nombre: null, rol: null });
    setPerfilVerificado(true);
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider
      value={{
        ...sesion,
        // No confiar en el rol cacheado antes de verificar la sesión recuperada.
        rol: perfilVerificado ? sesion.rol : null,
        sincronizarPerfil,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useAuth() {
  return useContext(AuthContext);
}
