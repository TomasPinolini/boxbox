import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Alert, Button } from '../../components/ui';
import { ApiError, toApiError } from '../../services/api-error';
import { authService } from '../../services/auth.service';
import { AuthLayout } from './AuthLayout';
import { GlassField } from './GlassField';

const schema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('No parece un email'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});
type RegisterForm = z.infer<typeof schema>;

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
      // El tour no puede abrirse acá: con el token en el store, GuestOnly redirige a /leagues en
      // el mismo tick y esta pantalla se desmonta. Por eso viaja como flag a LeaguesPage.
      void navigate('/leagues', { state: { tour: true } });
    } catch (err) {
      setError(toApiError(err));
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm text-left">
        <h1 className="mb-6 text-2xl font-bold text-white">Crear cuenta</h1>
        <div className="flex flex-col gap-5">
          <GlassField
            label="Nombre"
            type="text"
            autoComplete="name"
            registration={register('name')}
            error={errors.name?.message}
          />
          <GlassField
            label="Email"
            type="email"
            autoComplete="email"
            registration={register('email')}
            error={errors.email?.message}
          />
          <GlassField
            label="Contraseña"
            type="password"
            autoComplete="new-password"
            registration={register('password')}
            error={errors.password?.message}
          />
          {error && <Alert code={error.code} message={error.message} />}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando…' : 'Crear cuenta'}
          </Button>
        </div>
        {/* El aviso beta va junto al boton y no en un banner (banner blindness): esta
            pantalla no tiene AppLayout, asi que tampoco el rotulo "Beta". */}
        <p className="mt-4 text-sm text-white/70">
          BoxBox está en beta: todavía le faltan cosas y, si corregimos un error de cálculo, los
          puntos de tu liga se pueden mover.{' '}
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
    </AuthLayout>
  );
}
