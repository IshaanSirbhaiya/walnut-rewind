# Submission pack — AI Builders Challenge with IBM Bob (August 2026)

Everything needed to publish the challenge submission page, ready to copy-paste.
Deadline: **Mon 31 Aug 2026, 11:59 PM ET**.

---

## Platform form fields

**Project name:** Walnut Rewind

**One-line tagline:**
Proof-carrying, authorization-aware, reversible context middleware for AI agents — your AI
co-workers only see what their role permits, and when a fact changes, only the affected work is
redone.

**Challenge theme:** Wild Card Challenge — Intelligent Systems for the Future of Work

**Team members:** Ishaan Sirbhaiya · Mehul Modi

**GitHub repository (public):** https://github.com/IshaanSirbhaiya/walnut-rewind

**Demo video (max 3 minutes, publicly accessible):**
https://github.com/IshaanSirbhaiya/walnut-rewind/raw/main/demo/walnut-rewind-demo.mp4
*(also playable from the repository page: `demo/walnut-rewind-demo.mp4` — optionally mirror to
YouTube as unlisted and use that link instead; verify either link in a logged-out window.)*

**Project description (paste):**

> Agent platforms tell you what an AI did — never what it was *allowed to know*, why it believed
> it, who inherited that belief, or what must be rebuilt when that belief turns out to be wrong.
> Walnut Rewind is middleware that governs AI co-workers the way a lockfile governs dependencies:
> before every run it seals an immutable, hashed **Context Capsule** of exactly the evidence that
> run may consume. Authorization runs *before* prompt construction (a rule inside a prompt is not
> a control — the model has already read it), every claim carries a byte-verified citation to its
> source, every runtime event lands in an append-only hash-chained ledger, and when a source is
> compromised, blast-radius analysis taints exactly the downstream work and **Rewind** mints a
> new run linked to the old one — history is never rewritten. Built with IBM Bob as our
> AI engineering partner across problem framing, architecture, implementation, testing, and demo
> design (full account in the README), on top of the MIT-licensed Volc Agent Launchpad starter
> kit. 233 automated tests built around 22 documented invariants; a judge can stage and explore the full
> demo scenario locally with no API key.

---

## Submitter checklist (after landing)

1. **IBM SkillsBuild learning activity** (required, per submitting person):
   http://ibm.biz/IBMSkillsBuild-learn-bob — complete and screenshot the completion page.
2. **Publish the submission page** on the challenge platform with the fields above.
3. Verify in a **logged-out/incognito window**: the repo opens, the video plays, the README
   renders with all five required sections (problem statement · solution description · AI
   approach and architecture · selected challenge theme · how IBM Bob was used).
4. Optional: upload `demo/walnut-rewind-demo.mp4` to YouTube (unlisted or public — never
   private) and swap the video link on the submission page.
5. Only one project per team may be submitted for August (Wild Card **or** Space Exploration) —
   this submission uses the Wild Card slot.
