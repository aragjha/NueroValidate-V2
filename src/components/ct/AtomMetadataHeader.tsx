import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatusRollup, worstStatus } from '@/components/ct/StatusRollup';
import type { AtomRowData, CriterionRowData } from '@/components/vault/shared';
import type { AtomStatus } from '@/components/ct/StatusRollup';

/* ─── Category badge color map (matches CTFunnelPage / CTOverviewPage) ─── */
const CATEGORY_COLORS: Record<string, string> = {
  Demographics: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  Diagnosis:    'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  Labs:         'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  Imaging:      'bg-pink-500/15 text-pink-700 dark:text-pink-400',
  Medications:  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  Procedures:   'bg-red-500/15 text-red-700 dark:text-red-400',
  Clinical:     'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400',
};

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? 'bg-muted/60 text-muted-foreground';
}

/* ─── Props ─── */

type Props = {
  atom: AtomRowData;
  criterion: CriterionRowData;
  allCriteria: CriterionRowData[];
  projectId: string;
  projectName: string;
  reviewedCount: number;
  totalToReview: number;
};

/* ─── Component ─── */

export function AtomMetadataHeader({
  atom,
  criterion,
  allCriteria,
  projectId,
  projectName,
  reviewedCount,
  totalToReview,
}: Props) {
  const nav = useNavigate();

  /* ── Derived status values ── */

  // Project-level: worst status across all criteria
  const projectStatuses: AtomStatus[] = allCriteria.map((c) => c.status as AtomStatus);
  const projectStatus = worstStatus(projectStatuses.length > 0 ? projectStatuses : ['needs-config']);
  const projectCompleted = allCriteria.filter(
    (c) => c.status === 'auto-validated' || c.status === 'validated',
  ).length;
  const projectTotal = allCriteria.length;

  // Criterion-level: worst status across its atoms
  const criterionAtomStatuses: AtomStatus[] = criterion.atoms.map((a) => a.status as AtomStatus);
  const criterionStatus = worstStatus(criterionAtomStatuses.length > 0 ? criterionAtomStatuses : ['needs-config']);
  const criterionCompleted = criterion.atoms.filter(
    (a) => a.status === 'auto-validated' || a.status === 'validated',
  ).length;
  const criterionTotal = criterion.atoms.length;

  /* ── Patient split bar ── */
  const total = atom.yes + atom.no + atom.unknown;
  const yesPct  = total > 0 ? (atom.yes   / total) * 100 : 0;
  const noPct   = total > 0 ? (atom.no    / total) * 100 : 0;
  // unknownPct fills the remainder

  const isStructured = atom.dataSource === 'structured';

  return (
    <div className="space-y-3">
      {/* ── 1. Breadcrumb ── */}
      <nav className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
        {/* Back arrow + project */}
        <button
          onClick={() => nav(`/projects/${projectId}/ct-overview`)}
          className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
          aria-label="Back to project overview"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
          <span className="font-semibold text-foreground">{projectName}</span>
        </button>
        <span className="ml-1">
          <StatusRollup
            status={projectStatus}
            completed={projectCompleted}
            total={projectTotal}
            label="criteria"
          />
        </span>

        <ChevronRight className="h-3 w-3 shrink-0 mx-0.5" />

        {/* Criterion segment */}
        <button
          onClick={() => nav(`/projects/${projectId}/ct-criteria/${criterion.id}`)}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer"
        >
          <span className="font-semibold text-foreground">
            C{criterion.index}&nbsp;·&nbsp;{criterion.name}
          </span>
        </button>
        <span className="ml-1">
          <StatusRollup
            status={criterionStatus}
            completed={criterionCompleted}
            total={criterionTotal}
            label="atoms"
          />
        </span>

        <ChevronRight className="h-3 w-3 shrink-0 mx-0.5" />

        {/* Atom segment — not clickable, current location */}
        <span className="font-semibold text-foreground">
          A{atom.atomIndex}&nbsp;·&nbsp;{atom.label}
        </span>
      </nav>

      {/* ── 2. Atom identity block ── */}
      <div className="rounded-xl border bg-card px-5 py-4 space-y-3">
        {/* Label + badges row */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold leading-tight">{atom.label}</h1>
            {/* Mono muted strip: concept_label · operator · polarity */}
            {(atom.conceptLabel || atom.operator || atom.polarity) && (
              <p className="font-mono text-xs text-muted-foreground">
                {[atom.conceptLabel, atom.operator, atom.polarity].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Category badge */}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${categoryColor(atom.category)}`}
            >
              {atom.category}
            </span>
            {/* INC / EXC badge */}
            <Badge
              variant={atom.parentCriterionType === 'inclusion' ? 'success' : 'destructive'}
              className="text-[10px] px-2 py-0"
            >
              {atom.parentCriterionType === 'inclusion' ? 'INC' : 'EXC'}
            </Badge>
            {/* Structured / Unstructured color dot */}
            <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${isStructured ? 'bg-blue-500' : 'bg-amber-500'}`}
              />
              {isStructured ? 'Structured' : 'Unstructured'}
            </span>
          </div>
        </div>

        {/* ── 3. Status + mini-bar + patient split ── */}
        <div className="space-y-2">
          {/* StatusRollup at atom level (reviewed vs total) */}
          <StatusRollup
            status={atom.status as AtomStatus}
            completed={reviewedCount}
            total={totalToReview}
            label="patients"
          />

          {/* Horizontal mini-bar */}
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
            {yesPct > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${yesPct}%` }}
                title={`Yes: ${atom.yes}`}
              />
            )}
            {noPct > 0 && (
              <div
                className="h-full bg-muted-foreground/40 transition-all"
                style={{ width: `${noPct}%` }}
                title={`No: ${atom.no}`}
              />
            )}
            {/* Remaining = unknown — amber */}
            {total > 0 && atom.unknown > 0 && (
              <div
                className="h-full bg-amber-400/70 transition-all"
                style={{ width: `${100 - yesPct - noPct}%` }}
                title={`Unknown: ${atom.unknown}`}
              />
            )}
          </div>

          {/* ── 4. Patient split summary ── */}
          <p className="text-xs text-muted-foreground tabular-nums">
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Yes {atom.yes}</span>
            {' · '}
            <span className="font-semibold text-foreground">
              No {atom.no}
            </span>
            <span className="text-muted-foreground">
              {' '}(str&nbsp;{atom.noStructured},&nbsp;unstr&nbsp;{atom.noUnstructured})
            </span>
            {' · '}
            <span className="text-amber-700 dark:text-amber-400 font-semibold">Unknown {atom.unknown}</span>
          </p>
        </div>
      </div>

      {/* ── 5. Structured auto-validated banner ── */}
      {isStructured && (
        <div className="flex items-center gap-2.5 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-500/10 px-4 py-2.5 text-sm text-blue-700 dark:text-blue-300">
          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
          <span>
            This atom is auto-validated from structured data.&nbsp;
            <span className="font-semibold">No configuration or review needed.</span>
          </span>
        </div>
      )}
    </div>
  );
}

export default AtomMetadataHeader;
