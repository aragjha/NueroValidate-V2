import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { ReviewSummary } from '@/components/ct/ReviewSummary';
import type { ReviewRow } from '@/components/ct/ReviewSummary';
import {
  buildCriterionRows,
  buildAtomRows,
  applyCriterionFilters,
  type CriterionRowData,
  type FilterState,
  DEFAULT_FILTERS,
} from '@/components/vault/shared';
import { StatusRollup, worstStatus } from '@/components/ct/StatusRollup';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Brain, ChevronRight, Circle, Database, FlaskConical,
  HeartPulse, Layers, Pill, Scissors, Search, Stethoscope, TestTubes, Users, XCircle,
} from 'lucide-react';

/* ── Category metadata ── */

const CATEGORY_ORDER = ['Demographics', 'Diagnosis', 'Labs', 'Imaging', 'Medications', 'Procedures', 'Clinical'] as const;

const CATEGORY_META: Record<string, { icon: ReactNode; color: string; bgColor: string }> = {
  Demographics: { icon: <Users className="h-3.5 w-3.5" />, color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  Diagnosis:    { icon: <Stethoscope className="h-3.5 w-3.5" />, color: 'text-purple-600', bgColor: 'bg-purple-500/10' },
  Labs:         { icon: <TestTubes className="h-3.5 w-3.5" />, color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
  Imaging:      { icon: <Brain className="h-3.5 w-3.5" />, color: 'text-pink-600', bgColor: 'bg-pink-500/10' },
  Medications:  { icon: <Pill className="h-3.5 w-3.5" />, color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
  Procedures:   { icon: <Scissors className="h-3.5 w-3.5" />, color: 'text-red-600', bgColor: 'bg-red-500/10' },
  Clinical:     { icon: <HeartPulse className="h-3.5 w-3.5" />, color: 'text-cyan-600', bgColor: 'bg-cyan-500/10' },
};

function getCategoryMeta(cat: string) {
  return CATEGORY_META[cat] ?? { icon: <Circle className="h-3.5 w-3.5" />, color: 'text-muted-foreground', bgColor: 'bg-muted' };
}

/* ── Mixedness dot ── */

function MixednessDot({ mixedness }: { mixedness: CriterionRowData['mixedness'] }) {
  if (mixedness === 'all-structured') {
    return <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" title="All structured" />;
  }
  if (mixedness === 'all-unstructured') {
    return <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" title="All unstructured" />;
  }
  // mixed
  return (
    <span className="h-2 w-2 rounded-full shrink-0 overflow-hidden border border-transparent"
      style={{ background: 'conic-gradient(#3b82f6 0deg 180deg, #f59e0b 180deg 360deg)' }}
      title="Mixed" />
  );
}

/* ── Segmented control view modes ── */

type ViewSegment = 'all' | 'structured' | 'unstructured';
const VIEW_SEGMENTS: { key: ViewSegment; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'structured', label: 'Structured' },
  { key: 'unstructured', label: 'Unstructured' },
];

/* ── Local filter state (not URL-synced) ── */

type LocalFilters = {
  q: string;
  view: ViewSegment;
  cat: string | null;
};

const INITIAL_FILTERS: LocalFilters = {
  q: '',
  view: 'unstructured',
  cat: null,
};

/* ── Helpers ── */

const fmt = (n: number) => n.toLocaleString();

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

export function CTOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const nav = useNavigate();
  const { projects, cohortImports, reviewItems } = useAppContext();

  const project = projects.find((p) => p.id === projectId);
  const cohort = cohortImports.find((c) => c.id === project?.cohortImportId);

  const [filters, setFilters] = useState<LocalFilters>(INITIAL_FILTERS);

  /* ── Build canonical rows from shared.ts ── */
  const criterionRows = useMemo(() => {
    if (!cohort) return [];
    return buildCriterionRows(cohort);
  }, [cohort]);

  const atomRows = useMemo(() => {
    if (!cohort) return [];
    return buildAtomRows(cohort);
  }, [cohort]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const totalPatients = (() => {
      if (cohort?.criteriaResults?.length) {
        const s = new Set<string>();
        cohort.criteriaResults.forEach((cr) =>
          cr.atoms.forEach((a) => {
            a.patient_list_yes.forEach((id) => s.add(id));
            a.patient_list_no.forEach((id) => s.add(id));
            a.patient_list_unknown.forEach((id) => s.add(id));
          }),
        );
        return s.size;
      }
      return cohort?.cohortScope?.S1_diagnosis_or_seed_count ?? cohort?.patients.length ?? 0;
    })();

    const totalCriteria = criterionRows.length;
    const strCriteria = criterionRows.filter((c) => c.mixedness === 'all-structured').length;
    const unstrCriteria = totalCriteria - strCriteria;
    const totalAtoms = atomRows.length;
    const eligibleCount = cohort?.metadata.eligibleCount ?? 0;

    return { totalPatients, totalCriteria, strCriteria, unstrCriteria, totalAtoms, eligibleCount };
  }, [criterionRows, atomRows, cohort]);

  /* ── Project-level StatusRollup ── */
  const projectStatus = useMemo(() => {
    const statuses = criterionRows.map((c) => c.status);
    const worst = worstStatus(statuses);
    const completed = criterionRows.filter(
      (c) => c.status === 'auto-validated' || c.status === 'validated',
    ).length;
    return { worst, completed, total: criterionRows.length };
  }, [criterionRows]);

  /* ── Review dashboard rows (one per criterion with unstructured atoms) ── */
  const reviewRows = useMemo<ReviewRow[]>(() => {
    if (!cohort?.criteriaResults) return [];

    return criterionRows
      .filter((cr) => cr.unstructuredAtoms.length > 0)
      .map((cr) => {
        const crResult = cohort.criteriaResults!.find((r) => r.criterion_id === cr.id);
        if (!crResult) return null;

        const patientsToReview = new Set<string>();
        for (const atom of crResult.atoms) {
          atom.patient_list_no_unstructured.forEach((id) => patientsToReview.add(id));
          atom.patient_list_unknown.forEach((id) => patientsToReview.add(id));
        }

        const total = patientsToReview.size;
        if (total === 0) return null;

        const crReviews = reviewItems.filter(
          (ri) => ri.projectId === projectId && patientsToReview.has(ri.patientId),
        );

        const reviewed = crReviews.filter((ri) => ri.decision !== undefined).length;
        const trueCount = crReviews.filter((ri) => ri.decision === 'True').length;
        const falseCount = crReviews.filter((ri) => ri.decision === 'False').length;
        const unclearCount = crReviews.filter((ri) => ri.decision === 'Unclear').length;

        return {
          label: cr.name,
          reviewed,
          total,
          trueCount,
          falseCount,
          unclearCount,
        } satisfies ReviewRow;
      })
      .filter((r): r is ReviewRow => r !== null);
  }, [cohort, criterionRows, reviewItems, projectId]);

  /* ── Category list (ordered) ── */
  const categories = useMemo(() => {
    const cats = new Set(criterionRows.map((c) => c.category));
    const ordered: string[] = [];
    for (const c of CATEGORY_ORDER) {
      if (cats.has(c)) { ordered.push(c); cats.delete(c); }
    }
    for (const c of cats) ordered.push(c);
    return ordered;
  }, [criterionRows]);

  /* ── Apply filters via shared applyCriterionFilters ── */
  const filteredRows = useMemo(() => {
    // Map local filters to FilterState shape expected by shared.ts
    const sharedFilters: FilterState = {
      ...DEFAULT_FILTERS,
      view: filters.view,
      cat: filters.cat ? [filters.cat] : [],
      q: filters.q,
    };
    return applyCriterionFilters(criterionRows, sharedFilters);
  }, [criterionRows, filters]);

  /* ── Active filter check ── */
  const hasActiveFilters =
    filters.q !== '' || filters.view !== 'unstructured' || filters.cat !== null;

  const clearFilters = () => setFilters(INITIAL_FILTERS);

  /* ── Guard ── */
  if (!project || !cohort) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <XCircle className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Project or cohort not found</p>
          <button
            onClick={() => nav('/projects')}
            className="mt-2 text-sm text-primary underline cursor-pointer"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav('/projects')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <FlaskConical className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold">{project.name}</h1>
              <Badge className="text-[10px] px-2 py-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
                CT
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {cohort.metadata.trialName} &middot; {cohort.metadata.trialPhase} &middot;{' '}
              {cohort.metadata.indication}
            </p>
            <div className="mt-1.5">
              <StatusRollup
                status={projectStatus.worst}
                completed={projectStatus.completed}
                total={projectStatus.total}
                label="criteria"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => nav(`/projects/${projectId}/ct-funnel`)}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-muted cursor-pointer transition-colors"
          >
            <Layers className="h-3.5 w-3.5" /> View Funnel
          </button>
          <button
            onClick={() => nav(`/projects/${projectId}/ct-matrix`)}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-muted cursor-pointer transition-colors"
          >
            <Database className="h-3.5 w-3.5" /> View Matrix
          </button>
        </div>
      </div>

      {/* ── Stats Row: 4 cards ── */}
      <div className="grid grid-cols-4 gap-3">
        {/* Patients */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Patients</p>
          </div>
          <p className="text-2xl font-bold">{fmt(stats.totalPatients)}</p>
        </div>

        {/* Criteria */}
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Criteria</p>
          <p className="text-2xl font-bold">{stats.totalCriteria}</p>
          <p className="text-[10px] text-muted-foreground">
            {stats.strCriteria} structured / {stats.unstrCriteria} unstructured
          </p>
        </div>

        {/* Atoms */}
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Atoms</p>
          <p className="text-2xl font-bold">{fmt(stats.totalAtoms)}</p>
        </div>

        {/* Eligible */}
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Eligible</p>
          <p className="text-2xl font-bold text-emerald-600">{fmt(stats.eligibleCount)}</p>
          {stats.totalPatients > 0 && (
            <p className="text-[10px] text-muted-foreground">
              {Math.round((stats.eligibleCount / stats.totalPatients) * 100)}% of cohort
            </p>
          )}
        </div>
      </div>

      {/* ── Review Dashboard (only when unstructured atoms exist) ── */}
      {reviewRows.length > 0 && (
        <ReviewSummary title="Review Dashboard" rows={reviewRows} />
      )}

      {/* ── Filter Bar ── */}
      <div className="rounded-xl border bg-card px-5 py-4 space-y-3">
        {/* Row 1: search + segmented control */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Search criteria, categories..."
              className="pl-9 h-9 text-sm"
            />
          </div>
          {/* Segmented control */}
          <div className="flex rounded-lg border overflow-hidden">
            {VIEW_SEGMENTS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilters((f) => ({ ...f, view: key }))}
                className={`px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                  filters.view === key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: category chips + clear */}
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map((cat) => {
            const m = getCategoryMeta(cat);
            const active = filters.cat === cat;
            return (
              <button
                key={cat}
                onClick={() => setFilters((f) => ({ ...f, cat: active ? null : cat }))}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold cursor-pointer border transition-colors ${
                  active
                    ? `${m.bgColor} ${m.color} border-current`
                    : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                }`}
              >
                {m.icon} {cat}
              </button>
            );
          })}

          {hasActiveFilters && (
            <>
              <div className="h-4 w-px bg-border mx-1" />
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold text-red-500 hover:bg-red-500/10 cursor-pointer"
              >
                <XCircle className="h-3 w-3" /> Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Criteria Cards ── */}
      <div className="space-y-3">
        {filteredRows.map((row) => {
          const isAllStr = row.mixedness === 'all-structured';
          const borderCls = isAllStr
            ? 'border-blue-200 dark:border-blue-800'
            : row.mixedness === 'mixed'
            ? 'border-indigo-200 dark:border-indigo-800'
            : 'border-amber-200 dark:border-amber-800';
          const bgCls = isAllStr
            ? 'bg-blue-50/30 dark:bg-blue-950/20'
            : row.mixedness === 'mixed'
            ? 'bg-indigo-50/30 dark:bg-indigo-950/20'
            : 'bg-amber-50/30 dark:bg-amber-950/20';
          const catMeta = getCategoryMeta(row.category);

          return (
            <button
              key={row.id}
              onClick={() => nav(`/projects/${projectId}/ct-criteria/${row.id}`)}
              className={`w-full rounded-xl border ${borderCls} ${bgCls} p-4 text-left cursor-pointer hover:shadow-md transition-shadow group`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left side */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <MixednessDot mixedness={row.mixedness} />
                    <span className="text-xs font-bold text-muted-foreground">C{row.index}</span>
                    <Badge
                      variant={row.type === 'inclusion' ? 'success' : 'destructive'}
                      className="text-[9px] px-1.5 py-0"
                    >
                      {row.type === 'inclusion' ? 'INC' : 'EXC'}
                    </Badge>
                    <span className="text-sm font-semibold truncate">{row.name}</span>
                  </div>

                  {/* Category badge */}
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${catMeta.bgColor} ${catMeta.color}`}
                    >
                      {catMeta.icon} {row.category}
                    </span>
                  </div>

                  {/* Atom breakdown */}
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                    <span>{row.atoms.length} atom{row.atoms.length !== 1 ? 's' : ''}</span>
                    <span>&middot;</span>
                    <span className="text-blue-600">{row.structuredAtoms.length} structured</span>
                    <span>/</span>
                    <span className="text-amber-600">{row.unstructuredAtoms.length} unstructured</span>
                  </div>
                </div>

                {/* Right side */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {/* StatusRollup */}
                  <StatusRollup
                    status={row.status}
                    completed={row.atoms.filter((a) => a.status === 'auto-validated').length}
                    total={row.atoms.length}
                    label="atoms"
                  />

                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          row.pctComplete >= 100
                            ? 'bg-emerald-500'
                            : isAllStr
                            ? 'bg-blue-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${row.pctComplete}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold tabular-nums text-muted-foreground">
                      {row.pctComplete}%
                    </span>
                  </div>

                  {/* Chevron */}
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            </button>
          );
        })}

        {filteredRows.length === 0 && (
          <div className="rounded-xl border bg-card px-5 py-12 text-center space-y-2">
            <p className="text-sm font-medium text-muted-foreground">No criteria match your filters.</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-primary underline cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
