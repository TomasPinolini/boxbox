import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

export function GuestOnly() {
  const loggedIn = useAuthStore((s) => s.accessToken !== null);
  return loggedIn ? <Navigate to="/leagues" replace /> : <Outlet />;
}
