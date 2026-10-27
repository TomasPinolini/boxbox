# ADR-0006: Draft de 3 rondas — sin piloto reserva ni DriverSwap

**Date:** 2026-08-27
**Status:** Accepted
**Author:** Tomás Pinolini (decisión tomada en sesión de brainstorming; Tomás Rivero informado vía PR)

---

## Context

El code review pre-Slice 8 (2026-08-23) encontró que **una liga de más de 7 miembros nunca puede terminar el draft** (Linear BOX-14). La causa es aritmética: el draft de Slice 5 tiene 4 rondas (driver1, driver2, reserva, constructor), los picks de piloto son exclusivos por liga, y la grilla tiene 22 pilotos → 22 ÷ 3 = 7 miembros máximo. Pero `League.maxMembers` tiene `@default(11)` y el validador permite hasta 20. Con 8+ miembros, en la ronda 3 no queda ningún piloto disponible y el draft queda `LIVE` para siempre.

Al investigar de dónde salía el 11, apareció una **contradicción entre los documentos del proyecto y el código**:

| Fuente                                                      | Qué dice del draft                                                                                                                                                                                               |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/proposal.md:21, 175` (propuesta académica, congelada) | "selección de 2 pilotos titulares, **1 reserva** y 1 escudería"                                                                                                                                                  |
| `docs/domain-entities.md:29`, `docs/glossary.md:66`         | Snake draft de **3 rondas** (2 pilotos + constructor). "El driver reserva **no se draftea** — se asigna más adelante vía waiver cuando ocurre un swap." `maxMembers` default 11 = "uno por equipo del grid 2026" |
| Código (`draft.service.ts`, Slice 5)                        | **4 rondas**, la reserva se draftea                                                                                                                                                                              |

Es decir: el 11 era correcto para el diseño de 3 rondas (22 ÷ 2). Slice 5 implementó la ronda de reserva siguiendo el proposal, y nadie recalculó el tope.

La reserva, además, arrastra una segunda entidad: `DriverSwap` (swap manual de reserva por titular antes del `lockDate`, o `AUTO_DNF` cuando un titular abandona), planificada como Slice 11 y presente en el schema desde la migration inicial (idle). Todo el valor de la reserva depende de que Slice 11 exista.

### Chequeo contra la rúbrica de la cátedra

Se verificó contra el README de [utnfrrodsw/tp](https://github.com/utnfrrodsw/tp) antes de decidir:

- Los requisitos de **Aprobación** piden: CRUDs de las clases de negocio _necesarias_, 1 CUU/epic por integrante (mínimo 2 relacionados), tests, login con 2 niveles y rutas protegidas por nivel. **Ninguno menciona la reserva.** Si `DriverSwap` deja de existir, deja de ser una clase "necesaria".
- La CUU de Aprobación de nuestra propuesta ("snake draft con WebSocket, timer por pick, auto-pick en timeout, selección libre de categoría por ronda, picks exclusivos") **no menciona la reserva**. Solo la CUU de Regularidad la nombra como detalle.
- "Historial de swaps de pilotos" está en **Alcance Adicional Voluntario** de la propuesta.

---

## Decision

1. **El draft tiene 3 rondas**: ronda 1 → `driver1Id`, ronda 2 → `driver2Id`, ronda 3 → `constructorId`. Es el diseño que ya describían `domain-entities.md` y `glossary.md`.
2. **El piloto reserva desaparece del juego.** Se eliminan `FantasyTeam.reserveDriverId` y su relación, el modelo `DriverSwap`, los enums `SwapSlot` y `SwapType`, y las relaciones inversas en `Driver`, `Race` y `FantasyTeam`. Migration destructiva (solo existe DB de desarrollo).
3. **El tope de miembros se deriva de la temporada**: `maxMembersForSeason(season) = floor(season.driverCount / 2)` → 11 para 2026. Se valida en `createLeague`, `updateLeague` (409 `MAX_MEMBERS_EXCEEDS_SEASON`) y como red de seguridad en `startDraft` (409 `TOO_MANY_MEMBERS_FOR_DRAFT`). El `@default(11)` de Prisma queda: ahora es correcto.
4. **Slice 11 (DriverSwap) se elimina del roadmap.** No se renumeran los slices; queda marcado "eliminado por ADR-0006". El listado voluntario "historial de swaps" cae con él.
5. **`proposal.md` no se edita** (documento congelado y evaluado). El desvío se comunica a la cátedra antes de la entrega y se registra en el informe como decisión de alcance.

---

## Alternatives considered

| Opción                                                                       | Pros                                                                                                                                                  | Cons                                                                                                                                                                                                                                                                                                                  | Por qué rechazada                                           |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **A. Tope fijo en 7** (mantener 4 rondas)                                    | 3 líneas + migration; nivel 1                                                                                                                         | Número mágico: en una temporada de 20 pilotos el tope real es 6. Ligas chicas (7) para siempre                                                                                                                                                                                                                        | Arregla el síntoma, no la contradicción entre docs y código |
| **B. Tope derivado `floor(driverCount / 3)`** (mantener 4 rondas)            | Sin número mágico; sin migration; nivel 1                                                                                                             | Mantiene la reserva, cuyo valor depende de Slice 11 — el slice de más riesgo del roadmap. Ligas de máximo 7                                                                                                                                                                                                           | Correcta como fix, pero deja el peso de Slice 11 intacto    |
| **D. Híbrido: 4 rondas hasta 7 miembros, 3 rondas si son más**               | Permite ligas de 11                                                                                                                                   | Rondas variables en el state machine del draft (`TOTAL_ROUNDS`, `SLOT_BY_ROUND`, auto-pick); **dos tipos de liga para siempre** — Slice 9 (scoring "mejor 2 de 3"), Slice 11 y el frontend necesitan un `if (liga tiene reserva)` en cada regla. Indefendible como producto: "¿por qué algunas ligas tienen reserva?" | La opción más cara, aunque parezca un `if`                  |
| **E-a. 3 rondas, la reserva existe pero no se draftea** (waiver en Slice 11) | Cambio mínimo hoy; coincide con `domain-entities.md:125`; conserva Slice 11                                                                           | Deja columna y entidad idle apostando a un slice que quizás no llegue; el "waiver" no está diseñado                                                                                                                                                                                                                   | Descartada al decidir que Slice 11 no se va a construir     |
| **E-b. 3 rondas, sin reserva ni DriverSwap**                                 | Modelo más chico; el 11 vuelve a ser correcto; cero ramas condicionales en scoring; Slice 11 sale del plan explícitamente en vez de quedar como deuda | Se aparta del texto de la CUU de Regularidad del proposal; migration destructiva; toca tests de Slice 5/6 (Rivero)                                                                                                                                                                                                    | **Seleccionada**                                            |

---

## Consequences

### Positive

- **El bug de BOX-14 desaparece por construcción**: 11 miembros × 2 pilotos = 22 = grilla completa. El tope queda atado a `Season.driverCount`, no a una constante.
- **Menos superficie para Slices 9 y 13**: el scoring suma 2 pilotos + constructor, sin "mejor 2 de 3", sin swaps que reprocesar; el frontend muestra 3 slots, no 4.
- **El modelo vuelve a coincidir con `domain-entities.md` y `glossary.md`** (que ya decían 3 rondas), en vez de con un detalle del proposal que ningún requisito de la cátedra exige.
- El roadmap pierde su slice de más riesgo (Slice 11: swaps manuales + AUTO_DNF + historial) y gana tiempo para Slice 13, que es donde vive la mayor parte del trabajo restante.

### Negative / tradeoffs

- **Desvío del `proposal.md` aprobado** (línea 21 y CUU de Regularidad, línea 175). Mitigación: aviso a la cátedra antes de la entrega + párrafo en el informe. Riesgo evaluado como bajo: ningún requisito del README de la cátedra depende de la reserva.
- **Migration destructiva**: se dropea `driver_swaps` y una columna de `fantasy_teams`. Aceptable — no hay datos reales, solo DB de dev y de tests.
- **Toca código de Slice 5/6** (`draft.service.ts`, `draft.test.ts`, `draft.gateway.test.ts`): ~14 referencias en tests que asumen 4 rondas / `totalPicks = miembros × 4`.
- Se pierde un listado del Alcance Adicional Voluntario ("historial de swaps"). Voluntario: sin impacto en la nota.

### Risks

- **Que la cátedra objete el desvío en el oral.** Mitigación: comunicarlo antes, con este ADR como respaldo — la decisión está razonada contra la rúbrica, no improvisada.
- **Que alguien reintroduzca la reserva "porque el proposal lo dice"** sin leer este ADR. Mitigación: el comentario de cabecera de `draft.service.ts` apunta acá; `glossary.md` y `domain-entities.md` quedan sincronizados.

---

## Implementación (checklist del PR `feat/draft-3-rondas`)

- [ ] `draft.service.ts`: `TOTAL_ROUNDS = 3`, `SLOT_BY_ROUND` sin `reserveDriverId`, `resetDraft` sin `reserveDriverId`, comentario de cabecera reescrito
- [ ] `schema.prisma`: quitar `reserveDriverId` + relación `ReserveDriver`, `Driver.teamsAsRes / swapsDropped / swapsActivated`, `Race.driverSwaps`, `FantasyTeam.driverSwaps`, `model DriverSwap`, enums `SwapSlot` / `SwapType` → migration `remove_reserve_and_driver_swap`
- [ ] `leagues.service.ts`: `fantasyTeamSelect` sin `reserveDriverId`; helper `maxMembersForSeason`; validación en `createLeague` / `updateLeague`
- [ ] `draft.service.ts`: guard `TOO_MANY_MEMBERS_FOR_DRAFT` en `startDraft`
- [ ] `drivers.service.ts:72`: chequeo de dependencias sin `reserveDriverId`
- [ ] `tests/setup.ts`: quitar `TRUNCATE driver_swaps`
- [ ] `smoke-slice-4.ts`: sin `reserveDriverId`
- [ ] Tests: `draft.test.ts`, `draft.gateway.test.ts`, `leagues.test.ts` (rondas, `totalPicks`, shape de `/teams/me`, nuevos 409)
- [ ] Docs: `CLAUDE.md`, `glossary.md`, `domain-entities.md`, `data-model.mmd`, `api-endpoints.md`, `error-codes.md`, `roadmap.md` (Slice 11 → eliminado; Slice 9 sin "mejor 2 de 3")
- [ ] Linear: reescribir BOX-14, cancelar BOX-8 + milestone "Slice 11 — DriverSwap"

---

## References

- Linear BOX-14 (tope de miembros) y BOX-15 (rutas protegidas — decidido por rúbrica, no por este ADR).
- [`docs/proposal.md`](../proposal.md) líneas 21, 46–49, 129–134, 175, 189.
- [`docs/domain-entities.md`](../domain-entities.md) §DraftPick, §FantasyTeam (versión previa a este ADR — describían 3 rondas y reserva por waiver).
- Rúbrica: [utnfrrodsw/tp — README](https://github.com/utnfrrodsw/tp), secciones _Requisitos Funcionales_ y _Requisitos Técnicos – Backend_.
