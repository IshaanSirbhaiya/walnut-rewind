# P3 final verification (2026-08-27)

Referenced by README §12. All commands run at commit `292d865` (tip of the Phase-3 work).

## Gate command

- `npm run check` → exit 0: server + web typechecks, **25 test files / 215 tests passed**,
  web production build (vite) and server build (tsc) both green.
- `apps/server/src/walnut/e2e.test.ts` (12 of those tests) is the doc-06 §8 thesis walk:
  outbox → verified evidence → authorized capsule + denied canary → ordered redacted chain →
  compromise → blast radius → TAINTED → reconcile → RECOVERED_BY → replacement capsule denies
  the compromised evidence. Ran 3× consecutively during authoring with no flake.

## Pre-submission sweeps

- Secret scan (`git grep -F` over the tracked tree + `git log -S` over full history, against the
  configured values): `ARK_API_KEY` — zero matches anywhere. `ARK_MODEL` endpoint id — zero
  tracked files; 2 historical commits (the original P0-3 evidence commit and the commit that
  redacted it) — **mandatory history scrub before the repository flips public** (G-P0-1,
  `coordination/gates/gate-P0-joint.md`).
- Canary literal `WALNUT_CANARY_DENIED_PAYROLL_93c1e7` appears only in test fixtures,
  coordination records, and demo documentation — by design (it is a test literal, not a secret).
- HC-11 (`git diff starter-kit-baseline --name-only`, non-walnut paths): exactly the overlay
  §9.1 permitted list — `types.ts`, both runners, `runner-factory.ts`, `agent-service.ts`,
  `app.ts`, `index.ts`, `App.tsx`, `api.ts`, `styles.css`, plus their test files and README
  (upstream README preserved at `docs/UPSTREAM-README.md`). Everything else lives under
  `walnut/`.

## Live evidence earlier in the day

- Phase-1 container smoke: `results/p1-exit-smoke.md` (real run, verified chain, live redaction
  of the endpoint-id diagnostic).
- Phase-2 backbone smoke: `results/p2-exit-smoke.md` (live outbox → ACTIVE evidence; share
  DENY→grant→ALLOW; governance chain; dependencies route).
- `scripts/walnut-demo-seed.sh` smoke-run twice against a live server (idempotent) during the
  P3 relay unit.

## Open at close (not code)

- Demo rehearsal on the live UI (Mehul + script `demo/DEMO-SCRIPT.md`).
- Repo flip to public + history scrub of the endpoint id (Mehul's call, BLOCKER-2).
- External submission deadline still unconfirmed (BLOCKER-1).
- Codex return-review queue: every `[relay]` item across P1–P3 (CHANNEL A-014…A-018).
