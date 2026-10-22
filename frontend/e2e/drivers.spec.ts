import { expect, test } from '@playwright/test';

// Contra el backend real con el seed cargado. Rutas publicas: ningun test de aca hace login.

test('pilotos: filtrar por escuderia y abrir el detalle', async ({ page }) => {
  await page.goto('/drivers');

  await expect(page.getByRole('heading', { name: 'Pilotos' })).toBeVisible();
  // Apellido solo: DriverCard parte nombre y apellido en dos lineas, y unir texto entre
  // bloques es un comportamiento de Playwright del que no conviene depender.
  await expect(page.getByText('Verstappen')).toBeVisible();
  await expect(page.getByText('Leclerc')).toBeVisible();

  await page.getByLabel('Escudería').selectOption({ label: 'Ferrari' });

  // El filtro vive en la URL, no en el estado del componente.
  await expect(page).toHaveURL(/\?constructorId=\d+$/);
  await expect(page.getByText('Leclerc')).toBeVisible();
  await expect(page.getByText('Hamilton')).toBeVisible();
  await expect(page.getByText('Verstappen')).not.toBeVisible();

  // Por nombre y no por posicion: ordenados por apellido, el primero de Ferrari es Hamilton.
  await page.getByRole('button', { name: 'Ver piloto Charles Leclerc' }).click();

  await expect(page).toHaveURL(/\/drivers\/\d+$/);
  await expect(page.getByRole('heading', { name: /Leclerc/ })).toBeVisible();

  // "Puntos" aparece dos veces, asi que se apunta al <dt>/<dd>. Se asserta la estructura y no
  // un valor: los resultados cambian con cada sync.
  const puntos = page.getByRole('term').filter({ hasText: 'Puntos' });
  await expect(puntos).toBeVisible();
  await expect(puntos.locator('+ dd')).toHaveText(/^\d+$/);
});

// Par de "sin sesion, /leagues redirige a /login": estas rutas quedan fuera de RequireAuth.
test('sin sesion, /drivers NO redirige a /login', async ({ page }) => {
  await page.goto('/drivers');
  await expect(page).toHaveURL(/\/drivers$/);
});
