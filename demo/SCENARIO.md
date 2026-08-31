# Walnut Rewind — the finalized demo scenario: **"Launch Control Incident"**

| | |
|---|---|
| **Status** | **v3 FREEZE PACKET** — v1 (Claude, A-025) COUNTERed in B-017; v2 merged B-016's framing/proof-rail + all B-017 corrections + the brief rubric; v3 fixes B-019's five demo-truth lines and folds in B-018's rubric overlay. Origin: Mehul, verbatim: *"you and codex work togetherr to finalize on the scenario or problem or use case to efficiently show all the feateuers, you can build extra items and all to show it so there is no boundary but the use case of all the features and its relecance and all should be clearly visible"* |
| **ACK** | Claude ☑ (v3) · Codex ☑ (v3, B-020; reaffirmed B-021) |
| **Scope** | One coherent use case making all 23 features (`docs/walnut/00-START-HERE.md`) and their relevance visible. Three surfaces: the 3-minute stage script (`demo/DEMO-SCRIPT.md`, revised), a judge-runnable full walkthrough (`demo/FULL-WALKTHROUGH.md`, new), and the Scenario/Proof rail in the UI (B-016, Codex-owned). |

## The use case (B-016 framing, adopted)

> **Launch Control Incident** — an AI launch team acts on a trusted launch date for product
> "Aurora", while payroll data stays restricted; the date's source is later compromised, and
> Walnut identifies exactly which decisions and artifacts must be rebuilt — without rewriting
> history.

Every feature is invoked by one of three story pressures, so its *relevance* is self-evident:
the **payroll file** next to launch data (why authorize-before-context, redaction, delegation,
A2A re-authorization exist), the **date slip** (why lifecycle, clarification-first,
bi-temporality exist), and the **source-integrity incident** (why blast radius, rewind,
append-only history, tamper evidence exist).

**Cast**

| Actor | Role | Authority |
|---|---|---|
| `user:mehul` | launch ops lead (human principal; route-valid id format per `walnut-routes.ts` regex) | launch scopes only — **no payroll scope** |
| **Research Agent** | truth intake: reads workspace sources, proposes typed evidence via the real outbox | produces only; claims are worthless until the middleware verifies them |
| **Strategy Agent** | least-privilege decision-making | `project:launch:read` consume (agent-leg); later an agent-leg `share` grant for the F3 beat |
| **Comms Agent** | propagation: consumes only **shared, re-authorized** launch evidence; produces the announcement artifact | only what A2A re-authorization lets through |

## Story beats (corrected per B-017)

| # | Beat | What the audience verifiably sees | Features |
|---|---|---|---|
| B0 | Baseline | CRUD/Playground still work; Walnut is **additive middleware** (not "unmodified" — upstream files carry additive wiring; `git diff starter-kit-baseline --stat` is the receipt) | HC-1 |
| B1 | **Research run — truth intake** | Two files written; outbox proposes: launch-date claim (**VERIFIED** — byte-match), payroll claim (**stored with its canary — deliberately**: the proof is stored ≠ rendered, INV-2), and one bad-anchor claim → **rejected `citation_mismatch`**, visible as a redacted `evidence.proposal_rejected` ledger event **(X6; until X6 lands this beat cites the INV-5 tests instead)**. Evidence card shows the claim + source pointer (locator/hash/offsets — pointer, not payload) | F5, F6 (+ negative w/ X6), F8, F10; F7 via X6's run-event surface |
| B2 | **The date slips** | A second independent Oct-15 claim while Oct-1 is ACTIVE → next Strategy run **blocked before any model call** with a typed `ClarificationRequest` (question text in `run.error` in the Playground; full typed request at `GET /api/walnut/clarifications`, and in the drawer if X5 lands). **Conflict remediation** (not "resolution"): the operator **revokes** the stale Oct-1 claim (append-only correction) → the *conflict* is gone and the next run proceeds — but the persisted `ClarificationRequest` itself **remains OPEN**: v1 has no HTTP resolve route/action, and the demo says so plainly (B-018/B-019; X5 may optionally add a resolve action — until then, never narrate the request as "resolved"). **SUPERSEDED** is demonstrated separately on the pricing claim via a staged proposal that declares `supersedesEvidenceId` (the write service requires the replacement to declare it — `evidence-write-service.ts:286-308`) | F22, F12 (REVOKED + SUPERSEDED), F15 (valid-time vs belief-time on the date claims) |
| B3 | **Strategy run + the delegation kicker** | Capsule: launch in, payroll **DENIED `AGENT_SCOPE_MISSING`** — decision recorded with policy revision. Kicker (F3, via the share path since runs execute with `principalId: null` — `agent-service.ts`): grant Strategy an agent-leg `share` grant, then attempt a payroll share **as `user:mehul`** → sender DENY **`PRINCIPAL_SCOPE_MISSING`** — *the agent's own grant was insufficient to exceed its human's authority* (`share-service.ts` → two-leg `evaluator.ts`) | F1, F2, F3, F16, F21 (attestation) |
| B4 | **A2A share to Comms — positive proof** | Launch evidence shared: sender decision, recipient pre-check, transferred consume grant, final recipient re-check — all four ids in the curl response. Comms runs, its capsule consumes the shared evidence id (asserted by fixture), produces `announcement.md` → artifact node with before/after hashes. **No live "ceiling survives transfer" claim** — the default live policy has no classification ceiling (`auth/policy.ts`); that property is cited from its INV-3 test only | F4, F18, F11 |
| B5 | **Incident** | Compromise the launch evidence → blast radius: **Strategy and Comms runs both TAINTED via their capsules** (evidence → capsule → run), the artifact separately implicated via its `DERIVED_FROM` edge — never narrated as artifact→run back-propagation, which does not exist | F13, F12 (COMPROMISED), F11 |
| B6 | **Recovery — selective by design** | Reconcile the **Strategy** run only: new run, fresh capsule (compromised claim status-denied), old run **RECOVERED**, `RECOVERED_BY` link, history untouched. **Comms stays TAINTED on screen** — that is the point of *selective* reconciliation: Walnut shows you what still needs rebuilding rather than pretending it healed everything | F14 |
| B7 | **Audit close** | History tab `knownAt` = pre-incident → "the platform believed ACTIVE then"; the authorization "why" via the decision node's `AUTHORIZED_BY` edge in Dependencies (no dedicated decision route — say so); chain **verify** + tamper demo on a corrupted **copy** | F17, F16, F9, F20, F19 |
| — | F23 evidence pack | **absent, stated honestly** (cut per priority ladder) | honesty constraint |

## The three surfaces

**Tier 1 — 3-minute stage script** (`demo/DEMO-SCRIPT.md` revised — X4). Rehearsed spine
unchanged: B0 → B1 (trimmed) → B3 (capsule/deny) → B5 → B6 → tamper → close. It must visibly
complete the organizer's six-step journey (B-018 §1): select a runnable Agent in the frontend →
invoke a real task in the Playground → show a real model/file action → show Walnut's backend
evidence → trigger an honest denial/failure/recovery → end with the platform understandable and
controllable. The proof rail (X7) guides these beats; it never substitutes for them. The three v1
"zero-cost upgrades" were **withdrawn as written** (B-017 Q5: the Timeline tab shows evidence,
not runtime commands; the payroll card shows the stored claim; attestation renders a summary,
not JSON). Replacements, each to be **timed in the live-UI rehearsal before adoption**:

1. after the Research run: the attestation's runtime/command **counts** (or the X6 event
   surface, if landed) — *"the flight recorder captured N commands, M file changes"*;
2. on the Strategy drawer: the **denied count + the restricted source pointer** — *"stored under
   pointer + hash, denied before rendering; the canary in that stored claim never reaches the
   prompt — that's tested, and grep-able live"*;
3. on Overview: the **capsule hash + attestation/chain-head card** — *"a lockfile for what this
   run knew"* (raw JSON via curl only if the rehearsal shows slack).

**Tier 2 — `demo/FULL-WALKTHROUGH.md`** (X1). All beats B0–B7 in story order, judge-runnable,
exact step + expected output each; conflict/clarification and the F3 share-kicker get **one live
step each**; drift detection, grant revocation, and ceiling-survives-transfer are
**proof-map-only** (feature → test citation). Budget: 4 real model runs (Research, Strategy,
Comms, reconcile) ≈ 150–180k Ark tokens per full pass; the conflict-blocked run costs zero model
tokens. Stage demo budget unchanged (~110k measured).

**Proof rail** (B-016, Codex-owned — X7). A Scenario/Proof rail in the existing Launchpad UI:
incident brief, the three roles, six proof beats — VERIFIED → LEAST PRIVILEGE → SEALED CAPSULE →
BLAST RADIUS → REWIND → TAMPER-EVIDENT — each naming the practical question it answers and
pointing at the live Walnut tab/action. **Constraint (truthfulness rule): it renders live values
for the selected run and never fakes completion**; industrial visual language intact.

## Fit to the judging brief (Mehul 2026-08-28: *"make sure you account the hackathon criteria and just waht the genereal techjam requirements or expectations are"*)

Sources: `brief/TikTok_TechJam_2026_Tracks_and_Problem_Statements.pdf` §§1.9–1.12 and
`docs/walnut/06-IMPLEMENTATION-TEST-DEMO-PLAN.md` §10.

**Evaluation criteria (1.11) → where this scenario scores:**

| Criterion | Weight | How the scenario serves it |
|---|---|---|
| End-to-end middleware behavior — *"a real frontend-to-backend, Runtime, data, or infrastructure path with convincing functional evidence"* | **40%** | The **scenario spine** (B1 → B3 → B5 → B6) proves the full live path (React → Fastify → AgentService → broker → capsule → Codex runner → JSONL → ledger → graph → reconcile); the sidecars prove their **actual** backend paths — the clarification beat stops deliberately *pre-model*, the share kicker exercises the evaluator via the API, audit reads invoke no runner. Nothing is a static screen; X6 makes the flight-recorder path *inspectable*, not count-only |
| Technical design and integration — *"clear rationale, coherent architecture, appropriate boundary, focused changes, extensible contracts"* | **25%** | One coherent story (not 23 disconnected demos — exactly what §1.12 warns against); four-plane boundary narrated in B0/B3; frozen specs = extensible contracts; `git diff starter-kit-baseline --stat` = focused changes |
| Verification and robustness — *"automated tests, error handling, cleanup or recovery, redaction, protection against obvious bypasses"* | **20%** | The negative beats are the stars: denial (B3), typed clarification instead of a silent pick (B2), citation rejection (B1/X6), compromise→taint→recover (B5/B6), tamper evidence (B7); 232 automated tests cited in the proof map |
| Demo and reproducibility — *"concise live demo, useful README, one-command startup, documented limitations, no hidden manual setup"* | **15%** | Tier 1 **targets** ≤3 min (unmeasured until X4's timed live-UI rehearsal — B-017 Q5) and is concise **by design** (sidecars pushed to Tier 2); walkthrough is judge-runnable; seed v2 (X2) removes hidden manual setup; README §15 limitations already a gate item |

**Required deliverables (1.9):**

1. *3-min live demo showing one real Agent Run in its normal case **and** a failure/denial/recovery case* — Tier 1 shows normal (B1/B3), denial (B3), recovery (B6), tamper (B7): over-delivers on the "appropriate failure" requirement.
2. *One-page architecture diagram — middleware, data flow, **trust boundary**, and enforcement/instrumentation/recovery point* — README §4's ASCII diagram covers flow + the authorize-before-assembly enforcement point but does **not** mark the trust boundary explicitly and is not a standalone page → **new work item X8**.
3. *Repo with setup, problem/rationale, design summary, tests, demo steps, limitations, no secrets* — present (README §§1–17); X3's feature-relevance map strengthens rationale.

**Optional-evidence checkboxes (1.10) — the scenario ticks all four; the README should say so
in one explicit table (folds into X3):**

- ✅ *Delegated permission scoped or revocable, enforced outside the UI, demonstrated* — B3's `PRINCIPAL_SCOPE_MISSING` share kicker: a scoped permission enforced in the real two-leg evaluator, no UI involved (revocation itself stays proof-map-only per the sidecar decision).
- ✅ *End-to-end Run produces a correlated trace with model/tool/policy events* — per-Run hash-chained ledger + capsule + attestation, correlated by run id (B1/B7, X6).
- ✅ *A defined threat is blocked or contained, the protected asset unchanged, cleanup/recovery demonstrated* — one coherent proof (B5→B6): the threat is **compromised launch evidence**; it is *contained* by tainting/blast radius, the *protected asset* — the append-only historical record (old run, capsule, chain) — remains unchanged, and *recovery* is a new Strategy run linked `RECOVERED_BY`.
- ✅ *Team-defined lifecycle/reliability capability works as described* — the evidence lifecycle (ACTIVE→REVOKED/SUPERSEDED/COMPROMISED) + selective reconciliation.

**Scope-guidance alignment (1.12):** *"Depth, coherence, and relevance matter more than the
number of example features"* — this is the argument **for** the two-tier shape; *"controlled
fixtures are encouraged"* — X2 is sanctioned; *"a polished UI does not count as middleware"* —
X7's proof rail is presentation over live backend state, never the capability itself (every
proof beat's behavior has a server-side test per HC-2).

## Work items

| ID | Item | Owner | Status |
|---|---|---|---|
| X1 | `demo/FULL-WALKTHROUGH.md` — all beats, exact steps + expected output | Claude · Codex verifies each step post-revision | after freeze |
| X2 | Seed v2/fixtures: Comms Agent, grants, `user:mehul`, staged conflict + supersede mechanics, Comms-capsule evidence-id assertion, corrected run budget | **Codex (claimed, B-017)** · Claude reviews | after freeze |
| X3 | README 23-row feature-relevance map (feature → failure it prevents → where seen live → test/invariant) + links to all three surfaces + the four 1.10 optional-evidence checkboxes stated explicitly. Framed as a **reproducibility appendix answering "why useful / where proven"** — never "23 features = more points" (B-018 §5) | Claude · Codex reviews | after freeze |
| X4 | Revised 3-min script + **timed live-UI rehearsal** (the pending visual pass doubles as its stage) | Claude (+ Mehul: browser) | after freeze |
| X5 | Clarification visibility in the drawer (live typed callout: question/options/status — Codex prototyped per B-018) + **optionally** a small resolve route/action; until a resolve path exists, all narration states the request stays OPEN | **Codex (claimed, B-017/B-018)** | optional, after X2 |
| X6 | Redacted `evidence.proposal_rejected` ledger event + read-only run-event visibility (makes F6-negative and F7 live; if cut, the walkthrough cites tests instead) | **Codex (claimed, B-017)** | after freeze |
| X7 | Scenario/Proof rail UI (B-016) with live-values constraint | Codex (proposed B-016; Claude ACKs in A-026) | after freeze |
| X8 | One-page architecture diagram per brief §1.9(2): middleware, data flow, **explicit trust boundary**, enforcement + instrumentation + recovery points (upgrade of README §4) | Claude · Codex reviews | after freeze |

No new dependency; no upstream-file edits beyond HC-11-justified additive wiring; every gate
rule (npm run check, cross-review, truthfulness) applies to X1–X7 as to any other task.

## Corrections adopted from B-017 (so this file never re-claims them)

- `citation_mismatch` is not visibly queryable today (counts only) — X6 is the smallest honest fix.
- The drawer's Timeline panel lists consumed/produced evidence, **not** runtime commands.
- The payroll claim is **deliberately stored** (stored ≠ rendered is the INV-2 proof); "stored
  redacted" was wrong narration for that record.
- Runs execute with `principalId: null` → `PRINCIPAL_SCOPE_MISSING` is only reachable via the
  share path; principal id format is `user:<name>`.
- The live default policy has no classification ceiling → ceiling-survives-transfer is cited
  from its test, never shown live.
- `/supersede` requires the replacement to declare `supersedesEvidenceId`; an independent
  conflicting claim is resolved by **revoke**, not supersede.
- Blast radius reaches runs via capsules; artifacts are implicated, never back-propagated.
- Attestation renders a summary card, not scrollable JSON.
