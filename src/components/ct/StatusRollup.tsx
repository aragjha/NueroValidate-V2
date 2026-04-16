import { Badge } from '@/components/ui/badge';

export type AtomStatus = 'auto-validated' | 'needs-config' | 'in-progress' | 'validated';

const STATUS_PRIORITY: Record<AtomStatus, number> = {
  'needs-config': 0, 'in-progress': 1, 'validated': 2, 'auto-validated': 3,
};
const STATUS_VARIANT: Record<AtomStatus, 'processing' | 'secondary' | 'warning' | 'success'> = {
  'auto-validated': 'processing', 'needs-config': 'secondary', 'in-progress': 'warning', 'validated': 'success',
};
const STATUS_LABEL: Record<AtomStatus, string> = {
  'auto-validated': 'Auto-validated', 'needs-config': 'Needs config', 'in-progress': 'In progress', 'validated': 'Validated',
};

export function worstStatus(statuses: AtomStatus[]): AtomStatus {
  if (statuses.length === 0) return 'needs-config';
  return statuses.reduce((worst, s) => STATUS_PRIORITY[s] < STATUS_PRIORITY[worst] ? s : worst);
}

type Props = { status: AtomStatus; completed: number; total: number; label: string };

export function StatusRollup({ status, completed, total, label }: Props) {
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <Badge variant={STATUS_VARIANT[status]} className="text-[10px] px-2 py-0">{STATUS_LABEL[status]}</Badge>
      <span className="text-muted-foreground tabular-nums">{completed}/{total} {label} complete</span>
    </span>
  );
}
