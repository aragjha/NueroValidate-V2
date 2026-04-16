import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FlaskConical, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CohortImport } from '@/types';
import type { CriterionRowData, AtomRowData } from './shared';

/* ─── Source label map ─── */
const SOURCE_LABELS: Record<CohortImport['source'], string> = {
  NeuroTerminal: 'NeuroTerminal',
  CohortBuilder: 'Cohort Builder',
  Manual: 'Manual Import',
};

/* ─── Props ─── */
export type ExplorerHeaderProps = {
  cohort: CohortImport;
  criteria: CriterionRowData[];
  atoms: AtomRowData[];
  patientCount: number;
};

/* ─── Helpers ─── */
function statusVariant(
  status: CohortImport['status'],
): 'success' | 'processing' | 'warning' {
  if (status === 'Linked') return 'success';
  if (status === 'Active') return 'processing';
  return 'warning';
}

/* ─── Component ─── */
export function ExplorerHeader({
  cohort,
  criteria,
  atoms,
  patientCount,
}: ExplorerHeaderProps) {
  const navigate = useNavigate();

  /* Derived stats */
  const structuredCount = atoms.filter((a) => a.dataSource === 'structured').length;
  const unstructuredCount = atoms.filter((a) => a.dataSource === 'unstructured').length;

  const validatedAtoms = atoms.filter((a) => a.status === 'auto-validated').length;
  const inProgressAtoms = atoms.filter((a) => a.status === 'in-progress').length;
  const pendingAtoms = atoms.filter((a) => a.status === 'needs-config').length;

  return (
    <div className="space-y-3">
      {/* ── Top row ── */}
      <div className="flex items-center justify-between gap-4">
        {/* Left: back + icon + breadcrumb + badges */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/vault')}
            aria-label="Back to Vault"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors hover:bg-muted cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FlaskConical className="h-4.5 w-4.5" />
          </div>

          <div className="flex items-center gap-2 min-w-0">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1 text-sm">
              <button
                onClick={() => navigate('/vault')}
                className="text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              >
                Vault
              </button>
              <span className="text-muted-foreground select-none">/</span>
              <span className="font-semibold truncate max-w-[280px]">{cohort.name}</span>
            </nav>

            {/* Status badge */}
            <Badge
              variant={statusVariant(cohort.status)}
              className="text-[10px] px-2 py-0 shrink-0"
            >
              {cohort.status}
            </Badge>

            {/* Source badge */}
            <Badge variant="secondary" className="text-[10px] px-2 py-0 shrink-0">
              {SOURCE_LABELS[cohort.source]}
            </Badge>
          </div>
        </div>

        {/* Right: CTA */}
        {cohort.status === 'Linked' ? (
          <button
            onClick={() =>
              navigate(`/projects/${cohort.linkedProjectId}/ct-overview`)
            }
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
          >
            Open CT Project
            <span aria-hidden>→</span>
          </button>
        ) : (
          <button
            onClick={() =>
              navigate(`/projects/new?flow=ct&cohort=${cohort.id}`)
            }
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create CT Project
          </button>
        )}
      </div>

      {/* ── Stats strip ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border bg-card px-4 py-2.5 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{patientCount}</span>{' '}
          Patients
        </span>
        <span className="text-border select-none">·</span>
        <span>
          <span className="font-semibold text-foreground">{criteria.length}</span>{' '}
          Criteria
          {(structuredCount > 0 || unstructuredCount > 0) && (
            <span className="ml-1">
              (
              <span className="text-blue-600 dark:text-blue-400">
                {structuredCount} str
              </span>{' '}
              /{' '}
              <span className="text-amber-600 dark:text-amber-400">
                {unstructuredCount} unstr
              </span>
              )
            </span>
          )}
        </span>
        <span className="text-border select-none">·</span>
        <span>
          <span className="font-semibold text-foreground">{atoms.length}</span>{' '}
          Atoms
        </span>
        {(validatedAtoms > 0 || inProgressAtoms > 0 || pendingAtoms > 0) && (
          <>
            <span className="text-border select-none">·</span>
            {validatedAtoms > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {validatedAtoms} Validated
              </span>
            )}
            {inProgressAtoms > 0 && (
              <>
                {validatedAtoms > 0 && (
                  <span className="text-border select-none">/</span>
                )}
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {inProgressAtoms} In progress
                </span>
              </>
            )}
            {pendingAtoms > 0 && (
              <>
                {(validatedAtoms > 0 || inProgressAtoms > 0) && (
                  <span className="text-border select-none">/</span>
                )}
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {pendingAtoms} Pending
                </span>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
