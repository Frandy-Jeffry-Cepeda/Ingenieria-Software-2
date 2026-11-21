import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import RutaPrivada from './components/RutaPrivada';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ListaEquipos from './pages/ListaEquipos';
import DetalleEquipo from './pages/DetalleEquipo';
import RegistrarCompra from './pages/RegistrarCompra';
import ListaUsuarios from './pages/ListaUsuarios';
import DetalleUsuario from './pages/DetalleUsuario';
import CambiarContrasena from './pages/CambiarContrasena';
import BitacoraAccesos from './pages/BitacoraAccesos';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RutaPrivada />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/equipos" element={<ListaEquipos />} />
          <Route path="/equipos/:id" element={<DetalleEquipo />} />
          <Route path="/compras/nueva" element={<RegistrarCompra />} />
          <Route path="/usuarios" element={<ListaUsuarios />} />
          <Route path="/usuarios/:id" element={<DetalleUsuario />} />
          <Route path="/accesos" element={<BitacoraAccesos />} />
          <Route
            path="/mi-cuenta/cambiar-contrasena"
            element={<CambiarContrasena />}
          />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
