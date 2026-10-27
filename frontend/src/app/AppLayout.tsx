import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button, HelpPopover, Modal, PencilIcon, UserAvatar } from '../components/ui';
import { limitacionesConocidas } from '../features/changelog/changelog';
import type { User } from '../models/user';
import { EditProfileModal } from '../features/profile/EditProfileModal';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/auth.store';

// Vive en app/ y no en components/ui/ porque lee el store de auth.
// Dos barras y no una que se reacomoda: con flex-wrap la navegacion ocupaba 2-3 lineas en un
// telefono. Abajo de md, hamburguesa + drawer; de md para arriba, la fila horizontal.

const linkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? 'font-semibold text-red-600 underline underline-offset-4'
    : 'font-semibold text-slate-600 hover:text-slate-900 dark:text-ink-muted dark:hover:text-ink-text hover:underline';

// En una fila de ancho completo un subrayado no se lee como activo: borde izquierdo + fondo.
const drawerLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-r-md py-3 pl-4 pr-3 font-semibold ${
    isActive
      ? 'border-l-4 border-red-600 bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
      : 'border-l-4 border-transparent text-slate-600 hover:bg-slate-50 dark:text-ink-muted dark:hover:bg-ink-surface'
  }`;

const menuLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block px-4 py-2 text-sm font-semibold ${
    isActive
      ? 'text-red-600'
      : 'text-slate-700 hover:bg-slate-50 dark:text-ink-text dark:hover:bg-ink-border'
  }`;

// Son una capacidad del rol ADMIN, no navegacion de catalogo: van agrupadas bajo "Carga",
// adentro del menu de cuenta en escritorio y en su propia seccion del drawer en movil.
const ADMIN_LINKS = [
  { to: '/admin/results', label: 'Resultados' },
  { to: '/admin/seasons', label: 'Temporadas' },
  { to: '/admin/circuits', label: 'Circuitos' },
  { to: '/admin/races', label: 'Carreras' },
];

function AdminLinksGroup({
  className,
  labelClassName,
  onNavigate,
  asMenuItems = false,
}: {
  className: (props: { isActive: boolean }) => string;
  labelClassName: string;
  onNavigate: () => void;
  // Adentro de UserMenu (role="menu") cada link necesita role="menuitem"; el drawer es un <nav>.
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

// logo.svg tiene el trazo negro fijo en el archivo, invisible sobre fondo oscuro. Alcanza con
// CSS para elegir cual se ve: el modo oscuro sigue al sistema operativo, no a un estado de React.
function Logo({ className }: { className: string }) {
  return (
    <>
      <img src="/logo.svg" alt="boxbox" className={`${className} dark:hidden`} />
      <img src="/logo-dark.svg" alt="boxbox" className={`hidden ${className} dark:block`} />
    </>
  );
}

// No usa Badge: ese es uppercase y un rotulo de etapa va en sentence case ("Beta", no "BETA").
// Va como hermano del <Link> del logo, nunca adentro: el popover es un <button>, y un boton
// dentro de un <a> es HTML invalido. "Beta" es del producto, no del contrato HTTP, que versiona semver.
function BetaMark() {
  return (
    <>
      <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold tracking-wide text-blue-800 dark:bg-blue-950 dark:text-blue-200">
        Beta
      </span>
      {/* La lista de lo que falta sale de CHANGELOG.md, no de aca, para que no se desincronice. */}
      <HelpPopover title="¿Qué significa que esté en beta?">
        <p className="mb-3">
          BoxBox anda, pero todavía le faltan cosas. Si encontramos un error en el cálculo de
          puntos y lo corregimos, las posiciones de tu liga se pueden mover.
        </p>
        <p className="mb-2 font-semibold">Hoy falta:</p>
        <ul className="mb-3 list-disc space-y-1 pl-5">
          {limitacionesConocidas().map((limitacion) => (
            <li key={limitacion}>{limitacion}</li>
          ))}
        </ul>
        <Link
          to="/novedades"
          className="font-semibold text-red-600 hover:underline dark:text-red-400"
        >
          Ver todas las novedades
        </Link>
      </HelpPopover>
    </>
  );
}

// El listener de click afuera va en document y chequea el contenedor: un click ADENTRO del menu
// no debe cerrarlo antes de que el item corra su onClick. No bloquea el scroll: no tapa la pantalla.
function UserMenu({
  user,
  onLogout,
  onEditProfile,
}: {
  user: User;
  onLogout: () => void;
  onEditProfile: () => void;
}) {
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
          // No "Cuenta": seria subcadena del nombre del gatillo ("Cuenta de <nombre>").
          aria-label="Opciones de la cuenta"
          className="absolute right-0 top-full z-20 mt-2 w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-slate-200 dark:bg-ink-surface dark:ring-ink-border"
        >
          <div className="flex items-center justify-between gap-1 border-b border-slate-200 py-2 pl-4 pr-1 dark:border-ink-border">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-ink-text">
              {user.name}
            </p>
            <button
              type="button"
              aria-label="Editar perfil"
              onClick={() => {
                close();
                onEditProfile();
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <PencilIcon />
            </button>
          </div>
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
  const [editingProfile, setEditingProfile] = useState(false);

  async function logout() {
    await authService.logout();
    navigate('/login');
  }

  // El foco vuelve solo a la hamburguesa: Modal cierra el <dialog> con close().
  function closeDrawer() {
    setDrawerOpen(false);
  }

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
      {/* Skip link: sin el, quien navega con teclado recorre toda la barra en cada pantalla. */}
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-red-600 focus:shadow-md focus:ring-1 focus:ring-slate-300 dark:focus:bg-ink-surface dark:focus:ring-ink-border"
      >
        Saltar al contenido
      </a>

      <nav aria-label="Principal" className="border-b border-slate-200 bg-white dark:border-ink-border dark:bg-ink">
        {/* La hamburguesa va a la izquierda porque el drawer entra por ese lado. */}
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 md:hidden">
          <button
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
          <div className="flex items-center gap-2">
            <Link to="/leagues">
              <Logo className="h-7 w-auto" />
            </Link>
            <BetaMark />
          </div>
        </div>

        {/* Mismo contenedor que PageShell, para alinear la barra con el contenido. */}
        <div className="mx-auto hidden w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm md:flex md:px-6">
          <div className="mr-auto flex items-center gap-2">
            <Link to="/leagues">
              <Logo className="h-7 w-auto" />
            </Link>
            <BetaMark />
          </div>

          {renderNavLinks(linkClass)}

          {user ? (
            <UserMenu user={user} onLogout={logout} onEditProfile={() => setEditingProfile(true)} />
          ) : (
            // /drivers y /standings son publicas, asi que la barra tambien se ve sin sesion.
            <Link to="/login" className="font-semibold text-red-600 hover:underline">
              Ingresar
            </Link>
          )}
        </div>
      </nav>
      <div aria-hidden="true" className="checkered h-2" />

      {drawerOpen && (
        <Modal
          id="menu-mobile"
          label="Menú de navegación"
          onClose={closeDrawer}
          className="enter-left m-0 flex h-full max-h-none w-72 max-w-[85vw] flex-col bg-white shadow-xl backdrop:bg-slate-900/50 dark:bg-ink md:hidden"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-4 dark:border-ink-border">
            {user ? (
              <div className="flex min-w-0 items-center gap-1">
                <div className="flex min-w-0 items-center gap-2.5">
                  <UserAvatar user={user} />
                  <span className="truncate font-semibold text-slate-900 dark:text-ink-text">
                    {user.name}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Editar perfil"
                  onClick={() => {
                    closeDrawer();
                    setEditingProfile(true);
                  }}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <PencilIcon />
                </button>
              </div>
            ) : (
              <span className="font-semibold text-slate-900 dark:text-ink-text">Menú</span>
            )}
            <button
              data-autofocus
              type="button"
              aria-label="Cerrar menú"
              onClick={closeDrawer}
              className="flex h-11 w-11 shrink-0 items-center justify-center text-2xl leading-none text-slate-400 hover:text-slate-600 dark:text-ink-muted dark:hover:text-ink-text"
            >
              ×
            </button>
          </div>

          {/* Ni "Principal" (ya lo usa el nav de arriba) ni "Menú" (el dialog): dos landmarks
              con el mismo nombre confunden la navegacion por regiones de un lector de pantalla. */}
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
        </Modal>
      )}

      {editingProfile && user && (
        <EditProfileModal user={user} onClose={() => setEditingProfile(false)} />
      )}

      <Outlet />
    </>
  );
}
