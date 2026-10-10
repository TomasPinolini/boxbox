# ADR-0009: Archivar una League en lugar de borrarla

**Date:** 2026-10-09
**Status:** Accepted
**Author:** Tomás Pinolini

---

## Context

Una liga que terminó, o que se creó por error, ensucia `/leagues` para siempre. El owner necesita
sacársela de encima. La pregunta es qué significa exactamente "sacársela de encima".

Esta decisión ya estaba tomada de hecho —`CLAUDE.md`, un comentario en `leagues.routes.ts:17` y
`docs/api-endpoints.md` dicen los tres que no hay `DELETE /leagues/:id`— pero no estaba en ningún
ADR, y **[ADR-0004](./ADR-0004-soft-delete-only-catalog.md) parece decir lo contrario**: ahí se
estableció que solo las entidades de catálogo llevan `deletedAt` y que "todas las demás entidades
se borran físicamente". Leído suelto, eso sugiere que una League se borra con `DELETE FROM`. Este
ADR cierra esa lectura.

El disparador fue el rediseño de `/leagues/:id` (9/10/2026), donde el pedido original fue
literalmente "que el owner pueda borrar la liga".

---

## Decision

Una **League** no se borra nunca. El owner la **archiva**: `PATCH /leagues/:id` con
`status: 'ARCHIVED'`, detrás de `requireLeagueOwner`.

Archivar es definitivo desde la interfaz: no hay botón para reabrir. La fila y todos sus datos
—miembros, FantasyTeams, DraftPicks, LeagueStandings— quedan intactos en la base.

El miembro que no es owner no archiva: **sale** (`POST /leagues/:id/leave`), que es una acción
distinta y ya existía. El owner no puede salir de su propia liga (409 `OWNER_CANNOT_LEAVE`): cierra.

---

## Alternatives considered

**Borrado físico (`DELETE FROM leagues`).** Era el pedido literal, y no funciona sin trabajo extra:
ninguna relación del schema declara `onDelete`, así que Postgres aplica `ON DELETE RESTRICT` en
todas las claves foráneas hacia `leagues` y `league_members`. Un `prisma.league.delete()` falla con
violación de FK mientras exista un solo `LeagueMember` o `DraftPick`. Borrar de verdad exigiría una
transacción que vacíe en orden —`LeagueStanding`, `DraftPick`, `FantasyTeam`, `LeagueMember`,
`League`— que es exactamente lo que hace el teardown de `smoke-slice-9.ts`. Más allá del costo: en
un fantasy los picks son el recuerdo de los demás jugadores, y el owner no debería poder borrárselos
sin que se enteren.

**Soft-delete con `deletedAt`, como el catálogo.** Contradice ADR-0004 de frente y agrega una
columna y un filtro para una sola entidad, cuando `League.status` ya existe y ya tiene el valor
`ARCHIVED` en el enum.

**Dejar la liga visible pero marcada como cerrada.** Rechazado porque no resuelve el problema que
originó el pedido: la pantalla que se quería limpiar sigue igual de llena, solo que con cosas
tachadas.

---

## Consequences

- **El `inviteCode` queda tomado para siempre.** Es `@unique` en `League` y la fila no se borra, así
  que ese código no se puede reusar nunca más. Con códigos elegidos por el usuario (4-20 caracteres)
  y un proyecto de vida corta no molesta; en una app con años de ligas, sí.
- **Archivar hay que filtrarlo explícitamente en cada read nuevo.** Hoy `listLeagues` no lo hace
  —una liga archivada sigue apareciendo en `GET /leagues`— y este rediseño agrega ese filtro. Todo
  listado futuro tiene que acordarse, igual que pasa con `deletedAt: null` en el catálogo.
- **Lo que archivar ya hacía y se mantiene:** bloquea entrar con el `inviteCode`
  (`joinLeague` exige `status === 'ACTIVE'`) y saca a la liga del recálculo de `LeagueStanding`s.
- **Revertir es posible pero no es un feature**: un `UPDATE` a mano sobre `status`. Si alguna vez
  hace falta una reapertura de verdad, hay que decidir antes qué pasa con el draft y los puntos.
