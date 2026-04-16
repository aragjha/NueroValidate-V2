import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export type ReviewRow = {
  label: string;
  reviewed: number;
  total: number;
  trueCount: number;
  falseCount: number;
  unclearCount: number;
};

type Props = {
  title: string;
  rows: ReviewRow[];
};

export function ReviewSummary({ title, rows }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (rows.length === 0) return null;

  /* ── Aggregate totals ── */
  const totals = rows.reduce(
    (acc, r) => ({
      reviewed: acc.reviewed + r.reviewed,
      total: acc.total + r.total,
      trueCount: acc.trueCount + r.trueCount,
      falseCount: acc.falseCount + r.falseCount,
      unclearCount: acc.unclearCount + r.unclearCount,
    }),
    { reviewed: 0, total: 0, trueCount: 0, falseCount: 0, unclearCount: 0 },
  );

  const pending = totals.total - totals.reviewed;

  /* ── Stacked bar segments ── */
  const safeTotal = totals.total || 1;
  const truePct = (totals.trueCount / safeTotal) * 100;
  const falsePct = (totals.falseCount / safeTotal) * 100;
  const unclearPct = (totals.unclearCount / safeTotal) * 100;
  const pendingPct = (pending / safeTotal) * 100;

  const barTitle = `True: ${totals.trueCount} | False: ${totals.falseCount} | Unclear: ${totals.unclearCount} | Pending: ${pending} | Total: ${totals.total}`;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      {/* ── Collapsible header ── */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full text-left cursor-pointer group"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
          {title}
        </h3>
      </button>

      {/* ── Stacked bar (always visible) ── */}
      <div
        className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
        title={barTitle}
        aria-label={barTitle}
      >
        {truePct > 0 && (
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${truePct}%` }}
          />
        )}
        {falsePct > 0 && (
          <div
            className="h-full bg-red-500 transition-all"
            style={{ width: `${falsePct}%` }}
          />
        )}
        {unclearPct > 0 && (
          <div
            className="h-full bg-amber-400 transition-all"
            style={{ width: `${unclearPct}%` }}
          />
        )}
        {pendingPct > 0 && (
          <div
            className="h-full bg-muted-foreground/20 transition-all"
            style={{ width: `${pendingPct}%` }}
          />
        )}
      </div>

      {/* ── Stats line (always visible) ── */}
      <p className="text-[11px] text-muted-foreground tabular-nums">
        <span className="font-semibold text-foreground">{totals.reviewed}</span> reviewed /{' '}
        <span className="font-semibold text-foreground">{totals.total}</span> total
        <span className="mx-1.5 text-muted-foreground/50">&middot;</span>
        <span className="text-emerald-600 font-semibold">{totals.trueCount} True</span>
        <span className="mx-1 text-muted-foreground/50">&middot;</span>
        <span className="text-red-500 font-semibold">{totals.falseCount} False</span>
        <span className="mx-1 text-muted-foreground/50">&middot;</span>
        <span className="text-amber-500 font-semibold">{totals.unclearCount} Unclear</span>
        <span className="mx-1 text-muted-foreground/50">&middot;</span>
        <span className="text-muted-foreground">{pending} Pending</span>
      </p>

      {/* ── Mini-table (expanded only) ── */}
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="py-1.5 pr-3 text-left font-semibold">Label</th>
                <th className="py-1.5 px-2 text-right font-semibold">Reviewed</th>
                <th className="py-1.5 px-2 text-right font-semibold text-emerald-600">True</th>
                <th className="py-1.5 px-2 text-right font-semibold text-red-500">False</th>
                <th className="py-1.5 px-2 text-right font-semibold text-amber-500">Unclear</th>
                <th className="py-1.5 pl-2 text-right font-semibold text-muted-foreground">Pending</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const rowPending = row.total - row.reviewed;
                return (
                  <tr
                    key={idx}
                    className="border-b border-muted/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-1 pr-3 text-left text-foreground/80 max-w-[200px] truncate" title={row.label}>
                      {row.label}
                    </td>
                    <td className="py-1 px-2 text-right tabular-nums">
                      {row.reviewed}/{row.total}
                    </td>
                    <td className="py-1 px-2 text-right tabular-nums text-emerald-600 font-semibold">
                      {row.trueCount}
                    </td>
                    <td className="py-1 px-2 text-right tabular-nums text-red-500 font-semibold">
                      {row.falseCount}
                    </td>
                    <td className="py-1 px-2 text-right tabular-nums text-amber-500 font-semibold">
                      {row.unclearCount}
                    </td>
                    <td className="py-1 pl-2 text-right tabular-nums text-muted-foreground">
                      {rowPending}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
