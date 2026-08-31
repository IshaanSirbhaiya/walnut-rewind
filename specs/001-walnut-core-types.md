# spec 001 — Walnut core types (`apps/server/src/walnut/types.ts`)

| | |
|---|---|
| **Version** | `v1.1` — `art` prefix added to the §2 table 2026-08-27 (the table omitted ArtifactRecord although §12 requires `artifactId`; DECISIONS entry; implementation already uses `art_<randomUUID()>`) |
| **Status** | **FROZEN at v1.1** — v1 ACKed in CHANNEL B-002; the v1.1 `art` amendment explicitly ACKed by Codex in CHANNEL B-015 (2026-08-28). Changes cost a DECISIONS entry + version bump. |
| **Author** | Claude, 2026-08-27 |
| **ACK** | **v1:** Claude ☑ · Codex ☑ (B-002). **v1.1 (`art` prefix):** Claude ☑ · Codex ☑ (B-015, 2026-08-28 — DECISIONS ratification entry recorded). |
| **Source of truth** | `docs/walnut/04-DATA-MODEL-API-CONTRACTS.md` (doc 04) §§1–8, 12–18; pinned resolutions `coordination/PLAN-UPDATE-2026-08-27.md` §4 |

`apps/server/src/walnut/types.ts` is a **shared file**: all four workstreams import it, so it is
claimed in `STATUS.md` like a task before anyone edits it. `P1-C1` (Claude) creates it by
transcribing this spec.

## 1. Scope and layout

One shared type module. Rules:

1. **Every cross-plane shape lives in `walnut/types.ts`.** That is: all shapes in §3 below,
   *including* `LedgerEvent` / `RuntimeEventRecord` / `RedactionReceipt`, whose **semantics** are
   governed by spec 002. One definition, two specs never disagree — if they appear to, spec 002
   wins for those three types.
2. Plane-internal types (e.g. redactor rule tables, projector working sets) stay inside the
   owning plane's directory and are **not** part of this contract.
3. Module layout is doc 03 §18's consolidated tree as pinned in the overlay §4:
   `walnut/{types.ts, index.ts, context/, auth/, evidence/, dependency/, routes/}`.
   `walnut/auth/` is Claude-owned (extension of context-authz).
4. `walnut/types.ts` imports **nothing** (type-only leaf module). Upstream types
   (`AgentRun`, `Agent`, …) are imported by consumers directly from `../types.js`, never
   re-exported from here.
5. Web mirrors: `apps/web/src/walnut/types.ts` is hand-mirrored from the frozen server contract
   only (overlay §9.6); it is a copy, not an import.

## 2. Conventions (normative)

- **IDs are plain `string` aliases**, not branded types (pinned, overlay §4):
  `type EvidenceId = string;` etc. Revisit post-hackathon.
- **Walnut-minted IDs** are `<prefix>_<randomUUID()>` with this prefix table — greppable in logs
  and demo output:

  | Prefix | Type | | Prefix | Type |
  |---|---|---|---|---|
  | `av` | AgentVersion | | `cit` | Citation |
  | `grant` | AgentGrant | | `ev` | Evidence |
  | `auth` | AuthorizationDecision | | `cap` | ContextCapsule |
  | `ptr` | SourcePointer | | `rec` | ReconciliationRecord |
  | `clar` | ClarificationRequest | | `revt` | RuntimeEventRecord |
  | `levt` | LedgerEvent | | `art` | ArtifactRecord | |

  **Exception:** `runId`, `agentId` are the starter kit's own IDs, used verbatim (raw UUID /
  upstream value). `principalId` is a URI-ish string: `user:<name>` or `agent:<agentId>`.
- **Timestamps** are ISO-8601 UTC strings with milliseconds, exactly `new Date().toISOString()`
  output. Bi-temporal field pairs follow doc 04: `validFrom`/`validTo` = valid time,
  `recordedAt`/`txClosedAt` = transaction time; `null` `validTo`/`txClosedAt` = open interval.
- **`| null`, never optional `?`** for absent-able fields — matches doc 04 verbatim and avoids
  `exactOptionalPropertyTypes` friction. A field the middleware hasn't filled yet is `null`, not
  missing.
- **Hashes** are SHA-256 lowercase hex. Fields named `*Hash` that doc 04's examples show with a
  `sha256:` prefix (`policyHash`, `capsuleHash`, `sourceHash`, `claimHash`, `quoteHash`,
  `contentHash`, `payloadHash`) carry the **prefix `sha256:` + 64 hex chars**. Chain fields in
  spec 002 (`previousHash`, `eventHash`, `chainHead`) are **bare 64-hex** (genesis = 64 zeros);
  spec 002 governs.

## 3. The shapes (normative)

All of the following are transcribed **verbatim from doc 04** — the corpus text is the contract;
this spec adds only the resolutions listed per type. Transcribe: §1 `Classification` (+ the
ordering `PUBLIC < INTERNAL < CONFIDENTIAL < RESTRICTED`), §2 `AgentVersion`, §3 `GrantAction` +
`AgentGrant`, §4 `AuthResult` + `AuthorizationDecision`, §5 `SourcePointerKind` + `SourcePointer`,
§6 `CitationVerification` + `Citation`, §7 `EvidenceStatus` + `Evidence`, §8 `ContextEvidenceRef` +
`ContextCapsule`, §9 `RuntimeEventKind` + `RuntimeEventRecord`, §10 `RedactionReceipt`,
§11 `LedgerEvent`, §12 `ArtifactRecord`, §13 `GraphNodeType`/`GraphNode`/`GraphEdgeType`/`GraphEdge`,
§14 `WalnutRunState`, §15 `BlastRadius`, §16 `ReconciliationRecord`, §17 `ClarificationRequest`,
§18 `RunAttestation`.

Resolutions on top of the verbatim text:

- **`Classification` ordering** is exposed as data, not just prose:
  `const CLASSIFICATION_ORDER: Record<Classification, number>` (0..3). INV-6 monotonicity
  (derived ≥ max contributor) compares through this table.
- **`GrantAction`** includes `"consume"` (overlay §4). `read` = may see it exists; `consume` = may
  enter a capsule; `share` = may transfer to another agent; `write`/`external_write` reserved for
  artifact policy (v1 records them, does not enforce beyond capsule scope).
- **`AuthorizationDecision`** keeps the split `matchedAgentGrantIds` / `matchedPrincipalGrantIds`,
  plus `evidenceVersion`, `resource`, `policyHash` (overlay §4). A decision is **immutable once
  recorded** — corrections are new decisions.
- **`Evidence`** keeps `subjectKey`/`predicate`/`claimHash`. `claimHash = sha256:` over the UTF-8
  bytes of `claim` exactly (no canonicalization — it is a string, not an object).
- **`ContextCapsule`** is the flattened doc-04 §8 shape with `deniedEvidenceDecisionIds` and
  `transactionCut: string` (format `ledger:<sequence>` — the highest governance-chain sequence
  visible at build time; spec 002 defines the chains). `capsuleHash` = `sha256:` +
  canonical-JSON hash (spec 002 §4 algorithm) over the capsule object **excluding `capsuleHash`
  itself**. A capsule is immutable after finalization (INV-7).
- **`ClarificationRequest`** keeps the literal types `allowNoneOfAbove: true` and
  `defaultOnTimeout: "REFUSE"` — refusal-by-default is the contract, not a config.
- **`BlastRadius`** keeps `trigger` + `computedAt`.
- **`RunAttestation.routeReceipt`** is filled from `systemInfo()`-adjacent config: `arkModel`,
  `codexVersion` (from `codex --version` at startup, cached), `runtimeProvider`, `runtimeImage`
  (container only, else `null`), `sandboxMode`.

## 4. Upstream `apps/server/src/types.ts` additions (P1-E1, Codex)

Pinned here because every Phase-1 task depends on them (doc 03 §2 verbatim):

```ts
// added to RunnerRequest (all four required — the service always supplies them):
runId: string;
principalId: string | null;
agentVersionId: string;
contextCapsuleId: string;

// new provider-neutral contract:
interface RuntimeEventSink {
  accept(input: {
    runId: string;
    agentId: string;
    provider: "local-process" | "container";
    rawEvent: unknown;
    receivedAt: string;
  }): Promise<void>;
}
```

`RuntimeEventSink` lives in upstream `types.ts` (the runners must see it without importing
`walnut/`). Ordering rule (doc 03 §4, overlay P1-E3): per-Run promise append queue, awaited
before `run()` returns — never `void sink.accept(...)`.

## 5. HC-5 mechanism — honest wording (B-001 correction 3, verbatim policy)

Shapes stay plain-string doc-04 structural types, so the **type system alone does not make
unauthorized refs inexpressible**. The enforcement is:

1. the capsule builder/factory in `walnut/context/` is the **only** module that assembles
   `ContextEvidenceRef` values (no raw constructor/helper exported);
2. it requires an `AuthorizationDecision` with `result === "ALLOW"` for the exact
   `(evidenceId, evidenceVersion)` and validates this **at runtime, before** the ref is added;
3. INV-1 (every capsule ref is ALLOW) and INV-2 (denied-canary absent from rendered prompt) are
   the executable evidence.

No artifact may claim type-level inexpressibility.

## 6. Construction responsibility (answers skeleton Q3)

| Filled by | Fields |
|---|---|
| Caller (route / service) | natural-language inputs: `claim`, `question`, `reason`, resource patterns |
| Middleware (Walnut) | **all** IDs, hashes, timestamps, `version` counters, `status`, verification states, receipts |

A caller never supplies an ID, hash, or timestamp; stores mint them. This is what makes the
builder-encapsulation claim in §5 checkable.

## 7. Freeze protocol

Frozen when Codex ACKs in CHANNEL (`P0-9`). After freeze, any change = DECISIONS entry + version
bump here + hand-mirror update in `apps/web/src/walnut/types.ts`.
