import { expect, test } from '@playwright/test';

// Flujo completo contra el backend real (seed cargado): registro -> crear liga -> verla ->
// abrir el detalle -> soy owner. Email unico por corrida para no chocar con la DB.
test('registrarse, crear una liga y verla como owner', async ({ page }) => {
  const stamp = Date.now();
  const code = `e2e-${stamp}`.slice(0, 20);

  await page.goto('/register');
  await page.getByLabel('Nombre').fill('E2E Tester');
  await page.getByLabel('Email').fill(`e2e-${stamp}@boxbox.test`);
  await page.getByLabel('Contraseña').fill('hunter22test');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page).toHaveURL(/\/leagues$/);
  await expect(page.getByRole('heading', { name: 'Mis ligas' })).toBeVisible();

  await page.getByLabel('Nombre').fill('Liga E2E');
  await page.getByLabel('Código de invitación').fill(code);
  await page.getByRole('button', { name: 'Crear', exact: true }).click();

  await expect(page).toHaveURL(/\/leagues\/\d+$/);
  await expect(page.getByRole('heading', { name: 'Liga E2E' })).toBeVisible();
  await expect(page.getByText('E2E Tester')).toBeVisible();
  await expect(page.getByText('owner')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Iniciar draft' })).toBeEnabled();
});

test('sin sesion, /leagues redirige a /login', async ({ page }) => {
  await page.goto('/leagues');
  await expect(page).toHaveURL(/\/login$/);
});
