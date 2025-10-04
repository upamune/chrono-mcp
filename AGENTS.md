# Repository Guidelines

## Project Structure & Module Organization
- Source TypeScript lives under `src/`. Chrono logic sits in `src/chrono` (parser, types, export surface), and the Cloudflare Worker entrypoint is `src/worker/handler.ts`.
- Tests reside in `test/` using Bun's runner; mirror the source layout and use descriptive filenames like `parser.test.ts`.
- Configuration files include `wrangler.jsonc` for Cloudflare routes/bindings, `tsconfig*.json` for worker/IDE settings, `mise.toml` for tool versions, and `bun.lock` to pin dependencies.

## Build, Test, and Development Commands
- `bun install` installs dependencies (Bun is the default package manager).
- `bun run dev` delegates to `wrangler dev` to emulate the Worker locally.
- `bun run type-check` invokes `tsc` against `tsconfig.worker.json` without emitting JS; run it before merging schema or type changes.
- `bun test` executes the Bun test suite; `bun run test:watch` re-runs on file changes.
- `bun run deploy` calls `wrangler deploy` to publish to Cloudflare Workers; confirm `wrangler` authentication first.

## Coding Style & Naming Conventions
- TypeScript targeting ES modules; prefer named exports (`parseDateTime`, etc.) and central re-exports via `src/chrono/index.ts`.
- Use two-space indentation, trailing semicolons, and double quotes to match the existing codebase.
- Keep functions small and composable; add focused JSDoc when logic is not obvious (see helper utilities in `parser.ts`).
- Place shared types in `src/chrono/types.ts`; name types/interfaces with PascalCase and properties with camelCase.

## Testing Guidelines
- Add Bun tests under `test/` with `*.test.ts` naming. Group related scenarios with `describe` blocks.
- Cover success paths and error handling (invalid references, timezone offsets, ranges). Include timezone edge cases whenever they are relevant.
- Run `bun test` and `bun run type-check` before opening a PR; document any skipped tests with justification.

## Commit & Pull Request Guidelines
- Use Conventional Commits (`feat:`, `fix:`, `chore:`) for clarity until the history dictates otherwise; keep each commit focused.
- Pull requests should include a purpose summary, key implementation notes, manual test results, and any Cloudflare configuration updates.
- Link issues or tasks where applicable and attach request/response samples or screenshots when they aid review.
