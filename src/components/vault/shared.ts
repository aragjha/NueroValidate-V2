import type { CohortImport, CohortAtomResult, CriterionAtom, CriterionType } from '@/types';

/* ─── Types ─── */

export type TabKey = 'all' | 'criteria' | 'atoms' | 'patients';

export type ViewMode =
  | 'all'
  | 'structured'
  | 'unstructured'
  | 'mixed'
  | 'eligible'
  | 'ineligible'
  | 'needs-review';

export type AtomStatus = 'auto-validated' | 'needs-config' | 'in-progress' | 'validated';

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
  conceptLabel?: string;
  operator?: string;
  polarity?: string;
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

export type PatientCriterionFlagRow = {
  criterionId: string;
  criterionName: string;
  criterionType: CriterionType;
  value: boolean;
  override?: boolean;
};

export type PatientRowData = {
  id: string;
  eligible: boolean;
  overrideEligible?: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  flags?: PatientCriterionFlagRow[];
};

/* ─── Constants ─── */

export const DEFAULT_FILTERS: FilterState = {
  tab: 'all',
  view: 'all',
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

const VALID_TABS = new Set<TabKey>(['all', 'criteria', 'atoms', 'patients']);
const VALID_VIEWS = new Set<ViewMode>(['all', 'structured', 'unstructured', 'mixed', 'eligible', 'ineligible', 'needs-review']);
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

/* ─── Humanize a raw criterion_id like `c_brain_surgery` → `Brain Surgery` ─── */

const CRITERION_ID_ACRONYMS = new Set(['ad', 'mci', 'dbs', 'pet', 'mri', 'ct', 'csf', 'ehr', 'vp', 'ms', 'rrms', 'als', 'cgrp', 'suvr', 'moh', 'nia', 'cdr', 'mmse']);

function humanizeCriterionId(id: string): string {
  const stripped = id.replace(/^c_/i, '');
  const words = stripped.split(/[_-]+/).filter(Boolean);
  return words
    .map((w) => {
      if (/^\d+$/.test(w)) return w;
      if (CRITERION_ID_ACRONYMS.has(w.toLowerCase())) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

/* ─── buildAtomRows ─── */

export function buildAtomRows(cohort: CohortImport): AtomRowData[] {
  const criterionMapById = new Map(cohort.criteria.map((c, i) => [c.id, { criterion: c, index: i + 1 }]));
  /* Secondary lookup: match display-layer criteria by normalized name.
   * Useful when raw criteriaResults ids (e.g. `c_age_50`) don't match display ids (e.g. `C1`). */
  const normalizeName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const criterionMapByName = new Map(
    cohort.criteria.map((c, i) => [normalizeName(c.name), { criterion: c, index: i + 1 }]),
  );

  function lookupParent(crId: string, fallbackName: string): { index: number; name: string; type: CriterionType } {
    const byId = criterionMapById.get(crId);
    if (byId) return { index: byId.index, name: byId.criterion.name, type: byId.criterion.type };
    const byRawName = criterionMapByName.get(normalizeName(fallbackName));
    if (byRawName) return { index: byRawName.index, name: byRawName.criterion.name, type: byRawName.criterion.type };
    const byHumanizedId = criterionMapByName.get(normalizeName(humanizeCriterionId(crId)));
    if (byHumanizedId) return { index: byHumanizedId.index, name: byHumanizedId.criterion.name, type: byHumanizedId.criterion.type };
    return { index: 0, name: humanizeCriterionId(crId), type: 'inclusion' };
  }

  // Real data path: criteriaResults present
  if (cohort.criteriaResults && cohort.criteriaResults.length > 0) {
    const rows: AtomRowData[] = [];
    for (const cr of cohort.criteriaResults) {
      const firstAtomLabel = cr.atoms[0]?.metadata.concept_label ?? cr.criterion_id;
      const { index: parentIndex, name: parentName, type: parentType } = lookupParent(cr.criterion_id, firstAtomLabel);
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
          conceptLabel: atom.metadata.concept_label,
          operator: atom.metadata.operator,
          polarity: atom.metadata.polarity,
        });
      });
    }
    return rows;
  }

  // Fallback: display-layer atoms
  const rows: AtomRowData[] = [];
  for (const criterion of cohort.criteria) {
    const meta = criterionMapById.get(criterion.id);
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
  if (atomRows.length === 0) return 'needs-config';
  if (atomRows.every((a) => a.status === 'auto-validated')) return 'auto-validated';
  if (atomRows.every((a) => a.status === 'auto-validated' || a.status === 'validated')) return 'validated';
  if (atomRows.some((a) => a.status === 'in-progress' || a.status === 'validated')) return 'in-progress';
  return 'needs-config';
}

/* ─── buildCriterionRows ──
 * Two ID spaces exist in cohort data:
 *   - Display-layer: `cohort.criteria[i].id`           → e.g. "C1", "C2", "C3"
 *   - Raw NeuroTerminal: `criteriaResults[i].criterion_id` → e.g. "c_ad_diagnosis", "c_amyloid_pet"
 *
 * `buildAtomRows` writes the RAW id into `atom.parentCriterionId` (source of truth from
 * criteriaResults). This function used to do a naive `criterion.id === parentCriterionId`
 * match and always returned empty atom lists — fixed to match by either raw id OR the
 * display-layer name that `buildAtomRows.lookupParent` resolved the atom to.
 *
 * Also builds synthetic criterion rows for any raw `criteriaResults` criteria that have
 * no matching display-layer criterion (e.g. `c_ad_diagnosis` with no C* counterpart),
 * so deep-links like /ct-criteria/c_ad_diagnosis still resolve. */

export function buildCriterionRows(cohort: CohortImport): CriterionRowData[] {
  const allAtomRows = buildAtomRows(cohort);
  const normalizeName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  /* Group atoms by parentCriterionId (raw) and by parentCriterionName (display-resolved) */
  const atomsByParentId = new Map<string, AtomRowData[]>();
  const atomsByParentName = new Map<string, AtomRowData[]>();
  for (const a of allAtomRows) {
    const byId = atomsByParentId.get(a.parentCriterionId) ?? [];
    byId.push(a);
    atomsByParentId.set(a.parentCriterionId, byId);
    const normName = normalizeName(a.parentCriterionName);
    const byName = atomsByParentName.get(normName) ?? [];
    byName.push(a);
    atomsByParentName.set(normName, byName);
  }

  const rows: CriterionRowData[] = [];
  const consumedRawIds = new Set<string>();

  /* 1) One row per display-layer criterion — match atoms via either id or resolved name */
  cohort.criteria.forEach((criterion, idx) => {
    const normName = normalizeName(criterion.name);
    /* Try direct id match, then name match against atoms' resolved parent name */
    let atomRows: AtomRowData[] = atomsByParentId.get(criterion.id) ?? [];
    if (atomRows.length === 0) {
      atomRows = atomsByParentName.get(normName) ?? [];
    }
    /* Record which raw ids we've now represented under this display criterion */
    for (const a of atomRows) consumedRawIds.add(a.parentCriterionId);

    const structuredAtoms = atomRows.filter((a) => a.dataSource === 'structured');
    const unstructuredAtoms = atomRows.filter((a) => a.dataSource === 'unstructured');
    const mixedness = criterionMixedness(atomRows);
    const status = rollupCriterionStatus(atomRows);
    const totalAtoms = atomRows.length;
    const completedAtoms = atomRows.filter((a) => a.status === 'auto-validated').length;
    const pctComplete = totalAtoms > 0 ? Math.round((completedAtoms / totalAtoms) * 100) : 100;

    rows.push({
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
    });
  });

  /* 2) Synthesize rows for raw criteriaResults entries that have no display-layer match.
   *    Keeps deep-links like /ct-criteria/c_ad_diagnosis resolvable. */
  for (const [rawId, atomGroup] of atomsByParentId) {
    if (consumedRawIds.has(rawId)) continue;
    if (atomGroup.length === 0) continue;
    const first = atomGroup[0];
    const structuredAtoms = atomGroup.filter((a) => a.dataSource === 'structured');
    const unstructuredAtoms = atomGroup.filter((a) => a.dataSource === 'unstructured');
    rows.push({
      id: rawId,
      index: rows.length + 1,
      name: first.parentCriterionName,
      type: first.parentCriterionType,
      category: first.category,
      atoms: atomGroup,
      structuredAtoms,
      unstructuredAtoms,
      mixedness: criterionMixedness(atomGroup),
      status: rollupCriterionStatus(atomGroup),
      pctComplete: atomGroup.length > 0
        ? Math.round((atomGroup.filter((a) => a.status === 'auto-validated').length / atomGroup.length) * 100)
        : 100,
    });
  }

  return rows;
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
        a.parentCriterionId.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        (a.conceptLabel ?? '').toLowerCase().includes(q),
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
  } else if (f.view === 'mixed') {
    result = result.filter((c) => c.mixedness === 'mixed');
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
      (c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.category.toLowerCase().includes(q),
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
  const criterionMap = new Map(cohort.criteria.map((c) => [c.id, c]));

  return cohort.patients.map((p) => ({
    id: p.patientId,
    eligible: p.eligible,
    overrideEligible: p.overrideEligible,
    reviewedBy: p.reviewedBy,
    reviewedAt: p.reviewedAt,
    notes: p.notes,
    flags: p.flags.map((f) => {
      const criterion = criterionMap.get(f.criterionId);
      return {
        criterionId: f.criterionId,
        criterionName: criterion?.name ?? f.criterionId,
        criterionType: criterion?.type ?? 'inclusion',
        value: f.value,
        override: f.override,
      };
    }),
  }));
}

/* ─── applyPatientFilters ─── */

export function applyPatientFilters(rows: PatientRowData[], f: FilterState): PatientRowData[] {
  let result = rows;

  if (f.view === 'eligible') {
    result = result.filter((p) => p.eligible || p.overrideEligible);
  } else if (f.view === 'ineligible') {
    result = result.filter((p) => !p.eligible && !p.overrideEligible);
  } else if (f.view === 'needs-review') {
    result = result.filter((p) => !p.reviewedBy);
  }

  if (f.q) {
    const q = f.q.toLowerCase();
    result = result.filter((p) => p.id.toLowerCase().includes(q));
  }

  return result;
}
