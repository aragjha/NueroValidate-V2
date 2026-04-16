import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { ReviewItem } from '@/types';

type Props = {
  patientIds: string[];
  reviewItems: ReviewItem[];
  onDecision: (
    encounterId: string,
    decision: 'True' | 'False' | 'Unclear',
    reason: string,
  ) => void;
};

const PAGE_SIZE = 25;

type LlmFilter = 'All' | 'Eligible' | 'Ineligible';
type DecisionFilter = 'All' | 'Pending' | 'Decided';

function llmBadgeVariant(llm?: ReviewItem['llmEligibility']): 'success' | 'destructive' | 'secondary' {
  if (llm === 'Eligible') return 'success';
  if (llm === 'Ineligible') return 'destructive';
  return 'secondary';
}

function decisionBadgeVariant(d?: ReviewItem['decision']): 'success' | 'destructive' | 'warning' | 'secondary' {
  if (d === 'True') return 'success';
  if (d === 'False') return 'destructive';
  if (d === 'Unclear') return 'warning';
  return 'secondary';
}

export function PatientReviewTab({ patientIds, reviewItems, onDecision }: Props) {
  const [search, setSearch] = useState('');
  const [llmFilter, setLlmFilter] = useState<LlmFilter>('All');
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>('All');
  const [page, setPage] = useState(1);

  /* Build row set: reviewItems that are in scope (patientIds from this atom) */
  const rows = useMemo(() => {
    const pidSet = new Set(patientIds);
    return reviewItems.filter((ri) => pidSet.has(ri.patientId));
  }, [patientIds, reviewItems]);

  /* Filtered rows */
  const filtered = useMemo(() => {
    return rows.filter((ri) => {
      if (search && !ri.patientId.toLowerCase().includes(search.toLowerCase())) return false;
      if (llmFilter !== 'All' && ri.llmEligibility !== llmFilter) return false;
      if (decisionFilter === 'Pending' && ri.decision) return false;
      if (decisionFilter === 'Decided' && !ri.decision) return false;
      return true;
    });
  }, [rows, search, llmFilter, decisionFilter]);

  /* Pagination */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSearchChange(val: string) {
    setSearch(val);
    setPage(1);
  }

  function handleLlmFilter(val: string) {
    setLlmFilter(val as LlmFilter);
    setPage(1);
  }

  function handleDecisionFilter(val: string) {
    setDecisionFilter(val as DecisionFilter);
    setPage(1);
  }

  /* Empty state */
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <Users className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">No patients to review.</p>
        <p className="text-xs">Run extraction first to populate patient review items.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="h-8 w-52 text-xs"
          placeholder="Search patient ID..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <Select
          className="h-8 w-40 text-xs"
          value={llmFilter}
          onChange={(e) => handleLlmFilter(e.target.value)}
        >
          <option value="All">All LLM results</option>
          <option value="Eligible">Eligible</option>
          <option value="Ineligible">Ineligible</option>
        </Select>
        <Select
          className="h-8 w-36 text-xs"
          value={decisionFilter}
          onChange={(e) => handleDecisionFilter(e.target.value)}
        >
          <option value="All">All decisions</option>
          <option value="Pending">Pending</option>
          <option value="Decided">Decided</option>
        </Select>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filtered.length.toLocaleString()} row{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border py-12 text-muted-foreground">
          <Users className="h-8 w-8 opacity-20" />
          <p className="text-sm">No rows match the current filters.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
                  <th className="px-3 py-2.5">Patient ID</th>
                  <th className="px-3 py-2.5">Encounter ID</th>
                  <th className="px-3 py-2.5">LLM Result</th>
                  <th className="px-3 py-2.5 max-w-[260px]">LLM Reason</th>
                  <th className="px-3 py-2.5">Decision</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((ri) => (
                  <ReviewRow key={ri.encounterId} item={ri} onDecision={onDecision} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {safePage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {/* Page pills — show up to 7 */}
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pg = i + 1;
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-medium transition-colors ${
                    pg === safePage
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted'
                  }`}
                >
                  {pg}
                </button>
              );
            })}
            {totalPages > 7 && <span className="px-1">…</span>}
            <button
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Row component with inline decision dropdown ── */

type RowProps = {
  item: ReviewItem;
  onDecision: Props['onDecision'];
};

function ReviewRow({ item, onDecision }: RowProps) {
  const [localDecision, setLocalDecision] = useState<string>(item.decision ?? '');

  function handleDecisionChange(val: string) {
    setLocalDecision(val);
    if (val === 'True' || val === 'False' || val === 'Unclear') {
      onDecision(item.encounterId, val, item.reason ?? '');
    }
  }

  const hasDecision = !!item.decision;

  return (
    <tr className={`border-t transition-colors hover:bg-muted/20 ${hasDecision ? '' : 'bg-amber-500/3'}`}>
      {/* Patient ID */}
      <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">
        {item.patientId}
      </td>
      {/* Encounter ID */}
      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
        {item.encounterId}
      </td>
      {/* LLM Result */}
      <td className="px-3 py-2.5">
        {item.llmEligibility ? (
          <Badge variant={llmBadgeVariant(item.llmEligibility)} className="text-[10px] px-2 py-0">
            {item.llmEligibility}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground italic">—</span>
        )}
      </td>
      {/* LLM Reason */}
      <td className="px-3 py-2.5 max-w-[260px]">
        {item.llmReason ? (
          <span
            className="block text-xs text-muted-foreground truncate"
            title={item.llmReason}
          >
            {item.llmReason}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground italic">—</span>
        )}
      </td>
      {/* Decision dropdown */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Select
            className="h-7 w-32 text-xs"
            value={localDecision}
            onChange={(e) => handleDecisionChange(e.target.value)}
          >
            <option value="">Pending</option>
            <option value="True">True</option>
            <option value="False">False</option>
            <option value="Unclear">Unclear</option>
          </Select>
          {item.decision && (
            <Badge
              variant={decisionBadgeVariant(item.decision)}
              className="text-[10px] px-2 py-0"
            >
              {item.decision}
            </Badge>
          )}
        </div>
      </td>
    </tr>
  );
}

export default PatientReviewTab;
