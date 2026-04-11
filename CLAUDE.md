# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BoxBox is a Formula 1 Fantasy League web app — a university project (TP) for Desarrollo de Software at UTN FRRO. Users create/join private leagues, participate in a live snake draft to build a team (2 starter drivers, 1 reserve, 1 constructor), and compete across the F1 season with real race results.

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS (Vite, deployed to Vercel)
- **Backend**: Express + TypeScript (deployed to Railway)
- **Database**: PostgreSQL + Prisma ORM
- **Real-time**: Socket.io for live draft
- **Testing**: Vitest + Playwright
- **External APIs**: Jolpica-F1 + OpenF1 for real race data sync

## Development Commands

```bash
# Backend
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev                # http://localhost:3000

# Frontend
cd frontend
npm install
cp .env.example .env
npm run dev                # http://localhost:5173
```

## Architecture

### Data Model

Full ER diagram in `docs/data-model.mmd`. Key entities:

- **User → LeagueMember → FantasyTeam**: a user joins a league as a member, each member owns one fantasy team
- **League**: private, invite-code based, max 11 members, tied to a Season. Has a DraftPick history
- **FantasyTeam**: 2 starter drivers + 1 reserve + 1 constructor. Supports DriverSwap (manual before lockDate, or auto on DNF)
- **Race → RaceResult / ConstructorResult**: real F1 results fetched from external APIs
- **Prediction**: pre-race predictions (winner, pole, top constructor) locked before qualifying
- **LeagueStanding**: snapshot of points after each race

Soft deletes on Driver, Constructor, Circuit. Entities use `externalId` for syncing with F1 APIs.

### API Design

All endpoints prefixed `/api/v1/`. Full spec in `docs/api-endpoints.md`.

- Standard JSON envelope: `{ data, meta }` for success, `{ error: { code, message, status } }` for errors
- Pagination on all list endpoints: `?page=1&limit=20`
- Auth: JWT with httpOnly refresh token cookie
- Middleware stack: Helmet → CORS → Rate limiter → JWT → Role checks → Zod validation
- Role-based access: `requireAdmin`, `requireLeagueMember`, `requireLeagueOwner`

### Draft System (Core Epic)

Snake draft via Socket.io (namespace `/draft`):
- JWT auth in handshake
- 60-second timer per pick, auto-pick on timeout
- 4 rounds: free category selection per round (driver or constructor)
- Picks are exclusive within a league
- Events: `draft:state`, `draft:pick`, `draft:update`, `draft:timer`, `draft:complete`, `draft:pause/resume`

### Scoring System

Drivers: F1-style points (25-18-15-12-10-8-6-4-2-1) + fastest lap (+5) + gained 5+ positions (+3) + DNF (-10) / DSQ (-15). Constructor: sum of both real drivers' points. Predictions: winner (+10), pole (+8), top constructor (+12). Reserve auto-subs on DNF; best 2 of 3 driver scores count.

## Language

The project documentation and UI are in Spanish. Code (variables, functions, comments) should be in English.
