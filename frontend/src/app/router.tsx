import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from './AppLayout';
import { GuestOnly } from '../features/auth/GuestOnly';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { RaceResultsPage } from '../features/admin/RaceResultsPage';
import { CircuitsPage } from '../features/admin/CircuitsPage';
import { RacesPage } from '../features/admin/RacesPage';
import { ConstructorDetailPage } from '../features/constructors/ConstructorDetailPage';
import { SeasonsPage } from '../features/admin/SeasonsPage';
import { RequireAdmin } from '../features/auth/RequireAdmin';
import { NovedadesPage } from '../features/changelog/NovedadesPage';
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
  {
    element: <AppLayout />,
    children: [
      {
        element: <RequireAuth />,
        children: [
          { path: '/leagues', element: <LeaguesPage /> },
          { path: '/leagues/:id', element: <LeagueDetailPage /> },
          { path: '/leagues/:id/draft', element: <DraftPage /> },
          {
            element: <RequireAdmin />,
            children: [
              { path: '/admin/results', element: <RaceResultsPage /> },
              { path: '/admin/seasons', element: <SeasonsPage /> },
              { path: '/admin/circuits', element: <CircuitsPage /> },
              { path: '/admin/races', element: <RacesPage /> },
            ],
          },
        ],
      },
      // Publicas a proposito: el backend no pide auth en los GET del catalogo.
      { path: '/drivers', element: <DriversPage /> },
      { path: '/drivers/:id', element: <DriverDetailPage /> },
      { path: '/constructors/:id', element: <ConstructorDetailPage /> },
      { path: '/standings', element: <ChampionshipPage /> },
      { path: '/novedades', element: <NovedadesPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/leagues" replace /> },
]);
