# Contributing To Arena

Thanks for helping improve Arena. This project is intended to be approachable for new contributors while still keeping game logic reliable and multiplayer-safe.

## Ways To Contribute

- Add a new game or a variant of an existing game
- Improve rules, tips, and game-card preview metadata
- Fix bugs in room lifecycle, reconnects, scoring, or game state
- Improve accessibility, keyboard support, or mobile layout
- Add focused tests for backend game engines or frontend room behavior
- Improve documentation and project visuals

## Local Setup

Start the backend:

```bash
cd backend
cargo run
```

Start the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3201`.

## Validation Before A Pull Request

Run backend tests:

```bash
cd backend
cargo test
```

Run frontend tests and build:

```bash
cd frontend
npm test -- --run
npm run build
```

If you only changed one game, include the focused test command you used in the pull request notes.

## Code Style

- Keep changes focused and avoid unrelated refactors.
- Prefer existing patterns before adding new abstractions.
- Keep game rules authoritative in the Rust backend.
- Never send hidden player information to the wrong client.
- Add comments only when they clarify non-obvious logic.
- Update `frontend/src/lib/gameMetadata.ts` when a game name, rules, tips, route, or preview changes.

## Adding A Game

A complete game normally needs:

- Backend engine file in `backend/src/games/`
- `GameAction` protocol entry in `backend/src/protocol.rs`
- Lobby integration in `backend/src/lobby.rs`
- Frontend route under `frontend/src/app/games/`
- Metadata entry in `frontend/src/lib/gameMetadata.ts`
- Tests for the backend rules and any risky frontend flow

Hidden-information games should send individualized state for each player. Avoid relying on the frontend to hide data it should never receive.

## Pull Request Checklist

- The game or fix works locally
- Tests pass or any failing pre-existing tests are clearly noted
- Documentation is updated if behavior changed
- UI changes work on mobile and desktop widths
- New user-facing text is short and clear
- No secrets, API keys, deployment credentials, or generated build output are committed

## Reporting Bugs

Please include:

- What you expected to happen
- What actually happened
- Game name and variant
- Browser and operating system
- Steps to reproduce
- Console or backend logs if relevant

## Community Standards

Be respectful, practical, and specific. Assume good intent, explain tradeoffs, and keep review comments focused on the code and user experience.
