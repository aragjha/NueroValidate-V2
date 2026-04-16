import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AtomRow } from './AtomRow';
import type { CriterionRowData, AtomRowData, Mixedness, AtomStatus } from './shared';

/* ─── Helpers ─── */

const INC_EXC_VARIANT = {
  inclusion: 'success',
  exclusion: 'destructive',
} as const;

const STATUS_BADGE_VARIANT: Record<AtomStatus, 'success' | 'warning' | 'processing'> = {
  'auto-validated': 'success',
  validated: 'success',
  'needs-config': 'warning',
  'in-progress': 'processing',
};

const STATUS_LABEL: Record<AtomStatus, string> = {
  'auto-validated': 'Auto-validated',
  validated: 'Validated',
  'needs-config': 'Needs config',
  'in-progress': 'In progress',
};

/* Mixedness dot */
function MixednessDot({ mixedness }: { mixedness: Mixedness }) {
  if (mixedness === 'all-structured') {
    return (
      <span
        className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-blue-500"
        title="All structured"
        aria-label="All structured"
      />
    );
  }
  if (mixedness === 'all-unstructured') {
    return (
      <span
        className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-amber-500"
        title="All unstructured"
        aria-label="All unstructured"
      />
    );
  }
  /* mixed — striped gradient dot */
  return (
    <span
      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
      style={{ background: 'linear-gradient(135deg, #3b82f6 50%, #f59e0b 50%)' }}
      title="Mixed (structured + unstructured)"
      aria-label="Mixed"
    />
  );
}

/* Atom section header */
function AtomSectionHeader({
  tone,
  title,
  count,
  open,
  onToggle,
}: {
  tone: 'amber' | 'blue';
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  const colorCls =
    tone === 'amber'
      ? 'bg-amber-50/60 border-amber-200 text-amber-800 dark:bg-amber-950/20 dark:border-amber-800/40 dark:text-amber-300'
      : 'bg-blue-50/60 border-blue-200 text-blue-800 dark:bg-blue-950/20 dark:border-blue-800/40 dark:text-blue-300';

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer',
        colorCls,
      )}
    >
      <span>
        {title} ({count})
      </span>
      <ChevronDown
        className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')}
        aria-hidden="true"
      />
    </button>
  );
}

/* Inline atom section */
function AtomSection({
  atoms,
  tone,
  title,
  defaultOpen,
}: {
  atoms: AtomRowData[];
  tone: 'amber' | 'blue';
  title: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (atoms.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <AtomSectionHeader
        tone={tone}
        title={title}
        count={atoms.length}
        open={open}
        onToggle={() => setOpen((v) => !v)}
      />
      {open && (
        <div className="space-y-1.5 pl-2">
          {atoms.map((atom) => (
            <AtomRow key={atom.id} row={atom} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── CriterionRow ─── */

function CriterionRow({
  criterion,
  expanded,
  onToggle,
}: {
  criterion: CriterionRowData;
  expanded: boolean;
  onToggle: () => void;
}) {
  const totalAtoms = criterion.atoms.length;

  return (
    <div className="rounded-xl border bg-card transition-shadow hover:shadow-sm">
      {/* Header row — clickable */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="w-full cursor-pointer select-none px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-xl"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mixedness dot */}
          <MixednessDot mixedness={criterion.mixedness} />

          {/* C# label */}
          <span className="shrink-0 text-xs font-mono font-bold text-muted-foreground">
            C{criterion.index}
          </span>

          {/* INC / EXC */}
          <Badge
            variant={INC_EXC_VARIANT[criterion.type]}
            className="shrink-0 px-1.5 py-0 text-[10px] font-bold"
          >
            {criterion.type === 'inclusion' ? 'INC' : 'EXC'}
          </Badge>

          {/* Name */}
          <span className="flex-1 min-w-0 truncate text-sm font-semibold text-foreground">
            {criterion.name}
          </span>

          {/* Category badge */}
          <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px] hidden sm:inline-flex">
            {criterion.category}
          </Badge>

          {/* Atom counts */}
          <span className="shrink-0 text-xs text-muted-foreground">
            {totalAtoms} atom{totalAtoms !== 1 ? 's' : ''}
            {criterion.unstructuredAtoms.length > 0 && (
              <span className="text-amber-600 ml-1">
                · {criterion.unstructuredAtoms.length} unstruct.
              </span>
            )}
          </span>

          {/* Progress bar + % */}
          <div className="shrink-0 flex items-center gap-1.5">
            <div className="relative h-1.5 w-20 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'absolute left-0 top-0 h-full rounded-full transition-all',
                  criterion.pctComplete === 100 ? 'bg-emerald-500' : 'bg-blue-500',
                )}
                style={{ width: `${criterion.pctComplete}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground w-9 text-right">
              {criterion.pctComplete}%
            </span>
          </div>

          {/* Status badge */}
          <Badge
            variant={STATUS_BADGE_VARIANT[criterion.status]}
            className="shrink-0 px-1.5 py-0 text-[10px]"
          >
            {STATUS_LABEL[criterion.status]}
          </Badge>

          {/* Chevron */}
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
              expanded && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </div>
      </button>

      {/* Expanded atom sections */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-2">
          <AtomSection
            atoms={criterion.unstructuredAtoms}
            tone="amber"
            title="Unstructured — needs review"
            defaultOpen={true}
          />
          <AtomSection
            atoms={criterion.structuredAtoms}
            tone="blue"
            title="Structured — auto-validated"
            defaultOpen={false}
          />
          {criterion.atoms.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">No atoms for this criterion.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── CriteriaTab ─── */

interface CriteriaTabProps {
  criteria: CriterionRowData[];
  expandedId: string | null;
  onToggleExpand: (id: string | null) => void;
}

export function CriteriaTab({ criteria, expandedId, onToggleExpand }: CriteriaTabProps) {
  if (criteria.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <p className="text-sm font-medium text-muted-foreground">No criteria found</p>
        <p className="text-xs text-muted-foreground mt-1">
          Try adjusting your filters or import a cohort with criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {criteria.map((criterion) => (
        <CriterionRow
          key={criterion.id}
          criterion={criterion}
          expanded={expandedId === criterion.id}
          onToggle={() =>
            onToggleExpand(expandedId === criterion.id ? null : criterion.id)
          }
        />
      ))}
    </div>
  );
}
