import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { buildCriterionRows } from '@/components/vault/shared';
import type { AtomRowData } from '@/components/vault/shared';
import { ReviewSummary } from '@/components/ct/ReviewSummary';
import type { ReviewRow } from '@/components/ct/ReviewSummary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  Edit,
  Eye,
  FlaskConical,
  Folder,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';

/* ─── CTCriterionDetailPage (Criteria Home, RWE-style) ─── */

export function CTCriterionDetailPage() {
  const nav = useNavigate();
  const { projectId, criterionId } = useParams<{ projectId: string; criterionId: string }>();
  const { projects, cohortImports, reviewItems, runs } = useAppContext();

  /* ── Resolve project + cohort ── */
  const project = projects.find((p) => p.id === projectId);

  /* Cohort resolution with fallback:
   * 1. Prefer the project's linked cohort.
   * 2. Fallback when the session project is gone (e.g. after refresh): find the cohort
   *    that contains this criterionId (either as display-layer c.id or raw
   *    criteriaResults.criterion_id). This makes the deep-link survive page refreshes. */
  const cohort = useMemo(() => {
    const viaProject = cohortImports.find((c) => c.id === project?.cohortImportId);
    if (viaProject) return viaProject;
    if (!criterionId) return null;
    for (const c of cohortImports) {
      const hit = c.criteria.some((cr) => cr.id === criterionId)
        || c.criteriaResults?.some((cr) => cr.criterion_id === criterionId);
      if (hit) return c;
    }
    return null;
  }, [cohortImports, project?.cohortImportId, criterionId]);

  /* ── Build rows (hoisted above guard) ── */
  const criterionRows = useMemo(() => (cohort ? buildCriterionRows(cohort) : []), [cohort]);
  /* Accept either a display-layer criterion id (e.g. `C2`) or a raw `criteriaResults`
   * criterion id (e.g. `c_amyloid_pet`). buildCriterionRows now emits rows for both
   * flavors (display-layer + synthetic rows for unmatched raw ids), so a direct id
   * match is the primary path. Name match is a final safety net. */
  const criterionRow = useMemo(() => {
    if (!criterionId) return undefined;
    const direct = criterionRows.find((c) => c.id === criterionId);
    if (direct) return direct;
    const byAtomParent = criterionRows.find((c) => c.atoms.some((a) => a.parentCriterionId === criterionId));
    if (byAtomParent) return byAtomParent;
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const asName = normalize(criterionId.replace(/^c_/i, '').replace(/[_-]+/g, ' '));
    return criterionRows.find((c) => normalize(c.name) === asName);
  }, [criterionRows, criterionId]);

  /* ── Unstructured atoms (for review summary) ── */
  const unstructuredAtoms: AtomRowData[] = criterionRow?.unstructuredAtoms ?? [];
  const structuredAtoms: AtomRowData[] = criterionRow?.structuredAtoms ?? [];

  /* ── Review summary rows ── */
  const reviewRows = useMemo<ReviewRow[]>(() => {
    if (!cohort?.criteriaResults || unstructuredAtoms.length === 0 || !criterionRow) return [];
    /* Match the raw criteriaResults entry for this criterion — use whatever parent id
     * the atoms report (set by buildAtomRows from cr.criterion_id) so we always hit. */
    const rawParentId = criterionRow.atoms[0]?.parentCriterionId ?? criterionRow.id;
    const crResult = cohort.criteriaResults.find((cr) => cr.criterion_id === rawParentId);
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
  }, [cohort, criterionRow, unstructuredAtoms.length, reviewItems, projectId]);

  /* ── Runs for this criterion ── */
  const criterionRuns = useMemo(
    () => runs.filter((r) => r.criterionId === criterionId),
    [runs, criterionId],
  );

  /* ── Guard (after hooks) — project is optional; cohort + criterion are required ── */
  if (!cohort) {
    return (
      <div className="mx-auto max-w-3xl p-8 space-y-4">
        <p className="text-destructive font-semibold">
          No cohort found for criterion "{criterionId ?? '(unknown)'}".
        </p>
        <button onClick={() => nav(-1)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
          <ArrowLeft className="h-4 w-4" /> Go back
        </button>
      </div>
    );
  }

  if (!criterionRow) {
    return (
      <div className="mx-auto max-w-3xl p-8 space-y-4">
        <p className="text-destructive font-semibold">
          Criterion "{criterionId}" not found in this cohort.
        </p>
        <div className="flex items-center gap-3">
          {projectId && (
            <button onClick={() => nav(`/projects/${projectId}/ct-overview`)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
              <ArrowLeft className="h-4 w-4" /> Back to overview
            </button>
          )}
          <button onClick={() => nav('/vault')} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline cursor-pointer">
            Go to Data Vault
          </button>
        </div>
      </div>
    );
  }

  /* Synthetic project fallback — lets deep-links survive when the session project is gone. */
  const effectiveProject = project ?? {
    id: projectId ?? 'unknown',
    name: `Cohort: ${cohort.name}`,
  };

  /* criterionRow.id is always the display-layer id; use it to find the cohort criterion */
  const cohortCriterion = cohort.criteria.find((c) => c.id === criterionRow.id);
  const description = cohortCriterion?.description ?? '';
  const atomLogic = cohortCriterion?.atomLogic ?? 'AND';

  const firstUnstructuredAtom = unstructuredAtoms[0];
  const totalReviewed = reviewRows.reduce((s, r) => s + r.reviewed, 0);
  const totalToReview = reviewRows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      {/* ── Top breadcrumb + actions ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <button
            onClick={() => nav(`/projects/${projectId}/ct-overview`)}
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
          >
            <span className="font-semibold">{effectiveProject.name}</span>
          </button>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-foreground">{criterionRow.name}</span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <button
              onClick={() => nav(`/projects/${projectId}/ct-overview`)}
              className="mt-1 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              {/* Title + criterion dropdown */}
              <div className="flex items-center gap-2 flex-wrap">
                <FlaskConical className="h-5 w-5 text-primary shrink-0" />
                <h1 className="text-xl font-bold leading-tight truncate">
                  {effectiveProject.name} — {criterionRow.name}
                </h1>
                <Badge
                  variant={criterionRow.type === 'inclusion' ? 'success' : 'destructive'}
                  className="text-[10px] px-1.5 py-0 shrink-0"
                >
                  {criterionRow.type === 'inclusion' ? 'INC' : 'EXC'}
                </Badge>
              </div>
              {description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 max-w-xl">{description}</p>
              )}
              {/* Criterion switcher dropdown */}
              <div className="mt-2 flex items-center gap-2">
                <label className="text-[11px] text-muted-foreground font-semibold">Criterion:</label>
                <select
                  value={criterionId}
                  onChange={(e) => nav(`/projects/${projectId}/ct-criteria/${e.target.value}`)}
                  className="rounded-md border bg-background px-2 py-1 text-xs font-medium cursor-pointer"
                >
                  {criterionRows.map((c) => (
                    <option key={c.id} value={c.id}>
                      C{c.index} · {c.type === 'inclusion' ? '[INC]' : '[EXC]'} {c.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-muted-foreground">
                  {criterionRow.atoms.length} atom{criterionRow.atoms.length !== 1 ? 's' : ''} · logic {atomLogic}
                </span>
              </div>
            </div>
          </div>

          {/* Top-right action bar */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <Button variant="outline" size="sm" className="h-8 text-xs"><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>
            <Button variant="outline" size="sm" className="h-8 text-xs"><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
            <Button variant="outline" size="sm" className="h-8 text-xs text-destructive"><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
            <Button variant="outline" size="sm" className="h-8 text-xs"><Copy className="h-3.5 w-3.5 mr-1" /> Duplicate</Button>
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => nav(`/projects/${projectId}/criteria?stage=2&selected=${criterionRow.id}`)}
            >
              <Play className="h-3.5 w-3.5 mr-1" /> Run Extraction
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => nav(`/projects/${projectId}/review?criterion=${encodeURIComponent(criterionRow.name)}`)}
            >
              <Eye className="h-3.5 w-3.5 mr-1" /> Review Extractions
            </Button>
          </div>
        </div>
      </div>

      {/* ── Verify Data banner ── */}
      <button
        onClick={() => nav(`/vault/${cohort.id}?tab=patients`)}
        className="w-full flex items-center gap-3 rounded-xl border bg-primary/5 border-primary/20 px-4 py-3 text-left hover:bg-primary/10 transition-colors cursor-pointer group"
      >
        <div className="rounded-lg bg-primary/15 p-2">
          <Eye className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Verify Data</p>
          <p className="text-[11px] text-muted-foreground">Inspect indexed records by criteria. Review patient data before validation.</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>

      {/* ── Main 2-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Runs (2/3) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Review summary */}
          {unstructuredAtoms.length > 0 && (
            <ReviewSummary title="Review Summary" rows={reviewRows} />
          )}

          {/* Atoms */}
          <section className="rounded-xl border bg-card">
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <div>
                <h2 className="text-sm font-bold">Atoms</h2>
                <p className="text-[11px] text-muted-foreground">Open any atom to configure prompts, run extraction, and review</p>
              </div>
              <Badge variant="secondary" className="text-[10px]">{criterionRow.atoms.length}</Badge>
            </div>
            <div className="divide-y">
              {unstructuredAtoms.length > 0 && (
                <div className="px-5 py-2 bg-amber-50/30 dark:bg-amber-950/10 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Unstructured — needs review ({unstructuredAtoms.length})
                </div>
              )}
              {unstructuredAtoms.map((atom) => (
                <AtomListRow key={atom.id} atom={atom} onClick={() => nav(`/projects/${projectId}/ct-atom/${atom.id}`)} />
              ))}
              {structuredAtoms.length > 0 && (
                <div className="px-5 py-2 bg-blue-50/30 dark:bg-blue-950/10 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  Structured — auto-validated ({structuredAtoms.length})
                </div>
              )}
              {structuredAtoms.map((atom) => (
                <AtomListRow key={atom.id} atom={atom} onClick={() => nav(`/projects/${projectId}/ct-atom/${atom.id}`)} />
              ))}
              {criterionRow.atoms.length === 0 && (
                <p className="px-5 py-8 text-center text-xs text-muted-foreground">No atoms defined for this criterion.</p>
              )}
            </div>
          </section>

          {/* Runs */}
          <section className="rounded-xl border bg-card">
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <div>
                <h2 className="text-sm font-bold">Runs</h2>
                <p className="text-[11px] text-muted-foreground">Extraction runs across atoms in this criterion</p>
              </div>
              <Badge variant="secondary" className="text-[10px]">{criterionRuns.length}</Badge>
            </div>
            <div className="divide-y">
              {criterionRuns.length === 0 ? (
                <p className="px-5 py-6 text-center text-xs text-muted-foreground">
                  No runs yet. Click "Run Extraction" to start.
                </p>
              ) : (
                criterionRuns.map((run) => (
                  <div key={run.id} className="flex items-center gap-3 px-5 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{run.runId}</p>
                      <p className="text-[10px] text-muted-foreground">{run.fullRun ? 'Full run' : `Sample · ${run.sampleSize} patients`}</p>
                    </div>
                    <Badge
                      variant={run.status === 'Done' ? 'success' : run.status === 'Processing' ? 'processing' : run.status === 'Failed' ? 'destructive' : 'warning'}
                      className="text-[10px]"
                    >
                      {run.status}
                    </Badge>
                    <button
                      onClick={() => firstUnstructuredAtom && nav(`/projects/${projectId}/ct-atom/${firstUnstructuredAtom.id}`)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="Open"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right: Overview + Criteria list (1/3) */}
        <div className="space-y-5">
          {/* Overview */}
          <section className="rounded-xl border bg-card">
            <div className="px-5 py-3 border-b">
              <h2 className="text-sm font-bold">Overview</h2>
              <p className="text-[11px] text-muted-foreground">Project metadata</p>
            </div>
            <div className="px-5 py-3 space-y-2.5 text-xs">
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Client</span>
                <span className="font-semibold text-right">{cohort.metadata.indication ?? '—'}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Trial</span>
                <span className="font-semibold text-right">{cohort.metadata.trialName ?? '—'}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Phase</span>
                <span className="font-semibold text-right">{cohort.metadata.trialPhase ?? '—'}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Source</span>
                <span className="font-semibold text-right">{cohort.source}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Criteria</span>
                <span className="font-semibold text-right">{criterionRows.length} criteria</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Patients</span>
                <span className="font-semibold text-right">{cohort.metadata.totalPatients.toLocaleString()}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Reviewed</span>
                <span className="font-semibold text-right">{totalReviewed} / {totalToReview}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">Imported</span>
                <span className="font-semibold text-right">{new Date(cohort.importedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </section>

          {/* Criteria switcher */}
          <section className="rounded-xl border bg-card">
            <div className="px-5 py-3 border-b">
              <h2 className="text-sm font-bold">Criteria</h2>
              <p className="text-[11px] text-muted-foreground">Jump to another criterion</p>
            </div>
            <div className="divide-y">
              {criterionRows.map((c) => (
                <button
                  key={c.id}
                  onClick={() => nav(`/projects/${projectId}/ct-criteria/${c.id}`)}
                  className={`w-full flex items-center gap-2 px-5 py-2.5 text-left transition-colors cursor-pointer ${
                    c.id === criterionId ? 'bg-primary/5' : 'hover:bg-muted/30'
                  }`}
                >
                  <Folder className={`h-3.5 w-3.5 shrink-0 ${c.id === criterionId ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs flex-1 min-w-0 truncate ${c.id === criterionId ? 'font-bold text-foreground' : 'font-medium'}`}>
                    {c.name}
                  </span>
                  <Badge
                    variant={c.type === 'inclusion' ? 'success' : 'destructive'}
                    className="text-[9px] px-1 py-0 shrink-0"
                  >
                    {c.type === 'inclusion' ? 'INC' : 'EXC'}
                  </Badge>
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ─── Inline atom row ─── */

function AtomListRow({ atom, onClick }: { atom: AtomRowData; onClick: () => void }) {
  const isStructured = atom.dataSource === 'structured';
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-muted/30 transition-colors cursor-pointer"
    >
      <span className={`h-2 w-2 rounded-full shrink-0 ${isStructured ? 'bg-blue-500' : 'bg-amber-500'}`} />
      <span className="text-[10px] font-mono font-bold text-muted-foreground shrink-0">A{atom.atomIndex}</span>
      <span className="text-sm font-medium flex-1 min-w-0 truncate">{atom.label}</span>
      {atom.yes > 0 && (
        <span className="text-[10px] text-emerald-600 font-semibold shrink-0">{atom.yes.toLocaleString()} pass</span>
      )}
      {atom.noUnstructured > 0 && (
        <span className="text-[10px] text-amber-600 font-semibold shrink-0">{atom.noUnstructured} review</span>
      )}
      <Badge
        variant={isStructured ? 'processing' : 'warning'}
        className="text-[9px] px-1.5 py-0 shrink-0"
      >
        {isStructured ? 'Structured' : 'Unstructured'}
      </Badge>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
    </button>
  );
}

export default CTCriterionDetailPage;
