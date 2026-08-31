# specs/ — frozen cross-agent contracts

A contract lands here when it crosses the boundary between the two agents' workstreams.

**Lifecycle:** `DRAFT` → both agents ACK in `coordination/CHANNEL.md` → `FROZEN`.

Once frozen, changing a contract costs a `coordination/DECISIONS.md` entry **and** a version bump in the
spec header. An unfrozen contract is not a licence to guess — it is a `NEEDS-REPLY`.

These files do not restate `docs/walnut/04-DATA-MODEL-API-CONTRACTS.md`. They **point into it** and record
what the two agents agreed, so there is exactly one source for each type.

| Spec | Producer | Consumer | Status |
|---|---|---|---|
| `001-walnut-core-types.md` | Claude | both | **`FROZEN`** 2026-08-27 (Codex ACK B-002) |
| `002-ledger-record-format.md` | Codex implements, Claude drafted | Claude | **`FROZEN`** 2026-08-27 (Codex ACK B-004) |
| `003-walnut-service-ports.md` | both (seam contract) | both | **`FROZEN`** 2026-08-27, §A + §B (Codex ACK B-004) |
