import { expect, test, type Browser, type Page } from '@playwright/test';

// Draft de punta a punta contra el backend real (seed cargado). Es el unico spec con DOS
// contextos de navegador: el draft es la unica pantalla donde lo que ve un jugador cambia
// por lo que hace otro, y con un solo navegador eso no se puede probar.
//
// Cada test arma su propia liga con dos jugadores. Sale ~8s de preparacion por test, y se
// paga a gusto: un draft no se puede resetear desde la UI, asi que compartir liga entre
// tests los volveria dependientes del orden.

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
}

/**
 * Deja a dos jugadores dentro de una liga nueva, los dos parados en /leagues/:id.
 * Devuelve las dos paginas y el id. Los contextos se cierran solos al terminar el test.
 */
async function ligaConDosJugadores(browser: Browser) {
  const ctxDuenio = await browser.newContext();
  const ctxSocio = await browser.newContext();
  const duenio = await ctxDuenio.newPage();
  const socio = await ctxSocio.newPage();

  await registrar(duenio, 'Duenio');
  await registrar(socio, 'Socio');

  const code = unico('e2e').slice(0, 20);
  await duenio.getByLabel('Nombre').fill('Liga Draft E2E');
  await duenio.getByLabel('Código de invitación').fill(code);
  await duenio.getByRole('button', { name: 'Crear', exact: true }).click();
  await expect(duenio).toHaveURL(/\/leagues\/\d+$/);
  const id = Number(/\/leagues\/(\d+)/.exec(duenio.url())![1]);

  // El formulario de unirse etiqueta su campo "Código" a secas — "Código de invitación" es
  // el de CREAR liga, en la misma pantalla. Y 'Código' sin exact matchea los dos.
  await socio.getByLabel('Código', { exact: true }).fill(code);
  await socio.getByRole('button', { name: 'Unirme', exact: true }).click();
  await socio.goto(`/leagues/${id}`);
  // Si el join fallo, el backend contesta 404 a proposito (anti-enumeracion) y el test
  // fallaria mas tarde por una razon que no tiene nada que ver. Mejor reventar aca.
  await expect(socio.getByRole('heading', { name: 'Liga Draft E2E' })).toBeVisible();

  return { duenio, socio, id, cerrar: () => Promise.all([ctxDuenio.close(), ctxSocio.close()]) };
}

/**
 * Hace el pick del jugador que tenga el turno, sea cual sea. El orden serpiente arranca de
 * un orden base shuffleado, asi que no se puede predecir a quien le toca primero.
 */
async function pickDelQueTengaElTurno(jugadores: Page[]) {
  let conTurno: Page | undefined;
  // El picker es una grilla de <button>, uno por piloto o escuderia, agrupada en un
  // role="group". El <select> que queda en el DOM es el fallback nativo de telefono y en
  // escritorio no esta visible, asi que no sirve para detectar el turno.
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


  // El pick viaja por socket, asi que hay que esperar a que VUELVA, no a que se envie.
  // No sirve esperar a que el boton desaparezca: el orden serpiente hace que un jugador
  // elija dos veces seguidas (ronda 1 ultimo, ronda 2 primero) y entonces el panel se queda.
  // La señal confiable es la lista de picks creciendo — salvo en el ultimo, donde la lista
  // entera da paso a los equipos armados.
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

/**
 * Arranca el draft. Son DOS clicks: desde el rediseño de la pantalla de liga, la accion
 * irreversible pide confirmacion con la cuenta de miembros antes de ejecutarse.
 */
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

  // Terminado: el titulo deja de decir "en vivo" y la lista cruda de picks da paso a los
  // equipos. Los dos jugadores ven su propio equipo y el del otro.
  for (const jugador of [duenio, socio]) {
    await expect(jugador.getByRole('heading', { level: 1, name: 'Draft terminado' })).toBeVisible();
    await expect(jugador.getByRole('heading', { name: 'Tu equipo' })).toBeVisible();
    await expect(jugador.getByRole('heading', { name: 'Los demás' })).toBeVisible();
    await expect(jugador.getByRole('heading', { name: 'Picks' })).toBeHidden();
    await expect(jugador.getByRole('button', { name: 'Volver a la liga' })).toBeVisible();
  }

  await cerrar();
});
