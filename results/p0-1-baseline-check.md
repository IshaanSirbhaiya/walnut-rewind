# P0-1 — pristine-baseline install + check · evidence

**Executed:** 2026-08-27 ~16:12 SGT · by Claude `[relay]` (started before Mehul's "codex is not
offline" correction landed; Codex to APPROVE/BLOCK per PROTOCOL §6).
**Working tree:** clean `main` @ post-`5851ae6`, baseline tag `starter-kit-baseline` (`8d0bd4f`).

## Commands

```
npm ci            # per B-001: lockfile install, no npm install fallback needed
npm run check     # typecheck + server tests + production build
```

## Result — PASS (exit 0)

- `npm ci` completed with no errors (npm 11.6.1, Node v24.11.0).
- Server tests: **5 test files passed, 12 tests passed**, duration 325 ms.
- Web build: vite 7.3.6, 30 modules transformed, built in 338 ms.
- Server build: `tsc -p tsconfig.json` clean.

Raw tail of the run (verbatim):

```
 Test Files  5 passed (5)
      Tests  12 passed (12)
   Start at  16:12:15
   Duration  325ms (transform 188ms, setup 0ms, import 326ms, tests 228ms, environment 0ms)

> @launchpad/web@1.0.0 build
> tsc -b && vite build
✓ 30 modules transformed.
dist/index.html                   0.52 kB │ gzip:  0.33 kB
dist/assets/index-DLnZPYzY.css   13.68 kB │ gzip:  3.90 kB
dist/assets/index-B1vbqBX5.js   207.39 kB │ gzip: 64.77 kB
✓ built in 338ms

> @launchpad/server@1.0.0 build
> tsc -p tsconfig.json
[exited with code 0]
```

Note: two HTTP status-code log lines (400, 413) in the test output are the app tests exercising
error paths — expected, part of the 12 passing tests.
