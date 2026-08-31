# spec 003 — Walnut service ports (cross-owner seams)

| | |
|---|---|
| **Version** | `v1.1` — §A5 (`AgentVersionResolver`) added 2026-08-27 under relay (DECISIONS entry; A-013 §3); **Codex ratification of §A5 pending on return** |
| **Status** | **FROZEN 2026-08-27** (§A + §B) — Codex ACK of the amended hunks in CHANNEL B-004. Changes now cost a DECISIONS entry + version bump. |
| **Author** | Claude, 2026-08-27 |
| **ACK §A** | Claude ☑ (author) · Codex ☑ (B-004) — frozen before `P1-X1` ✓ |
| **ACK §B** | Claude ☑ (author) · Codex ☑ (B-004) — frozen before any P2 task ✓ |
| **Source of truth** | doc 03 §§3, 7, 13, 14, 16; doc 04 §§8, 19; types per specs 001/002 |

These are the **call contracts across the ownership seam** — Codex-owned code
(`agent-service.ts` wiring, `evidence/**`, `routes/**`) calling Claude-owned code (`context/**`,
`auth/**`, `dependency/**`) and back. Interfaces here are TypeScript `interface` ports; each
side implements its own and mocks the other's in tests. All types below come from spec 001.

---

## §A — Context broker seam (freeze before `P1-X1`)

### A1. `ContextBroker.build`

```ts
interface CapsuleBuildInput {
  run: AgentRun;                          // upstream type, already persisted, status "queued"
  agent: Agent;                           // upstream type
  agentVersionId: string;
  onBehalfOfPrincipalId: string | null;   // v1 demo: from route/fixture; null = agent alone
  userPrompt: string;
}

type CapsuleBuildResult =
  | { kind: "ok";
      capsule: ContextCapsule;            // finalized, hashed, already persisted
      deniedDecisions: AuthorizationDecision[] }  // full objects for logging/UI; ids are in capsule
  | { kind: "denied";                     // the RUN may not proceed at all
      decisions: AuthorizationDecision[];
      reasonCode: AuthorizationDecision["reasonCode"];
      message: string }
  | { kind: "clarification_required";
      request: ClarificationRequest };

interface ContextBroker {
  build(input: CapsuleBuildInput): Promise<CapsuleBuildResult>;
  renderPrompt(userPrompt: string, capsule: ContextCapsule): Promise<string>;
}
```

Semantics:

- `build` authorizes **before** capsule assembly (HC-5). Evidence with an ALLOW decision enters
  `capsule.evidence`; DENY decisions land in `capsule.deniedEvidenceDecisionIds` (and are
  returned as `deniedDecisions`).
- **Per-evidence DENYs — including *all* candidates denied — always yield `kind: "ok"`** with an
  immutable (possibly empty) capsule and every DENY decision ID recorded (amended 2026-08-27 per
  B-002: candidate-count never selects the union member). An empty capsule is a valid capsule.
- **`"denied"` is reserved solely for run-level standing/policy refusal, independent of
  candidate evidence** — e.g. the agent is suspended, or a run-level policy check refuses
  execution outright. No capsule is created on this path. v1 keeps run-level denial rare; the
  demo's denial path is per-evidence DENY inside an `"ok"` capsule.
- On `"ok"` the capsule is already persisted and immutable — the caller never mutates or re-saves
  it.
- `"clarification_required"` (Phase 3, P3-C1): the union member is **frozen now** so
  `agent-service.ts` handles it from day one. v1 handling: complete the Run as `failed` with the
  typed question text in `run.error`; the request is persisted and queryable. No silent pick,
  ever (INV-22).
- `renderPrompt` resolves claim bodies internally (via the §B read port) and returns
  `userPrompt` prefixed by the `<WALNUT_CONTEXT capsule="...">` block per doc 03 §13.
  Deterministic: same capsule + same prompt → byte-identical output (INV-2 greps depend on this).

### A2. AgentService integration (Codex side, `P1-X1`)

Order inside `executeRun`, before `runner.run`:

1. `const result = await contextBroker.build(...)` — on `"denied"` / `"clarification_required"`,
   persist the typed outcome (`run.status = "failed"`, `run.error` = message/question; agent back
   to `ready`), **runner never invoked**.
2. On `"ok"`: `runner.run({ ...existing, runId, principalId, agentVersionId,
   contextCapsuleId: capsule.capsuleId, prompt: await contextBroker.renderPrompt(...) })`.

Baseline behaviour (thread resume, cancel, error paths, statuses) unchanged (HC-1). If the broker
itself **throws** (bug, not denial), the Run fails with the error message — same as today's
runner-throw path.

### A3. Capsule persistence + lookup port (implemented by Claude in `context/capsule-store.ts`)

```ts
interface CapsuleStore {
  save(capsule: ContextCapsule): Promise<void>;      // rejects if capsuleId already exists
  getById(capsuleId: string): Promise<ContextCapsule | null>;
  getByRunId(runId: string): Promise<ContextCapsule | null>;  // one capsule per run in v1
}
```

Storage: JSON files under `APP_DATA_DIR/walnut/capsules/`, atomic tmp+rename (overlay §9.2).
Reconciliation creates a **new** Run with a **new** capsule — never a second capsule on the old
Run, so `getByRunId` stays single-valued.

### A4. Route (Codex, `P1-X1`)

`GET /api/runs/:id/capsule` → 200 with the capsule, or 404 `{ error: "No capsule for this run" }`
(run unknown **or** run pre-dates Walnut). Registered before the production static/notFound block
in `app.ts`; bearer hook applies automatically.

### A5. AgentVersion resolver (added v1.1 under relay — Codex ratification pending; implemented by Claude in `context/agent-version-store.ts`)

```ts
interface AgentVersionResolver {
  resolve(agent: Agent): Promise<AgentVersion>;   // upstream Agent in, spec-001 AgentVersion out
}
```

Semantics (doc 03 §3 `walnut.agentVersions.resolve`): compute `configHash` = `sha256:` +
canonical-JSON hash over the agent's version-relevant config `{ name, description,
workspaceInstructions }`. If the latest stored version for `agentId` has the same `configHash`,
return it unchanged. Else append version `n+1` (born with open `validTo`/`txClosedAt`) and close
the prior version's `txClosedAt` — the spec 003 §B2 transition rule. Storage:
`APP_DATA_DIR/walnut/agent-versions/`, atomic tmp+rename. Called by `agent-service.ts`
(P1-X1 step 1) before `contextBroker.build`; the result supplies both `CapsuleBuildInput.
agentVersionId` and `RunnerRequest.agentVersionId`.

---

## §B — Evidence seam (freeze before any P2 task)

Direction of calls: `context/**` (Claude) **reads** evidence via ports that `evidence/**` (Codex)
implements; `evidence/**` **calls into** `auth/**`/`context/**` only via the two hooks in B3.

### B1. Read ports (implemented by Codex, consumed by broker / citation verifier / projector)

```ts
interface EvidenceRepository {
  getEvidence(evidenceId: string, version?: number): Promise<Evidence | null>; // no version = latest
  listCandidateEvidence(query: {
    agentId: string;              // the consuming agent
    knownAt?: string;             // ISO; omit = now (temporal resolver, P3-D5)
  }): Promise<Evidence[]>;        // ALL statuses/classifications — filtering is authz's job,
                                  // and the broker needs DENY candidates to record decisions
  getSourcePointer(pointerId: string): Promise<SourcePointer | null>;
  resolveSourceContent(pointerId: string): Promise<
    | { ok: true; content: string; currentHash: string; drifted: boolean }  // drifted: hash ≠ pointer.contentHash (INV-19)
    | { ok: false; reason: "not_found" | "unsafe_path" | "unreadable" }>;
  getCitation(citationId: string): Promise<Citation | null>;
}
```

`resolveSourceContent` is the byte source for HC-6: the citation verifier checks
`content.slice(charStart, charEnd) === quote` — exact string equality on the resolved content,
mismatch rejected regardless of what the model claimed (INV-5).

### B2. Write port (implemented by Codex; called by routes and lifecycle services)

```ts
interface EvidenceWriteService {
  createEvidence(input: {
    claim: string; subjectKey: string | null; predicate: string | null;
    producerAgentId: string; producerRunId: string;
    classification: Classification; requiredScopes: string[];
    source: { path: string; quote: string; charStart: number; charEnd: number };
    derivedFromEvidenceIds: string[];
    supersedesEvidenceId: string | null;   // non-null = this is a replacement; target must exist and be ACTIVE
    validFrom: string | null; validTo: string | null;
  }): Promise<
    | { ok: true; evidence: Evidence }   // pointer + citation created, citation VERIFIED, ledger event appended
    | { ok: false; reason: "unsafe_path" | "citation_mismatch" | "classification_violation"
                         | "schema_invalid" | "supersedes_target_invalid";
        detail: string }>;               // INV-4: no evidence without verified provenance
  supersede(evidenceId: string, replacementEvidenceId: string): Promise<{
    superseded: Evidence;                // new current version of the old evidence, status SUPERSEDED
    replacement: Evidence }>;
  revoke(evidenceId: string, reason: string): Promise<Evidence>;      // returns new current version, status REVOKED
  compromise(evidenceId: string, reason: string): Promise<Evidence>;  // returns new current version, status COMPROMISED
}
```

**Append-only status transitions (pinned 2026-08-27 per B-002).** A status change never mutates
an existing version record's content. The transition appends a **new version** of the same
`evidenceId` (`version + 1`, new `recordedAt`, new status, all other content fields copied) and
closes the prior version by filling its `txClosedAt` — **filling a `null` `txClosedAt` is the
only permitted write to a stored version record** (the standard bi-temporal close; HC-7 history
stays fully reconstructable).

**Supersession is a two-record protocol** (doc 04 §22, route `POST /api/evidence/:id/supersede
{ replacementEvidenceId }`):

1. The replacement is created first via `createEvidence` with `supersedesEvidenceId` set to the
   old evidence — that is how the replacement acquires the field, immutably, at mint time. It is
   born `ACTIVE`.
2. `supersede(oldId, replacementId)` then validates `replacement.supersedesEvidenceId === oldId`
   and the old evidence is currently `ACTIVE` (else it rejects), appends the old evidence's new
   version with `status: "SUPERSEDED"`, closes the prior version's `txClosedAt`, and appends the
   `evidence.superseded` ledger event.

`revoke`/`compromise` follow the same append-a-version pattern (no replacement record). Each
lifecycle op appends its matching ledger event (per-Run chain if in-Run, else governance chain,
spec 002 §2). `classification_violation` = derived classification weaker than a contributor
(INV-6, checked at write time via `CLASSIFICATION_ORDER`).

### B3. Hooks crossing back (Claude implements, Codex calls)

```ts
interface AuthorizationEvaluator {   // auth/evaluator.ts — pure, deterministic
  authorize(input: {
    agentId: string; principalId: string | null;
    evidence: Evidence;              // full object: evaluator needs scopes/status/classification
    action: "consume" | "share";
    runId: string | null; capsuleId: string | null;
  }): Promise<AuthorizationDecision>; // always returns a decision (ALLOW or DENY) — never throws on DENY
}

interface CitationVerifier {         // context/citation-verifier.ts
  // Creation-time verification (INV-5 / HC-6): receives the FULL quote, because Citation
  // stores only quotePreview + quoteHash (amended 2026-08-27 per B-002).
  verify(input: {
    quote: string;                   // exact quote text as proposed
    charStart: number; charEnd: number;
    pointer: SourcePointer;
  }): Promise<
    | { verification: "VERIFIED"; quoteHash: string }        // sha256: of the quote's UTF-8 bytes
    | { verification: "MISMATCH" | "DRIFTED" | "UNAVAILABLE"; detail: string }>;

  // Later recheck (no stored full quote): hash comparison against the stored quoteHash.
  recheck(input: { citation: Citation; pointer: SourcePointer }): Promise<CitationVerification>;
}
```

`verify` decision order: `resolveSourceContent(pointer)` fails → `UNAVAILABLE`; resolved
`currentHash !== pointer.contentHash` → `DRIFTED` (INV-19); `content.slice(charStart, charEnd)
!== quote` (exact string equality) → `MISMATCH` **regardless of model confidence**; else
`VERIFIED`. `recheck` order is the same except the last comparison is
`sha256(content.slice(citation.charStart, citation.charEnd)) !== citation.quoteHash` →
`MISMATCH`.

`EvidenceWriteService.createEvidence` calls `CitationVerifier.verify` before activating evidence
(the Citation record is minted from `verify`'s result — `quoteHash` from the return value,
`quotePreview` truncated by the store); the A2A share route calls `authorize` twice (sender
`share`, recipient `consume` re-auth — INV-3). Decisions are persisted by the evaluator's own
store and referenced by ID everywhere else.

### B4. Storage boundaries

`evidence/**` owns `APP_DATA_DIR/walnut/evidence/` (chains + evidence/pointer/citation stores);
`context/**` owns `APP_DATA_DIR/walnut/{capsules,decisions,grants,clarifications}/`. Neither
plane writes the other's files — cross-plane access is through these ports only.

---

## Freeze protocol

§A freezes when Codex ACKs in CHANNEL (precondition for `P1-X1`); §B before any P2 task. Changes
after freeze = DECISIONS entry + version bump here.
