# Interactive Funnel + Chatbot + Export — Sub-project E

**Date:** 2026-04-16
**Status:** Approved
**Scope:** Rewrite CTFunnelPage with expandable funnel steps, enhanced chatbot, CSV export. Final sub-project (A ✅, B ✅, C ✅, D ✅, E: this).

## Goals

1. Expandable funnel steps — click a criterion waterfall step to see atom-level drop contributions.
2. Enhanced mock chatbot — reads real funnel state, responds to ~10 question patterns.
3. Full patient × criterion matrix CSV export respecting current toggle state.
4. Use shared.ts data model for all cohort data.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Expandable funnel steps | Keeps waterfall scannable; atom detail on demand. |
| 2 | Enhanced mock chatbot (no LLM) | Prototype — smart canned responses with real funnel numbers. |
| 3 | Patient × criterion matrix CSV | Single file with enough data to reconstruct the analysis. |

## Architecture

**Rewrite:** `src/pages/CTFunnelPage.tsx` (393 → ~550 lines, single file)

No new files. Funnel computation, chatbot, and export are tightly coupled to the enabled-criteria state. Keeping them in one file avoids prop-threading overhead.

**Reused from prior sub-projects:**
- `shared.ts` — `buildCriterionRows`, `buildAtomRows`, `CriterionRowData`, `AtomRowData`
- `StatusRollup` — for criteria toggle panel
- Existing `computeRealFunnel` / `computeFlagFunnel` logic — carried forward and enhanced

## Component specification

### Left panel — criteria toggles

- Built from `CriterionRowData[]` via `buildCriterionRows(cohort)`
- Each row: toggle icon (ToggleRight/ToggleLeft), INC/EXC badge, name, category chip, atom count badge
- "Reset All" button at top
- Footer: `StatusRollup` showing `N/M criteria enabled`

### Right panel — waterfall

- Starting population bar (full width, labeled)
- Per enabled criterion: horizontal bar proportional to remaining/starting ratio
  - Label, remaining count (bold), drop count in red + drop %
  - **Click to expand:** shows atom-level breakdown inline
    - Per atom: label, structured/unstructured dot, yes/no/unknown counts, contribution to the drop
    - Simplified mini-rows (not full AtomRow — no expand, no CTA)
  - Click again to collapse
- Estimated Cohort Size box at bottom: count, % of starting, green/amber coloring
- Bar width transitions: 500ms ease on toggle

### Funnel computation

Carries forward the existing `computeRealFunnel` / `computeFlagFunnel` logic with one addition: each step now includes atom-level detail.

```ts
type FunnelStep = {
  label: string;
  criterionId: string;
  remaining: number;
  dropped: number;
  dropPct: number;
  isExclusion: boolean;
  atoms: {
    atomId: string;
    label: string;
    dataSource: 'structured' | 'unstructured';
    yesCount: number;
    noCount: number;
    unknownCount: number;
    droppedByThisAtom: number;
  }[];
};
```

The `droppedByThisAtom` field is computed by checking how many patients in the remaining set were failed specifically by this atom (for AND logic: each atom independently can fail a patient; for OR logic: a patient fails only if ALL atoms fail).

### Enhanced chatbot

Replaces `chatRespond` with a function that receives full funnel state:

```ts
function chatRespond(msg: string, context: {
  finalCount: number;
  startingPop: number;
  steps: FunnelStep[];
  enabledCount: number;
  totalCriteria: number;
}): string
```

Handles these patterns:
1. "how many" / "count" / "total" → final eligible count + % of starting
2. "which criterion drops" / "most impact" / "biggest drop" → identifies largest drop step
3. "smallest drop" / "least impact" → identifies smallest drop step
4. "what if I remove" / "without <name>" → describes impact of disabling a specific criterion
5. "retention" / "conversion" / "rate" → overall retention rate across the funnel
6. "summary" / "overview" → full funnel summary in 2-3 sentences
7. "demographics" / "gender" / "age" → mock demographic breakdown
8. "criteria" / "enabled" / "active" → lists which criteria are on/off
9. "atoms" / "atom" → describes atom count and structured/unstructured split
10. Fallback → help message listing available question types

### CSV export

- "Export Cohort" button in header, right-aligned
- Builds CSV string:
  - Header row: `Patient ID, <Criterion1 Name>, <Criterion2 Name>, ..., Eligible`
  - Only currently-enabled criteria appear as columns
  - Each patient row: ID, then pass/fail per criterion (TRUE/FALSE), then overall eligible (TRUE/FALSE)
  - Pass/fail logic: inclusion criteria → patient_list_yes = TRUE; exclusion criteria → patient_list_no/unknown = TRUE (they pass because they're not excluded)
- Download via `Blob` + `URL.createObjectURL` + programmatic `<a>` click
- Filename: `{projectName}_cohort_{YYYY-MM-DD}.csv`

## Edge cases

| Case | Behavior |
|---|---|
| All criteria toggled off | Waterfall shows only "Starting Population" bar. Cohort size = starting pop. Export includes all patients as eligible. |
| Criterion with zero drop | Still shows in waterfall with "0 dropped (0%)" — not hidden. |
| Expand a criterion with 1 atom | Shows single atom row. |
| Chatbot question about disabled criterion | Responds with "That criterion is currently disabled. Enable it to see its impact." |
| Export with no real data (legacy cohort) | Falls back to flag-based pass/fail from display-layer data. |
| Empty chat input | Ignored (no message sent). |

## Out of scope

- LLM-powered chatbot — future production concern.
- Multi-format export (Excel, PDF) — CSV is sufficient for prototype.
- Saved funnel configurations — toggle state is session-only.
