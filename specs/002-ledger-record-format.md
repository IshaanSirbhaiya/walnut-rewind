# spec 002 — Ledger record format and hash chain

| | |
|---|---|
| **Version** | `v1` |
| **Status** | **FROZEN 2026-08-27** — Codex ACK of the amended §4 in CHANNEL B-004. Changes now cost a DECISIONS entry + version bump. |
| **Author** | Claude, 2026-08-27 · **Codex owns the implementation** (`walnut/evidence/`) |
| **ACK** | Claude ☑ (author) · Codex ☑ (B-004) |
| **Source of truth** | doc 04 §§9–11; pinned resolutions overlay §4 (amended per B-001 c.4 / A-005) |

Codex produces these records (evidence-runtime); Claude consumes them for the dependency
projection (dependency-rewind) and cites them in prose deliverables. Type definitions live in
`walnut/types.ts` (spec 001 §1.1); **this spec governs their semantics** and wins on conflict.

## 1. Record shapes

`RuntimeEventRecord` (doc 04 §9), `RedactionReceipt` (§10), `LedgerEvent` (§11) — **verbatim**.
Resolutions:

- `LedgerEvent.safePayload` is the **post-redaction** payload. For `kind: "runtime.event"` it
  embeds the full `RuntimeEventRecord` (receipt included), so the chain covers it (INV-15 covers
  runtime evidence, not just envelopes).
- `payloadHash` = `sha256:` + hash of the canonical JSON (§4) of `safePayload`. It is a hash of
  what we **stored**, not of the raw secret-bearing input — we never claim otherwise (HC-8).
- `RedactionReceipt` lives **inside** the chained record (part of the hashed content). It records
  categories and counts, never the removed text (HC-4).
- `sequence` starts at **1** per chain and increments by exactly 1. Genesis record:
  `sequence: 1`, `previousHash` = 64 `"0"` chars.
- `LedgerEvent.kind` is an open dot-separated string. Known kinds v1 (informative — consumers
  including the projector **must skip unknown kinds, never crash**):
  `run.requested`, `capsule.finalized`, `authorization.decision`, `runtime.event`,
  `runtime.parse_failure`, `redaction_failure`, `artifact.diff`, `evidence.created`,
  `evidence.superseded`, `evidence.revoked`, `evidence.compromised`, `evidence.shared`,
  `grant.issued`, `grant.revoked`, `clarification.requested`, `clarification.resolved`,
  `run.completed`, `run.failed`, `run.cancelled`, `reconciliation.started`,
  `reconciliation.completed`, `reconciliation.failed`.

## 2. Chain scope (pinned — B-001 correction 4, option a)

- **Per-Run chain:** `APP_DATA_DIR/walnut/evidence/<runId>.ndjson` — every Run-scoped event, in
  observed order (INV-14: per-Run promise append queue, awaited before `run()` returns).
- **Governance chain:** `APP_DATA_DIR/walnut/evidence/_governance.ndjson` — runless events
  (`grant.issued`/`grant.revoked`, `evidence.revoked`/`evidence.compromised`/`evidence.superseded`
  outside a Run, share decisions) with `runId: null`.
- Each chain is independent: own `sequence`, own genesis. INV-15 and the README claim
  **per-chain** integrity, honestly scoped: tamper detection *within* a chain; a deleted whole
  chain file is detected only by cross-references (capsule/evidence stores pointing at it), and we
  say so in Limitations (HC-8).
- `ContextCapsule.transactionCut` = `ledger:<n>` where `n` is the governance-chain head
  `sequence` visible at capsule build (0 if the governance chain is empty).

## 3. Hash chain (pinned)

- Algorithm: **SHA-256, lowercase hex, bare** (no `sha256:` prefix on chain fields).
- `eventHash = sha256hex( previousHash + canonicalJson(record_without_eventHash) )` —
  concatenation of the 64-char `previousHash` string and the canonical JSON string, UTF-8 encoded.
  `record_without_eventHash` is the full `LedgerEvent` minus only the `eventHash` key (it still
  contains `previousHash` and `sequence`).
- `previousHash` of record *n+1* = `eventHash` of record *n*. Genesis `previousHash` = 64 zeros.

## 4. Canonical JSON (pinned — one shared `walnut/evidence/canonical-json.ts`)

*(Value-domain rule added 2026-08-27 per B-002 counter — `safePayload` is `unknown`, so the
accepted domain must be closed or two compliant implementations diverge.)*

**Accepted value domain — exactly JSON values, nothing else:**
`null` · `boolean` · `string` · **finite** `number` · arrays of accepted values · **plain**
objects (prototype `Object.prototype` or `null`) with string keys and accepted values.

**Rejected — throws, at any depth:** `undefined` anywhere, **including array elements and array
holes** (never coerced to `null` the way `JSON.stringify` does); `bigint`, `function`, `symbol`;
non-finite numbers (`NaN`, `±Infinity`); cyclic references; non-plain objects (`Date`, `Map`,
`Set`, `RegExp`, typed arrays, class instances); any object with a `toJSON` method (it would
serialize differently under `JSON.stringify` than under a raw walk).

Serialization rules:

1. Object keys **recursively sorted** by JS default string comparison (UTF-16 code-unit order,
   i.e. `Array.prototype.sort()` with no comparator).
2. **No whitespace** anywhere.
3. Scalars serialized exactly as `JSON.stringify` does (string escaping, ECMAScript number
   grammar).
4. Arrays are **order-preserving**, never sorted.
5. The hash input is the **UTF-8 bytes** of the resulting string.
6. Required tests: a deeply key-reordered clone hashes identically; an object containing
   `undefined` as a **value** throws; an array containing `undefined` (or a hole) **throws**;
   a `Date` value throws.

## 5. NDJSON layout

- One canonical-JSON `LedgerEvent` per line, `\n` terminated, `O_APPEND` writes.
- The **stored line is itself canonical JSON** (not pretty-printed), so
  `sha256(previousHash + line_without_eventHash)` is reproducible by an external verifier without
  re-canonicalizing — re-serialization equals the stored form by construction.
- No rewrites, no compaction, ever (HC-7). Corrections are new events with `supersedesEventId`.

## 6. Failure semantics (INV-17 / INV-18, overlay P1-E2/E4)

| Input | Behaviour |
|---|---|
| Well-formed JSONL, **unknown** Codex event type | `RuntimeEventRecord` with `kind: "runtime.unknown"`, `runtimeType` = the observed type string, redacted, chained. Never dropped silently. |
| **Malformed** line (unparseable JSON) | `LedgerEvent` `kind: "runtime.parse_failure"`; `safePayload` = `{ byteLength, rawHash }` where `rawHash` = `sha256:` of the raw bytes. **The raw line is never persisted.** |
| **Redactor throws** on a payload | `LedgerEvent` `kind: "redaction_failure"`; `safePayload` = `{ byteLength, rawHash }` only — hash-only, never the raw payload. Receipt: `applied: false`. |

## 7. `verifyChain` (pinned)

```ts
verifyChain(chainId: string /* runId or "_governance" */): Promise<{
  ok: boolean;
  eventCount: number;
  brokenAtSequence?: number;   // first bad record's sequence
  reason?: "hash_mismatch" | "prev_hash_mismatch" | "sequence_gap" | "parse_failure";
}>
```

Checks, per record, in order: line parses → `sequence` contiguous from 1 → `previousHash` equals
prior `eventHash` → recomputed `eventHash` matches. First failure wins; the UI shows exactly which
record broke. Required test: the tamper matrix — modify / delete / insert / reorder a line — each
detected with the right `reason` (overlay P1-E5).

## 8. Skeleton questions — answered

1. Hash = SHA-256 lowercase hex (§3). 2. Per-Run + governance chain (§2). 3. Receipt inside the
chained record (§1). 4. `verifyChain` shape (§7).

## 9. Freeze protocol

Frozen when Codex ACKs in CHANNEL (`P0-9`). Post-freeze changes = DECISIONS entry + version bump.
