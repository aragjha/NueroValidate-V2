# Data Vault Redesign — Sub-project A

**Date:** 2026-04-15
**Status:** Draft for review
**Scope:** The Data Vault surface only. Sub-project A of a 5-part CT flow redesign (A: Vault, B: Criteria↔Atom navigation, C: Runs, D: Review rollups, E: Funnel).

## 1. Problem

The current `DataVaultPage` is a cohort library with an inline patient-×-criterion preview matrix. It does not surface the structured-vs-unstructured distinction that drives reviewer workload, does not support browsing by atom or patient, and has no strong filters. Reviewers cannot answer basic questions like "show me all unstructured Labs atoms in this cohort that still need review" without leaving the vault.

## 2. Goals

1. Preserve today's cohort library as the entry surface.
2. On click, open a dedicated **Cohort Explorer** page with three pivoted views — **Criteria, Atoms, Patients** — over the same underlying data.
3. Make the **structured / unstructured** distinction the dominant visual axis: prominent segmented control defaulting to Unstructured (where work lives), subtle color tags on rows.
4. Provide strong, URL-synced filters (search, category, status, sort) so reviewer state is deep-linkable.
5. Inside a criterion, group atoms into Structured / Unstructured sub-sections for immediate "nothing to do / work needed" clarity.
6. Reuse the same `AtomRow` component in all contexts (Atoms tab, Criteria expansion, Patients drill-down).

## 3. Non-goals

- No change to `CohortImport` data model.
- No change to `CTCriterionDetailPage`, prompt config, runs, review flow, matrix, or funnel — those belong to sub-projects B–E.
- No cross-cohort browsing (Approach A locked in; hybrid cross-cohort view is a future consideration).
- No authoring / editing of criteria or atoms inside the vault.

## 4. Decisions locked with user

| # | Decision | Rationale |
|---|---|---|
| 1 | **Cohort-scoped browser** (not unified cross-cohort catalog) | Matches how reviewers work — one trial at a time. No new data backbone required. |
| 2 | **Three tabs, same data, three pivots** — Criteria / Atoms / Patients | Honors point-3 filter requirement ("view by patient / atom / criterion") directly. Drill-down lives inside the Criteria tab. |
| 3 | **Segmented header with counts**, defaults to Unstructured | 90% of reviewer work is on unstructured atoms; loud counts make the work queue obvious. |
| 4 | **Approach 1 — two-page split**: `DataVaultPage` stays as library; new `CohortExplorerPage` at `/vault/:cohortId` | The explorer is a first-class workspace; deserves its own route, deep-linkable state, and a clean component boundary. |
| 5 | **Density B — two-line row with mini-bar** for collapsed `AtomRow`; expanded state grows to show metadata + structured/unstructured split + evidence link | Mini-bar (yes/no/unknown proportions) is the single most diagnostic signal. Two lines fit enough signal to skip drilling for most rows. |
| 6 | **Inside a criterion: auto-group atoms into Structured (collapsed by default) + Unstructured (expanded by default)** | Explicit visual separation of "done automatically" vs "your job" for the 2–8 atoms typical per criterion. |
| 7 | **Patients-tab segmented control re-purposes** to `All / Eligible / Ineligible / Needs review`; structured/unstructured becomes a secondary chip | Patients aren't inherently structured/unstructured; eligibility state is the more useful slice here. |

## 5. Architecture

### 5.1 Routes

```
/vault                         DataVaultPage        (existing, minor updates)
/vault/:cohortId               CohortExplorerPage   (new)
  ?tab=criteria|atoms|patients                (default: criteria)
  &view=all|structured|unstructured|mixed     (default: unstructured; "mixed" only valid on Criteria tab)
  &cat=<csv>                                  (multi-select)
  &status=<csv>                               (multi-select)
  &q=<search>
  &sort=default|name|pending|yes              (default: default)
  &expanded=<rowId>                           (persists last-expanded row)
```

All filter state is URL-synced via `useSearchParams()`. No local state duplicates URL values. Back button restores prior filter state. Deep links work.

### 5.2 New files

```
src/pages/
  CohortExplorerPage.tsx                page shell; reads URL params; picks active tab component
src/components/vault/
  ExplorerHeader.tsx                    breadcrumb, title, stats strip, "Create CT Project" CTA
  ExplorerFilterBar.tsx                 segmented structured/unstructured control + search + category/status/sort dropdowns; emits URL updates
  CriteriaTab.tsx                       criterion list; row expands inline into grouped Structured/Unstructured atom sections
  AtomsTab.tsx                          flat atom list across all criteria
  PatientsTab.tsx                       flat patient list with per-atom pass/fail drill-down
  AtomRow.tsx                           reusable two-line row; collapsed/expanded states
  shared.ts                             types, color map, pure helpers (computeAtomRowData, applyFilters, atomStatus)
```

### 5.3 Modifications to existing files

- `src/App.tsx` — add route `/vault/:cohortId` → `CohortExplorerPage`.
- `src/pages/DataVaultPage.tsx` — replace the inline expanded matrix preview with an "Open Explorer →" button per cohort row. Keep the Create CT Project shortcut.

### 5.4 Data model

Unchanged. `CohortImport` already carries:
- `criteria[]` with display-layer atoms & `dataSource`.
- `criteriaResults[]` (when available) with `atoms[]` carrying `patient_list_yes/no/unknown`, `patient_list_no_structured/unstructured`, `patient_list_no_unstructured_gcp_path`, and `metadata` (`concept_label`, `operator`, `polarity`, `primary_category`).
- `patients[]` with `flags[]`.

The redesign is a pure view-layer re-pivot over existing data.

## 6. Component specifications

### 6.1 `CohortExplorerPage`

- Reads `:cohortId` from route params, all filter state from URL search params.
- Redirects to `/vault` with a toast if cohort not found.
- Renders `ExplorerHeader`, `ExplorerFilterBar`, then the active tab component based on `tab` param.
- Falls back to display-layer data (today's `criteria` + `patients.flags`) if `criteriaResults` is absent; shows a small banner: *"Showing display-layer data. Re-import from NeuroTerminal for atom-level results."*
- Owns no mutable local state — all state is URL-driven. Only transient UI state (e.g., which cohort-level section is expanded) uses local state.

### 6.2 `ExplorerHeader`

Three horizontal zones:
- **Left:** breadcrumb `Vault / <cohort name>` with back arrow; status badge (Active / Linked / Pending); source badge.
- **Center:** stats strip — `Patients N · Criteria N (s str / u unstr) · Atoms N · Validated / In progress / Pending`.
- **Right:** `Create CT Project` button (if unlinked) or `Open Project →` (if linked).

### 6.3 `ExplorerFilterBar`

Two rows:
- **Row 1 — tabs + segmented control:** `Criteria · N | Atoms · N | Patients · N` tab switcher on the left; segmented pill group on the right. Segment labels and scope depend on active tab:
  - Criteria tab: `All · Structured · Unstructured · Mixed`.
  - Atoms tab: `All · Structured · Unstructured` (Mixed hidden — atoms are individually one or the other).
  - Patients tab: `All · Eligible · Ineligible · Needs review`. Structured/unstructured demoted to a chip in Row 2.
- **Row 2 — filter row:** search input (fuzzy; matches atom label, criterion name, criterion id, concept_label, category) · Category multi-select dropdown · Status multi-select dropdown · Sort dropdown · Clear-filters chip (visible only when any filter is active).

Every change emits a URL update; the page re-renders from the new URL.

### 6.4 `CriteriaTab`

- List of criterion rows. Row layout: `[color-dot s/u/mixed] [INC/EXC pill] [C# label] [name, bold] [category pill] [atom count · "k atoms"] [mini progress bar] [status badge] [chevron]`.
- Color-dot: blue=all-structured, amber=all-unstructured, striped=mixed.
- Clicking the row expands it inline (not a navigation). Expanded state:
  - **Structured (n) — auto-validated** section, collapsed by default, green-tinted border. Contains `AtomRow` instances.
  - **Unstructured (n) — needs review** section, expanded by default, amber-tinted border. Contains `AtomRow` instances.
  - If a section has zero atoms, it's hidden entirely (not shown as "0 atoms").
- Secondary CTA on the criterion header (not on the row): `Go to criterion workspace →` — links to existing `CTCriterionDetailPage` (wiring only; no change to that page).
- Expansion state persists via the `expanded` URL param (only one criterion expanded at a time).

### 6.5 `AtomsTab`

- Flat list of every atom in the cohort (from `criteriaResults[].atoms[]`, or display-layer `criteria[].atoms[]` fallback).
- Each row is `AtomRow`. Parent criterion appears as a small muted label inside the row (`· C4 · Medications`) — no grouping.
- Default sort mirrors criterion order, then atom order within criterion.
- Additional sort options: name, pending-review-count desc, yes-count desc.

### 6.6 `PatientsTab`

- Flat list of patients. Each row: `[patient id, monospace] [eligible/ineligible status pill] [mini bar showing pass/fail across enabled criteria] [chevron]`.
- Expanded row: per-criterion pass/fail chips; for any failing criterion, a nested mini-list of the atoms that contributed to the failure (reuses `AtomRow` in a compact variant).
- Virtualization: if patient count exceeds 200, render with `react-window` (add dependency) or a manual paged list (50 per page with jump-to-page). Decision punted to implementation-plan phase based on dependency constraints.

### 6.7 `AtomRow`

**Collapsed (height ~56px, two lines):**
- Line 1: `[color-dot s/u] [INC/EXC pill] [atom label, bold] [category pill] [parent breadcrumb: C# · atom k/n, muted, right-aligned]`.
- Line 2: `Yes N · No N · Unknown N` stats · horizontal mini-bar (green=yes / gray=no / amber=unknown, proportional to counts) · right-aligned `[status dot] [status text]`.

**Expanded (click-to-expand; ~180px):**
- Retains the collapsed header.
- **Metadata strip** (monospace, muted): `concept_label · operator · polarity` from atom metadata.
- **Patient split detail** (unstructured atoms only):
  - `No — Structured N` (muted, no action)
  - `No — Unstructured N` (chip: "needs LLM extraction + review")
  - `Unknown N` (chip: "always needs review")
  - Sum line: `N patients require reviewer attention`.
- **Evidence source:** if `patient_list_no_unstructured_gcp_path` exists, render `📄 View evidence files` link (renders link only; opening GCP path is out of scope for this sub-project).
- **Primary CTA:**
  - Unstructured atom: `Configure prompt →` linking to existing prompt-config flow (wiring only).
  - Structured atom: inert note `Auto-validated · no config needed`.

**Interaction & accessibility:**
- Row is a `button` with `aria-expanded` reflecting state; keyboard Enter/Space toggles.
- Color dots and status dots are always paired with text labels — color is never the only signal.
- Mini-bar has a `title` attribute for precise counts on hover and screen readers.
- Focus ring visible (WCAG AA).

### 6.8 `shared.ts`

Types:
- `TabKey = 'criteria' | 'atoms' | 'patients'`
- `ViewMode = 'all' | 'structured' | 'unstructured' | 'mixed' | 'eligible' | 'ineligible' | 'needs-review'` (superset across tabs; each tab accepts a subset)
- `AtomStatus = 'auto-validated' | 'needs-config' | 'in-progress' | 'validated'`
- `AtomRowData` — normalized shape consumed by `AtomRow`, built from either `criteriaResults.atoms` or display-layer atoms.
- `FilterState` — derived from URL params.

Pure functions:
- `applyFilters(items, filterState)` — filters Criteria / Atoms / Patients lists.
- `computeAtomRowData(atom, context)` — builds an `AtomRowData` from either real or display-layer input.
- `atomStatus(atom)` — returns `AtomStatus` for the row.
- `criterionStatus(criterion)` — aggregates from its atoms.

## 7. Filter semantics

- `view=unstructured` on Criteria tab → keeps criteria with ≥1 unstructured atom.
- `view=structured` on Criteria tab → keeps criteria where all atoms are structured.
- `view=mixed` on Criteria tab → criteria with both types present.
- `view` on Atoms tab → filters atoms by their own `dataSource`.
- `view` on Patients tab → filters by eligibility state; `All / Eligible / Ineligible / Needs review`.
- `cat` (multi) → filters by `primary_category` (atoms) or aggregated category (criteria).
- `status` (multi) → filters by `AtomStatus` (atoms/criteria); Patients tab exposes its own status set (pending-review, reviewed, overridden).
- `q` → fuzzy, case-insensitive substring match on atom label, criterion name, criterion id, concept_label, category.
- `sort` options vary per tab; default respects source order.

Filter + sort memoized with `useMemo` keyed on the URL params string.

## 8. Edge cases

| Case | Behavior |
|---|---|
| Cohort has no `criteriaResults` (legacy import) | Fall back to display-layer data; show banner. All tabs still render. |
| Cohort not found by id | Redirect to `/vault` with a toast. |
| Filter yields zero rows | Show empty state: "No items match. [Clear filters]". |
| Atom has zero patients in all buckets | Render with dashed mini-bar and "no data" status. Still clickable. |
| Patients tab with >200 patients | Virtualized or paged list. |
| URL has invalid `tab` / `view` param | Fall back to defaults (criteria / unstructured); preserve other params. |
| `expanded` param points at a row that no longer matches the filter | Silently clear `expanded`. |

## 9. Testing

- **Unit — `applyFilters`:** cover each `view` mode on each tab, category/status multi-select combinations, search term matching.
- **Unit — `computeAtomRowData`:** real-data path and display-layer fallback produce equivalent row shape.
- **Unit — `atomStatus` / `criterionStatus`:** each status transition.
- **Component — `AtomRow`:** renders correctly for structured vs unstructured, each status, collapsed vs expanded. Keyboard interaction toggles. Accessibility attrs present.
- **Integration — `CohortExplorerPage`:** URL params drive display; changing any filter updates the URL; deep-linked URL renders correct state; unknown cohortId redirects; back button restores prior state.

## 10. Out of scope

Listed here so future sub-projects inherit a clean handoff:
- **Sub-project B** (Criteria↔Atom navigation spine) — the atom detail page, prompt config, review workflow. This sub-project only *links* to the existing CT criterion page; it does not modify it.
- **Sub-project C** (Runs) — encounter/patient-id run configuration, run history. Not present in the Vault surface.
- **Sub-project D** (Review rollups) — atom-level → criterion-level → trial-level review dashboards.
- **Sub-project E** (Interactive funnel + chatbot + export) — the funnel play-page and cohort chatbot.
- **Cross-cohort browsing** — hybrid mode (c) from the scope question; future consideration.
- **Editing** atoms/criteria/patients inside the Vault — Vault is read-only throughout.

## 11. Design system alignment

- Uses existing shadcn-based primitives (`Badge`, `Input`, `ScrollArea`, `Dialog`).
- Color palette: blue for structured (calm, automated), amber for unstructured (attention), green for validated/eligible, red for ineligible/failed. Matches existing `CTOverviewPage` semantic color use.
- Typography: tabular numerals for all count displays. Monospace for patient IDs and atom metadata strips.
- Accessibility: WCAG AA contrast; color never the sole signal; `aria-expanded` on all collapsibles; visible focus ring.
- Motion: 150–200ms transitions on expansion and filter state changes; respects `prefers-reduced-motion`.

## 12. Open questions for the implementation plan

These are decisions best made during `writing-plans` with current-codebase context rather than now:
- Virtualization library choice (`react-window` vs manual paging vs TanStack Virtual) — depends on existing deps.
- Whether `ExplorerFilterBar` should own a small internal debounce for the search input, or if immediate URL updates are fine (likely fine given local state).
- Whether to break `AtomRow`'s expanded-state content into a sub-component (`AtomRowDetail`) to keep the row file small.
