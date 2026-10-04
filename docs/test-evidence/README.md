# Evidencia de ejecución de tests automáticos

Salida cruda de las suites, capturada tal cual la imprime el runner. Es el entregable
"evidencia de ejecución de test automáticos" que pide la cátedra
([utnfrrodsw/tp](https://github.com/utnfrrodsw/tp), `docs.md`).

## Evidencia de la entrega — 2026-09-25

Las tres suites completas, corridas sobre el estado actual de `dev`:

| Archivo | Suite | Resultado |
| :------ | :---- | :-------- |
| [`entrega-backend-full.txt`](./entrega-backend-full.txt) | Vitest + Supertest contra Postgres real | **260 tests, 12 archivos, todo verde** |
| [`entrega-frontend-unit.txt`](./entrega-frontend-unit.txt) | Vitest + Testing Library | **65 tests, 15 archivos, todo verde** |
| [`entrega-frontend-e2e.txt`](./entrega-frontend-e2e.txt) | Playwright contra backend + frontend reales | **4 tests, todo verde** |

Cubre los dos requisitos de Aprobación: backend pide 1 test automatizado por integrante
más 1 de integración (los 260 son de integración, contra la DB de verdad — ver
[ADR-0003](../adr/ADR-0003-real-db-integration-tests.md)); frontend pide mínimo 1 test
unitario de componente y 1 end-to-end.

## Snapshots históricos por slice

Los `slice-*.txt` son capturas del momento en que cada slice se terminó. Se conservan como
registro de avance; para el estado actual valen los tres de arriba.

## Cómo regenerar

```bash
# backend — OJO: trunca la DB local en cada test, re-seedeá después
cd backend && npm test -- --run
npx prisma db seed

# frontend unitarios
cd frontend && npm test

# frontend e2e — necesita backend corriendo y DB seedeada
cd backend && npm run dev          # en otra terminal
cd frontend && npm run e2e
```
