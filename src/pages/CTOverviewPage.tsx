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
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Brain, ChevronDown, ChevronRight, ChevronUp, Circle, Database, Eye, FlaskConical,
  HeartPulse, Inbox, Layers, Pill, Play, Scissors, Search, Stethoscope, TestTubes, Users, XCircle,
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

/* ── Local filter state (not URL-synced) ── */

type LocalFilters = {
  q: string;
  view: ViewSegment;
  cat: string | null;
  status: 'all' | 'not-started' | 'in-progress' | 'reviewed';
};

const INITIAL_FILTERS: LocalFilters = {
  q: '',
  view: 'all',
  cat: null,
  status: 'all',
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

  /* ── Unstructured atoms (Review Queue) ── */
  type AtomTask = {
    id: string;
    label: string;
    parentCriterionId: string;
    parentCriterionName: string;
    parentCriterionType: 'inclusion' | 'exclusion';
    category: string;
    totalPatients: number;
    reviewed: number;
    status: 'not-started' | 'in-progress' | 'reviewed';
  };

  const reviewQueue = useMemo<AtomTask[]>(() => {
    const tasks: AtomTask[] = atomRows
      .filter((a) => a.dataSource === 'unstructured')
      .map((a) => {
        const patientsToReview = a.noUnstructured + a.unknown;
        const riForCrit = reviewItems.filter(
          (ri) => ri.projectId === projectId && ri.criterionName === a.parentCriterionName,
        );
        const reviewed = riForCrit.filter((ri) => ri.decision !== undefined).length;
        const totalPatients = Math.max(patientsToReview, riForCrit.length);
        const status: AtomTask['status'] = totalPatients === 0 || reviewed >= totalPatients
          ? 'reviewed'
          : reviewed > 0
            ? 'in-progress'
            : 'not-started';
        return {
          id: a.id,
          label: a.label,
          parentCriterionId: a.parentCriterionId,
          parentCriterionName: a.parentCriterionName,
          parentCriterionType: a.parentCriterionType,
          category: a.category,
          totalPatients,
          reviewed,
          status,
        };
      });

    // Filter
    const q = filters.q.trim().toLowerCase();
    let out = tasks.filter((t) => {
      if (filters.cat && t.category !== filters.cat) return false;
      if (filters.status !== 'all' && t.status !== filters.status) return false;
      if (!q) return true;
      return (
        t.label.toLowerCase().includes(q) ||
        t.parentCriterionName.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
    // Sort: not-started → in-progress → reviewed
    const order: Record<AtomTask['status'], number> = { 'not-started': 0, 'in-progress': 1, reviewed: 2 };
    out = [...out].sort((a, b) => order[a.status] - order[b.status]);
    return out;
  }, [atomRows, reviewItems, projectId, filters]);

  /* ── Structured atoms (auto-validated) ── */
  const structuredAtoms = useMemo(() => {
    return atomRows.filter((a) => a.dataSource === 'structured');
  }, [atomRows]);

  const queueCounts = useMemo(() => {
    const total = reviewQueue.length;
    const notStarted = reviewQueue.filter((t) => t.status === 'not-started').length;
    const inProgress = reviewQueue.filter((t) => t.status === 'in-progress').length;
    const reviewed = reviewQueue.filter((t) => t.status === 'reviewed').length;
    return { total, notStarted, inProgress, reviewed };
  }, [reviewQueue]);

  const [structuredOpen, setStructuredOpen] = useState(false);
  const [structuredAtomSheetId, setStructuredAtomSheetId] = useState<string | null>(null);

  const structuredAtomInSheet = useMemo(
    () => (structuredAtomSheetId ? atomRows.find((a) => a.id === structuredAtomSheetId) ?? null : null),
    [structuredAtomSheetId, atomRows],
  );

  /* ── Active filter check ── */
  const hasActiveFilters =
    filters.q !== '' || filters.view !== 'all' || filters.cat !== null || filters.status !== 'all';

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

      {/* ═══ YOUR REVIEW QUEUE — Primary section ═══ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Inbox className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-bold">Your Review Queue</h2>
            <Badge variant="warning" className="text-[10px]">{queueCounts.total} unstructured atom{queueCounts.total !== 1 ? 's' : ''}</Badge>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span><span className="font-semibold text-foreground">{queueCounts.notStarted}</span> not started</span>
            <span>·</span>
            <span><span className="font-semibold text-foreground">{queueCounts.inProgress}</span> in progress</span>
            <span>·</span>
            <span><span className="font-semibold text-emerald-600">{queueCounts.reviewed}</span> reviewed</span>
          </div>
        </div>

        {/* Filter bar */}
        <div className="rounded-xl border bg-card px-4 py-3 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                placeholder="Search atoms, criteria, categories…"
                className="pl-9 h-9 text-sm"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as LocalFilters['status'] }))}
              className="rounded-md border bg-background px-3 py-2 text-xs font-medium cursor-pointer"
            >
              <option value="all">Status: All</option>
              <option value="not-started">Not started</option>
              <option value="in-progress">In progress</option>
              <option value="reviewed">Reviewed</option>
            </select>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-red-500 hover:bg-red-500/10 cursor-pointer"
              >
                <XCircle className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
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
          </div>
        </div>

        {/* Queue cards */}
        <div className="space-y-2">
          {reviewQueue.length === 0 ? (
            <div className="rounded-xl border bg-card px-5 py-12 text-center space-y-2">
              <Inbox className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                {queueCounts.total === 0 ? 'No unstructured atoms in this project — nothing to review.' : 'No atoms match your filters.'}
              </p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-primary underline cursor-pointer">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            reviewQueue.map((task) => {
              const catMeta = getCategoryMeta(task.category);
              const pct = task.totalPatients > 0 ? Math.round((task.reviewed / task.totalPatients) * 100) : 0;
              const statusColor = task.status === 'reviewed' ? 'bg-emerald-500' : task.status === 'in-progress' ? 'bg-amber-500' : 'bg-muted-foreground/40';
              const cta = task.status === 'reviewed' ? 'View review' : task.status === 'in-progress' ? 'Continue review' : 'Start review';
              return (
                <button
                  key={task.id}
                  onClick={() => nav(`/projects/${projectId}/ct-criteria/${task.parentCriterionId}`)}
                  className="w-full rounded-xl border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/20 dark:bg-amber-950/10 p-4 text-left cursor-pointer hover:shadow-md transition-shadow group flex items-start gap-3"
                >
                  <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${statusColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={task.parentCriterionType === 'inclusion' ? 'success' : 'destructive'} className="text-[9px] px-1.5 py-0">
                        {task.parentCriterionType === 'inclusion' ? 'INC' : 'EXC'}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground font-medium truncate">{task.parentCriterionName}</span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-semibold truncate">{task.label}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${catMeta.bgColor} ${catMeta.color}`}>
                        {catMeta.icon} {task.category}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {task.reviewed} / {task.totalPatients} patients reviewed
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-bold tabular-nums text-muted-foreground w-8 text-right">{pct}%</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary group-hover:underline">
                      <Play className="h-3 w-3" /> {cta}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* ═══ Secondary: Structured atoms (auto-validated) ═══ */}
      {structuredAtoms.length > 0 && (
        <section className="space-y-2">
          <button
            onClick={() => setStructuredOpen((v) => !v)}
            className="w-full flex items-center justify-between rounded-xl border bg-blue-50/30 dark:bg-blue-950/10 border-blue-200 dark:border-blue-800/40 px-4 py-3 text-left cursor-pointer hover:bg-blue-50/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              {structuredOpen ? <ChevronUp className="h-4 w-4 text-blue-700 dark:text-blue-400" /> : <ChevronDown className="h-4 w-4 text-blue-700 dark:text-blue-400" />}
              <span className="text-sm font-bold text-blue-700 dark:text-blue-400">Auto-validated (structured)</span>
              <Badge variant="processing" className="text-[10px]">{structuredAtoms.length} atom{structuredAtoms.length !== 1 ? 's' : ''}</Badge>
              <span className="text-[11px] text-blue-700/70 dark:text-blue-400/70 italic ml-1">no review needed</span>
            </div>
          </button>
          {structuredOpen && (
            <div className="rounded-xl border bg-card overflow-hidden divide-y">
              {structuredAtoms.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setStructuredAtomSheetId(a.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <Badge variant={a.parentCriterionType === 'inclusion' ? 'success' : 'destructive'} className="text-[9px] px-1.5 py-0 shrink-0">
                    {a.parentCriterionType === 'inclusion' ? 'INC' : 'EXC'}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground truncate">{a.parentCriterionName}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium flex-1 min-w-0 truncate">{a.label}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">{a.category}</Badge>
                  <span className="text-[11px] text-emerald-600 font-semibold shrink-0">{a.yes || '—'} pass</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 shrink-0">
                    <Eye className="h-3 w-3" /> View data
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ═══ Structured atom data sheet ═══ */}
      <Dialog
        open={structuredAtomInSheet !== null}
        onClose={() => setStructuredAtomSheetId(null)}
        title={structuredAtomInSheet ? `${structuredAtomInSheet.label}` : ''}
        className="max-w-3xl"
      >
        {structuredAtomInSheet && (
          <div className="space-y-4">
            {/* Header summary */}
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b">
              <Badge variant={structuredAtomInSheet.parentCriterionType === 'inclusion' ? 'success' : 'destructive'} className="text-[10px] px-1.5 py-0">
                {structuredAtomInSheet.parentCriterionType === 'inclusion' ? 'INC' : 'EXC'}
              </Badge>
              <span className="text-[11px] text-muted-foreground">{structuredAtomInSheet.parentCriterionName}</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm font-semibold">{structuredAtomInSheet.label}</span>
              <Badge variant="processing" className="text-[10px] ml-auto">Structured · Auto-validated</Badge>
            </div>

            {/* Info banner */}
            <div className="rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50/40 dark:bg-blue-950/20 px-4 py-2.5">
              <p className="text-[11px] text-blue-800 dark:text-blue-300">
                <strong>Auto-validated from mapped table.</strong> This atom is matched directly against a structured database field — no LLM or reviewer action required. You can spot-check below.
              </p>
            </div>

            {/* Keyword chips */}
            {structuredAtomInSheet.keywords && structuredAtomInSheet.keywords.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Possible keywords / concepts</p>
                <div className="flex flex-wrap gap-1.5">
                  {structuredAtomInSheet.keywords.map((kw) => (
                    <Badge key={kw} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Data match counts */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border bg-card px-3 py-2">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Matched</p>
                <p className="text-lg font-bold text-emerald-600">{structuredAtomInSheet.yes.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border bg-card px-3 py-2">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Unmatched</p>
                <p className="text-lg font-bold text-red-600">{structuredAtomInSheet.no.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border bg-card px-3 py-2">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Unknown</p>
                <p className="text-lg font-bold text-muted-foreground">{structuredAtomInSheet.unknown.toLocaleString()}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setStructuredAtomSheetId(null)}
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-muted cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setStructuredAtomSheetId(null);
                  nav(`/projects/${projectId}/ct-atom/${structuredAtomInSheet.id}`);
                }}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer inline-flex items-center gap-1"
              >
                Open in detail <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </Dialog>

      {/* ═══ Tertiary: Criteria drill-down (collapsible below) ═══ */}
      {filteredRows.length > 0 && (
        <section className="space-y-2">
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <h3 className="text-sm font-bold">All criteria</h3>
                <p className="text-[11px] text-muted-foreground">Open a criterion to see its atoms, runs, and prompts</p>
              </div>
              <Badge variant="secondary" className="text-[10px]">{criterionRows.length}</Badge>
            </div>
            <div className="divide-y">
              {criterionRows.map((row) => {
                const catMeta = getCategoryMeta(row.category);
                return (
                  <button
                    key={row.id}
                    onClick={() => nav(`/projects/${projectId}/ct-criteria/${row.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <MixednessDot mixedness={row.mixedness} />
                    <span className="text-xs font-bold text-muted-foreground w-6">C{row.index}</span>
                    <Badge variant={row.type === 'inclusion' ? 'success' : 'destructive'} className="text-[9px] px-1.5 py-0">
                      {row.type === 'inclusion' ? 'INC' : 'EXC'}
                    </Badge>
                    <span className="text-sm font-medium flex-1 min-w-0 truncate">{row.name}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${catMeta.bgColor} ${catMeta.color} shrink-0`}>
                      {catMeta.icon} {row.category}
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{row.atoms.length} atom{row.atoms.length !== 1 ? 's' : ''}</span>
                    <StatusRollup
                      status={row.status}
                      completed={row.atoms.filter((a) => a.status === 'auto-validated').length}
                      total={row.atoms.length}
                      label="atoms"
                    />
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
