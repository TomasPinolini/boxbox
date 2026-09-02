import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Alert, Button, Card, Field, inputClass } from '../../components/ui';
import { ApiError, toApiError } from '../../services/api-error';
import { authService } from '../../services/auth.service';

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
      navigate('/leagues');
    } catch (err) {
      setError(toApiError(err));
    }
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-sm px-4">
      <Card>
        <h1 className="mb-4 text-2xl font-bold">Crear cuenta</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field label="Nombre" error={errors.name?.message}>
            <input type="text" autoComplete="name" className={inputClass} {...register('name')} />
          </Field>
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
              autoComplete="new-password"
              className={inputClass}
              {...register('password')}
            />
          </Field>
          {error && <Alert code={error.code} message={error.message} />}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creando…' : 'Crear cuenta'}
          </Button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="font-semibold text-red-600">
            Entrá
          </Link>
        </p>
      </Card>
    </div>
  );
}
