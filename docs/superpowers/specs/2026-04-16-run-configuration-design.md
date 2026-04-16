# Run Configuration — Sub-project C

**Date:** 2026-04-16
**Status:** Draft for review
**Scope:** Run creation UX for unstructured atoms. Sub-project C of a 5-part CT flow redesign (A: Vault ✅, B: Navigation ✅, C: Runs, D: Review rollups, E: Funnel).

## 1. Problem

The "Run Extraction" button on the atom detail page is a stub (`alert()`). Reviewers cannot create runs scoped to specific patients or encounters. There is no run creation mutator in AppContext.

## 2. Goals

1. Replace the stub with a run-creation modal that lets reviewers scope runs by all patients, patient IDs, or encounter IDs.
2. Runs are only possible on unstructured atoms (already enforced implicitly — structured atoms have no Prompt Config tab).
3. After creating a run, auto-switch to Run History tab to show the new entry.
4. Add `addRun` mutator to AppContext.

## 3. Non-goals

- No backend integration — runs are created in local mock state.
- No run execution engine — runs are created with status `Queued` and stay there (mock).
- No changes to structured atom behavior.
- No changes to Data Vault, CTOverviewPage, or CTCriterionDetailPage.

## 4. Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | Run scope selector in a modal | Keeps PromptConfigTab clean; modal is the confirmation gate. |
| 2 | Implicit blocking for structured atoms is sufficient | Structured atoms already hide Prompt Config tab. No extra labels needed. |
| 3 | Parent (CTAtomDetailPage) owns the modal | It has the patient list data needed for scope options. |

## 5. Architecture

### 5.1 New files

- `src/components/ct/RunConfigModal.tsx` — modal with scope selector, sample size, config summary, start button.

### 5.2 Modified files

- `src/pages/CTAtomDetailPage.tsx` — manages modal open/close state, passes patient lists and atom context, handles run creation callback, auto-switches to Run History tab after run.
- `src/context/AppContext.tsx` — add `addRun: (run: RunConfig) => void` to context type and provider.

### 5.3 Unchanged files

- `src/components/ct/PromptConfigTab.tsx` — `onRun` prop signature stays `() => void`. The parent calls its own handler that opens the modal.
- `src/types.ts` — `RunConfig` type already has all needed fields (`id`, `runId`, `criterionId`, `sampleSize`, `patientIds`, `fullRun`, `status`, etc.).

## 6. Component specification

### 6.1 `RunConfigModal`

Props:
```ts
type Props = {
  open: boolean;
  onClose: () => void;
  onStartRun: (config: { scope: 'all' | 'patients' | 'encounters'; ids: string[]; sampleSize: number; fullRun: boolean }) => void;
  atomLabel: string;
  keywordCount: number;
  model: string;
  allPatientIds: string[];      // patient_list_no_unstructured + patient_list_unknown
  totalPatientCount: number;
};
```

**Layout inside the modal:**

1. **Title:** "Run Extraction — {atomLabel}"

2. **Scope selector** (radio group, default: "all"):
   - `All patients ({totalPatientCount})` — no extra input
   - `By Patient IDs` — shows textarea, comma/newline separated. Validation: each ID must exist in `allPatientIds`. Shows count of valid / invalid.
   - `By Encounter IDs` — shows textarea. No validation (encounters aren't in the atom data model; this is a pass-through field for future backend use).

3. **Sample size** (shown only when scope is "all"):
   - Toggle: `Full run` (default on) vs `Sample`
   - When Sample: number input for count, default 50, min 1, max totalPatientCount

4. **Config summary strip:**
   - `Keywords: {keywordCount} · Model: {model} · Patients: {computedCount}`

5. **Footer:**
   - `Cancel` button (secondary)
   - `Start Run` button (primary) — disabled if scope is "patients" and no valid IDs entered

### 6.2 `CTAtomDetailPage` changes

- New state: `runModalOpen: boolean`
- `onRun` handler (passed to PromptConfigTab): sets `runModalOpen = true`
- `onStartRun` callback (passed to RunConfigModal):
  1. Builds a `RunConfig` object with a generated ID, the criterion ID, current keywords/model, scope details, status `Queued`
  2. Calls `addRun(runConfig)` from AppContext
  3. Closes modal
  4. Switches `activeTab` to `'runs'`

### 6.3 `AppContext` changes

Add to `AppContextValue` type:
```ts
addRun: (run: RunConfig) => void;
```

Implementation:
```ts
const addRun = useCallback((run: RunConfig) => {
  setRuns((prev) => [run, ...prev]);
}, []);
```

Expose in the context value object.

## 7. Edge cases

| Case | Behavior |
|---|---|
| Paste patient IDs that don't exist in the atom's patient list | Show inline validation: "3 of 5 IDs valid" in amber. Allow run with only valid IDs. |
| Empty patient ID textarea with "By Patient IDs" selected | Start Run button disabled. |
| Sample size > total patients | Clamp to total. |
| Sample size = 0 or negative | Clamp to 1. |
| Modal closed without running | No state change. |
| Run created successfully | Toast or inline confirmation, then tab switch to Run History. |

## 8. Testing

- Unit test for `addRun` — verify run is prepended to runs array.
- Visual: open modal → select each scope → verify UI changes. Create run → verify Run History tab shows new entry with "Queued" status.

## 9. Out of scope

- Run execution / status progression (Queued → Processing → Done) — future backend work.
- Sub-project D (review rollups), Sub-project E (funnel).
