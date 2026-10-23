# Deployment

Runbook del deploy de BoxBox y datos de acceso para la defensa.

**Arquitectura:** backend en [Render](https://render.com), frontend en [Vercel](https://vercel.com),
base Postgres en Supabase (`boxbox-prod`).

> **Estado: desplegado y verificado de punta a punta (2026-10-04).**
> **La app pública pasó de `boxbox-dev` a `boxbox-prod` el 2026-10-16** — ver
> [Cambio a producción](#cambio-a-producción-2026-10-16).

---

## Por qué esta arquitectura

El backend necesita **un proceso vivo**, no funciones serverless: el gateway del draft
(`backend/src/modules/draft/draft.gateway.ts`) mantiene el timer del auto-pick como un
`setTimeout` en memoria, y los controllers REST difunden por el singleton `getIo()` de
`shared/socket.ts`. Con N instancias serverless, un pick que entra por HTTP cae en una
instancia y difunde sobre un `io` que no tiene los sockets de las otras: dos personas
drafteando a la vez dejan de verse.

Render corre un proceso único y mantiene válidas las dos suposiciones sin tocar el gateway.
El frontend es una SPA estática, así que va a Vercel por el CDN y los preview deploys por PR.

---

## Los dos servicios buildean desde `main`

Render y Vercel están configurados sobre la rama **`main`**, con auto-deploy en cada push.
El trabajo diario va en `dev`, así que **nada llega a producción hasta mergear `dev` → `main`**.

Ya costó dos veces: el primer deploy de Render falló porque `main` no tenía todavía el fix
de `prisma generate`, y un cambio al `<title>` no apareció en la app hasta mergearlo. Si
tocaste algo y la URL pública sigue igual, lo primero a revisar es:

```bash
git log origin/main..origin/dev --oneline   # si imprime algo, producción está atrasada
```

---

## Orden de ejecución

Backend y frontend se necesitan mutuamente la URL, así que hay un huevo-y-gallina. Se
resuelve deployando el backend con un `FRONTEND_URL` placeholder y corrigiéndolo al final.

```
1. Render (backend)  →  con FRONTEND_URL placeholder
2. Verificar backend →  /api/v1/health
3. Vercel (frontend) →  con la URL real de Render
4. Volver a Render   →  FRONTEND_URL real → redeploy automático
5. Verificar todo
```

---

## 1. Backend en Render

**New → Web Service → conectar el repo `TomasPinolini/boxbox`.**

| Campo | Valor |
| :---- | :---- |
| Name | `boxbox-api` |
| Branch | **`main`** |
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install --include=dev && npm run build` |
| Start Command | `npm start` |
| Instance Type | Free |

El `--include=dev` **no es opcional**. `NODE_ENV=production` hace que npm omita las
`devDependencies`, y ahí viven `typescript`, todos los `@types/*`, `vitest` y `supertest`.
Sin la bandera, `npm install` trae 230 paquetes en vez de 341 y `tsc` falla con decenas de
`TS7016: Could not find a declaration file for module 'express'`. Es la variable que el
runtime necesita rompiendo el build.

**Variables de entorno:**

| Variable | Valor |
| :------- | :---- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `backend/.env.supabase-prod.local` — desde el 2026-10-16 la app pública usa `boxbox-prod` |
| `JWT_SECRET` | nuevo, `openssl rand -hex 32` |
| `REFRESH_TOKEN_SECRET` | nuevo y distinto del anterior |
| `FRONTEND_URL` | la URL de Vercel (ver paso 4) |

**Ojo con cuál base.** Hay dos proyectos en Supabase y se distinguen por región:
`boxbox-dev` es **us-west-2** (`inmbedbcedksbjypsjlm`) y `boxbox-prod` es **us-east-1**
(`qtwsblwfoceamuvothww`).

**Desde el 2026-10-16 la app pública usa `boxbox-prod`.** Hasta esa fecha usó `boxbox-dev`,
que es la base con la Liga Demo, las fechas importadas de Jolpica y los standings poblados;
el motivo del cambio está en [Cambio a producción](#cambio-a-producción-2026-10-16). Pasar
de una a otra es un solo campo en Render y ~90 segundos de redeploy — pero **reemplazando el
valor entero**, nunca editando por dentro de la URI.

Lo que sigue describe por qué existe esa segunda base y cómo se llegó a ella.

**El 2026-10-15 se probó apuntar a `boxbox-prod`**, y ahí algo cambió de sentido: antes
este runbook decía que apuntar a prod daba `(ENOTFOUND) tenant/user postgres.<ref> not
found`. Ese error no era del string —que siempre fue correcto— sino de que el proyecto
estaba **pausado**: nunca había tenido actividad, y Supabase saca del pooler a los proyectos
pausados. Se resuelve con *Restore* en el dashboard, y después el string conecta sin
cambiarle nada.

El motivo del cambio: desde que la app es alcanzable por gente real, sus cuentas no pueden
vivir en la base de desarrollo, que es la que se trunca, se re-seedea y se resetea mientras
se programa. Un `prisma migrate reset` local borraría datos de terceros.

**No crees `FRONTEND_URL` vacía.** `env.ts` la valida con `z.string().url()`, y el
`.default()` de Zod **sólo aplica cuando la clave es `undefined`** — con string vacío el
default se saltea, `.url()` falla sobre `""`, el proceso hace `process.exit(1)` y Render
reinicia en bucle. Una variable vacía es peor que no tenerla.

`NODE_ENV=production` no es decorativo: es lo que activa `secure: true` y
`sameSite: 'none'` en la cookie del refresh token. Sin eso el login parece funcionar y
echa al usuario a los 15 minutos, cuando expira el access token.

Los secretos van **nuevos**, no los de desarrollo: si alguna vez se filtra un `.env`
local, no debería dar acceso a la base de la demo. Tienen que ser de 32 caracteres o más
o el server no arranca — lo valida `src/config/env.ts` con Zod al bootear.

---

## 2. Verificar el backend

```bash
curl https://boxbox-api.onrender.com/api/v1/health
# esperado: {"status":"ok","timestamp":"..."}

curl -s https://boxbox-api.onrender.com/api/v1/drivers \
  | python3 -c 'import json,sys; print(len(json.load(sys.stdin)["data"]))'
# esperado: 22 — los pilotos de 2026, confirma que pega contra boxbox-prod
# Contar `"id"` en el JSON NO sirve: da 44, porque cada piloto trae embebido su constructor
```

---

## 3. Frontend en Vercel

**Add New → Project → importar `TomasPinolini/boxbox`.**

| Campo | Valor |
| :---- | :---- |
| Framework Preset | Vite (se autodetecta) |
| Root Directory | `frontend` |
| Branch | `main` |

**Variables de entorno — van ANTES del primer build:**

| Variable | Valor |
| :------- | :---- |
| `VITE_API_URL` | `https://boxbox-api.onrender.com/api/v1` |
| `VITE_SOCKET_URL` | `https://boxbox-api.onrender.com` |

Vite **incrusta** las variables en tiempo de build, no las lee en runtime. Y
`frontend/src/config/env.ts` tira excepción en el import si falta alguna. Si las cargás
después de buildear, el build sale verde y la app explota al abrirse.

El rewrite SPA ya está en `frontend/vercel.json` — sin él, un refresh en `/drivers/5`
devolvería 404 porque Vercel buscaría un archivo y React Router maneja esa ruta del lado
del cliente.

**Desactivar Deployment Protection.** Los proyectos nuevos en cuentas con team nacen con
*Vercel Authentication* encendida: la URL responde `302` hacia `vercel.com/sso-api` y exige
una cuenta de Vercel para ver la app. **El profesor se come esa pantalla y no ve nada.**
Se apaga en Settings → Deployment Protection → Vercel Authentication → `Disabled` (o
`Only Preview Deployments`, si querés conservarla en los previews). Verificación:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://boxbox-three.vercel.app/
# 200 = público. 302 = sigue protegido.
```

---

## 4. Cerrar el círculo

En Render → Environment → `FRONTEND_URL` = la URL de Vercel. Guardar dispara redeploy.

Esa única variable arregla las dos puertas de CORS: la de Express (`app.ts:23`) y la del
gateway de Socket.io (`draft.gateway.ts:244`), que necesita la suya propia porque atiende
`/socket.io/*` antes que Express.

**Qué URL exactamente.** El proyecto de Vercel tiene un solo dominio propio,
`boxbox-three.vercel.app`; las otras dos que aparecen en el panel
(`boxbox-tomas-pinolinis-projects.vercel.app` y `boxbox-git-main-...`) son alias que Vercel
genera solo. CORS acepta **un** origen exacto, así que el que no esté en `FRONTEND_URL`
responde "No se pudo conectar con el servidor!" en el login y nada más: la app carga, parece
sana y ninguna request funciona. `FRONTEND_URL` tiene que ser el dominio propio, y ése es el
único link que se reparte. El alias de rama además cambia si se cambia de rama.

---

## 4b. `trust proxy`: por qué 3, y cómo re-medirlo

`app.ts` setea `app.set('trust proxy', 3)`. El número es cuántos saltos hay entre el cliente y
el proceso, contados **desde la derecha** de `X-Forwarded-For`. Medido en producción el
2026-10-15:

```
X-Forwarded-For: 190.18.147.247, 172.64.217.175, 10.28.178.210
                 ^ cliente       ^ Cloudflare     ^ LB interno de Render
```

Con `1`, `req.ip` daba `10.28.178.210` — una IP interna de Render, idéntica para todo el
mundo. Los limiters por IP de `/auth/login` y `/auth/register` metían a todos los usuarios en
un solo contador: una persona agotaba el cap y la siguiente, en otra conexión, comía un 429
sin haber intentado nada. Verificado con laptop por WiFi y celular por datos móviles.

**El síntoma es silencioso** y desde una sola máquina es indistinguible del comportamiento
correcto: el contador baja 9, 8, 7... igual. Sólo aparece con dos IPs reales distintas.

Dos cosas que NO sirven acá, para no volver a probarlas:

- `true` — toma el primer valor del header, que el cliente puede falsificar mandando su propio
  `X-Forwarded-For`. Un número fijo cuenta desde la derecha, así que lo que agregue un cliente
  por la izquierda queda afuera.
- `'uniquelocal'` — pararía en `172.64.217.175`, que es pública (Cloudflare), no privada.

Como red de seguridad ante un cambio de topología de Render, el `keyGenerator` de
`middleware/rateLimit.ts` prefiere el header `CF-Connecting-IP` sobre `req.ip`: Cloudflare lo
escribe con la IP real y sobreescribe lo que el cliente mande, y no depende del conteo.

**Para re-medir** si Render cambia su infraestructura, agregar temporalmente a `app.ts`:

```ts
app.get('/api/v1/debug/ip', (req, res) => {
  res.json({ ip: req.ip, ips: req.ips, xff: req.headers['x-forwarded-for'] });
});
```

Desplegarlo, `curl -s https://boxbox-api.onrender.com/api/v1/debug/ip`, comparar con la IP
pública propia (`curl -s ifconfig.me`) y contar la posición. Después borrarlo: no hace falta que
viva en producción.

---

## 5. Verificación

Todo contra la URL pública, no contra localhost.

### Verificado por API el 2026-10-04

- [x] `/api/v1/health` → `{"status":"ok"}`
- [x] `/drivers` → 22 pilotos, todos con escudería. Confirma la conexión a `boxbox-dev`
- [x] `/drivers/standings` y `/constructors/standings` → suman **1413** por caminos
      independientes, y cada escudería equivale a la suma de sus pilotos (Mercedes 123 =
      Antonelli 68 + Russell 55)
- [x] `/leagues/1/standings` → los `driverPoints` guardados coinciden con la suma de los
      `race_results` de los pilotos realmente drafteados
- [x] **CORS**: con el origen de Vercel devuelve ese origen y `allow-credentials: true`
- [x] **Cookie del refresh**: `HttpOnly; Secure; SameSite=None; Path=/api/v1/auth`
- [x] **Refresh cross-site**: login → `POST /auth/refresh` sólo con la cookie → token nuevo
      → `/auth/me` responde. Es el fix que evita el logout a los 15 minutos
- [x] **Socket del draft**: handshake al namespace `/draft` por WebSocket y `draft:state`
      recibido, con 6 picks y 18/9 disponibles. Valida el CORS del gateway, que es distinto
      del de Express
- [x] La URL de Vercel responde `200` y sirve el bundle de Vite

Los dos últimos del bloque de arriba **no se pueden probar en local**. Son la razón de
deployar con anticipación.

**Re-verificado el 2026-10-17**: `GET /api/v1/drivers` contra la URL pública devuelve los 22
pilotos, ahora desde `boxbox-prod`. El deploy de Render está `live` sobre `main` (`97fe144`,
15:33 UTC) y sin errores en los logs desde entonces.

### Pendiente de clic en el browser

- [ ] La pantalla de login carga sin errores en la consola
- [ ] Login con el admin de prod → `/admin/results`. **`demo1@boxbox.test` y la Liga Demo no
      existen en `boxbox-prod`**: para mostrar la vista de un miembro hay que crear una liga,
      sumar un segundo usuario y correr el draft
- [ ] Hard-refresh en `/drivers/5` → renderiza, no 404. Valida el rewrite SPA
- [ ] `/standings` muestra el campeonato con las 17 fechas
- [ ] Responsive a 375 / 768 / 1024 px sobre la URL pública

---

## Cambio a producción (2026-10-16)

La app pública **dejó de apuntar a `boxbox-dev` y ahora corre contra `boxbox-prod`**. Se
cambió un solo campo: `DATABASE_URL` en Render.

**Por qué.** Mientras la app apuntaba a `boxbox-dev`, el admin de la base alcanzable desde
internet era `admin@boxbox.test` / `admin1234`, y esa password está publicada en
[`tutorial.md`](../tutorial.md). Cualquiera con acceso al repo entraba como ADMIN y podía
cargar resultados falsos, correr el sync o borrar pilotos. En `boxbox-prod` el admin se creó
con `SEED_ADMIN_PASSWORD`, así que el cambio de base cerró el agujero sin tocar una línea de
código. La segunda razón es operativa: con gente jugando ligas de verdad, correr un seed, un
smoke o un `migrate reset` contra esa misma base es cuestión de tiempo.

### Son tres bases, no dos

| Dónde corre | Qué base | Para qué |
| :-- | :-- | :-- |
| Tu máquina — `npm run dev`, `npm test` | Postgres local | Desarrollo diario y la suite |
| Tu máquina, cuando querés datos realistas | `boxbox-dev` | Ya no está desplegada |
| Render + Vercel | `boxbox-prod` | Usuarios reales |

La primera fila no es opcional: `src/tests/setup.ts` llama a `assertLocalDatabase`, que
rechaza cualquier host que no sea local, porque la suite hace `TRUNCATE ... CASCADE` antes de
**cada** test. Apuntarla a Supabase se lleva la base puesta.

Y un environment es una **cadena completa** —frontend + API + base—, no una base suelta. Hay
una sola cadena desplegada, así que "cambiar de entorno" se reduce a editar `DATABASE_URL`.

### Lo que se hizo

1. `DATABASE_URL` de Render → `boxbox-prod`. Verificado: `/api/v1/drivers` → `200`, y un
   registro real desde la URL pública creó un usuario nuevo a las 23:30 UTC.
2. Rotadas las passwords de base de `boxbox-dev` y `boxbox-prod`: las dos habían quedado en
   texto plano fuera de un gestor de contraseñas.
3. Prod tenía la migración `20261015200000_add_user_motto` sin aplicar
   (`ALTER TABLE users ADD COLUMN motto TEXT`). Sin esa columna, `register`, `login` y
   `/auth/me` fallan, porque `userSelect` en `auth.service.ts` la incluye — y el `curl` a
   `/drivers` no lo detecta, porque no toca la tabla `users`. Se aplicó el SQL y se
   sincronizó el libro de migraciones con `prisma migrate resolve --applied`. Hoy
   `prisma migrate status` responde *Database schema is up to date!*.
4. Auditoría de seguridad del backend, de solo lectura: autorización por recurso, sesión y
   JWT, inyección, PII en las respuestas, y secretos en git y en toda la historia. No
   apareció nada para arreglar en el código; el único agujero real era el del admin, que es
   un problema de datos.

### Carga de resultados en prod (2026-10-17)

Las 17 fechas corridas del 2026 entraron **con el seed, en un comando**, no fecha por fecha
desde `/admin/results`. El camino corto ya existía y no estaba a la vista:
`src/scripts/fetch-jolpica-results.ts` deja la temporada congelada en
`prisma/seed-data/results-2026.json` (17 rondas, 374 filas, `fetchedAt: 2026-10-13`), y la
sección 5 del seed carga ese archivo contra la base que diga `DATABASE_URL`.

```bash
cd backend
(set -a; . ./.env.supabase-prod.local; set +a; npx prisma db seed)
```

| | |
| :-- | :-- |
| `racesCompleted` | 17 |
| `race_results` | **371** = 17 × 22 − 3 |
| `constructor_results` | 187 = 11 × 17 |
| Puntos: pilotos vs. escuderías | **1716 = 1716** |

**Por qué 371 y no 374.** El seed **saltea** las 3 filas de `tsunoda` (fechas 12, 13 y 14 —
BOX-9). Por `/admin/results` el número sería 374: esa pantalla escribe las 22 filas de la
grilla siempre, y al piloto que Jolpica no trae le pone `DNS`. Los puntos coinciden igual,
porque de las 3 filas salteadas sólo una puntuaba: el P10 de tsunoda en la fecha 13. Por eso
esa fecha suma 100 y las otras 16 suman 101.

**El chequeo que vale, y es uno solo:** toda fecha de F1 reparte
`25+18+15+12+10+8+6+4+2+1 = 101` puntos. Si una fecha no suma 101, falta un clasificado del
top 10 — típicamente porque quedó en `DNS`. Un `200` no prueba nada; esto sí.

```sql
select r.round, count(*) as filas, sum(rr.points) as puntos
from race_results rr join races r on r.id = rr."raceId"
group by r.round having count(*) <> 22 or sum(rr.points) <> 101 order by r.round;
```

**El seed no crea `league_standings`.** Con 0 ligas da igual; cuando haya ligas, cada fecha
necesita además `POST /races/:id/recalculate`.

**No hay guard que proteja prod del seed.** `assertLocalDatabase` sólo cubre los tests
(`src/tests/setup.ts`). El seed le escribe a lo que diga `DATABASE_URL`, así que el valor va
sourceado en la línea del comando y nunca exportado a la shell. Lo que sí tiene: cero
`delete`, cero `TRUNCATE`, todo `upsert`, y el único `user.upsert` es el admin — los usuarios
reales y las ligas no se tocan.

### Pendiente

1. **Las fotos de perfil: el bucket ya está, falta confirmar a qué proyecto apunta Render.**
   El bucket `avatars` existe en `boxbox-prod` desde el 2026-10-16 18:41 UTC con la
   configuración que hace falta —público, 2 MB, `image/png` / `image/jpeg` / `image/webp`— y
   tiene 2 objetos, así que el prerequisito está cumplido y subir foto ya no puede tirar `502`
   por bucket faltante. Lo que **no está verificado** es a qué proyecto apuntan hoy
   `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en Render: nadie las leyó. El camino, desde
   Render → el servicio → Environment → `Export`, que baja un `.env`:

   ```bash
   grep '^SUPABASE_URL=' ~/Downloads/.env
   # qtwsblwfoceamuvothww = boxbox-prod · inmbedbcedksbjypsjlm = boxbox-dev
   shred -u ~/Downloads/.env
   ```

   El dato medido que inclina la lectura sin cerrarla: los dos únicos avatares subidos en la
   historia del proyecto (`1.jpg`, `4.jpg`) están en el storage **de prod**, y esos nombres
   son ids de usuario de la base **dev**.
2. **No hay cascada de archivos `.env` por `NODE_ENV`** — `config/env.ts:4` hace
   `dotenv.config()` pelado y solo lee `.env`. `tutorial.md` afirmaba lo contrario;
   **corregido el 2026-10-17**. La forma que funciona para apuntar el backend local a
   Supabase: `(set -a; . ./.env.supabase-dev.local; set +a; npm run dev)` — dotenv no pisa
   variables que ya existen en el entorno, así que lo sourceado gana.
3. **`npm audit`: las dependencias de producción están en 0.** Medido el 2026-10-17:
   `cd backend && npm audit --omit=dev` → `found 0 vulnerabilities`. Lo que queda sin medir es
   si las 3 *high severity* que reportaba el build son todas de `devDependencies`, y eso
   importa porque Render buildea con `npm install --include=dev`. El comando que lo cierra es
   `cd backend && npm audit` (sin la bandera) y **todavía no se corrió**.
4. De la auditoría, sin tocar: bcrypt en 10 rounds (OWASP pide 12), el frontend sin CSP ni
   `X-Frame-Options` (`helmet()` cubre la API, no Vercel), refresh token sin revocación
   server-side, y sin recuperación de contraseña.

### La trampa que costó una hora

**Al cambiar `DATABASE_URL` en Render, reemplazá el valor entero. Nunca edites por dentro de
la URI.** Pegar sólo el tramo de la password dejó el usuario y el host de `boxbox-dev` con la
password de `boxbox-prod`: cada mitad era correcta por separado y el síntoma fue
`P1000 / AuthenticationFailed`, idéntico al de una password mal copiada.

Para comparar lo que Render tiene guardado contra un `.env` local **sin imprimir secretos**
(Environment → `Export` baja un `.env`):

```bash
cmp -s <(grep '^DATABASE_URL=' ~/Downloads/.env) \
       <(grep '^DATABASE_URL=' backend/.env.supabase-prod.local) \
  && echo IGUALES || echo DISTINTAS
```

`cmp -s` devuelve solo el código de salida; `diff` imprime las líneas que difieren, con la
password adentro. Borrá el export cuando termines: `shred -u ~/Downloads/.env`.

Y una variable de entorno se lee **una sola vez, al arrancar el proceso**: guardarla en el
dashboard no se lo cuenta a un Node que ya está corriendo. Si el valor es nuevo y el síntoma
no cambia, revisá que el proceso haya reiniciado — en los logs, `Detected service running on
port 10000`.

---

## Accesos

| Qué | Valor |
| :-- | :---- |
| API | **https://boxbox-api.onrender.com** |
| Health check | https://boxbox-api.onrender.com/api/v1/health |
| Frontend | **https://boxbox-three.vercel.app** — único dominio propio del proyecto |
| Base de datos | Supabase `boxbox-prod` (us-east-1, `qtwsblwfoceamuvothww`) — **la que sirve la app pública desde el 2026-10-16** |
| Usuario admin | `admin@boxbox.test` — **password NO publicada**, ver abajo |

`admin1234`, `demo1@boxbox.test` y `demo2@boxbox.test` son de `boxbox-dev`, junto con la
"Liga Demo BoxBox" (`liga-demo-2026`) y su draft `COMPLETED`. Desde el 2026-10-16 **esa base
ya no está desplegada**, así que esas credenciales no abren nada público. Los dos usuarios
`demo*` se crearon **a mano** y ningún script los reproduce: en `boxbox-prod` no existen, y
si alguna vez hace falta una demo armada hay que rearmarla a mano.

En `boxbox-prod` el admin se creó con `SEED_ADMIN_PASSWORD`, una password generada con
`openssl rand -base64 18` que **no se commitea**. Si se pierde, se rota re-corriendo el seed
con una nueva: el `upsert` del admin aplica el hash también en su rama `update`. Sin esa
variable el seed usaría `admin1234`, que está publicada en este repo — y en una base
alcanzable desde internet eso es acceso ADMIN para cualquiera que lo lea. Con
`NODE_ENV=production` la variable es obligatoria y el seed aborta si falta.

> **Esto no fue cierto entre el 16 y el 17/10/2026, y el runbook lo afirmaba.** La password
> real del admin de prod era corta y adivinable, anotada en texto plano en
> `backend/.env.supabase-prod.local`. Nunca llegó a git (`.gitignore:11`, `.env.*.local`),
> pero el archivo no es un lugar donde guardar una credencial: va al gestor de contraseñas.
> Se rotó el 2026-10-17 a una de `openssl rand -base64 18`, de paso al correr el seed.
>
> Cómo se descubrió, porque el mecanismo se repite: la nota con usuario y password estaba
> escrita en el `.env` **sin `#` adelante**. `set -a; . archivo` no parsea un archivo de
> configuración, **lo ejecuta como script de shell**, así que la línea `CONTRASEÑA=...` —con
> `Ñ`, que no puede estar en un nombre de variable de shell, limitados a
> `[A-Za-z_][A-Za-z0-9_]*`— se interpretó como un **comando**, y bash imprimió la línea
> entera, password incluida, en el `command not found`. El mismo archivo leído por dotenv no
> se comporta así: dotenv parsea, no ejecuta.

Los dos usuarios `demo*` son miembros de **"Liga Demo BoxBox"** (código de invitación
`liga-demo-2026`), con el draft `COMPLETED`. Hacen falta para mostrar la vista de un
miembro: el admin **no** es miembro de ninguna liga, y `requireLeagueMember` devuelve 404
por diseño anti-enumeración, así que con el admin no se ve la tabla de posiciones.

## Datos cargados para la demo

Estado de **`boxbox-prod`** al 2026-10-17, la base que sirve la app pública:

| | |
| :-- | :-- |
| Carreras del calendario 2026 | 23 |
| Carreras `COMPLETED` con resultados | **17** |
| `race_results` | 371 |
| `constructor_results` | 187 |
| `league_standings` | 0 — no hay ligas creadas |

Cargado con el seed, ver [Carga de resultados en prod](#carga-de-resultados-en-prod-2026-10-17).
**No hay ninguna liga en prod**, así que no hay tabla de posiciones que mostrar: para eso hay
que crear una liga, sumar un segundo usuario y correr el draft. El admin no sirve de miembro —
`requireLeagueMember` responde 404 por diseño anti-enumeración.

Estado de **`boxbox-dev`** al 2026-10-17. Desde el 2026-10-16 esa base ya no está desplegada.

| | |
| :-- | :-- |
| Carreras del calendario 2026 | 23 |
| Carreras `COMPLETED` con resultados | **17** |
| `race_results` | 371 |
| `constructor_results` | 187 |
| Ligas | 9, con 14 miembros y 14 `fantasy_teams` |
| `league_standings` | 139 |

Los resultados son los mismos que en prod, con el mismo hueco: los 371 son `17 × 22 − 3`,
porque en las fechas 12, 13 y 14 falta `tsunoda`, que corrió por el enroque de mitad de
temporada en Red Bull/RB y no está en la grilla del seed. Es la limitación ya documentada en
BOX-9 — el sync la reporta como `skipped` en vez de fallar, y el seed la saltea. Lo único que
dev tiene y prod no son las ligas: entre ellas la "Liga Demo BoxBox" (`liga-demo-2026`), hoy
`ARCHIVED`, con su draft `COMPLETED` y 2 miembros.

---

## Limitaciones conocidas

> ### ⚠️ Antes de la defensa: despertar la base
>
> **Supabase pausa los proyectos del plan free tras ~7 días sin actividad.** Ya pasó: entre
> el 2026-09-25 y el 2026-10-04 el proyecto se pausó solo, y el síntoma no es obvio — el
> backend arranca bien, `/health` responde `200`, y recién los endpoints que tocan la base
> devuelven `500`. En los logs aparece
> `(ENOTFOUND) tenant/user postgres.<ref> not found`, que parece un error de credenciales
> y no lo es.
>
> **El día anterior a la defensa**: entrar al dashboard de Supabase, reactivar la base
> si está pausada, y confirmar con
> `curl https://boxbox-api.onrender.com/api/v1/drivers` → tiene que traer 22 pilotos.
> Si devuelve `500`, la base está dormida.
>
> **Con usuarios reales usando la app esto deja de ser un ritual de un día.** Un ping
> automático cada 10 minutos (UptimeRobot, cron-job.org) lo evita, pero tiene que apuntar a
> **`/api/v1/drivers`**, no a `/api/v1/health`: `health` no toca la base, así que responde
> `200` con el proyecto pausado y no la mantiene despierta. Un ping a `/drivers` hace una
> query real y de paso evita el arranque en frío de Render. Un solo chequeo cubre los dos
> problemas.

- **El plan free de Render suspende el servicio tras 15 minutos sin tráfico**, y el
  arranque en frío tarda ~50s. Antes de la defensa, abrir la URL una vez para despertarlo.
- **El draft no reconecta.** Si el socket se corta, hay que recargar la página. Está
  declarado fuera de alcance.
- **Las dos bases tienen los mismos resultados; lo que las separa son las ligas.** Desde el
  2026-10-16 la app pública apunta a `boxbox-prod`, que el 2026-10-17 quedó con las **17
  fechas corridas de 2026** cargadas con el seed (371 `race_results`, 1716 puntos) — ver
  [Carga de resultados en prod](#carga-de-resultados-en-prod-2026-10-17). Lo que prod **no**
  tiene es ninguna liga: 0 `leagues`, 0 `fantasy_teams`, 0 `league_standings`, así que el
  campeonato de pilotos y escuderías se ve, pero una tabla de posiciones de liga no existe
  hasta crear una liga y correr el draft. `boxbox-dev` tiene las mismas 17 fechas más 9 ligas
  y 139 `league_standings`, pero ya no está desplegada: es la base a la que se apunta el
  backend local cuando se quieren datos realistas.

---

## Traspaso 2026-10-16 — señalización de beta y Sentry

Rama `feat/senalizar-beta`, sacada de `dev`: 12 archivos modificados y 2 nuevos, 742
inserciones. **Ya está mergeada** — PR #100 a `dev` y PR #101 de `dev` a `main` (`97fe144`),
así que llegó a producción.

### Hecho — señalizar que la app está en beta

1. **`beta` y `v1.0.0` son ejes distintos.** El número versiona el contrato HTTP, que es
   estable; la etiqueta habla de madurez del producto. No se bajó a `0.x`: eso habría
   mezclado los dos ejes. Quedó en `docs/glossary.md` como término + ambigüedad flageada.
2. **Rótulo `Beta`** en sentence case al lado del logo (`AppLayout.tsx`). Es un `<span>` propio y
   no el `Badge` de `components/ui`: ése es `uppercase` a propósito y habría impreso `BETA`.
   Vive en un solo lugar, así que retirarlo es borrar un componente y sus dos usos.
3. **El rótulo viene explicado** con el `HelpPopover` que ya existía. Se descartó el banner
   persistente arriba: banner blindness (NN/g) dice que se ignora todo lo que ocupa esa posición.
4. **`/novedades` y el popover leen el mismo `CHANGELOG.md`** de la raíz, vía `?raw` de Vite.
   Sin texto duplicado: se arregla una limitación en un archivo y los dos lugares se enteran.
5. **Aviso en `/register`**, debajo del botón de crear cuenta: es la única pantalla sin
   `AppLayout` —o sea sin rótulo— y el primer contacto de alguien invitado.
6. **Parser propio de markdown**, ~40 líneas, en vez de sumar una librería a un bundle que ya
   pasa los 500 kB. El changelog usa 6 construcciones y nada más.

### Hecho — Sentry en el backend

- Org `boxbox` con **dos proyectos**: `boxbox-frontend` (React) y `boxbox-backend` (Node).
  Separados porque Sentry elige el SDK y agrupa los errores según la plataforma del proyecto.
- `@sentry/node` instalado. `backend/src/instrument.ts` es nuevo y se importa en la **primera
  línea** de `server.ts`: el backend es CommonJS, así que el `--import` de la doc no aplica.
- **No** se usa `Sentry.setupExpressErrorHandler`. Nuestro `errorHandler` responde y corta, nunca
  llama a `next(err)`. Va un `captureException` en la rama de error inesperado, el único lugar que
  ya distingue un bug de un 400 del cliente: así no se gasta cuota en validaciones ni en 404.
- **Se apagaron tres defaults peligrosos** de la v11: mandaba el body de cada request (las
  contraseñas de `/auth/login` y `/auth/register`), las cookies (el refresh token de 7 días) y el
  header `Authorization`. El porqué está comentado en `instrument.ts`.
- `SENTRY_DSN` es opcional en `config/env.ts`: sin DSN el SDK ni arranca.

### Verificado, no asumido

- Error real llegado a Sentry por el código real de la app: issue `BOXBOX-BACKEND-1`, con stack
  trace apuntando a `src/app.ts`. La ruta temporal que lo disparó ya se borró.
- El evento **no** trae body, ni cookies, ni `Authorization`.
- Backend: `tsc --noEmit` limpio, lint limpio, **293 tests en 13 archivos**, exit 0.
- Frontend: lint limpio, build OK, **174 tests en 34 archivos**.
- UI mirada a 1024 px y 375 px: rótulo, popover de escritorio, cartel móvil y `/novedades`.

### Pendiente — de Tomás

1. ~~Commitear y pushear `feat/senalizar-beta`.~~ Hecho: PR #100 → `dev`, PR #101 → `main`.
2. **Cargar `SENTRY_DSN` en Render** (el de `boxbox-backend`; está en Sentry → Settings →
   Projects → Client Keys). Se sacó a propósito del `.env` local para no quemar la cuota del
   plan gratis con errores de desarrollo.
3. **Reiniciar el servidor de desarrollo local**: el que quedó corriendo todavía tiene el DSN en
   memoria y sigue mandando errores de dev a Sentry.
4. **Verificar el free tier real de Sentry** — los números que tenemos (5.000 errores/mes,
   30 días de retención) vienen de agregadores de terceros, no de la página oficial.
5. **Decidir si `sentry-create-alert`** queda en el catálogo de `/which-skill` o se va a
   `ignore.txt`.

### Pendiente — técnico

- **El frontend sigue sin instrumentar en producción.** La instrumentación existe en `dev`
  (PR #102) pero `main` no la tiene, y Vercel buildea `main` — así que el crash en el browser
  del usuario sigue siendo lo único que no ve nadie. Se arregla mergeando `dev` → `main`.
- **Source maps.** `sourceMap` no está activado en `backend/tsconfig.json`: en producción los
  stack traces apuntan a `dist/app.js`, legible pero compilado. En el frontend es peor, porque
  Vite minifica: sin source maps se ve `a.b.c is not a function`.
- **Falta el ADR** que documente por qué la app dice beta con un tag `v1.0.0` publicado.
- **Canal de feedback.** Se decidió captura de errores sola, sin botón de reporte in-app. Queda
  dicho que preguntarle a la gente después de cada carrera cuesta cero y es el único canal que
  recupera al 90% que nunca reporta nada.

### Decisiones ya discutidas — no re-litigar

- Nada de bajar la versión a `0.x`.
- Nada de banner persistente arriba.
- Nada de librería de markdown para el changelog.
- Nada de botón de reportar problema dentro de la app.
