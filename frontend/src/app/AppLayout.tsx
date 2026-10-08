import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/auth.store';

// AppLayout: la barra de navegacion persistente + el contenido de la ruta.
//
// Vive en app/ y no en components/ui/ porque lee el store de auth, y la convencion del
// proyecto reserva components/ui/ para primitivas sin logica de dominio.
//
// Se monta como layout route envolviendo todo menos /login y /register, que son las unicas
// pantallas sin navegacion. Asi aparece en las 7 pantallas de la app sin que ninguna tenga
// que pasarla, y sin tocar PageShell.
//
// Antes cada pagina armaba sus propios links en su prop `actions`, con tres consecuencias:
// la lista era distinta en cada una, desde una pantalla de detalle solo se podia volver, y
// "Salir" existia unicamente en Mis ligas.

// NavLink pone aria-current="page" solo en el link activo. El color marca donde estas: el
// acento rojo es la posicion actual, no un link cualquiera.
const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? 'font-semibold text-red-600 underline underline-offset-4'
    : 'font-semibold text-slate-600 hover:text-slate-900 hover:underline';

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  async function logout() {
    await authService.logout();
    navigate('/login');
  }

  return (
    <>
      <nav aria-label="Principal" className="border-b border-slate-200 bg-white">
        {/* Mismo contenedor que PageShell (max-w-5xl px-4 md:px-6) para que la barra quede
            alineada con el contenido de la pagina. flex-wrap: en pantallas angostas los
            links bajan de linea en vez de desbordar. */}
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm md:px-6">
          <Link to="/leagues" className="mr-auto text-base font-bold tracking-tight">
            BOX<span className="text-red-600">BOX</span>
          </Link>

          <NavLink to="/drivers" className={linkClass}>
            Pilotos
          </NavLink>
          <NavLink to="/standings" className={linkClass}>
            Campeonato
          </NavLink>
          {user && (
            <NavLink to="/leagues" className={linkClass}>
              Mis ligas
            </NavLink>
          )}
          {/* Solo ADMIN: un link muerto para un USER es peor que no tenerlo (BOX-37). */}
          {user?.role === 'ADMIN' && (
            <NavLink to="/admin/results" className={linkClass}>
              Cargar resultados
            </NavLink>
          )}

          {user ? (
            <>
              <span className="text-slate-500">{user.name}</span>
              <Button variant="secondary" onClick={logout}>
                Salir
              </Button>
            </>
          ) : (
            // /drivers y /standings son publicas, asi que la barra tambien se ve sin sesion.
            <Link to="/login" className="font-semibold text-red-600 hover:underline">
              Ingresar
            </Link>
          )}
        </div>
      </nav>
      {/* aria-hidden: es decoracion pura, no tiene por que aparecer en el arbol de
          accesibilidad de nadie. */}
      <div aria-hidden="true" className="checkered h-2" />

      <Outlet />
    </>
  );
}
