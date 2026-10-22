import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

// `replace` para que el back del browser no vuelva a la ruta prohibida.
export function RequireAuth() {
  const loggedIn = useAuthStore((s) => s.accessToken !== null);
  return loggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}
