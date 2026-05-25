# Agent: project-scaffold

**Wave:** 0
**Depends on:** none
**Working directory:** `C:\Users\socoo\.projects\01 Steel Beam\steel-beam-tool`

## Responsibility
Configure the Vite + React + TypeScript project for the build. The Vite `npm create` and `npm install` are run by the orchestrator before this agent fires.

## Files produced / modified
- `vite.config.ts` — add `@/` path alias to `src/`, add `@tailwindcss/vite` plugin
- `tsconfig.json` / `tsconfig.app.json` — add matching `paths` alias `@/* → src/*`
- `src/index.css` — Tailwind v4 import line (`@import "tailwindcss";`) replacing default content
- `src/App.tsx` — stub returning `<div>Steel Beam Design Tool</div>` (will be overwritten in Wave 5)
- Create empty directories: `src/components/`, `src/engineering/as4100/`, `src/engineering/as1170/`, `src/engineering/sections/`, `src/types/`, `src/utils/`, `src/hooks/`

## Implementation notes
- Tailwind v4 uses the Vite plugin model — no `tailwind.config.js`/`postcss.config.js` is required.
- Add devDependency `@types/node` so `vite.config.ts` can use `path` and `__dirname`.

## Acceptance criteria
- `npx tsc --noEmit` runs cleanly against the stub `App.tsx`.
- `npm run dev` boots the dev server.
- Tailwind utility class (e.g. `bg-blue-500`) is rendered in the stub.
