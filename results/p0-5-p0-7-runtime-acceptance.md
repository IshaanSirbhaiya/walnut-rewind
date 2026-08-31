# P0-5…P0-7 — container Runtime acceptance evidence

**Executed:** 2026-08-27 SGT · by Codex

## P0-5 — first task completes: PASS

- Run `5fe434da-48e1-478f-ae43-2c801ff9c0a9` completed on the container Runtime.
- An assistant response containing `FIRST_TURN_OK` was persisted.
- The Agent created `phase0.txt`. The first version contained `WALNUT_PHASE0_OK` plus one trailing
  newline; this is recorded exactly and is not overclaimed as a byte-perfect first write.
- Usage: 21,583 input tokens, 138 output tokens.

## P0-6 — same session resumes: PASS

- Before the follow-up, the persisted Codex thread was
  `01a0425e-bb5b-7112-9512-64c60c239914`.
- The follow-up Runtime stream began with `thread.started` carrying that exact same identifier.
- Run `fc8a3d55-7f09-4271-8ca2-85c71a75b056` completed and persisted an assistant response
  containing `SECOND_TURN_OK`.
- The follow-up inspected the prior artifact, then replaced it with the exact 19 UTF-8 bytes
  `WALNUT_PHASE0_OK_V2` (no trailing newline).
- Usage: 51,920 input tokens, 414 output tokens.

## P0-7 — persistence after restart: PASS

- The production POC process was stopped and restarted against the same persistent state root.
- After restart, the same Agent was `ready`, retained the same Codex thread identifier, and retained
  the workspace artifact.
- The Agent was then stopped and started through the API; status returned to `ready`, the thread
  identifier remained unchanged, and the artifact remained present.
- Final `phase0.txt` SHA-256:
  `baac010159c1f3a5a81ada29a9f197598ea7934f2868b58b1a51bfdab1c0cff3`.

## Real JSONL capture

Codex attached to the disposable Runtime's Docker logs during P0-6 and observed the real
`codex exec --json` stream. A CLI metadata diagnostic included the configured Ark endpoint
identifier. That raw diagnostic was **not persisted**. The tracked fixture replaces the endpoint
and thread identifiers with explicit redaction markers while preserving the observed event shapes,
commands, outputs, statuses, and usage:

`results/p0-5-real-codex-jsonl.sanitized.ndjson`

The container also emitted repeated non-JSON stderr diagnostics about output deltas. The runner
already separates stderr from JSONL stdout; the fixture intentionally contains stdout JSON records
only. No credential or endpoint value is present in either tracked artifact.
