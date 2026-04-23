import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import type { CohortImport, CohortCriterionResult, CohortAtomResult, ReviewItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AskMeAnything } from '@/components/AskMeAnything';
import { buildCriterionRows } from '@/components/vault/shared';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  Search,
  Sparkles,
  X,
  XCircle,
  HelpCircle,
} from 'lucide-react';

/* ─── Helpers ─── */

type AtomStatus = 'YES' | 'AUTO' | 'PEND' | 'NO' | 'N/A';
type AggStatus = 'pass' | 'fail' | 'pending';

function resolveAtomStatus(
  atom: CohortAtomResult,
  patientId: string,
  reviewItems: ReviewItem[],
): AtomStatus {
  if (atom.patient_list_yes.includes(patientId)) return 'YES';
  if (atom.patient_list_no_structured.includes(patientId)) return 'AUTO';
  if (atom.patient_list_no_unstructured.includes(patientId)) {
    const ri = reviewItems.find(
      (r) => r.patientId === patientId && r.criterionName === atom.metadata.concept_label,
    );
    if (ri?.decision === 'True') return 'YES';
    if (ri?.decision === 'False') return 'NO';
    return 'PEND';
  }
  if (atom.patient_list_unknown.includes(patientId)) {
    const ri = reviewItems.find(
      (r) => r.patientId === patientId && r.criterionName === atom.metadata.concept_label,
    );
    if (ri?.decision === 'True') return 'YES';
    if (ri?.decision === 'False') return 'NO';
    return 'PEND';
  }
  return 'N/A';
}

function aggregateStatuses(statuses: AtomStatus[]): AggStatus {
  if (statuses.some((s) => s === 'NO')) return 'fail';
  if (statuses.some((s) => s === 'PEND' || s === 'N/A')) return 'pending';
  return 'pass';
}

function StatusCell({ status, compact }: { status: AtomStatus; compact: boolean }) {
  const map: Record<AtomStatus, { color: string; label: string }> = {
    YES: { color: 'bg-green-500', label: 'YES' },
    AUTO: { color: 'bg-gray-400', label: 'AUTO' },
    PEND: { color: 'bg-amber-400', label: 'PEND' },
    NO: { color: 'bg-red-500', label: 'NO' },
    'N/A': { color: 'bg-gray-300', label: 'N/A' },
  };
  const { color, label } = map[status];
  if (compact) {
    return (
      <span className={`inline-block w-3 h-3 rounded-full ${color}`} title={label} />
    );
  }
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${color} text-white`}>
      {label}
    </Badge>
  );
}

function AggCell({ status, compact }: { status: AggStatus; compact: boolean }) {
  if (status === 'pass')
    return compact ? (
      <Check className="w-3.5 h-3.5 text-green-600" />
    ) : (
      <span className="text-green-600 font-semibold flex items-center gap-0.5">
        <Check className="w-3.5 h-3.5" /> ✓
      </span>
    );
  if (status === 'fail')
    return compact ? (
      <XCircle className="w-3.5 h-3.5 text-red-500" />
    ) : (
      <span className="text-red-500 font-semibold flex items-center gap-0.5">
        <X className="w-3.5 h-3.5" /> ✗
      </span>
    );
  return compact ? (
    <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
  ) : (
    <span className="text-amber-500 font-semibold flex items-center gap-0.5">
      <HelpCircle className="w-3.5 h-3.5" /> ?
    </span>
  );
}

/* ─── CSV export ─── */

function exportCSV(
  patientIds: string[],
  criteriaResults: CohortCriterionResult[],
  reviewItems: ReviewItem[],
) {
  const headers = ['Patient'];
  criteriaResults.forEach((cr) => {
    cr.atoms.forEach((a) => headers.push(a.metadata.concept_label));
    headers.push(`${cr.criterion_id} Agg`);
  });
  headers.push('Eligible');

  const rows = patientIds.map((pid) => {
    const cells: string[] = [pid];
    const critAggs: AggStatus[] = [];
    criteriaResults.forEach((cr) => {
      const atomStatuses: AtomStatus[] = [];
      cr.atoms.forEach((a) => {
        const s = resolveAtomStatus(a, pid, reviewItems);
        atomStatuses.push(s);
        cells.push(s);
      });
      const agg = aggregateStatuses(atomStatuses);
      critAggs.push(agg);
      cells.push(agg);
    });
    const eligible = critAggs.every((a) => a === 'pass') ? 'Yes' : critAggs.some((a) => a === 'fail') ? 'No' : '?';
    cells.push(eligible);
    return cells;
  });

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ct-matrix.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Main Component ─── */

export default function CTMatrixPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, cohortImports, reviewItems } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [compact, setCompact] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  const project = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);
  const cohort: CohortImport | undefined = useMemo(
    () => cohortImports.find((c) => c.linkedProjectId === projectId),
    [cohortImports, projectId],
  );

  const hasRealData = !!(cohort?.criteriaResults && cohort.criteriaResults.length > 0);

  /* Derive patient list */
  const allPatientIds = useMemo(() => {
    if (!cohort) return [];
    if (hasRealData) {
      const set = new Set<string>();
      cohort.criteriaResults!.forEach((cr) =>
        cr.atoms.forEach((a) => {
          [...a.patient_list_yes, ...a.patient_list_no, ...a.patient_list_unknown].forEach((p) =>
            set.add(p),
          );
        }),
      );
      return Array.from(set).sort();
    }
    return cohort.patients.map((p) => p.patientId).sort();
  }, [cohort, hasRealData]);

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return allPatientIds;
    const q = searchQuery.toLowerCase();
    return allPatientIds.filter((pid) => pid.toLowerCase().includes(q));
  }, [allPatientIds, searchQuery]);

  /* Criteria results — build from real data or fallback */
  const criteriaResults: CohortCriterionResult[] = useMemo(() => {
    if (hasRealData) return cohort!.criteriaResults!;
    if (!cohort) return [];
    return cohort.criteria.map((crit) => ({
      criterion_id: crit.id,
      atom_ids: crit.atoms.map((a) => a.id),
      atoms: crit.atoms.map((atom) => ({
        atom_id: atom.id,
        parent_criterion_id: crit.id,
        evaluation_scope: 'patient',
        metadata: {
          concept_label: atom.label,
          operator: atom.structuredExpression,
          polarity: crit.type === 'inclusion' ? 'positive' : 'negative',
          primary_category: crit.category,
        },
        patient_count_yes: 0,
        patient_count_no: 0,
        patient_count_unknown: 0,
        patient_list_yes: cohort.patients.filter((p) => p.flags.find((f) => f.criterionId === crit.id)?.value).map((p) => p.patientId),
        patient_list_no: cohort.patients.filter((p) => { const f = p.flags.find((f) => f.criterionId === crit.id); return f && !f.value; }).map((p) => p.patientId),
        patient_list_unknown: [] as string[],
        patient_list_no_structured: [] as string[],
        patient_list_no_unstructured: [] as string[],
        patient_list_no_unstructured_gcp_path: [] as string[],
        error: null,
      })),
    }));
  }, [cohort, hasRealData]);

  /* Criterion display metadata (name, type) */
  const criterionMeta = useMemo(() => {
    if (!cohort) return new Map<string, { name: string; type: 'inclusion' | 'exclusion' }>();
    const map = new Map<string, { name: string; type: 'inclusion' | 'exclusion' }>();
    cohort.criteria.forEach((c) => map.set(c.id, { name: c.name, type: c.type }));
    return map;
  }, [cohort]);

  /* ─── Render ─── */

  if (!project || !cohort) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Project or cohort not found.
      </div>
    );
  }

  const containerCls = fullscreen
    ? 'fixed inset-0 z-50 bg-background flex flex-col'
    : 'flex flex-col h-full';

  const cellWidth = compact ? 'min-w-[40px] max-w-[40px]' : 'min-w-[80px]';

  return (
    <div className={containerCls}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
        <button
          onClick={() => navigate(`/projects/${projectId}/ct-overview`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Project Home
        </button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">{project.name}</h1>
          <Badge variant="outline" className="text-[10px]">CT Matrix</Badge>
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search patient..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-7 h-8 w-48 text-xs"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => setCompact((v) => !v)}
        >
          {compact ? 'Full' : 'Compact'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => setFullscreen((v) => !v)}
        >
          {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => exportCSV(filteredPatients, criteriaResults, reviewItems)}
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
        </Button>
        <Button
          variant={askOpen ? 'default' : 'outline'}
          size="sm"
          className="h-8 text-xs"
          onClick={() => setAskOpen((v) => !v)}
        >
          <Sparkles className="w-3.5 h-3.5 mr-1" /> Ask me anything
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Matrix + AMA side panel */}
      <div className="flex flex-1 overflow-hidden">
      <ScrollArea className="flex-1">
        <div className="overflow-auto">
          <table className="border-collapse text-xs w-full">
            <thead className="sticky top-0 z-20 bg-background">
              {/* Row 1: criterion group headers */}
              <tr className="border-b">
                <th
                  rowSpan={2}
                  className="sticky left-0 z-30 bg-background border-r px-3 py-2 text-left font-semibold"
                >
                  Patient
                </th>
                {criteriaResults.map((cr) => {
                  const meta = criterionMeta.get(cr.criterion_id);
                  const span = cr.atoms.length + 1; // atoms + agg column
                  return (
                    <th
                      key={cr.criterion_id}
                      colSpan={span}
                      className="border-r border-b px-2 py-1.5 text-center font-semibold"
                    >
                      <span className="mr-1">{meta?.name ?? cr.criterion_id}</span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1 py-0 ${
                          meta?.type === 'inclusion'
                            ? 'border-green-500 text-green-600'
                            : 'border-red-400 text-red-500'
                        }`}
                      >
                        {meta?.type === 'inclusion' ? 'INC' : 'EXC'}
                      </Badge>
                    </th>
                  );
                })}
                <th rowSpan={2} className="border-r px-2 py-1.5 text-center font-semibold">
                  Eligible
                </th>
              </tr>

              {/* Row 2: atom headers + agg */}
              <tr className="border-b">
                {criteriaResults.map((cr) => (
                  <>
                    {cr.atoms.map((a) => (
                      <th
                        key={a.atom_id}
                        className={`${cellWidth} border-r px-1 py-1 text-center font-medium truncate`}
                        title={a.metadata.concept_label}
                      >
                        {compact ? a.atom_id.slice(-4) : a.metadata.concept_label}
                      </th>
                    ))}
                    <th
                      key={`${cr.criterion_id}-agg`}
                      className="min-w-[44px] border-r px-1 py-1 text-center font-medium bg-muted/40"
                    >
                      Agg
                    </th>
                  </>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredPatients.map((pid) => {
                const critAggs: AggStatus[] = [];
                const rowCells: React.ReactNode[] = [];

                criteriaResults.forEach((cr) => {
                  const atomStatuses: AtomStatus[] = [];
                  cr.atoms.forEach((a) => {
                    const s = resolveAtomStatus(a, pid, reviewItems);
                    atomStatuses.push(s);
                    rowCells.push(
                      <td
                        key={`${pid}-${a.atom_id}`}
                        className={`${cellWidth} border-r px-1 py-1 text-center`}
                      >
                        <StatusCell status={s} compact={compact} />
                      </td>,
                    );
                  });
                  const agg = aggregateStatuses(atomStatuses);
                  critAggs.push(agg);
                  rowCells.push(
                    <td
                      key={`${pid}-${cr.criterion_id}-agg`}
                      className="min-w-[44px] border-r px-1 py-1 text-center bg-muted/20"
                    >
                      <AggCell status={agg} compact={compact} />
                    </td>,
                  );
                });

                const eligible = critAggs.every((a) => a === 'pass')
                  ? 'pass'
                  : critAggs.some((a) => a === 'fail')
                    ? 'fail'
                    : 'pending';

                return (
                  <tr key={pid} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="sticky left-0 z-10 bg-background border-r px-3 py-1.5 font-mono font-medium whitespace-nowrap">
                      {pid}
                    </td>
                    {rowCells}
                    <td className="px-2 py-1.5 text-center">
                      <AggCell status={eligible as AggStatus} compact={compact} />
                    </td>
                  </tr>
                );
              })}

              {filteredPatients.length === 0 && (
                <tr>
                  <td
                    colSpan={999}
                    className="text-center text-muted-foreground py-12"
                  >
                    No patients match the search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ScrollArea>

      {askOpen && (
        <aside className="w-[420px] shrink-0 border-l flex flex-col overflow-hidden bg-muted/10">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/20">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold">Ask me anything</span>
            </div>
            <button onClick={() => setAskOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <AskMeAnything
              compact
              context={{
                projectName: project.name,
                totalPatients: allPatientIds.length,
                eligibleCount: cohort.metadata.eligibleCount,
                ineligibleCount: cohort.metadata.ineligibleCount,
                criteria: buildCriterionRows(cohort),
              }}
            />
          </div>
        </aside>
      )}
      </div>
    </div>
  );
}
