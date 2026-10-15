import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import type { User } from '../models/user';
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
//
// Dos barras, no una que se reacomoda: apretar varios links + usuario + Salir en una fila con
// flex-wrap (como era antes) dejaba la navegacion en 2-3 lineas en un telefono. Abajo de md es
// la barra angosta (hamburguesa + logo) con un drawer; de md para arriba es la fila horizontal
// de siempre, sin tocar.
//
// Resultados/Temporadas/Circuitos (ADMIN) ya no estan en esa fila ni en esa lista: son una
// capacidad del rol, no navegacion de catalogo como Pilotos/Campeonato, asi que viven
// agrupadas bajo "Carga" — en escritorio adentro de UserMenu, en movil en su propia seccion
// del drawer. Pedido del usuario 2026-10-15; ver ADMIN_LINKS/AdminLinksGroup mas abajo.

// NavLink pone aria-current="page" solo en el link activo. El color marca donde estas: el
// acento rojo es la posicion actual, no un link cualquiera.
const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? 'font-semibold text-red-600 underline underline-offset-4'
    : 'font-semibold text-slate-600 hover:text-slate-900 dark:text-ink-muted dark:hover:text-ink-text hover:underline';

// Mismo activo-en-rojo que linkClass, pero como fila de lista vertical: el acento es un borde
// izquierdo + fondo tenue, no un subrayado — un subrayado en una fila de ancho completo no se
// lee igual que en un link suelto.
const drawerLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-r-md py-3 pl-4 pr-3 font-semibold ${
    isActive
      ? 'border-l-4 border-red-600 bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
      : 'border-l-4 border-transparent text-slate-600 hover:bg-slate-50 dark:text-ink-muted dark:hover:bg-ink-surface'
  }`;

// Igual que linkClass pero como item de un menu angosto (el de cuenta, UserMenu mas abajo):
// fondo en hover en vez de subrayado, mismo tratamiento que "Cerrar sesion" en ese mismo menu.
const menuLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-4 py-2 text-sm font-semibold ${
    isActive
      ? 'text-red-600'
      : 'text-slate-700 hover:bg-slate-50 dark:text-ink-text dark:hover:bg-ink-border'
  }`;

// Las 3 pantallas de carga de datos, pedido del usuario 2026-10-15: antes vivian sueltas en la
// barra de navegacion (Cargar resultados, Temporadas, Circuitos) compitiendo con Pilotos/
// Campeonato/Mis ligas como si fueran contenido mas. Son una capacidad del rol ADMIN, no
// navegacion de catalogo, asi que se agrupan aparte — en escritorio adentro del menu de
// cuenta (UserMenu), en movil en su propia seccion con el mismo label "Carga" arriba de los
// tres, sin moverlos del drawer (pedido explicito: ahi se quedan, solo agrupados).
const ADMIN_LINKS = [
  { to: '/admin/results', label: 'Resultados' },
  { to: '/admin/seasons', label: 'Temporadas' },
  { to: '/admin/circuits', label: 'Circuitos' },
];

// uppercase + tracking-wide: patron de encabezado de grupo no clickeable (no es un link, no
// se confunde con uno), mismo criterio que separar visualmente sin agregar jerarquia de
// navegacion real.
function AdminLinksGroup({
  className,
  labelClassName,
  onNavigate,
  asMenuItems = false,
}: {
  className: (props: { isActive: boolean }) => string;
  labelClassName: string;
  onNavigate: () => void;
  // true adentro de UserMenu (role="menu"): cada link necesita role="menuitem" para el
  // patron ARIA de menu. false en el drawer, que es un <nav> con links comunes.
  asMenuItems?: boolean;
}) {
  return (
    <>
      <p className={labelClassName}>Carga</p>
      {ADMIN_LINKS.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          role={asMenuItems ? 'menuitem' : undefined}
          className={className}
          onClick={onNavigate}
        >
          {link.label}
        </NavLink>
      ))}
    </>
  );
}

// Foto del usuario + iniciales de respaldo, mismo patron que DriverAvatar (features/drivers/):
// avatarUrl es un recurso remoto que puede fallar, y bastantes usuarios ni lo van a tener.
function UserAvatar({ user, size = 44 }: { user: Pick<User, 'name' | 'avatarUrl'>; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  if (!user.avatarUrl || failed) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-slate-200 font-semibold text-slate-600 dark:bg-ink-surface dark:text-ink-muted"
        style={{ width: size, height: size, fontSize: Math.max(size * 0.36, 10) }}
        aria-hidden="true"
      >
        {initials}
      </span>
    );
  }

  return (
    <img
      src={user.avatarUrl}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full bg-slate-100 object-cover"
      style={{ width: size, height: size }}
    />
  );
}

// El logo tiene el trazo en negro de marca (#111113, ver public/logo.svg) fijo en el
// archivo — invisible sobre el fondo oscuro. logo-dark.svg es el mismo trazo pero en
// --color-ink-text, mismo rojo de marca sin tocar. Dos <img> y CSS puro (dark:hidden /
// hidden dark:block) para elegir cual se ve: no hace falta JS porque el modo oscuro sigue
// el sistema operativo, no un estado de React.
function Logo({ className }: { className: string }) {
  return (
    <>
      <img src="/logo.svg" alt="boxbox" className={`${className} dark:hidden`} />
      <img src="/logo-dark.svg" alt="boxbox" className={`hidden ${className} dark:block`} />
    </>
  );
}

// Menu de cuenta de escritorio: el avatar (foto o iniciales, UserAvatar de mas arriba) abre un
// menu chico con el nombre y "Cerrar sesion" — reemplaza el nombre suelto + boton "Salir" que
// estaban como hermanos en la barra. Pedido del usuario 2026-10-15: patron estandar (Gmail,
// GitHub, Slack), asi que no hace falta inventar nada.
//
// Cierra con click afuera (el listener en document, no en el boton: un click ADENTRO del menu
// nunca debe cerrarlo antes de que el item corra su propio onClick) y con Escape, mismo
// criterio que el drawer mobile y RivalTeamModal. Sin bloqueo de scroll del body: a diferencia
// de esos dos, este menu no tapa la pantalla, no hace falta.
function UserMenu({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Cuenta de ${user.name}`}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-ink-surface"
      >
        <UserAvatar user={user} size={32} />
      </button>

      {open && (
        <div
          role="menu"
          // "Opciones de la cuenta" y no "Cuenta": el gatillo se llama "Cuenta de <nombre>" y
          // el menu colgaba adentro con un nombre que era subcadena del suyo.
          aria-label="Opciones de la cuenta"
          className="absolute right-0 top-full z-20 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-slate-200 dark:bg-ink-surface dark:ring-ink-border"
        >
          <p className="truncate border-b border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 dark:border-ink-border dark:text-ink-text">
            {user.name}
          </p>
          {user.role === 'ADMIN' && (
            <div className="border-b border-slate-200 py-1 dark:border-ink-border">
              <AdminLinksGroup
                className={menuLinkClass}
                labelClassName="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-ink-muted"
                onNavigate={close}
                asMenuItems
              />
            </div>
          )}
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              close();
              onLogout();
            }}
            className="block w-full px-4 py-2 text-left text-sm font-semibold text-red-600 hover:bg-slate-50 dark:hover:bg-ink-border"
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  async function logout() {
    await authService.logout();
    navigate('/login');
  }

  function closeDrawer() {
    setDrawerOpen(false);
    // El foco vuelve al botón que abrió el drawer — si no, al cerrar (Escape, overlay, un
    // link) el foco queda en un elemento que ya no está en pantalla y el teclado se pierde.
    hamburgerRef.current?.focus();
  }

  // Al abrir: foco adentro del drawer (el cierre, primer elemento interactivo) y scroll del
  // body bloqueado — si no, atrás del overlay se puede seguir scrolleando la pagina con el
  // drawer flotando encima, que se siente roto. Escape cierra, como cualquier panel flotante.
  useEffect(() => {
    if (!drawerOpen) return;
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeDrawer();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [drawerOpen]);

  // Misma lista de links en dos lugares (fila horizontal de escritorio, lista vertical del
  // drawer) con dos tratamientos visuales distintos — un subrayado se lee bien en una fila
  // suelta, no en una fila de ancho completo. `className` es la funcion de aria-current que
  // decide el color; el resto de la estructura es identica.
  function renderNavLinks(className: (props: { isActive: boolean }) => string) {
    return (
      <>
        <NavLink to="/drivers" className={className} onClick={closeDrawer}>
          Pilotos
        </NavLink>
        <NavLink to="/standings" className={className} onClick={closeDrawer}>
          Campeonato
        </NavLink>
        {user && (
          <NavLink to="/leagues" className={className} onClick={closeDrawer}>
            Mis ligas
          </NavLink>
        )}
      </>
    );
  }

  return (
    <>
      {/* Skip link. Lo pide la barra de navegacion de abajo: con varios links persistentes,
          alguien que navega con teclado tiene que pasar por todos en CADA pantalla antes de
          llegar al contenido. Esta oculto hasta que recibe foco (sr-only + focus:not-sr-only),
          que es el patron estandar: solo aparece para quien lo necesita, en el primer Tab. */}
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-red-600 focus:shadow-md focus:ring-1 focus:ring-slate-300 dark:focus:bg-ink-surface dark:focus:ring-ink-border"
      >
        Saltar al contenido
      </a>

      <nav aria-label="Principal" className="border-b border-slate-200 bg-white dark:border-ink-border dark:bg-ink">
        {/* Barra angosta: hamburguesa a la izquierda (abre un drawer que entra por la
            izquierda — el boton queda del lado por el que aparece el panel) y logo a la
            derecha, para no competir por el mismo lado. Visible solo abajo de md. */}
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 md:hidden">
          <button
            ref={hamburgerRef}
            type="button"
            aria-label="Abrir menú"
            aria-expanded={drawerOpen}
            aria-controls="menu-mobile"
            onClick={() => setDrawerOpen(true)}
            className="flex h-11 w-11 flex-col items-center justify-center gap-1"
          >
            <span aria-hidden="true" className="block h-0.5 w-5 rounded-full bg-slate-900 dark:bg-ink-text" />
            <span aria-hidden="true" className="block h-0.5 w-5 rounded-full bg-slate-900 dark:bg-ink-text" />
            <span aria-hidden="true" className="block h-0.5 w-5 rounded-full bg-slate-900 dark:bg-ink-text" />
          </button>
          <Link to="/leagues">
            <Logo className="h-7 w-auto" />
          </Link>
        </div>

        {/* Mismo contenedor que PageShell (max-w-5xl px-4 md:px-6) para que la barra quede
            alineada con el contenido de la pagina. Fila horizontal de siempre, de md en
            adelante. */}
        <div className="mx-auto hidden w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm md:flex md:px-6">
          <Link to="/leagues" className="mr-auto">
            <Logo className="h-7 w-auto" />
          </Link>

          {renderNavLinks(linkClass)}

          {user ? (
            <UserMenu user={user} onLogout={logout} />
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

      {drawerOpen && (
        <>
          {/* El overlay cierra con un click: es el area "afuera" del panel, el gesto estandar
              para descartarlo. type="button" + aria-hidden porque es puramente un gesto de
              cierre, no algo que un lector de pantalla necesite anunciar como boton. */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={closeDrawer}
            className="fixed inset-0 z-20 bg-slate-900/50 md:hidden"
          />
          <div
            id="menu-mobile"
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            className="enter-left fixed inset-y-0 left-0 z-30 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl dark:bg-ink md:hidden"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-4 dark:border-ink-border">
              {user ? (
                <div className="flex min-w-0 items-center gap-2.5">
                  <UserAvatar user={user} />
                  <span className="truncate font-semibold text-slate-900 dark:text-ink-text">
                    {user.name}
                  </span>
                </div>
              ) : (
                <span className="font-semibold text-slate-900 dark:text-ink-text">Menú</span>
              )}
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Cerrar menú"
                onClick={closeDrawer}
                className="flex h-11 w-11 shrink-0 items-center justify-center text-2xl leading-none text-slate-400 hover:text-slate-600 dark:text-ink-muted dark:hover:text-ink-text"
              >
                ×
              </button>
            </div>

            {/* No "Principal": ya hay un nav con esa etiqueta en la pagina (el de arriba, la
                barra), y dos landmarks con el mismo nombre a la vez confunden la navegacion
                por regiones de un lector de pantalla. */}
            {/* "Secciones" y no "Menú": el <dialog> de afuera ya se llama asi, y dos regiones
                anidadas con el MISMO nombre se anuncian "Menú, dialogo" / "Menú, navegacion"
                una atras de la otra. Ademas hay otro <nav> en la pagina (el de escritorio,
                "Principal"), asi que el nombre tiene que distinguirlos. */}
            <nav aria-label="Secciones" className="flex flex-1 flex-col gap-0.5 overflow-y-auto py-2">
              {renderNavLinks(drawerLinkClass)}
              {user?.role === 'ADMIN' && (
                <AdminLinksGroup
                  className={drawerLinkClass}
                  labelClassName="pb-1 pl-4 pr-3 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-ink-muted"
                  onNavigate={closeDrawer}
                />
              )}
            </nav>

            <div className="border-t border-slate-200 p-4 dark:border-ink-border">
              {user ? (
                <Button className="w-full" onClick={logout}>
                  Cerrar sesión
                </Button>
              ) : (
                <Link
                  to="/login"
                  onClick={closeDrawer}
                  className="block w-full rounded-md bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-red-700"
                >
                  Ingresar
                </Link>
              )}
            </div>
          </div>
        </>
      )}

      <Outlet />
    </>
  );
}
