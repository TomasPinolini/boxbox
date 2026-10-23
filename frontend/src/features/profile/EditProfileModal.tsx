import { useRef, useState } from 'react';
import { Field, HelpPopover, Modal, UserAvatar, inputClass } from '../../components/ui';
import type { User } from '../../models/user';
import { useRemoveAvatar, useUpdateAvatar, useUpdateProfile } from './profile.queries';

const MOTTO_MAX = 40;
// Mismo tope que MAX_AVATAR_BYTES en backend/src/modules/auth/auth.service.ts: se valida
// aca para no gastar un viaje de red.
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// La foto se previsualiza en local y no se sube hasta "Guardar": si cancela, el archivo
// nunca sale del navegador.
export function EditProfileModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [name, setName] = useState(user.name);
  const [motto, setMotto] = useState(user.motto ?? '');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  // Aparte de avatarPreview === null, que es ambiguo: ¿no hay foto nueva o hay que borrar la actual?
  const [removePhoto, setRemovePhoto] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateProfile = useUpdateProfile();
  const updateAvatar = useUpdateAvatar();
  const removeAvatar = useRemoveAvatar();
  const saving = updateProfile.isPending || updateAvatar.isPending || removeAvatar.isPending;
  const saveError = updateProfile.error ?? updateAvatar.error ?? removeAvatar.error;

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
    setRemovePhoto(false);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function onRemovePhoto() {
    setAvatarError(null);
    setAvatarPreview(null);
    setRemovePhoto(true);
  }

  async function onSave() {
    try {
      // Secuencial, no Promise.all: si la foto falla, no se guarda el resto como si nada.
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
      // El error queda en la mutacion y se muestra abajo; el modal sigue abierto.
    }
  }

  const hasPhotoToRemove = Boolean(avatarPreview) || (Boolean(user.avatarUrl) && !removePhoto);

  return (
    <Modal
      label="Editar perfil"
      onClose={onClose}
      className="enter-sheet mx-0 mb-0 mt-auto w-full max-w-none rounded-t-2xl bg-white backdrop:bg-slate-900/55 md:m-auto md:w-[calc(100%-2rem)] md:max-w-md md:rounded-xl md:shadow-2xl dark:bg-ink"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={(e) => onPickFile(e.target.files?.[0])}
      />
      <div className="p-5 md:p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-ink-text">Editar perfil</h2>
        {/* En mobile la foto va arriba y centrada; desde md, a la izquierda de los campos. */}
        <div className="flex flex-col items-center gap-5 md:flex-row md:items-start">
          {/* Dos botones hermanos y no anidados: un <button> no puede ir dentro de otro. */}
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
              <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </span>
            </button>
            {/* Siempre visible, no en hover: en mobile no hay hover. */}
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
          <div className="flex w-full flex-1 flex-col gap-4">
            <Field label="Nombre">
              <input
                data-autofocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                maxLength={100}
              />
            </Field>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-ink-muted">
                    Lema
                  </span>
                  <HelpPopover title="¿Qué es el lema?">
                    Una frase corta que otros van a ver cuando miren tu equipo desde &ldquo;Ver
                    equipo del rival&rdquo; en una liga.
                  </HelpPopover>
                </span>
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
        {avatarError && (
          <p className="mt-3 text-center text-sm text-red-600 md:text-left dark:text-red-400">
            {avatarError}
          </p>
        )}
        {saveError && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {saveError.message}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2 md:flex-row md:justify-end">
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
        </div>
      </div>
    </Modal>
  );
}
