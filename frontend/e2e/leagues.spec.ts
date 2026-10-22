import { expect, test } from '@playwright/test';

// Contra el backend real (seed cargado). Email unico por corrida para no chocar con la DB.
test('registrarse, crear una liga y verla como owner', async ({ page }) => {
  const stamp = Date.now();
  const code = `e2e-${stamp}`.slice(0, 20);

  await page.goto('/register');
  await page.getByLabel('Nombre').fill('E2E Tester');
  await page.getByLabel('Email').fill(`e2e-${stamp}@boxbox.test`);
  await page.getByLabel('Contraseña').fill('hunter22test');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page).toHaveURL(/\/leagues$/);
  // El tour de bienvenida se abre al registrarse y su scrim tapa el formulario.
  await expect(page.getByRole('dialog', { name: 'Bienvenido a BoxBox' })).toBeVisible();
  await page.getByRole('button', { name: 'Saltear' }).click();

  await expect(page.getByRole('heading', { name: 'Mis ligas' })).toBeVisible();

  await page.getByLabel('Nombre').fill('Liga E2E');
  // exact: el "?" de al lado tiene aria-label "¿Que es el codigo de invitacion?", y getByLabel
  // matchea por subcadena sin distinguir mayusculas.
  await page.getByLabel('Código de invitación', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Crear', exact: true }).click();

  await expect(page).toHaveURL(/\/leagues\/\d+$/);
  await expect(page.getByRole('heading', { name: 'Liga E2E' })).toBeVisible();
  // Acotado al <main>: la barra tambien muestra el nombre y getByText rompe por strict mode.
  const contenido = page.getByRole('main');
  await expect(contenido.getByText('E2E Tester')).toBeVisible();
  await expect(contenido.getByText('owner')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Iniciar draft' })).toBeEnabled();
});

test('sin sesion, /leagues redirige a /login', async ({ page }) => {
  await page.goto('/leagues');
  await expect(page).toHaveURL(/\/login$/);
});
