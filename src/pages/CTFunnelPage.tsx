import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { buildCriterionRows } from '@/components/vault/shared';
import type { CriterionRowData } from '@/components/vault/shared';
import type { CohortImport, CohortCriterionResult, CohortAtomResult } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Download,
  FlaskConical,
  MessageSquare,
  RotateCcw,
  Send,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

/* ─── Category badge colors ─── */
const CATEGORY_COLORS: Record<string, string> = {
  Demographics: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  Diagnosis: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  Labs: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  Imaging: 'bg-pink-500/15 text-pink-700 dark:text-pink-400',
  Medications: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  Procedures: 'bg-red-500/15 text-red-700 dark:text-red-400',
  Clinical: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400',
  Drug: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
};

type ChatMsg = { role: 'user' | 'bot'; text: string };

/* ─── Enhanced funnel types ─── */
type FunnelAtomDetail = {
  atomId: string;
  label: string;
  dataSource: 'structured' | 'unstructured';
  yesCount: number;
  noCount: number;
  unknownCount: number;
};

type FunnelStep = {
  label: string;
  criterionId: string;
  remaining: number;
  dropped: number;
  dropPct: number;
  isExclusion: boolean;
  atoms: FunnelAtomDetail[];
};

/* ─── Helper: compute funnel from criteriaResults (real atom-level data) ─── */
function computeRealFunnel(
  cohort: CohortImport,
  enabledIds: Set<string>,
): FunnelStep[] {
  const results = cohort.criteriaResults!;
  const criteria = cohort.criteria;

  // All patients = union of every atom's patient_list_yes + no + unknown
  const allPatientsSet = new Set<string>();
  for (const cr of results) {
    for (const atom of cr.atoms) {
      for (const p of atom.patient_list_yes) allPatientsSet.add(p);
      for (const p of atom.patient_list_no) allPatientsSet.add(p);
      for (const p of atom.patient_list_unknown) allPatientsSet.add(p);
    }
  }

  const startingPop = cohort.cohortScope?.S1_diagnosis_or_seed_count ?? allPatientsSet.size;
  const steps: FunnelStep[] = [{
    label: 'Starting Population',
    criterionId: '__start__',
    remaining: startingPop,
    dropped: 0,
    dropPct: 0,
    isExclusion: false,
    atoms: [],
  }];

  let remaining = new Set(allPatientsSet);

  for (const criterion of criteria) {
    if (!enabledIds.has(criterion.id)) continue;

    // Find matching criteriaResult
    const crResult = results.find((r: CohortCriterionResult) => {
      if (r.atoms.length === 0) return false;
      return r.atoms.some((a: CohortAtomResult) =>
        criterion.atoms.some((da) =>
          da.id.includes(a.atom_id) || a.atom_id.includes(da.id.split('-').pop() ?? ''),
        ),
      );
    }) ?? results[criteria.indexOf(criterion)];

    const isExclusion = criterion.type === 'exclusion';

    if (!crResult) {
      steps.push({
        label: criterion.name,
        criterionId: criterion.id,
        remaining: remaining.size,
        dropped: 0,
        dropPct: 0,
        isExclusion,
        atoms: [],
      });
      continue;
    }

    const logic = criterion.atomLogic;

    // Determine which patients pass this criterion
    const passPatients = new Set<string>();

    if (logic === 'OR') {
      for (const atom of crResult.atoms) {
        const passingForAtom = isExclusion
          ? [...atom.patient_list_no, ...atom.patient_list_unknown]
          : atom.patient_list_yes;
        for (const p of passingForAtom) passPatients.add(p);
      }
    } else {
      const atomPassSets = crResult.atoms.map((atom: CohortAtomResult) => {
        const passing = isExclusion
          ? new Set([...atom.patient_list_no, ...atom.patient_list_unknown])
          : new Set(atom.patient_list_yes);
        return passing;
      });
      if (atomPassSets.length > 0) {
        for (const p of atomPassSets[0]) {
          if (atomPassSets.every((s) => s.has(p))) passPatients.add(p);
        }
      }
    }

    const prevSize = remaining.size;
    remaining = new Set([...remaining].filter((p) => passPatients.has(p)));
    const dropped = prevSize - remaining.size;
    const dropPct = prevSize > 0 ? (dropped / prevSize) * 100 : 0;

    // Build atom detail
    const atomDetails: FunnelAtomDetail[] = crResult.atoms.map((atom: CohortAtomResult) => {
      const hasUnstructured = atom.patient_list_no_unstructured.length > 0;
      return {
        atomId: atom.atom_id,
        label: atom.metadata.concept_label,
        dataSource: hasUnstructured ? 'unstructured' as const : 'structured' as const,
        yesCount: atom.patient_count_yes,
        noCount: atom.patient_count_no,
        unknownCount: atom.patient_count_unknown,
      };
    });

    steps.push({
      label: criterion.name,
      criterionId: criterion.id,
      remaining: remaining.size,
      dropped,
      dropPct,
      isExclusion,
      atoms: atomDetails,
    });
  }

  return steps;
}

/* ─── Helper: compute funnel from display-layer patient flags ─── */
function computeFlagFunnel(
  cohort: CohortImport,
  enabledIds: Set<string>,
): FunnelStep[] {
  const startingPop = cohort.patients.length;
  const steps: FunnelStep[] = [{
    label: 'Starting Population',
    criterionId: '__start__',
    remaining: startingPop,
    dropped: 0,
    dropPct: 0,
    isExclusion: false,
    atoms: [],
  }];

  let remaining = [...cohort.patients];

  for (const criterion of cohort.criteria) {
    if (!enabledIds.has(criterion.id)) continue;
    const isExclusion = criterion.type === 'exclusion';
    const prevSize = remaining.length;

    remaining = remaining.filter((p) => {
      const flag = p.flags.find((f) => f.criterionId === criterion.id);
      if (!flag) return true;
      return isExclusion ? !flag.value : flag.value;
    });

    const dropped = prevSize - remaining.length;
    const dropPct = prevSize > 0 ? (dropped / prevSize) * 100 : 0;

    // Display-layer atoms have no patient stats
    const atomDetails: FunnelAtomDetail[] = criterion.atoms.map((atom) => ({
      atomId: atom.id,
      label: atom.label,
      dataSource: atom.dataSource,
      yesCount: 0,
      noCount: 0,
      unknownCount: 0,
    }));

    steps.push({
      label: criterion.name,
      criterionId: criterion.id,
      remaining: remaining.length,
      dropped,
      dropPct,
      isExclusion,
      atoms: atomDetails,
    });
  }

  return steps;
}

/* ─── Enhanced chat responder ─── */
function chatRespond(
  msg: string,
  finalCount: number,
  startingPop: number,
  steps: FunnelStep[],
  enabledCount: number,
  totalCriteria: number,
): string {
  const lower = msg.toLowerCase();
  const pct = startingPop > 0 ? ((finalCount / startingPop) * 100).toFixed(2) : '0';
  const criteriaSteps = steps.filter((s) => s.criterionId !== '__start__');

  // 1. Count / total
  if (/how many|count|total/.test(lower)) {
    return `The final eligible cohort contains ${finalCount.toLocaleString()} patients out of ${startingPop.toLocaleString()} starting population (${pct}% retention).`;
  }

  // 2. Biggest drop / most impact
  if (/most impact|biggest drop/.test(lower)) {
    if (criteriaSteps.length === 0) return 'No criteria are currently enabled.';
    const biggest = criteriaSteps.reduce((a, b) => (b.dropped > a.dropped ? b : a), criteriaSteps[0]);
    return `The criterion "${biggest.label}" has the largest impact, reducing the cohort by ${biggest.dropped.toLocaleString()} patients (${biggest.dropPct.toFixed(1)}% drop at that step).`;
  }

  // 3. Smallest drop / least impact
  if (/smallest drop|least impact/.test(lower)) {
    if (criteriaSteps.length === 0) return 'No criteria are currently enabled.';
    const smallest = criteriaSteps.reduce((a, b) => (b.dropped < a.dropped ? b : a), criteriaSteps[0]);
    return smallest.dropped === 0
      ? `The criterion "${smallest.label}" drops zero patients -- it has no impact on the cohort.`
      : `The criterion "${smallest.label}" has the least impact, removing only ${smallest.dropped.toLocaleString()} patients (${smallest.dropPct.toFixed(1)}%).`;
  }

  // 4. Retention / rate / conversion
  if (/retention|rate|conversion/.test(lower)) {
    return `Overall retention rate: ${pct}% (${finalCount.toLocaleString()} of ${startingPop.toLocaleString()} patients survive all ${enabledCount} enabled criteria).`;
  }

  // 5. Summary / overview
  if (/summary|overview/.test(lower)) {
    const totalDropped = startingPop - finalCount;
    const avgDropPct = criteriaSteps.length > 0
      ? (criteriaSteps.reduce((sum, s) => sum + s.dropPct, 0) / criteriaSteps.length).toFixed(1)
      : '0';
    return `Starting from ${startingPop.toLocaleString()} patients, ${enabledCount} of ${totalCriteria} criteria are active. The funnel drops ${totalDropped.toLocaleString()} patients total (avg ${avgDropPct}% per step), yielding a final cohort of ${finalCount.toLocaleString()} (${pct}% retention).`;
  }

  // 6. Demographics
  if (/demographics|gender|age/.test(lower)) {
    return 'Demographics in the eligible cohort (mock): ~55% female, ~45% male. Mean age ~68 years (range 50-82). Top comorbidities: hypertension (42%), diabetes (28%).';
  }

  // 7. Criteria / enabled / active
  if (/criteria|enabled|active/.test(lower)) {
    if (criteriaSteps.length === 0) return `All ${totalCriteria} criteria are currently disabled.`;
    const list = criteriaSteps.map((s) => `  - ${s.isExclusion ? '[EXC]' : '[INC]'} ${s.label} (drop: ${s.dropped.toLocaleString()})`).join('\n');
    return `${enabledCount} of ${totalCriteria} criteria enabled:\n${list}`;
  }

  // 8. Atoms
  if (/atoms/.test(lower)) {
    const totalAtoms = criteriaSteps.reduce((sum, s) => sum + s.atoms.length, 0);
    const structured = criteriaSteps.reduce((sum, s) => sum + s.atoms.filter((a) => a.dataSource === 'structured').length, 0);
    const unstructured = totalAtoms - structured;
    return `Across ${enabledCount} enabled criteria there are ${totalAtoms} atoms: ${structured} structured, ${unstructured} unstructured.`;
  }

  // 9. What if / remove / without
  if (/what if|remove|without/.test(lower)) {
    const match = criteriaSteps.find((s) => lower.includes(s.label.toLowerCase()));
    if (match) {
      const newFinal = finalCount + match.dropped;
      return `If you disable "${match.label}", approximately ${match.dropped.toLocaleString()} patients would be recovered, bringing the estimated cohort to ~${newFinal.toLocaleString()} patients.`;
    }
    return 'Please mention a specific criterion name. For example: "What if I remove Age >= 18?"';
  }

  // 10. Fallback
  return 'I can answer questions about your cohort. Try:\n  - "How many patients are eligible?"\n  - "Which criterion has the biggest drop?"\n  - "Give me a summary"\n  - "What if I remove [criterion name]?"\n  - "Show me the atoms"\n  - "What is the retention rate?"';
}

/* ─── CSV Export helper ─── */
function exportCohortCSV(
  cohort: CohortImport,
  enabledIds: Set<string>,
  projectName: string,
  hasRealData: boolean,
) {
  const enabledCriteria = cohort.criteria.filter((c) => enabledIds.has(c.id));
  const header = ['Patient ID', ...enabledCriteria.map((c) => c.name), 'Eligible'];

  // Build patient eligibility map
  const rows: string[][] = [];

  if (hasRealData && cohort.criteriaResults && cohort.criteriaResults.length > 0) {
    // Real data: compute from atom patient lists
    const results = cohort.criteriaResults;

    // Collect all patients
    const allPatientsSet = new Set<string>();
    for (const cr of results) {
      for (const atom of cr.atoms) {
        for (const p of atom.patient_list_yes) allPatientsSet.add(p);
        for (const p of atom.patient_list_no) allPatientsSet.add(p);
        for (const p of atom.patient_list_unknown) allPatientsSet.add(p);
      }
    }

    const allPatients = Array.from(allPatientsSet).sort();

    // For each criterion, compute pass set
    const criterionPassSets = new Map<string, Set<string>>();
    for (const criterion of enabledCriteria) {
      const crResult = results.find((r: CohortCriterionResult) => {
        if (r.atoms.length === 0) return false;
        return r.atoms.some((a: CohortAtomResult) =>
          criterion.atoms.some((da) =>
            da.id.includes(a.atom_id) || a.atom_id.includes(da.id.split('-').pop() ?? ''),
          ),
        );
      }) ?? results[cohort.criteria.indexOf(criterion)];

      const isExclusion = criterion.type === 'exclusion';
      const passSet = new Set<string>();

      if (crResult) {
        const logic = criterion.atomLogic;
        if (logic === 'OR') {
          for (const atom of crResult.atoms) {
            const passing = isExclusion
              ? [...atom.patient_list_no, ...atom.patient_list_unknown]
              : atom.patient_list_yes;
            for (const p of passing) passSet.add(p);
          }
        } else {
          const atomPassSets = crResult.atoms.map((atom: CohortAtomResult) => {
            return isExclusion
              ? new Set([...atom.patient_list_no, ...atom.patient_list_unknown])
              : new Set(atom.patient_list_yes);
          });
          if (atomPassSets.length > 0) {
            for (const p of atomPassSets[0]) {
              if (atomPassSets.every((s) => s.has(p))) passSet.add(p);
            }
          }
        }
      } else {
        // No result, all pass
        for (const p of allPatients) passSet.add(p);
      }

      criterionPassSets.set(criterion.id, passSet);
    }

    for (const patientId of allPatients) {
      const flags: string[] = [];
      let allPass = true;
      for (const criterion of enabledCriteria) {
        const passes = criterionPassSets.get(criterion.id)?.has(patientId) ?? true;
        flags.push(passes ? 'TRUE' : 'FALSE');
        if (!passes) allPass = false;
      }
      rows.push([patientId, ...flags, allPass ? 'TRUE' : 'FALSE']);
    }
  } else {
    // Display-layer: use patient flags
    for (const patient of cohort.patients) {
      const flags: string[] = [];
      let allPass = true;
      for (const criterion of enabledCriteria) {
        const flag = patient.flags.find((f) => f.criterionId === criterion.id);
        const isExclusion = criterion.type === 'exclusion';
        // Inclusion: patient in yes = TRUE. Exclusion: patient NOT in yes = TRUE (passes).
        let passes: boolean;
        if (!flag) {
          passes = true;
        } else {
          passes = isExclusion ? !flag.value : flag.value;
        }
        flags.push(passes ? 'TRUE' : 'FALSE');
        if (!passes) allPass = false;
      }
      rows.push([patient.patientId, ...flags, allPass ? 'TRUE' : 'FALSE']);
    }
  }

  // Build CSV string
  const csvContent = [header, ...rows].map((row) => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `${projectName.replace(/\s+/g, '_')}_cohort_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ━━━━━━━━━━━━━━━━━━ Component ━━━━━━━━━━━━━━━━━━ */
export default function CTFunnelPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, cohortImports } = useAppContext();

  const project = projects.find((p) => p.id === projectId);
  const cohort: CohortImport | null = cohortImports.find((c) => c.id === project?.cohortImportId) ?? null;

  const hasRealData = !!(cohort?.criteriaResults && cohort.criteriaResults.length > 0);

  /* ─── Build criterion rows from shared.ts ─── */
  const criterionRows: CriterionRowData[] = useMemo(() => {
    if (!cohort) return [];
    return buildCriterionRows(cohort);
  }, [cohort]);

  /* ─── Criteria toggle state ─── */
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    if (!cohort) return {};
    return Object.fromEntries(cohort.criteria.map((c) => [c.id, true]));
  });

  const enabledIds = useMemo(
    () => new Set(Object.entries(enabled).filter(([, v]) => v).map(([k]) => k)),
    [enabled],
  );

  const enabledCount = enabledIds.size;
  const totalCriteria = cohort?.criteria.length ?? 0;

  const toggle = useCallback((id: string) => setEnabled((prev) => ({ ...prev, [id]: !prev[id] })), []);
  const resetAll = useCallback(() => {
    if (!cohort) return;
    setEnabled(Object.fromEntries(cohort.criteria.map((c) => [c.id, true])));
  }, [cohort]);

  /* ─── Funnel computation ─── */
  const steps = useMemo(() => {
    if (!cohort) return [];
    return hasRealData ? computeRealFunnel(cohort, enabledIds) : computeFlagFunnel(cohort, enabledIds);
  }, [cohort, enabledIds, hasRealData]);

  const startingPop = steps[0]?.remaining ?? 0;
  const finalCount = steps.length > 1 ? steps[steps.length - 1].remaining : startingPop;

  /* ─── Expanded waterfall steps ─── */
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((criterionId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(criterionId)) {
        next.delete(criterionId);
      } else {
        next.add(criterionId);
      }
      return next;
    });
  }, []);

  /* ─── Chat ─── */
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');

  const sendChat = useCallback(() => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    setChatMessages((prev) => [
      ...prev,
      { role: 'user', text: trimmed },
      { role: 'bot', text: chatRespond(trimmed, finalCount, startingPop, steps, enabledCount, totalCriteria) },
    ]);
    setChatInput('');
  }, [chatInput, finalCount, startingPop, steps, enabledCount, totalCriteria]);

  /* ─── CSV Export ─── */
  const handleExport = useCallback(() => {
    if (!cohort || !project) return;
    exportCohortCSV(cohort, enabledIds, project.name, hasRealData);
  }, [cohort, project, enabledIds, hasRealData]);

  /* ─── Guards ─── */
  if (!project || !cohort) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p>Project or cohort not found.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ─── Header ─── */}
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/projects/${projectId}/criteria`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Criteria
          </button>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{project.name}</span>
          <Badge variant="processing" className="text-[10px] px-2 py-0">
            <FlaskConical className="h-3 w-3 mr-1" /> CT
          </Badge>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> Export Cohort
        </button>
      </header>

      {/* ─── Two-panel layout ─── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── Left Panel: Criteria Toggles ─── */}
        <aside className="w-[35%] border-r flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <div>
              <h2 className="text-base font-bold">Study Criteria</h2>
              <p className="text-xs text-muted-foreground">Toggle criteria to see cohort impact</p>
            </div>
            <button
              onClick={resetAll}
              className="flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <RotateCcw className="h-3 w-3" /> Reset All
            </button>
          </div>

          <ScrollArea className="flex-1 px-5 pb-4">
            <div className="space-y-1.5 pt-2">
              {criterionRows.map((cr) => {
                const isOn = enabled[cr.id] ?? true;
                const catColor = CATEGORY_COLORS[cr.category] ?? 'bg-gray-500/15 text-gray-600';
                return (
                  <button
                    key={cr.id}
                    onClick={() => toggle(cr.id)}
                    className={`w-full flex items-center gap-2.5 rounded-lg border p-3 text-left transition-all ${isOn ? 'bg-card border-border' : 'bg-muted/40 border-transparent opacity-60'}`}
                  >
                    {isOn ? (
                      <ToggleRight className="h-5 w-5 text-primary shrink-0" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={cr.type === 'inclusion' ? 'success' : 'destructive'} className="text-[9px] px-1.5 py-0">
                          {cr.type === 'inclusion' ? 'INC' : 'EXC'}
                        </Badge>
                        <span className="text-sm font-medium truncate">{cr.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border-0 px-2 py-0 text-[10px] font-bold ${catColor}`}>
                          {cr.category}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {cr.atoms.length} atom{cr.atoms.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Enabled / total count footer */}
          <div className="border-t px-5 py-3 text-xs text-muted-foreground text-center">
            <span className="font-semibold text-foreground">{enabledCount}</span> / {totalCriteria} criteria enabled
          </div>
        </aside>

        {/* ─── Right Panel: Cohort Impact + Chat ─── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-6">
            {/* Waterfall */}
            <h2 className="text-base font-bold mb-4">Cohort Impact</h2>
            <div className="space-y-2">
              {steps.map((step, i) => {
                const barWidth = startingPop > 0 ? Math.max((step.remaining / startingPop) * 100, 1) : 100;
                const isFirst = i === 0;
                const isExpanded = expandedSteps.has(step.criterionId);
                const hasAtoms = step.atoms.length > 0;
                const canExpand = !isFirst && hasAtoms;

                return (
                  <div key={i} className="space-y-1">
                    {/* Clickable header */}
                    <div
                      className={`${canExpand ? 'cursor-pointer hover:bg-muted/30 rounded-md px-2 py-1 -mx-2 transition-colors' : ''}`}
                      onClick={() => canExpand && toggleExpand(step.criterionId)}
                    >
                      <div className="flex items-baseline justify-between">
                        <div className="flex items-center gap-1.5">
                          {canExpand && (
                            isExpanded
                              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className="text-sm font-medium">
                            {step.isExclusion && !isFirst ? 'Exclude: ' : ''}{step.label}
                          </span>
                        </div>
                        <span className="text-sm font-bold tabular-nums">{step.remaining.toLocaleString()}</span>
                      </div>
                      <div className="relative h-7 w-full rounded bg-muted/50 overflow-hidden mt-1">
                        <div
                          className="absolute inset-y-0 left-0 rounded bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      {!isFirst && step.dropped > 0 && (
                        <p className="text-xs mt-0.5">
                          <span className="text-red-500 font-semibold">-{step.dropped.toLocaleString()}</span>
                          <span className="text-muted-foreground ml-1">({step.dropPct.toFixed(1)}%)</span>
                          {canExpand && (
                            <span className="text-muted-foreground ml-2 text-[10px]">
                              {isExpanded ? 'click to collapse' : 'click to expand atoms'}
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Expanded atom detail */}
                    {isExpanded && hasAtoms && (
                      <div className="ml-5 border-l-2 border-muted pl-4 py-2 space-y-2">
                        {step.atoms.map((atom) => (
                          <div
                            key={atom.atomId}
                            className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`h-2 w-2 rounded-full shrink-0 ${
                                  atom.dataSource === 'structured'
                                    ? 'bg-blue-500'
                                    : 'bg-amber-500'
                                }`}
                                title={atom.dataSource}
                              />
                              <span className="font-medium truncate">{atom.label}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-2">
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                Y:{atom.yesCount}
                              </span>
                              <span className="text-red-500 font-semibold">
                                N:{atom.noCount}
                              </span>
                              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                ?:{atom.unknownCount}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Estimated Cohort Size */}
            <div
              className={`mt-6 rounded-xl p-5 text-center ${
                finalCount > 0
                  ? 'bg-emerald-500/10 border border-emerald-300 dark:border-emerald-700'
                  : 'bg-amber-500/10 border border-amber-300 dark:border-amber-700'
              }`}
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Estimated Cohort Size
              </p>
              <p className="text-3xl font-black tabular-nums">{finalCount.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {finalCount.toLocaleString()} patients &mdash;{' '}
                {startingPop > 0 ? ((finalCount / startingPop) * 100).toFixed(2) : '0'}% of starting
                population
              </p>
            </div>

            {/* ─── Chatbot Section ─── */}
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold">Ask about your cohort</h3>
              </div>

              <div className="rounded-xl border bg-card">
                {/* Messages */}
                <ScrollArea className="max-h-60 p-4">
                  {chatMessages.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">
                      Ask about patient counts, criteria impact, demographics, atoms, retention rate, or
                      &quot;what if&quot; scenarios...
                    </p>
                  )}
                  <div className="space-y-3">
                    {chatMessages.map((m, idx) => (
                      <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                            m.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="flex items-center gap-2 border-t px-4 py-3">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                    placeholder="Type a question..."
                    className="flex-1 text-sm"
                  />
                  <button
                    onClick={sendChat}
                    className="flex items-center justify-center rounded-lg bg-primary p-2 text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
