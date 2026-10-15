# BoxBox

Fantasy League de Fórmula 1 — Trabajo Práctico para Desarrollo de Software (UTN FRRO).

## Descripción

BoxBox es una aplicación web de Fantasy League de Fórmula 1. Los usuarios crean o se unen a ligas privadas, participan en un draft en vivo con formato snake para armar su equipo, y compiten a lo largo de toda la temporada. Los resultados reales de cada Gran Premio se obtienen automáticamente desde APIs públicas de F1 para calcular puntajes.

### Funcionalidades principales

- **Ligas privadas**: creá una liga e invitá amigos con un código de invitación (máximo 11 jugadores)
- **Snake Draft en vivo**: draft en tiempo real con timer por pick. Cada jugador arma su equipo: 2 pilotos y 1 escudería
- **Scoring automático**: los resultados de cada carrera se procesan automáticamente usando datos reales de F1
- **Predicciones**: antes de cada carrera, predecí el ganador, la pole y el equipo con más puntos para sumar bonus
- **Recaps de carrera**: después de cada GP, revisá cómo rindió tu equipo con un desglose detallado

## Stack Técnico

| Capa          | Tecnología                                 |
| ------------- | ------------------------------------------ |
| Frontend      | React + TypeScript + Tailwind CSS          |
| Backend       | Express + TypeScript                       |
| Base de datos | PostgreSQL + Prisma ORM                    |
| WebSocket     | Socket.io (draft en vivo)                  |
| Testing       | Vitest                                     |
| Deploy        | Render (backend) + Vercel (frontend) + Supabase (Postgres) |
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

# Backend
cd backend
cp .env.example .env       # configurar DATABASE_URL, JWT_SECRET, etc.
npm install
npx prisma migrate dev     # crear tablas en la DB
npx prisma db seed         # poblar con data de F1 2026 (idempotente)
npm run dev                # iniciar server en http://localhost:3000
```

```bash
# Frontend (con el backend corriendo en otra terminal)
cd frontend
cp .env.example .env       # VITE_API_URL, VITE_SOCKET_URL apuntando al backend
npm install
npm run dev                # iniciar en http://localhost:5173
```

Para una guía paso-a-paso (incluye instalación de Postgres, conexión con TablePlus y gotchas comunes), ver [`docs/tutorial.md`](./docs/tutorial.md).

### Variables de entorno

Se incluyen archivos `.env.example` en cada directorio (`/backend` y `/frontend`) con las variables necesarias. Copiar a `.env` y completar con los valores correspondientes.

**Backend**: URL de la base de datos, secretos JWT, URLs de APIs externas (Jolpica, OpenF1), puerto del servidor.

**Frontend**: URL de la API del backend, URL del WebSocket.

## Documentación

El punto de entrada es [`docs/README.md`](./docs/README.md): mapea cada entregable que pide la
cátedra al archivo que lo contiene, y trae las listas de lectura de onboarding. El resto de la
documentación vive en el directorio [`/docs`](./docs/):

- [Propuesta del TP](./docs/proposal.md)
- [Modelo de datos (Mermaid)](./docs/data-model.mmd)
- [Endpoints de la API](./docs/api-endpoints.md)
- [Setup local + seed](./docs/tutorial.md)

## Integrantes

| Legajo | Nombre          | Contacto                    |
| ------ | --------------- | --------------------------- |
| 52265  | Pinolini, Tomás | tomaspinolini2003@gmail.com |
| 51070  | Rivero, Tomás   | tomasrivero16@gmail.com     |

Para coordinar la defensa oral, cualquiera de los dos mails sirve.

## Gestión del Proyecto

- **Metodología**: Kanban
- **Herramienta de tracking**: [Linear](https://linear.app/pinolini/team/BOX/all) — detalle de la metodología y la bitácora en [`docs/gestion-del-proyecto.md`](./docs/gestion-del-proyecto.md)
- **Repositorio**: [github.com/TomasPinolini/boxbox](https://github.com/TomasPinolini/boxbox)
