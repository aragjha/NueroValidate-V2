import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AtomRowData } from './shared';

interface AtomsTabProps {
  atoms: AtomRowData[];
}

type Grouped = {
  parentCriterionId: string;
  parentCriterionIndex: number;
  parentCriterionName: string;
  parentCriterionType: 'inclusion' | 'exclusion';
  atoms: AtomRowData[];
};

function groupByCriterion(atoms: AtomRowData[]): Grouped[] {
  const map = new Map<string, Grouped>();
  for (const a of atoms) {
    const g = map.get(a.parentCriterionId);
    if (g) {
      g.atoms.push(a);
    } else {
      map.set(a.parentCriterionId, {
        parentCriterionId: a.parentCriterionId,
        parentCriterionIndex: a.parentCriterionIndex,
        parentCriterionName: a.parentCriterionName,
        parentCriterionType: a.parentCriterionType,
        atoms: [a],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.parentCriterionIndex - b.parentCriterionIndex);
}

export function AtomsTab({ atoms }: AtomsTabProps) {
  if (atoms.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <p className="text-sm font-medium text-muted-foreground">No atoms found</p>
        <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters.</p>
      </div>
    );
  }

  const groups = groupByCriterion(atoms);

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.parentCriterionId} className="rounded-xl border bg-card overflow-hidden">
          {/* Parent criterion header */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/30 border-b">
            <span className="shrink-0 text-xs font-mono font-bold text-muted-foreground w-8">C{g.parentCriterionIndex}</span>
            <Badge variant={g.parentCriterionType === 'inclusion' ? 'success' : 'destructive'} className="shrink-0 px-1.5 py-0 text-[10px] font-bold">
              {g.parentCriterionType === 'inclusion' ? 'INC' : 'EXC'}
            </Badge>
            <span className="flex-1 min-w-0 text-sm font-semibold truncate">{g.parentCriterionName}</span>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {g.atoms.length} atom{g.atoms.length !== 1 ? 's' : ''}
            </span>
          </div>
          {/* Child atoms */}
          <div className="divide-y">
            {g.atoms.map((atom) => (
              <div
                key={atom.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5',
                  atom.dataSource === 'structured'
                    ? 'bg-blue-50/20 dark:bg-blue-900/5'
                    : 'bg-amber-50/20 dark:bg-amber-900/5',
                )}
              >
                <span className="shrink-0 text-xs text-muted-foreground pl-4">↳</span>
                <span className="flex-1 min-w-0 text-sm truncate">{atom.label}</span>
                <Badge
                  variant={atom.dataSource === 'structured' ? 'processing' : 'warning'}
                  className="shrink-0 px-1.5 py-0 text-[10px] capitalize"
                >
                  {atom.dataSource}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
