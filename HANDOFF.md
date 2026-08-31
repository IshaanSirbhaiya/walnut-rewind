# HANDOFF — Walnut Rewind → AI Builders Challenge with IBM Bob

**You are picking up a finished, working system and taking it across a submission line.**
You have no prior context and you don't need any. This file is the only entry point. Read §0–§4,
then start Block A.

---

## §0 · Start here

| | |
|---|---|
| **What you have** | A complete, tested agent-middleware platform. `npm run check` passes: 27 test files, 233 tests, both production builds. |
| **What it's for now** | **AI Builders Challenge with IBM Bob** — Wildcard theme, *"Intelligent Systems for the Future of Work"* |
| **Deadline** | **Mon 31 Aug 2026, 11:59 PM ET** (≈ 11:59 AM Tue 1 Sep SGT) |
| **What's missing** | IBM Bob has never been used · no browser has ever opened the UI · no video · README is written for a different hackathon |

### Do this first, before anything else

**Block A — get the app on screen in a browser.** Nobody has ever done it. Every route has server
tests, but not one human has seen a pixel. **If the UI is broken, the demo video is impossible**, and
that's 1 of 5 required deliverables. Everything else in this plan is recoverable text. This isn't.

### Reading order

1. This file, §0–§4 (10 min)
2. `README.md` §§1–9 — what the product actually does (10 min)
3. `demo/SCENARIO.md` — the demo story, already frozen and agreed
4. `demo/FULL-WALKTHROUGH.md` — every step with expected output, written from a real end-to-end run

Do **not** read `docs/walnut/` cover to cover. It's a 8-document design corpus; treat it as
reference and go in only when a block sends you there.

### You need credentials that are not in this repo

`ARK_API_KEY` and `ARK_MODEL` are deliberately absent. Get them from Mehul privately and put them in
a local `.env` (already gitignored). Without them the server starts but no agent can run.

---

## §1 · What this project is

**Walnut Rewind is proof-carrying, authorization-aware, reversible context middleware for AI agents.**

The one-line pitch:

> Observability tells you what an agent **did**. Walnut tells you what it was **allowed to know**,
> why it believed it, who inherited that belief, and what must be rebuilt when the belief turns out
> to be wrong.

The core primitive is the **Context Capsule** — before every agent run, the middleware builds an
immutable, hashed snapshot of exactly the evidence that run is permitted to consume: evidence ids
and versions, source pointers and hashes, verified citations, authorization decisions, policy
revision, ledger cut. Think **`package-lock.json` for what an agent knows.**

Why that matters: a rule written inside a prompt ("don't use the payroll data") is not a control —
the model has already read the text. The only enforcement point that works is **before context
construction**. That's what this does, and it records the decision durably.

### The four planes (all lightweight native TypeScript — no Neo4j, no SpiceDB, no policy engine)

| Plane | Path | What it does |
|---|---|---|
| **context** | `apps/server/src/walnut/context/` | Capsule builder, citation verifier (exact byte match), conflict detector, agent-to-agent share, temporal resolver |
| **auth** | `apps/server/src/walnut/auth/` | Grant store + deterministic authorization evaluator. Effective access = agent grants ∩ delegating-principal grants ∩ evidence requirements ∩ policy |
| **evidence** | `apps/server/src/walnut/evidence/` | Redactor, canonical JSON, append-only hash-chained ledger, evidence store + write service, runtime event sink |
| **dependency** | `apps/server/src/walnut/dependency/` | Graph projector (pure, rebuildable), blast radius, run state, reconciliation |
| **routes / UI** | `walnut/routes/`, `apps/web/src/walnut/` | 19 REST endpoints + the Walnut drawer (Overview / Evidence / Dependencies / History) + a guided tour |

### The story it tells

Evidence enters → gets authorized → citation verified byte-for-byte → sealed into a capsule → agent
runs against it → runtime events hash-chained → dependency graph projected. Then something goes
wrong: a source is compromised → blast radius finds every downstream run, capsule, artifact →
those runs are marked TAINTED → **Rewind** mints a *new* run linked `RECOVERED_BY`, and the old run,
its capsule and its chain are never touched.

It's built on the MIT-licensed **Volc Agent Launchpad starter kit** (React + Fastify + Codex CLI
runtime + BytePlus Ark models). Keep `LICENSE` and the attribution — required and correct.

---

## §2 · Verified current state

**Verified today**, re-run in this directory:

```bash
npm run check     # exit 0 — typecheck (server + web), 27 files / 233 tests, both builds
```

Working and tested: all four planes, 19 REST routes, the four UI tabs, the guided tour, the frozen
demo scenario, a 12-stage end-to-end test walking the full thesis, per-invariant tests (INV-1…22),
the ledger tamper matrix, the redactor canary battery.

### NOT verified — be honest about these

- ⛔ **The UI has never been rendered in a browser.** Not once. Includes the guided tour, added today.
- ⛔ **No demo video exists.**
- ⛔ **IBM Bob has never touched this codebase.**
- ⚠️ The 3-minute demo has never been rehearsed live through the UI (it *was* rehearsed end-to-end
  over the HTTP API, and every beat passed — `results/p3-demo-rehearsal.md`).

---

## §3 · What IBM requires

From the official brief. These are pass/fail.

| # | Requirement | Status |
|---|---|---|
| R1 | Working prototype/PoC **using IBM Bob** (required primary dev tool) | ⛔ Block B + C |
| R2 | Completed **IBM SkillsBuild** learning activity | ⛔ Block B — *per person, whoever submits* |
| R3 | **Public** GitHub repo + README with 5 named sections | 🟡 repo is public; README needs rewrite (Block D) |
| R4 | Published submission page: project + team details, repo link | ⛔ Block G |
| R5 | Public demo/presentation video, **max 3 minutes** | ⛔ Block E |

**R3's five required README sections, verbatim:** problem statement · solution description ·
AI approach and architecture · selected challenge theme · how IBM Bob was used.

**Judging criteria:** Technical Execution (quality of implementation and effective use of IBM Bob
and other AI technologies) · Innovation · Challenge Fit · Feasibility · Real-World Impact.

**Only one project may be submitted for August**, to either Wildcard or the Space Exploration theme.
We're going Wildcard.

Key links: [bob.ibm.com/trial](https://bob.ibm.com/trial) (30 days, 40 Bobcoins, no credit card) ·
[Bob download](https://bob.ibm.com/download) · [SkillsBuild activity](http://ibm.biz/IBMSkillsBuild-learn-bob)

---

## §4 · The plan — Blocks A through G

**Ordered by risk, not by logic.** Block A is first because it's the only thing that can silently
make the video impossible.

---

### BLOCK A · Prove the UI works · ~45 min · **DO THIS FIRST**

```bash
# Node >= 22, npm >= 10, and a container engine (Colima / Docker Desktop / rootless Podman)
npm install
cp .env.example .env          # then put the real ARK_API_KEY and ARK_MODEL in it
colima start                  # or start Docker Desktop
set -a; . ./.env; set +a
npm run poc                   # builds runtime image + web + server → http://localhost:3000
```

Open `http://localhost:3000` and walk this list. **Stop at the first break and fix it.**

- [ ] A **"Hi, I'm Walnut"** welcome screen appears on load; the walnut logo renders
- [ ] **Show me around** starts the tour; the guide docks bottom-right
- [ ] **Next / Back** move between steps; the segmented progress bar fills
- [ ] Step 1 draws a pulsing ring on the agent list; **"Open the create form"** opens the modal *above* the dock
- [ ] Create an Agent → send a task → the run completes (this is the untouched baseline platform)
- [ ] The **Walnut** button in the Playground toolbar opens the drawer
- [ ] The tour's **"Go to Overview / Evidence / Dependencies / History"** buttons actually switch tabs
- [ ] All four tabs render live data with no error state
- [ ] Overview → **Verify** returns a green intact chain
- [ ] Overview → **Reconcile** on a healthy run returns a **409 refusal** (this is correct behaviour, not a bug — recovery is a response to invalidation, not a rerun button)
- [ ] At least one tour step flips to the green **"read live"** pill when its condition is genuinely met

**Exit test:** every box ticked. **Screenshot every tab** — those become your video storyboard and
your architecture-diagram assets.

The tour lives in `apps/web/src/walnut/tour/` (4 files). If it's broken and you're short on time,
it is safely removable: delete the `<WalnutTour .../>` block in `apps/web/src/App.tsx` and the
`tour.css` import in `apps/web/src/main.tsx`. Everything else keeps working.

---

### BLOCK B · IBM Bob: account, install, SkillsBuild · start in parallel with A

1. **Trial** — <https://bob.ibm.com/trial>. 30 days, 40 Bobcoins, no credit card.
2. **Install** — Bob IDE extension for VS Code (<https://bob.ibm.com/download>). There's also a
   "Bob Shell" CLI if you prefer terminal workflows.
3. **SkillsBuild (R2)** — <http://ibm.biz/IBMSkillsBuild-learn-bob>. **Start this immediately.**
   It's a hard requirement and it's pure wall-clock time. Screenshot the completion.
4. Open this repo in VS Code with Bob attached and let it index the codebase.

**Note:** Bobcoins are metered per account, and the submission ties to a named account. Whoever's
account is used should be named on the submission page.

---

### BLOCK C · Give Bob real work · 3–4 h · **the highest-leverage block**

Full paste-ready spec in **Appendix A**. Summary:

Bob builds **F23 — the evidence pack + offline verifier.** This is chosen deliberately. F23 is the
one capability that was cut for time and is currently labelled *"absent, not stubbed"* in three
places (`README.md` §18, the tour's coverage sheet, `demo/SCENARIO.md`). It is already specified,
fully self-contained, and demoable in fifteen seconds.

The framing this unlocks, which is both true and strong:

> Walnut Rewind is middleware that governs AI coding agents. **IBM Bob was used as one of the
> governed agents** — Bob's work was specified, executed, and then verified through the same
> evidence pipeline the platform applies to any agent. The one capability we had cut for time,
> Bob built.

No other submission will have the development tool be the *subject* of the product.

**Capture evidence as you go** — this is what makes the README section land:
- Screenshot the Bob IDE sessions: your prompts, its diffs
- Note Bobcoins consumed
- **Commit Bob's output in its own commits** so the repo shows exactly which code Bob wrote
- Keep the transcript

---

### BLOCK D · Wildcard reframing + the IBM README · 2–3 h · parallel with C

#### D1 — Reframe the vocabulary (the thesis doesn't change, the register does)

The brief asks for *workflow automation, AI co-workers, decision intelligence, business process
orchestration*, and asks *how can AI improve decision-making? how can teams achieve outcomes faster?*

| Current framing | Wildcard framing |
|---|---|
| "authorization-aware middleware" | "AI co-workers that only see what their role permits" |
| "blast radius" | "when a fact changes, know exactly which decisions and deliverables to redo" |
| "reconciliation / rewind" | "rebuild only the work actually affected — not the whole project" |
| "evidence ledger" | "a decision record a team can audit and trust" |
| "clarification-first" | "the AI asks instead of guessing when the inputs disagree" |

The existing demo scenario is **already a Future-of-Work story** — a cross-functional launch team,
three AI co-workers, a fact that shifts, selective rebuild. Reuse it as is.

#### D2 — Rewrite `README.md`

Skeleton and per-section guidance in **Appendix B**. Keep the honest-limitations section — it reads
as engineering maturity and it scores on Feasibility.

---

### BLOCK E · The video · 2 h including retakes · **hard-schedule this, don't leave it to 4 AM**

Max 3 minutes, publicly accessible, 1 of 5 required deliverables. Shot list in **Appendix C**.

Record against the seeded scenario:

```bash
./scripts/walnut-demo-seed.sh
# ⚠️ THEN RESTART THE SERVER — see §5, gotcha 1. The seed is invisible until you do.
```

Upload to YouTube as **unlisted or public** (not private — judges must be able to open it). Verify
the link in a logged-out browser window.

---

### BLOCK F · Repo · mostly done

The repo is already public with a clean single-commit history and a passed secret sweep. Remaining:

- [ ] Rewrite `README.md` (Block D)
- [ ] Commit Bob's work separately (Block C)
- [ ] **Re-run the secret sweep before the final push:**
  ```bash
  git grep -nIE 'sk-[A-Za-z0-9]{16,}|BEGIN [A-Z ]*PRIVATE KEY'
  git ls-files | grep -i env      # must show ONLY .env.example
  ```
- [ ] Confirm the repo is public in a logged-out window

---

### BLOCK G · Submit · 30 min · leave ≥2 h of margin

- [ ] Submission page published with project + team member details
- [ ] Public repo link — **verified in a logged-out window**
- [ ] Video link — verified the same way
- [ ] SkillsBuild completion done and recorded
- [ ] README names the theme: **Wildcard — Intelligent Systems for the Future of Work**
- [ ] README contains all five required sections

---

### Suggested schedule

| Block | Duration | Must be done by |
|---|---|---|
| A · Browser pass | 45 min | **first, immediately** |
| B · Bob + SkillsBuild | parallel | +2 h |
| C · Bob builds F23 | 3–4 h | −6 h before deadline |
| D · Reframe + README | 2–3 h | parallel with C |
| E · Video | 2 h | **−4 h before deadline** |
| F · Final repo push | 30 min | −3 h |
| G · Submit | 30 min | **−2 h** |

**If time runs short, cut from the bottom, never the top:** R1–R5 never cut → browser pass and video
never cut → Bob's F23 (if it fails, describe honestly whatever Bob *did* do) → any further polish.

---

## §5 · Known defects and gotchas

Rediscovering these costs hours. They're real and reproduced.

1. **The demo seed is invisible until you restart the server.** `stage-sidecars` writes through a
   separate store instance while the running server caches state in memory. Seed → restart → then
   demo. This will silently ruin a video take.
2. **Don't demo a payroll share without a principal.** A principal-free share ALLOWs and issues the
   recipient a live payroll grant. Correct semantics, terrible demo optics. `demo/FULL-WALKTHROUGH.md`
   warns about this.
3. **Reconcile on a CLEAN run returns 409.** That's the product working. Don't "fix" it.
4. **The clarification request stays OPEN** — there's no resolve route in v1. Never narrate it as
   "resolved". Building the resolve route is an optional second Bob task if C1 lands early.
5. **Ledger integrity is per-chain.** Tampering *within* a chain is detected with the exact broken
   sequence; deleting an entire chain file is only detectable via cross-references.
6. **Don't claim** that every physical model request is observed, that JSONL is a pre-command
   enforcement boundary, that the container is a hardened sandbox, that redaction equals
   anonymisation, or that hash chaining proves an unobserved action never happened. `README.md` §15
   has the full list — keep it.

---

## §6 · Decisions needed from Mehul

1. **Did you submit to the Wildcard Challenge in July?** If yes, Wildcard is closed for August and
   the theme must switch to Space Exploration. Everything else in this plan still applies.
2. **Who is named on the submission**, and whose IBM Bob account is used? Teams up to 5 allowed.
3. **Who completes SkillsBuild?** It's per-person and required of whoever submits.

---

## §7 · A note on the "How IBM Bob was used" section

Write it prominently and persuasively — it's a scored section and it deserves the best true framing
you can give it, which is the governed-agent narrative in Block C.

Write it from what Bob **actually does**. Bob is metered per account, IBM's own judges are scoring
"effective use of IBM Bob", and a claim that doesn't match the account's activity is a
disqualification risk rather than a scoring risk — the one failure here that can't be repaired after
submission. It would also hand a judge the perfect argument against a product whose entire thesis is
that assertions must carry evidence.

The way to make that section strong is to make the true story big: get Bob building early in Block C.

---

# Appendix A · The IBM Bob work package (paste-ready)

Give Bob this brief. Everything it references already exists in the codebase.

---

> ## Task: implement the evidence pack export and its offline verifier
>
> ### Context
> This repo is "Walnut Rewind", middleware that governs AI agent runs. Every run executes against an
> immutable **Context Capsule** and emits an append-only, hash-chained **ledger**. One planned
> capability was never built: an exportable evidence pack that a third party can verify offline,
> without this server. Build it.
>
> ### Deliverable 1 — `GET /api/runs/:id/evidence-pack`
> Register in `apps/server/src/walnut/routes/walnut-routes.ts`. **Copy the structure of the existing
> `GET /api/runs/:id/attestation` route (around line 675)** — same params parsing, same deps object,
> same error style.
>
> Response: a single self-contained JSON document containing everything needed to verify the run
> without this server:
> - `capsule` — via `deps.capsuleStore.getByRunId(runId)`
> - `evidence` — every evidence record referenced by the capsule, all versions, via
>   `deps.evidenceStore.getEvidence()` / `.listAllVersions()`
> - `pointers` and `citations` — via `.getPointer()` / `.getCitation()`
> - `chain` — the run's full ledger event list, via `deps.ledger.listEvents(chainId)`
> - `chainHead` — via `deps.ledger.head(chainId)`
> - `attestation` — reuse the existing `buildAttestation(deps, runId, capsule)` helper
> - `packHash` — `sha256Prefixed(canonicalJson(<everything above>))`
>
> Import `canonicalJson` from `../evidence/canonical-json.js` and `sha256Prefixed` from
> `../shared/hash.js`. **Canonical JSON is mandatory** — key order must be deterministic or the hash
> is worthless.
>
> Return 404 if the run has no capsule, matching the attestation route's `{ attestation: null, note }`
> convention.
>
> ### Deliverable 2 — `scripts/verify-evidence-pack.mjs`
> A standalone Node script. **Zero dependencies** — Node built-ins only, no npm imports. Usage:
> `node scripts/verify-evidence-pack.mjs <pack.json>`
>
> It must:
> 1. Recompute the ledger hash chain across `chain[]`: each event's `prevHash` must equal the prior
>    event's `eventHash`, sequences must be gapless, and each `eventHash` must recompute correctly.
>    Mirror the algorithm in `apps/server/src/walnut/evidence/ledger.ts` `verifyChain()`.
> 2. Recompute `packHash` and compare.
> 3. Print a per-check PASS/FAIL report.
> 4. **Exit 0 only if everything passes; exit 1 otherwise**, naming the first broken sequence number.
>
> ### Deliverable 3 — tests
> Add `apps/server/src/walnut/routes/evidence-pack.test.ts` following the existing patterns in
> `walnut-routes.test.ts`:
> - a pack for a real run round-trips and verifies clean
> - mutating one event's payload makes verification fail **at that exact sequence number**
> - deleting an event is detected
> - a run with no capsule returns the documented 404 shape
>
> ### Acceptance criteria — all must hold
> - `npm run check` exits 0
> - The pre-existing 233 tests still pass, **unmodified**
> - `verify-evidence-pack.mjs` runs on a machine with no `node_modules` present
> - No secret, key, token, or raw file content appears anywhere in the pack — it carries pointers and
>   hashes, never payloads
>
> ### Constraints
> - Append-only: never mutate an existing record
> - Additive only: don't change existing route shapes or behaviour
> - Match surrounding code style: named exports, `.js` import suffixes, `async`/`await`, zod for params

---

After Bob delivers: run `npm run check`, confirm 233 pre-existing tests are untouched, then update
the three places that currently say F23 is absent — `README.md` §18 (F23 row), the tour's coverage
sheet (`apps/web/src/walnut/tour/tour-steps.ts`, the `F23` entry, change `surface: "absent"`), and
`demo/SCENARIO.md`.

---

# Appendix B · README skeleton (IBM's five required sections)

Rewrite `README.md` with these, in this order, using these names.

**1. Problem statement.** Agent platforms tell you what an agent *did* — commands run, files
changed. They cannot tell you what it was *allowed to know*, why it believed it, who inherited that
belief, or what must be rebuilt when the belief turns out wrong. Lead with the team cost: work
silently built on a fact that later changed.

**2. Solution description.** The Context Capsule as `package-lock.json` for agent knowledge.
Authorization before context construction. Byte-exact citation verification. Append-only
hash-chained history. Blast radius and selective rewind. Use the Future-of-Work vocabulary from
Block D1. Keep it under 400 words and put a screenshot near the top.

**3. AI approach and architecture.** The four planes; the ASCII architecture and trust-boundary
diagrams already in the current `README.md` §4 and §4.1 (reuse them, they're good); where AI is a
core functional component — agents plan and execute real work, propose typed evidence, and the
middleware governs, verifies and can reverse that work. Name the models and the runtime.

**4. Selected challenge theme.** State it plainly: **Wildcard Challenge — Intelligent Systems for
the Future of Work.** Then two or three sentences on fit: AI co-workers with role-scoped knowledge,
decision intelligence over a shared evidence record, and outcome recovery when a fact changes.

**5. How IBM Bob was used.** See §7 above. Written from what Bob actually did, with the
governed-agent framing, and with evidence: linked commits, screenshots, Bobcoins consumed.

**Keep from the current README:** the honest-limitations section (currently §15) and the
starter-kit attribution. Both are assets.

---

# Appendix C · Video shot list (3:00 max)

| Time | Shot | What's on screen |
|---|---|---|
| 0:00–0:20 | **Problem** | Plain Playground. "Agent platforms show what an agent did. Never what it was *allowed* to know." |
| 0:20–0:35 | **Meet Walnut** | The welcome screen — *"Hi, I'm Walnut. I'll show you around."* The product introduces itself. Much better than a talking head. |
| 0:35–1:10 | **A governed run** | Send a real task → run completes → open the drawer → Overview: capsule hash, policy revision. "A lockfile for what this agent knew." Then the attestation: command count, file changes, redactions — derived from observed events, not the agent's word. |
| 1:10–1:40 | **Denial** | Evidence tab. Payroll evidence **DENIED** before context assembly, decision recorded with its policy revision. The planted canary in that stored claim never reaches the prompt. |
| 1:40–2:15 | **Incident + rewind** | Compromise the launch evidence → blast radius → downstream runs **TAINTED** → press **Reconcile** → new run linked `RECOVERED_BY`, old run and its chain byte-identical. Note that a second run stays tainted — recovery is *selective* on purpose. |
| 2:15–2:40 | **Evidence pack — built by IBM Bob** | Export the pack, run `verify-evidence-pack.mjs` offline → PASS. Mutate one byte → FAIL at the exact sequence. |
| 2:40–3:00 | **Close** | One line of honest limits, then the thesis line. |

Rehearse once with a stopwatch before recording. The seed-then-restart gotcha (§5.1) will bite you
mid-take if you skip it.

---

# Appendix D · File map

| Path | What it is |
|---|---|
| `apps/server/src/` | Upstream starter kit: Fastify control plane, `AgentService`, Codex runners |
| `apps/server/src/walnut/` | **All middleware.** `context/` `auth/` `evidence/` `dependency/` `routes/` `shared/`, plus `types.ts` (the frozen contract) and `e2e.test.ts` |
| `apps/web/src/` | React UI. `walnut/` holds the four drawer panels; `walnut/tour/` holds the guided tour |
| `docs/walnut/` | The 8-document design corpus. **Reference only** — go in when a block points you there. `00-START-HERE.md` lists all 23 capabilities; `06-…` §6 lists invariants INV-1…22 |
| `docs/ARCHITECTURE.md`, `LOCAL_POC.md`, `DEPLOYMENT.md` | Upstream starter-kit docs |
| `demo/SCENARIO.md` | The frozen demo story ("Launch Control Incident"), all 23 features mapped to beats |
| `demo/FULL-WALKTHROUGH.md` | Judge-runnable, every step with real expected output |
| `demo/DEMO-SCRIPT.md` | The 3-minute stage cut |
| `specs/` | Frozen cross-component contracts. Read before changing anything that crosses a seam |
| `results/` | Measured evidence — test output, live smoke runs. Cite from here, never invent a number |
| `scripts/` | `start-local-poc.sh` (behind `npm run poc`), `walnut-demo-seed.sh`, demo fixtures + assertions |

### Commands

```bash
npm run poc                        # one command: build + start everything → localhost:3000
npm run check                      # typecheck + all server tests + both builds — the gate
npm run test -w @launchpad/server  # server tests only, fast loop
npm run dev                        # hot-reload server + web
./scripts/walnut-demo-seed.sh      # seed the demo scenario (then RESTART the server)
```
