import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, FileText, Settings2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AtomRowData, AtomStatus } from './shared';

/* ─── Status config ─── */

const STATUS_STYLES: Record<AtomStatus, { dot: string; label: string; tone: string }> = {
  'auto-validated': { dot: 'bg-emerald-500', label: 'Auto-validated', tone: 'text-emerald-600' },
  'needs-config':   { dot: 'bg-amber-500',   label: 'Needs config',   tone: 'text-amber-600' },
  'in-progress':    { dot: 'bg-blue-500',     label: 'In progress',   tone: 'text-blue-600' },
};

/* ─── MiniBar ─── */

function MiniBar({ yes, no, unknown }: { yes: number; no: number; unknown: number }) {
  const total = yes + no + unknown || 1;
  const title = `Yes: ${yes} · No: ${no} · Unknown: ${unknown}`;
  return (
    <div
      title={title}
      className="flex h-1.5 w-28 overflow-hidden rounded-full bg-muted"
      role="img"
      aria-label={title}
    >
      <span className="h-full bg-emerald-500" style={{ width: `${(yes / total) * 100}%` }} />
      <span className="h-full bg-slate-400"   style={{ width: `${(no / total) * 100}%` }} />
      <span className="h-full bg-amber-500"   style={{ width: `${(unknown / total) * 100}%` }} />
    </div>
  );
}

/* ─── AtomRow ─── */

export function AtomRow({
  row,
  defaultExpanded = false,
}: {
  row: AtomRowData;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const isUnstructured = row.dataSource === 'unstructured';
  const statusStyle = STATUS_STYLES[row.status];

  /* Pending = noUnstructured + unknown for unstructured atoms */
  const pendingCount = isUnstructured ? row.noUnstructured + row.unknown : 0;

  /* Border / tint per data source */
  const containerCls = cn(
    'rounded-lg border transition-colors',
    isUnstructured
      ? 'border-amber-200 bg-amber-50/40 dark:border-amber-800/40 dark:bg-amber-950/20'
      : 'border-blue-200 bg-blue-50/40 dark:border-blue-800/40 dark:bg-blue-950/20',
  );

  /* Color dot */
  const dotCls = isUnstructured
    ? 'bg-amber-400'
    : 'bg-blue-400';
  const dotLabel = isUnstructured ? 'Unstructured' : 'Structured';

  return (
    <div className={containerCls}>
      {/* ── Collapsed header (clickable button) ── */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        className="w-full cursor-pointer select-none px-3 pt-2.5 pb-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        {/* Line 1 */}
        <div className="flex items-center gap-2">
          {/* Color dot with aria label text hidden visually */}
          <span
            className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', dotCls)}
            aria-label={dotLabel}
            title={dotLabel}
          />

          {/* INC / EXC badge */}
          <Badge
            variant={row.parentCriterionType === 'inclusion' ? 'success' : 'destructive'}
            className="flex-shrink-0 px-1.5 py-0 text-[10px] font-bold"
          >
            {row.parentCriterionType === 'inclusion' ? 'INC' : 'EXC'}
          </Badge>

          {/* Atom label */}
          <span className="flex-1 truncate text-sm font-semibold text-foreground">
            {row.label}
          </span>

          {/* Category badge */}
          <Badge
            variant="secondary"
            className="hidden flex-shrink-0 px-1.5 py-0 text-[10px] sm:inline-flex"
          >
            {row.category}
          </Badge>

          {/* C# · k/n muted */}
          <span className="flex-shrink-0 text-[11px] text-muted-foreground">
            C{row.parentCriterionIndex} · {row.atomIndex}/{row.atomTotal}
          </span>

          {/* Chevron */}
          <ChevronDown
            className={cn(
              'h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200',
              expanded && 'rotate-180',
            )}
            aria-hidden="true"
          />
        </div>

        {/* Line 2 */}
        <div className="mt-1.5 flex items-center gap-3">
          {/* Yes / No / Unknown counts */}
          <span className="text-[11px] text-muted-foreground">
            <span className="text-emerald-600 font-medium">Yes {row.yes}</span>
            {' · '}
            <span className="text-slate-500">No {row.no}</span>
            {' · '}
            <span className="text-amber-600">Unknown {row.unknown}</span>
          </span>

          {/* Mini bar */}
          <MiniBar yes={row.yes} no={row.no} unknown={row.unknown} />

          {/* Spacer */}
          <span className="flex-1" />

          {/* Status dot + text */}
          <span className="flex items-center gap-1.5 text-[11px]">
            <span
              className={cn('h-1.5 w-1.5 rounded-full', statusStyle.dot)}
              aria-hidden="true"
            />
            <span className={cn('font-medium', statusStyle.tone)}>{statusStyle.label}</span>
            {pendingCount > 0 && (
              <span className="text-muted-foreground">
                · {pendingCount} pending
              </span>
            )}
          </span>
        </div>
      </button>

      {/* ── Expanded detail panel ── */}
      {expanded && (
        <div className="border-t border-inherit px-4 py-3 space-y-3">
          {/* Metadata strip */}
          <div className="font-mono text-[11px] text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5">
            <span>{row.label}</span>
            <span aria-hidden="true">·</span>
            <span className="italic">{row.category}</span>
            <span aria-hidden="true">·</span>
            <span
              className={cn(
                'font-semibold',
                isUnstructured ? 'text-amber-600' : 'text-blue-600',
              )}
            >
              {isUnstructured ? 'Unstructured' : 'Structured'}
            </span>
          </div>

          {/* Patient split detail — unstructured only */}
          {isUnstructured && (
            <div className="rounded-md bg-amber-500/8 px-3 py-2 space-y-1">
              <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-1">
                Patient Split Detail
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                <span className="text-muted-foreground">
                  No-Structured:{' '}
                  <span className="font-medium text-foreground">{row.noStructured}</span>
                </span>
                <span className="text-amber-600">
                  No-Unstructured:{' '}
                  <span className="font-semibold">{row.noUnstructured}</span>{' '}
                  <span className="text-muted-foreground font-normal">(needs LLM)</span>
                </span>
                <span className="text-amber-600">
                  Unknown:{' '}
                  <span className="font-semibold">{row.unknown}</span>{' '}
                  <span className="text-muted-foreground font-normal">(needs review)</span>
                </span>
              </div>
              {(row.noUnstructured + row.unknown) > 0 && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium pt-0.5">
                  Sum:{' '}
                  <span className="font-bold">{row.noUnstructured + row.unknown}</span>{' '}
                  require attention
                </p>
              )}
            </div>
          )}

          {/* Evidence source */}
          {row.gcpPaths.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <FileText className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              <span>
                {row.gcpPaths.length} evidence{' '}
                {row.gcpPaths.length === 1 ? 'file' : 'files'} available
              </span>
            </div>
          )}

          {/* Keywords (if present, shown for in-progress atoms) */}
          {row.keywords && row.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {row.keywords.map((kw) => (
                <Badge
                  key={kw}
                  variant="secondary"
                  className="px-1.5 py-0 text-[10px]"
                >
                  {kw}
                </Badge>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="pt-0.5">
            {isUnstructured ? (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1 transition-colors"
              >
                <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                Configure prompt →
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Auto-validated · no config needed
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
