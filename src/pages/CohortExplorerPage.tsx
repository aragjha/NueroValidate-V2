import { useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { ExplorerHeader } from '@/components/vault/ExplorerHeader';
import { ExplorerFilterBar } from '@/components/vault/ExplorerFilterBar';
import { CriteriaTab } from '@/components/vault/CriteriaTab';
import { AtomsTab } from '@/components/vault/AtomsTab';
import { PatientsTab } from '@/components/vault/PatientsTab';
import {
  buildAtomRows,
  buildCriterionRows,
  buildPatientRows,
  applyAtomFilters,
  applyCriterionFilters,
  applyPatientFilters,
  parseFilters,
  serializeFilters,
  DEFAULT_FILTERS,
  type FilterState,
} from '@/components/vault/shared';

export default function CohortExplorerPage() {
  const { cohortId } = useParams<{ cohortId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { cohortImports } = useAppContext();

  /* Parse filter state from URL */
  const filters: FilterState = useMemo(() => parseFilters(searchParams), [searchParams]);

  /* Find the cohort */
  const cohort = useMemo(
    () => cohortImports.find((c) => c.id === cohortId),
    [cohortImports, cohortId],
  );

  /* Redirect if cohort not found */
  useEffect(() => {
    if (!cohort) {
      navigate('/vault', { replace: true });
    }
  }, [cohort, navigate]);

  /* Build full data rows — only when cohort is present */
  const allAtomRows = useMemo(() => (cohort ? buildAtomRows(cohort) : []), [cohort]);
  const allCriterionRows = useMemo(() => (cohort ? buildCriterionRows(cohort) : []), [cohort]);
  const allPatientRows = useMemo(() => (cohort ? buildPatientRows(cohort) : []), [cohort]);

  /* Derive category list from atoms */
  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const a of allAtomRows) {
      if (a.category) seen.add(a.category);
    }
    return Array.from(seen).sort();
  }, [allAtomRows]);

  /* Apply filters */
  const filteredCriteria = useMemo(
    () => applyCriterionFilters(allCriterionRows, filters),
    [allCriterionRows, filters],
  );
  const filteredAtoms = useMemo(
    () => applyAtomFilters(allAtomRows, filters),
    [allAtomRows, filters],
  );
  const filteredPatients = useMemo(
    () => applyPatientFilters(allPatientRows, filters),
    [allPatientRows, filters],
  );

  /* Counts object for ExplorerFilterBar */
  const counts = useMemo(() => {
    const structuredCriteria = allCriterionRows.filter((c) => c.mixedness === 'all-structured').length;
    const unstructuredCriteria = allCriterionRows.filter((c) => c.unstructuredAtoms.length > 0).length;
    const mixedCriteria = allCriterionRows.filter((c) => c.mixedness === 'mixed').length;

    const structuredAtoms = allAtomRows.filter((a) => a.dataSource === 'structured').length;
    const unstructuredAtoms = allAtomRows.filter((a) => a.dataSource === 'unstructured').length;

    const eligiblePatients = allPatientRows.filter(
      (p) => p.overrideEligible !== undefined ? p.overrideEligible : p.eligible,
    ).length;
    const ineligiblePatients = allPatientRows.filter(
      (p) => !(p.overrideEligible !== undefined ? p.overrideEligible : p.eligible),
    ).length;
    const needsReviewPatients = allPatientRows.filter((p) => !p.reviewedBy).length;

    return {
      criteria: {
        total: allCriterionRows.length,
        structured: structuredCriteria,
        unstructured: unstructuredCriteria,
        mixed: mixedCriteria,
      },
      atoms: {
        total: allAtomRows.length,
        structured: structuredAtoms,
        unstructured: unstructuredAtoms,
      },
      patients: {
        total: allPatientRows.length,
        eligible: eligiblePatients,
        ineligible: ineligiblePatients,
        needsReview: needsReviewPatients,
      },
    };
  }, [allCriterionRows, allAtomRows, allPatientRows]);

  /* Write filter updates back to URL */
  function updateFilters(next: FilterState) {
    setSearchParams(serializeFilters(next), { replace: true });
  }

  /* Handle criterion expand toggle — stored in URL via filters.expanded */
  function handleToggleExpand(id: string | null) {
    updateFilters({ ...filters, expanded: id });
  }

  /* While cohort is loading / redirecting, render nothing */
  if (!cohort) return null;

  const hasCriteriaResults = !!(cohort.criteriaResults && cohort.criteriaResults.length > 0);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Header: back nav, breadcrumb, stats strip, CTA */}
      <ExplorerHeader
        cohort={cohort}
        criteria={allCriterionRows}
        atoms={allAtomRows}
        patientCount={allPatientRows.length}
      />

      {/* Amber banner when no criteriaResults present */}
      {!hasCriteriaResults && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-300">
          <span className="font-semibold">No atom-level results available.</span>{' '}
          This cohort was imported without NeuroTerminal criteria results. Atom counts and
          patient-level data shown here are placeholders.
        </div>
      )}

      {/* Filter bar: tabs + pills + search + dropdowns */}
      <ExplorerFilterBar
        filters={filters}
        onChange={updateFilters}
        counts={counts}
        categories={categories}
      />

      {/* Tab content */}
      {filters.tab === 'criteria' && (
        <CriteriaTab
          criteria={filteredCriteria}
          expandedId={filters.expanded}
          onToggleExpand={handleToggleExpand}
        />
      )}
      {filters.tab === 'atoms' && <AtomsTab atoms={filteredAtoms} />}
      {filters.tab === 'patients' && <PatientsTab patients={filteredPatients} />}
    </div>
  );
}
