import { describe, it, expect } from 'vitest';
import {
  parseFilters,
  serializeFilters,
  DEFAULT_FILTERS,
  atomStatus,
  buildAtomRows,
  buildCriterionRows,
  applyAtomFilters,
  applyCriterionFilters,
  buildPatientRows,
  applyPatientFilters,
} from './shared';
import type { CohortImport, CohortAtomResult } from '@/types';

/* ─── Shared mock helper ─── */

function mockAtom(overrides: Partial<CohortAtomResult> = {}): CohortAtomResult {
  return {
    atom_id: 'a1',
    parent_criterion_id: 'c1',
    evaluation_scope: 'encounter',
    metadata: { concept_label: 'age', operator: 'gte', polarity: 'positive', primary_category: 'Demographics' },
    patient_count_yes: 100,
    patient_count_no: 20,
    patient_count_unknown: 0,
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

/* ─── Task 2: parseFilters / serializeFilters ─── */

describe('parseFilters', () => {
  it('returns defaults when no params are present', () => {
    const params = new URLSearchParams();
    expect(parseFilters(params)).toEqual(DEFAULT_FILTERS);
  });

  it('parses tab, view, and multi-value cat/status', () => {
    const params = new URLSearchParams(
      'tab=atoms&view=structured&cat=Labs,Imaging&status=in-progress,validated&q=age&sort=name&expanded=r1',
    );
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
    expect(f.tab).toBe('all');
    expect(f.view).toBe('all');
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
    const original = {
      tab: 'patients' as const,
      view: 'eligible' as const,
      cat: ['Meds'],
      status: ['validated'],
      q: '',
      sort: 'pending' as const,
      expanded: null,
    };
    const parsed = parseFilters(serializeFilters(original));
    expect(parsed).toEqual(original);
  });
});

/* ─── Task 3: atomStatus + buildAtomRows ─── */

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
      id: 'k1',
      name: 'Trial',
      source: 'NeuroTerminal',
      importedAt: '',
      importedBy: 'u',
      status: 'Active',
      criteria: [
        {
          id: 'c1',
          name: 'Age',
          type: 'inclusion',
          description: '',
          atoms: [],
          atomLogic: 'AND',
          category: 'Demographics',
        },
      ],
      patients: [],
      criteriaResults: [{ criterion_id: 'c1', atom_ids: ['a1'], atoms: [mockAtom()] }],
      metadata: { totalPatients: 120, eligibleCount: 0, ineligibleCount: 0 },
    } as unknown as CohortImport;

    const rows = buildAtomRows(cohort);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'a1',
      parentCriterionId: 'c1',
      parentCriterionIndex: 1,
      parentCriterionName: 'Age',
      atomIndex: 1,
      atomTotal: 1,
      label: 'age',
      category: 'Demographics',
      dataSource: 'structured',
      yes: 100,
      no: 20,
      unknown: 0,
      noStructured: 20,
      noUnstructured: 0,
      status: 'auto-validated',
    });
  });

  it('falls back to display-layer atoms when criteriaResults is absent', () => {
    const cohort = {
      id: 'k1',
      name: 'T',
      source: 'Manual',
      importedAt: '',
      importedBy: 'u',
      status: 'Active',
      criteria: [
        {
          id: 'c1',
          name: 'Age',
          type: 'inclusion',
          description: '',
          atomLogic: 'AND',
          category: 'Demographics',
          atoms: [{ id: 'c1-a1', label: 'age', structuredExpression: 'age>=65', dataSource: 'structured' }],
        },
      ],
      patients: [],
      metadata: { totalPatients: 0, eligibleCount: 0, ineligibleCount: 0 },
    } as unknown as CohortImport;

    const rows = buildAtomRows(cohort);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('c1-a1');
    expect(rows[0].dataSource).toBe('structured');
  });
});

/* ─── Task 4: buildCriterionRows ─── */

describe('buildCriterionRows', () => {
  it('produces one row per criterion with structured/unstructured split and mixedness', () => {
    const cohort = {
      id: 'k1',
      name: 'T',
      source: 'NeuroTerminal',
      importedAt: '',
      importedBy: 'u',
      status: 'Active',
      criteria: [
        {
          id: 'c1',
          name: 'Age',
          type: 'inclusion',
          description: '',
          atoms: [],
          atomLogic: 'AND',
          category: 'Demographics',
        },
        {
          id: 'c2',
          name: 'Dx',
          type: 'inclusion',
          description: '',
          atoms: [],
          atomLogic: 'AND',
          category: 'Diagnosis',
        },
      ],
      patients: [],
      metadata: { totalPatients: 0, eligibleCount: 0, ineligibleCount: 0 },
      criteriaResults: [
        { criterion_id: 'c1', atom_ids: ['a1'], atoms: [mockAtom({ atom_id: 'a1' })] },
        {
          criterion_id: 'c2',
          atom_ids: ['a2', 'a3'],
          atoms: [
            mockAtom({ atom_id: 'a2', patient_list_no_unstructured: ['n1'] }),
            mockAtom({ atom_id: 'a3' }),
          ],
        },
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

/* ─── Task 5: applyAtomFilters + applyCriterionFilters ─── */

const atomA = {
  id: 'a',
  parentCriterionId: 'c1',
  parentCriterionIndex: 1,
  parentCriterionName: 'Age',
  parentCriterionType: 'inclusion' as const,
  atomIndex: 1,
  atomTotal: 1,
  label: 'age>=65',
  category: 'Demographics',
  dataSource: 'structured' as const,
  yes: 100,
  no: 0,
  unknown: 0,
  noStructured: 0,
  noUnstructured: 0,
  gcpPaths: [],
  status: 'auto-validated' as const,
};

const atomB = {
  ...atomA,
  id: 'b',
  parentCriterionId: 'c2',
  parentCriterionIndex: 2,
  parentCriterionName: 'Dx',
  label: 'AD diagnosis',
  category: 'Diagnosis',
  dataSource: 'unstructured' as const,
  no: 50,
  noUnstructured: 30,
  unknown: 20,
  status: 'needs-config' as const,
};

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
  const crStr = {
    id: 'c1',
    index: 1,
    name: 'Age',
    type: 'inclusion' as const,
    category: 'Demographics',
    atoms: [atomA],
    structuredAtoms: [atomA],
    unstructuredAtoms: [],
    mixedness: 'all-structured' as const,
    status: 'auto-validated' as const,
    pctComplete: 100,
  };
  const crUnstr = {
    ...crStr,
    id: 'c2',
    index: 2,
    name: 'Dx',
    category: 'Diagnosis',
    atoms: [atomB],
    structuredAtoms: [],
    unstructuredAtoms: [atomB],
    mixedness: 'all-unstructured' as const,
    status: 'needs-config' as const,
    pctComplete: 0,
  };

  it('view=unstructured keeps criteria with unstructured atoms', () => {
    const f = { ...DEFAULT_FILTERS, view: 'unstructured' as const };
    expect(applyCriterionFilters([crStr, crUnstr], f).map((c) => c.id)).toEqual(['c2']);
  });

  it('view=structured keeps criteria where all atoms are structured', () => {
    const f = { ...DEFAULT_FILTERS, view: 'structured' as const };
    expect(applyCriterionFilters([crStr, crUnstr], f).map((c) => c.id)).toEqual(['c1']);
  });
});

/* ─── Task 5 extras: buildPatientRows + applyPatientFilters ─── */

describe('buildPatientRows', () => {
  it('builds rows from cohort.patients', () => {
    const cohort = {
      id: 'k1',
      name: 'T',
      source: 'Manual',
      importedAt: '',
      importedBy: 'u',
      status: 'Active',
      criteria: [],
      patients: [
        { patientId: 'p1', flags: [], eligible: true },
        { patientId: 'p2', flags: [], eligible: false },
      ],
      metadata: { totalPatients: 2, eligibleCount: 1, ineligibleCount: 1 },
    } as unknown as CohortImport;
    const rows = buildPatientRows(cohort);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 'p1', eligible: true });
    expect(rows[1]).toMatchObject({ id: 'p2', eligible: false });
  });
});

describe('applyPatientFilters', () => {
  it('view=eligible keeps only eligible patients', () => {
    const cohort = {
      id: 'k1',
      name: 'T',
      source: 'Manual',
      importedAt: '',
      importedBy: 'u',
      status: 'Active',
      criteria: [],
      patients: [
        { patientId: 'p1', flags: [], eligible: true },
        { patientId: 'p2', flags: [], eligible: false },
      ],
      metadata: { totalPatients: 2, eligibleCount: 1, ineligibleCount: 1 },
    } as unknown as CohortImport;
    const rows = buildPatientRows(cohort);
    const f = { ...DEFAULT_FILTERS, view: 'eligible' as const };
    const filtered = applyPatientFilters(rows, f);
    expect(filtered.map((r) => r.id)).toEqual(['p1']);
  });
});
