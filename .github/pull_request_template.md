<!-- Plantilla auto-cargada al crear PRs en GitHub. Borrá las secciones que no apliquen. -->

## Qué cambia

<!-- 1-3 líneas explicando QUÉ hace este PR, no cómo. Tipo: "Agrega CRUD de Auth con register/login/me y middleware JWT." -->

## Por qué

<!-- 1-2 líneas con el motivo. Si está en el roadmap, linkear: "Roadmap slice 1 — bloqueante de slices 2+." -->

- Roadmap slice: <!-- N o N/A si es bug fix / docs / infra -->

## Tipo

- [ ] Feature (slice del roadmap)
- [ ] Bug fix
- [ ] Refactor (sin cambio funcional)
- [ ] Docs / convenciones
- [ ] Infra / tooling
- [ ] Otro: …

## Checklist

- [ ] Tests verdes: `npm test -- --run` en `backend/`
- [ ] Lint limpio: `npm run lint`
- [ ] Migración SQL revisada (si tocás `schema.prisma`) y aplicada en mi DB local
- [ ] `setup.ts` actualizado con `TRUNCATE` de tabla nueva (si aplica)
- [ ] `docs/api-endpoints.md` reflejado con tag de status (si toqué endpoints)
- [ ] `docs/error-codes.md` actualizado (si agregué códigos de error nuevos)
- [ ] `docs/data-model.mmd` + `docs/glossary.md` + `docs/domain-entities.md` sincronizados (si agregué/cambié entidades)
- [ ] ADR escrita en `docs/adr/` (si la decisión es difícil de revertir + sorprendente)
- [ ] Smoke manual: `npm run dev` y hit del endpoint nuevo con `curl` o cliente HTTP

## Smoke test

<!-- Pegá el comando + el output esperado para que el reviewer pueda reproducir.

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@boxbox.com","password":"hunter2","name":"Test"}'
# 201 + { data: { user, accessToken } }
```

-->

## Notas para el reviewer

<!-- ¿Algo no obvio del diff que vale la pena flagear? ¿Hacks temporales? ¿Decisiones que no merecen ADR pero que el reviewer debería saber? -->
