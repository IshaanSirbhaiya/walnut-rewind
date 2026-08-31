import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import type { RunWalnutOverview } from "../types";
import { WalnutMark } from "./WalnutMark";
import {
  FEATURES,
  TOUR_CHAPTERS,
  TOUR_STEPS,
  type FeatureSurface,
  type TourAction,
  type TourContext,
  type TourStep,
} from "./tour-steps";

// The guided tour. Walnut introduces itself on first open, then walks the viewer through the
// middleware one step at a time.
//
// Two rules shape this component:
//   1. It never gates. Every step advances on the viewer's click; the live checks only *confirm*
//      what the server reports, they never block progress. A viewer with no container engine can
//      still read the whole tour.
//   2. It never claims. A step says "verified live" only where `check` read real state back from
//      the API for the selected Run (CLAUDE.md sec.4, the truthfulness rule).

const STORAGE_KEY = "walnut.tour.v1";

type Stage = "welcome" | "running" | "closed";

interface Persisted {
  stage: Stage;
  stepIndex: number;
}

function loadPersisted(): Persisted {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { stage: "welcome", stepIndex: 0 };
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    const stage: Stage =
      parsed.stage === "running" || parsed.stage === "closed" ? parsed.stage : "welcome";
    const stepIndex =
      typeof parsed.stepIndex === "number" && parsed.stepIndex >= 0 && parsed.stepIndex < TOUR_STEPS.length
        ? parsed.stepIndex
        : 0;
    return { stage, stepIndex };
  } catch {
    // Private windows and blocked site data both throw here. A tour that cannot remember itself
    // is still a working tour.
    return { stage: "welcome", stepIndex: 0 };
  }
}

function savePersisted(value: Persisted): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* nothing to do -- see loadPersisted */
  }
}

export function WalnutTour({
  context,
  onAction,
}: {
  context: Omit<TourContext, "overview">;
  onAction: (action: TourAction) => void;
}) {
  const [{ stage, stepIndex }, setState] = useState<Persisted>(loadPersisted);
  const [overview, setOverview] = useState<RunWalnutOverview | null>(null);
  const [showCoverage, setShowCoverage] = useState(false);

  const update = useCallback((next: Partial<Persisted>) => {
    setState((current) => {
      const merged = { ...current, ...next };
      savePersisted(merged);
      return merged;
    });
  }, []);

  const { runId } = context;

  // Poll the selected Run's overview while the guide is on screen. This is the only source the
  // live checks read; if it fails we show nothing rather than guessing.
  useEffect(() => {
    if (stage !== "running" || runId === null) {
      setOverview(null);
      return;
    }
    let alive = true;
    const load = () =>
      api
        .walnutOverview(runId)
        .then((data) => {
          if (alive) setOverview(data);
        })
        .catch(() => {
          if (alive) setOverview(null);
        });
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [stage, runId]);

  const fullContext: TourContext = useMemo(() => ({ ...context, overview }), [context, overview]);

  if (stage === "welcome") {
    return (
      <WelcomeScreen
        onStart={() => update({ stage: "running", stepIndex: 0 })}
        onSkip={() => update({ stage: "closed" })}
      />
    );
  }

  if (stage === "closed") {
    return (
      <button
        type="button"
        className="walnut-tour-launcher"
        onClick={() => update({ stage: "running" })}
        aria-label="Reopen the Walnut tour"
      >
        <WalnutMark size={26} />
        <span>Tour</span>
      </button>
    );
  }

  return (
    <>
      <GuideDock
        step={TOUR_STEPS[stepIndex]}
        stepIndex={stepIndex}
        context={fullContext}
        onAction={onAction}
        onBack={() => update({ stepIndex: Math.max(0, stepIndex - 1) })}
        onNext={() => update({ stepIndex: Math.min(TOUR_STEPS.length - 1, stepIndex + 1) })}
        onRestart={() => update({ stage: "welcome", stepIndex: 0 })}
        onClose={() => update({ stage: "closed" })}
        onShowCoverage={() => setShowCoverage(true)}
      />
      {showCoverage && <CoverageSheet onClose={() => setShowCoverage(false)} />}
    </>
  );
}

// -- welcome ------------------------------------------------------------------------------------

function WelcomeScreen({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <div className="walnut-welcome" role="dialog" aria-modal="true" aria-labelledby="walnut-welcome-title">
      <div className="walnut-welcome-card">
        <div className="walnut-welcome-hero">
          <div className="walnut-welcome-mark">
            <WalnutMark size={92} />
          </div>
          <div>
            <span className="eyebrow">Walnut Rewind · guided tour</span>
            <h1 id="walnut-welcome-title">Hi, I&rsquo;m Walnut. I&rsquo;ll show you around.</h1>
            <p>
              You already have an Agent platform. I&rsquo;m the layer underneath it that decides what
              your agents are <em>allowed</em> to know, keeps proof of why they believed it, and can
              rebuild the work that depended on a belief once that belief turns out to be wrong.
            </p>
          </div>
        </div>

        <div className="walnut-welcome-grid">
          <WelcomeCard
            n="01"
            title="Can I trust it?"
            copy="Claims carry a source pointer, a content hash and a citation checked byte for byte — never fuzzy, never “the model said so”."
          />
          <WelcomeCard
            n="02"
            title="Was it allowed?"
            copy="Authorisation runs before the prompt is assembled. A rule inside the prompt is not a control — the model has already read it."
          />
          <WelcomeCard
            n="03"
            title="What depends on it?"
            copy="Runs, capsules, evidence and artifacts form a graph, so a bad belief has a traceable blast radius instead of a guess."
          />
          <WelcomeCard
            n="04"
            title="Can I recover?"
            copy="Rewind mints a new run and links it to the old one. Nothing is ever overwritten — that is the whole point."
          />
        </div>

        <div className="walnut-welcome-footer">
          <div className="walnut-welcome-meta">
            <strong>{TOUR_STEPS.length} steps</strong>
            <span>
              {TOUR_CHAPTERS.length} chapters · all {FEATURES.length} capabilities mapped, including
              the one that was cut
            </span>
          </div>
          <div className="walnut-welcome-actions">
            <button type="button" className="button button-ghost" onClick={onSkip}>
              I&rsquo;ll explore myself
            </button>
            <button type="button" className="button button-primary" onClick={onStart}>
              Show me around
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WelcomeCard({ n, title, copy }: { n: string; title: string; copy: string }) {
  return (
    <div className="walnut-welcome-item">
      <span>{n}</span>
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
}

// -- the dock -----------------------------------------------------------------------------------

function GuideDock({
  step,
  stepIndex,
  context,
  onAction,
  onBack,
  onNext,
  onRestart,
  onClose,
  onShowCoverage,
}: {
  step: TourStep;
  stepIndex: number;
  context: TourContext;
  onAction: (action: TourAction) => void;
  onBack: () => void;
  onNext: () => void;
  onRestart: () => void;
  onClose: () => void;
  onShowCoverage: () => void;
}) {
  const checked = step.check(context);
  const last = stepIndex === TOUR_STEPS.length - 1;

  // Ring the element this step is talking about. The target often does not exist yet (the drawer
  // may still be closed), so retry once on the next frame and once shortly after.
  useEffect(() => {
    const selector = step.spotlight;
    if (!selector) return;
    let element: Element | null = null;
    const attach = () => {
      if (element) return;
      element = document.querySelector(selector);
      element?.classList.add("walnut-tour-target");
    };
    attach();
    const raf = window.requestAnimationFrame(attach);
    const timer = window.setTimeout(attach, 400);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      element?.classList.remove("walnut-tour-target");
    };
  }, [step, context.drawerOpen, context.runId]);

  return (
    <aside className="walnut-tour-dock" aria-label="Walnut guided tour">
      <header className="walnut-tour-head">
        <WalnutMark size={30} />
        <div className="walnut-tour-head-copy">
          <strong>Walnut</strong>
          <span>
            Chapter {step.chapterIndex} of {TOUR_CHAPTERS.length} · {step.chapter}
          </span>
        </div>
        <button type="button" onClick={onClose} aria-label="Close the tour">
          ×
        </button>
      </header>

      <div className="walnut-tour-progress" aria-hidden="true">
        {TOUR_STEPS.map((item, index) => (
          <i key={item.id} className={index <= stepIndex ? "done" : undefined} />
        ))}
      </div>

      <div className="walnut-tour-body">
        <h3>{step.title}</h3>
        <p className="walnut-tour-say">{step.say}</p>

        {step.todo && (
          <div className="walnut-tour-todo">
            <span>Do this</span>
            <p>{step.todo}</p>
          </div>
        )}

        {step.command && <code className="walnut-tour-command">{step.command}</code>}

        {step.action && (
          <button
            type="button"
            className="button button-primary walnut-tour-action"
            onClick={() => onAction(step.action as TourAction)}
          >
            {step.action.label}
          </button>
        )}

        <div className="walnut-tour-why">
          <span>Why it matters</span>
          <p>{step.why}</p>
        </div>

        {step.seededNote && <p className="walnut-tour-note">{step.seededNote}</p>}

        <div className="walnut-tour-status">
          {checked === null ? (
            <span className="walnut-tour-pill walnut-tour-pill-neutral">
              {step.checkLabel ?? "Walk-through step"}
            </span>
          ) : checked ? (
            <span className="walnut-tour-pill walnut-tour-pill-ok">✓ {step.checkLabel} — read live</span>
          ) : (
            <span className="walnut-tour-pill walnut-tour-pill-wait">Not yet: {step.checkLabel}</span>
          )}
          <div className="walnut-tour-features">
            {step.features.map((id) => (
              <span key={id} title={FEATURES.find((f) => f.id === id)?.name}>
                {id}
              </span>
            ))}
          </div>
        </div>
      </div>

      <footer className="walnut-tour-foot">
        <button type="button" className="walnut-tour-link" onClick={onShowCoverage}>
          All {FEATURES.length} capabilities
        </button>
        <div className="walnut-tour-nav">
          <button
            type="button"
            className="button button-ghost"
            onClick={onBack}
            disabled={stepIndex === 0}
          >
            Back
          </button>
          {last ? (
            <button type="button" className="button button-primary" onClick={onRestart}>
              Start over
            </button>
          ) : (
            <button type="button" className="button button-primary" onClick={onNext}>
              Next
            </button>
          )}
        </div>
      </footer>
    </aside>
  );
}

// -- coverage sheet -----------------------------------------------------------------------------

const SURFACE_COPY: Record<FeatureSurface, string> = {
  live: "You see it in this tour",
  seeded: "Needs the seeded scenario",
  tests: "Proven by the test suite",
  absent: "Cut — absent, not stubbed",
};

function CoverageSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="walnut-coverage-backdrop" onMouseDown={onClose}>
      <section
        className="walnut-coverage-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="walnut-coverage-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className="eyebrow">Coverage</span>
            <h2 id="walnut-coverage-title">All {FEATURES.length} capabilities</h2>
            <p>
              What each one prevents, and how far this tour actually gets you. The honest labels are
              the point: depth and coherence carry this, not feature count.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <ol className="walnut-coverage-list">
          {FEATURES.map((feature) => (
            <li key={feature.id} className={`walnut-coverage-${feature.surface}`}>
              <span className="walnut-coverage-id">{feature.id}</span>
              <div>
                <strong>{feature.name}</strong>
                <p>Prevents {feature.prevents}</p>
              </div>
              <span className="walnut-coverage-surface">{SURFACE_COPY[feature.surface]}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
