import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Alert, Button } from '../../components/ui';
import { ApiError, toApiError } from '../../services/api-error';
import { authService } from '../../services/auth.service';

// Mismas reglas que loginSchema del backend: email valido, password >= 8.
const schema = z.object({
  email: z.string().email('No parece un email'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});
type LoginForm = z.infer<typeof schema>;

// Input "de vidrio": sin recuadro propio, solo una linea inferior sobre la foto. Field/
// inputClass (components/ui) asumen fondo claro — son para el resto de la app. Esta pantalla
// es la unica con foto de fondo oscura, asi que el estilo vive local en vez de ramificar un
// primitivo compartido para un solo consumidor.
const glassInputClass =
  'w-full rounded-t-md border-0 border-b border-white/35 bg-white/10 px-3 py-2.5 text-white placeholder:text-white/40 focus:border-red-500 focus:bg-white/15 focus:outline-none';

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<ApiError | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(schema) });

  async function onSubmit(values: LoginForm) {
    setError(null);
    try {
      await authService.login(values.email, values.password);
      navigate('/leagues');
    } catch (err) {
      setError(toApiError(err));
    }
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* Dos fotos, una por ancho — mobile hasta md, PC de md en adelante (el tablet propio
          todavia no existe; hasta tenerlo, hereda la de PC, que no se rompe en esos anchos).
          scale-105 + blur: el blur de una imagen tambien difumina su propio borde, y afuera de
          ese borde no hay pixel que lo tape — agrandarla un poco empuja ese filo fuera de la
          pantalla. */}
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
      {/* Oscurecido + degrade: asegura el contraste de logo/texto/inputs pase lo que pase en
          esa zona de la foto — es lo que la vuelve "aporta sin molestar" en vez de una
          decoracion que compite con el formulario que flota directo encima, sin card. */}
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
            <h1 className="mb-6 text-2xl font-bold text-white">Entrar a BoxBox</h1>
            <div className="flex flex-col gap-5">
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
                  autoComplete="current-password"
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
                {isSubmitting ? 'Entrando…' : 'Entrar'}
              </Button>
            </div>
            <p className="mt-5 text-sm text-white/70">
              ¿No tenés cuenta?{' '}
              <Link to="/register" className="font-semibold text-white hover:underline">
                Registrate
              </Link>
            </p>
            {/* El catalogo de pilotos es publico: se puede mirar sin cuenta. */}
            <p className="mt-2 text-sm text-white/70">
              O mirá{' '}
              <Link to="/drivers" className="font-semibold text-white hover:underline">
                los pilotos de la temporada
              </Link>
            </p>
          </form>
        </div>

        <div className="px-6 pb-10 md:px-16 md:pb-14">
          {/* Sin destino todavia: no hay pantalla de "conoce mas". href="#" + preventDefault
              para no mandar a nadie al tope de la pagina por error hasta que la haya. */}
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="text-sm font-semibold text-white hover:underline"
          >
            Conocé más →
          </a>
        </div>
      </div>
    </div>
  );
}
