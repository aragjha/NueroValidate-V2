# Review Rollups — Sub-project D

**Date:** 2026-04-16
**Status:** Approved
**Scope:** View-only review summaries on CTCriterionDetailPage and CTOverviewPage. Sub-project D of 5 (A ✅, B ✅, C ✅, D: this, E: Funnel).

## Goals

1. Add a review summary section to CTCriterionDetailPage showing per-atom decision breakdown.
2. Add a review dashboard section to CTOverviewPage showing per-criterion decision breakdown.
3. Shared `ReviewSummary` component used on both pages.
4. View-only — no approval buttons, no new state, no data model changes.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Enrich existing pages | Zero extra navigation; reviewer is already there. |
| 2 | View-only rollup | StatusRollup handles status propagation. Value is seeing the rollup, not acting on it. |

## Architecture

**Create:** `src/components/ct/ReviewSummary.tsx`
**Modify:** `src/pages/CTOverviewPage.tsx`, `src/pages/CTCriterionDetailPage.tsx`

### ReviewSummary component

Props:
```ts
type ReviewRow = { label: string; reviewed: number; total: number; true_: number; false_: number; unclear: number };
type Props = { title: string; rows: ReviewRow[] };
```

Renders: stacked bar (True green / False red / Unclear amber / Pending gray) + stats line + mini-table of rows. Hidden if rows is empty.

### CTCriterionDetailPage addition

Between criterion header and atom list, add ReviewSummary with one row per unstructured atom. Data derived from `reviewItems` filtered to this project's unstructured atom patient IDs. Hidden for all-structured criteria.

### CTOverviewPage addition

Between stats row and filter bar, add ReviewSummary with one row per criterion that has unstructured atoms. Data derived from `reviewItems` across all criteria.
