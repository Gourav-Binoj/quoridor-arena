# Quoridor Arena

Quoridor Arena is a multiplayer Quoridor platform. This repository is being built in phased milestones with a production-minded architecture and server-authoritative game logic.

## Repository status

This repository was empty except for a placeholder README when implementation began. The project is being scaffolded with a modern Next.js + TypeScript + Tailwind application and a pure game-engine-first architecture.

## Architecture plan

- Frontend: Next.js App Router + TypeScript + Tailwind CSS
- Real-time: Supabase Realtime / server-authoritative actions, with a room/game service abstraction
- Auth: Supabase Auth with Google OAuth
- Database: Supabase PostgreSQL with RLS and migrations
- Game rules: deterministic, unit-testable engine separated from UI and network code
- Deployment: Vercel + Supabase

## Phase 1 milestone: complete

This milestone includes the core Quoridor engine and a simple local play surface to verify rule correctness and board behavior.

### Included

- Board state and player setup for a 9x9 standard game
- Movement validation, wall placement checks, turn order, and win detection
- Path preservation checks using BFS-based reachability analysis
- A locally testable game state reducer and public action API
- Unit tests covering initial setup, legal moves, illegal moves, wall rejection, and win conditions

## Planned phases

1. Phase 1: Core game engine and rule tests
2. Phase 2: Authentication and persistent user profiles
3. Phase 3: Private rooms and matchmaking
4. Phase 4: Realtime game synchronization and reconnect handling
5. Phase 5: Landing page, lobby, leaderboard, profile, and match history
6. Phase 6: Security audit, production hardening, and deployment docs

## Local development

```bash
npm install
npm run test
npm run dev
```

## Environment variables

See `.env.example` for required values.

## Notes

This project intentionally avoids mock game logic or client-side trust of multiplayer outcomes. The server must remain authoritative in production.
