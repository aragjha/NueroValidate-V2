# CT Criteria → Atom Navigation + Status Propagation — Sub-project B

**Date:** 2026-04-16
**Status:** Draft for review
**Scope:** CT project drill-down pages only. Sub-project B of a 5-part CT flow redesign (A: Vault ✅, B: Navigation, C: Runs, D: Review rollups, E: Funnel).

## 1. Problem

The current CT flow has a flat criteria overview (`CTOverviewPage`) and a basic criterion detail page (`CTCriterionDetailPage`), but no dedicated atom-level workspace. Prompt configuration, run management, and patient review have no clear home in the CT flow. Status is visible only at the criteria level — reviewers can't see progress at the atom or project level without manually counting.

## 2. Goals

1. Three-level drill-down: criteria list → criterion detail (atom list) → atom detail (prompt config + run + review).
2. Status transparent at every level via worst-status badge + progress fraction rollup.
3. Reuse component library from Sub-project A (`AtomRow`, `shared.ts`, filter patterns, color system).
4. Each page has a clear single responsibility with focused UI.
5. Clean URL structure enabling deep-links and browser back-button navigation.

## 3. Non-goals

- No new run types or run configuration UX (encounter/patient ID targeting) — Sub-project C.
- No criterion-level or trial-level review dashboards — Sub-project D.
- No funnel, chatbot, or export — Sub-project E.
- No Data Vault changes — Sub-project A is complete.
- No data model changes — existing types are sufficient.

## 4. Decisions locked with user

| # | Decision | Rationale |
|---|---|---|
| 1 | Vault browse + CT project workspace, sharing components | Vault is the data catalog; CT project is the operational workspace. Component library shared for seamless experience. |
| 2 | Three levels: criteria list → criterion detail → atom detail page | Matches the stated flow. Each level has breathing room. Clean URL per level. |
| 3 | Hybrid status: worst-status badge + progress fraction | Badge is scannable (filter/sort by it); fraction prevents "one bad apple makes everything red." |
| 4 | Atom detail uses tabbed sections (Prompt Config / Run History / Patient Review) | Prompt config and review are distinct mental modes. Tabs keep each focused. Metadata header stays pinned. |

## 5. Architecture

### 5.1 Routes

```
/projects/:projectId/ct-overview                         CTOverviewPage (rewrite)
/projects/:projectId/ct-criteria/:criterionId             CTCriterionDetailPage (rewrite)
/projects/:projectId/ct-atom/:atomId                      CTAtomDetailPage (new)
```

All routes already within the `<AppLayout>` wrapper. The first two routes exist; the third is new.

### 5.2 Files

**New files:**
- `src/pages/CTAtomDetailPage.tsx` — atom workspace with pinned header + three tabs
- `src/components/ct/StatusRollup.tsx` — renders `<Badge> · N/M label complete` pattern
- `src/components/ct/AtomMetadataHeader.tsx` — pinned atom header (identity, status, counts, mini-bar)
- `src/components/ct/PromptConfigTab.tsx` — keyword editor, prompt textareas, model selector, run button
- `src/components/ct/RunHistoryTab.tsx` — table of past runs with expandable detail
- `src/components/ct/PatientReviewTab.tsx` — interactive patient review table with inline decisions

**Rewritten files:**
- `src/pages/CTOverviewPage.tsx` — full rewrite using `shared.ts` data model
- `src/pages/CTCriterionDetailPage.tsx` — full rewrite using `AtomRow` + grouped sections

**Modified files:**
- `src/App.tsx` — add route for `/projects/:projectId/ct-atom/:atomId`

**Reused from Sub-project A (not modified):**
- `src/components/vault/AtomRow.tsx`
- `src/components/vault/shared.ts` (types, builders, filters, color maps)

### 5.3 Data flow

All three pages read from `AppContext`: `projects`, `cohortImports`, `reviewItems`, `runs`, `criteria`.

- `CTOverviewPage` finds the project → finds its linked cohort → calls `buildCriterionRows(cohort)` → renders criteria with `StatusRollup`.
- `CTCriterionDetailPage` finds the specific criterion from the cohort → calls `buildAtomRows(cohort)` filtered to that criterion → renders grouped atom sections.
- `CTAtomDetailPage` finds the specific atom from `criteriaResults` → renders metadata header + three tabs. Prompt changes write via existing `AppContext` mutators. Review decisions write via `updateDecision()`.

No new context state or mutators needed beyond what exists.

## 6. Component specifications

### 6.1 `StatusRollup`

A small inline component used at every level.

Props: `{ status: AtomStatus; completed: number; total: number; label: string }`

Renders: `<Badge variant={statusVariant}>{statusLabel}</Badge> · <span>{completed}/{total} {label} complete</span>`

Badge variant mapping:
- `auto-validated` → `processing` (blue)
- `needs-config` → `secondary` (gray)
- `in-progress` → `warning` (amber)
- `validated` → `success` (green)

### 6.2 `CTOverviewPage` (rewrite)

**Header:**
- Back arrow to `/projects`
- Project name + CT badge
- Trial metadata (name, phase, indication)
- Project-level `StatusRollup`: `{ status: worstCriterionStatus, completed: completeCriteria, total: totalCriteria, label: 'criteria' }`
- Right actions: `View Funnel` + `View Matrix` buttons (existing, kept)

**Stats row:** 4 cards — Patients, Criteria (str/unstr breakdown), Atoms, Status breakdown (validated/in-progress/pending counts)

**Filter bar:** Segmented control `All / Structured / Unstructured` (default: Unstructured) + search + category chips + status chips + sort. Same pattern as Vault explorer but scoped to this project. Not URL-synced (local state is fine here — this is a workspace, not a bookmarkable browse surface).

**Criteria list:** Each criterion rendered as a card (same visual as Vault CriteriaTab rows):
- `[mixedness dot] [C# label] [INC/EXC badge] [name] [category badge]`
- `[atom count: N atoms · s str / u unstr] [progress bar] [% complete]`
- `[StatusRollup] [ChevronRight]`
- Click → navigates to `/projects/:projectId/ct-criteria/:criterionId`

### 6.3 `CTCriterionDetailPage` (rewrite)

**Breadcrumb:** `Project Name (StatusRollup) > C3 · Amyloid PET Positive (StatusRollup)`

Each breadcrumb segment clickable. Each shows its own status.

**Criterion header:**
- Name, type badge (INC/EXC), category badge, description text
- Atom logic indicator: "Atoms combined with AND" or "OR"
- StatusRollup: `{ status: worstAtomStatus, completed: completeAtoms, total: totalAtoms, label: 'atoms' }`

**Atom list:** Grouped into two collapsible sections (reuses CriteriaTab pattern):
- **Unstructured (n) — needs review** (expanded by default, amber header)
- **Structured (n) — auto-validated** (collapsed by default, blue header)
- Sections hidden if count is zero.
- Each atom rendered as `AtomRow` from Sub-project A.
- Clicking an `AtomRow` navigates to `/projects/:projectId/ct-atom/:atomId` instead of expanding inline. The row's chevron indicates "navigate" not "expand."

**Back button** → CT Overview

### 6.4 `CTAtomDetailPage` (new)

#### 6.4.1 `AtomMetadataHeader` (pinned, always visible)

**Breadcrumb with status at every level:**
```
Project Name (In progress · 8/12) > C3 · Amyloid PET (Needs config · 1/2) > A3 · PET visual read (Needs config)
```

**Atom identity block:**
- Atom label (large, bold), concept_label · operator · polarity (mono, muted)
- Category badge, INC/EXC badge, structured/unstructured color dot with label
- StatusRollup: `{ status, completed: reviewedPatients, total: totalPatientsNeedingReview, label: 'patients reviewed' }`
- Mini-bar (yes/no/unknown)
- Patient split summary: `Yes 512 · No 347 (str 189, unstr 158) · Unknown 284`

**For structured atoms:** Instead of tabs, show a full-width banner: "This atom is auto-validated from structured data. No configuration or review needed." Back button prominent. No tabs rendered.

#### 6.4.2 `PromptConfigTab`

Only shown for unstructured atoms.

**Keywords section:**
- Tag-style input: type a keyword, press Enter to add as a chip. Click × to remove.
- Current keywords shown as removable `Badge` chips.
- Connects to atom's `keywords` array in context.

**Extraction prompt:**
- `<textarea>` with label "Extraction Prompt"
- Pre-filled from `Criterion.extractionPrompt` if available, otherwise empty with placeholder guidance
- Saves on blur to context

**Reasoning prompt:**
- `<textarea>` with label "Reasoning Prompt"
- Pre-filled from `Criterion.reasoningPrompt`
- Saves on blur

**Model selector:**
- Dropdown with model options (from existing `Criterion.model` values in the codebase)
- Default: the criterion's current model setting

**Run button:**
- `Run Extraction` — primary button
- Disabled state + tooltip when no keywords configured: "Add keywords before running"
- On click: creates a new `RunConfig` via existing `AppContext` pattern
- Shows brief "Run started" confirmation

#### 6.4.3 `RunHistoryTab`

- Table of `RunConfig[]` entries filtered to this atom's parent criterion
- Columns: Run ID (mono), Status badge (Queued/Processing/Done/Failed), Patients processed / Total, Sample size, Cost ($), Timestamp
- Click row → expands inline showing: cost breakdown (extraction vs reasoning), config details (overrides), file name
- Empty state: "No runs yet. Configure prompts and run extraction."

#### 6.4.4 `PatientReviewTab`

- Table of patients needing review: `patient_list_no_unstructured` + `patient_list_unknown` from the atom
- Columns: Patient ID (mono), Encounter ID, LLM Eligibility (Eligible/Ineligible badge), LLM Reason (truncated, expand on click), Evidence snippets (with support/contradict/neutral coloring), Reviewer Decision (dropdown: True/False/Unclear), Notes (inline edit)
- Each row is interactive — reviewer sets decision via dropdown, which calls `updateDecision()` from AppContext
- Decision changes immediately reflect in the atom's StatusRollup (reviewed count increases)
- Pagination: 25 per page with page info
- Filter bar: search by patient ID + filter by LLM result (All/Eligible/Ineligible) + filter by decision status (All/Pending/Decided)
- Connects to existing `ReviewItem[]` from AppContext
- Empty state: "No patients need review for this atom." (for structured atoms this tab is hidden entirely)

## 7. Status propagation

### 7.1 Status state machine (atom level)

```
auto-validated ← structured atom with no unstructured patients and no unknowns
needs-config   ← unstructured atom with no keywords configured
in-progress    ← keywords configured, some patients reviewed
validated      ← all patients requiring review have decisions
```

### 7.2 Rollup rules

**Criterion level:**
- Badge: worst status among its atoms. Priority: `needs-config` > `in-progress` > `validated` > `auto-validated`
- Fraction: `{count of auto-validated + validated atoms} / {total atoms} atoms complete`

**Project level:**
- Badge: worst status among its criteria
- Fraction: `{count of fully-complete criteria} / {total criteria} criteria complete`
- Additional stat: `{eligible patient count} eligible patients`

### 7.3 Real-time propagation

When a reviewer makes a decision in PatientReviewTab:
1. `updateDecision()` writes to AppContext
2. `reviewItems` state changes → `useMemo` hooks recompute
3. Atom status may change (`in-progress` → `validated` if all patients decided)
4. Criterion status may change (if atom was the last incomplete one)
5. Breadcrumb StatusRollup at every level updates immediately (all derived from the same reactive state)

No manual refresh needed — React's reactivity handles propagation through the memo chain.

## 8. Edge cases

| Case | Behavior |
|---|---|
| Structured atom clicked | Opens atom detail but shows "Auto-validated" banner. No tabs. |
| Atom with zero patients in all buckets | Tabs render with empty states per tab. |
| Criterion with all structured atoms | Badge shows `auto-validated`. Detail page shows only Structured section. |
| Legacy cohort (no `criteriaResults`) | Falls back to display-layer data. Status = `needs-config` for unstructured. Patient tables empty with guidance banner. |
| Run in progress | Run History shows spinner. Patient Review shows "Run in progress" message. |
| Invalid atomId/criterionId in URL | Redirect to parent level with replace navigation. |
| AtomRow click behavior difference | In Vault explorer: click expands inline. In CT project pages: click navigates to detail page. `AtomRow` gets an optional `onClick` prop override; CT pages pass a navigation handler. |

## 9. Testing

- **Unit — `StatusRollup` logic:** worst-status rollup at criterion and project levels for each status combination.
- **Unit — `AtomRow` onClick override:** verify custom click handler fires instead of default expand.
- **Integration — drill-down navigation:** CTOverview → click criterion → CTCriterionDetail → click atom → CTAtomDetail. URL correct at each step. Back button returns.
- **Integration — status propagation:** make a review decision → atom status updates → criterion StatusRollup updates → breadcrumb updates.
- **Visual — structured atom:** open a structured atom → banner shown, no tabs.
- **Visual — tab switching:** Prompt Config → Run History → Patient Review on atom detail page.

## 10. Component reuse from Sub-project A

| Component | Used in Sub-project B | How |
|---|---|---|
| `AtomRow` | CTCriterionDetailPage atom list | With `onClick` override for navigation instead of expand |
| `shared.ts` types | CTOverviewPage, CTCriterionDetailPage | `buildCriterionRows`, `buildAtomRows`, `atomStatus`, `AtomRowData`, `CriterionRowData` |
| `shared.ts` filters | CTOverviewPage filter bar | `applyCriterionFilters`, category/status/sort logic |
| Color maps | All three pages | `DATA_SOURCE_COLOR` for structured/unstructured visual distinction |
| Badge variants | StatusRollup | Same status → variant mapping |

## 11. Out of scope

- **Sub-project C** — encounter/patient ID run targeting, new run types
- **Sub-project D** — criterion-level and trial-level review rollup dashboards
- **Sub-project E** — funnel interactivity, chatbot, export
- **Data Vault** — already complete, not modified
- **Data model** — no type changes
