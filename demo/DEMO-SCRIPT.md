# Walnut Rewind — 3-minute demo script

Written for the local container path (`npm run poc`, Colima). Every number and artifact shown is
produced live; nothing is mocked on stage. Budget: one Research model run + one Strategy model
run + one reconcile run (~110k Ark tokens measured); everything else is API/UI only.

**Rehearsal status.** The backend path was rehearsed end-to-end on 2026-08-28 and every beat
below passed — evidence: `results/p3-demo-rehearsal.md`. That rehearsal was driven through the
HTTP API. **The live UI has still never been driven**, so the visual pass remains a blocking
item on `coordination/gates/gate-P3-joint.md`.

## Pre-flight — do all four, in order (each one comes from a real rehearsal failure)

1. **Restart the server on the current build.** A server left running from an earlier session
   serves the pre-fix build; in rehearsal that exposed the configured endpoint id from
   `/api/system`. Stop it, then `npm run poc`, then confirm `/api/system` reports
   `"arkModel": null`.
2. **Reset the Walnut state store**, or the counts below will not match. State accumulates
   across sessions: in rehearsal the Strategy Agent consumed **two** launch claims (a leftover
   "September 14" plus the fresh "October 1") and opened its answer by reporting the
   contradiction. Correct behaviour, wrong demo.
   ```bash
   # stops the server first; the store is a plain directory
   rm -rf "$HOME/.volc-agent-launchpad/data/walnut"
   rm -rf "$HOME/.volc-agent-launchpad/workspaces"/*/.walnut
   ```
   Re-seed with `scripts/walnut-demo-seed.sh` afterwards.
3. **Seed the agents:** `scripts/walnut-demo-seed.sh`.
4. **Grant the Strategy Agent `project:launch:read` only** — never `project:payroll:*`.

## 0:00–0:20 — Baseline platform (HC-1)

Show the untouched Launchpad UI: agents list, Playground chat working. Say: *"This is the
starter kit, unmodified — Walnut is middleware underneath it, not a new app."*

## 0:20–0:50 — Verified Evidence

Run the **Research Agent** with the seeded prompt (writes `launch-plan.txt` and proposes
evidence through `.walnut/outbox.json` — including a payroll claim carrying a planted canary).
Open the Walnut drawer → Evidence tab on the completed run:

- launch claim **ACTIVE**, citation **VERIFIED** — say: *"Verified means the middleware
  byte-compared the quote against the workspace file. Off by one byte, it rejects, whatever
  the model claims."*
- The model never wrote to the evidence store — it proposed; the middleware verified and minted.

## 0:50–1:20 — Authorization before context

Run the **Strategy Agent** ("Summarize our launch plan"). Open its Walnut drawer → Overview:

- Capsule card: policy revision, capsule hash, 1 evidence in, **1 denied**.
- Evidence tab: launch claim consumed under the `project:launch:read` grant; payroll **DENIED —
  decision recorded**.
- Say the line: **"The downstream model never received the payroll data."** (If challenged:
  the canary in the denied claim is grep-ably absent from the rendered prompt, the capsule
  file, and the ledger — that's INV-2, tested and shown live in the chain view.)

## 1:20–1:40 — The Context Capsule

Stay on Overview: *"This capsule is the exact knowledge state the agent executed against —
agent version, principal, policy revision, every evidence version with its authorization
decision and source hash, sealed under this capsule hash. Immutable: correcting it means a new
run, never an edit."*

## 1:40–2:10 — Invalidation and blast radius

Evidence tab → **Compromise** the launch evidence ("source integrity incident"):

- New evidence version COMPROMISED; the old version still queryable (append-only).
- Response shows the blast radius; History tab: Strategy run is **TAINTED**, with the trigger
  evidence recorded. Dependencies tab: the TAINTS edge, live from the rebuildable graph.

## 2:10–2:40 — Rewind

Overview → **RECONCILE** on the tainted run:

- A **new** run executes with a fresh capsule — the compromised evidence is denied this time
  (status-based DENY, recorded).
- Old run: state **RECOVERED**, linked `RECOVERED_BY` the new run id. Old output, capsule, and
  chain untouched. *"Recovery is a new run. History is never rewritten."*

## 2:40–2:55 — Tamper detection (backup wow, or in main flow if time allows)

Overview → **Verify chain**: both chains verify. Then the tamper demo — the request **must**
carry `corruptSequence`, or it silently returns a plain verify and looks like nothing happened:

```bash
curl -sS -X POST -H 'Content-Type: application/json' \
  -d '{"corruptSequence":9}' \
  http://localhost:3000/api/runs/<STRATEGY_RUN_ID>/verify-tamper
```

Rehearsed result: `original {ok:true}` / `corrupted {ok:false, brokenAtSequence:9,
reason:"hash_mismatch"}`, and the real chain still verifies afterwards.
*"Detection without ever touching real history."*

## 2:55–3:00 — Close

> "Observability tells you what an agent did. Walnut Rewind tells you what it was allowed to
> know, why it believed it, who inherited that belief, and what must be rebuilt when the belief
> becomes wrong."

## Fallback ladder (if something breaks live)

1. Ark/quota failure during a model run → switch to whatever evidence is already in the store
   from an earlier real run (this presupposes at least one prior run has been executed and its
   evidence persisted — verify before going on stage). Every Walnut surface (authorization,
   capsule, blast radius, reconcile-refusal on CLEAN) works without a model call except the two
   seeded runs.
2. UI hiccup → the same story via curl against the routes (all shown in
   `results/p2-exit-smoke.md`).
3. Total loss → `npx vitest run src/walnut/e2e.test.ts --root apps/server` on screen: the whole
   thesis as one test.
