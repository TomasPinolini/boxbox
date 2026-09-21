import { createBrowserRouter, Navigate } from 'react-router-dom';
import { GuestOnly } from '../features/auth/GuestOnly';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { RequireAuth } from '../features/auth/RequireAuth';
import { DriverDetailPage } from '../features/drivers/DriverDetailPage';
import { DriversPage } from '../features/drivers/DriversPage';
import { LeagueDetailPage } from '../features/leagues/LeagueDetailPage';
import { LeaguesPage } from '../features/leagues/LeaguesPage';
import { ChampionshipPage } from '../features/standings/ChampionshipPage';

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
      { path: '/leagues', element: <LeaguesPage /> },
      { path: '/leagues/:id', element: <LeagueDetailPage /> },
    ],
  },
  // Publicas, a proposito: los GET del catalogo no piden auth en el backend, asi que la
  // pantalla lo espeja. Entradas sueltas, sin layout route — RequireAuth y GuestOnly SI son
  // layout routes porque tienen que envolver a sus hijos.
  { path: '/drivers', element: <DriversPage /> },
  { path: '/drivers/:id', element: <DriverDetailPage /> },
  { path: '/standings', element: <ChampionshipPage /> },
  { path: '*', element: <Navigate to="/leagues" replace /> },
]);
