import { Container, Navbar, Nav, NavDropdown } from 'react-bootstrap';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const etiquetasRol = {
  administrador: 'Administrador',
  tecnico: 'Técnico',
  empleado: 'Empleado',
};

function Layout() {
  const { nombre, rol, logout } = useAuth();

  const esAdministrador = rol === 'administrador';
  // GET /usuarios permite administradores y técnicos; las acciones de
  // creación/edición siguen reservadas para administradores.
  const puedeConsultarUsuarios = esAdministrador || rol === 'tecnico';

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
        <Container>
          <Navbar.Brand as={Link} to="/">
            Inventario TI
          </Navbar.Brand>

          <Navbar.Toggle aria-controls="menu-principal" />

          <Navbar.Collapse id="menu-principal">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/">
                Dashboard
              </Nav.Link>

              <Nav.Link as={Link} to="/equipos">
                Equipos
              </Nav.Link>

              <Nav.Link as={Link} to="/compras/nueva">
                Registrar compra
              </Nav.Link>

              {puedeConsultarUsuarios && (
                <Nav.Link as={Link} to="/usuarios">
                  {esAdministrador ? 'Administración de usuarios' : 'Usuarios'}
                </Nav.Link>
              )}
            </Nav>

            <Nav>
              <NavDropdown title={nombre || 'Mi cuenta'} id="menu-mi-cuenta" align="end">
                <NavDropdown.ItemText>
                  <small className="text-muted">
                    Rol: {etiquetasRol[rol] || 'Verificando sesión...'}
                  </small>
                </NavDropdown.ItemText>

                <NavDropdown.Divider />

                <NavDropdown.Item as={Link} to="/mi-cuenta/cambiar-contrasena">
                  Cambiar contraseña
                </NavDropdown.Item>

                <NavDropdown.Divider />

                <NavDropdown.Item onClick={logout}>
                  Cerrar sesión
                </NavDropdown.Item>
              </NavDropdown>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="pb-4">
        <Outlet />
      </Container>
    </>
  );
}

export default Layout;
