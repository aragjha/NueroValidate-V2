import { useMemo, useState } from 'react';
import type { CohortImport, CohortCriterionResult, CohortAtomResult, ReviewItem } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Download, HelpCircle, Search, X, XCircle } from 'lucide-react';

type AtomStatus = 'YES' | 'AUTO' | 'PEND' | 'NO' | 'N/A';
type AggStatus = 'pass' | 'fail' | 'pending';

function resolveAtomStatus(atom: CohortAtomResult, patientId: string, reviewItems: ReviewItem[]): AtomStatus {
  if (atom.patient_list_yes.includes(patientId)) return 'YES';
  if (atom.patient_list_no_structured.includes(patientId)) return 'AUTO';
  if (atom.patient_list_no_unstructured.includes(patientId)) {
    const ri = reviewItems.find((r) => r.patientId === patientId && r.criterionName === atom.metadata.concept_label);
    if (ri?.decision === 'True') return 'YES';
    if (ri?.decision === 'False') return 'NO';
    return 'PEND';
  }
  if (atom.patient_list_unknown.includes(patientId)) {
    const ri = reviewItems.find((r) => r.patientId === patientId && r.criterionName === atom.metadata.concept_label);
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
  if (compact) return <span className={`inline-block w-3 h-3 rounded-full ${color}`} title={label} />;
  return <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${color} text-white`}>{label}</Badge>;
}

function AggCell({ status, compact }: { status: AggStatus; compact: boolean }) {
  if (status === 'pass')
    return compact ? <Check className="w-3.5 h-3.5 text-green-600" /> : <span className="text-green-600 font-semibold flex items-center gap-0.5"><Check className="w-3.5 h-3.5" /></span>;
  if (status === 'fail')
    return compact ? <XCircle className="w-3.5 h-3.5 text-red-500" /> : <span className="text-red-500 font-semibold flex items-center gap-0.5"><X className="w-3.5 h-3.5" /></span>;
  return compact ? <HelpCircle className="w-3.5 h-3.5 text-amber-500" /> : <span className="text-amber-500 font-semibold flex items-center gap-0.5"><HelpCircle className="w-3.5 h-3.5" /></span>;
}

function exportCSV(patientIds: string[], criteriaResults: CohortCriterionResult[], criterionMeta: Map<string, { name: string }>, reviewItems: ReviewItem[]) {
  const headers = ['Patient'];
  criteriaResults.forEach((cr) => {
    cr.atoms.forEach((a) => headers.push(a.metadata.concept_label));
    headers.push(`${criterionMeta.get(cr.criterion_id)?.name ?? cr.criterion_id} Agg`);
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
    cells.push(critAggs.every((a) => a === 'pass') ? 'Yes' : critAggs.some((a) => a === 'fail') ? 'No' : '?');
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

type Props = {
  cohort: CohortImport;
  reviewItems: ReviewItem[];
  height?: string;
};

export function EligibilityMatrix({ cohort, reviewItems, height = 'auto' }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [compact, setCompact] = useState(false);

  const hasRealData = !!(cohort.criteriaResults && cohort.criteriaResults.length > 0);

  const allPatientIds = useMemo(() => {
    if (hasRealData) {
      const set = new Set<string>();
      cohort.criteriaResults!.forEach((cr) =>
        cr.atoms.forEach((a) => {
          [...a.patient_list_yes, ...a.patient_list_no, ...a.patient_list_unknown].forEach((p) => set.add(p));
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

  const criteriaResults: CohortCriterionResult[] = useMemo(() => {
    if (hasRealData) return cohort.criteriaResults!;
    return cohort.criteria.map((crit) => ({
      criterion_id: crit.id,
      atom_ids: crit.atoms.map((a) => a.id),
      atoms: crit.atoms.map((atom) => ({
        atom_id: atom.id,
        parent_criterion_id: crit.id,
        evaluation_scope: 'patient',
        metadata: { concept_label: atom.label, operator: atom.structuredExpression, polarity: crit.type === 'inclusion' ? 'positive' : 'negative', primary_category: crit.category },
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

  const criterionMeta = useMemo(() => {
    const map = new Map<string, { name: string; type: 'inclusion' | 'exclusion' }>();
    cohort.criteria.forEach((c) => map.set(c.id, { name: c.name, type: c.type }));
    return map;
  }, [cohort]);

  const cellWidth = compact ? 'min-w-[40px] max-w-[40px]' : 'min-w-[80px]';

  return (
    <div className="flex flex-col" style={{ height }}>
      <div className="flex items-center gap-2 pb-2 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search patient..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-8 w-48 text-xs"
          />
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setCompact((v) => !v)}>
          {compact ? 'Full' : 'Compact'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => exportCSV(filteredPatients, criteriaResults, criterionMeta, reviewItems)}
        >
          <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
        </span>
      </div>

      <ScrollArea className="flex-1 min-h-0 border rounded-lg">
        <div className="overflow-auto">
          <table className="border-collapse text-xs w-full">
            <thead className="sticky top-0 z-20 bg-background">
              <tr className="border-b">
                <th rowSpan={2} className="sticky left-0 z-30 bg-background border-r px-3 py-2 text-left font-semibold">Patient</th>
                {criteriaResults.map((cr) => {
                  const meta = criterionMeta.get(cr.criterion_id);
                  const span = cr.atoms.length + 1;
                  return (
                    <th key={cr.criterion_id} colSpan={span} className="border-r border-b px-2 py-1.5 text-center font-semibold">
                      <span className="mr-1">{meta?.name ?? cr.criterion_id}</span>
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 ${meta?.type === 'inclusion' ? 'border-green-500 text-green-600' : 'border-red-400 text-red-500'}`}>
                        {meta?.type === 'inclusion' ? 'INC' : 'EXC'}
                      </Badge>
                    </th>
                  );
                })}
                <th rowSpan={2} className="border-r px-2 py-1.5 text-center font-semibold">Eligible</th>
              </tr>
              <tr className="border-b">
                {criteriaResults.map((cr) => (
                  <>
                    {cr.atoms.map((a) => (
                      <th key={a.atom_id} className={`${cellWidth} border-r px-1 py-1 text-center font-medium truncate`} title={a.metadata.concept_label}>
                        {compact ? a.atom_id.slice(-4) : a.metadata.concept_label}
                      </th>
                    ))}
                    <th key={`${cr.criterion_id}-agg`} className="min-w-[44px] border-r px-1 py-1 text-center font-medium bg-muted/40">Agg</th>
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
                      <td key={`${pid}-${a.atom_id}`} className={`${cellWidth} border-r px-1 py-1 text-center`}>
                        <StatusCell status={s} compact={compact} />
                      </td>,
                    );
                  });
                  const agg = aggregateStatuses(atomStatuses);
                  critAggs.push(agg);
                  rowCells.push(
                    <td key={`${pid}-${cr.criterion_id}-agg`} className="min-w-[44px] border-r px-1 py-1 text-center bg-muted/20">
                      <AggCell status={agg} compact={compact} />
                    </td>,
                  );
                });
                const eligible = critAggs.every((a) => a === 'pass') ? 'pass' : critAggs.some((a) => a === 'fail') ? 'fail' : 'pending';
                return (
                  <tr key={pid} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="sticky left-0 z-10 bg-background border-r px-3 py-1.5 font-mono font-medium whitespace-nowrap">{pid}</td>
                    {rowCells}
                    <td className="px-2 py-1.5 text-center">
                      <AggCell status={eligible as AggStatus} compact={compact} />
                    </td>
                  </tr>
                );
              })}
              {filteredPatients.length === 0 && (
                <tr>
                  <td colSpan={999} className="text-center text-muted-foreground py-12">No patients match the search query.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </div>
  );
}

export default EligibilityMatrix;
