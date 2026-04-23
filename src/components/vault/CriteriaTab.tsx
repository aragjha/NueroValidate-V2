import { Badge } from '@/components/ui/badge';
import type { CriterionRowData } from './shared';

interface CriteriaTabProps {
  criteria: CriterionRowData[];
  expandedId: string | null;
  onToggleExpand: (id: string | null) => void;
}

function Section({ rows, tone }: { rows: CriterionRowData[]; tone: 'success' | 'destructive' }) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Badge variant={tone} className="text-[10px] px-1.5 py-0 font-bold">
          {tone === 'success' ? 'INCLUSION' : 'EXCLUSION'}
        </Badge>
        <span className="text-xs text-muted-foreground">{rows.length}</span>
      </div>
      <div className="rounded-xl border bg-card divide-y">
        {rows.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="shrink-0 text-xs font-mono font-bold text-muted-foreground w-8">C{c.index}</span>
            <span className="flex-1 min-w-0 text-sm font-medium truncate">{c.name}</span>
            <Badge variant="secondary" className="shrink-0 px-1.5 py-0 text-[10px] hidden sm:inline-flex">
              {c.category}
            </Badge>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {c.atoms.length} atom{c.atoms.length !== 1 ? 's' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CriteriaTab({ criteria }: CriteriaTabProps) {
  if (criteria.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <p className="text-sm font-medium text-muted-foreground">No criteria found</p>
        <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters.</p>
      </div>
    );
  }

  const inclusion = criteria.filter((c) => c.type === 'inclusion');
  const exclusion = criteria.filter((c) => c.type === 'exclusion');

  return (
    <div className="space-y-5">
      <Section rows={inclusion} tone="success" />
      <Section rows={exclusion} tone="destructive" />
    </div>
  );
}
