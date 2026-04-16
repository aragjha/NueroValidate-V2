# Run Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the run-creation stub with a modal that lets reviewers scope runs by all patients, patient IDs, or encounter IDs, then creates a `RunConfig` entry.

**Architecture:** New `RunConfigModal` component, `addRun` mutator in AppContext, `CTAtomDetailPage` wires the modal and auto-switches to Run History tab after creation.

**Tech Stack:** React 19, TypeScript, Tailwind 4, existing Dialog component, existing RunConfig type.

**Reference spec:** `docs/superpowers/specs/2026-04-16-run-configuration-design.md`

---

## File structure

**Create:**
- `src/components/ct/RunConfigModal.tsx`

**Modify:**
- `src/context/AppContext.tsx` — add `addRun`
- `src/pages/CTAtomDetailPage.tsx` — wire modal + run creation

---

## Task 1: Add `addRun` to AppContext

**Files:**
- Modify: `src/context/AppContext.tsx`

- [ ] **Step 1.1: Add addRun to context type and provider**

In `src/context/AppContext.tsx`, read the file first. Then:

1. In the `AppContextValue` type, add: `addRun: (run: RunConfig) => void;`
2. After the existing `setRuns` useState, add the callback:
```ts
const addRun = useCallback((run: RunConfig) => {
  setRuns((prev) => [run, ...prev]);
}, []);
```
3. Add `addRun` to the context value object (the `useMemo` block that builds `value`).

- [ ] **Step 1.2: Build to verify**

Run: `npm run build 2>&1 | grep "AppContext"`
Expected: no new errors.

- [ ] **Step 1.3: Commit**

```bash
git add src/context/AppContext.tsx
git commit -m "feat(ctx): add addRun mutator to AppContext"
```

---

## Task 2: RunConfigModal component

**Files:**
- Create: `src/components/ct/RunConfigModal.tsx`

- [ ] **Step 2.1: Implement RunConfigModal**

Create `src/components/ct/RunConfigModal.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Play, X } from 'lucide-react';

type RunScope = 'all' | 'patients' | 'encounters';

type Props = {
  open: boolean;
  onClose: () => void;
  onStartRun: (config: { scope: RunScope; ids: string[]; sampleSize: number; fullRun: boolean }) => void;
  atomLabel: string;
  keywordCount: number;
  model: string;
  allPatientIds: string[];
  totalPatientCount: number;
};

export function RunConfigModal({ open, onClose, onStartRun, atomLabel, keywordCount, model, allPatientIds, totalPatientCount }: Props) {
  const [scope, setScope] = useState<RunScope>('all');
  const [idsText, setIdsText] = useState('');
  const [fullRun, setFullRun] = useState(true);
  const [sampleSize, setSampleSize] = useState(50);

  const parsedIds = useMemo(() => {
    return idsText.split(/[,\n\s]+/).map((s) => s.trim()).filter(Boolean);
  }, [idsText]);

  const validPatientIds = useMemo(() => {
    if (scope !== 'patients') return [];
    const allowed = new Set(allPatientIds);
    return parsedIds.filter((id) => allowed.has(id));
  }, [scope, parsedIds, allPatientIds]);

  const invalidCount = scope === 'patients' ? parsedIds.length - validPatientIds.length : 0;

  const runPatientCount = scope === 'all'
    ? (fullRun ? totalPatientCount : Math.min(Math.max(sampleSize, 1), totalPatientCount))
    : scope === 'patients'
      ? validPatientIds.length
      : parsedIds.length;

  const canRun = scope === 'all'
    ? totalPatientCount > 0
    : parsedIds.length > 0 && (scope === 'encounters' || validPatientIds.length > 0);

  const handleStart = () => {
    const ids = scope === 'patients' ? validPatientIds : scope === 'encounters' ? parsedIds : [];
    const size = scope === 'all' && !fullRun ? Math.min(Math.max(sampleSize, 1), totalPatientCount) : runPatientCount;
    onStartRun({ scope, ids, sampleSize: size, fullRun: scope === 'all' ? fullRun : true });
  };

  return (
    <Dialog open={open} onClose={onClose} title={`Run Extraction — ${atomLabel}`}>
      <div className="space-y-5">
        {/* Scope selector */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Run Scope</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors">
              <input type="radio" name="scope" checked={scope === 'all'} onChange={() => setScope('all')} className="accent-primary" />
              <span className="text-sm font-medium">All patients</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-auto">{totalPatientCount}</Badge>
            </label>
            <label className="flex items-start gap-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors">
              <input type="radio" name="scope" checked={scope === 'patients'} onChange={() => setScope('patients')} className="accent-primary mt-1" />
              <div className="flex-1 space-y-2">
                <span className="text-sm font-medium">By Patient IDs</span>
                {scope === 'patients' && (
                  <>
                    <textarea
                      className="w-full rounded-lg border bg-background px-3 py-2 text-xs font-mono min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Paste patient IDs, comma or newline separated..."
                      value={idsText}
                      onChange={(e) => setIdsText(e.target.value)}
                    />
                    {parsedIds.length > 0 && (
                      <p className="text-xs">
                        <span className="text-emerald-600 font-medium">{validPatientIds.length} valid</span>
                        {invalidCount > 0 && <span className="text-amber-600 font-medium ml-2">{invalidCount} not in atom patient list</span>}
                      </p>
                    )}
                  </>
                )}
              </div>
            </label>
            <label className="flex items-start gap-2 rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors">
              <input type="radio" name="scope" checked={scope === 'encounters'} onChange={() => setScope('encounters')} className="accent-primary mt-1" />
              <div className="flex-1 space-y-2">
                <span className="text-sm font-medium">By Encounter IDs</span>
                {scope === 'encounters' && (
                  <textarea
                    className="w-full rounded-lg border bg-background px-3 py-2 text-xs font-mono min-h-[80px] focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Paste encounter IDs, comma or newline separated..."
                    value={idsText}
                    onChange={(e) => setIdsText(e.target.value)}
                  />
                )}
              </div>
            </label>
          </div>
        </section>

        {/* Sample size — only for "all" scope */}
        {scope === 'all' && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Run Size</h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="runsize" checked={fullRun} onChange={() => setFullRun(true)} className="accent-primary" />
                <span className="text-sm">Full run ({totalPatientCount} patients)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="runsize" checked={!fullRun} onChange={() => setFullRun(false)} className="accent-primary" />
                <span className="text-sm">Sample</span>
              </label>
              {!fullRun && (
                <Input
                  type="number"
                  min={1}
                  max={totalPatientCount}
                  value={sampleSize}
                  onChange={(e) => setSampleSize(Number(e.target.value))}
                  className="w-24 h-8 text-sm"
                />
              )}
            </div>
          </section>
        )}

        {/* Config summary */}
        <div className="rounded-lg bg-muted/50 px-4 py-3 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span>Keywords: <b className="text-foreground">{keywordCount}</b></span>
          <span>Model: <b className="text-foreground">{model}</b></span>
          <span>Patients: <b className="text-foreground">{runPatientCount}</b></span>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted cursor-pointer">Cancel</button>
          <button
            onClick={handleStart}
            disabled={!canRun}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Play className="h-4 w-4" /> Start Run
          </button>
        </div>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 2.2: Build & commit**

```bash
npm run build 2>&1 | grep "RunConfigModal"
git add src/components/ct/RunConfigModal.tsx
git commit -m "feat(ct): RunConfigModal with scope selector, sample size, validation"
```

---

## Task 3: Wire modal into CTAtomDetailPage

**Files:**
- Modify: `src/pages/CTAtomDetailPage.tsx`

- [ ] **Step 3.1: Add modal integration**

Read `src/pages/CTAtomDetailPage.tsx` first, then make these changes:

1. Add imports:
```tsx
import { RunConfigModal } from '@/components/ct/RunConfigModal';
```
And add `addRun` to the AppContext destructure (alongside existing `saveDecision`).

2. Add state for modal:
```tsx
const [runModalOpen, setRunModalOpen] = useState(false);
```

3. Replace the existing `handleRun` callback:
```tsx
const handleRun = useCallback(() => {
  setRunModalOpen(true);
}, []);
```

4. Add `handleStartRun` callback:
```tsx
const handleStartRun = useCallback((config: { scope: string; ids: string[]; sampleSize: number; fullRun: boolean }) => {
  const newRun: RunConfig = {
    id: `run-${Date.now()}`,
    runId: `RUN-${Date.now().toString(36).toUpperCase()}`,
    criterionId: atom?.parentCriterionId ?? '',
    overrideModels: false,
    overridePrompts: false,
    overrideKeywords: false,
    sampleSize: config.sampleSize,
    patientIds: config.ids.join(','),
    reuseSample: false,
    fullRun: config.fullRun,
    status: 'Queued',
    extractionCount: 0,
    totalCount: config.sampleSize,
    fileName: `${atom?.label ?? 'atom'}_extraction.csv`,
  };
  addRun(newRun);
  setRunModalOpen(false);
  setActiveTab('runs');
}, [atom, addRun]);
```

5. Add `RunConfig` to the type import from `@/types`.

6. After the closing `</>` of the tabs section (but before the closing `</div>` of the page), add:
```tsx
<RunConfigModal
  open={runModalOpen}
  onClose={() => setRunModalOpen(false)}
  onStartRun={handleStartRun}
  atomLabel={atom?.label ?? ''}
  keywordCount={keywords.length}
  model={model}
  allPatientIds={patientsToReview}
  totalPatientCount={patientsToReview.length}
/>
```

- [ ] **Step 3.2: Build & verify tests**

Run: `npm test && npm run build 2>&1 | grep -c "error TS"`
Expected: 26 tests pass, 0 new errors.

- [ ] **Step 3.3: Commit**

```bash
git add src/pages/CTAtomDetailPage.tsx
git commit -m "feat(ct): wire RunConfigModal into CTAtomDetailPage with auto-tab-switch"
```

---

## Task 4: Manual verification

- [ ] **Step 4.1:** Navigate to an unstructured atom detail page
- [ ] **Step 4.2:** Click "Run Extraction" → modal opens with scope selector
- [ ] **Step 4.3:** Select "All patients" → verify count shows
- [ ] **Step 4.4:** Select "By Patient IDs" → paste some IDs → verify validation
- [ ] **Step 4.5:** Click "Start Run" → modal closes → Run History tab activates → new run with "Queued" status shows
- [ ] **Step 4.6:** Navigate to a structured atom → verify no Run button exists

---

## Self-review

**Spec coverage:** All 4 goals covered (modal ✓, unstructured-only ✓, auto-switch ✓, addRun ✓). Edge cases from spec Section 7 handled in modal validation logic.

**Type consistency:** `RunConfig` from `types.ts` used throughout. `addRun` signature matches between AppContext type and implementation. `onStartRun` config shape matches between modal and page.
