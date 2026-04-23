import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { buildAtomRows, buildCriterionRows } from '@/components/vault/shared';
import { AtomMetadataHeader } from '@/components/ct/AtomMetadataHeader';
import { Badge } from '@/components/ui/badge';

/* ─── CTAtomDetailPage ─── */
/* For unstructured atoms: redirects to the RWE Run Extraction page (CriteriaPage stage 3)
 * for the parent criterion, since the RWE flow is criterion-level, not atom-level.
 * For structured atoms: shows a lightweight read-only data-match sheet inline —
 * no prompts, no runs, no review needed. */

export function CTAtomDetailPage() {
  const nav = useNavigate();
  const { projectId, atomId } = useParams<{ projectId: string; atomId: string }>();
  const { projects, cohortImports } = useAppContext();

  /* ── Resolve project + cohort (with fallback to any cohort containing the atom) ── */
  const project = projects.find((p) => p.id === projectId);
  const cohort = useMemo(() => {
    const viaProject = cohortImports.find((c) => c.id === project?.cohortImportId);
    if (viaProject) return viaProject;
    if (!atomId) return null;
    for (const c of cohortImports) {
      const hit = c.criteriaResults?.some((cr) => cr.atoms.some((a) => a.atom_id === atomId))
        || c.criteria.some((cr) => cr.atoms.some((a) => a.id === atomId));
      if (hit) return c;
    }
    return null;
  }, [cohortImports, project?.cohortImportId, atomId]);

  const allAtoms = useMemo(() => (cohort ? buildAtomRows(cohort) : []), [cohort]);
  const allCriteria = useMemo(() => (cohort ? buildCriterionRows(cohort) : []), [cohort]);
  const atom = allAtoms.find((a) => a.id === atomId) ?? null;
  const criterion = allCriteria.find((c) => c.id === atom?.parentCriterionId) ?? null;

  /* ── Redirect unstructured atoms to the RWE Run Extraction page (stage 3) ── */
  useEffect(() => {
    if (!projectId || !atom || !criterion) return;
    if (atom.dataSource === 'unstructured') {
      nav(`/projects/${projectId}/criteria?stage=2&selected=${criterion.id}`, { replace: true });
    }
  }, [projectId, atom, criterion, nav]);

  /* ── Guard ── */
  if (!cohort || !atom || !criterion) {
    const errorMsg = !cohort
      ? `No cohort found for atom "${atomId ?? '(unknown)'}".`
      : !atom
      ? `Atom "${atomId}" not found in any imported cohort.`
      : `Parent criterion not found for atom "${atomId}".`;
    return (
      <div className="mx-auto max-w-3xl p-8 space-y-4">
        <p className="text-destructive font-semibold">{errorMsg}</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            onClick={() => nav(-1)}
          >
            <ArrowLeft className="h-4 w-4" /> Go back
          </button>
          {projectId && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline cursor-pointer"
              onClick={() => nav(`/projects/${projectId}/ct-overview`)}
            >
              Go to Project Home
            </button>
          )}
        </div>
      </div>
    );
  }

  const effectiveProject = project ?? {
    id: projectId ?? 'unknown',
    name: `Cohort: ${cohort.name}`,
  };

  /* ── Unstructured atoms redirect (brief render while nav happens) ── */
  if (atom.dataSource === 'unstructured') {
    return (
      <div className="mx-auto max-w-3xl p-8 text-sm text-muted-foreground">
        Opening Run Extraction…
      </div>
    );
  }

  /* ── Structured atoms: read-only data-match sheet ── */
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <AtomMetadataHeader
        atom={atom}
        criterion={criterion}
        allCriteria={allCriteria}
        projectId={projectId!}
        projectName={effectiveProject.name}
        reviewedCount={0}
        totalToReview={0}
      />

      {atom.keywords && atom.keywords.length > 0 && (
        <div className="rounded-xl border bg-card px-5 py-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Possible keywords / concepts</p>
          <div className="flex flex-wrap gap-1.5">
            {atom.keywords.map((kw) => (
              <Badge key={kw} variant="secondary" className="text-[11px] px-2 py-0 font-normal">
                {kw}
              </Badge>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground italic">Matched from mapped table — spot-check only.</p>
        </div>
      )}

      <div className="rounded-xl border bg-card px-5 py-4 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Data match</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-background px-3 py-2">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Matched</p>
            <p className="text-xl font-bold text-emerald-600">{atom.yes.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Unmatched</p>
            <p className="text-xl font-bold text-red-600">{atom.no.toLocaleString()}</p>
          </div>
          <div className="rounded-lg border bg-background px-3 py-2">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Unknown</p>
            <p className="text-xl font-bold text-muted-foreground">{atom.unknown.toLocaleString()}</p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Auto-validated from the mapped database field. Nothing to review — the funnel and matrix use these counts directly.
        </p>
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => nav(`/projects/${projectId}/ct-criteria/${criterion.id}`)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Criterion
        </button>
        <button
          onClick={() => nav(`/projects/${projectId}/ct-overview`)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
        >
          Back to Project Home <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default CTAtomDetailPage;
