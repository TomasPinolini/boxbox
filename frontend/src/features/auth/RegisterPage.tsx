import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Alert, Button } from '../../components/ui';
import { ApiError, toApiError } from '../../services/api-error';
import { authService } from '../../services/auth.service';
import { AboutBoxBox } from './AboutBoxBox';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('No parece un email'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});
type RegisterForm = z.infer<typeof schema>;

// Mismo input "de vidrio" que LoginPage — ver el comentario ahi sobre por que vive local y
// no en components/ui/.
const glassInputClass =
  'w-full rounded-t-md border-0 border-b border-white/35 bg-white/10 px-3 py-2.5 text-white placeholder:text-white/40 focus:border-red-500 focus:bg-white/15 focus:outline-none';

export function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<ApiError | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(schema) });

  async function onSubmit(values: RegisterForm) {
    setError(null);
    try {
      await authService.register(values.email, values.password, values.name);
      // El flag viaja en el state de la ruta y lo levanta LeaguesPage. NO se puede mostrar el
      // tour acá encima del registro: register() deja el token en el store, GuestOnly ve sesión
      // y hace <Navigate to="/leagues"> en el mismo tick, así que esta pantalla se desmonta
      // antes de que nada pinte. Lo encontró el e2e; los unit tests no montan el router.
      void navigate('/leagues', { state: { tour: true } });
    } catch (err) {
      setError(toApiError(err));
    }
  }

  return (
    // Mismo layout que LoginPage, pixel por pixel (foto de fondo, logo, tagline, form sin
    // card, "¿Qué es BoxBox?"): son las dos únicas pantallas sin barra de navegación, y antes
    // de este cambio solo el login tenía marca — registro era la única tarjeta blanca suelta
    // sobre gris de toda la app. Por el mismo motivo que LoginPage, no lleva clases dark: —
    // es su propia pantalla con foto de fondo, siempre igual sin importar el tema de la app.
    <div className="relative min-h-dvh overflow-hidden">
      <img
        src="/login-hero-mobile.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-105 object-cover blur-[2px] md:hidden"
      />
      <img
        src="/login-hero-desktop.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 hidden h-full w-full scale-105 object-cover blur-[2px] md:block"
      />
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />

      <div className="relative z-10 flex min-h-dvh flex-col items-center text-center md:items-stretch md:text-left">
        <div className="px-6 pt-14 md:px-16 md:pt-28">
          <img
            src="/logo-oscuro.svg"
            alt="boxbox"
            className="mx-auto h-10 w-auto md:mx-0 md:h-14"
          />
          <p className="mt-3.5 text-sm font-medium text-white/80 md:mt-4 md:text-base">
            Fantasy League de F1
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 md:justify-end md:px-24">
          <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm text-left">
            <h1 className="mb-6 text-2xl font-bold text-white">Crear cuenta</h1>
            <div className="flex flex-col gap-5">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-white/70">Nombre</span>
                <input
                  type="text"
                  autoComplete="name"
                  className={glassInputClass}
                  {...register('name')}
                />
                {errors.name && (
                  <span className="mt-1.5 block text-sm text-red-400">
                    {errors.name.message}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-white/70">Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  className={glassInputClass}
                  {...register('email')}
                />
                {errors.email && (
                  <span className="mt-1.5 block text-sm text-red-400">
                    {errors.email.message}
                  </span>
                )}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-white/70">
                  Contraseña
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  className={glassInputClass}
                  {...register('password')}
                />
                {errors.password && (
                  <span className="mt-1.5 block text-sm text-red-400">
                    {errors.password.message}
                  </span>
                )}
              </label>
              {error && <Alert code={error.code} message={error.message} />}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creando…' : 'Crear cuenta'}
              </Button>
            </div>
            {/* El aviso va ACA y no en un banner arriba: banner blindness (NN/g, eyetracking
                longitudinal) muestra que se ignora todo lo que ocupa la posicion de un banner,
                incluso cuando no es publicidad. Esta es la unica pantalla sin AppLayout —o sea
                sin el rotulo "Beta"— y ademas es el primer contacto de alguien invitado: el
                aviso vive donde esta por invertir trabajo, que es el boton de arriba. */}
            <p className="mt-4 text-sm text-white/70">
              BoxBox está en beta: todavía le faltan cosas y, si corregimos un error de cálculo,
              los puntos de tu liga se pueden mover.{' '}
              <Link to="/novedades" className="font-semibold text-white hover:underline">
                Mirá qué falta
              </Link>
              .
            </p>
            <p className="mt-5 text-sm text-white/70">
              ¿Ya tenés cuenta?{' '}
              <Link to="/login" className="font-semibold text-white hover:underline">
                Entrá
              </Link>
            </p>
          </form>
        </div>

        <div className="px-6 pb-10 md:px-16 md:pb-14">
          <AboutBoxBox />
        </div>
      </div>
    </div>
  );
}
