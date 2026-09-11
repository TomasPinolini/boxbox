import { expect, test } from '@playwright/test';

// Contra el backend real con el seed cargado (3 fechas COMPLETED — ver prisma/seed.ts).
// Si estas pantallas dan vacio, corre `npx prisma db seed` en backend/.
//
// Estas rutas son publicas a proposito: ningun test de acá hace login.

test('pilotos: filtrar por escuderia y abrir el detalle', async ({ page }) => {
  await page.goto('/drivers');

  await expect(page.getByRole('heading', { name: 'Pilotos' })).toBeVisible();
  await expect(page.getByText('Max Verstappen')).toBeVisible();
  await expect(page.getByText('Charles Leclerc')).toBeVisible();

  await page.getByLabel('Escudería').selectOption({ label: 'Ferrari' });

  // El filtro vive en la URL, no en el estado del componente.
  await expect(page).toHaveURL(/\?constructorId=\d+$/);
  await expect(page.getByText('Charles Leclerc')).toBeVisible();
  await expect(page.getByText('Lewis Hamilton')).toBeVisible();
  await expect(page.getByText('Max Verstappen')).not.toBeVisible();

  // Ferrari tiene dos pilotos y se ordenan por apellido, asi que el primero es Hamilton.
  // Se clickea el de Leclerc por nombre en vez de por posicion.
  await page.getByRole('button', { name: 'Ver piloto Charles Leclerc' }).click();

  await expect(page).toHaveURL(/\/drivers\/\d+$/);
  await expect(page.getByRole('heading', { name: /Leclerc/ })).toBeVisible();

  // "Puntos" aparece dos veces en la pantalla (etiqueta de la estadistica y encabezado de la
  // tabla), asi que se apunta al <dt>/<dd> por su rol. El 52 sale del seed: 3ro en Bahrain (15),
  // 4to en Jeddah (12) y 1ro en Albert Park (25).
  const puntos = page.getByRole('term').filter({ hasText: 'Puntos' });
  await expect(puntos).toBeVisible();
  await expect(puntos.locator('+ dd')).toHaveText('52');

  await expect(page.getByText('Bahrain Grand Prix')).toBeVisible();
});

// El par simetrico de "sin sesion, /leagues redirige a /login" en leagues.spec.ts: prueba que
// estas rutas quedaron deliberadamente fuera de RequireAuth.
test('sin sesion, /drivers NO redirige a /login', async ({ page }) => {
  await page.goto('/drivers');
  await expect(page).toHaveURL(/\/drivers$/);
});
