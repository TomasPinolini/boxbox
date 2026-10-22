import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

// Va anidado dentro de RequireAuth. Es solo UX: la autorizacion real es requireAdmin en el backend.
export function RequireAdmin() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  return isAdmin ? <Outlet /> : <Navigate to="/leagues" replace />;
}
