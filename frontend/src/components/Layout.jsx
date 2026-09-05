import { Container, Navbar, Nav, Button } from 'react-bootstrap';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Layout() {
  const { nombre, logout } = useAuth();

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
        <Container>
          <Navbar.Brand as={Link} to="/">Inventario TI</Navbar.Brand>
          <Navbar.Toggle />
          <Navbar.Collapse>
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/">Dashboard</Nav.Link>
              <Nav.Link as={Link} to="/equipos">Equipos</Nav.Link>
              <Nav.Link as={Link} to="/usuarios">Usuarios</Nav.Link>
              <Nav.Link as={Link} to="/compras/nueva">Registrar compra</Nav.Link>
            </Nav>
            <Navbar.Text className="me-3">{nombre}</Navbar.Text>
            <Button variant="outline-light" size="sm" onClick={logout}>
              Cerrar sesión
            </Button>
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
