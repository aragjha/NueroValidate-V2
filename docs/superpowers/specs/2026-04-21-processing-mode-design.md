# Processing Mode — Batch vs Fast (RWE Flow)

**Date:** 2026-04-21
**Scope:** `src/pages/CriteriaPage.tsx` (RWE run-configuration + processing stages)

## Problem

Today the RWE flow runs everything through a single live path — users see a progress bar on Stage 4 and costs are a single number. We need to let users trade off **cost vs. latency** at the point of kicking off a run:

- **Fast Processing** — live progress, full price. Good for small runs / quick iteration.
- **Batch Processing** — no live progress, email when ready, **50% cheaper**. Good for full runs.

## UI Changes

### Stage 3 — Run Configuration

Add a **Processing Mode** section immediately above the existing Cost Estimate card. Two-card radio, visually consistent with the existing Run Scope cards:

| Card | Icon | Headline | Sub-copy | Extra |
|------|------|----------|----------|-------|
| Fast Processing | `Zap` | Fast Processing | "Great for small runs and quick turnaround. See live progress as it runs." | — |
| Batch Processing | `Package` | Batch Processing | "Optimised for cost. Best for full runs. We'll email you when it's ready." | Green "50% off" badge |

Default: `fast`.

### Cost Estimate (reacts to mode)

When `processingMode === 'batch'`:
- Multiply total estimate by `0.5`.
- Show the original price with strikethrough next to the discounted headline.
- Add a "Batch discount · 50% off" line in emerald.
- Extraction/Reasoning breakdown halved too.

When `processingMode === 'fast'`: unchanged.

### Stage 4 — Processing

Branch on mode:

- **Fast (unchanged):** badges + `Progress` bar + Stop/Resume + "Start Reviewing" CTA once count > 0.
- **Batch (new):** centered card — `Mail` icon, heading "Batch run queued", body "We'll email you at **{userEmail}** when the run is ready for review." Shows the Run ID and a single "Back to Projects" button. **No progress bar. No Stop button. No Start Reviewing CTA.**

### Run list / badge

When a run was submitted in batch mode, show a small "Batch" badge next to the run ID in the existing per-criterion run list (Stage 3 sidebar + inspector sheet). This makes it obvious later which runs took the batch path.

## State

Local state in `CriteriaPage`:
```ts
const [processingMode, setProcessingMode] = useState<'fast' | 'batch'>('fast');
```

Pass `processingMode` into the Run record created when the user clicks "Run now" so the bad­ge can render later. (Mock only — no backend changes.)

## Out of scope

- Real email delivery (this is a mock).
- Persisting mode across reloads.
- Admin-side batch-queue dashboard.
- Per-criterion mode override (whole run picks one mode).

## Files touched

- `src/pages/CriteriaPage.tsx` — add state, selector UI, discount logic, Stage 4 branch, badge.
- `src/types.ts` — add `processingMode?: 'fast' | 'batch'` to the `Run` type.
