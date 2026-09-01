import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Alert, Button, Card, Field, inputClass } from '../../components/ui';
import { ApiError, toApiError } from '../../services/api-error';
import { authService } from '../../services/auth.service';

// Mismas reglas que loginSchema del backend: email valido, password >= 8.
const schema = z.object({
  email: z.string().email('No parece un email'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});
type LoginForm = z.infer<typeof schema>;

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
    <div className="mx-auto mt-10 w-full max-w-sm px-4">
      <Card>
        <h1 className="mb-4 text-2xl font-bold">Entrar a BoxBox</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="Email" error={errors.email?.message}>
            <input
              type="email"
              autoComplete="email"
              className={inputClass}
              {...register('email')}
            />
          </Field>
          <Field label="Contraseña" error={errors.password?.message}>
            <input
              type="password"
              autoComplete="current-password"
              className={inputClass}
              {...register('password')}
            />
          </Field>
          {error && <Alert code={error.code} message={error.message} />}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          ¿No tenés cuenta?{' '}
          <Link to="/register" className="font-semibold text-red-600">
            Registrate
          </Link>
        </p>
      </Card>
    </div>
  );
}
