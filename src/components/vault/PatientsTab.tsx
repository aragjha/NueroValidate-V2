import { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { PatientRowData, PatientCriterionFlagRow } from './shared';

/* ─── Constants ─── */

const PAGE_SIZE = 50;

/* ─── Helpers ─── */

function passFail(flag: PatientCriterionFlagRow): boolean {
  const val = flag.override !== undefined ? flag.override : flag.value;
  /* Inclusion: true = pass. Exclusion: false = pass. */
  return flag.criterionType === 'inclusion' ? val : !val;
}

function countPass(flags: PatientCriterionFlagRow[]): number {
  return flags.filter(passFail).length;
}

/* ─── MiniPassBar ─── */

function MiniPassBar({ pass, total }: { pass: number; total: number }) {
  const pct = total > 0 ? Math.round((pass / total) * 100) : 0;
  const title = `${pass}/${total} criteria pass`;
  return (
    <div
      className="relative h-1.5 w-16 rounded-full bg-muted overflow-hidden shrink-0"
      title={title}
      role="img"
      aria-label={title}
    >
      <div
        className={cn(
          'absolute left-0 top-0 h-full rounded-full',
          pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-blue-500' : 'bg-amber-500',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ─── CriterionChip ─── */

function CriterionChip({ flag }: { flag: PatientCriterionFlagRow }) {
  const pass = passFail(flag);
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10px] font-medium',
        pass
          ? 'border-emerald-200 bg-emerald-50/50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-300'
          : 'border-red-200 bg-red-50/50 text-red-700 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-300',
      )}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full shrink-0', pass ? 'bg-emerald-500' : 'bg-red-500')}
        aria-hidden="true"
      />
      <span className="truncate" title={flag.criterionName}>
        {flag.criterionName.length > 30
          ? `${flag.criterionName.slice(0, 28)}…`
          : flag.criterionName}
      </span>
      <Badge
        variant={flag.criterionType === 'inclusion' ? 'success' : 'destructive'}
        className="shrink-0 px-1 py-0 text-[9px] font-bold"
      >
        {flag.criterionType === 'inclusion' ? 'INC' : 'EXC'}
      </Badge>
    </div>
  );
}

/* ─── PatientRow ─── */

function PatientRow({ patient }: { patient: PatientRowData }) {
  const [expanded, setExpanded] = useState(false);

  const isEligible = patient.overrideEligible !== undefined ? patient.overrideEligible : patient.eligible;
  const isReviewed = !!patient.reviewedBy;
  const flags = patient.flags ?? [];
  const passCount = countPass(flags);
  const totalCount = flags.length;

  return (
    <div className="rounded-xl border bg-card transition-shadow hover:shadow-sm">
      {/* Collapsed header */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="w-full cursor-pointer select-none px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-xl"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {/* Chevron */}
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
              expanded && 'rotate-180',
            )}
            aria-hidden="true"
          />

          {/* Patient ID */}
          <span className="font-mono text-sm font-semibold text-foreground shrink-0">
            {patient.id}
          </span>

          {/* Eligible / Ineligible badge */}
          <Badge
            variant={isEligible ? 'success' : 'destructive'}
            className="shrink-0 px-1.5 py-0 text-[10px] font-bold"
          >
            {isEligible ? 'Eligible' : 'Ineligible'}
          </Badge>

          {/* Needs review badge */}
          {!isReviewed && (
            <Badge variant="warning" className="shrink-0 px-1.5 py-0 text-[10px]">
              Needs review
            </Badge>
          )}

          {/* Spacer */}
          <span className="flex-1" />

          {/* Mini pass bar + count */}
          {totalCount > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <MiniPassBar pass={passCount} total={totalCount} />
              <span className="text-xs text-muted-foreground font-medium">
                {passCount}/{totalCount} pass
              </span>
            </div>
          )}
        </div>
      </button>

      {/* Expanded criterion chips */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3">
          {flags.length === 0 ? (
            <p className="text-xs text-muted-foreground">No per-criterion data available.</p>
          ) : (
            <>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Criterion Pass/Fail
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {flags.map((flag) => (
                  <CriterionChip key={flag.criterionId} flag={flag} />
                ))}
              </div>
              {patient.reviewedBy && (
                <p className="mt-3 text-[10px] text-muted-foreground">
                  Reviewed by{' '}
                  <span className="font-semibold text-foreground">{patient.reviewedBy}</span>
                  {patient.reviewedAt && (
                    <>
                      {' on '}
                      {new Date(patient.reviewedAt).toLocaleDateString()}
                    </>
                  )}
                </p>
              )}
              {patient.notes && (
                <p className="mt-1 text-[10px] text-muted-foreground italic">{patient.notes}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── PatientsTab ─── */

interface PatientsTabProps {
  patients: PatientRowData[];
}

export function PatientsTab({ patients }: PatientsTabProps) {
  const [page, setPage] = useState(1);

  if (patients.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <p className="text-sm font-medium text-muted-foreground">No patients found</p>
        <p className="text-xs text-muted-foreground mt-1">
          Try adjusting your filters or import a cohort with patients.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(patients.length / PAGE_SIZE);
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pagePatients = patients.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <div className="space-y-3">
      {/* Patient rows */}
      <div className="space-y-1.5">
        {pagePatients.map((patient) => (
          <PatientRow key={patient.id} patient={patient} />
        ))}
      </div>

      {/* Pagination */}
      {patients.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t pt-3">
          <p className="text-xs text-muted-foreground">
            Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, patients.length)} of{' '}
            {patients.length} patients
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="h-3 w-3" aria-hidden="true" />
              Prev
            </button>
            <span className="text-xs font-medium text-muted-foreground px-1">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
              <ChevronRight className="h-3 w-3" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
