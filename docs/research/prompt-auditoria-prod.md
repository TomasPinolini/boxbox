Auditoría de estado de BoxBox contra las fuentes vivas. **Solo lectura.** No escribas en
prod, no toques variables de Render, no commitees, no abras PRs.

## El encargo

Decime en qué estado está realmente el proyecto hoy. No me lo cuentes desde los documentos:
**todo documento es una afirmación a verificar, no un dato.** En este proyecto los briefings,
el runbook y las notas ya estuvieron desactualizados varias veces y una sesión anterior los
repitió como hechos. Esta auditoría existe por eso.

Separá el informe en **tres** categorías y no colapses nunca la tercera en las otras dos:

1. **Verificado cierto** — con el comando o la consulta que lo prueba.
2. **Verificado falso** — con la medición que lo contradice.
3. **No verificable con las herramientas disponibles** — decilo. No lo infieras, no lo
   redondees a "probablemente". Y decime qué haría falta para verificarlo.

Números, no status codes. Un `200` no prueba un cálculo.

## Reglas

- **Los comandos de red los corre Tomás, no vos.** Un hook los bloquea. Dejale el comando
  escrito. Las consultas por MCP (Supabase, Render, Linear) sí las podés hacer vos.
- **Nunca apuntes los tests a Supabase.** `backend/src/tests/setup.ts` hace
  `TRUNCATE ... CASCADE` antes de cada test; hay un guard (`assertLocalDatabase`) que lo
  impide. No lo saltees.
- El seed **no** tiene guard: `npx prisma db seed` le escribe a lo que diga `DATABASE_URL`.
  No lo corras.

## Qué verificar

### Datos en producción

Proyecto Supabase `boxbox-prod` (us-east-1, ref `qtwsblwfoceamuvothww`), MCP `supabase-prod`,
SQL de solo lectura.

- Carreras por estado. Cuántas `COMPLETED`, cuántas no, y de qué rondas son las que no.
- `race_results` y `constructor_results`: cuántas filas, y cuántas por fecha.
- ¿`sum(race_results.points)` coincide con `sum(constructor_results."totalPoints")`?
- ¿Hay alguna fecha cuyos puntos no sumen 101? (`25+18+15+12+10+8+6+4+2+1`.) Si hay, cuál y
  por qué.
- ¿Algún `constructor_results` donde `totalPoints <> driver1Points + driver2Points`, o donde
  `driver1Points < driver2Points`?
- `leagues`, `league_members`, `fantasy_teams`, `draft_picks`, `league_standings`: cuántos.
- `users`: cuántos, y cuántos con `avatarUrl` no nulo.
- `storage.buckets`: qué buckets hay, y con qué `public`, `file_size_limit` y
  `allowed_mime_types`.
- Temporadas: cuál está `isActive`, con qué `driverCount`, y cuántos pilotos tienen
  `DriverSeason` en ella.

Comparalo con `boxbox-dev` (MCP `supabase-dev`) donde sirva de contraste.

### Despliegue

- Servicio de Render `srv-db1d7e8u01pc73dthnfg` (`boxbox_api`), workspace
  `tea-cspa28rgbbvc73e780g0`. Último deploy: estado y hora. Errores recientes en los logs.
- **¿A qué proyecto Supabase apuntan `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`?**
  Advertencia de herramientas: el MCP de Render expone `update_environment_variables`
  (escritura) y **ninguna lectura** de variables. Si no encontrás otra vía, eso va a la
  categoría 3 con el comando que Tomás tendría que correr. No lo deduzcas.
- Frontend en Vercel (`boxbox-three.vercel.app`): de qué rama despliega y cuál es el último
  deploy.
- Render despliega desde `main`. Verificá qué hay en `main` y qué quedó en `dev` sin mergear
  (el merge `dev → main` lo hace Rivero, no se propone como paso de Tomás).

### Git y GitHub

- Rama actual, árbol limpio o no, ramas locales sin pushear.
- PRs abiertos y qué trae cada uno.
- `git log main..dev --oneline`.

### Linear (team BoxBox, no es un project)

- Qué issues están **In Progress** y qué exige cada uno en su descripción.
- ¿Hay algún ticket que cubra **poblar prod con datos de demo** — una liga, sus miembros, un
  draft corrido, standings?
- Qué cubre exactamente **BOX-79**, y si la ingesta automática de resultados está dentro.
- ¿Algún issue marcado `Done` cuya afirmación no se sostenga contra la medición de arriba?

### Documentos

Para cada uno, qué afirma y si sigue siendo cierto:

- `docs/entrega/deployment.md` — en particular las secciones "Cambio a producción
  (2026-10-16)", "Carga de resultados en prod (2026-10-17)", "Pendiente", "Accesos" y "Datos
  cargados para la demo".
- `docs/tutorial.md` — la cascada de `.env` que describe, contra lo que hace de verdad
  `backend/src/config/env.ts`.
- `docs/roadmap.md` y los dos de lane (`backend/docs/roadmap.md`, `frontend/docs/roadmap.md`)
  — qué declaran shipped contra lo que hay en `backend/src/modules/` y
  `frontend/src/features/`.
- La memoria del proyecto en
  `~/.claude/projects/-home-pinola-UTN-DSW-boxbox/memory/post-defensa-abrir-a-usuarios.md` —
  es de la sesión que estamos auditando, tratala como la afirmación más sospechosa de todas.

## Contexto que no está en el código

- La app pública pasó de `boxbox-dev` a `boxbox-prod` el 16/10/2026. Son **tres** bases:
  Postgres local (desarrollo y tests), `boxbox-dev` (ya no desplegada), `boxbox-prod` (la
  única que sirve la app).
- Entrega del TP: 12 al 16/10/2026, con defensa oral. El video que pide la cátedra todavía no
  existe.
- Admin de prod: `admin@boxbox.test`. La password se rotó el 17/10; está en el vault de
  KeePassXC (`~/.local/share/keepassxc/personal.kdbx`). No la busques en el repo.
- Hay cuatro ítems de endurecimiento anotados y deliberadamente postergados (bcrypt en 10
  rounds, CSP en el frontend, revocación de refresh token, recuperación de contraseña). **No
  los propongas**, son otro hilo.

## Formato del informe

Una tabla por área con tres columnas: **Afirmación / Veredicto / La medición que lo prueba**.
Al final, una lista de lo que queda realmente pendiente, ordenada por qué bloquea la entrega
— y separada de lo que simplemente no está verificado.

Si una afirmación de un documento resulta falsa, no lo arregles todavía: listalo y preguntame.
