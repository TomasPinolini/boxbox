import { createBrowserRouter, Navigate } from 'react-router-dom';
import { GuestOnly } from '../features/auth/GuestOnly';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { RequireAuth } from '../features/auth/RequireAuth';
import { LeaguesPage } from '../features/leagues/LeaguesPage';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/leagues" replace /> },
  {
    element: <GuestOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [{ path: '/leagues', element: <LeaguesPage /> }],
  },
  { path: '*', element: <Navigate to="/leagues" replace /> },
]);
