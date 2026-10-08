import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { GuestOnly } from '../features/auth/GuestOnly';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { RaceResultsPage } from '../features/admin/RaceResultsPage';
import { RequireAdmin } from '../features/auth/RequireAdmin';
import { RequireAuth } from '../features/auth/RequireAuth';
import { DraftPage } from '../features/draft/DraftPage';
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
  // AppLayout envuelve TODO menos /login y /register: son las unicas pantallas sin barra de
  // navegacion. Asi las 7 pantallas de la app la tienen sin pasarla una por una.
  {
    element: <AppLayout />,
    children: [
      {
        element: <RequireAuth />,
        children: [
          { path: '/leagues', element: <LeaguesPage /> },
          { path: '/leagues/:id', element: <LeagueDetailPage /> },
          { path: '/leagues/:id/draft', element: <DraftPage /> },
          // Segundo nivel, anidado: primero "hay sesion" (RequireAuth), despues "es ADMIN".
          {
            element: <RequireAdmin />,
            children: [{ path: '/admin/results', element: <RaceResultsPage /> }],
          },
        ],
      },
      // Publicas, a proposito: los GET del catalogo no piden auth en el backend, asi que la
      // pantalla lo espeja. Van dentro de AppLayout igual, para que la barra aparezca
      // tambien sin sesion.
      { path: '/drivers', element: <DriversPage /> },
      { path: '/drivers/:id', element: <DriverDetailPage /> },
      { path: '/standings', element: <ChampionshipPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/leagues" replace /> },
]);
