import type { CohortImport, CohortAtomResult, CriterionAtom, CriterionType } from '@/types';

/* ─── Types ─── */

export type TabKey = 'criteria' | 'atoms' | 'patients';

export type ViewMode =
  | 'all'
  | 'structured'
  | 'unstructured'
  | 'eligible'
  | 'ineligible';

export type AtomStatus = 'auto-validated' | 'needs-config' | 'in-progress';

export type SortMode = 'default' | 'name' | 'pending' | 'yes' | 'no';

export type FilterState = {
  tab: TabKey;
  view: ViewMode;
  cat: string[];
  status: string[];
  q: string;
  sort: SortMode;
  expanded: string | null;
};

export type AtomRowData = {
  id: string;
  parentCriterionId: string;
  parentCriterionIndex: number;
  parentCriterionName: string;
  parentCriterionType: CriterionType;
  atomIndex: number;
  atomTotal: number;
  label: string;
  category: string;
  dataSource: 'structured' | 'unstructured';
  yes: number;
  no: number;
  unknown: number;
  noStructured: number;
  noUnstructured: number;
  gcpPaths: string[];
  status: AtomStatus;
  keywords?: string[];
};

export type Mixedness = 'all-structured' | 'all-unstructured' | 'mixed';

export type CriterionRowData = {
  id: string;
  index: number;
  name: string;
  type: CriterionType;
  category: string;
  atoms: AtomRowData[];
  structuredAtoms: AtomRowData[];
  unstructuredAtoms: AtomRowData[];
  mixedness: Mixedness;
  status: AtomStatus;
  pctComplete: number;
};

export type PatientRowData = {
  id: string;
  eligible: boolean;
  overrideEligible?: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
};

/* ─── Constants ─── */

export const DEFAULT_FILTERS: FilterState = {
  tab: 'criteria',
  view: 'unstructured',
  cat: [],
  status: [],
  q: '',
  sort: 'default',
  expanded: null,
};

export const DATA_SOURCE_COLOR: Record<'structured' | 'unstructured', string> = {
  structured: 'blue',
  unstructured: 'amber',
};

/* ─── Valid enum sets for parse validation ─── */

const VALID_TABS = new Set<TabKey>(['criteria', 'atoms', 'patients']);
const VALID_VIEWS = new Set<ViewMode>(['all', 'structured', 'unstructured', 'eligible', 'ineligible']);
const VALID_SORTS = new Set<SortMode>(['default', 'name', 'pending', 'yes', 'no']);

/* ─── URL helpers ─── */

export function parseFilters(params: URLSearchParams): FilterState {
  const rawTab = params.get('tab') ?? '';
  const tab: TabKey = VALID_TABS.has(rawTab as TabKey) ? (rawTab as TabKey) : DEFAULT_FILTERS.tab;

  const rawView = params.get('view') ?? '';
  const view: ViewMode = VALID_VIEWS.has(rawView as ViewMode) ? (rawView as ViewMode) : DEFAULT_FILTERS.view;

  const rawSort = params.get('sort') ?? '';
  const sort: SortMode = VALID_SORTS.has(rawSort as SortMode) ? (rawSort as SortMode) : DEFAULT_FILTERS.sort;

  const catRaw = params.get('cat') ?? '';
  const cat = catRaw ? catRaw.split(',') : [];

  const statusRaw = params.get('status') ?? '';
  const status = statusRaw ? statusRaw.split(',') : [];

  const q = params.get('q') ?? '';
  const expanded = params.get('expanded') ?? null;

  return { tab, view, cat, status, q, sort, expanded };
}

export function serializeFilters(f: FilterState): URLSearchParams {
  const params = new URLSearchParams();

  if (f.tab !== DEFAULT_FILTERS.tab) params.set('tab', f.tab);
  if (f.view !== DEFAULT_FILTERS.view) params.set('view', f.view);
  if (f.cat.length > 0) params.set('cat', f.cat.join(','));
  if (f.status.length > 0) params.set('status', f.status.join(','));
  if (f.q) params.set('q', f.q);
  if (f.sort !== DEFAULT_FILTERS.sort) params.set('sort', f.sort);
  if (f.expanded !== null) params.set('expanded', f.expanded);

  return params;
}

/* ─── atomStatus ─── */

export function atomStatus(atom: CohortAtomResult | CriterionAtom): AtomStatus {
  // Display-layer CriterionAtom — no patient list data, just use dataSource
  if (!('patient_list_no_unstructured' in atom)) {
    return 'auto-validated';
  }

  const hasUnstructured = atom.patient_list_no_unstructured.length > 0;
  const hasUnknown = atom.patient_list_unknown.length > 0;
  const needsWork = hasUnstructured || hasUnknown;

  if (!needsWork) return 'auto-validated';
  if (atom.keywords && atom.keywords.length > 0) return 'in-progress';
  return 'needs-config';
}

/* ─── buildAtomRows ─── */

export function buildAtomRows(cohort: CohortImport): AtomRowData[] {
  const criterionMap = new Map(cohort.criteria.map((c, i) => [c.id, { criterion: c, index: i + 1 }]));

  // Real data path: criteriaResults present
  if (cohort.criteriaResults && cohort.criteriaResults.length > 0) {
    const rows: AtomRowData[] = [];
    for (const cr of cohort.criteriaResults) {
      const meta = criterionMap.get(cr.criterion_id);
      const parentIndex = meta?.index ?? 0;
      const parentName = meta?.criterion.name ?? cr.criterion_id;
      const parentType: CriterionType = meta?.criterion.type ?? 'inclusion';
      const atomTotal = cr.atoms.length;

      cr.atoms.forEach((atom, atomIdx) => {
        const hasUnstructured = atom.patient_list_no_unstructured.length > 0;
        const dataSource: 'structured' | 'unstructured' = hasUnstructured ? 'unstructured' : 'structured';

        rows.push({
          id: atom.atom_id,
          parentCriterionId: cr.criterion_id,
          parentCriterionIndex: parentIndex,
          parentCriterionName: parentName,
          parentCriterionType: parentType,
          atomIndex: atomIdx + 1,
          atomTotal,
          label: atom.metadata.concept_label,
          category: atom.metadata.primary_category,
          dataSource,
          yes: atom.patient_count_yes,
          no: atom.patient_count_no,
          unknown: atom.patient_count_unknown,
          noStructured: atom.patient_list_no_structured.length,
          noUnstructured: atom.patient_list_no_unstructured.length,
          gcpPaths: atom.patient_list_no_unstructured_gcp_path,
          status: atomStatus(atom),
          keywords: atom.keywords,
        });
      });
    }
    return rows;
  }

  // Fallback: display-layer atoms
  const rows: AtomRowData[] = [];
  for (const criterion of cohort.criteria) {
    const meta = criterionMap.get(criterion.id);
    const parentIndex = meta?.index ?? 0;
    const atomTotal = criterion.atoms.length;

    criterion.atoms.forEach((atom, atomIdx) => {
      rows.push({
        id: atom.id,
        parentCriterionId: criterion.id,
        parentCriterionIndex: parentIndex,
        parentCriterionName: criterion.name,
        parentCriterionType: criterion.type,
        atomIndex: atomIdx + 1,
        atomTotal,
        label: atom.label,
        category: criterion.category,
        dataSource: atom.dataSource,
        yes: 0,
        no: 0,
        unknown: 0,
        noStructured: 0,
        noUnstructured: 0,
        gcpPaths: [],
        status: atomStatus(atom),
      });
    });
  }
  return rows;
}

/* ─── criterionMixedness ─── */

export function criterionMixedness(atomRows: AtomRowData[]): Mixedness {
  const hasStructured = atomRows.some((a) => a.dataSource === 'structured');
  const hasUnstructured = atomRows.some((a) => a.dataSource === 'unstructured');
  if (hasStructured && hasUnstructured) return 'mixed';
  if (hasUnstructured) return 'all-unstructured';
  return 'all-structured';
}

/* ─── rollupCriterionStatus ─── */

export function rollupCriterionStatus(atomRows: AtomRowData[]): AtomStatus {
  if (atomRows.some((a) => a.status === 'needs-config')) return 'needs-config';
  if (atomRows.some((a) => a.status === 'in-progress')) return 'in-progress';
  return 'auto-validated';
}

/* ─── buildCriterionRows ─── */

export function buildCriterionRows(cohort: CohortImport): CriterionRowData[] {
  const allAtomRows = buildAtomRows(cohort);

  return cohort.criteria.map((criterion, idx) => {
    const atomRows = allAtomRows.filter((a) => a.parentCriterionId === criterion.id);
    const structuredAtoms = atomRows.filter((a) => a.dataSource === 'structured');
    const unstructuredAtoms = atomRows.filter((a) => a.dataSource === 'unstructured');
    const mixedness = criterionMixedness(atomRows);
    const status = rollupCriterionStatus(atomRows);
    const totalAtoms = atomRows.length;
    const completedAtoms = atomRows.filter((a) => a.status === 'auto-validated').length;
    const pctComplete = totalAtoms > 0 ? Math.round((completedAtoms / totalAtoms) * 100) : 100;

    return {
      id: criterion.id,
      index: idx + 1,
      name: criterion.name,
      type: criterion.type,
      category: criterion.category,
      atoms: atomRows,
      structuredAtoms,
      unstructuredAtoms,
      mixedness,
      status,
      pctComplete,
    };
  });
}

/* ─── applyAtomFilters ─── */

export function applyAtomFilters(rows: AtomRowData[], f: FilterState): AtomRowData[] {
  let result = rows;

  // View filter
  if (f.view === 'structured') {
    result = result.filter((a) => a.dataSource === 'structured');
  } else if (f.view === 'unstructured') {
    result = result.filter((a) => a.dataSource === 'unstructured');
  }

  // Category filter (multi-select OR)
  if (f.cat.length > 0) {
    result = result.filter((a) => f.cat.includes(a.category));
  }

  // Status filter
  if (f.status.length > 0) {
    result = result.filter((a) => f.status.includes(a.status));
  }

  // Search query
  if (f.q) {
    const q = f.q.toLowerCase();
    result = result.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.parentCriterionName.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );
  }

  // Sort
  if (f.sort === 'name') {
    result = [...result].sort((a, b) => a.label.localeCompare(b.label));
  } else if (f.sort === 'pending') {
    result = [...result].sort((a, b) => b.noUnstructured + b.unknown - (a.noUnstructured + a.unknown));
  } else if (f.sort === 'yes') {
    result = [...result].sort((a, b) => b.yes - a.yes);
  } else if (f.sort === 'no') {
    result = [...result].sort((a, b) => b.no - a.no);
  }

  return result;
}

/* ─── applyCriterionFilters ─── */

export function applyCriterionFilters(rows: CriterionRowData[], f: FilterState): CriterionRowData[] {
  let result = rows;

  // View filter
  if (f.view === 'structured') {
    result = result.filter((c) => c.mixedness === 'all-structured');
  } else if (f.view === 'unstructured') {
    result = result.filter((c) => c.unstructuredAtoms.length > 0);
  }

  // Category filter
  if (f.cat.length > 0) {
    result = result.filter((c) => f.cat.includes(c.category));
  }

  // Status filter
  if (f.status.length > 0) {
    result = result.filter((c) => f.status.includes(c.status));
  }

  // Search query
  if (f.q) {
    const q = f.q.toLowerCase();
    result = result.filter(
      (c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q),
    );
  }

  // Sort
  if (f.sort === 'name') {
    result = [...result].sort((a, b) => a.name.localeCompare(b.name));
  }

  return result;
}

/* ─── buildPatientRows ─── */

export function buildPatientRows(cohort: CohortImport): PatientRowData[] {
  return cohort.patients.map((p) => ({
    id: p.patientId,
    eligible: p.eligible,
    overrideEligible: p.overrideEligible,
    reviewedBy: p.reviewedBy,
    reviewedAt: p.reviewedAt,
    notes: p.notes,
  }));
}

/* ─── applyPatientFilters ─── */

export function applyPatientFilters(rows: PatientRowData[], f: FilterState): PatientRowData[] {
  let result = rows;

  if (f.view === 'eligible') {
    result = result.filter((p) => p.eligible || p.overrideEligible);
  } else if (f.view === 'ineligible') {
    result = result.filter((p) => !p.eligible && !p.overrideEligible);
  }

  if (f.q) {
    const q = f.q.toLowerCase();
    result = result.filter((p) => p.id.toLowerCase().includes(q));
  }

  return result;
}
