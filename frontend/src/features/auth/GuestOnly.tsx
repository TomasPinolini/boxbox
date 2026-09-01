import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

// GuestOnly: lo inverso, para /login y /register — un usuario logueado va a /leagues.
export function GuestOnly() {
  const loggedIn = useAuthStore((s) => s.accessToken !== null);
  return loggedIn ? <Navigate to="/leagues" replace /> : <Outlet />;
}
