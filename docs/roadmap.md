# Roadmap — qué falta para la entrega

Este archivo es el **hub**: lo que vale para todo el proyecto y no es ni backend ni
frontend. El detalle de cada slice vive en el carril que le corresponde:

| Carril   | Archivo                                                   |
| :------- | :-------------------------------------------------------- |
| Backend  | [`backend/docs/roadmap.md`](../backend/docs/roadmap.md)   |
| Frontend | [`frontend/docs/roadmap.md`](../frontend/docs/roadmap.md) |

> **Primera entrega: 12/10 al 16/10.** Recuperatorio 26/10–30/10; última instancia 9/11–13/11.
> Fechas de [utnfrrodsw/tp](https://github.com/utnfrrodsw/tp).
> El plan de las cuatro semanas y el reparto por integrante están en Linear (project BoxBox,
> milestone "Entrega 12/10").

**La numeración de slices es una sola secuencia compartida por los dos carriles.** No se
renumeró al partir el archivo, ni al eliminar el Slice 11 (ADR-0006). De 13a en adelante
el número dice el orden en que se descubrió el trabajo, no el de dependencia: Slice 14 y
Slice 15 no dependen de 13b. La dependencia real está en el `Blocked by` de cada slice.

---

## Now — lo que bloquea la entrega del 12/10

_(Backend Slices 1–8 completos. Frontend 13a completo. Lo de abajo sale de cruzar la rúbrica de la cátedra contra el código el 2026-09-11 — no de lo que dicen los docs.)_

### Estado contra la rúbrica (2 integrantes)

La rúbrica pide cantidades "por integrante" o "cada 2 integrantes o fracción". Somos dos: lo que dice "cada 2" se pide una vez, lo que dice "por integrante" se pide dos.

| Requisito                                               | Nivel       | Estado                                                                           |
| :------------------------------------------------------ | :---------- | :------------------------------------------------------------------------------- |
| CRUD simple ×2                                          | Regularidad | ✅ Driver, Constructor, Circuit, Season                                          |
| CRUD dependiente ×1                                     | Regularidad | ✅ Race (depende de Circuit + Season)                                            |
| Listado con filtro + detalle ×1                          | Regularidad | ✅ **Slice 14**, los dos carriles — `/drivers` y `/drivers/:id`, públicas        |
| CUU/epic ×1                                             | Regularidad | ⚠️ Draft: se ve en vivo (**13b tramo 1**, done); falta poder pickear desde la UI (tramo 2) |
| CUU/epic ×2 (uno por integrante), mínimo 2 relacionados | Aprobación  | ⚠️ Epic 1 = draft, tramo 1 done / tramo 2 sin empezar. **Epic 2 = Slices 9 + 12, sin empezar** |
| 1 test automatizado por integrante + 1 de integración   | Aprobación  | ✅ 206 tests contra Postgres real                                                |
| Backend: login 2 niveles + rutas protegidas             | Aprobación  | ✅ `requireAuth` + `requireAdmin`                                                |
| Frontend: mobile-first, 3 breakpoints                   | Regularidad | ✅ Tailwind, verificado a 375/768/1024                                           |
| Frontend: 1 test unitario de componente + 1 e2e         | Aprobación  | ✅ 48 unitarios + 2 Playwright                                                   |
| **Frontend: login con protección por niveles**          | Aprobación  | ✅ **Slice 15** — `RequireAdmin` + `/admin/results`, PR #33                      |

### Trámites de cátedra (no son slices)

- ✅ **Avisar del desvío de ADR-0006 (BOX-36)**. `proposal.md` prometió "2 pilotos titulares, 1 reserva y 1 escudería" y el juego implementado tiene 3 rondas sin reserva, según [`ADR-0006`](./adr/ADR-0006-draft-3-rondas-sin-reserva.md). Mail enviado el 2026-09-11; la constancia está en el comentario de BOX-36. Falta pegar el párrafo de desvío en el informe de la entrega cuando ese documento exista.
- ❌ **Completar los nombres de los integrantes** en `proposal.md:10-11` (siguen como `XXXXX - Apellido(s), Nombre(s)`).

---

## Reparto por epic

La rúbrica pide un CUU/epic **por integrante**, así que cada uno es dueño de uno y lo defiende en el oral:

| Epic                                           | Slices | Dueño    |
| :--------------------------------------------- | :----- | :------- |
| 1 — Draft en vivo                              | 13b    | Rivero   |
| 2 — Procesar resultados y actualizar standings | 9 + 12 | Pinolini |

Los dos se relacionan solos, que es el otro requisito: el draft arma el equipo que el scoring puntúa.

---

## Out of scope para este TP (post-cursada)

Esta sección manda sobre Linear: si un issue pide algo de acá, va a prioridad mínima. Ya pasó una vez — BOX-32 se creó pidiendo rotación de refresh tokens sin cruzarlo contra esta lista.

- Refresh token rotation con httpOnly cookies y revocación (Linear BOX-32).
- Rate limiting global y de auth.
- WebSocket reconnection con state recovery.
- Internacionalización del frontend.
- CI/CD multi-ambiente (staging vs prod).
- Notificaciones push / email.

---

## Completados

El log de slices terminados vive en cada carril:
[backend](../backend/docs/roadmap.md) y [frontend](../frontend/docs/roadmap.md).
