// The guided tour's content. Kept as data so the walkthrough prose lives in one reviewable place
// rather than being scattered through JSX.
//
// TRUTHFULNESS (CLAUDE.md sec.4): a step may only say "verified live" when `check` reads real state
// returned by the server for the selected Run. Everything a bare tour cannot actually show -- the
// beats that need the seeded Launch Control Incident, or that are only proven by the test suite --
// is labelled `seeded` or `tests`, never dressed up as something the viewer just witnessed.

import type { RunWalnutOverview } from "../types";
// type-only import: no runtime edge back into the drawer, so no import cycle.
import type { WalnutTab } from "../WalnutDrawer";

// -- feature catalogue -------------------------------------------------------------------------
// The 23 capabilities of docs/walnut/00-START-HERE.md, in its numbering. `surface` states how far
// THIS tour gets you: what you see happen (live), what needs the seeded scenario (seeded), what is
// only proven by tests (tests), and what was cut (absent).

export type FeatureSurface = "live" | "seeded" | "tests" | "absent";

export interface FeatureEntry {
  id: string;
  name: string;
  prevents: string;
  surface: FeatureSurface;
}

export const FEATURES: FeatureEntry[] = [
  { id: "F1", name: "Context Capsules", prevents: "“we can't reconstruct what the model actually knew”", surface: "live" },
  { id: "F2", name: "Per-agent authorization", prevents: "one agent's access silently becoming every agent's access", surface: "live" },
  { id: "F3", name: "Delegated authority", prevents: "an agent exceeding the human it acts for", surface: "seeded" },
  { id: "F4", name: "Agent-to-agent re-authorization", prevents: "access laundering through a handoff", surface: "seeded" },
  { id: "F5", name: "Proof-carrying evidence", prevents: "naked-prose knowledge reuse with no provenance", surface: "seeded" },
  { id: "F6", name: "Mechanical citation verification", prevents: "confident-but-wrong grounding", surface: "seeded" },
  { id: "F7", name: "Runtime flight recorder", prevents: "unobserved agent actions", surface: "live" },
  { id: "F8", name: "Redact-before-persist", prevents: "secrets fossilised in logs and ledgers", surface: "live" },
  { id: "F9", name: "Append-only hash-chained ledger", prevents: "silent history edits", surface: "live" },
  { id: "F10", name: "Pointer-not-copy privacy", prevents: "observability turning into a sensitive-data lake", surface: "seeded" },
  { id: "F11", name: "Dependency / proof graph", prevents: "having no map from a belief to its consequences", surface: "live" },
  { id: "F12", name: "Evidence lifecycle", prevents: "corrections that overwrite the record", surface: "seeded" },
  { id: "F13", name: "Blast-radius analysis", prevents: "unknown contamination scope after an incident", surface: "seeded" },
  { id: "F14", name: "Selective reconciliation (Rewind)", prevents: "“recovery” that rewrites the past", surface: "live" },
  { id: "F15", name: "Bi-temporal history", prevents: "conflating “was true” with “we believed”", surface: "live" },
  { id: "F16", name: "Authorization history", prevents: "unexplainable access decisions", surface: "live" },
  { id: "F17", name: "Time-travel / known-at view", prevents: "hindsight bias in an audit", surface: "live" },
  { id: "F18", name: "Deterministic derived verification", prevents: "model prose certifying its own facts", surface: "live" },
  { id: "F19", name: "Evidence / Timeline / Dependencies / History UI", prevents: "middleware nobody can see working", surface: "live" },
  { id: "F20", name: "Tamper verification", prevents: "undetected record manipulation", surface: "live" },
  { id: "F21", name: "Context lockfile / capsule export", prevents: "an irreproducible run context", surface: "live" },
  { id: "F22", name: "Clarification-first conflict handling", prevents: "silently picking between contradictions", surface: "seeded" },
  { id: "F23", name: "Evidence pack / offline verification", prevents: "—", surface: "absent" },
];

// -- live progress signals ---------------------------------------------------------------------

export interface TourContext {
  agentCount: number;
  hasSelectedAgent: boolean;
  runId: string | null;
  runStatus: string | null;
  drawerOpen: boolean;
  overview: RunWalnutOverview | null;
}

// -- actions the guide can perform on the app on the viewer's behalf ----------------------------

export type TourAction =
  | { kind: "create-agent"; label: string }
  | { kind: "suggest-prompt"; label: string; prompt: string }
  | { kind: "open-drawer"; label: string }
  | { kind: "open-tab"; label: string; tab: WalnutTab };

// -- steps -------------------------------------------------------------------------------------

export interface TourStep {
  id: string;
  chapter: string;
  chapterIndex: number;
  title: string;
  /** Walnut speaking, first person. Kept to two sentences. */
  say: string;
  /** The literal thing the viewer does. Omitted for read-only steps. */
  todo?: string;
  /** Why it matters -- the failure this prevents. */
  why: string;
  features: string[];
  action?: TourAction;
  /** CSS selector (a data-tour attribute) to ring while this step is current. */
  spotlight?: string;
  /**
   * Reads real server state. `true` lights the "verified live" pill. `null` means this step is not
   * mechanically checkable and the guide says so rather than implying a check passed.
   */
  check: (context: TourContext) => boolean | null;
  checkLabel?: string;
  /** Shown when the step needs the seeded scenario rather than the viewer's own run. */
  seededNote?: string;
  command?: string;
}

const SUGGESTED_PROMPT =
  "Create a file called launch-notes.md summarising what this workspace contains, then run a command to list the files you created.";

function finished(status: string | null): boolean {
  return status === "completed" || status === "failed";
}

export const TOUR_STEPS: TourStep[] = [
  // -- 1. ground floor ---------------------------------------------------------------------
  {
    id: "pick-agent",
    chapter: "Ground floor",
    chapterIndex: 1,
    title: "Pick an Agent — or make one",
    say: "Everything here is the stock Agent Launchpad you already know. I sit behind it, so the platform you start from is the platform you keep.",
    todo: "Select an Agent in the left sidebar, or create one. Any Agent works.",
    why: "The middleware is additive. Agent CRUD, lifecycle and the Playground are untouched — if I broke them I would have failed before I started.",
    features: ["F19"],
    action: { kind: "create-agent", label: "Open the create form" },
    spotlight: '[data-tour="agent-list"]',
    check: (c) => c.hasSelectedAgent,
    checkLabel: "An Agent is selected",
  },

  // -- 2. a governed run -------------------------------------------------------------------
  {
    id: "send-task",
    chapter: "A governed run",
    chapterIndex: 2,
    title: "Give it real work",
    say: "Send a task the way you always would. What you won't see is that I built and sealed a context capsule before a single token reached the model.",
    todo: "Type a task into the Playground and send it. Use my suggestion if you'd rather not think of one.",
    why: "Authorisation has to happen before context construction. Once the prompt exists, the model has already seen the text — a rule in the prompt is not a control.",
    features: ["F1", "F19"],
    action: { kind: "suggest-prompt", label: "Fill in a suggested task", prompt: SUGGESTED_PROMPT },
    spotlight: '[data-tour="composer"]',
    check: (c) => c.runId !== null,
    checkLabel: "A Run exists",
  },
  {
    id: "open-walnut",
    chapter: "A governed run",
    chapterIndex: 2,
    title: "Let it finish, then open me up",
    say: "The run is ordinary. The record it leaves behind is not — press Walnut above the chat and I'll show you what I kept.",
    todo: "Wait for the run to finish, then press the Walnut button in the Playground toolbar.",
    why: "Every capability from here on executes in the backend. The panel only renders state the server already holds — a polished UI is not middleware.",
    features: ["F19"],
    action: { kind: "open-drawer", label: "Open the Walnut panel" },
    spotlight: '[data-tour="walnut-toggle"]',
    check: (c) => (c.runId === null ? false : finished(c.runStatus) && c.drawerOpen),
    checkLabel: "Run finished and the panel is open",
  },

  // -- 3. what the model knew --------------------------------------------------------------
  {
    id: "capsule",
    chapter: "What the model knew",
    chapterIndex: 3,
    title: "The capsule — a lockfile for knowledge",
    say: "This hash is the whole point of me. It pins the exact knowledge state your agent executed against — evidence, versions, policy revision, the ledger cut, all frozen before the run.",
    todo: "On Overview, read the capsule card: capsule hash, policy revision, evidence count, denied count.",
    why: "Software has package-lock.json. Agent cognition had nothing. Without a sealed capsule you cannot answer “what did it actually know?” after the fact.",
    features: ["F1", "F21"],
    action: { kind: "open-tab", label: "Go to Overview", tab: "overview" },
    spotlight: '[data-tour="walnut-drawer"]',
    check: (c) => (c.overview === null ? false : c.overview.capsule !== null),
    checkLabel: "A capsule was sealed for this run",
  },
  {
    id: "attestation",
    chapter: "What the model knew",
    chapterIndex: 3,
    title: "The attestation — facts, not the agent's word for them",
    say: "Command count, changed files, redactions, chain head, route receipt. None of it comes from the model telling me what it did.",
    todo: "Scroll the Overview panel to the attestation card and read the counts.",
    why: "An agent narrating its own success is an assertion. These numbers are derived from the observed event stream, so they hold even when the prose is wrong.",
    features: ["F18", "F7", "F8", "F21"],
    spotlight: '[data-tour="walnut-drawer"]',
    check: (c) => (c.overview === null ? false : c.overview.attestation !== null),
    checkLabel: "Attestation generated for this run",
  },

  // -- 4. what it was allowed to know ------------------------------------------------------
  {
    id: "decisions",
    chapter: "What it was allowed to know",
    chapterIndex: 4,
    title: "Every ALLOW and every DENY",
    say: "Each piece of evidence gets a decision before it can enter the prompt, and the denials are kept as carefully as the approvals.",
    todo: "Open the Evidence tab and read the consumed evidence and the denied decision ids.",
    why: "Effective access is agent grants ∩ delegating-principal grants ∩ evidence requirements ∩ policy. No component can widen authority, and every decision pins the policy revision it was made under.",
    features: ["F2", "F16"],
    action: { kind: "open-tab", label: "Go to Evidence", tab: "evidence" },
    spotlight: '[data-tour="walnut-drawer"]',
    check: (c) =>
      c.overview === null ? false : c.overview.decisions.allowed + c.overview.decisions.denied > 0,
    checkLabel: "Authorization decisions recorded",
    seededNote:
      "A fresh agent has no evidence to authorise yet, so this run's counts may be zero. That is honest, not broken — chapter 8 seeds a scenario where the counts are real.",
  },
  {
    id: "flight-recorder",
    chapter: "What it was allowed to know",
    chapterIndex: 4,
    title: "The flight recorder, already redacted",
    say: "Every Codex event the runtime emitted, in observed order, hash-chained. Each one passed through the redactor before it was allowed to touch disk.",
    todo: "Still on Evidence, read the runtime event sequence and look for the redaction markers.",
    why: "Secrets get fossilised in observability layers. Redaction happens before persistence, not before display — and it is proven by planted canaries in the test suite, not by hope.",
    features: ["F7", "F8", "F10"],
    spotlight: '[data-tour="walnut-drawer"]',
    check: (c) => (c.overview === null ? false : c.overview.chain.eventCount > 0),
    checkLabel: "Runtime events captured in the chain",
  },

  // -- 5. what depends on what -------------------------------------------------------------
  {
    id: "graph",
    chapter: "What depends on what",
    chapterIndex: 5,
    title: "The dependency graph",
    say: "Principals, agents, versions, runs, capsules, evidence, sources, decisions, artifacts — and the edges between them. I rebuild this from the ledger; it is a projection, never the source of truth.",
    todo: "Open the Dependencies tab and follow an AUTHORIZED_BY edge from the capsule to a decision.",
    why: "Without a graph you can find out what an agent did but never what inherited its belief. Because it is a pure projection, it can be rebuilt at any time and checked against the records.",
    features: ["F11", "F16"],
    action: { kind: "open-tab", label: "Go to Dependencies", tab: "dependencies" },
    spotlight: '[data-tour="walnut-drawer"]',
    check: (c) => (c.overview === null ? false : c.overview.dependencySummary.directEdges > 0),
    checkLabel: "Graph projected with edges",
  },

  // -- 6. prove nothing was edited ---------------------------------------------------------
  {
    id: "verify-chain",
    chapter: "Prove nothing was edited",
    chapterIndex: 6,
    title: "Verify the chain yourself",
    say: "Press Verify on Overview and I recompute the whole hash chain in front of you. Modify, delete, insert or reorder a record and I name the exact sequence that broke.",
    todo: "Back on Overview, press the Verify button and read the result.",
    why: "Append-only is a claim until someone can check it. This is the check — and it runs on demand, not on a schedule you have to trust.",
    features: ["F9", "F20"],
    action: { kind: "open-tab", label: "Back to Overview", tab: "overview" },
    spotlight: '[data-tour="walnut-drawer"]',
    check: (c) => (c.overview === null ? false : c.overview.chain.ok && c.overview.chain.eventCount > 0),
    checkLabel: "Chain verified intact",
  },
  {
    id: "reconcile-refusal",
    chapter: "Prove nothing was edited",
    chapterIndex: 6,
    title: "A refusal worth seeing",
    say: "Press Reconcile on this healthy run. I'll refuse it with a 409 — recovery is a response to invalidation, not a rerun button.",
    todo: "Press Reconcile on the Overview panel while this run is still CLEAN, and read the error.",
    why: "Most systems let you re-run anything. Rewind is only meaningful if it is reserved for runs that were actually invalidated — otherwise the recovery record means nothing.",
    features: ["F14"],
    spotlight: '[data-tour="walnut-drawer"]',
    check: (c) => (c.overview === null ? null : c.overview.walnutRunState === "CLEAN" ? null : null),
    checkLabel: "Walk-through step",
  },

  // -- 7. time travel ----------------------------------------------------------------------
  {
    id: "known-at",
    chapter: "Time travel",
    chapterIndex: 7,
    title: "What did we believe, and when",
    say: "History separates when something was true from when we recorded believing it. Set a known-at timestamp and the view answers as of that moment, not as of now.",
    todo: "Open the History tab and put an earlier timestamp into the known-at box.",
    why: "Audits get poisoned by hindsight. “You should have known” is only fair if the platform can show what it actually believed at the time.",
    features: ["F15", "F17"],
    action: { kind: "open-tab", label: "Go to History", tab: "history" },
    spotlight: '[data-tour="walnut-drawer"]',
    check: () => null,
    checkLabel: "Walk-through step",
  },

  // -- 8. the incident ---------------------------------------------------------------------
  {
    id: "seed",
    chapter: "The incident",
    chapterIndex: 8,
    title: "Seed the Launch Control Incident",
    say: "Your own agent can't show me everything — some of it needs several agents, a restricted payroll file and a source that goes bad. That scenario ships with the repo.",
    todo: "Run the seed script in a terminal, then restart the server so it picks the fixtures up.",
    command: "./scripts/walnut-demo-seed.sh   # then restart the server",
    why: "A launch team acts on a trusted date while payroll stays restricted; the date's source is later compromised. Every remaining capability exists because of one of those three pressures.",
    features: ["F5", "F6", "F10"],
    check: () => null,
    checkLabel: "Manual setup step",
    seededNote:
      "The full beat-by-beat script with expected output is demo/FULL-WALKTHROUGH.md. It was written from a real end-to-end drive, not from imagination.",
  },
  {
    id: "compromise",
    chapter: "The incident",
    chapterIndex: 8,
    title: "Break the truth, and watch it spread",
    say: "Mark the launch evidence COMPROMISED. I walk the graph and taint every capsule, run, derived claim and artifact that inherited it — each exactly once.",
    todo: "In the Evidence tab of a seeded run, compromise the launch claim, then look at the run state.",
    why: "After an incident the expensive question is scope. Guessing means rebuilding everything or missing something; the graph turns it into a traversal.",
    features: ["F12", "F13", "F11"],
    action: { kind: "open-tab", label: "Go to Evidence", tab: "evidence" },
    spotlight: '[data-tour="walnut-drawer"]',
    check: (c) => (c.overview === null ? false : c.overview.walnutRunState === "TAINTED"),
    checkLabel: "This run is TAINTED",
    seededNote: "Needs the seeded scenario — a fresh single-agent run has nothing downstream to taint.",
  },
  {
    id: "rewind",
    chapter: "The incident",
    chapterIndex: 8,
    title: "Rewind — without rewriting anything",
    say: "Reconcile now. I mint a brand-new run from a fresh capsule and link it RECOVERED_BY. The old run, its capsule and its chain are left byte-identical.",
    todo: "Press Reconcile on the tainted run and compare the old run with its replacement.",
    why: "Recovery that edits the past destroys the evidence you needed. And reconciliation is selective on purpose — anything still tainted stays on screen rather than being quietly declared healed.",
    features: ["F14", "F12"],
    action: { kind: "open-tab", label: "Go to Overview", tab: "overview" },
    spotlight: '[data-tour="walnut-drawer"]',
    check: (c) =>
      c.overview === null
        ? false
        : c.overview.walnutRunState === "RECOVERED" || c.overview.recoverySummary.count > 0,
    checkLabel: "Recovery recorded",
    seededNote: "Needs the seeded scenario.",
  },
  {
    id: "delegation",
    chapter: "The incident",
    chapterIndex: 8,
    title: "The parts that live outside the browser",
    say: "Delegated authority, agent-to-agent re-authorisation and the clarification refusal all execute below the UI, so the walkthrough drives them over the API.",
    todo: "Follow the share and clarification beats in demo/FULL-WALKTHROUGH.md.",
    why: "An agent must never exceed the human it acts for, a handoff must be re-checked for the recipient, and two conflicting claims must raise a typed question instead of a silent pick.",
    features: ["F3", "F4", "F22"],
    check: () => null,
    checkLabel: "Walk-through step",
    seededNote:
      "Runs execute with no delegating principal, so PRINCIPAL_SCOPE_MISSING is reachable through the share path — the walkthrough shows the DENY against an ALLOW control.",
  },

  // -- 9. honest limits --------------------------------------------------------------------
  {
    id: "limits",
    chapter: "Honest limits",
    chapterIndex: 9,
    title: "What I will not claim",
    say: "This is the part most demos skip. I would rather you trust the boundaries than oversell the middle.",
    why: "The whole product argues that assertions must carry evidence. It would be self-refuting to overstate what I can prove.",
    todo: "Read the full list in README section 15 — it is a gate item, not an afterthought.",
    features: ["F23"],
    check: () => null,
    checkLabel: "Closing note",
    seededNote:
      "Not claimed: that every physical model request is observed; that JSONL is a pre-command enforcement boundary; that the container is a hardened sandbox; that redaction equals anonymisation; that hash chaining proves an unobserved action never happened. F23 (offline evidence pack) was cut — absent, not stubbed.",
  },
];

export const TOUR_CHAPTERS: string[] = Array.from(
  TOUR_STEPS.reduce((map, step) => {
    map.set(step.chapterIndex, step.chapter);
    return map;
  }, new Map<number, string>()),
)
  .sort((a, b) => a[0] - b[0])
  .map(([, name]) => name);
