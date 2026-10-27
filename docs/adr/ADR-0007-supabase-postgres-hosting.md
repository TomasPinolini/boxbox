# ADR-0007: Postgres en Supabase (dos proyectos gratuitos) en lugar de self-hosting

**Date:** 2026-09-21
**Status:** Accepted
**Author:** Tomás Pinolini

---

## Context

BoxBox necesita una base de datos hosteada para poder desplegar y demostrar la app, con entornos de desarrollo y producción separados. El backend usa Prisma 7 + Postgres local en desarrollo.

Apareció la pregunta: ¿dónde hostear la DB? Las opciones principales son:
- Self-hosting (VPS, Heroku, Railway)
- Supabase (Postgres manejado + auth opcional)
- AWS RDS, Google Cloud SQL, Azure
- Otras plataformas (PlanetScale, etc.)

---

## Decision

**Usamos Supabase: dos proyectos gratuitos** (`boxbox-dev` en us-west-2, `boxbox-prod` en us-east-1).

---

## Alternatives considered

| Opción | Pros | Cons | Por qué rechazada |
|---|---|---|---|
| **Supabase (dos proyectos gratis)** | Gratuito, Postgres estándar, sin vendor lock (volcar + migrar es trivial), RLS automático incluido, dashboard amigable, SQL accesible | Limitaciones de plan free (2 proyectos máximo, 500MB cada uno), región fija | **Seleccionada** |
| Self-hosting (VPS + Postgres) | Control total, barato con DigitalOcean/Linode | Necesita alguien para monitoreo, backups, upgrades; más costo mental | Too much operational burden para un TP |
| Heroku (data.heroku.com) | Sencillo, Postgres incluido | Caro ($50/mes estándar), overkill para la escala | Budget no permite |
| AWS RDS / Google Cloud SQL | Industriales, escalables | Pricing complejo, overhead de configuración | Overkill; Supabase es más simple con igual confiabilidad |
| Railway / Render | Simple, relativamente barato | Menor mercado, menos comunidad que Supabase | Supabase es más conocido, documentación más robusta |

---

## Consequences

### Positive

- **Zero cost para dev + prod** — plan free cubre el TP sin crédito de tarjeta.
- **Postgres auténtico** — no es un abstraction layer; Prisma connect directo sin adaptadores extras.
- **RLS automático** — Supabase habilita Row Level Security en todas las tablas por defecto (add-on de seguridad sin costo).
- **Volcar datos es trivial** — `pg_dump` / `pg_restore` no dependen de Supabase; migrar después del TP lleva 30 min.
- **Un solo `DATABASE_URL`** — el mismo punto de conexión sirve para runtime (Express) y migraciones (Prisma), sin cambios en el código.

### Negative / tradeoffs

- **Límite de dos proyectos gratuitos** — no hay Supabase Branching (feature pago con flujo de migraciones incompatible); dos proyectos = branching manual (dev y prod separados, punto).
- **500MB / proyecto** — para un TP es suficiente; si crece más, pagar o self-host. Está documentado el upgrade path.
- **Dependencia de disponibilidad de Supabase** — si cae, no hay demo. Mitigación: local Postgres sigue siendo la DB de tests (suite hace `TRUNCATE`), así que el TP no depende de la nube para development.
- **RLS activo, sin policies** — Supabase enciende `rls_enabled=true` en todas las tablas pero sin policies definidas, así que Prisma (conectando como usuario `postgres`) no ve restricciones. Si se agrega RLS con policies después, hay que asegurar que el usuario Prisma tenga acceso. Por ahora, no es un bloqueante.

### Risks

- **Que el free tier de Supabase desaparezca.** Mitigación: data porta a otro Postgres en 30 min; contractual, Supabase no puede revokear proyectos free sin aviso. Bajo riesgo.

---

## Evidence in codebase

- **Dos proyectos creados y funcionales** (`boxbox-dev` [us-west-2], `boxbox-prod` [us-east-1]), verificados por el CLI de Supabase.
- **Dev seeded**: 4 migraciones aplicadas, 17 tablas, 22 pilotos, 11 escuderías, 24 carreras de 2026, 1 admin, RLS en todas las tablas sin ruptura de Prisma.
- **Prod migrado**: 4 migraciones aplicadas, 17 tablas vacías, RLS en todas, sin seed (a propósito — admin se crea en deploy).
- **Backend code sin cambios** — `backend/src/shared/prisma.ts` sigue siendo un singleton que lee `DATABASE_URL` del entorno; `prisma.config.ts` no cambió.
- **`backend/.env.supabase-dev.local` y `.env.supabase-prod.local`** — archivos de entorno segregados (sufijo `.local` obligatorio para no enterrar en git).

---

## Migration path

1. Local Postgres sigue siendo la DB de `npm test` y development offline.
2. Para deploy:
   - En CI/CD (futuro BOX-33): `prisma migrate deploy` contra Supabase.
   - En demo: apuntar `DATABASE_URL` a Supabase.
3. Backups automáticos: Supabase maneja; snapshots a demanda si es necesario.
4. Después del TP: si se necesita escalar → self-host o pagar Supabase Pro; volcar y realmacenar es 30 min.

---

## References

- [Supabase Docs — Migrations](https://supabase.com/docs/guides/migrations/overview)
- [Prisma + Postgres — connection string format](https://www.prisma.io/docs/orm/reference/connection-urls/postgresql)
- [Row Level Security en Supabase](https://supabase.com/docs/guides/auth/row-level-security) — por ahora sin policies; a futuro si se agregan, documentar.
- [Backup de datos desde Supabase](https://supabase.com/docs/guides/platform/backups) — feature gratuita en plan free.
