import { AtomRow } from './AtomRow';
import type { AtomRowData } from './shared';

/* ─── AtomsTab ─── */

interface AtomsTabProps {
  atoms: AtomRowData[];
}

export function AtomsTab({ atoms }: AtomsTabProps) {
  if (atoms.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <p className="text-sm font-medium text-muted-foreground">No atoms found</p>
        <p className="text-xs text-muted-foreground mt-1">
          Try adjusting your filters or import a cohort with atoms.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {atoms.map((atom) => (
        <AtomRow key={atom.id} row={atom} />
      ))}
    </div>
  );
}
