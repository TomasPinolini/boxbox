import { render, screen } from '@testing-library/react';
import { Alert } from './Alert';
import { errorMessageFor } from './error-messages';

describe('errorMessageFor', () => {
  it('traduce codigos conocidos a espanol', () => {
    expect(errorMessageFor('INVITE_CODE_NOT_FOUND', 'x')).toBe('Ese código no existe');
    expect(errorMessageFor('ROSTER_LOCKED', 'x')).toBe(
      'El draft ya empezó: no se puede cambiar el roster',
    );
  });

  it('para un codigo desconocido usa el mensaje del backend', () => {
    expect(errorMessageFor('SOMETHING_NEW', 'Backend says hi')).toBe('Backend says hi');
  });
});

describe('Alert', () => {
  it('renderiza el mensaje traducido con role=alert', () => {
    render(<Alert code="LEAGUE_FULL" message="League is at capacity" />);
    expect(screen.getByRole('alert')).toHaveTextContent('La liga está llena');
  });
});
