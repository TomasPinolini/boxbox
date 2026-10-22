import { expect, test, type Browser, type Page } from '@playwright/test';

// Unico spec con dos navegadores: en el draft lo que ve un jugador cambia por lo que hace otro.
// Cada test arma su propia liga: un draft no se resetea desde la UI, y compartirla ataria los tests al orden.

/**
 * Identificadores irrepetibles. La DB de desarrollo no se trunca entre corridas, y ademas
 * los tests corren en varios workers a la vez: solo con Date.now() dos workers pueden chocar
 * dentro del mismo milisegundo y el segundo se come un 409 por inviteCode duplicado.
 */
let n = 0;
const unico = (quien: string) =>
  `${quien}${process.env.TEST_PARALLEL_INDEX ?? 0}-${Date.now().toString(36)}-${n++}`;

async function registrar(page: Page, nombre: string) {
  const sufijo = unico(nombre.toLowerCase());
  await page.goto('/register');
  await page.getByLabel('Nombre').fill(nombre);
  await page.getByLabel('Email').fill(`${sufijo}@boxbox.test`);
  await page.getByLabel('Contraseña').fill('hunter22test');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page).toHaveURL(/\/leagues$/);
  // Al registrarse se abre el tour de bienvenida; se prueba en leagues.spec.ts.
  await page.getByRole('button', { name: 'Saltear' }).click();
}

async function ligaConDosJugadores(browser: Browser) {
  const ctxDuenio = await browser.newContext();
  const ctxSocio = await browser.newContext();
  const duenio = await ctxDuenio.newPage();
  const socio = await ctxSocio.newPage();

  await registrar(duenio, 'Duenio');
  await registrar(socio, 'Socio');

  const code = unico('e2e').slice(0, 20);
  await duenio.getByLabel('Nombre').fill('Liga Draft E2E');
  // exact: el "?" de ayuda junto a "Crear liga" tambien matchea por subcadena.
  await duenio.getByLabel('Código de invitación', { exact: true }).fill(code);
  await duenio.getByRole('button', { name: 'Crear', exact: true }).click();
  await expect(duenio).toHaveURL(/\/leagues\/\d+$/);
  const id = Number(/\/leagues\/(\d+)/.exec(duenio.url())![1]);

  // exact: getByLabel matchea por subcadena y "Código" agarraria varios campos.
  await socio.getByLabel('Código que te pasaron', { exact: true }).fill(code);
  await socio.getByRole('button', { name: 'Unirme', exact: true }).click();
  await socio.goto(`/leagues/${id}`);
  // Si el join fallo, el backend contesta 404 a proposito (anti-enumeracion) y el test
  // fallaria mas tarde por una razon que no tiene nada que ver. Mejor reventar aca.
  await expect(socio.getByRole('heading', { name: 'Liga Draft E2E' })).toBeVisible();

  return { duenio, socio, id, cerrar: () => Promise.all([ctxDuenio.close(), ctxSocio.close()]) };
}

/** El orden serpiente arranca de un orden base aleatorio: no se sabe a quien le toca. */
async function pickDelQueTengaElTurno(jugadores: Page[]) {
  let conTurno: Page | undefined;
  // El <select> es el fallback de telefono y en escritorio esta oculto: el turno se detecta
  // por la grilla de botones.
  const opciones = (p: Page) => p.getByRole('group').getByRole('button');
  await expect
    .poll(
      async () => {
        for (const p of jugadores) {
          if ((await opciones(p).count()) > 0) {
            conTurno = p;
            return true;
          }
        }
        return false;
      },
      { timeout: 15_000, message: 'ningun jugador tomo el turno' },
    )
    .toBe(true);

  // El pick viaja por socket: hay que esperar a que VUELVA. No sirve esperar a que el boton
  // desaparezca, porque en serpiente un jugador elige dos veces seguidas. La señal es la lista
  // de picks creciendo, salvo en el ultimo, donde da paso a los equipos armados.
  const picksHechos = conTurno!.locator('li').filter({ hasText: /^Ronda/ });
  const antes = await picksHechos.count();

  // El primero que no este deshabilitado: los ya elegidos quedan apagados, no desaparecen.
  await opciones(conTurno!).and(conTurno!.locator('button:not([disabled])')).first().click();
  await conTurno!.getByRole('button', { name: 'Confirmar pick' }).click();

  await expect
    .poll(
      async () => {
        if (await conTurno!.getByRole('heading', { name: 'Tu equipo' }).isVisible()) return true;
        return (await picksHechos.count()) > antes;
      },
      { timeout: 10_000, message: 'el pick no volvio por el socket' },
    )
    .toBe(true);
}

/** Dos clicks: la accion irreversible pide confirmacion. */
async function arrancarDraft(duenio: Page) {
  await duenio.getByRole('button', { name: 'Iniciar draft' }).click();
  await duenio.getByRole('button', { name: 'Sí, arrancar' }).click();
}

test('arrancar el draft lleva al dueño y al otro miembro a la pantalla del draft', async ({
  browser,
}) => {
  const { duenio, socio, id, cerrar } = await ligaConDosJugadores(browser);

  await arrancarDraft(duenio);

  // Al dueño lo lleva la invalidacion de su propia mutacion.
  await expect(duenio).toHaveURL(new RegExp(`/leagues/${id}/draft$`));

  // Al socio lo lleva el sondeo de useLeague, sin que toque nada. Hasta 5s de intervalo mas
  // el viaje, de ahi el margen.
  await expect(socio).toHaveURL(new RegExp(`/leagues/${id}/draft$`), { timeout: 15_000 });

  await cerrar();
});

test('con el draft en vivo, volver a la liga no rebota al draft', async ({ browser }) => {
  test.slow(); // hay que dejar pasar un ciclo entero de sondeo para probar una ausencia
  const { duenio, socio, id, cerrar } = await ligaConDosJugadores(browser);

  await arrancarDraft(duenio);
  await expect(socio).toHaveURL(new RegExp(`/leagues/${id}/draft$`), { timeout: 15_000 });

  await socio.getByRole('link', { name: /Volver a la liga/i }).click();
  await expect(socio).toHaveURL(new RegExp(`/leagues/${id}$`));

  // La unica espera fija del archivo, y es deliberada: probar que algo NO pasa exige dejar
  // correr el tiempo en que pasaria. 8s cubren de sobra el intervalo de 5s.
  // Si el redirect mirara "esta LIVE" en vez de la transicion PENDING -> LIVE, acá rebota.
  await socio.waitForTimeout(8_000);
  await expect(socio).toHaveURL(new RegExp(`/leagues/${id}$`));

  await cerrar();
});

test('un draft de dos jugadores termina mostrando el equipo armado', async ({ browser }) => {
  test.slow(); // 6 picks por socket, mas la preparacion
  const { duenio, socio, id, cerrar } = await ligaConDosJugadores(browser);

  await arrancarDraft(duenio);
  await expect(socio).toHaveURL(new RegExp(`/leagues/${id}/draft$`), { timeout: 15_000 });

  // 2 jugadores x 3 rondas. El orden serpiente lo resuelve el backend; acá solo se responde
  // al turno que aparezca.
  for (let i = 0; i < 6; i++) {
    await pickDelQueTengaElTurno([duenio, socio]);
  }

  for (const jugador of [duenio, socio]) {
    await expect(jugador.getByRole('heading', { level: 1, name: 'Draft terminado' })).toBeVisible();
    await expect(jugador.getByRole('heading', { name: 'Tu equipo' })).toBeVisible();
    await expect(jugador.getByRole('heading', { name: 'Los demás' })).toBeVisible();
    await expect(jugador.getByRole('heading', { name: 'Picks' })).toBeHidden();
    await expect(jugador.getByRole('button', { name: 'Volver a la liga' })).toBeVisible();
  }

  await cerrar();
});
