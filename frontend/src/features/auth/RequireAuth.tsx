import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

// RequireAuth: layout route. Sin sesion -> /login. Es la "proteccion de rutas por nivel de
// acceso" de la rubrica. `replace` para que el back del browser no vuelva a la ruta prohibida.
export function RequireAuth() {
  const loggedIn = useAuthStore((s) => s.accessToken !== null);
  return loggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}
