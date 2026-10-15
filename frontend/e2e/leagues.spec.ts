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
  // Reción registrado, /leagues abre el tour de bienvenida encima de todo. Hay que cerrarlo
  // antes de seguir: el scrim tapa el formulario de crear liga.
  await expect(page.getByRole('dialog', { name: 'Bienvenido a BoxBox' })).toBeVisible();
  await page.getByRole('button', { name: 'Saltear' }).click();

  await expect(page.getByRole('heading', { name: 'Mis ligas' })).toBeVisible();

  await page.getByLabel('Nombre').fill('Liga E2E');
  // exact: true obligatorio desde que el titulo "Crear liga" tiene un "?" al lado cuyo
  // aria-label es "¿Que es el codigo de invitacion?". getByLabel matchea por SUBCADENA sin
  // distinguir mayusculas, asi que sin exact el locator resuelve al input Y al boton.
  await page.getByLabel('Código de invitación', { exact: true }).fill(code);
  await page.getByRole('button', { name: 'Crear', exact: true }).click();

  await expect(page).toHaveURL(/\/leagues\/\d+$/);
  await expect(page.getByRole('heading', { name: 'Liga E2E' })).toBeVisible();
  // Acotado al <main>: desde que AppLayout muestra el nombre del usuario en la barra, un
  // getByText suelto matchea dos veces y rompe por strict mode.
  const contenido = page.getByRole('main');
  await expect(contenido.getByText('E2E Tester')).toBeVisible();
  await expect(contenido.getByText('owner')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Iniciar draft' })).toBeEnabled();
});

test('sin sesion, /leagues redirige a /login', async ({ page }) => {
  await page.goto('/leagues');
  await expect(page).toHaveURL(/\/login$/);
});
