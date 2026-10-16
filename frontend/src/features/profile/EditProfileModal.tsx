import { useEffect, useRef, useState } from 'react';
import { Field, HelpPopover, UserAvatar, inputClass } from '../../components/ui';
import type { User } from '../../models/user';
import { useRemoveAvatar, useUpdateAvatar, useUpdateProfile } from './profile.queries';

const MOTTO_MAX = 40;
// Mismo tope que el bucket de Supabase (backend/src/modules/auth/auth.service.ts,
// MAX_AVATAR_BYTES) — fallar acá es instantáneo, fallar en el servidor tarda un viaje de red.
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// EditProfileModal: nombre + lema + foto, desde el lápiz de UserMenu (AppLayout.tsx). Pedido
// del usuario 2026-10-15, bocetado antes de escribir una sola línea de código real.
//
// Dos formas, no una que se adapta — mismo patrón que HelpPopover (components/ui/): en
// escritorio es un diálogo centrado (como RivalTeamModal), en mobile sube como una hoja desde
// abajo. A diferencia de HelpPopover, acá SÍ bloquea todo en los dos tamaños — es un form con
// guardado real, no un tooltip de ayuda que conviene dejar pasar el resto de la pantalla.
//
// La foto se previsualiza antes de guardar (FileReader → data URL en estado local) pero no se
// sube hasta tocar "Guardar" — si cancela, el archivo elegido nunca sale del navegador.
export function EditProfileModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [name, setName] = useState(user.name);
  const [motto, setMotto] = useState(user.motto ?? '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  // true = "al guardar, sacar la foto actual". Separado de avatarPreview === null porque eso
  // es ambiguo (¿no hay foto nueva, o hay que borrar la que ya estaba?) — ver el badge "x" en
  // avatarButton, mas abajo.
  const [removePhoto, setRemovePhoto] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Dos refs, no una: las dos formas (mobile/desktop) conviven siempre en el DOM, CSS decide
  // cuál se ve (igual que HelpPopover). Enfocar el input de escritorio cuando el que se ve es
  // el de mobile no hace nada (display:none no es enfocable) — mismo problema que HelpPopover
  // ya resolvió, misma solución: medir el ancho una vez al montar.
  const mobileFirstFieldRef = useRef<HTMLInputElement>(null);
  const desktopFirstFieldRef = useRef<HTMLInputElement>(null);

  const updateProfile = useUpdateProfile();
  const updateAvatar = useUpdateAvatar();
  const removeAvatar = useRemoveAvatar();
  const saving = updateProfile.isPending || updateAvatar.isPending || removeAvatar.isPending;
  const saveError = updateProfile.error ?? updateAvatar.error ?? removeAvatar.error;

  useEffect(() => {
    const esMobile = window.innerWidth < 768;
    (esMobile ? mobileFirstFieldRef : desktopFirstFieldRef).current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  function onPickFile(file: File | undefined) {
    setAvatarError(null);
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setAvatarError('Tiene que ser PNG, JPEG o WebP');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError('No puede pesar más de 2MB');
      return;
    }
    // Elegir un archivo nuevo cancela cualquier "sacar foto" pendiente — las dos cosas no
    // tienen sentido juntas, y la foto elegida gana.
    setRemovePhoto(false);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  // El badge "x" de avatarButton. No pega al servidor todavía — mismo criterio que elegir una
  // foto nueva: se confirma recien en "Guardar", y "Cancelar" lo deja todo como estaba.
  function onRemovePhoto() {
    setAvatarError(null);
    setAvatarPreview(null);
    setRemovePhoto(true);
  }

  async function onSave() {
    try {
      // Secuencial, no Promise.all: si la foto falla, no tiene sentido guardar nombre/lema
      // como si todo hubiera salido bien — el usuario tiene que ver el mismo error sí o sí.
      if (avatarPreview) {
        await updateAvatar.mutateAsync(avatarPreview);
      } else if (removePhoto && user.avatarUrl) {
        await removeAvatar.mutateAsync();
      }
      if (name !== user.name || motto !== (user.motto ?? '')) {
        await updateProfile.mutateAsync({ name, motto });
      }
      onClose();
    } catch {
      // El error ya quedó en updateProfile.error / updateAvatar.error / removeAvatar.error —
      // se muestra abajo, el modal se queda abierto para reintentar.
    }
  }

  // Hay algo para sacar si hay una foto nueva sin guardar, o si el user ya tenia una y todavia
  // no la marcamos para sacar. Sin foto (iniciales) no hay nada que mostrar el badge.
  const hasPhotoToRemove = Boolean(avatarPreview) || (Boolean(user.avatarUrl) && !removePhoto);

  const avatarButton = (
    // Wrapper relative: el boton de cambiar y el badge "x" de sacar son dos elementos
    // interactivos hermanos (no se puede anidar un boton dentro de otro), cada uno con su
    // propia area de click, posicionados contra este contenedor.
    <div className="relative shrink-0" style={{ width: 88, height: 88 }}>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        aria-label="Cambiar foto de perfil"
        className="group relative h-full w-full cursor-pointer overflow-hidden rounded-full"
      >
        {avatarPreview ? (
          <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
        ) : (
          <UserAvatar user={removePhoto ? { ...user, avatarUrl: null } : user} size={88} />
        )}
        {/* Solo ícono, sin texto "Cambiar" — pedido del usuario 2026-10-15. */}
        <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </span>
      </button>
      {/* Badge siempre visible, no atado a hover (a diferencia de la camara de arriba) — en
          mobile no hay hover, y esto tiene que poder tocarse ahí tambien. Wireframeado y
          aprobado por el usuario 2026-10-16 antes de escribir esto. */}
      {hasPhotoToRemove && (
        <button
          type="button"
          onClick={onRemovePhoto}
          aria-label="Quitar foto de perfil"
          className="absolute -bottom-1 -right-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-red-600 shadow-md ring-2 ring-white hover:bg-red-50 dark:bg-ink dark:ring-ink"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );

  const hiddenFileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept={ACCEPTED_TYPES.join(',')}
      className="hidden"
      onChange={(e) => onPickFile(e.target.files?.[0])}
    />
  );

  const mottoLabel = (
    <span className="flex items-center">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-ink-muted">
        Lema
      </span>
      <HelpPopover title="¿Qué es el lema?">
        Una frase corta que otros van a ver cuando miren tu equipo desde &ldquo;Ver equipo del
        rival&rdquo; en una liga.
      </HelpPopover>
    </span>
  );

  const errorText = saveError && (
    <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
      {saveError.message}
    </p>
  );

  const actions = (
    <>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'Guardar'}
      </button>
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        className="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-ink-surface dark:text-ink-text dark:ring-ink-border dark:hover:bg-ink-border"
      >
        Cancelar
      </button>
    </>
  );

  return (
    <>
      {hiddenFileInput}

      {/* Scrim: bloquea los dos tamaños, a diferencia de HelpPopover — este modal sí reemplaza
          la pantalla entera, hay un guardado real detrás. */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="enter-fade fixed inset-0 z-40 bg-slate-900/55"
      />

      {/* Mobile: hoja que sube desde abajo, mismo patrón que HelpPopover/el drawer de nav. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Editar perfil"
        className="enter-sheet fixed inset-x-0 bottom-0 z-40 rounded-t-2xl bg-white p-5 md:hidden dark:bg-ink"
      >
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-ink-text">Editar perfil</h2>
        <div className="mb-5 flex justify-center">{avatarButton}</div>
        {avatarError && <p className="mb-3 text-center text-sm text-red-600 dark:text-red-400">{avatarError}</p>}
        <div className="flex flex-col gap-4">
          <Field label="Nombre">
            <input
              ref={mobileFirstFieldRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              maxLength={100}
            />
          </Field>
          <div>
            <div className="mb-1 flex items-center justify-between">
              {mottoLabel}
              <span className="text-xs text-slate-400 dark:text-ink-muted">
                {motto.length}/{MOTTO_MAX}
              </span>
            </div>
            <input
              value={motto}
              onChange={(e) => setMotto(e.target.value.slice(0, MOTTO_MAX))}
              maxLength={MOTTO_MAX}
              className={inputClass}
            />
          </div>
        </div>
        {errorText}
        <div className="mt-6 flex flex-col gap-2">{actions}</div>
      </div>

      {/* Desktop: diálogo centrado, mismo patrón que RivalTeamModal. */}
      <div className="fixed inset-0 z-40 hidden items-center justify-center p-4 md:flex">
        <div className="enter-scale w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-ink">
          <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-ink-text">Editar perfil</h2>
          <div className="flex items-start gap-5">
            {avatarButton}
            <div className="flex flex-1 flex-col gap-4">
              <Field label="Nombre">
                <input
                  ref={desktopFirstFieldRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  maxLength={100}
                />
              </Field>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  {mottoLabel}
                  <span className="text-xs text-slate-400 dark:text-ink-muted">
                    {motto.length}/{MOTTO_MAX}
                  </span>
                </div>
                <input
                  value={motto}
                  onChange={(e) => setMotto(e.target.value.slice(0, MOTTO_MAX))}
                  maxLength={MOTTO_MAX}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
          {avatarError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{avatarError}</p>}
          {errorText}
          <div className="mt-6 flex justify-end gap-2">{actions}</div>
        </div>
      </div>
    </>
  );
}
