#!/usr/bin/env node
//
// walnut-demo-mint-runs.mjs — OFFLINE scenario staging for the frozen "Launch Control Incident"
// demo (demo/SCENARIO.md, demo/FULL-WALKTHROUGH.md).
//
// WHAT IT DOES
// ------------
// Mints the complete demo state — Research/Strategy/Comms runs, sealed capsules, hash-chained
// ledgers, authorization decisions, the source-integrity incident, the blast radius, and the
// selective recovery — directly into the on-disk store, with ZERO model calls and no ARK key.
// Every hash, chain, capsule and decision is produced by the REAL production modules under
// `apps/server/dist/**` (the same composition `apps/server/src/index.ts` wires), so the product's
// own verification passes: chains verify, capsule hashes recompute, nothing is hand-forged.
//
// The only thing faked is the RUNNER: `OfflineMintRunner` replays a realistic Codex JSONL
// sequence through the real `WalnutRuntimeEventSink` and writes the workspace files a real run
// would have written. This mirrors the blessed pattern in `apps/server/src/walnut/e2e.test.ts`
// (FakeRunner + real walnut plane), applied to the real disk store instead of a temp dir.
//
// HONESTY MARKER: because no model was called, every minted run carries `usage: null` and its
// `turn.completed` runtime event carries NO token metadata. A run with output but null usage is
// the tell that it was staged by this script, not executed against Ark. Do not narrate token
// counts for these runs.
//
// WHAT IT MINTS (see demo/SCENARIO.md beats B1, B3, B4, B5, B6)
// ------------------------------------------------------------
//   R1  Research Agent   COMPLETED  2 evidence accepted + citation-VERIFIED, 1 proposal
//                                   REJECTED `citation_mismatch` (recorded on R1's chain)
//   S1  Strategy Agent   COMPLETED  capsule sealed BEFORE the run: 1 consumed (launch, under
//                                   grant project:launch:*), 1 DENIED payroll
//                                   `AGENT_SCOPE_MISSING`; canary never in capsule/prompt/ledger
//   C1  Comms Agent      COMPLETED  consumes the launch evidence via a principal-less A2A share
//                                   from Strategy (launch only — payroll is never shared)
//   ..  incident         launch evidence v2 COMPROMISED (v1 still queryable, append-only)
//   ..  blast radius     S1 TAINTED + C1 TAINTED (trigger evidence recorded on each)
//   ..  healthy current  the corrected "October 15" claim + the pricing SUPERSEDED/ACTIVE pair
//                        (this replicates `walnut-demo-fixtures.mjs stage-sidecars` — see below)
//   S2  Strategy Agent   COMPLETED  reconciliation replacement; S1 -> RECOVERED_BY -> S2; S2's
//                                   fresh capsule status-DENIES the compromised claim
//                                   (`EVIDENCE_COMPROMISED`). C1 stays TAINTED — selective
//                                   recovery is the point, not an oversight.
//   S1's output, capsule bytes and ledger chain are hashed before and after the recovery arc and
//   asserted byte-identical: history is never rewritten.
//
// RELATIONSHIP TO `scripts/walnut-demo-fixtures.mjs stage-sidecars`
// ----------------------------------------------------------------
// That subcommand stages the same "healthy current" chain (date-slip Oct-15 + pricing supersede).
// It cannot run on Windows: it dynamic-`import()`s an absolute Windows path, which Node ESM
// rejects with ERR_UNSUPPORTED_ESM_URL_SCHEME. This script therefore replicates that staging
// itself (through the same real services), using `pathToFileURL()` for every dist import.
//   * If the Oct-15 claim is already in the evidence store, staging is SKIPPED (idempotent).
//   * Pass `--skip-sidecars` if you ran `stage-sidecars` yourself on a POSIX box.
// Deviation from the fixture: the staged records are attributed to R1 as `producerRunId` (the
// fixture invents an orphan run id), so the dependency graph has real PRODUCED edges.
//
// ORDER MATTERS. The healthy Oct-15 claim is staged only AFTER the Oct-1 claim is COMPROMISED —
// two ACTIVE claims for (project:aurora, launch_date) would make the broker raise a
// ClarificationRequest and refuse to assemble S2's capsule ("no silent pick, ever", INV-22).
//
// RESET / RESEED ORDER
// --------------------
//   1. stop the server
//   2. rm -rf .local/data .local/workspaces          # disposable demo state
//   3. npm run build                                 # apps/server/dist must exist
//   4. start the server (npm run poc), wait for /api/health
//   5. ./scripts/walnut-demo-seed.sh                 # agents + workspaces + grants, no model cost
//   6. node scripts/walnut-demo-mint-runs.mjs        # this script (server may stay up)
//   7. RESTART the server — it caches the stores in memory and will not see these writes
//      until it reloads. Do not drive the API between steps 6 and 7.
//
// This script never modifies any existing file in the repo and adds no npm dependency.
//
// USAGE: `--help`.

import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(repositoryRoot, "apps", "server", "dist");

const PAYROLL_CANARY = "WALNUT_CANARY_DENIED_PAYROLL_93c1e7";

const AGENT_NAMES = {
  research: "Research Agent",
  strategy: "Strategy Agent",
  comms: "Comms Agent",
};

// Prompts are the ones demo/FULL-WALKTHROUGH.md tells a judge to type, so the minted runs read
// exactly like a live pass.
const PROMPTS = {
  research:
    "Inspect the staged Aurora source files and report that the evidence outbox is ready. " +
    "Do not modify .walnut/outbox.json.",
  strategy: "Summarize the approved Aurora launch plan.",
  comms:
    "Read COMMS_TASK.md in your workspace and complete it exactly. " +
    "Use only the launch evidence in your Walnut context capsule.",
};

const USAGE = `walnut-demo-mint-runs.mjs — offline "Launch Control Incident" scenario staging

Mints R1 (Research) / S1 (Strategy) / C1 (Comms) / S2 (recovery) runs, their capsules, ledger
chains, authorization decisions, the compromise + blast radius, and the selective recovery into
the on-disk store using the real apps/server/dist modules. No model call, no ARK key.

USAGE
  node scripts/walnut-demo-mint-runs.mjs [options]
  node scripts/walnut-demo-mint-runs.mjs --verify [options]

OPTIONS
  --data-directory <path>     Store root. Default: $WALNUT_DEMO_DATA_DIR, $APP_DATA_DIR,
                              $LOCAL_POC_DATA_ROOT/data, or <repo>/.local/data
  --workspace-root <path>     Agent workspace root. Default: $AGENT_WORKSPACE_ROOT or
                              <repo>/.local/workspaces
  --research-agent-id <id>    Agent ids. When omitted they are discovered from the running
  --strategy-agent-id <id>    server (GET <base-url>/api/agents) and, failing that, from
  --comms-agent-id <id>       <data-directory>/launchpad.json, matched by agent name.
  --research-workspace <path> Per-agent workspace overrides. Default: <workspace-root>/<agentId>
  --strategy-workspace <path>
  --comms-workspace <path>
  --base-url <url>            Agent-discovery base URL. Default: http://127.0.0.1:3000
  --auth-token <token>        Bearer token for discovery, if APP_AUTH_TOKEN is set
  --skip-sidecars             Do not stage the healthy "October 15" + pricing-supersede chain
  --verify                    Verify an already-minted store and print the id table; mints nothing
  --json                      Also emit the id summary as one JSON line
  --force                     Mint even if a previous mint is detected (NOT recommended: it
                              produces duplicate evidence and a conflicting capsule story)
  -h, --help                  This text

AFTER MINTING: restart the server so it reloads the stores from disk.
RESET: stop server; rm -rf .local/data .local/workspaces; npm run build; start server;
       ./scripts/walnut-demo-seed.sh; node scripts/walnut-demo-mint-runs.mjs; restart server.
`;

// -- small utilities -----------------------------------------------------------------------------

function log(message) {
  process.stdout.write(`[mint] ${message}\n`);
}

function fail(message) {
  const error = new Error(message);
  error.expected = true;
  return error;
}

function option(name, fallback = null) {
  const withEquals = process.argv.find((argument) => argument.startsWith(`${name}=`));
  if (withEquals) return withEquals.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

function flag(...names) {
  return names.some((name) => process.argv.includes(name));
}

function defaultDataDirectory() {
  if (process.env.WALNUT_DEMO_DATA_DIR) return process.env.WALNUT_DEMO_DATA_DIR;
  if (process.env.APP_DATA_DIR) return process.env.APP_DATA_DIR;
  if (process.env.LOCAL_POC_DATA_ROOT) return path.join(process.env.LOCAL_POC_DATA_ROOT, "data");
  return process.platform === "darwin"
    ? path.join(os.homedir(), ".volc-agent-launchpad", "data")
    : path.join(repositoryRoot, ".local", "data");
}

function defaultWorkspaceRoot() {
  if (process.env.AGENT_WORKSPACE_ROOT) return process.env.AGENT_WORKSPACE_ROOT;
  if (process.env.LOCAL_POC_DATA_ROOT) return path.join(process.env.LOCAL_POC_DATA_ROOT, "workspaces");
  return process.platform === "darwin"
    ? path.join(os.homedir(), ".volc-agent-launchpad", "workspaces")
    : path.join(repositoryRoot, ".local", "workspaces");
}

// Node ESM refuses a bare Windows absolute path ("Received protocol 'c:'"). Every dist import in
// this file goes through pathToFileURL — this is the gotcha that breaks stage-sidecars on Windows.
function distImport(relativePath) {
  return import(pathToFileURL(path.join(distRoot, relativePath)).href);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

// Byte-exact offsets of `quote` inside `content` — the citation verifier does no fuzzy matching.
function sourceRange(content, quote) {
  const charStart = content.indexOf(quote);
  if (charStart < 0) throw fail(`Quote not found in staged source: ${quote}`);
  return { charStart, charEnd: charStart + quote.length };
}

function assert(condition, message) {
  if (!condition) throw fail(`ASSERTION FAILED: ${message}`);
}

async function readFileOrNull(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

// -- offline runner ------------------------------------------------------------------------------

// Replays a realistic `codex exec --json` line sequence through the REAL runtime event sink (so
// the ledger records are genuine, classified, redacted and hash-chained), then writes the file a
// real run of this role would have written. Emits no `usage` — no model was called.
class OfflineMintRunner {
  constructor(sink, rolesByAgentId) {
    this.sink = sink;
    this.rolesByAgentId = rolesByAgentId;
    this.requests = [];
  }

  scriptFor(role) {
    if (role === "research") {
      return {
        commands: [
          "ls -la",
          "cat launch-plan.txt payroll-note.txt",
          "cat .walnut/outbox.json",
        ],
        message:
          "Inspected the staged Aurora sources. launch-plan.txt and payroll-note.txt are present " +
          "and .walnut/outbox.json is ready for ingestion; I did not modify it. FINAL",
        file: null,
        output:
          "Aurora source files inspected. The evidence outbox is staged and unmodified: two " +
          "grounded proposals plus one deliberately bad anchor. FINAL",
      };
    }
    if (role === "strategy") {
      return {
        commands: ["ls -la", "cat AGENTS.md"],
        message: "Launch plan summarized from the sealed context capsule. FINAL",
        file: {
          name: "launch-strategy.md",
          content: [
            "# Aurora launch strategy",
            "",
            "Source of truth: the launch evidence in this run's Walnut context capsule.",
            "Approved launch date and region are cited by evidence id, never by recollection.",
            "Restricted staffing/payroll material was not available to this run.",
            "",
          ].join("\n"),
        },
        output:
          "Aurora launch plan summarized strictly from the launch evidence in the sealed context " +
          "capsule. Restricted payroll material was denied before assembly. FINAL",
      };
    }
    return {
      commands: ["ls -la", "cat COMMS_TASK.md"],
      message: "announcement.md written from the shared launch evidence. FINAL",
      file: {
        name: "announcement.md",
        content: [
          "# Aurora launch announcement",
          "",
          "Aurora is approved to launch on the date carried by the shared launch evidence in this",
          "run's context capsule, in the Southeast Asia region.",
          "",
          "No staffing or payroll information is referenced: none was shared with this Agent.",
          "",
        ].join("\n"),
      },
      output: "announcement.md written from the shared launch evidence only. FINAL",
    };
  }

  async run(request) {
    this.requests.push(request);
    const role = this.rolesByAgentId.get(request.agentId) ?? "strategy";
    const script = this.scriptFor(role);

    const lines = [];
    script.commands.forEach((command, index) => {
      const id = `cmd${index + 1}`;
      lines.push(
        JSON.stringify({
          type: "item.started",
          item: { id, type: "command_execution", command, status: "in_progress" },
        }),
      );
      lines.push(
        JSON.stringify({
          type: "item.completed",
          item: {
            id,
            type: "command_execution",
            command,
            aggregated_output: `${command}: ok`,
            exit_code: 0,
            status: "completed",
          },
        }),
      );
    });
    if (script.file !== null) {
      lines.push(
        JSON.stringify({
          type: "item.completed",
          item: { id: "fc1", type: "file_change", status: "completed" },
        }),
      );
    }
    lines.push(
      JSON.stringify({
        type: "item.completed",
        item: { id: "msg1", type: "agent_message", text: script.message },
      }),
    );
    // No `usage` key: this run made no model call, so no token counts are chained (see the
    // HONESTY MARKER at the top of this file).
    lines.push(JSON.stringify({ type: "turn.completed" }));

    for (const line of lines) {
      await this.sink.accept({
        runId: request.runId,
        agentId: request.agentId,
        provider: "local-process",
        rawEvent: line,
        receivedAt: new Date().toISOString(),
      });
    }

    if (script.file !== null) {
      await writeFile(
        path.join(request.workspacePath, script.file.name),
        script.file.content,
        "utf8",
      );
    }

    return { output: script.output, threadId: request.threadId ?? null, usage: null };
  }

  async cancel() {
    return false;
  }

  async isAvailable() {
    return true;
  }
}

// -- composition (mirrors apps/server/src/index.ts) ----------------------------------------------

// `withService: false` builds every store/service EXCEPT AgentService and the reconciliation
// service. `--verify` uses it so verification never mutates the store: AgentService.initialize()
// rewrites launchpad.json (it cancels queued/running runs), which a read-only check must not do.
async function buildComposition({ dataDirectory, workspaceRoot, rolesByAgentId, withService = true }) {
  const [
    { AgentService },
    { loadConfig },
    { JsonStore },
    { WorkspaceManager },
    { AuthorizationEvaluatorImpl },
    { GrantStore },
    { defaultPolicy, policyHash },
    { AgentVersionStoreImpl },
    { CapsuleStoreImpl },
    { CitationVerifierImpl },
    { ClarificationStoreImpl },
    { ContextBrokerImpl },
    { ShareServiceImpl },
    { ReconciliationServiceImpl, ReconciliationStore },
    { WalnutRunStateStore },
    { EvidenceStore, FileEvidenceRepository },
    { EvidenceWriteServiceImpl },
    { EvidenceLedger },
    { processOutbox },
    { Redactor },
    { WalnutRuntimeEventSink },
    { WorkspaceArtifactStore },
    { WorkspaceSourceResolver },
    { computeBlastRadius },
    { projectGraph },
    { canonicalJson },
  ] = await Promise.all([
    distImport("agent-service.js"),
    distImport("config.js"),
    distImport("store.js"),
    distImport("workspace.js"),
    distImport("walnut/auth/evaluator.js"),
    distImport("walnut/auth/grant-store.js"),
    distImport("walnut/auth/policy.js"),
    distImport("walnut/context/agent-version-store.js"),
    distImport("walnut/context/capsule-store.js"),
    distImport("walnut/context/citation-verifier.js"),
    distImport("walnut/context/clarification-store.js"),
    distImport("walnut/context/context-broker.js"),
    distImport("walnut/context/share-service.js"),
    distImport("walnut/dependency/reconciliation.js"),
    distImport("walnut/dependency/run-state.js"),
    distImport("walnut/evidence/evidence-store.js"),
    distImport("walnut/evidence/evidence-write-service.js"),
    distImport("walnut/evidence/ledger.js"),
    distImport("walnut/evidence/outbox.js"),
    distImport("walnut/evidence/redactor.js"),
    distImport("walnut/evidence/runtime-event-sink.js"),
    distImport("walnut/evidence/workspace-artifacts.js"),
    distImport("walnut/evidence/workspace-source.js"),
    distImport("walnut/dependency/blast-radius.js"),
    distImport("walnut/dependency/projector.js"),
    distImport("walnut/evidence/canonical-json.js"),
  ]);

  // ARK_API_KEY/ARK_MODEL only satisfy AgentService's `isArkConfigured` gate; the runner is
  // offline and never reads them. They are deliberately non-secret placeholders.
  const config = loadConfig({
    NODE_ENV: "test",
    APP_DATA_DIR: dataDirectory,
    AGENT_WORKSPACE_ROOT: workspaceRoot,
    CODEX_HOME: path.join(path.dirname(dataDirectory), "codex-home"),
    ARK_API_KEY: "offline-mint-no-model-call",
    ARK_MODEL: "offline-mint",
  });

  // Same shape the blessed fixtures script uses: an empty environment, so no host env value can
  // leak into (or be mistaken for a secret in) the minted demo records.
  const redactor = new Redactor({ environment: {} });
  const ledger = new EvidenceLedger(config.dataDirectory);
  const runtimeSink = new WalnutRuntimeEventSink({ ledger, redactor });
  const workspaces = new WorkspaceManager(config.workspaceRoot);

  const grantStore = new GrantStore(config.dataDirectory);
  const evaluator = new AuthorizationEvaluatorImpl({
    grantStore,
    policy: defaultPolicy,
    dataDir: config.dataDirectory,
  });
  const agentVersions = new AgentVersionStoreImpl(config.dataDirectory);
  const capsuleStore = new CapsuleStoreImpl(config.dataDirectory);

  const evidenceStore = new EvidenceStore(config.dataDirectory);
  const artifactStore = new WorkspaceArtifactStore(config.dataDirectory);
  const workspaceSources = new WorkspaceSourceResolver({
    resolveWorkspacePath: (agentId) => workspaces.workspacePath(agentId),
  });
  const evidenceRepository = new FileEvidenceRepository({
    store: evidenceStore,
    sources: workspaceSources,
  });
  const citationVerifier = new CitationVerifierImpl({ evidenceRepository });
  const evidenceWriteService = new EvidenceWriteServiceImpl({
    store: evidenceStore,
    sources: workspaceSources,
    verifier: citationVerifier,
    ledger,
    redactor,
  });

  const clarificationStore = new ClarificationStoreImpl(config.dataDirectory);
  const runStates = new WalnutRunStateStore(config.dataDirectory);
  const reconciliationStore = new ReconciliationStore(config.dataDirectory);

  const contextBroker = new ContextBrokerImpl({
    evidenceRepository,
    evaluator,
    capsuleStore,
    policy: defaultPolicy,
    getGovernanceHead: async () => (await ledger.verifyChain("_governance")).eventCount,
    clarifications: clarificationStore,
  });

  const shareService = new ShareServiceImpl({
    evidenceRepository,
    evaluator,
    grantStore,
    ledger,
    redactor,
  });

  const processRunOutbox = async (input) => {
    const result = await processOutbox({
      workspacePath: input.workspacePath,
      agentId: input.agentId,
      runId: input.runId,
      writeService: evidenceWriteService,
    });
    return {
      acceptedCount: result.accepted.length,
      rejectedCount: result.rejected.length,
      rejections: result.rejected,
    };
  };

  const store = new JsonStore(path.join(config.dataDirectory, "launchpad.json"));
  let runner = null;
  let service = null;
  let reconcileService = null;

  if (withService) {
    runner = new OfflineMintRunner(runtimeSink, rolesByAgentId);
    service = new AgentService(config, store, workspaces, runner, {
      broker: contextBroker,
      versions: agentVersions,
      capsules: capsuleStore,
      ledger,
      redactor,
      artifacts: artifactStore,
      processRunOutbox,
    });
    await service.initialize();

    reconcileService = new ReconciliationServiceImpl({
      runStates,
      capsules: capsuleStore,
      ledger,
      redactor,
      store: reconciliationStore,
      startRun: async (agentId, prompt) => {
        const { run } = await service.sendMessage(agentId, prompt);
        return { runId: run.id };
      },
    });
  } else {
    // Read-only: JsonStore.initialize() only writes when the file does not exist yet.
    await store.initialize();
  }

  return {
    config,
    canonicalJson,
    policyHash,
    defaultPolicy,
    store,
    service,
    runner,
    ledger,
    grantStore,
    evaluator,
    agentVersions,
    capsuleStore,
    evidenceStore,
    evidenceRepository,
    evidenceWriteService,
    artifactStore,
    runStates,
    reconciliationStore,
    reconcileService,
    shareService,
    computeBlastRadius,
    projectGraph,
  };
}

// Same live-store assembly the product's own /dependencies and blast-radius routes use
// (walnut-routes.ts `buildLiveGraph`), so the graph this script walks is the graph the UI shows.
async function buildLiveGraph(c) {
  const snapshot = c.store.snapshot();
  const [
    agentVersions,
    capsules,
    evidence,
    decisions,
    pointers,
    runStateRecords,
    reconciliations,
    artifacts,
  ] = await Promise.all([
    c.agentVersions.listAll(),
    c.capsuleStore.listAll(),
    c.evidenceStore.listAllVersions(),
    c.evaluator.listAll(),
    c.evidenceStore.listAllPointers(),
    c.runStates.listAll(),
    c.reconciliationStore.listAll(),
    c.artifactStore.listAll(),
  ]);

  return c.projectGraph({
    agents: snapshot.agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      status: agent.status,
    })),
    runs: snapshot.runs.map((run) => ({ id: run.id, agentId: run.agentId, status: run.status })),
    agentVersions,
    capsules,
    evidence,
    decisions,
    pointers,
    runStates: runStateRecords.map((record) => ({
      runId: record.runId,
      state: record.state,
      history: record.history.map((entry) => ({
        state: entry.state,
        triggerEvidenceId: entry.triggerEvidenceId,
        byRunId: entry.byRunId,
      })),
    })),
    reconciliations,
    artifacts,
  });
}

async function runToCompletion(c, runId, label) {
  const deadline = Date.now() + 120_000;
  for (;;) {
    const run = c.service.getRun(runId);
    if (run.status !== "queued" && run.status !== "running") {
      if (run.status !== "completed") {
        throw fail(`${label} finished as "${run.status}": ${run.error ?? "no error text"}`);
      }
      return run;
    }
    if (Date.now() > deadline) throw fail(`${label} did not finish within 120s`);
    await sleep(50);
  }
}

// -- discovery -----------------------------------------------------------------------------------

async function discoverAgents({ dataDirectory, baseUrl, authToken }) {
  const explicit = {
    research: option("--research-agent-id"),
    strategy: option("--strategy-agent-id"),
    comms: option("--comms-agent-id"),
  };
  if (explicit.research && explicit.strategy && explicit.comms) {
    return { agents: explicit, source: "cli" };
  }

  const fromName = (list) => {
    const pick = (name) => list.find((agent) => agent.name === name)?.id ?? null;
    return {
      research: explicit.research ?? pick(AGENT_NAMES.research),
      strategy: explicit.strategy ?? pick(AGENT_NAMES.strategy),
      comms: explicit.comms ?? pick(AGENT_NAMES.comms),
    };
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/agents`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        signal: AbortSignal.timeout(5_000),
      });
      if (response.ok) {
        const body = await response.json();
        const resolved = fromName(Array.isArray(body.agents) ? body.agents : []);
        if (resolved.research && resolved.strategy && resolved.comms) {
          return { agents: resolved, source: `${baseUrl}/api/agents` };
        }
      }
    } catch {
      // fall through to the retry / the on-disk fallback
    }
    if (attempt < 2) await sleep(1_000);
  }

  const raw = await readFileOrNull(path.join(dataDirectory, "launchpad.json"));
  if (raw !== null) {
    const resolved = fromName(JSON.parse(raw).agents ?? []);
    if (resolved.research && resolved.strategy && resolved.comms) {
      return { agents: resolved, source: "launchpad.json" };
    }
  }

  throw fail(
    "Could not resolve all three agent ids. Run ./scripts/walnut-demo-seed.sh first, or pass " +
      "--research-agent-id / --strategy-agent-id / --comms-agent-id explicitly.",
  );
}

function resolveWorkspaces(agents, workspaceRoot) {
  return {
    research: path.resolve(option("--research-workspace") ?? path.join(workspaceRoot, agents.research)),
    strategy: path.resolve(option("--strategy-workspace") ?? path.join(workspaceRoot, agents.strategy)),
    comms: path.resolve(option("--comms-workspace") ?? path.join(workspaceRoot, agents.comms)),
  };
}

// -- store lookups shared by mint and verify ------------------------------------------------------

const isLaunchOct1 = (evidence) =>
  evidence.predicate === "launch_date" &&
  evidence.subjectKey === "project:aurora" &&
  evidence.claim.includes("October 1.");
const isLaunchOct15 = (evidence) =>
  evidence.predicate === "launch_date" &&
  evidence.subjectKey === "project:aurora" &&
  evidence.claim.includes("October 15");
const isPayroll = (evidence) => evidence.predicate === "payroll_adjustment";

async function currentEvidence(c) {
  return c.evidenceStore.listCurrentEvidence();
}

// -- preflight -----------------------------------------------------------------------------------

async function preflight(c, workspaces, force) {
  const missingDist = await readFileOrNull(path.join(distRoot, "index.js"));
  if (missingDist === null) {
    throw fail(`apps/server/dist is missing or incomplete — run \`npm run build\` first (${distRoot})`);
  }

  const existing = await currentEvidence(c);
  const alreadyMinted = existing.some(isLaunchOct1) || existing.some(isPayroll);
  if (alreadyMinted && !force) {
    throw fail(
      "This store already holds minted Launch Control evidence (launch/payroll records exist).\n" +
        "  Re-minting would duplicate evidence and break the 1-consumed/1-denied capsule story.\n" +
        "  To re-run cleanly:\n" +
        "    1. stop the server\n" +
        "    2. rm -rf .local/data .local/workspaces\n" +
        "    3. start the server, then ./scripts/walnut-demo-seed.sh\n" +
        "    4. node scripts/walnut-demo-mint-runs.mjs\n" +
        "    5. restart the server\n" +
        "  (`--verify` inspects the existing state; `--force` overrides this guard.)",
    );
  }

  const walnutDirectory = path.join(workspaces.research, ".walnut");
  const walnutFiles = await readdir(walnutDirectory).catch(() => []);
  if (!walnutFiles.includes("outbox.json")) {
    throw fail(
      `No .walnut/outbox.json in the Research workspace (${workspaces.research}).\n` +
        "  Stage it first: node scripts/walnut-demo-fixtures.mjs prepare-research " +
        `"${workspaces.research}"\n` +
        "  (a leftover outbox.processed-*.json means a previous mint already consumed it — reset " +
        "the store as described above).",
    );
  }
}

// -- the mint ------------------------------------------------------------------------------------

async function mint({ dataDirectory, workspaceRoot, agents, workspaces, skipSidecars, force }) {
  const rolesByAgentId = new Map([
    [agents.research, "research"],
    [agents.strategy, "strategy"],
    [agents.comms, "comms"],
  ]);
  // Preflight on a read-only composition FIRST: a refused mint must not have written anything
  // (AgentService.initialize() rewrites launchpad.json as a side effect of being constructed).
  await preflight(
    await buildComposition({ dataDirectory, workspaceRoot, rolesByAgentId, withService: false }),
    workspaces,
    force,
  );
  const c = await buildComposition({ dataDirectory, workspaceRoot, rolesByAgentId });

  const ids = { agents, runs: {}, evidence: {}, capsules: {}, chains: {}, decisions: {} };

  // --- B1: Research run ------------------------------------------------------------------------
  log("B1  Research run R1 — truth intake through the real outbox");
  const r1 = (await c.service.sendMessage(agents.research, PROMPTS.research)).run;
  await runToCompletion(c, r1.id, "R1 (Research)");
  ids.runs.R1 = r1.id;
  ids.chains.R1 = `${r1.id}.ndjson`;

  const afterR1 = await currentEvidence(c);
  const launch = afterR1.find(isLaunchOct1);
  const payroll = afterR1.find(isPayroll);
  assert(launch !== undefined, "R1 did not produce the launch (October 1) evidence");
  assert(payroll !== undefined, "R1 did not produce the payroll evidence");
  ids.evidence.EV_OCT1 = launch.evidenceId;
  ids.evidence.EV_PAYROLL = payroll.evidenceId;

  for (const record of [launch, payroll]) {
    assert(record.status === "ACTIVE", `${record.evidenceId} is not ACTIVE`);
    assert(record.citationId !== null, `${record.evidenceId} has no citation`);
    const citation = await c.evidenceStore.getCitation(record.citationId);
    assert(
      citation?.verification === "VERIFIED",
      `${record.evidenceId} citation is ${citation?.verification ?? "missing"}, expected VERIFIED`,
    );
  }

  const r1Chain = await c.ledger.listEvents(r1.id);
  const rejections = r1Chain.filter((event) => event.kind === "evidence.proposal_rejected");
  assert(rejections.length === 1, `expected 1 evidence.proposal_rejected on R1, got ${rejections.length}`);
  assert(
    rejections[0].safePayload?.reason === "citation_mismatch",
    `R1 rejection reason is ${rejections[0].safePayload?.reason}, expected citation_mismatch`,
  );
  const outboxProcessed = r1Chain.find((event) => event.kind === "evidence.outbox_processed");
  assert(
    outboxProcessed?.safePayload?.acceptedCount === 2 && outboxProcessed?.safePayload?.rejectedCount === 1,
    "R1 outbox_processed is not { acceptedCount: 2, rejectedCount: 1 }",
  );
  log(`    R1=${r1.id}  accepted=2 verified  rejected=1 citation_mismatch`);

  // --- grant guard -----------------------------------------------------------------------------
  const strategyGrants = await c.grantStore.listFor(agents.strategy, null);
  const hasLaunchConsume = strategyGrants.some(
    (grant) =>
      grant.action === "consume" &&
      grant.txClosedAt === null &&
      (grant.resourcePattern === "project:launch:*" || grant.resourcePattern === "project:launch:read"),
  );
  if (!hasLaunchConsume) {
    const grant = await c.grantStore.issue({
      agentId: agents.strategy,
      principalId: null,
      resourcePattern: "project:launch:*",
      action: "consume",
      validFrom: new Date(0).toISOString(),
      validTo: null,
      issuedBy: "walnut-demo-mint",
      supersedesGrantId: null,
    });
    log(`    issued missing Strategy grant consume project:launch:* (${grant.grantId})`);
  }
  assert(
    !strategyGrants.some((grant) => grant.action === "consume" && grant.txClosedAt === null &&
      grant.resourcePattern.startsWith("project:payroll")),
    "Strategy holds a payroll CONSUME grant — the AGENT_SCOPE_MISSING beat cannot be minted",
  );

  // --- B3: Strategy run ------------------------------------------------------------------------
  log("B3  Strategy run S1 — least privilege, capsule sealed before the run");
  const s1 = (await c.service.sendMessage(agents.strategy, PROMPTS.strategy)).run;
  await runToCompletion(c, s1.id, "S1 (Strategy)");
  ids.runs.S1 = s1.id;
  ids.chains.S1 = `${s1.id}.ndjson`;

  const s1Capsule = await c.capsuleStore.getByRunId(s1.id);
  assert(s1Capsule !== null, "S1 has no capsule");
  ids.capsules.CAP_S1 = s1Capsule.capsuleId;
  assert(
    s1Capsule.evidence.length === 1 && s1Capsule.evidence[0].evidenceId === ids.evidence.EV_OCT1,
    `S1 capsule consumed ${s1Capsule.evidence.length} refs, expected exactly the launch evidence`,
  );
  assert(
    s1Capsule.deniedEvidenceDecisionIds.length === 1,
    `S1 capsule has ${s1Capsule.deniedEvidenceDecisionIds.length} denied decisions, expected 1`,
  );
  const allDecisions = await c.evaluator.listAll();
  const s1Denied = allDecisions.find(
    (decision) => decision.decisionId === s1Capsule.deniedEvidenceDecisionIds[0],
  );
  assert(
    s1Denied?.result === "DENY" && s1Denied?.reasonCode === "AGENT_SCOPE_MISSING" &&
      s1Denied?.evidenceId === ids.evidence.EV_PAYROLL,
    `S1's denied decision is ${s1Denied?.result}/${s1Denied?.reasonCode}, expected DENY/AGENT_SCOPE_MISSING on payroll`,
  );
  ids.decisions.S1_DENY_PAYROLL = s1Denied.decisionId;
  ids.decisions.S1_ALLOW_LAUNCH = s1Capsule.evidence[0].authorizationDecisionId;

  // The prompt the runner actually received must not carry the canary (INV-2a).
  const s1Request = c.runner.requests.find((request) => request.runId === s1.id);
  assert(
    s1Request !== undefined && !s1Request.prompt.includes(PAYROLL_CANARY),
    "the payroll canary reached S1's rendered prompt",
  );
  log(`    S1=${s1.id}  capsule=${s1Capsule.capsuleId}  1 consumed / 1 denied AGENT_SCOPE_MISSING`);

  // Snapshot S1's immutable artefacts so the recovery arc can be proven non-destructive.
  const capsuleDirectory = path.join(dataDirectory, "walnut", "capsules");
  const chainDirectory = path.join(dataDirectory, "walnut", "evidence");
  const s1CapsuleBytes = await readFile(path.join(capsuleDirectory, `${s1Capsule.capsuleId}.json`), "utf8");
  const s1ChainBytes = await readFile(path.join(chainDirectory, `${s1.id}.ndjson`), "utf8");
  const s1Snapshot = {
    capsuleHash: sha256(s1CapsuleBytes),
    chainHash: sha256(s1ChainBytes),
    output: c.service.getRun(s1.id).output,
  };

  // --- B4: A2A share + Comms run ---------------------------------------------------------------
  log("B4  A2A share (launch only) Strategy -> Comms, then Comms run C1");
  const share = await c.shareService.share({
    evidenceId: ids.evidence.EV_OCT1,
    fromAgentId: agents.strategy,
    toAgentId: agents.comms,
    principalId: null,
  });
  assert(
    share.result === "ALLOW",
    `share of the launch evidence was ${share.result}/${share.reasonCode}, expected ALLOW`,
  );
  ids.decisions.SHARE_SENDER = share.senderDecision.decisionId;
  ids.decisions.SHARE_RECIPIENT = share.recipientDecision?.decisionId ?? null;

  const c1 = (await c.service.sendMessage(agents.comms, PROMPTS.comms)).run;
  await runToCompletion(c, c1.id, "C1 (Comms)");
  ids.runs.C1 = c1.id;
  ids.chains.C1 = `${c1.id}.ndjson`;

  const c1Capsule = await c.capsuleStore.getByRunId(c1.id);
  assert(c1Capsule !== null, "C1 has no capsule");
  ids.capsules.CAP_C1 = c1Capsule.capsuleId;
  assert(
    c1Capsule.evidence.some((ref) => ref.evidenceId === ids.evidence.EV_OCT1),
    "C1's capsule does not contain the shared launch evidence",
  );
  assert(
    !c1Capsule.evidence.some((ref) => ref.evidenceId === ids.evidence.EV_PAYROLL),
    "C1's capsule contains the payroll evidence — the share must never carry it",
  );
  log(`    C1=${c1.id}  capsule=${c1Capsule.capsuleId}  consumes the shared launch evidence`);

  // --- B5: the incident ------------------------------------------------------------------------
  log("B5  incident — the original launch evidence is COMPROMISED (append-only)");
  const compromised = await c.evidenceWriteService.compromise(
    ids.evidence.EV_OCT1,
    "source integrity incident: launch-plan.txt found tampered at origin",
  );
  assert(compromised.status === "COMPROMISED", "compromise did not yield a COMPROMISED version");
  assert(compromised.version === 2, `compromised version is ${compromised.version}, expected 2`);
  const originalVersion = await c.evidenceStore.getEvidence(ids.evidence.EV_OCT1, 1);
  assert(
    originalVersion?.status === "ACTIVE" && originalVersion?.txClosedAt !== null,
    "the original launch evidence version is no longer queryable as a closed ACTIVE record",
  );

  // Same traversal + tagging the product's own compromise route performs (walnut-routes.ts).
  const graph = await buildLiveGraph(c);
  const radius = c.computeBlastRadius(
    graph,
    { kind: "evidence", id: ids.evidence.EV_OCT1 },
    new Date().toISOString(),
  );
  const reason = `evidence ${ids.evidence.EV_OCT1} compromised`;
  for (const runId of radius.runIds) {
    await c.runStates.markTainted(runId, ids.evidence.EV_OCT1, reason);
  }
  assert(
    radius.runIds.includes(s1.id) && radius.runIds.includes(c1.id),
    `blast radius runs = [${radius.runIds.join(", ")}]; expected both S1 and C1`,
  );
  assert(
    !radius.runIds.includes(r1.id),
    "the producer run R1 landed in the blast radius — precision beat broken",
  );
  assert((await c.runStates.get(s1.id)) === "TAINTED", "S1 is not TAINTED");
  assert((await c.runStates.get(c1.id)) === "TAINTED", "C1 is not TAINTED");
  log(
    `    blast radius: ${radius.runIds.length} runs, ${radius.capsuleIds.length} capsules, ` +
      `${radius.artifactIds.length} artifacts -> S1 + C1 TAINTED`,
  );

  // --- healthy current chain (replicates stage-sidecars) ----------------------------------------
  const staged = await stageHealthyCurrent(c, {
    agents,
    workspaces,
    producerRunId: r1.id,
    ids,
    skipSidecars,
  });

  // --- B6: selective recovery ------------------------------------------------------------------
  log("B6  recovery — reconcile S1 only; C1 stays TAINTED by design");
  const record = await c.reconcileService.reconcile(s1.id, PROMPTS.strategy, agents.strategy);
  assert(record.result === "COMPLETED", `reconciliation result is ${record.result}, expected COMPLETED`);
  ids.runs.S2 = record.replacementRunId;
  ids.chains.S2 = `${record.replacementRunId}.ndjson`;
  ids.capsules.CAP_S2 = record.newCapsuleId;
  ids.reconciliationId = record.reconciliationId;
  await runToCompletion(c, record.replacementRunId, "S2 (recovery)");

  const s2Capsule = await c.capsuleStore.getByRunId(record.replacementRunId);
  assert(s2Capsule !== null, "S2 has no capsule");
  assert(
    !s2Capsule.evidence.some((ref) => ref.evidenceId === ids.evidence.EV_OCT1),
    "S2's capsule still consumes the compromised launch evidence",
  );
  const decisionsAfter = await c.evaluator.listAll();
  const s2DeniedIds = new Set(s2Capsule.deniedEvidenceDecisionIds);
  const compromisedDecision = decisionsAfter.find(
    (decision) => s2DeniedIds.has(decision.decisionId) && decision.evidenceId === ids.evidence.EV_OCT1,
  );
  assert(
    compromisedDecision?.result === "DENY" && compromisedDecision?.reasonCode === "EVIDENCE_COMPROMISED",
    `S2's decision on the compromised evidence is ${compromisedDecision?.reasonCode}, expected EVIDENCE_COMPROMISED`,
  );
  ids.decisions.S2_DENY_COMPROMISED = compromisedDecision.decisionId;

  assert((await c.runStates.get(s1.id)) === "RECOVERED", "S1 is not RECOVERED");
  const s1History = await c.runStates.history(s1.id);
  assert(
    s1History.at(-1)?.state === "RECOVERED" && s1History.at(-1)?.byRunId === record.replacementRunId,
    "S1's history does not end at RECOVERED byRunId S2",
  );
  assert(
    s1History.some((entry) => entry.state === "TAINTED" && entry.triggerEvidenceId === ids.evidence.EV_OCT1),
    "S1's TAINTED history entry does not record the trigger evidence",
  );
  assert((await c.runStates.get(c1.id)) === "TAINTED", "C1 is no longer TAINTED (selective recovery broken)");
  log(
    `    S2=${record.replacementRunId}  capsule=${s2Capsule.capsuleId}  ` +
      `${s2Capsule.evidence.length} consumed / ${s2Capsule.deniedEvidenceDecisionIds.length} denied`,
  );

  // --- history was never rewritten ---------------------------------------------------------------
  const s1CapsuleAfter = await readFile(path.join(capsuleDirectory, `${s1Capsule.capsuleId}.json`), "utf8");
  const s1ChainAfter = await readFile(path.join(chainDirectory, `${s1.id}.ndjson`), "utf8");
  assert(sha256(s1CapsuleAfter) === s1Snapshot.capsuleHash, "S1's capsule file changed during recovery");
  assert(sha256(s1ChainAfter) === s1Snapshot.chainHash, "S1's ledger chain changed during recovery");
  assert(c.service.getRun(s1.id).output === s1Snapshot.output, "S1's run output changed during recovery");
  log("    S1's output, capsule bytes and ledger chain are byte-identical — history untouched");

  return { c, ids, staged, radius };
}

// Replicates `walnut-demo-fixtures.mjs stage-sidecars` through the same real services (that
// subcommand cannot run on Windows). Idempotent: skipped when the Oct-15 claim already exists.
async function stageHealthyCurrent(c, { agents, workspaces, producerRunId, ids, skipSidecars }) {
  if (skipSidecars) {
    log("--  healthy-current staging skipped (--skip-sidecars)");
    return { staged: false, reason: "skipped by flag" };
  }
  const existing = await currentEvidence(c);
  if (existing.some(isLaunchOct15)) {
    const already = existing.find(isLaunchOct15);
    ids.evidence.EV_OCT15 = already.evidenceId;
    log("--  healthy-current staging skipped (October 15 claim already in the store)");
    return { staged: false, reason: "already present" };
  }

  log("--  staging the healthy current chain (Oct-15 claim + pricing SUPERSEDED/ACTIVE pair)");
  const dateSlipContent = "Aurora launch control update\nApproved launch date: October 15.\n";
  const dateSlipQuote = "Approved launch date: October 15.";
  const pricingContent = [
    "Aurora launch pricing",
    "Original launch price: SGD 79.",
    "Corrected launch price: SGD 69.",
    "",
  ].join("\n");
  const originalPriceQuote = "Original launch price: SGD 79.";
  const correctedPriceQuote = "Corrected launch price: SGD 69.";

  await Promise.all([
    writeFile(path.join(workspaces.research, "date-slip.txt"), dateSlipContent, "utf8"),
    writeFile(path.join(workspaces.research, "pricing-update.txt"), pricingContent, "utf8"),
  ]);

  const create = async (input) => {
    const result = await c.evidenceWriteService.createEvidence({
      producerAgentId: agents.research,
      producerRunId,
      classification: "INTERNAL",
      requiredScopes: ["project:launch:read"],
      derivedFromEvidenceIds: [],
      validTo: null,
      ...input,
    });
    if (!result.ok) throw fail(`staging failed (${result.reason}): ${result.detail}`);
    return result.evidence;
  };

  const oct15 = await create({
    claim: "Aurora is now scheduled to launch on October 15.",
    subjectKey: "project:aurora",
    predicate: "launch_date",
    source: {
      path: "date-slip.txt",
      quote: dateSlipQuote,
      ...sourceRange(dateSlipContent, dateSlipQuote),
    },
    supersedesEvidenceId: null,
    validFrom: "2026-10-15T00:00:00.000Z",
  });
  const pricingOriginal = await create({
    claim: "Aurora launch price is SGD 79.",
    subjectKey: "project:aurora",
    predicate: "launch_price",
    source: {
      path: "pricing-update.txt",
      quote: originalPriceQuote,
      ...sourceRange(pricingContent, originalPriceQuote),
    },
    supersedesEvidenceId: null,
    validFrom: null,
  });
  const pricingReplacement = await create({
    claim: "Aurora launch price is SGD 69.",
    subjectKey: "project:aurora",
    predicate: "launch_price",
    source: {
      path: "pricing-update.txt",
      quote: correctedPriceQuote,
      ...sourceRange(pricingContent, correctedPriceQuote),
    },
    supersedesEvidenceId: pricingOriginal.evidenceId,
    validFrom: null,
  });
  const transition = await c.evidenceWriteService.supersede(
    pricingOriginal.evidenceId,
    pricingReplacement.evidenceId,
  );

  ids.evidence.EV_OCT15 = oct15.evidenceId;
  ids.evidence.EV_PRICING_OLD = transition.superseded.evidenceId;
  ids.evidence.EV_PRICING_NEW = transition.replacement.evidenceId;
  log(
    `    EV_OCT15=${oct15.evidenceId}  pricing ${transition.superseded.evidenceId} SUPERSEDED -> ` +
      `${transition.replacement.evidenceId} ACTIVE`,
  );
  return { staged: true, reason: "staged by this run" };
}

// -- verification --------------------------------------------------------------------------------

// Rediscovers every id from the store alone (no receipt file) and re-checks every invariant the
// mint asserted, plus chain and capsule-hash integrity.
async function verify({ dataDirectory, workspaceRoot, agents }) {
  const rolesByAgentId = new Map([
    [agents.research, "research"],
    [agents.strategy, "strategy"],
    [agents.comms, "comms"],
  ]);
  const c = await buildComposition({
    dataDirectory,
    workspaceRoot,
    rolesByAgentId,
    withService: false,
  });

  const ids = { agents, runs: {}, evidence: {}, capsules: {}, chains: {}, decisions: {} };
  const checks = [];
  const check = (name, condition, detail = "") => {
    checks.push({ name, ok: Boolean(condition), detail });
  };

  const allVersions = await c.evidenceStore.listAllVersions();
  const current = await c.evidenceStore.listCurrentEvidence();
  const launch = current.find(isLaunchOct1);
  const payroll = current.find(isPayroll);
  const oct15 = current.find(isLaunchOct15);
  if (!launch || !payroll) {
    throw fail("No minted Launch Control evidence found in this store — run the mint first.");
  }
  ids.evidence.EV_OCT1 = launch.evidenceId;
  ids.evidence.EV_PAYROLL = payroll.evidenceId;
  if (oct15) ids.evidence.EV_OCT15 = oct15.evidenceId;
  const pricing = current.filter((record) => record.predicate === "launch_price");
  const supersededPricing = pricing.find((record) => record.status === "SUPERSEDED");
  const activePricing = pricing.find((record) => record.status === "ACTIVE");
  if (supersededPricing) ids.evidence.EV_PRICING_OLD = supersededPricing.evidenceId;
  if (activePricing) ids.evidence.EV_PRICING_NEW = activePricing.evidenceId;

  ids.runs.R1 = launch.producerRunId;
  ids.chains.R1 = `${launch.producerRunId}.ndjson`;

  const capsules = await c.capsuleStore.listAll();
  const consumers = capsules
    .filter((capsule) => capsule.evidence.some((ref) => ref.evidenceId === ids.evidence.EV_OCT1))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const s1Capsule = consumers.find((capsule) => capsule.agentId === agents.strategy);
  const c1Capsule = consumers.find((capsule) => capsule.agentId === agents.comms);
  check("S1 capsule found (Strategy consumed the launch evidence)", s1Capsule !== undefined);
  check("C1 capsule found (Comms consumed the shared launch evidence)", c1Capsule !== undefined);
  if (!s1Capsule || !c1Capsule) {
    return { c, ids, checks };
  }
  ids.runs.S1 = s1Capsule.runId;
  ids.capsules.CAP_S1 = s1Capsule.capsuleId;
  ids.chains.S1 = `${s1Capsule.runId}.ndjson`;
  ids.runs.C1 = c1Capsule.runId;
  ids.capsules.CAP_C1 = c1Capsule.capsuleId;
  ids.chains.C1 = `${c1Capsule.runId}.ndjson`;

  const reconciliations = await c.reconciliationStore.listAll();
  const reconciliation = reconciliations.find((record) => record.staleRunId === ids.runs.S1);
  check("reconciliation record for S1 exists and COMPLETED", reconciliation?.result === "COMPLETED");
  if (reconciliation) {
    ids.runs.S2 = reconciliation.replacementRunId;
    ids.chains.S2 = `${reconciliation.replacementRunId}.ndjson`;
    ids.capsules.CAP_S2 = reconciliation.newCapsuleId;
    ids.reconciliationId = reconciliation.reconciliationId;
  }

  const snapshot = c.store.snapshot();
  const runById = new Map(snapshot.runs.map((run) => [run.id, run]));
  for (const [label, runId] of Object.entries(ids.runs)) {
    check(`${label} exists and is completed`, runById.get(runId)?.status === "completed", runId);
  }

  // Ledger chains (per-run + governance) must verify.
  for (const [label, runId] of Object.entries(ids.runs)) {
    const verification = await c.ledger.verifyChain(runId);
    check(
      `${label} ledger chain verifies`,
      verification.ok,
      `${verification.eventCount} events${verification.ok ? "" : ` — ${verification.reason}`}`,
    );
  }
  const governance = await c.ledger.verifyChain("_governance");
  check("governance chain verifies", governance.ok, `${governance.eventCount} events`);

  // Capsule hashes must recompute (the product's own canonical hash over everything but itself).
  for (const capsule of [s1Capsule, c1Capsule]) {
    const { capsuleHash, ...withoutHash } = capsule;
    check(
      `capsule ${capsule.capsuleId} hash recomputes`,
      capsuleHash === `sha256:${createHash("sha256").update(c.canonicalJson(withoutHash), "utf8").digest("hex")}`,
    );
  }

  // S1: exactly 1 consumed + 1 denied AGENT_SCOPE_MISSING on payroll.
  const decisions = await c.evaluator.listAll();
  const decisionById = new Map(decisions.map((decision) => [decision.decisionId, decision]));
  check("S1 capsule consumed exactly 1 evidence ref", s1Capsule.evidence.length === 1);
  check("S1 capsule has exactly 1 denied decision", s1Capsule.deniedEvidenceDecisionIds.length === 1);
  const s1Denied = decisionById.get(s1Capsule.deniedEvidenceDecisionIds[0]);
  check(
    "S1's denial is DENY/AGENT_SCOPE_MISSING on the payroll evidence",
    s1Denied?.result === "DENY" &&
      s1Denied?.reasonCode === "AGENT_SCOPE_MISSING" &&
      s1Denied?.evidenceId === ids.evidence.EV_PAYROLL,
    s1Denied ? `${s1Denied.result}/${s1Denied.reasonCode}` : "missing",
  );
  if (s1Denied) ids.decisions.S1_DENY_PAYROLL = s1Denied.decisionId;
  ids.decisions.S1_ALLOW_LAUNCH = s1Capsule.evidence[0]?.authorizationDecisionId ?? null;

  // Evidence lifecycle: v1 ACTIVE and still queryable, v2 COMPROMISED.
  const v1 = allVersions.find(
    (record) => record.evidenceId === ids.evidence.EV_OCT1 && record.version === 1,
  );
  check("launch evidence v1 is still queryable as ACTIVE (append-only)", v1?.status === "ACTIVE");
  check("launch evidence current version is COMPROMISED", launch.status === "COMPROMISED", `v${launch.version}`);

  // Run states.
  check("S1 is RECOVERED", (await c.runStates.get(ids.runs.S1)) === "RECOVERED");
  check("C1 is still TAINTED (selective recovery)", (await c.runStates.get(ids.runs.C1)) === "TAINTED");
  check("R1 was never tainted", (await c.runStates.get(ids.runs.R1)) === "CLEAN");
  const s1History = await c.runStates.history(ids.runs.S1);
  check(
    "S1 history: TAINTED (trigger recorded) -> RECOVERED byRunId S2",
    s1History.some(
      (entry) => entry.state === "TAINTED" && entry.triggerEvidenceId === ids.evidence.EV_OCT1,
    ) && s1History.at(-1)?.state === "RECOVERED" && s1History.at(-1)?.byRunId === ids.runs.S2,
  );

  // S2's capsule status-denies the compromised claim.
  if (ids.runs.S2) {
    const s2Capsule = await c.capsuleStore.getByRunId(ids.runs.S2);
    check("S2 has a fresh capsule", s2Capsule !== null);
    if (s2Capsule) {
      check(
        "S2 does not consume the compromised evidence",
        !s2Capsule.evidence.some((ref) => ref.evidenceId === ids.evidence.EV_OCT1),
      );
      const denied = s2Capsule.deniedEvidenceDecisionIds
        .map((decisionId) => decisionById.get(decisionId))
        .find((decision) => decision?.evidenceId === ids.evidence.EV_OCT1);
      check(
        "S2 records DENY/EVIDENCE_COMPROMISED for the launch evidence",
        denied?.result === "DENY" && denied?.reasonCode === "EVIDENCE_COMPROMISED",
        denied ? `${denied.result}/${denied.reasonCode}` : "missing",
      );
      if (denied) ids.decisions.S2_DENY_COMPROMISED = denied.decisionId;
    }
  }

  // INV-2: the canary is stored but never rendered — absent from every capsule and every chain.
  const capsuleDirectory = path.join(dataDirectory, "walnut", "capsules");
  const chainDirectory = path.join(dataDirectory, "walnut", "evidence");
  let canaryLeaks = [];
  for (const [directory, extension] of [[capsuleDirectory, ".json"], [chainDirectory, ".ndjson"]]) {
    const entries = await readdir(directory).catch(() => []);
    for (const entry of entries) {
      if (!entry.endsWith(extension)) continue;
      const raw = await readFileOrNull(path.join(directory, entry));
      if (raw !== null && raw.includes(PAYROLL_CANARY)) canaryLeaks.push(entry);
    }
  }
  check("payroll canary absent from every capsule and every ledger chain", canaryLeaks.length === 0, canaryLeaks.join(", "));
  const storeRaw = await readFileOrNull(path.join(chainDirectory, "evidence-store.json"));
  check(
    "payroll canary IS present in the evidence store (stored != rendered)",
    storeRaw !== null && storeRaw.includes(PAYROLL_CANARY),
  );

  return { c, ids, checks };
}

// -- output --------------------------------------------------------------------------------------

function table(rows) {
  const widths = [0, 1, 2].map((column) =>
    Math.max(...rows.map((row) => String(row[column] ?? "").length)),
  );
  const line = (left, middle, right) =>
    left + widths.map((width) => "-".repeat(width + 2)).join(middle) + right;
  const render = (row) =>
    "| " + [0, 1, 2].map((column) => String(row[column] ?? "").padEnd(widths[column])).join(" | ") + " |";
  return [line("+", "+", "+"), render(rows[0]), line("+", "+", "+"), ...rows.slice(1).map(render), line("+", "+", "+")].join(
    "\n",
  );
}

function printSummary(ids, extra = {}) {
  const rows = [["KEY", "ID", "WHAT IT IS"]];
  const push = (key, id, what) => {
    if (id) rows.push([key, id, what]);
  };
  push("RESEARCH", ids.agents.research, "Research Agent");
  push("STRATEGY", ids.agents.strategy, "Strategy Agent");
  push("COMMS", ids.agents.comms, "Comms Agent");
  push("R1", ids.runs.R1, "Research run — COMPLETED, 2 verified / 1 citation_mismatch");
  push("S1", ids.runs.S1, "Strategy run — COMPLETED, TAINTED -> RECOVERED by S2");
  push("C1", ids.runs.C1, "Comms run — COMPLETED, TAINTED (selective recovery)");
  push("S2", ids.runs.S2, "Recovery run — COMPLETED, denies the compromised claim");
  push("CAP_S1", ids.capsules.CAP_S1, "S1 capsule — 1 consumed / 1 denied");
  push("CAP_C1", ids.capsules.CAP_C1, "C1 capsule — consumes the shared launch evidence");
  push("CAP_S2", ids.capsules.CAP_S2, "S2 capsule — EVIDENCE_COMPROMISED deny recorded");
  push("EV_OCT1", ids.evidence.EV_OCT1, "launch claim (Oct 1) — v1 ACTIVE, v2 COMPROMISED");
  push("EV_PAYROLL", ids.evidence.EV_PAYROLL, "payroll claim — RESTRICTED, denied to Strategy");
  push("EV_OCT15", ids.evidence.EV_OCT15, "healthy current launch claim (Oct 15) — ACTIVE");
  push("EV_PRICING_OLD", ids.evidence.EV_PRICING_OLD, "pricing SGD 79 — SUPERSEDED");
  push("EV_PRICING_NEW", ids.evidence.EV_PRICING_NEW, "pricing SGD 69 — ACTIVE");
  push("RECONCILIATION", ids.reconciliationId, "reconciliation record (S1 -> S2)");
  push("CHAIN_R1", ids.chains.R1, "ledger chain file (walnut/evidence/)");
  push("CHAIN_S1", ids.chains.S1, "ledger chain file");
  push("CHAIN_C1", ids.chains.C1, "ledger chain file");
  push("CHAIN_S2", ids.chains.S2, "ledger chain file");
  push("CHAIN_GOV", "_governance.ndjson", "governance chain (shares, lifecycle, reconciliation)");
  push("DEC_S1_ALLOW", ids.decisions.S1_ALLOW_LAUNCH, "S1 ALLOW on the launch evidence");
  push("DEC_S1_DENY", ids.decisions.S1_DENY_PAYROLL, "S1 DENY AGENT_SCOPE_MISSING on payroll");
  push("DEC_SHARE_SEND", ids.decisions.SHARE_SENDER, "A2A share — sender decision");
  push("DEC_SHARE_RECV", ids.decisions.SHARE_RECIPIENT, "A2A share — final recipient decision");
  push("DEC_S2_DENY", ids.decisions.S2_DENY_COMPROMISED, "S2 DENY EVIDENCE_COMPROMISED");

  process.stdout.write("\n" + table(rows) + "\n");
  if (extra.note) process.stdout.write(`\n${extra.note}\n`);
}

// -- entry point ---------------------------------------------------------------------------------

async function main() {
  if (flag("-h", "--help")) {
    process.stdout.write(USAGE);
    return 0;
  }

  const dataDirectory = path.resolve(option("--data-directory") ?? defaultDataDirectory());
  const workspaceRoot = path.resolve(option("--workspace-root") ?? defaultWorkspaceRoot());
  const baseUrl = option("--base-url") ?? "http://127.0.0.1:3000";
  const authToken = option("--auth-token") ?? process.env.WALNUT_DEMO_AUTH_TOKEN ?? process.env.APP_AUTH_TOKEN ?? "";
  const wantsJson = flag("--json");

  const { agents, source } = await discoverAgents({ dataDirectory, baseUrl, authToken });
  const workspaces = resolveWorkspaces(agents, workspaceRoot);
  log(`data directory : ${dataDirectory}`);
  log(`workspace root : ${workspaceRoot}`);
  log(`agents         : discovered via ${source}`);

  if (flag("--verify")) {
    const { ids, checks } = await verify({ dataDirectory, workspaceRoot, agents });
    process.stdout.write("\n");
    for (const item of checks) {
      process.stdout.write(
        `  ${item.ok ? "PASS" : "FAIL"}  ${item.name}${item.detail ? `  (${item.detail})` : ""}\n`,
      );
    }
    const failed = checks.filter((item) => !item.ok);
    printSummary(ids, {
      note:
        failed.length === 0
          ? `VERIFY OK — ${checks.length}/${checks.length} checks passed.`
          : `VERIFY FAILED — ${failed.length} of ${checks.length} checks failed.`,
    });
    if (wantsJson) process.stdout.write(JSON.stringify({ verify: true, ids, checks }) + "\n");
    return failed.length === 0 ? 0 : 1;
  }

  const { ids, staged, radius } = await mint({
    dataDirectory,
    workspaceRoot,
    agents,
    workspaces,
    skipSidecars: flag("--skip-sidecars"),
    force: flag("--force"),
  });

  printSummary(ids, {
    note: [
      `MINT OK — 4 runs, ${radius.runIds.length} tainted by the incident, 1 selective recovery.`,
      `Healthy-current chain: ${staged.staged ? "staged by this run" : staged.reason}.`,
      "No model was called: every minted run carries usage: null by design.",
      "RESTART THE SERVER now — it caches these stores in memory and will not see the writes",
      "until it reloads. Then re-check with:  node scripts/walnut-demo-mint-runs.mjs --verify",
    ].join("\n"),
  });
  if (wantsJson) process.stdout.write(JSON.stringify({ mint: true, ids }) + "\n");
  return 0;
}

try {
  process.exitCode = await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`\n[mint] ${message}\n`);
  if (!(error && error.expected) && error instanceof Error && error.stack) {
    process.stderr.write(`${error.stack}\n`);
  }
  process.exitCode = 1;
}
