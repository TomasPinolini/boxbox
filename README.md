# BoxBox

Fantasy League de Fórmula 1 — Trabajo Práctico para Desarrollo de Software (UTN FRRO).

## Descripción

BoxBox es una aplicación web de Fantasy League de Fórmula 1. Los usuarios crean o se unen a ligas privadas, participan en un draft en vivo con formato snake para armar su equipo, y compiten a lo largo de toda la temporada. Los resultados reales de cada Gran Premio se obtienen automáticamente desde APIs públicas de F1 para calcular puntajes.

### Funcionalidades principales

- **Ligas privadas**: creá una liga e invitá amigos con un código de invitación (máximo 11 jugadores)
- **Snake Draft en vivo**: draft en tiempo real con timer por pick. Cada jugador arma su equipo: 2 pilotos titulares, 1 reserva y 1 escudería
- **Scoring automático**: los resultados de cada carrera se procesan automáticamente usando datos reales de F1
- **Predicciones**: antes de cada carrera, predecí el ganador, la pole y el equipo con más puntos para sumar bonus
- **Recaps de carrera**: después de cada GP, revisá cómo rindió tu equipo con un desglose detallado
- **Gestión de lineup**: intercambiá tu piloto reserva por un titular antes de la clasificación

## Stack Técnico

| Capa          | Tecnología                                 |
| ------------- | ------------------------------------------ |
| Frontend      | React + TypeScript + Tailwind CSS          |
| Backend       | Express + TypeScript                       |
| Base de datos | PostgreSQL + Prisma ORM                    |
| WebSocket     | Socket.io (draft en vivo)                  |
| Testing       | Vitest + Playwright                        |
| Deploy        | Vercel (frontend) + Railway (backend + DB) |
| APIs externas | Jolpica-F1 + OpenF1                        |

## Instalación

### Prerrequisitos

- Node.js 22+
- PostgreSQL 17+
- npm

### Setup

```bash
# Clonar el repositorio
git clone https://github.com/TomasPinolini/boxbox.git
cd boxbox

# Backend (único stack ejecutable por ahora)
cd backend
cp .env.example .env       # configurar DATABASE_URL, JWT_SECRET, etc.
npm install
npx prisma migrate dev     # crear tablas en la DB
npx prisma db seed         # poblar con data de F1 2026 (idempotente)
npm run dev                # iniciar server en http://localhost:3000
```

Para una guía paso-a-paso (incluye instalación de Postgres, conexión con TablePlus y gotchas comunes), ver [`docs/tutorial.md`](./docs/tutorial.md).

### Variables de entorno

Se incluyen archivos `.env.example` en cada directorio (`/backend` y `/frontend`) con las variables necesarias. Copiar a `.env` y completar con los valores correspondientes.

**Backend**: URL de la base de datos, secretos JWT, URLs de APIs externas (Jolpica, OpenF1), puerto del servidor.

**Frontend**: URL de la API del backend, URL del WebSocket.

## Documentación

La documentación del proyecto se encuentra en el directorio [`/docs`](./docs/):

- [Propuesta del TP](./docs/proposal.md)
- [Modelo de datos (Mermaid)](./docs/data-model.mmd)
- [Endpoints de la API](./docs/api-endpoints.md)
- [Setup local + seed](./docs/tutorial.md)

## Integrantes

| Legajo | Nombre                 |
| ------ | ---------------------- |
| 52265  | Pinolini, Tomás |
| 51070  | Rivero, Tomás |

## Gestión del Proyecto

- **Metodología**: Kanban
- **Herramienta de tracking**: [GitHub Projects](https://github.com/TomasPinolini/boxbox/projects)
- **Repositorio**: [github.com/TomasPinolini/boxbox](https://github.com/TomasPinolini/boxbox)
