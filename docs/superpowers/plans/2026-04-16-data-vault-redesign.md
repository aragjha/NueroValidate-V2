# Data Vault Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline cohort preview with a dedicated Cohort Explorer page (`/vault/:cohortId`) that exposes Criteria / Atoms / Patients tab pivots over a cohort, with a segmented structured/unstructured control defaulting to Unstructured and URL-synced filters.

**Architecture:** Two-page split — `DataVaultPage` stays as the cohort library (minor update: row CTA now opens the explorer). New `CohortExplorerPage` owns the three-tab experience. All filter state lives in URL search params; components are stateless over that URL. One reusable `AtomRow` component powers atom display in all three tabs. Pure helpers in `shared.ts` are TDD'd with vitest; component behavior verified in the dev server.

**Tech Stack:** React 19, React Router 7 (`useSearchParams`), TypeScript, Tailwind 4, shadcn-style primitives already in repo, `lucide-react`, `vitest` (added in Task 1 for pure-function tests).

**Reference spec:** `docs/superpowers/specs/2026-04-15-data-vault-redesign-design.md`

---

## File structure

**Create:**
- `src/components/vault/shared.ts` — types (`TabKey`, `ViewMode`, `AtomStatus`, `FilterState`, `AtomRowData`, `CriterionRowData`), pure helpers (`buildAtomRows`, `buildCriterionRows`, `applyAtomFilters`, `applyCriterionFilters`, `applyPatientFilters`, `parseFilters`, `serializeFilters`, color/status maps).
- `src/components/vault/shared.test.ts` — vitest suite over the pure helpers.
- `src/components/vault/AtomRow.tsx` — two-line collapsed row, click-to-expand detail panel.
- `src/components/vault/ExplorerHeader.tsx` — breadcrumb, title, stats strip, create-project CTA.
- `src/components/vault/ExplorerFilterBar.tsx` — tab switcher + segmented control + search/category/status/sort controls; writes to URL.
- `src/components/vault/CriteriaTab.tsx` — criterion rows; expandable to grouped Structured/Unstructured atom sections.
- `src/components/vault/AtomsTab.tsx` — flat atom list.
- `src/components/vault/PatientsTab.tsx` — flat patient list with per-atom drill-down.
- `src/pages/CohortExplorerPage.tsx` — page shell; parses URL; renders header + filter bar + active tab.
- `vitest.config.ts` — vitest setup (pure-function tests only; no jsdom).

**Modify:**
- `package.json` — add `vitest` devDependency + `test` script.
- `src/App.tsx` — add route `/vault/:cohortId` → `CohortExplorerPage`.
- `src/pages/DataVaultPage.tsx` — replace inline expanded matrix preview with "Open Explorer →" button linking to the new route; keep Create CT Project CTA unchanged.

**Not modified** (by design — belongs to sub-projects B–E):
- `src/pages/CTOverviewPage.tsx`, `CTCriterionDetailPage.tsx`, `CTFunnelPage.tsx`, `CTMatrixPage.tsx`.
- `src/types.ts` — data model unchanged.
- `src/context/AppContext.tsx` — no new context state; we read `cohortImports` as today.

---

## Task 1: Add vitest for pure-function tests

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1.1: Install vitest**

Run:
```
cd "/Users/anurag/Desktop/Screenshots/Cursor Test for NeuroAudit"
npm install --save-dev vitest@^2
```
Expected: `vitest` appears under `devDependencies`; lockfile updated.

- [ ] **Step 1.2: Add `test` script to package.json**

Edit `package.json` `scripts` block, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```
Expected: new scripts alongside existing `dev/build/lint/preview`.

- [ ] **Step 1.3: Create `vitest.config.ts`**

Create `vitest.config.ts` at repo root:
```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```
Expected: no jsdom; test files match `.test.ts` only (we're not unit-testing React components, just pure helpers).

- [ ] **Step 1.4: Run tests to confirm setup**

Run: `npm test`
Expected: `No test files found, exiting with code 0` or similar (PASS — no tests yet).

- [ ] **Step 1.5: Commit**

```
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for pure-function tests (vault sub-project A)"
```

---

## Task 2: Types and URL helpers in `shared.ts`

**Files:**
- Create: `src/components/vault/shared.ts`
- Create: `src/components/vault/shared.test.ts`

- [ ] **Step 2.1: Write failing tests for `parseFilters` / `serializeFilters`**

Create `src/components/vault/shared.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseFilters, serializeFilters, DEFAULT_FILTERS } from './shared';

describe('parseFilters', () => {
  it('returns defaults when no params are present', () => {
    const params = new URLSearchParams();
    expect(parseFilters(params)).toEqual(DEFAULT_FILTERS);
  });

  it('parses tab, view, and multi-value cat/status', () => {
    const params = new URLSearchParams('tab=atoms&view=structured&cat=Labs,Imaging&status=in-progress,validated&q=age&sort=name&expanded=r1');
    expect(parseFilters(params)).toEqual({
      tab: 'atoms',
      view: 'structured',
      cat: ['Labs', 'Imaging'],
      status: ['in-progress', 'validated'],
      q: 'age',
      sort: 'name',
      expanded: 'r1',
    });
  });

  it('falls back to defaults for unknown values', () => {
    const params = new URLSearchParams('tab=garbage&view=also-garbage&sort=nope');
    const f = parseFilters(params);
    expect(f.tab).toBe('criteria');
    expect(f.view).toBe('unstructured');
    expect(f.sort).toBe('default');
  });
});

describe('serializeFilters', () => {
  it('omits default values so URLs stay clean', () => {
    const s = serializeFilters(DEFAULT_FILTERS);
    expect(s.toString()).toBe('');
  });

  it('serializes non-default values only', () => {
    const s = serializeFilters({ ...DEFAULT_FILTERS, tab: 'atoms', cat: ['Labs'], q: 'age' });
    expect(s.get('tab')).toBe('atoms');
    expect(s.get('cat')).toBe('Labs');
    expect(s.get('q')).toBe('age');
    expect(s.get('view')).toBeNull();
  });

  it('round-trips through parse', () => {
    const original = { tab: 'patients', view: 'eligible', cat: ['Meds'], status: ['validated'], q: '', sort: 'pending', expanded: null } as const;
    const parsed = parseFilters(serializeFilters(original));
    expect(parsed).toEqual(original);
  });
});
```

- [ ] **Step 2.2: Run tests to confirm they fail**

Run: `npm test`
Expected: FAIL — module `./shared` not found.

- [ ] **Step 2.3: Implement types and URL helpers in `shared.ts`**

Create `src/components/vault/shared.ts`:
```ts
import type { CohortImport, CohortCriterion, CohortAtomResult, CriterionAtom } from '@/types';

/* ─── Types ─── */

export type TabKey = 'criteria' | 'atoms' | 'patients';
export type ViewMode =
  | 'all' | 'structured' | 'unstructured' | 'mixed'
  | 'eligible' | 'ineligible' | 'needs-review';
export type AtomStatus = 'auto-validated' | 'needs-config' | 'in-progress' | 'validated';
export type SortMode = 'default' | 'name' | 'pending' | 'yes';

export type FilterState = {
  tab: TabKey;
  view: ViewMode;
  cat: string[];
  status: string[];
  q: string;
  sort: SortMode;
  expanded: string | null;
};

export const DEFAULT_FILTERS: FilterState = {
  tab: 'criteria',
  view: 'unstructured',
  cat: [],
  status: [],
  q: '',
  sort: 'default',
  expanded: null,
};

const VALID_TABS: readonly TabKey[] = ['criteria', 'atoms', 'patients'] as const;
const VALID_VIEWS: readonly ViewMode[] = [
  'all', 'structured', 'unstructured', 'mixed',
  'eligible', 'ineligible', 'needs-review',
] as const;
const VALID_SORTS: readonly SortMode[] = ['default', 'name', 'pending', 'yes'] as const;

/* ─── URL param helpers ─── */

export function parseFilters(params: URLSearchParams): FilterState {
  const tab = params.get('tab') as TabKey | null;
  const view = params.get('view') as ViewMode | null;
  const sort = params.get('sort') as SortMode | null;
  return {
    tab: tab && VALID_TABS.includes(tab) ? tab : DEFAULT_FILTERS.tab,
    view: view && VALID_VIEWS.includes(view) ? view : DEFAULT_FILTERS.view,
    cat: (params.get('cat') ?? '').split(',').filter(Boolean),
    status: (params.get('status') ?? '').split(',').filter(Boolean),
    q: params.get('q') ?? '',
    sort: sort && VALID_SORTS.includes(sort) ? sort : DEFAULT_FILTERS.sort,
    expanded: params.get('expanded'),
  };
}

export function serializeFilters(f: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (f.tab !== DEFAULT_FILTERS.tab) params.set('tab', f.tab);
  if (f.view !== DEFAULT_FILTERS.view) params.set('view', f.view);
  if (f.cat.length) params.set('cat', f.cat.join(','));
  if (f.status.length) params.set('status', f.status.join(','));
  if (f.q) params.set('q', f.q);
  if (f.sort !== DEFAULT_FILTERS.sort) params.set('sort', f.sort);
  if (f.expanded) params.set('expanded', f.expanded);
  return params;
}

/* ─── Row data shapes (filled in later tasks) ─── */

export type AtomRowData = {
  id: string;
  parentCriterionId: string;
  parentCriterionIndex: number;
  parentCriterionName: string;
  parentCriterionType: 'inclusion' | 'exclusion';
  atomIndex: number;
  atomTotal: number;
  label: string;
  category: string;
  dataSource: 'structured' | 'unstructured';
  conceptLabel?: string;
  operator?: string;
  polarity?: string;
  yes: number;
  no: number;
  unknown: number;
  noStructured: number;
  noUnstructured: number;
  gcpPaths: string[];
  status: AtomStatus;
};

export type CriterionRowData = {
  id: string;
  index: number;
  name: string;
  type: 'inclusion' | 'exclusion';
  category: string;
  atoms: AtomRowData[];
  structuredAtoms: AtomRowData[];
  unstructuredAtoms: AtomRowData[];
  mixedness: 'all-structured' | 'all-unstructured' | 'mixed';
  status: AtomStatus;
  pctComplete: number;
};

/* ─── Color map for the structured/unstructured distinction ─── */

export const DATA_SOURCE_COLOR = {
  structured: { dot: 'bg-blue-500', ring: 'ring-blue-400/30', tint: 'bg-blue-50/40 dark:bg-blue-950/20' },
  unstructured: { dot: 'bg-amber-500', ring: 'ring-amber-400/30', tint: 'bg-amber-50/40 dark:bg-amber-950/20' },
  mixed: { dot: 'bg-gradient-to-r from-blue-500 to-amber-500', ring: 'ring-purple-400/30', tint: 'bg-purple-50/30 dark:bg-purple-950/15' },
} as const;

/* ─── Placeholder exports used by later tasks ─── */

export function buildAtomRows(_cohort: CohortImport): AtomRowData[] { return []; }
export function buildCriterionRows(_cohort: CohortImport): CriterionRowData[] { return []; }
export function atomStatus(_atom: CohortAtomResult | CriterionAtom): AtomStatus { return 'needs-config'; }
```

- [ ] **Step 2.4: Run tests to confirm they pass**

Run: `npm test`
Expected: PASS — 6 tests green (3 parse + 3 serialize).

- [ ] **Step 2.5: Commit**

```
git add src/components/vault/shared.ts src/components/vault/shared.test.ts
git commit -m "feat(vault): filter state types + URL round-trip helpers"
```

---

## Task 3: `buildAtomRows` and `atomStatus` — flatten cohort data into atom rows

**Files:**
- Modify: `src/components/vault/shared.ts`
- Modify: `src/components/vault/shared.test.ts`

- [ ] **Step 3.1: Add failing tests for `atomStatus` and `buildAtomRows`**

Append to `src/components/vault/shared.test.ts`:
```ts
import { atomStatus, buildAtomRows } from './shared';
import type { CohortImport, CohortAtomResult } from '@/types';

function mockAtom(overrides: Partial<CohortAtomResult> = {}): CohortAtomResult {
  return {
    atom_id: 'a1', parent_criterion_id: 'c1', evaluation_scope: 'encounter',
    metadata: { concept_label: 'age', operator: 'gte', polarity: 'positive', primary_category: 'Demographics' },
    patient_count_yes: 100, patient_count_no: 20, patient_count_unknown: 0,
    patient_list_yes: Array.from({ length: 100 }, (_, i) => `p${i}`),
    patient_list_no: Array.from({ length: 20 }, (_, i) => `n${i}`),
    patient_list_unknown: [],
    patient_list_no_structured: Array.from({ length: 20 }, (_, i) => `n${i}`),
    patient_list_no_unstructured: [],
    patient_list_no_unstructured_gcp_path: [],
    error: null,
    ...overrides,
  };
}

describe('atomStatus', () => {
  it('returns auto-validated when no unstructured/no and no unknown', () => {
    expect(atomStatus(mockAtom())).toBe('auto-validated');
  });
  it('returns needs-config when unstructured/no or unknowns exist and no keywords', () => {
    const a = mockAtom({ patient_list_no_unstructured: ['n0'], patient_list_unknown: ['u0'] });
    expect(atomStatus(a)).toBe('needs-config');
  });
  it('returns in-progress when keywords configured and work remains', () => {
    const a = mockAtom({ patient_list_no_unstructured: ['n0'], keywords: ['cancer'] });
    expect(atomStatus(a)).toBe('in-progress');
  });
});

describe('buildAtomRows', () => {
  it('produces flat rows from criteriaResults with correct counts', () => {
    const cohort = {
      id: 'k1', name: 'Trial', source: 'NeuroTerminal', importedAt: '', importedBy: 'u',
      status: 'Active', criteria: [
        { id: 'c1', name: 'Age', type: 'inclusion', description: '', atoms: [], atomLogic: 'AND', category: 'Demographics' },
      ],
      patients: [],
      criteriaResults: [{ criterion_id: 'c1', atom_ids: ['a1'], atoms: [mockAtom()] }],
      metadata: { totalPatients: 120, eligibleCount: 0, ineligibleCount: 0 },
    } as unknown as CohortImport;
    const rows = buildAtomRows(cohort);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'a1', parentCriterionId: 'c1', parentCriterionIndex: 1, parentCriterionName: 'Age',
      atomIndex: 1, atomTotal: 1, label: 'age', category: 'Demographics', dataSource: 'structured',
      yes: 100, no: 20, unknown: 0, noStructured: 20, noUnstructured: 0, status: 'auto-validated',
    });
  });

  it('falls back to display-layer atoms when criteriaResults is absent', () => {
    const cohort = {
      id: 'k1', name: 'T', source: 'Manual', importedAt: '', importedBy: 'u', status: 'Active',
      criteria: [{
        id: 'c1', name: 'Age', type: 'inclusion', description: '', atomLogic: 'AND', category: 'Demographics',
        atoms: [{ id: 'c1-a1', label: 'age', structuredExpression: 'age>=65', dataSource: 'structured' }],
      }],
      patients: [], metadata: { totalPatients: 0, eligibleCount: 0, ineligibleCount: 0 },
    } as unknown as CohortImport;
    const rows = buildAtomRows(cohort);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('c1-a1');
    expect(rows[0].dataSource).toBe('structured');
  });
});
```

- [ ] **Step 3.2: Run to confirm failure**

Run: `npm test`
Expected: 5 new tests fail (placeholder implementations).

- [ ] **Step 3.3: Implement `atomStatus` and `buildAtomRows`**

In `src/components/vault/shared.ts`, replace the placeholder `atomStatus` and `buildAtomRows` with:
```ts
function isRealAtom(a: CohortAtomResult | CriterionAtom): a is CohortAtomResult {
  return 'patient_list_yes' in a;
}

export function atomStatus(a: CohortAtomResult | CriterionAtom): AtomStatus {
  if (!isRealAtom(a)) {
    return a.dataSource === 'structured' ? 'auto-validated' : 'needs-config';
  }
  const needsReview = a.patient_list_no_unstructured.length > 0 || a.patient_list_unknown.length > 0;
  if (!needsReview) return 'auto-validated';
  if (!a.keywords || a.keywords.length === 0) return 'needs-config';
  return 'in-progress';
}

function dataSourceForReal(a: CohortAtomResult): 'structured' | 'unstructured' {
  const needsLlm = a.patient_list_no_unstructured.length > 0 || a.patient_list_unknown.length > 0;
  return needsLlm ? 'unstructured' : 'structured';
}

export function buildAtomRows(cohort: CohortImport): AtomRowData[] {
  const rows: AtomRowData[] = [];
  const hasReal = !!cohort.criteriaResults?.length;

  if (hasReal) {
    cohort.criteriaResults!.forEach((cr, crIdx) => {
      const displayCr = cohort.criteria.find((c) => c.id === cr.criterion_id) ?? cohort.criteria[crIdx];
      cr.atoms.forEach((atom, aIdx) => {
        rows.push({
          id: atom.atom_id,
          parentCriterionId: cr.criterion_id,
          parentCriterionIndex: crIdx + 1,
          parentCriterionName: displayCr?.name ?? cr.criterion_id,
          parentCriterionType: displayCr?.type ?? 'inclusion',
          atomIndex: aIdx + 1,
          atomTotal: cr.atoms.length,
          label: atom.metadata.concept_label,
          category: atom.metadata.primary_category || 'Clinical',
          dataSource: dataSourceForReal(atom),
          conceptLabel: atom.metadata.concept_label,
          operator: atom.metadata.operator,
          polarity: atom.metadata.polarity,
          yes: atom.patient_list_yes.length,
          no: atom.patient_list_no.length,
          unknown: atom.patient_list_unknown.length,
          noStructured: atom.patient_list_no_structured.length,
          noUnstructured: atom.patient_list_no_unstructured.length,
          gcpPaths: atom.patient_list_no_unstructured_gcp_path ?? [],
          status: atomStatus(atom),
        });
      });
    });
    return rows;
  }

  cohort.criteria.forEach((cr, crIdx) => {
    cr.atoms.forEach((atom, aIdx) => {
      rows.push({
        id: atom.id,
        parentCriterionId: cr.id,
        parentCriterionIndex: crIdx + 1,
        parentCriterionName: cr.name,
        parentCriterionType: cr.type,
        atomIndex: aIdx + 1,
        atomTotal: cr.atoms.length,
        label: atom.label,
        category: cr.category || 'Clinical',
        dataSource: atom.dataSource,
        yes: 0, no: 0, unknown: 0, noStructured: 0, noUnstructured: 0, gcpPaths: [],
        status: atomStatus(atom),
      });
    });
  });
  return rows;
}
```

- [ ] **Step 3.4: Run tests**

Run: `npm test`
Expected: 11 tests pass (6 URL + 3 status + 2 buildAtomRows).

- [ ] **Step 3.5: Commit**

```
git add src/components/vault/shared.ts src/components/vault/shared.test.ts
git commit -m "feat(vault): buildAtomRows + atomStatus with real & fallback data"
```

---

## Task 4: `buildCriterionRows` — group atoms per criterion

**Files:**
- Modify: `src/components/vault/shared.ts`
- Modify: `src/components/vault/shared.test.ts`

- [ ] **Step 4.1: Add failing test**

Append to `shared.test.ts`:
```ts
import { buildCriterionRows } from './shared';

describe('buildCriterionRows', () => {
  it('produces one row per criterion with structured/unstructured split and mixedness', () => {
    const cohort = {
      id: 'k1', name: 'T', source: 'NeuroTerminal', importedAt: '', importedBy: 'u', status: 'Active',
      criteria: [
        { id: 'c1', name: 'Age', type: 'inclusion', description: '', atoms: [], atomLogic: 'AND', category: 'Demographics' },
        { id: 'c2', name: 'Dx', type: 'inclusion', description: '', atoms: [], atomLogic: 'AND', category: 'Diagnosis' },
      ],
      patients: [], metadata: { totalPatients: 0, eligibleCount: 0, ineligibleCount: 0 },
      criteriaResults: [
        { criterion_id: 'c1', atom_ids: ['a1'], atoms: [mockAtom({ atom_id: 'a1' })] },
        { criterion_id: 'c2', atom_ids: ['a2', 'a3'], atoms: [
          mockAtom({ atom_id: 'a2', patient_list_no_unstructured: ['n1'] }),
          mockAtom({ atom_id: 'a3' }),
        ]},
      ],
    } as unknown as CohortImport;
    const rows = buildCriterionRows(cohort);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 'c1', index: 1, name: 'Age', mixedness: 'all-structured' });
    expect(rows[0].atoms).toHaveLength(1);
    expect(rows[1]).toMatchObject({ id: 'c2', index: 2, name: 'Dx', mixedness: 'mixed' });
    expect(rows[1].structuredAtoms).toHaveLength(1);
    expect(rows[1].unstructuredAtoms).toHaveLength(1);
  });
});
```

- [ ] **Step 4.2: Run — expect fail**

Run: `npm test`
Expected: new test fails (still placeholder).

- [ ] **Step 4.3: Implement `buildCriterionRows`**

Replace the placeholder `buildCriterionRows` in `shared.ts` with:
```ts
function criterionMixedness(atoms: AtomRowData[]): CriterionRowData['mixedness'] {
  const hasStr = atoms.some((a) => a.dataSource === 'structured');
  const hasUnstr = atoms.some((a) => a.dataSource === 'unstructured');
  if (hasStr && hasUnstr) return 'mixed';
  return hasUnstr ? 'all-unstructured' : 'all-structured';
}

function rollupCriterionStatus(atoms: AtomRowData[]): AtomStatus {
  if (atoms.length === 0) return 'needs-config';
  if (atoms.every((a) => a.status === 'auto-validated')) return 'auto-validated';
  if (atoms.every((a) => a.status === 'auto-validated' || a.status === 'validated')) return 'validated';
  if (atoms.some((a) => a.status === 'in-progress' || a.status === 'validated')) return 'in-progress';
  return 'needs-config';
}

export function buildCriterionRows(cohort: CohortImport): CriterionRowData[] {
  const allAtoms = buildAtomRows(cohort);
  const byCriterion = new Map<string, AtomRowData[]>();
  for (const atom of allAtoms) {
    const list = byCriterion.get(atom.parentCriterionId) ?? [];
    list.push(atom);
    byCriterion.set(atom.parentCriterionId, list);
  }

  return cohort.criteria.map((cr, idx) => {
    const atoms = byCriterion.get(cr.id) ?? [];
    const structuredAtoms = atoms.filter((a) => a.dataSource === 'structured');
    const unstructuredAtoms = atoms.filter((a) => a.dataSource === 'unstructured');
    const status = rollupCriterionStatus(atoms);
    const pctComplete = atoms.length === 0 ? 0 : Math.round(
      (atoms.filter((a) => a.status === 'auto-validated' || a.status === 'validated').length / atoms.length) * 100,
    );
    return {
      id: cr.id,
      index: idx + 1,
      name: cr.name,
      type: cr.type,
      category: cr.category || atoms[0]?.category || 'Clinical',
      atoms,
      structuredAtoms,
      unstructuredAtoms,
      mixedness: criterionMixedness(atoms),
      status,
      pctComplete,
    };
  });
}
```

- [ ] **Step 4.4: Run tests**

Run: `npm test`
Expected: all 12 tests pass.

- [ ] **Step 4.5: Commit**

```
git add src/components/vault/shared.ts src/components/vault/shared.test.ts
git commit -m "feat(vault): buildCriterionRows with structured/unstructured split"
```

---

## Task 5: `applyAtomFilters` / `applyCriterionFilters` / `applyPatientFilters`

**Files:**
- Modify: `src/components/vault/shared.ts`
- Modify: `src/components/vault/shared.test.ts`

- [ ] **Step 5.1: Add failing tests**

Append:
```ts
import { applyAtomFilters, applyCriterionFilters, DEFAULT_FILTERS } from './shared';

const atomA = { id: 'a', parentCriterionId: 'c1', parentCriterionIndex: 1, parentCriterionName: 'Age',
  parentCriterionType: 'inclusion' as const, atomIndex: 1, atomTotal: 1, label: 'age>=65',
  category: 'Demographics', dataSource: 'structured' as const, yes: 100, no: 0, unknown: 0,
  noStructured: 0, noUnstructured: 0, gcpPaths: [], status: 'auto-validated' as const };
const atomB = { ...atomA, id: 'b', parentCriterionId: 'c2', parentCriterionIndex: 2, parentCriterionName: 'Dx',
  label: 'AD diagnosis', category: 'Diagnosis', dataSource: 'unstructured' as const,
  no: 50, noUnstructured: 30, unknown: 20, status: 'needs-config' as const };

describe('applyAtomFilters', () => {
  it('view=unstructured keeps only unstructured atoms', () => {
    const f = { ...DEFAULT_FILTERS, tab: 'atoms' as const, view: 'unstructured' as const };
    expect(applyAtomFilters([atomA, atomB], f)).toEqual([atomB]);
  });
  it('cat filter is multi-select OR', () => {
    const f = { ...DEFAULT_FILTERS, tab: 'atoms' as const, view: 'all' as const, cat: ['Diagnosis'] };
    expect(applyAtomFilters([atomA, atomB], f).map((a) => a.id)).toEqual(['b']);
  });
  it('q search matches label, parentCriterionName, or category', () => {
    const f = { ...DEFAULT_FILTERS, tab: 'atoms' as const, view: 'all' as const, q: 'diag' };
    expect(applyAtomFilters([atomA, atomB], f).map((a) => a.id)).toEqual(['b']);
  });
  it('sort=name sorts by label', () => {
    const f = { ...DEFAULT_FILTERS, tab: 'atoms' as const, view: 'all' as const, sort: 'name' as const };
    expect(applyAtomFilters([atomA, atomB], f).map((a) => a.id)).toEqual(['b', 'a']);
  });
});

describe('applyCriterionFilters', () => {
  const crStr = { id: 'c1', index: 1, name: 'Age', type: 'inclusion' as const, category: 'Demographics',
    atoms: [atomA], structuredAtoms: [atomA], unstructuredAtoms: [], mixedness: 'all-structured' as const,
    status: 'auto-validated' as const, pctComplete: 100 };
  const crUnstr = { ...crStr, id: 'c2', index: 2, name: 'Dx', category: 'Diagnosis',
    atoms: [atomB], structuredAtoms: [], unstructuredAtoms: [atomB], mixedness: 'all-unstructured' as const,
    status: 'needs-config' as const, pctComplete: 0 };

  it('view=unstructured keeps criteria with unstructured atoms', () => {
    const f = { ...DEFAULT_FILTERS, view: 'unstructured' as const };
    expect(applyCriterionFilters([crStr, crUnstr], f).map((c) => c.id)).toEqual(['c2']);
  });
  it('view=structured keeps criteria where all atoms are structured', () => {
    const f = { ...DEFAULT_FILTERS, view: 'structured' as const };
    expect(applyCriterionFilters([crStr, crUnstr], f).map((c) => c.id)).toEqual(['c1']);
  });
});
```

- [ ] **Step 5.2: Run — expect fail**

Run: `npm test`
Expected: 6 new failures (functions not exported).

- [ ] **Step 5.3: Implement filter functions**

Append to `src/components/vault/shared.ts`:
```ts
function matchesQuery(row: AtomRowData, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [row.label, row.parentCriterionName, row.parentCriterionId, row.category, row.conceptLabel ?? '']
    .some((s) => s.toLowerCase().includes(needle));
}

export function applyAtomFilters(rows: AtomRowData[], f: FilterState): AtomRowData[] {
  let out = rows;
  if (f.view === 'structured') out = out.filter((r) => r.dataSource === 'structured');
  else if (f.view === 'unstructured') out = out.filter((r) => r.dataSource === 'unstructured');
  if (f.cat.length) out = out.filter((r) => f.cat.includes(r.category));
  if (f.status.length) out = out.filter((r) => f.status.includes(r.status));
  if (f.q) out = out.filter((r) => matchesQuery(r, f.q));
  if (f.sort === 'name') out = [...out].sort((a, b) => a.label.localeCompare(b.label));
  else if (f.sort === 'pending') out = [...out].sort((a, b) => (b.noUnstructured + b.unknown) - (a.noUnstructured + a.unknown));
  else if (f.sort === 'yes') out = [...out].sort((a, b) => b.yes - a.yes);
  return out;
}

export function applyCriterionFilters(rows: CriterionRowData[], f: FilterState): CriterionRowData[] {
  let out = rows;
  if (f.view === 'structured') out = out.filter((r) => r.mixedness === 'all-structured');
  else if (f.view === 'unstructured') out = out.filter((r) => r.unstructuredAtoms.length > 0);
  else if (f.view === 'mixed') out = out.filter((r) => r.mixedness === 'mixed');
  if (f.cat.length) out = out.filter((r) => f.cat.includes(r.category));
  if (f.status.length) out = out.filter((r) => f.status.includes(r.status));
  if (f.q) {
    const needle = f.q.toLowerCase();
    out = out.filter((r) =>
      r.name.toLowerCase().includes(needle) ||
      r.id.toLowerCase().includes(needle) ||
      r.category.toLowerCase().includes(needle) ||
      r.atoms.some((a) => matchesQuery(a, f.q)),
    );
  }
  if (f.sort === 'name') out = [...out].sort((a, b) => a.name.localeCompare(b.name));
  else if (f.sort === 'pending') out = [...out].sort((a, b) =>
    b.unstructuredAtoms.reduce((s, x) => s + x.noUnstructured + x.unknown, 0)
    - a.unstructuredAtoms.reduce((s, x) => s + x.noUnstructured + x.unknown, 0),
  );
  return out;
}

export type PatientRowData = {
  patientId: string;
  eligible: boolean;
  reviewed: boolean;
  passByCriterion: { criterionId: string; criterionName: string; pass: boolean }[];
};

export function buildPatientRows(cohort: CohortImport): PatientRowData[] {
  return cohort.patients.map((p) => ({
    patientId: p.patientId,
    eligible: p.overrideEligible ?? p.eligible,
    reviewed: !!p.reviewedBy,
    passByCriterion: cohort.criteria.map((cr) => {
      const flag = p.flags.find((f) => f.criterionId === cr.id);
      const val = flag?.override !== undefined ? flag.override : flag?.value ?? false;
      const pass = cr.type === 'inclusion' ? val : !val;
      return { criterionId: cr.id, criterionName: cr.name, pass };
    }),
  }));
}

export function applyPatientFilters(rows: PatientRowData[], f: FilterState): PatientRowData[] {
  let out = rows;
  if (f.view === 'eligible') out = out.filter((r) => r.eligible);
  else if (f.view === 'ineligible') out = out.filter((r) => !r.eligible);
  else if (f.view === 'needs-review') out = out.filter((r) => !r.reviewed);
  if (f.q) out = out.filter((r) => r.patientId.toLowerCase().includes(f.q.toLowerCase()));
  return out;
}
```

- [ ] **Step 5.4: Run tests**

Run: `npm test`
Expected: all tests pass (18 total).

- [ ] **Step 5.5: Commit**

```
git add src/components/vault/shared.ts src/components/vault/shared.test.ts
git commit -m "feat(vault): applyAtomFilters, applyCriterionFilters, applyPatientFilters + buildPatientRows"
```

---

## Task 6: `AtomRow` component — collapsed & expanded states

**Files:**
- Create: `src/components/vault/AtomRow.tsx`

- [ ] **Step 6.1: Implement `AtomRow`**

Create `src/components/vault/AtomRow.tsx`:
```tsx
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, FileText, Settings2 } from 'lucide-react';
import type { AtomRowData } from './shared';

const STATUS_STYLES: Record<AtomRowData['status'], { dot: string; label: string; tone: string }> = {
  'auto-validated': { dot: 'bg-emerald-500', label: 'Auto-validated', tone: 'text-emerald-600' },
  'needs-config':   { dot: 'bg-amber-500',   label: 'Needs config',   tone: 'text-amber-600' },
  'in-progress':    { dot: 'bg-blue-500',    label: 'In progress',    tone: 'text-blue-600' },
  'validated':      { dot: 'bg-emerald-500', label: 'Validated',      tone: 'text-emerald-600' },
};

function MiniBar({ yes, no, unknown }: { yes: number; no: number; unknown: number }) {
  const total = yes + no + unknown || 1;
  const title = `Yes: ${yes} · No: ${no} · Unknown: ${unknown}`;
  return (
    <div title={title} className="flex h-1.5 w-28 overflow-hidden rounded-full bg-muted" role="img" aria-label={title}>
      <span className="h-full bg-emerald-500" style={{ width: `${(yes / total) * 100}%` }} />
      <span className="h-full bg-slate-400" style={{ width: `${(no / total) * 100}%` }} />
      <span className="h-full bg-amber-500" style={{ width: `${(unknown / total) * 100}%` }} />
    </div>
  );
}

export function AtomRow({ row, defaultExpanded = false }: { row: AtomRowData; defaultExpanded?: boolean }) {
  const [open, setOpen] = useState(defaultExpanded);
  const isStructured = row.dataSource === 'structured';
  const status = STATUS_STYLES[row.status];
  const pendingCount = row.noUnstructured + row.unknown;

  return (
    <div className={`rounded-lg border ${isStructured ? 'border-blue-200/60 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/10' : 'border-amber-200/60 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/10'}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full px-3 py-2.5 text-left cursor-pointer hover:bg-muted/30 transition-colors rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {/* Line 1: identity */}
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-sm shrink-0 ${isStructured ? 'bg-blue-500' : 'bg-amber-500'}`} aria-hidden />
          <Badge variant={row.parentCriterionType === 'inclusion' ? 'success' : 'destructive'} className="text-[9px] px-1.5 py-0">
            {row.parentCriterionType === 'inclusion' ? 'INC' : 'EXC'}
          </Badge>
          <span className="text-sm font-semibold truncate">{row.label}</span>
          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0">{row.category}</Badge>
          <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
            C{row.parentCriterionIndex} · atom {row.atomIndex}/{row.atomTotal}
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
        {/* Line 2: stats + status */}
        <div className="flex items-center gap-3 mt-1.5 text-[11px]">
          <span className="text-muted-foreground">Yes <b className="text-foreground tabular-nums">{row.yes.toLocaleString()}</b></span>
          <span className="text-muted-foreground">No <b className="text-foreground tabular-nums">{row.no.toLocaleString()}</b></span>
          <span className="text-muted-foreground">Unknown <b className="text-foreground tabular-nums">{row.unknown.toLocaleString()}</b></span>
          <MiniBar yes={row.yes} no={row.no} unknown={row.unknown} />
          <span className={`ml-auto inline-flex items-center gap-1.5 ${status.tone}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden />
            <span className="font-semibold">{status.label}</span>
            {pendingCount > 0 && row.status !== 'auto-validated' && (
              <span className="text-muted-foreground">· {pendingCount.toLocaleString()} pending</span>
            )}
          </span>
        </div>
      </button>

      {open && (
        <div className="border-t px-3 py-3 space-y-3 text-xs">
          {(row.conceptLabel || row.operator) && (
            <div className="font-mono text-[11px] text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
              {row.conceptLabel && <span>concept: <span className="text-foreground">{row.conceptLabel}</span></span>}
              {row.operator && <span className="ml-3">op: <span className="text-foreground">{row.operator}</span></span>}
              {row.polarity && <span className="ml-3">polarity: <span className="text-foreground">{row.polarity}</span></span>}
            </div>
          )}

          {!isStructured && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded border p-2">
                <div className="text-[10px] uppercase text-muted-foreground font-semibold">No — Structured</div>
                <div className="text-sm font-bold tabular-nums">{row.noStructured.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">No action needed</div>
              </div>
              <div className="rounded border p-2 bg-amber-50/50 dark:bg-amber-950/10">
                <div className="text-[10px] uppercase text-amber-700 dark:text-amber-400 font-semibold">No — Unstructured</div>
                <div className="text-sm font-bold tabular-nums">{row.noUnstructured.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">Needs LLM extraction + review</div>
              </div>
              <div className="rounded border p-2 bg-amber-50/50 dark:bg-amber-950/10">
                <div className="text-[10px] uppercase text-amber-700 dark:text-amber-400 font-semibold">Unknown</div>
                <div className="text-sm font-bold tabular-nums">{row.unknown.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">Always needs review</div>
              </div>
              <div className="rounded border p-2 bg-primary/5">
                <div className="text-[10px] uppercase text-primary font-semibold">Reviewer attention</div>
                <div className="text-sm font-bold tabular-nums">{pendingCount.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">patients require review</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            {row.gcpPaths.length > 0 && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <FileText className="h-3 w-3" /> {row.gcpPaths.length} evidence file{row.gcpPaths.length !== 1 ? 's' : ''}
              </span>
            )}
            <span className="ml-auto">
              {isStructured ? (
                <span className="text-muted-foreground italic">Auto-validated · no config needed</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-primary font-semibold cursor-pointer">
                  <Settings2 className="h-3 w-3" /> Configure prompt →
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6.2: Build project to catch type errors**

Run: `npm run build`
Expected: tsc succeeds; vite emits build. If `ChevronDown`/`FileText`/`Settings2` missing from `lucide-react`, fix imports.

- [ ] **Step 6.3: Commit**

```
git add src/components/vault/AtomRow.tsx
git commit -m "feat(vault): AtomRow component with collapsed two-line + expanded detail"
```

---

## Task 7: `ExplorerFilterBar` — tabs, segmented control, search, dropdowns

**Files:**
- Create: `src/components/vault/ExplorerFilterBar.tsx`

- [ ] **Step 7.1: Implement the filter bar**

Create `src/components/vault/ExplorerFilterBar.tsx`:
```tsx
import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Search, XCircle } from 'lucide-react';
import type { FilterState, TabKey, ViewMode, SortMode } from './shared';
import { DEFAULT_FILTERS } from './shared';

type Counts = {
  criteria: { total: number; structured: number; unstructured: number; mixed: number };
  atoms: { total: number; structured: number; unstructured: number };
  patients: { total: number; eligible: number; ineligible: number; needsReview: number };
};

type Props = {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  counts: Counts;
  categories: string[];
};

const SORT_LABEL: Record<SortMode, string> = {
  default: 'Default',
  name: 'Name A→Z',
  pending: 'Pending desc',
  yes: 'Yes count desc',
};

export function ExplorerFilterBar({ filters, onChange, counts, categories }: Props) {
  const update = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  const tabCounts: Record<TabKey, number> = {
    criteria: counts.criteria.total,
    atoms: counts.atoms.total,
    patients: counts.patients.total,
  };

  const segments = useMemo<{ value: ViewMode; label: string; count: number }[]>(() => {
    if (filters.tab === 'patients') {
      return [
        { value: 'all',          label: 'All',           count: counts.patients.total },
        { value: 'eligible',     label: 'Eligible',      count: counts.patients.eligible },
        { value: 'ineligible',   label: 'Ineligible',    count: counts.patients.ineligible },
        { value: 'needs-review', label: 'Needs review',  count: counts.patients.needsReview },
      ];
    }
    if (filters.tab === 'atoms') {
      return [
        { value: 'all',          label: 'All',          count: counts.atoms.total },
        { value: 'structured',   label: 'Structured',   count: counts.atoms.structured },
        { value: 'unstructured', label: 'Unstructured', count: counts.atoms.unstructured },
      ];
    }
    return [
      { value: 'all',          label: 'All',          count: counts.criteria.total },
      { value: 'structured',   label: 'Structured',   count: counts.criteria.structured },
      { value: 'unstructured', label: 'Unstructured', count: counts.criteria.unstructured },
      { value: 'mixed',        label: 'Mixed',        count: counts.criteria.mixed },
    ];
  }, [filters.tab, counts]);

  const hasActive =
    filters.view !== DEFAULT_FILTERS.view ||
    filters.cat.length > 0 ||
    filters.status.length > 0 ||
    filters.q !== '' ||
    filters.sort !== DEFAULT_FILTERS.sort;

  const toggleInArray = (arr: string[], value: string) =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  return (
    <div className="rounded-xl border bg-card space-y-3 px-4 py-3">
      {/* Row 1: tabs + segmented */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex rounded-lg border overflow-hidden">
          {(['criteria', 'atoms', 'patients'] as TabKey[]).map((t) => (
            <button
              key={t}
              onClick={() => update({ tab: t, view: t === 'patients' ? 'all' : 'unstructured', expanded: null })}
              className={`px-3 py-1.5 text-xs font-semibold capitalize cursor-pointer transition-colors ${filters.tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {t} · {tabCounts[t].toLocaleString()}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 ml-auto flex-wrap">
          {segments.map((s) => (
            <button
              key={s.value}
              onClick={() => update({ view: s.value })}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold cursor-pointer transition-colors ${filters.view === s.value ? 'bg-foreground text-background' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
            >
              {s.label} · {s.count.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: search + category + status + sort + clear */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.q}
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Search atoms, criteria, patients…"
            className="pl-9 h-9 text-sm"
          />
        </div>

        <details className="relative">
          <summary className="list-none cursor-pointer rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
            Category {filters.cat.length > 0 && <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0 text-[10px]">{filters.cat.length}</span>}
          </summary>
          <div className="absolute right-0 z-10 mt-1 w-52 rounded-md border bg-popover p-2 shadow-lg max-h-60 overflow-y-auto">
            {categories.map((c) => (
              <label key={c} className="flex items-center gap-2 py-1 text-xs cursor-pointer hover:bg-muted rounded px-1">
                <input type="checkbox" checked={filters.cat.includes(c)} onChange={() => update({ cat: toggleInArray(filters.cat, c) })} />
                {c}
              </label>
            ))}
            {categories.length === 0 && <p className="text-xs text-muted-foreground italic py-1">No categories</p>}
          </div>
        </details>

        <details className="relative">
          <summary className="list-none cursor-pointer rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
            Status {filters.status.length > 0 && <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0 text-[10px]">{filters.status.length}</span>}
          </summary>
          <div className="absolute right-0 z-10 mt-1 w-52 rounded-md border bg-popover p-2 shadow-lg">
            {(['auto-validated', 'needs-config', 'in-progress', 'validated'] as const).map((s) => (
              <label key={s} className="flex items-center gap-2 py-1 text-xs cursor-pointer hover:bg-muted rounded px-1">
                <input type="checkbox" checked={filters.status.includes(s)} onChange={() => update({ status: toggleInArray(filters.status, s) })} />
                {s}
              </label>
            ))}
          </div>
        </details>

        <details className="relative">
          <summary className="list-none cursor-pointer rounded-md border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
            Sort: {SORT_LABEL[filters.sort]}
          </summary>
          <div className="absolute right-0 z-10 mt-1 w-44 rounded-md border bg-popover p-1 shadow-lg">
            {(Object.keys(SORT_LABEL) as SortMode[]).map((s) => (
              <button key={s} onClick={() => update({ sort: s })} className={`block w-full text-left rounded px-2 py-1 text-xs hover:bg-muted ${filters.sort === s ? 'bg-muted font-semibold' : ''}`}>
                {SORT_LABEL[s]}
              </button>
            ))}
          </div>
        </details>

        {hasActive && (
          <button
            onClick={() => onChange({ ...DEFAULT_FILTERS, tab: filters.tab })}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-red-500 hover:bg-red-500/10 cursor-pointer"
          >
            <XCircle className="h-3 w-3" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7.2: Build to catch type errors**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 7.3: Commit**

```
git add src/components/vault/ExplorerFilterBar.tsx
git commit -m "feat(vault): ExplorerFilterBar with tabs, segmented control, dropdowns"
```

---

## Task 8: `ExplorerHeader`

**Files:**
- Create: `src/components/vault/ExplorerHeader.tsx`

- [ ] **Step 8.1: Implement**

Create `src/components/vault/ExplorerHeader.tsx`:
```tsx
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, FlaskConical, Plus } from 'lucide-react';
import type { CohortImport } from '@/types';
import type { CriterionRowData, AtomRowData } from './shared';

type Props = {
  cohort: CohortImport;
  criteria: CriterionRowData[];
  atoms: AtomRowData[];
  patientCount: number;
};

export function ExplorerHeader({ cohort, criteria, atoms, patientCount }: Props) {
  const nav = useNavigate();
  const structuredCr = criteria.filter((c) => c.mixedness === 'all-structured').length;
  const unstructuredCr = criteria.length - structuredCr;
  const validated = criteria.filter((c) => c.status === 'auto-validated' || c.status === 'validated').length;
  const inProgress = criteria.filter((c) => c.status === 'in-progress').length;
  const pending = criteria.filter((c) => c.status === 'needs-config').length;

  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={() => nav('/vault')} className="text-muted-foreground hover:text-foreground cursor-pointer" aria-label="Back to Vault">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <FlaskConical className="h-5 w-5 text-primary shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground">Vault /</span>
            <h1 className="text-lg font-bold truncate">{cohort.name}</h1>
            <Badge variant={cohort.status === 'Linked' ? 'success' : cohort.status === 'Active' ? 'processing' : 'warning'} className="text-[10px] px-2 py-0">
              {cohort.status}
            </Badge>
            <Badge variant="secondary" className="text-[10px] px-2 py-0">{cohort.source}</Badge>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
            <span>Patients <b className="text-foreground tabular-nums">{patientCount.toLocaleString()}</b></span>
            <span>Criteria <b className="text-foreground tabular-nums">{criteria.length}</b> <span className="opacity-70">({structuredCr} str / {unstructuredCr} unstr)</span></span>
            <span>Atoms <b className="text-foreground tabular-nums">{atoms.length}</b></span>
            <span>
              <span className="text-emerald-600 font-semibold">{validated} validated</span>
              {' / '}<span className="text-blue-600 font-semibold">{inProgress} in progress</span>
              {' / '}<span className="text-amber-600 font-semibold">{pending} pending</span>
            </span>
          </div>
        </div>
      </div>
      <div className="shrink-0">
        {cohort.status === 'Linked' && cohort.linkedProjectId ? (
          <button
            onClick={() => nav(`/projects/${cohort.linkedProjectId}/ct-overview`)}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            Open CT Project <ArrowRight className="h-3 w-3" />
          </button>
        ) : (
          <button
            onClick={() => nav(`/projects/new?flow=ct&cohort=${cohort.id}`)}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
          >
            <Plus className="h-3 w-3" /> Create CT Project
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 8.2: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 8.3: Commit**

```
git add src/components/vault/ExplorerHeader.tsx
git commit -m "feat(vault): ExplorerHeader with stats strip and Create-CT-Project CTA"
```

---

## Task 9: `CriteriaTab`

**Files:**
- Create: `src/components/vault/CriteriaTab.tsx`

- [ ] **Step 9.1: Implement**

Create `src/components/vault/CriteriaTab.tsx`:
```tsx
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown, ArrowRight } from 'lucide-react';
import type { CriterionRowData } from './shared';
import { AtomRow } from './AtomRow';

type Props = {
  criteria: CriterionRowData[];
  expandedId: string | null;
  onToggleExpand: (id: string | null) => void;
};

function mixednessDot(m: CriterionRowData['mixedness']) {
  if (m === 'all-structured') return <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" aria-hidden />;
  if (m === 'all-unstructured') return <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" aria-hidden />;
  return <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-r from-blue-500 to-amber-500" aria-hidden />;
}

function statusBadge(s: CriterionRowData['status']) {
  if (s === 'auto-validated') return <Badge variant="processing" className="text-[9px] px-1.5 py-0">Auto-validated</Badge>;
  if (s === 'validated') return <Badge variant="success" className="text-[9px] px-1.5 py-0">Validated</Badge>;
  if (s === 'in-progress') return <Badge variant="warning" className="text-[9px] px-1.5 py-0">In progress</Badge>;
  return <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Needs config</Badge>;
}

export function CriteriaTab({ criteria, expandedId, onToggleExpand }: Props) {
  const { projectId } = useParams();
  const nav = useNavigate();

  if (criteria.length === 0) {
    return <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">No criteria match your filters.</div>;
  }

  return (
    <div className="space-y-2">
      {criteria.map((cr) => {
        const isOpen = expandedId === cr.id;
        return (
          <div key={cr.id} className="rounded-xl border bg-card overflow-hidden">
            <button
              onClick={() => onToggleExpand(isOpen ? null : cr.id)}
              aria-expanded={isOpen}
              className="w-full px-4 py-3 text-left cursor-pointer hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <div className="flex items-center gap-3 flex-wrap">
                {mixednessDot(cr.mixedness)}
                <span className="text-xs font-bold text-muted-foreground">C{cr.index}</span>
                <Badge variant={cr.type === 'inclusion' ? 'success' : 'destructive'} className="text-[9px] px-1.5 py-0">
                  {cr.type === 'inclusion' ? 'INC' : 'EXC'}
                </Badge>
                <span className="text-sm font-semibold truncate">{cr.name}</span>
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{cr.category}</Badge>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {cr.atoms.length} atom{cr.atoms.length !== 1 ? 's' : ''} · {cr.structuredAtoms.length} str / {cr.unstructuredAtoms.length} unstr
                </span>
                <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${cr.pctComplete >= 100 ? 'bg-emerald-500' : cr.mixedness === 'all-structured' ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${cr.pctComplete}%` }} />
                </div>
                <span className="text-[10px] font-bold tabular-nums text-muted-foreground w-8 text-right">{cr.pctComplete}%</span>
                {statusBadge(cr.status)}
                {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            </button>

            {isOpen && (
              <div className="border-t bg-muted/10 px-4 py-4 space-y-3">
                {cr.unstructuredAtoms.length > 0 && (
                  <section>
                    <header className="flex items-center gap-2 mb-2">
                      <span className="h-2 w-2 rounded-sm bg-amber-500" aria-hidden />
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        Unstructured ({cr.unstructuredAtoms.length}) — needs review
                      </h3>
                    </header>
                    <div className="space-y-1.5">
                      {cr.unstructuredAtoms.map((a) => <AtomRow key={a.id} row={a} />)}
                    </div>
                  </section>
                )}

                {cr.structuredAtoms.length > 0 && (
                  <section>
                    <header className="flex items-center gap-2 mb-2">
                      <span className="h-2 w-2 rounded-sm bg-blue-500" aria-hidden />
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                        Structured ({cr.structuredAtoms.length}) — auto-validated
                      </h3>
                    </header>
                    <div className="space-y-1.5">
                      {cr.structuredAtoms.map((a) => <AtomRow key={a.id} row={a} />)}
                    </div>
                  </section>
                )}

                {projectId && (
                  <div className="pt-2 border-t flex justify-end">
                    <button
                      onClick={() => nav(`/projects/${projectId}/ct-criteria/${cr.id}`)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                    >
                      Go to criterion workspace <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 9.2: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 9.3: Commit**

```
git add src/components/vault/CriteriaTab.tsx
git commit -m "feat(vault): CriteriaTab with grouped Structured/Unstructured atom sections"
```

---

## Task 10: `AtomsTab`

**Files:**
- Create: `src/components/vault/AtomsTab.tsx`

- [ ] **Step 10.1: Implement**

Create `src/components/vault/AtomsTab.tsx`:
```tsx
import type { AtomRowData } from './shared';
import { AtomRow } from './AtomRow';

export function AtomsTab({ atoms }: { atoms: AtomRowData[] }) {
  if (atoms.length === 0) {
    return <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">No atoms match your filters.</div>;
  }
  return (
    <div className="space-y-1.5">
      {atoms.map((a) => <AtomRow key={a.id} row={a} />)}
    </div>
  );
}
```

- [ ] **Step 10.2: Build & commit**

```
npm run build
git add src/components/vault/AtomsTab.tsx
git commit -m "feat(vault): AtomsTab flat atom list"
```

---

## Task 11: `PatientsTab` — paged list with per-criterion drill

**Files:**
- Create: `src/components/vault/PatientsTab.tsx`

- [ ] **Step 11.1: Implement**

Create `src/components/vault/PatientsTab.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronDown, ChevronRight, X } from 'lucide-react';
import type { PatientRowData } from './shared';

const PAGE_SIZE = 50;

export function PatientsTab({ patients }: { patients: PatientRowData[] }) {
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  const paged = useMemo(() => patients.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [patients, page]);
  const totalPages = Math.max(1, Math.ceil(patients.length / PAGE_SIZE));

  if (patients.length === 0) {
    return <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">No patients match your filters.</div>;
  }

  return (
    <div className="space-y-2">
      <div className="rounded-xl border bg-card divide-y">
        {paged.map((p) => {
          const isOpen = openId === p.patientId;
          const passCount = p.passByCriterion.filter((c) => c.pass).length;
          const total = p.passByCriterion.length || 1;
          return (
            <div key={p.patientId}>
              <button
                onClick={() => setOpenId(isOpen ? null : p.patientId)}
                aria-expanded={isOpen}
                className="w-full px-4 py-2.5 text-left cursor-pointer hover:bg-muted/30 flex items-center gap-3"
              >
                {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                <span className="font-mono text-xs font-semibold">{p.patientId}</span>
                <Badge variant={p.eligible ? 'success' : 'destructive'} className="text-[9px] px-1.5 py-0">
                  {p.eligible ? 'Eligible' : 'Ineligible'}
                </Badge>
                {!p.reviewed && <Badge variant="warning" className="text-[9px] px-1.5 py-0">Needs review</Badge>}
                <div className="ml-auto flex items-center gap-2">
                  <div className="flex h-1.5 w-28 overflow-hidden rounded-full bg-muted">
                    <span className="h-full bg-emerald-500" style={{ width: `${(passCount / total) * 100}%` }} />
                  </div>
                  <span className="text-[10px] tabular-nums text-muted-foreground w-14 text-right">{passCount}/{total} pass</span>
                </div>
              </button>
              {isOpen && (
                <div className="bg-muted/10 px-4 py-3 grid grid-cols-2 gap-2">
                  {p.passByCriterion.map((c) => (
                    <div key={c.criterionId} className={`flex items-center gap-2 text-xs rounded px-2 py-1 ${c.pass ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'}`}>
                      {c.pass ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      <span className="truncate">{c.criterionName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {page + 1} of {totalPages} · {patients.length.toLocaleString()} patients</span>
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

- [ ] **Step 11.2: Build & commit**

```
npm run build
git add src/components/vault/PatientsTab.tsx
git commit -m "feat(vault): PatientsTab with per-criterion drill + pagination"
```

---

## Task 12: `CohortExplorerPage` shell with URL-driven filters

**Files:**
- Create: `src/pages/CohortExplorerPage.tsx`

- [ ] **Step 12.1: Implement**

Create `src/pages/CohortExplorerPage.tsx`:
```tsx
import { useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { ExplorerHeader } from '@/components/vault/ExplorerHeader';
import { ExplorerFilterBar } from '@/components/vault/ExplorerFilterBar';
import { CriteriaTab } from '@/components/vault/CriteriaTab';
import { AtomsTab } from '@/components/vault/AtomsTab';
import { PatientsTab } from '@/components/vault/PatientsTab';
import {
  parseFilters,
  serializeFilters,
  buildAtomRows,
  buildCriterionRows,
  buildPatientRows,
  applyAtomFilters,
  applyCriterionFilters,
  applyPatientFilters,
  type FilterState,
} from '@/components/vault/shared';

export default function CohortExplorerPage() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const nav = useNavigate();
  const { cohortImports } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const cohort = cohortImports.find((c) => c.id === cohortId);

  useEffect(() => {
    if (!cohort) nav('/vault', { replace: true });
  }, [cohort, nav]);

  const filters = useMemo<FilterState>(() => parseFilters(searchParams), [searchParams]);
  const updateFilters = (next: FilterState) => setSearchParams(serializeFilters(next), { replace: true });

  const atoms = useMemo(() => cohort ? buildAtomRows(cohort) : [], [cohort]);
  const criteria = useMemo(() => cohort ? buildCriterionRows(cohort) : [], [cohort]);
  const patients = useMemo(() => cohort ? buildPatientRows(cohort) : [], [cohort]);

  const categories = useMemo(() => Array.from(new Set(atoms.map((a) => a.category))).sort(), [atoms]);

  const filteredAtoms = useMemo(() => applyAtomFilters(atoms, filters), [atoms, filters]);
  const filteredCriteria = useMemo(() => applyCriterionFilters(criteria, filters), [criteria, filters]);
  const filteredPatients = useMemo(() => applyPatientFilters(patients, filters), [patients, filters]);

  const counts = useMemo(() => ({
    criteria: {
      total: criteria.length,
      structured: criteria.filter((c) => c.mixedness === 'all-structured').length,
      unstructured: criteria.filter((c) => c.unstructuredAtoms.length > 0).length,
      mixed: criteria.filter((c) => c.mixedness === 'mixed').length,
    },
    atoms: {
      total: atoms.length,
      structured: atoms.filter((a) => a.dataSource === 'structured').length,
      unstructured: atoms.filter((a) => a.dataSource === 'unstructured').length,
    },
    patients: {
      total: patients.length,
      eligible: patients.filter((p) => p.eligible).length,
      ineligible: patients.filter((p) => !p.eligible).length,
      needsReview: patients.filter((p) => !p.reviewed).length,
    },
  }), [criteria, atoms, patients]);

  if (!cohort) return null;
  const hasReal = !!cohort.criteriaResults?.length;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <ExplorerHeader cohort={cohort} criteria={criteria} atoms={atoms} patientCount={patients.length} />

      {!hasReal && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          Showing display-layer data. Re-import from NeuroTerminal for atom-level patient splits.
        </div>
      )}

      <ExplorerFilterBar
        filters={filters}
        onChange={updateFilters}
        counts={counts}
        categories={categories}
      />

      {filters.tab === 'criteria' && (
        <CriteriaTab
          criteria={filteredCriteria}
          expandedId={filters.expanded}
          onToggleExpand={(id) => updateFilters({ ...filters, expanded: id })}
        />
      )}
      {filters.tab === 'atoms' && <AtomsTab atoms={filteredAtoms} />}
      {filters.tab === 'patients' && <PatientsTab patients={filteredPatients} />}
    </div>
  );
}
```

- [ ] **Step 12.2: Build to catch type errors**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 12.3: Commit**

```
git add src/pages/CohortExplorerPage.tsx
git commit -m "feat(vault): CohortExplorerPage shell with URL-driven filters"
```

---

## Task 13: Wire route into `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 13.1: Add import and route**

In `src/App.tsx`, after the `import DataVaultPage` line (line 39), add:
```tsx
import CohortExplorerPage from '@/pages/CohortExplorerPage';
```

Then inside the `<Routes>` tree, after the `/vault` route (around line 72), add:
```tsx
<Route path="/vault/:cohortId" element={<CohortExplorerPage />} />
```

- [ ] **Step 13.2: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 13.3: Commit**

```
git add src/App.tsx
git commit -m "feat(vault): add /vault/:cohortId route"
```

---

## Task 14: Replace inline preview in `DataVaultPage` with "Open Explorer" button

**Files:**
- Modify: `src/pages/DataVaultPage.tsx`

- [ ] **Step 14.1: Add navigate + replace preview button and inline expanded matrix**

In `src/pages/DataVaultPage.tsx`:

1. Remove the `expandedId` / `setExpandedId` `useState` (line 35) — no longer needed.

2. Remove the entire block that renders `{/* Expanded Matrix Preview */}` (from `{isExpanded && (` through its closing `)}`).

3. Remove the "Preview / Hide" `<button>` with `setExpandedId`. Replace it with a single "Open Explorer" button, right before the `cohort.status === 'Linked' ? ...` ternary. The Actions `<div>` should read:

```tsx
<div className="flex items-center gap-2 ml-2">
  <button
    onClick={() => navigate(`/vault/${cohort.id}`)}
    className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted cursor-pointer"
  >
    Open Explorer <ArrowRight className="h-3 w-3" />
  </button>
  {cohort.status === 'Linked' ? (
    <button
      onClick={() => navigate(`/projects/${cohort.linkedProjectId}/criteria`)}
      className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
    >
      Open Project <ArrowRight className="h-3 w-3" />
    </button>
  ) : cohort.status === 'Active' ? (
    <button
      onClick={() => navigate(`/projects/new?flow=ct&cohort=${cohort.id}`)}
      className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
    >
      <Plus className="h-3 w-3" /> Create CT Project
    </button>
  ) : (
    <Badge variant="warning" className="text-[10px]">Processing</Badge>
  )}
</div>
```

4. Remove the now-unused imports: `Check`, `ChevronDown`, `ChevronUp`, `X`.

- [ ] **Step 14.2: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 14.3: Commit**

```
git add src/pages/DataVaultPage.tsx
git commit -m "refactor(vault): replace inline matrix preview with Open Explorer link"
```

---

## Task 15: Manual verification in dev server

**Files:** none

- [ ] **Step 15.1: Start dev server**

Run: `npm run dev`
Expected: Vite dev server starts on http://localhost:5173.

- [ ] **Step 15.2: Verify library → explorer navigation**

In browser:
1. Go to `/vault`.
2. Click "Open Explorer" on any cohort row.
3. Expected: URL becomes `/vault/<cohortId>`, page shows header + filter bar + Criteria tab.

- [ ] **Step 15.3: Verify URL-synced filter state (core integration check)**

In the explorer:
1. Click the `Atoms · N` tab → URL gains `?tab=atoms`.
2. Click `Structured` in the segmented control → URL becomes `?tab=atoms&view=structured`.
3. Copy URL, open in new tab → same state restored.
4. Browser back button → returns to previous filter state.
5. Expected: all four behaviors work.

- [ ] **Step 15.4: Verify Criteria tab grouping & patient tab exception**

1. Criteria tab → expand any criterion → confirm "Unstructured (n)" appears above "Structured (n)".
2. Switch to Patients tab → segmented control should now show `All · Eligible · Ineligible · Needs review`, NOT structured/unstructured/mixed.

- [ ] **Step 15.5: Verify fallback for legacy cohorts**

1. Open a cohort with no `criteriaResults` (the manually imported ones from `handleSimulatedImport`).
2. Expected: amber banner "Showing display-layer data…" appears; tabs still render with zero patient counts.

- [ ] **Step 15.6: Run full test suite one final time**

Run: `npm test && npm run build`
Expected: both pass.

- [ ] **Step 15.7: Commit anything incidental**

If any issues surfaced, fix them with dedicated commits. Do not bundle fixes into an "address review feedback" mega-commit.

---

## Task 16: Final review checkpoint

**Files:** none

- [ ] **Step 16.1: Invoke `superpowers:requesting-code-review` skill**

Use the skill to have an independent reviewer verify the implementation against this plan and the design spec. Report findings inline; fix any issues with focused commits.

- [ ] **Step 16.2: Verify sub-project A is done**

Checklist the design doc's Section 2 (Goals) against shipped behavior:
- [ ] Library unchanged as entry surface — ✓ if Task 14 left it intact other than the button swap.
- [ ] Cohort Explorer page with three pivoted tabs — ✓ from Task 12.
- [ ] Structured/unstructured is the dominant visual axis with Unstructured default — ✓ from Task 7's segmented control.
- [ ] URL-synced filters (search/category/status/sort) — ✓ from Tasks 2, 7, 12.
- [ ] Structured/Unstructured auto-grouping inside criterion detail — ✓ from Task 9.
- [ ] Reused `AtomRow` component in all contexts — ✓ used in Tasks 9 and 10.

If anything is missing, open a follow-up task; do not mark the sub-project complete until the list is green.

---

## Self-review notes

**Spec coverage:** every decision in Sections 4, 5, 6, 7, 8 of the design doc maps to a task above. The design doc's "open questions" Section 12 — virtualization, debounce, expanded sub-component split — were decided inline during plan writing (paged list instead of virtualization, no debounce, expanded inline in same file).

**Placeholder scan:** no TBDs. Each task has complete code or complete instruction (Task 14 references specific removals by anchor instead of full rewrites because the surrounding file is large and stable).

**Type consistency:** verified — `AtomRowData` shape is defined in Task 2, used consistently in Tasks 3, 4, 5, 6, 9, 10. `FilterState.tab`, `.view`, `.cat`, `.status`, `.q`, `.sort`, `.expanded` spelling matches everywhere. `CriterionRowData.mixedness` values `all-structured` / `all-unstructured` / `mixed` used consistently.
