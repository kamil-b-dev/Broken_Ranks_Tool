# Repository Guidelines

## Project Structure & Module Organization

This repository contains two independently runnable modules:

- `Broken_Ranks_Tool_Backend/` — Spring Boot API, organized by feature (`equipment`, `optimization`, `app_data`) with shared `core` entities, controllers, services, and utilities. Java tests are under `src/test/java`.
- `Broken_Ranks_Tool_Frontend/` — React/Vite UI. Components live in `src/components`, reusable hooks in `src/hooks`, API access in `src/api`, and game data/rules in `src/constants` and `src/utils`.
- `broken_ranks.db` — SQLite development data. The backend also contains its local database copy; avoid committing generated or personal data changes without context.

## Build, Test, and Development Commands

Run commands from the relevant module directory:

```text
cd Broken_Ranks_Tool_Backend
.\mvnw.cmd spring-boot:run   # start the API
.\mvnw.cmd test              # run backend tests
.\mvnw.cmd package           # compile and package the backend

cd ..\Broken_Ranks_Tool_Frontend
npm install                       # install locked dependencies
npm run dev                       # start Vite with hot reload
npm run build                     # create the production bundle
npm run lint                      # run ESLint
npm run docs                      # generate JSDoc output
```

## Coding Style & Naming Conventions

Use four-space indentation in Java and the existing ESLint-compatible JavaScript/JSX style. Name React components and Java classes in PascalCase; use camelCase for variables, methods, hooks, and API functions. Keep frontend files focused by feature and preserve the backend package layering. Run `npm run lint` before submitting UI changes. Add Javadoc or JSDoc for public APIs and non-obvious game or optimization rules.

## Testing Guidelines

Backend tests use Spring Boot’s JUnit test starter and follow `*Tests.java` naming (for example, `BrokenRanksToolApplicationTests.java`). Run `.\mvnw.cmd test` after backend changes. No frontend test runner or coverage threshold is configured; at minimum, run lint and a production build, then manually verify affected UI flows.

## Commit & Pull Request Guidelines

Recent commits use concise, action-oriented descriptions, often grouping related changes with ` - ` (for example, `Dodanie ... - Naprawa ...`). Follow that style, keep each commit focused, and explain behavior changes clearly. Pull requests should describe the user-visible effect, identify backend/frontend impacts, mention validation commands, link related issues when available, and include screenshots for UI changes. Do not include secrets or unrelated database edits.

## Configuration & Data Notes

`application.properties` uses a relative SQLite path and has SQL logging enabled for development. Start the backend from `Broken_Ranks_Tool_Backend/` so it uses the intended database copy, and treat database files as local development state unless a data migration is explicitly part of the change.
