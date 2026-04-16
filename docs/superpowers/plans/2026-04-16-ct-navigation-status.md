# CT Navigation + Status Propagation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a three-level CT drill-down (criteria list → criterion detail → atom workspace) with worst-status badge + progress fraction rollup at every level, reusing the component library from Sub-project A.

**Architecture:** Rewrite `CTOverviewPage` and `CTCriterionDetailPage` to use `shared.ts` data model. Add new `CTAtomDetailPage` with tabbed sections (Prompt Config / Run History / Patient Review). A shared `StatusRollup` component renders status at every level. `AtomRow` gets an optional `onClick` prop to support navigation instead of expand.

**Tech Stack:** React 19, React Router 7, TypeScript, Tailwind 4, existing shadcn primitives, `shared.ts` from Sub-project A.

**Reference spec:** `docs/superpowers/specs/2026-04-16-ct-navigation-status-design.md`

---

## File structure

**Create:**
- `src/components/ct/StatusRollup.tsx` — badge + "N/M label complete" inline component
- `src/components/ct/StatusRollup.test.ts` — vitest tests for rollup logic
- `src/components/ct/AtomMetadataHeader.tsx` — pinned header for atom detail page
- `src/components/ct/PromptConfigTab.tsx` — keyword editor, prompt textareas, model selector, run button
- `src/components/ct/RunHistoryTab.tsx` — run table with expandable rows
- `src/components/ct/PatientReviewTab.tsx` — interactive patient review table
- `src/pages/CTAtomDetailPage.tsx` — atom workspace page shell

**Rewrite:**
- `src/pages/CTOverviewPage.tsx` — full rewrite using shared.ts
- `src/pages/CTCriterionDetailPage.tsx` — full rewrite using AtomRow + grouped sections

**Modify:**
- `src/components/vault/AtomRow.tsx` — add optional `onClick` prop override
- `src/App.tsx` — add route for `/projects/:projectId/ct-atom/:atomId`

**Reused unchanged:**
- `src/components/vault/shared.ts` — types, builders, filters, color maps
- `src/components/ui/*` — Badge, Input, Card, ScrollArea, etc.

---

## Task 1: Add `onClick` prop override to AtomRow

**Files:**
- Modify: `src/components/vault/AtomRow.tsx`

- [ ] **Step 1.1: Add optional onClick prop**

In `src/components/vault/AtomRow.tsx`, change the component signature from:
```tsx
export function AtomRow({
  row,
  defaultExpanded = false,
}: {
  row: AtomRowData;
  defaultExpanded?: boolean;
}) {
```
to:
```tsx
export function AtomRow({
  row,
  defaultExpanded = false,
  onClick,
}: {
  row: AtomRowData;
  defaultExpanded?: boolean;
  onClick?: (row: AtomRowData) => void;
}) {
```

Then update the button's `onClick` handler. Find the line:
```tsx
onClick={() => setExpanded((v) => !v)}
```
and change to:
```tsx
onClick={() => onClick ? onClick(row) : setExpanded((v) => !v)}
```

- [ ] **Step 1.2: Build to verify**

Run: `npm run build 2>&1 | grep -c "error TS"`
Expected: 0 new errors from AtomRow.tsx.

- [ ] **Step 1.3: Commit**

```bash
git add src/components/vault/AtomRow.tsx
git commit -m "feat(vault): add optional onClick prop to AtomRow for navigation override"
```

---

## Task 2: StatusRollup component + tests (TDD)

**Files:**
- Create: `src/components/ct/StatusRollup.tsx`
- Create: `src/components/ct/StatusRollup.test.ts`

- [ ] **Step 2.1: Write failing tests**

Create `src/components/ct/StatusRollup.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { worstStatus, type AtomStatus } from './StatusRollup';

describe('worstStatus', () => {
  it('returns auto-validated when all atoms are auto-validated', () => {
    expect(worstStatus(['auto-validated', 'auto-validated'])).toBe('auto-validated');
  });

  it('returns validated when mix of auto-validated and validated', () => {
    expect(worstStatus(['auto-validated', 'validated', 'auto-validated'])).toBe('validated');
  });

  it('returns in-progress when any atom is in-progress', () => {
    expect(worstStatus(['validated', 'in-progress', 'auto-validated'])).toBe('in-progress');
  });

  it('returns needs-config when any atom needs config', () => {
    expect(worstStatus(['validated', 'in-progress', 'needs-config'])).toBe('needs-config');
  });

  it('returns needs-config for empty array', () => {
    expect(worstStatus([])).toBe('needs-config');
  });

  it('needs-config beats everything', () => {
    expect(worstStatus(['auto-validated', 'validated', 'in-progress', 'needs-config'])).toBe('needs-config');
  });
});
```

- [ ] **Step 2.2: Run tests — expect fail**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 2.3: Implement StatusRollup**

Create `src/components/ct/StatusRollup.tsx`:
```tsx
import { Badge } from '@/components/ui/badge';

export type AtomStatus = 'auto-validated' | 'needs-config' | 'in-progress' | 'validated';

const STATUS_PRIORITY: Record<AtomStatus, number> = {
  'needs-config': 0,
  'in-progress': 1,
  'validated': 2,
  'auto-validated': 3,
};

const STATUS_VARIANT: Record<AtomStatus, 'processing' | 'secondary' | 'warning' | 'success'> = {
  'auto-validated': 'processing',
  'needs-config': 'secondary',
  'in-progress': 'warning',
  'validated': 'success',
};

const STATUS_LABEL: Record<AtomStatus, string> = {
  'auto-validated': 'Auto-validated',
  'needs-config': 'Needs config',
  'in-progress': 'In progress',
  'validated': 'Validated',
};

export function worstStatus(statuses: AtomStatus[]): AtomStatus {
  if (statuses.length === 0) return 'needs-config';
  return statuses.reduce((worst, s) =>
    STATUS_PRIORITY[s] < STATUS_PRIORITY[worst] ? s : worst,
  );
}

type Props = {
  status: AtomStatus;
  completed: number;
  total: number;
  label: string;
};

export function StatusRollup({ status, completed, total, label }: Props) {
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <Badge variant={STATUS_VARIANT[status]} className="text-[10px] px-2 py-0">
        {STATUS_LABEL[status]}
      </Badge>
      <span className="text-muted-foreground tabular-nums">
        {completed}/{total} {label} complete
      </span>
    </span>
  );
}
```

- [ ] **Step 2.4: Run tests — expect pass**

Run: `npm test`
Expected: all tests pass (20 prior + 6 new = 26 total).

- [ ] **Step 2.5: Commit**

```bash
git add src/components/ct/StatusRollup.tsx src/components/ct/StatusRollup.test.ts
git commit -m "feat(ct): StatusRollup component with worstStatus helper (TDD)"
```

---

## Task 3: Rewrite CTOverviewPage

**Files:**
- Rewrite: `src/pages/CTOverviewPage.tsx`

- [ ] **Step 3.1: Rewrite CTOverviewPage**

Replace the entire file `src/pages/CTOverviewPage.tsx` with:
```tsx
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { StatusRollup, worstStatus } from '@/components/ct/StatusRollup';
import {
  buildCriterionRows, buildAtomRows, applyCriterionFilters,
  type CriterionRowData, type FilterState, DEFAULT_FILTERS, DATA_SOURCE_COLOR,
} from '@/components/vault/shared';
import {
  ArrowLeft, ChevronRight, Database, FlaskConical, Layers, Search, Users, XCircle,
} from 'lucide-react';

const CATEGORY_ORDER = ['Demographics','Diagnosis','Labs','Imaging','Medications','Procedures','Clinical'] as const;

export function CTOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const nav = useNavigate();
  const { projects, cohortImports } = useAppContext();
  const project = projects.find((p) => p.id === projectId);
  const cohort = cohortImports.find((c) => c.id === project?.cohortImportId);

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'structured' | 'unstructured'>('unstructured');
  const [filterCat, setFilterCat] = useState<string | null>(null);

  const criteria = useMemo(() => cohort ? buildCriterionRows(cohort) : [], [cohort]);
  const atoms = useMemo(() => cohort ? buildAtomRows(cohort) : [], [cohort]);

  const completeCriteria = criteria.filter((c) => c.status === 'auto-validated' || c.status === 'validated').length;
  const projectStatus = worstStatus(criteria.map((c) => c.status));

  const categories = useMemo(() => {
    const cats = new Set(criteria.map((c) => c.category));
    const ordered: string[] = [];
    for (const c of CATEGORY_ORDER) { if (cats.has(c)) { ordered.push(c); cats.delete(c); } }
    for (const c of cats) ordered.push(c);
    return ordered;
  }, [criteria]);

  const filteredCriteria = useMemo(() => {
    const f: FilterState = { ...DEFAULT_FILTERS, view: viewMode, q: search, cat: filterCat ? [filterCat] : [] };
    return applyCriterionFilters(criteria, f);
  }, [criteria, viewMode, search, filterCat]);

  const totalPt = cohort?.metadata.totalPatients ?? 0;
  const strCr = criteria.filter((c) => c.mixedness === 'all-structured').length;
  const unstrCr = criteria.length - strCr;

  if (!project || !cohort) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <XCircle className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Project or cohort not found</p>
          <button onClick={() => nav('/projects')} className="mt-2 text-sm text-primary underline cursor-pointer">Back to Projects</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => nav('/projects')} className="text-muted-foreground hover:text-foreground cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">{project.name}</h1>
              <Badge className="text-[10px] px-2 py-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">CT</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {cohort.metadata.trialName} · {cohort.metadata.trialPhase} · {cohort.metadata.indication}
            </p>
            <div className="mt-1">
              <StatusRollup status={projectStatus} completed={completeCriteria} total={criteria.length} label="criteria" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => nav(`/projects/${projectId}/ct-funnel`)} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-muted cursor-pointer">
            <Layers className="h-3.5 w-3.5" /> View Funnel
          </button>
          <button onClick={() => nav(`/projects/${projectId}/ct-matrix`)} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-muted cursor-pointer">
            <Database className="h-3.5 w-3.5" /> View Matrix
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1"><Users className="h-3.5 w-3.5 text-muted-foreground" /><p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Patients</p></div>
          <p className="text-2xl font-bold">{totalPt.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Criteria</p>
          <p className="text-2xl font-bold">{criteria.length}</p>
          <p className="text-[10px] text-muted-foreground">{strCr} structured / {unstrCr} unstructured</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Atoms</p>
          <p className="text-2xl font-bold">{atoms.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Eligible</p>
          <p className="text-2xl font-bold text-emerald-600">{cohort.metadata.eligibleCount.toLocaleString()}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-xl border bg-card px-5 py-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search criteria..." className="pl-9 h-9 text-sm" />
          </div>
          <div className="flex rounded-lg border overflow-hidden">
            {(['all', 'structured', 'unstructured'] as const).map((m) => (
              <button key={m} onClick={() => setViewMode(m)} className={`px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${viewMode === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                {m === 'all' ? 'All' : m === 'structured' ? 'Structured' : 'Unstructured'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map((c) => (
            <button key={c} onClick={() => setFilterCat(filterCat === c ? null : c)} className={`rounded-full px-2.5 py-1 text-[10px] font-semibold cursor-pointer border transition-colors ${filterCat === c ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'}`}>
              {c}
            </button>
          ))}
          {(search || filterCat || viewMode !== 'all') && (
            <button onClick={() => { setSearch(''); setFilterCat(null); setViewMode('all'); }} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold text-red-500 hover:bg-red-500/10 cursor-pointer">
              <XCircle className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Criteria cards */}
      <div className="space-y-3">
        {filteredCriteria.map((cr) => {
          const isAllStr = cr.mixedness === 'all-structured';
          const borderCls = isAllStr ? 'border-blue-200 dark:border-blue-800' : 'border-amber-200 dark:border-amber-800';
          const bgCls = isAllStr ? 'bg-blue-50/30 dark:bg-blue-950/20' : 'bg-amber-50/30 dark:bg-amber-950/20';
          const completeAtoms = cr.atoms.filter((a) => a.status === 'auto-validated' || a.status === 'validated').length;

          return (
            <button
              key={cr.id}
              onClick={() => nav(`/projects/${projectId}/ct-criteria/${cr.id}`)}
              className={`w-full rounded-xl border ${borderCls} ${bgCls} p-4 text-left cursor-pointer hover:shadow-md transition-shadow group`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`h-2.5 w-2.5 rounded-sm ${cr.mixedness === 'all-structured' ? 'bg-blue-500' : cr.mixedness === 'all-unstructured' ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-500 to-amber-500'}`} />
                    <span className="text-xs font-bold text-muted-foreground">C{cr.index}</span>
                    <Badge variant={cr.type === 'inclusion' ? 'success' : 'destructive'} className="text-[9px] px-1.5 py-0">
                      {cr.type === 'inclusion' ? 'INC' : 'EXC'}
                    </Badge>
                    <span className="text-sm font-semibold truncate">{cr.name}</span>
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{cr.category}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                    <span>{cr.atoms.length} atom{cr.atoms.length !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>{cr.structuredAtoms.length} str / {cr.unstructuredAtoms.length} unstr</span>
                  </div>
                  <div className="mt-1.5">
                    <StatusRollup status={cr.status} completed={completeAtoms} total={cr.atoms.length} label="atoms" />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${cr.pctComplete >= 100 ? 'bg-emerald-500' : isAllStr ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${cr.pctComplete}%` }} />
                    </div>
                    <span className="text-[10px] font-bold tabular-nums text-muted-foreground">{cr.pctComplete}%</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            </button>
          );
        })}
        {filteredCriteria.length === 0 && (
          <div className="rounded-xl border bg-card px-5 py-12 text-center text-sm text-muted-foreground">No criteria match your filters.</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3.2: Build**

Run: `npm run build 2>&1 | grep "CTOverviewPage"`
Expected: no errors from CTOverviewPage.

- [ ] **Step 3.3: Commit**

```bash
git add src/pages/CTOverviewPage.tsx
git commit -m "feat(ct): rewrite CTOverviewPage with shared.ts data model + StatusRollup"
```

---

## Task 4: Rewrite CTCriterionDetailPage

**Files:**
- Rewrite: `src/pages/CTCriterionDetailPage.tsx`

- [ ] **Step 4.1: Rewrite CTCriterionDetailPage**

Replace the entire file `src/pages/CTCriterionDetailPage.tsx` with:
```tsx
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';
import { StatusRollup, worstStatus } from '@/components/ct/StatusRollup';
import { AtomRow } from '@/components/vault/AtomRow';
import { buildAtomRows, buildCriterionRows, type AtomRowData } from '@/components/vault/shared';
import { ArrowLeft, ChevronRight, XCircle } from 'lucide-react';

export function CTCriterionDetailPage() {
  const { projectId, criterionId } = useParams<{ projectId: string; criterionId: string }>();
  const nav = useNavigate();
  const { projects, cohortImports } = useAppContext();
  const project = projects.find((p) => p.id === projectId);
  const cohort = cohortImports.find((c) => c.id === project?.cohortImportId);

  const criteria = useMemo(() => cohort ? buildCriterionRows(cohort) : [], [cohort]);
  const criterion = criteria.find((c) => c.id === criterionId);

  const projectStatus = worstStatus(criteria.map((c) => c.status));
  const completeCriteria = criteria.filter((c) => c.status === 'auto-validated' || c.status === 'validated').length;

  if (!project || !cohort || !criterion) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <XCircle className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Criterion not found</p>
          <button onClick={() => nav(`/projects/${projectId}/ct-overview`)} className="mt-2 text-sm text-primary underline cursor-pointer">Back to Overview</button>
        </div>
      </div>
    );
  }

  const completeAtoms = criterion.atoms.filter((a) => a.status === 'auto-validated' || a.status === 'validated').length;
  const crDisplay = cohort.criteria.find((c) => c.id === criterionId);

  const handleAtomClick = (row: AtomRowData) => {
    nav(`/projects/${projectId}/ct-atom/${row.id}`);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Breadcrumb with status at every level */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <button onClick={() => nav(`/projects/${projectId}/ct-overview`)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button onClick={() => nav(`/projects/${projectId}/ct-overview`)} className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
          {project.name}
        </button>
        <StatusRollup status={projectStatus} completed={completeCriteria} total={criteria.length} label="criteria" />
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        <span className="font-semibold text-sm">C{criterion.index} · {criterion.name}</span>
        <StatusRollup status={criterion.status} completed={completeAtoms} total={criterion.atoms.length} label="atoms" />
      </div>

      {/* Criterion header */}
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-lg font-bold">{criterion.name}</h1>
          <Badge variant={criterion.type === 'inclusion' ? 'success' : 'destructive'} className="text-[10px] px-2 py-0">
            {criterion.type === 'inclusion' ? 'Inclusion' : 'Exclusion'}
          </Badge>
          <Badge variant="secondary" className="text-[10px] px-2 py-0">{criterion.category}</Badge>
        </div>
        {crDisplay?.description && <p className="text-sm text-muted-foreground">{crDisplay.description}</p>}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Atom logic: <strong className="text-foreground">{crDisplay?.atomLogic ?? 'AND'}</strong> ({crDisplay?.atomLogic === 'OR' ? 'any passing is sufficient' : 'all must pass'})</span>
          <span>{criterion.atoms.length} atoms · {criterion.structuredAtoms.length} structured / {criterion.unstructuredAtoms.length} unstructured</span>
        </div>
      </div>

      {/* Atom sections — unstructured first */}
      {criterion.unstructuredAtoms.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-sm bg-amber-500" />
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Unstructured ({criterion.unstructuredAtoms.length}) — needs review
            </h2>
          </div>
          <div className="space-y-1.5">
            {criterion.unstructuredAtoms.map((a) => (
              <AtomRow key={a.id} row={a} onClick={handleAtomClick} />
            ))}
          </div>
        </section>
      )}

      {criterion.structuredAtoms.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-sm bg-blue-500" />
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Structured ({criterion.structuredAtoms.length}) — auto-validated
            </h2>
          </div>
          <div className="space-y-1.5">
            {criterion.structuredAtoms.map((a) => (
              <AtomRow key={a.id} row={a} onClick={handleAtomClick} />
            ))}
          </div>
        </section>
      )}

      {criterion.atoms.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">No atoms defined for this criterion.</p>
      )}
    </div>
  );
}

export default CTCriterionDetailPage;
```

- [ ] **Step 4.2: Build**

Run: `npm run build 2>&1 | grep "CTCriterionDetailPage"`
Expected: no errors.

- [ ] **Step 4.3: Commit**

```bash
git add src/pages/CTCriterionDetailPage.tsx
git commit -m "feat(ct): rewrite CTCriterionDetailPage with AtomRow + grouped sections + StatusRollup"
```

---

## Task 5: AtomMetadataHeader component

**Files:**
- Create: `src/components/ct/AtomMetadataHeader.tsx`

- [ ] **Step 5.1: Implement AtomMetadataHeader**

Create `src/components/ct/AtomMetadataHeader.tsx`:
```tsx
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { StatusRollup, worstStatus } from './StatusRollup';
import type { AtomRowData, CriterionRowData } from '@/components/vault/shared';
import { ArrowLeft, ChevronRight } from 'lucide-react';

type Props = {
  atom: AtomRowData;
  criterion: CriterionRowData;
  allCriteria: CriterionRowData[];
  projectId: string;
  projectName: string;
  reviewedCount: number;
  totalToReview: number;
};

function MiniBar({ yes, no, unknown }: { yes: number; no: number; unknown: number }) {
  const total = yes + no + unknown || 1;
  const title = `Yes: ${yes} · No: ${no} · Unknown: ${unknown}`;
  return (
    <div title={title} className="flex h-1.5 w-32 overflow-hidden rounded-full bg-muted" role="img" aria-label={title}>
      <span className="h-full bg-emerald-500" style={{ width: `${(yes / total) * 100}%` }} />
      <span className="h-full bg-slate-400" style={{ width: `${(no / total) * 100}%` }} />
      <span className="h-full bg-amber-500" style={{ width: `${(unknown / total) * 100}%` }} />
    </div>
  );
}

export function AtomMetadataHeader({ atom, criterion, allCriteria, projectId, projectName, reviewedCount, totalToReview }: Props) {
  const nav = useNavigate();
  const isStructured = atom.dataSource === 'structured';
  const projectStatus = worstStatus(allCriteria.map((c) => c.status));
  const completeCriteria = allCriteria.filter((c) => c.status === 'auto-validated' || c.status === 'validated').length;
  const completeAtoms = criterion.atoms.filter((a) => a.status === 'auto-validated' || a.status === 'validated').length;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      {/* Breadcrumb with status */}
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <button onClick={() => nav(`/projects/${projectId}/ct-overview`)} className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer">
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => nav(`/projects/${projectId}/ct-overview`)} className="text-muted-foreground hover:text-foreground cursor-pointer">
          {projectName}
        </button>
        <StatusRollup status={projectStatus} completed={completeCriteria} total={allCriteria.length} label="criteria" />
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        <button onClick={() => nav(`/projects/${projectId}/ct-criteria/${criterion.id}`)} className="text-muted-foreground hover:text-foreground cursor-pointer">
          C{criterion.index} · {criterion.name}
        </button>
        <StatusRollup status={criterion.status} completed={completeAtoms} total={criterion.atoms.length} label="atoms" />
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        <span className="font-semibold text-foreground">A{atom.atomIndex} · {atom.label}</span>
      </div>

      {/* Atom identity */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold">{atom.label}</h1>
            <span className={`h-2.5 w-2.5 rounded-sm ${isStructured ? 'bg-blue-500' : 'bg-amber-500'}`} />
            <Badge variant={atom.parentCriterionType === 'inclusion' ? 'success' : 'destructive'} className="text-[10px] px-2 py-0">
              {atom.parentCriterionType === 'inclusion' ? 'INC' : 'EXC'}
            </Badge>
            <Badge variant="secondary" className="text-[10px] px-2 py-0">{atom.category}</Badge>
          </div>
          {(atom.conceptLabel || atom.operator) && (
            <div className="font-mono text-[11px] text-muted-foreground bg-muted/50 rounded px-2 py-1 inline-flex gap-3 flex-wrap">
              {atom.conceptLabel && <span>concept: <span className="text-foreground">{atom.conceptLabel}</span></span>}
              {atom.operator && <span>op: <span className="text-foreground">{atom.operator}</span></span>}
              {atom.polarity && <span>polarity: <span className="text-foreground">{atom.polarity}</span></span>}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusRollup status={atom.status} completed={reviewedCount} total={totalToReview} label="patients reviewed" />
          <MiniBar yes={atom.yes} no={atom.no} unknown={atom.unknown} />
        </div>
      </div>

      {/* Patient split summary */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span>Yes <b className="text-foreground tabular-nums">{atom.yes.toLocaleString()}</b></span>
        <span>No <b className="text-foreground tabular-nums">{atom.no.toLocaleString()}</b>
          {!isStructured && <span className="ml-1">(str {atom.noStructured.toLocaleString()}, unstr {atom.noUnstructured.toLocaleString()})</span>}
        </span>
        <span>Unknown <b className="text-foreground tabular-nums">{atom.unknown.toLocaleString()}</b></span>
      </div>

      {/* Structured banner */}
      {isStructured && (
        <div className="rounded-lg border border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
          This atom is auto-validated from structured data. No configuration or review needed.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5.2: Build**

Run: `npm run build 2>&1 | grep "AtomMetadataHeader"`
Expected: no errors.

- [ ] **Step 5.3: Commit**

```bash
git add src/components/ct/AtomMetadataHeader.tsx
git commit -m "feat(ct): AtomMetadataHeader with breadcrumb status + patient split"
```

---

## Task 6: PromptConfigTab component

**Files:**
- Create: `src/components/ct/PromptConfigTab.tsx`

- [ ] **Step 6.1: Implement PromptConfigTab**

Create `src/components/ct/PromptConfigTab.tsx`:
```tsx
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Play, X } from 'lucide-react';

type Props = {
  keywords: string[];
  onAddKeyword: (kw: string) => void;
  onRemoveKeyword: (kw: string) => void;
  extractionPrompt: string;
  onExtractionPromptChange: (val: string) => void;
  reasoningPrompt: string;
  onReasoningPromptChange: (val: string) => void;
  model: string;
  onModelChange: (val: string) => void;
  onRun: () => void;
  runDisabled: boolean;
};

const MODELS = ['gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001', 'gemini-2.0-flash'];

export function PromptConfigTab({
  keywords, onAddKeyword, onRemoveKeyword,
  extractionPrompt, onExtractionPromptChange,
  reasoningPrompt, onReasoningPromptChange,
  model, onModelChange, onRun, runDisabled,
}: Props) {
  const [kwInput, setKwInput] = useState('');

  const handleAddKw = () => {
    const trimmed = kwInput.trim().toLowerCase();
    if (trimmed && !keywords.includes(trimmed)) {
      onAddKeyword(trimmed);
      setKwInput('');
    }
  };

  return (
    <div className="space-y-6 py-4">
      {/* Keywords */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Keywords</h3>
        <p className="text-xs text-muted-foreground">Add keywords to guide LLM extraction from clinical notes.</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {keywords.map((kw) => (
            <Badge key={kw} variant="secondary" className="text-xs px-2 py-0.5 gap-1">
              {kw}
              <button onClick={() => onRemoveKeyword(kw)} className="hover:text-destructive cursor-pointer"><X className="h-3 w-3" /></button>
            </Badge>
          ))}
          <form className="inline-flex" onSubmit={(e) => { e.preventDefault(); handleAddKw(); }}>
            <Input
              className="h-7 w-32 text-xs"
              placeholder="+ add keyword"
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
            />
          </form>
        </div>
      </section>

      {/* Extraction prompt */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Extraction Prompt</h3>
        <textarea
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Enter the extraction prompt. This tells the LLM what to look for in clinical notes..."
          value={extractionPrompt}
          onChange={(e) => onExtractionPromptChange(e.target.value)}
        />
      </section>

      {/* Reasoning prompt */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Reasoning Prompt</h3>
        <textarea
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Enter the reasoning prompt. This tells the LLM how to evaluate the extracted evidence..."
          value={reasoningPrompt}
          onChange={(e) => onReasoningPromptChange(e.target.value)}
        />
      </section>

      {/* Model + Run */}
      <div className="flex items-end gap-4">
        <section className="space-y-2 flex-1">
          <h3 className="text-sm font-semibold">Model</h3>
          <select
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
          >
            {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </section>
        <button
          onClick={onRun}
          disabled={runDisabled}
          title={runDisabled ? 'Add keywords before running' : 'Run extraction'}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <Play className="h-4 w-4" /> Run Extraction
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6.2: Build & commit**

```bash
npm run build 2>&1 | grep "PromptConfigTab"
git add src/components/ct/PromptConfigTab.tsx
git commit -m "feat(ct): PromptConfigTab with keyword editor, prompts, model selector"
```

---

## Task 7: RunHistoryTab component

**Files:**
- Create: `src/components/ct/RunHistoryTab.tsx`

- [ ] **Step 7.1: Implement RunHistoryTab**

Create `src/components/ct/RunHistoryTab.tsx`:
```tsx
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import type { RunConfig } from '@/types';
import { ChevronDown, FileText } from 'lucide-react';

type Props = {
  runs: RunConfig[];
};

export function RunHistoryTab({ runs }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (runs.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p className="font-medium">No runs yet</p>
        <p className="mt-1">Configure prompts and run extraction to see results here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden mt-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-left">
            <th className="px-4 py-2.5 font-medium text-xs">Run ID</th>
            <th className="px-4 py-2.5 font-medium text-xs">Status</th>
            <th className="px-4 py-2.5 font-medium text-xs">Processed</th>
            <th className="px-4 py-2.5 font-medium text-xs">Sample Size</th>
            <th className="px-4 py-2.5 font-medium text-xs">Cost</th>
            <th className="px-4 py-2.5 font-medium text-xs">File</th>
            <th className="px-4 py-2.5 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => {
            const isOpen = expandedId === r.runId;
            return (
              <tr key={r.runId} className="border-t group">
                <td className="px-4 py-2 font-mono text-xs">{r.runId}</td>
                <td className="px-4 py-2">
                  <Badge variant={r.status === 'Done' ? 'success' : r.status === 'Failed' ? 'destructive' : r.status === 'Processing' ? 'warning' : 'secondary'} className="text-[10px] px-2 py-0">
                    {r.status}
                  </Badge>
                </td>
                <td className="px-4 py-2 tabular-nums">{r.extractionCount} / {r.totalCount}</td>
                <td className="px-4 py-2 tabular-nums">{r.sampleSize}</td>
                <td className="px-4 py-2 tabular-nums">{r.costProfile ? `$${r.costProfile.totalCost.toFixed(2)}` : '—'}</td>
                <td className="px-4 py-2 text-muted-foreground text-xs truncate max-w-[140px]">{r.fileName}</td>
                <td className="px-4 py-2">
                  <button onClick={() => setExpandedId(isOpen ? null : r.runId)} className="cursor-pointer text-muted-foreground hover:text-foreground">
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 7.2: Build & commit**

```bash
npm run build 2>&1 | grep "RunHistoryTab"
git add src/components/ct/RunHistoryTab.tsx
git commit -m "feat(ct): RunHistoryTab with expandable run rows"
```

---

## Task 8: PatientReviewTab component

**Files:**
- Create: `src/components/ct/PatientReviewTab.tsx`

- [ ] **Step 8.1: Implement PatientReviewTab**

Create `src/components/ct/PatientReviewTab.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { ReviewItem } from '@/types';
import { Search, Users } from 'lucide-react';

type Props = {
  patientIds: string[];
  reviewItems: ReviewItem[];
  onDecision: (encounterId: string, decision: 'True' | 'False' | 'Unclear', reason: string) => void;
};

const PAGE_SIZE = 25;

export function PatientReviewTab({ patientIds, reviewItems, onDecision }: Props) {
  const [search, setSearch] = useState('');
  const [llmFilter, setLlmFilter] = useState<'all' | 'Eligible' | 'Ineligible'>('all');
  const [decisionFilter, setDecisionFilter] = useState<'all' | 'pending' | 'decided'>('all');
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    return patientIds.map((pid) => {
      const ri = reviewItems.find((r) => r.patientId === pid);
      return {
        patientId: pid,
        encounterId: ri?.encounterId ?? `enc-${pid}`,
        llmEligibility: ri?.llmEligibility,
        llmReason: ri?.llmReason ?? '',
        evidenceSnips: ri?.evidenceSnips ?? [],
        decision: ri?.decision,
        reason: ri?.reason ?? '',
      };
    });
  }, [patientIds, reviewItems]);

  const filtered = useMemo(() => {
    let out = rows;
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((r) => r.patientId.toLowerCase().includes(q));
    }
    if (llmFilter !== 'all') out = out.filter((r) => r.llmEligibility === llmFilter);
    if (decisionFilter === 'pending') out = out.filter((r) => !r.decision);
    else if (decisionFilter === 'decided') out = out.filter((r) => !!r.decision);
    return out;
  }, [rows, search, llmFilter, decisionFilter]);

  const paged = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  if (patientIds.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        <Users className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p className="font-medium">No patients need review for this atom</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search patient ID..." className="pl-9 h-8 text-xs" />
        </div>
        <div className="flex rounded-lg border overflow-hidden">
          {(['all', 'Eligible', 'Ineligible'] as const).map((v) => (
            <button key={v} onClick={() => { setLlmFilter(v); setPage(0); }} className={`px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${llmFilter === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
              {v === 'all' ? 'All LLM' : v}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border overflow-hidden">
          {(['all', 'pending', 'decided'] as const).map((v) => (
            <button key={v} onClick={() => { setDecisionFilter(v); setPage(0); }} className={`px-2.5 py-1 text-[11px] font-semibold cursor-pointer capitalize ${decisionFilter === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
              {v === 'all' ? 'All Decisions' : v}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} patients</span>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-left">
              <th className="px-3 py-2 font-medium text-xs">Patient ID</th>
              <th className="px-3 py-2 font-medium text-xs">Encounter</th>
              <th className="px-3 py-2 font-medium text-xs">LLM Result</th>
              <th className="px-3 py-2 font-medium text-xs">LLM Reason</th>
              <th className="px-3 py-2 font-medium text-xs">Decision</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((r) => (
              <tr key={r.patientId} className="border-t hover:bg-muted/20">
                <td className="px-3 py-2 font-mono text-xs font-medium">{r.patientId}</td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.encounterId}</td>
                <td className="px-3 py-2">
                  {r.llmEligibility ? (
                    <Badge variant={r.llmEligibility === 'Eligible' ? 'success' : 'destructive'} className="text-[10px] px-1.5 py-0">
                      {r.llmEligibility}
                    </Badge>
                  ) : <span className="text-muted-foreground text-xs">—</span>}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate" title={r.llmReason}>{r.llmReason || '—'}</td>
                <td className="px-3 py-2">
                  <select
                    value={r.decision ?? ''}
                    onChange={(e) => {
                      const val = e.target.value as 'True' | 'False' | 'Unclear';
                      if (val) onDecision(r.encounterId, val, '');
                    }}
                    className={`rounded border px-2 py-1 text-xs cursor-pointer bg-background ${r.decision ? 'border-emerald-400' : 'border-amber-400'}`}
                  >
                    <option value="">Pending</option>
                    <option value="True">True</option>
                    <option value="False">False</option>
                    <option value="Unclear">Unclear</option>
                  </select>
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">No patients match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {page + 1} of {totalPages} · {filtered.length} patients</span>
          <div className="flex gap-1">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="rounded border px-2 py-1 disabled:opacity-40 cursor-pointer">Prev</button>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="rounded border px-2 py-1 disabled:opacity-40 cursor-pointer">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 8.2: Build & commit**

```bash
npm run build 2>&1 | grep "PatientReviewTab"
git add src/components/ct/PatientReviewTab.tsx
git commit -m "feat(ct): PatientReviewTab with inline decisions, filters, pagination"
```

---

## Task 9: CTAtomDetailPage — page shell with three tabs

**Files:**
- Create: `src/pages/CTAtomDetailPage.tsx`

- [ ] **Step 9.1: Implement CTAtomDetailPage**

Create `src/pages/CTAtomDetailPage.tsx`:
```tsx
import { useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { AtomMetadataHeader } from '@/components/ct/AtomMetadataHeader';
import { PromptConfigTab } from '@/components/ct/PromptConfigTab';
import { RunHistoryTab } from '@/components/ct/RunHistoryTab';
import { PatientReviewTab } from '@/components/ct/PatientReviewTab';
import { buildAtomRows, buildCriterionRows, type AtomRowData } from '@/components/vault/shared';
import { XCircle } from 'lucide-react';

type TabKey = 'prompt' | 'runs' | 'review';

export default function CTAtomDetailPage() {
  const { projectId, atomId } = useParams<{ projectId: string; atomId: string }>();
  const nav = useNavigate();
  const { projects, cohortImports, runs, reviewItems, criteria: appCriteria, saveDecision } = useAppContext();

  const project = projects.find((p) => p.id === projectId);
  const cohort = cohortImports.find((c) => c.id === project?.cohortImportId);

  const allAtoms = useMemo(() => cohort ? buildAtomRows(cohort) : [], [cohort]);
  const allCriteria = useMemo(() => cohort ? buildCriterionRows(cohort) : [], [cohort]);
  const atom = allAtoms.find((a) => a.id === atomId);
  const criterion = allCriteria.find((c) => c.id === atom?.parentCriterionId);

  const isStructured = atom?.dataSource === 'structured';
  const [activeTab, setActiveTab] = useState<TabKey>('prompt');

  // Prompt config state
  const existingCriterion = appCriteria.find((c) => c.name === atom?.parentCriterionName || c.id === atom?.parentCriterionId);
  const [keywords, setKeywords] = useState<string[]>(atom?.keywords ?? []);
  const [extractionPrompt, setExtractionPrompt] = useState(existingCriterion?.extractionPrompt ?? '');
  const [reasoningPrompt, setReasoningPrompt] = useState(existingCriterion?.reasoningPrompt ?? '');
  const [model, setModel] = useState(existingCriterion?.model ?? 'gpt-4o');

  // Runs for this criterion
  const atomRuns = useMemo(() => runs.filter((r) => r.criterionId === atom?.parentCriterionId || r.criterionId === criterion?.id), [runs, atom, criterion]);

  // Patient IDs needing review
  const patientsToReview = useMemo(() => {
    if (!cohort?.criteriaResults || !atomId) return [];
    for (const cr of cohort.criteriaResults) {
      const a = cr.atoms.find((at) => at.atom_id === atomId);
      if (a) return [...a.patient_list_no_unstructured, ...a.patient_list_unknown];
    }
    return [];
  }, [cohort, atomId]);

  // Review items for this atom's patients
  const atomReviewItems = useMemo(() => reviewItems.filter((ri) => ri.projectId === projectId && patientsToReview.includes(ri.patientId)), [reviewItems, projectId, patientsToReview]);
  const reviewedCount = atomReviewItems.filter((ri) => !!ri.decision).length;

  const handleDecision = useCallback((encounterId: string, decision: 'True' | 'False' | 'Unclear', reason: string) => {
    saveDecision({ encounterId, decision, reason });
  }, [saveDecision]);

  const handleRun = useCallback(() => {
    // Placeholder: in Sub-project C, this will create a proper RunConfig
    alert('Run started! (Run creation will be implemented in Sub-project C)');
  }, []);

  // Guard
  if (!project || !cohort || !atom || !criterion) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <XCircle className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Atom not found</p>
          <button onClick={() => nav(`/projects/${projectId}/ct-overview`)} className="mt-2 text-sm text-primary underline cursor-pointer">Back to Overview</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <AtomMetadataHeader
        atom={atom}
        criterion={criterion}
        allCriteria={allCriteria}
        projectId={projectId!}
        projectName={project.name}
        reviewedCount={reviewedCount}
        totalToReview={patientsToReview.length}
      />

      {/* Tabs — hidden for structured atoms */}
      {!isStructured && (
        <>
          <div className="flex border-b">
            {([
              { key: 'prompt' as TabKey, label: 'Prompt Config' },
              { key: 'runs' as TabKey, label: `Run History (${atomRuns.length})` },
              { key: 'review' as TabKey, label: `Patient Review (${patientsToReview.length})` },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium cursor-pointer border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'prompt' && (
            <PromptConfigTab
              keywords={keywords}
              onAddKeyword={(kw) => setKeywords((prev) => [...prev, kw])}
              onRemoveKeyword={(kw) => setKeywords((prev) => prev.filter((k) => k !== kw))}
              extractionPrompt={extractionPrompt}
              onExtractionPromptChange={setExtractionPrompt}
              reasoningPrompt={reasoningPrompt}
              onReasoningPromptChange={setReasoningPrompt}
              model={model}
              onModelChange={setModel}
              onRun={handleRun}
              runDisabled={keywords.length === 0}
            />
          )}

          {activeTab === 'runs' && <RunHistoryTab runs={atomRuns} />}

          {activeTab === 'review' && (
            <PatientReviewTab
              patientIds={patientsToReview}
              reviewItems={atomReviewItems}
              onDecision={handleDecision}
            />
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 9.2: Build**

Run: `npm run build 2>&1 | grep "CTAtomDetailPage"`
Expected: no errors.

- [ ] **Step 9.3: Commit**

```bash
git add src/pages/CTAtomDetailPage.tsx
git commit -m "feat(ct): CTAtomDetailPage with tabbed Prompt/Runs/Review sections"
```

---

## Task 10: Wire route into App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 10.1: Add import and route**

In `src/App.tsx`:

1. After the existing CT-related imports, add:
```tsx
import CTAtomDetailPage from '@/pages/CTAtomDetailPage';
```

2. Inside the `<Routes>` tree, after the `ct-criteria/:criterionId` route, add:
```tsx
<Route path="/projects/:projectId/ct-atom/:atomId" element={<CTAtomDetailPage />} />
```

- [ ] **Step 10.2: Build & commit**

```bash
npm run build 2>&1 | grep "App.tsx"
git add src/App.tsx
git commit -m "feat(ct): add /projects/:projectId/ct-atom/:atomId route"
```

---

## Task 11: Manual verification

**Files:** none

- [ ] **Step 11.1: Start dev server**

Run: `npm run dev`

- [ ] **Step 11.2: Verify three-level drill-down**

1. Navigate to any CT project's overview (e.g., `/projects/prj-07/ct-overview`)
2. Verify: criteria list with StatusRollup badges + progress fractions at project level
3. Click any criterion → lands on `/projects/prj-07/ct-criteria/<id>`
4. Verify: breadcrumb shows project status + criterion status, atoms grouped Unstructured/Structured
5. Click any unstructured atom → lands on `/projects/prj-07/ct-atom/<id>`
6. Verify: metadata header with breadcrumb status at all 3 levels, three tabs visible
7. Click a structured atom → verify auto-validated banner, no tabs

- [ ] **Step 11.3: Verify tab functionality**

On atom detail page:
1. Prompt Config tab: add/remove keywords, edit prompts, change model
2. Run History tab: shows "No runs yet" or existing runs
3. Patient Review tab: patient table with decision dropdowns, search, pagination

- [ ] **Step 11.4: Verify back navigation**

1. Browser back button works at each level
2. Breadcrumb links work (click project name → overview, click criterion → criterion detail)

- [ ] **Step 11.5: Run tests**

Run: `npm test && echo "ALL PASS"`
Expected: 26 tests pass (20 shared + 6 StatusRollup).

---

## Self-review

**Spec coverage:** Checked each section of the spec:
- Section 5 routes: ✓ Tasks 3, 4, 9, 10
- Section 6.1 StatusRollup: ✓ Task 2
- Section 6.2 CTOverviewPage: ✓ Task 3
- Section 6.3 CTCriterionDetailPage: ✓ Task 4
- Section 6.4 CTAtomDetailPage: ✓ Tasks 5-9
- Section 7 Status propagation: ✓ Tasks 2, 3, 4, 5
- Section 8 Edge cases: ✓ handled in each page (structured atom banner, empty states, redirects)
- Section 9 Testing: ✓ Task 2 (unit), Task 11 (integration/visual)

**Placeholder scan:** No TBDs. The `handleRun` function uses `alert()` as a deliberate stub per spec scope (Sub-project C owns run creation).

**Type consistency:** `AtomRowData.status`, `CriterionRowData.status`, and `StatusRollup.AtomStatus` all use the same union. `worstStatus` is imported consistently. `AtomRow.onClick` prop added in Task 1 used in Task 4.
