import { createBrowserRouter, Navigate } from 'react-router-dom';
import { GuestOnly } from '../features/auth/GuestOnly';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { RequireAuth } from '../features/auth/RequireAuth';

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
    children: [
      // Placeholder hasta Task 6.
      { path: '/leagues', element: <p className="p-6">Mis ligas (Task 6)</p> },
    ],
  },
  { path: '*', element: <Navigate to="/leagues" replace /> },
]);
