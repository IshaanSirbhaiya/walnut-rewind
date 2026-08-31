# P2 exit smoke — live demo backbone (2026-08-27)

Executed by Claude `[relay]`. Production POC on the container path, real Ark credentials.
One real Codex model run (Research Agent); everything else exercised through the REST surface
without model calls to preserve quota. The Strategy-side capsule flow (granted agent's capsule
carries the evidence ref; ungranted agent gets a DENY-recorded empty capsule; claim reaches the
rendered prompt) is proven by `agent-service.test.ts`'s integration test — running it live would
cost a second ~50k-token model run for information the test already gives; stated honestly here
rather than silently skipped.

## Live flow

1. **Research Agent** `58509d3b…` — real container Run `40749db4…` executed one bash command:
   wrote `launch-plan.txt` ("Launch date is September 14.\n") and `.walnut/outbox.json`
   proposing one INTERNAL evidence with scopes `["project:launch:read"]`, quote offsets 0–28.
   Run completed, output `DONE`.
2. **Outbox ingestion (live)**: middleware minted `ev_7408df89…`, status ACTIVE, citation
   non-null (byte-exact verify passed on the real workspace file). `GET /api/runs/:id/evidence`
   → `produced: 1` with the exact claim. Run chain: `{ok: true, eventCount: 12}` — includes
   `run.requested`, `capsule.finalized`, runtime events, `evidence.created`,
   `evidence.outbox_processed`, `run.completed`.
3. **Share before sender grant** → `{"result":"DENY","reasonCode":"AGENT_SCOPE_MISSING",
   "senderDecisionId":"auth_d891e899…","recipientDecisionId":null,"issuedGrantIds":[]}` —
   the denial is a recorded, surfaceable decision (doc 04 §21 shape).
4. **Operator grant** `share project:launch:*` issued to Research Agent via
   `POST /api/agents/:id/grants` → `grant.issued` chained on the governance ledger.
5. **Share again** → ALLOW; both decision ids recorded un-redacted (the walnut-id redactor
   exemption at work); one narrow transferred grant minted for Strategy Agent:
   `consume project:launch:read by share:58509d3b…` (visible via `GET /api/agents/:id/grants`).
6. **Governance chain** `{ok: true, eventCount: 3}` (grant.issued + 2 evidence.shared) —
   verified.
7. **Dependencies route (live)**: graph over real stores — nodes
   `{run:4, agent:4, principal:2, authorization_decision:4, agent_version:2,
   context_capsule:2, evidence:1, source:1}`, 10 edges, 0 dangling.

## Suite state at this smoke

`npm run check` exit 0; 19 files / 146 server tests green (commit `bf1defe` tip).

## Honesty notes

- The Research run's own capsule was empty (no prior evidence existed to authorize) — correct,
  not a gap: evidence enters capsules only after it exists and is authorized.
- The denied-payroll-canary path (INV-2 with a real denied candidate) is proven in
  `capsule.test.ts` and the agent-service integration test; the live demo fixture with the
  canary is P3-X2 work.
- `walnutRunState`/`attestation` are Phase-3 and the overview route says so in-band.
- UI panels (P2-X2) were built and type-check/build green; interactive browser verification is
  part of the P3 demo rehearsal, not claimed here.
