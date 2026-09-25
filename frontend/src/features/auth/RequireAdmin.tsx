import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

// RequireAdmin: layout route, va ANIDADO dentro de RequireAuth (que ya resolvio "hay sesion").
// Un USER que entra por URL vuelve a /leagues. Es solo UX: la autorizacion real es
// requireAdmin en el backend — esconder la pantalla no protege el endpoint.
export function RequireAdmin() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  return isAdmin ? <Outlet /> : <Navigate to="/leagues" replace />;
}
