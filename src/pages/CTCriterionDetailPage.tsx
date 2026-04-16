import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { buildCriterionRows } from '@/components/vault/shared';
import type { AtomRowData } from '@/components/vault/shared';
import { AtomRow } from '@/components/vault/AtomRow';
import { StatusRollup, worstStatus } from '@/components/ct/StatusRollup';
import type { AtomStatus } from '@/components/ct/StatusRollup';
import { ReviewSummary } from '@/components/ct/ReviewSummary';
import type { ReviewRow } from '@/components/ct/ReviewSummary';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';

/* ─── CTCriterionDetailPage ─── */

export function CTCriterionDetailPage() {
  const nav = useNavigate();
  const { projectId, criterionId } = useParams<{ projectId: string; criterionId: string }>();
  const { projects, cohortImports, reviewItems } = useAppContext();

  /* ── Resolve project + cohort ── */
  const project = projects.find((p) => p.id === projectId);
  const cohort = cohortImports.find((c) => c.id === project?.cohortImportId) ?? null;

  /* ── Guard: missing data ── */
  if (!project || !cohort || !criterionId) {
    return (
      <div className="mx-auto max-w-3xl p-8 space-y-4">
        <p className="text-destructive font-semibold">
          {!project ? 'Project not found.' : !cohort ? 'Cohort not linked to this project.' : 'No criterion ID provided.'}
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => nav(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Go back
        </button>
      </div>
    );
  }

  /* ── Build rows ── */
  const criterionRows = buildCriterionRows(cohort);
  const criterionRow = criterionRows.find((c) => c.id === criterionId);

  if (!criterionRow) {
    return (
      <div className="mx-auto max-w-3xl p-8 space-y-4">
        <p className="text-destructive font-semibold">Criterion not found in this cohort.</p>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => nav(`/projects/${projectId}/ct-overview`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to overview
        </button>
      </div>
    );
  }

  /* ── Project-level StatusRollup (N/M criteria complete) ── */
  const totalCriteria = criterionRows.length;
  const completedCriteria = criterionRows.filter((c) => c.status === 'auto-validated').length;
  const projectWorstStatus = worstStatus(criterionRows.map((c) => c.status as AtomStatus));

  /* ── Criterion-level StatusRollup (N/M atoms complete) ── */
  const totalAtoms = criterionRow.atoms.length;
  const completedAtoms = criterionRow.atoms.filter((a) => a.status === 'auto-validated').length;

  /* ── Grouped atoms ── */
  const unstructuredAtoms: AtomRowData[] = criterionRow.unstructuredAtoms;
  const structuredAtoms: AtomRowData[] = criterionRow.structuredAtoms;

  /* ── Criterion display metadata ── */
  const cohortCriterion = cohort.criteria.find((c) => c.id === criterionId);
  const description = cohortCriterion?.description ?? '';
  const atomLogic = cohortCriterion?.atomLogic ?? 'AND';

  /* ── Review summary rows (one per unstructured atom) ── */
  const reviewRows = useMemo<ReviewRow[]>(() => {
    if (!cohort?.criteriaResults || unstructuredAtoms.length === 0) return [];

    const crResult = cohort.criteriaResults.find((cr) => cr.criterion_id === criterionId);
    if (!crResult) return [];

    return crResult.atoms
      .filter((atom) => atom.patient_list_no_unstructured.length > 0 || atom.patient_list_unknown.length > 0)
      .map((atom) => {
        const patientsToReview = new Set([
          ...atom.patient_list_no_unstructured,
          ...atom.patient_list_unknown,
        ]);
        const total = patientsToReview.size;

        const atomReviews = reviewItems.filter(
          (ri) => ri.projectId === projectId && patientsToReview.has(ri.patientId),
        );

        const reviewed = atomReviews.filter((ri) => ri.decision !== undefined).length;
        const trueCount = atomReviews.filter((ri) => ri.decision === 'True').length;
        const falseCount = atomReviews.filter((ri) => ri.decision === 'False').length;
        const unclearCount = atomReviews.filter((ri) => ri.decision === 'Unclear').length;

        return {
          label: atom.metadata.concept_label,
          reviewed,
          total,
          trueCount,
          falseCount,
          unclearCount,
        };
      });
  }, [cohort, criterionId, unstructuredAtoms.length, reviewItems, projectId]);

  /* ── Atom click handler ── */
  function handleAtomClick(row: AtomRowData) {
    nav(`/projects/${projectId}/ct-atom/${row.id}`);
  }

  /* ── Render ── */
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">

      {/* ── Breadcrumb ── */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {/* Back arrow + project name + project StatusRollup */}
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => nav(`/projects/${projectId}/ct-overview`)}
        >
          <ArrowLeft className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium">{project.name}</span>
        </button>

        <StatusRollup
          status={projectWorstStatus}
          completed={completedCriteria}
          total={totalCriteria}
          label="criteria"
        />

        {/* Separator */}
        <span className="text-muted-foreground/50 select-none">›</span>

        {/* Criterion segment + criterion StatusRollup */}
        <span className="font-semibold text-foreground">
          C{criterionRow.index} · {criterionRow.name}
        </span>

        <StatusRollup
          status={criterionRow.status as AtomStatus}
          completed={completedAtoms}
          total={totalAtoms}
          label="atoms"
        />
      </div>

      {/* ── Criterion Header Card ── */}
      <div className="rounded-xl border bg-card p-5 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-start gap-2">
          {/* Name */}
          <h1 className="flex-1 text-lg font-bold text-foreground leading-snug min-w-0">
            {criterionRow.name}
          </h1>

          {/* INC / EXC badge */}
          <Badge
            variant={criterionRow.type === 'inclusion' ? 'success' : 'destructive'}
            className="flex-shrink-0 px-2 py-0.5 text-[11px] font-bold"
          >
            {criterionRow.type === 'inclusion' ? 'INC' : 'EXC'}
          </Badge>

          {/* Category badge */}
          <Badge variant="secondary" className="flex-shrink-0 px-2 py-0.5 text-[11px]">
            {criterionRow.category}
          </Badge>
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}

        {/* Atom logic indicator */}
        <div className="inline-flex items-center gap-2 rounded-md bg-muted/60 px-3 py-1.5 text-xs">
          <span className="font-semibold text-foreground">Atom logic: {atomLogic}</span>
          <span className="text-muted-foreground">
            {atomLogic === 'AND' ? '— all atoms must pass' : '— any atom passing is sufficient'}
          </span>
        </div>
      </div>

      {/* ── Review Summary (only when unstructured atoms exist) ── */}
      {unstructuredAtoms.length > 0 && (
        <ReviewSummary title="Review Summary" rows={reviewRows} />
      )}

      {/* ── Atom sections ── */}
      <div className="space-y-6">

        {/* Unstructured section — amber, shown first */}
        {unstructuredAtoms.length > 0 && (
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
              Unstructured ({unstructuredAtoms.length}) — needs review
            </h2>
            <div className="space-y-2">
              {unstructuredAtoms.map((row) => (
                <AtomRow key={row.id} row={row} onClick={handleAtomClick} />
              ))}
            </div>
          </section>
        )}

        {/* Structured section — blue, shown second */}
        {structuredAtoms.length > 0 && (
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-400">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-400" aria-hidden="true" />
              Structured ({structuredAtoms.length}) — auto-validated
            </h2>
            <div className="space-y-2">
              {structuredAtoms.map((row) => (
                <AtomRow key={row.id} row={row} onClick={handleAtomClick} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {unstructuredAtoms.length === 0 && structuredAtoms.length === 0 && (
          <p className="text-sm text-muted-foreground">No atoms defined for this criterion.</p>
        )}
      </div>
    </div>
  );
}

export default CTCriterionDetailPage;
