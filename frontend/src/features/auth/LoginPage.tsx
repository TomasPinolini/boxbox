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

// Mismas reglas que loginSchema del backend.
const schema = z.object({
  email: z.string().email('No parece un email'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});
type LoginForm = z.infer<typeof schema>;

// Local y no en components/ui: inputClass asume fondo claro, y esta es la unica pantalla sobre

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
    <AuthLayout>
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm text-left">
        <h1 className="mb-6 text-2xl font-bold text-white">Entrar a BoxBox</h1>
        <div className="flex flex-col gap-5">
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
            autoComplete="current-password"
            registration={register('password')}
            error={errors.password?.message}
          />
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
        <p className="mt-2 text-sm text-white/70">
          O{' '}
          <Link to="/drivers" className="font-semibold text-white hover:underline">
            mirá los pilotos de la temporada
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
