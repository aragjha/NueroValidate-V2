import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import type { CohortCriterion, CriterionType, RunConfig, Status } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog } from '@/components/ui/dialog';
import { Sheet } from '@/components/ui/sheet';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  DollarSign,
  ExternalLink,
  Eye,
  Loader2,
  Lock,
  Mail,
  Maximize2,
  Minimize2,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Play,
  Plus,
  Search,
  Sparkles,
  Square,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

const LLM_OPTIONS = ['GPT-5.4', 'Claude Sonnet', 'Gemini 2.5 Pro', 'Llama 4 Maverick'] as const;

export function CriteriaPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const isAddNewCT = searchParams.get('addNew') === 'true';
  const { role, criteria, runs, projects, cohortImports } = useAppContext();
  const currentProject = projects.find((p) => p.id === projectId) ?? projects[0];
  const isCTFlow = currentProject?.flowType === 'ct';
  const cohort = isCTFlow ? cohortImports.find((c) => c.id === currentProject?.cohortImportId) : null;
  /* For CT flow, synthesize a Criterion[] from the cohort's criteria so the RWE stage UI
   * (Prompts, Run Config, Processing, Review) works per-criterion without a separate page.
   * Prefill sample prompts so the user sees a reasonable starting point (same pattern as RWE). */
  const ctSynthesizedCriteria = useMemo(() => {
    if (!isCTFlow || !cohort) return [] as typeof criteria;
    const verb = (t: 'inclusion' | 'exclusion') => (t === 'inclusion' ? 'meets' : 'violates');
    const kwHint = (atoms: { keywords?: string[] }[]) => {
      const kws = atoms.flatMap((a) => a.keywords ?? []).slice(0, 6);
      return kws.length ? ` Focus on: ${kws.join(', ')}.` : '';
    };
    return cohort.criteria.map((cr) => {
      const label = cr.name;
      const unstructuredAtoms = (cr.atoms ?? []).filter((a) => a.dataSource === 'unstructured');
      const hint = kwHint(unstructuredAtoms);
      const extractionPrompt =
        `Extract all evidence from clinical notes relevant to "${label}". ` +
        `Capture dates, values, provider attribution, and any qualifiers (active vs. historical, confirmed vs. suspected).` +
        hint;
      const extractionValidation =
        `Return a JSON object with fields: evidence_snippets (array of strings), dates (ISO), confidence (0-1). ` +
        `If no evidence is found, return empty arrays — do not hallucinate.`;
      const reasoningPrompt =
        `Using the extracted evidence, decide whether the patient ${verb(cr.type)} the criterion "${label}". ` +
        `Weigh recency, specificity of documentation, and whether evidence is clearly attributable to this patient.`;
      const reasoningValidation =
        `Return exactly one of: Eligible / Ineligible / Unknown, plus a one-sentence rationale citing the strongest evidence snippet.`;
      return {
        id: cr.id,
        name: cr.name,
        type: cr.type,
        description: cr.description ?? '',
        extractionPrompt,
        extractionValidation,
        reasoningPrompt,
        reasoningValidation,
        model: 'GPT-5.4',
        keywords: unstructuredAtoms.flatMap((a) => a.keywords ?? []).slice(0, 10),
      };
    });
  }, [isCTFlow, cohort]);

  /* Read URL params to init stage + selected criterion.
   * Supports ?stage=N and ?selected=<criterionId>. Used when Criteria Home deep-links
   * into the RWE stages. */
  const urlStage = Number.parseInt(searchParams.get('stage') ?? '', 10);
  const urlSelected = searchParams.get('selected');
  const effectiveInitialCriteria = isCTFlow && ctSynthesizedCriteria.length > 0 ? ctSynthesizedCriteria : criteria;
  const initialSelected =
    (urlSelected && effectiveInitialCriteria.find((c) => c.id === urlSelected)?.id)
      ?? effectiveInitialCriteria[0]?.id
      ?? '';
  const initialStage = Number.isFinite(urlStage) && urlStage >= 1 && urlStage <= 4 ? urlStage : 1;

  const [stage, setStage] = useState(initialStage);
  const [collapsed, setCollapsed] = useState(false);
  const [selected, setSelected] = useState(initialSelected);

  // Local criteria state — for CT flow, use synthesized cohort criteria
  const [localCriteria, setLocalCriteria] = useState(effectiveInitialCriteria);
  const [addMode, setAddMode] = useState(false);
  const [newCritName, setNewCritName] = useState('');
  const [newCritType, setNewCritType] = useState<CriterionType>('inclusion');

  // Prompt editing (stage 2)
  const selCrit = localCriteria.find((c) => c.id === selected);
  const [extractionPrompt, setExtractionPrompt] = useState('');
  const [extractionValidation, setExtractionValidation] = useState('');
  const [extractionModel, setExtractionModel] = useState('GPT-5.4');
  const [reasoningPrompt, setReasoningPrompt] = useState('');
  const [reasoningValidation, setReasoningValidation] = useState('');
  const [reasoningModel, setReasoningModel] = useState('GPT-5.4');
  const [skipExtraction, setSkipExtraction] = useState(false);
  const [maxExtractionAttempts, setMaxExtractionAttempts] = useState(3);
  const [maxReasoningAttempts, setMaxReasoningAttempts] = useState(3);

  // Run configuration (stage 3)
  const [runId, setRunId] = useState('RUN-001');
  const [overrideModels, setOverrideModels] = useState(false);
  const [overridePrompts, setOverridePrompts] = useState(false);
  const [overrideKeywords, setOverrideKeywords] = useState(false);
  const [sampleSize, setSampleSize] = useState('50');
  const [patientIds, setPatientIds] = useState('');
  const [runScope, setRunScope] = useState<'sample' | 'specific' | 'reuse' | 'full'>('sample');
  const [reuseRunId, setReuseRunId] = useState('');
  const [processingMode, setProcessingMode] = useState<'fast' | 'batch'>('fast');

  // Override fields (new values when overriding)
  const [overrideExModel, setOverrideExModel] = useState('GPT-5.4');
  const [overrideReModel, setOverrideReModel] = useState('GPT-5.4');
  const [overrideExPrompt, setOverrideExPrompt] = useState('');
  const [overrideExValidation, setOverrideExValidation] = useState('');
  const [overrideRePrompt, setOverrideRePrompt] = useState('');
  const [overrideReValidation, setOverrideReValidation] = useState('');
  const [overrideKw, setOverrideKw] = useState('');

  // Processing (stage 4)
  const [status, setStatus] = useState<Status>('Queued');
  const [count, setCount] = useState(0);
  const [totalCount] = useState(50);
  const [fileName] = useState('migraine_cohort_batch_01.csv');

  // Expanded override modal
  const [expandedOverride, setExpandedOverride] = useState<'models' | 'prompts' | 'keywords' | null>(null);

  // Run detail modal
  const [inspectRun, setInspectRun] = useState<RunConfig | null>(null);

  // See prompts & re-run sheet
  const [promptsSheetOpen, setPromptsSheetOpen] = useState(false);
  const [draftExtractionPrompt, setDraftExtractionPrompt] = useState('');
  const [draftReasoningPrompt, setDraftReasoningPrompt] = useState('');
  const [reRunning, setReRunning] = useState(false);

  // Cost estimation
  const [showCostEstimate, setShowCostEstimate] = useState<string | null>(null);
  const [costPanelRunId, setCostPanelRunId] = useState<string | null>(null);
  const [selectedRefRunId, setSelectedRefRunId] = useState<string>('');
  const [costCalculating, setCostCalculating] = useState(false);

  // All completed runs with cost data
  const completedRunsWithCost = useMemo(() => runs.filter(r => r.status === 'Done' && r.costProfile), [runs]);

  // ─── CT Sub-stage State ───
  // CT sub-stages
  /* CT sub-stages only matter at stage 1 (setup). If deep-linking into stage >= 2,
   * skip the CT setup screens entirely. */
  const [ctSubStage, setCtSubStage] = useState<'criteriaConfig' | 'processing' | 'dataViewer' | null>(
    isCTFlow && initialStage === 1 ? 'criteriaConfig' : null
  );
  // Per-ATOM keywords, auto-populated from atom labels
  const [ctKeywords, setCtKeywords] = useState<Record<string, string[]>>(() => {
    if (!cohort) return {};
    const kw: Record<string, string[]> = {};
    for (const cr of cohort.criteria) {
      for (const atom of cr.atoms) {
        const parts = atom.label.toLowerCase().replace(/[≥≤<>=/(),.]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !['and', 'the', 'for', 'with', 'from'].includes(w));
        kw[atom.id] = [...new Set(parts)];
      }
    }
    return kw;
  });
  const [ctKeywordInput, setCtKeywordInput] = useState<Record<string, string>>({});
  const [atomClassification, setAtomClassification] = useState<Record<string, 'structured' | 'unstructured'>>({});
  const [ctProcessStatus, setCtProcessStatus] = useState<'Queued' | 'Processing' | 'Done'>('Queued');
  const [ctProcessPct, setCtProcessPct] = useState(0);
  const [ctDataTab, setCtDataTab] = useState(0);
  const [ctDataSearch, setCtDataSearch] = useState('');
  // Accordion state
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);

  // CT criteriaConfig filter state — per section (inclusion / exclusion)
  type SectionView = 'all' | 'unstructured' | 'structured';
  type SectionSort = 'order' | 'atom-count' | 'pct-unstructured';
  const [incView, setIncView] = useState<SectionView>('all');
  const [incSort, setIncSort] = useState<SectionSort>('order');
  const [excView, setExcView] = useState<SectionView>('all');
  const [excSort, setExcSort] = useState<SectionSort>('order');
  // Bulk paste keyword input (per atom)
  const [ctBulkKeywordInput, setCtBulkKeywordInput] = useState<Record<string, string>>({});
  // Data viewer sub-toggle + status filter
  const [ctDataKind, setCtDataKind] = useState<'structured' | 'unstructured'>('unstructured');
  const [ctDataStatus, setCtDataStatus] = useState<'all' | 'matched' | 'unmatched' | 'pending'>('all');

  // CT helper functions
  function addCtKeyword(atomId: string) {
    const val = (ctKeywordInput[atomId] ?? '').trim();
    if (!val) return;
    setCtKeywords(prev => ({ ...prev, [atomId]: [...(prev[atomId] ?? []), val] }));
    setCtKeywordInput(prev => ({ ...prev, [atomId]: '' }));
  }
  function addCtBulkKeywords(atomId: string) {
    const raw = (ctBulkKeywordInput[atomId] ?? '').trim();
    if (!raw) return;
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    setCtKeywords(prev => {
      const existing = new Set(prev[atomId] ?? []);
      for (const p of parts) existing.add(p);
      return { ...prev, [atomId]: Array.from(existing) };
    });
    setCtBulkKeywordInput(prev => ({ ...prev, [atomId]: '' }));
  }
  function removeCtKeyword(atomId: string, index: number) {
    setCtKeywords(prev => ({ ...prev, [atomId]: (prev[atomId] ?? []).filter((_, i) => i !== index) }));
  }

  function toggleCriterion(crId: string) {
    setExpandedCriteria(prev => {
      const next = new Set(prev);
      if (next.has(crId)) next.delete(crId); else next.add(crId);
      return next;
    });
  }
  function toggleExpandAll() {
    if (expandAll) {
      setExpandedCriteria(new Set());
    } else {
      setExpandedCriteria(new Set(cohort?.criteria.map(c => c.id) ?? []));
    }
    setExpandAll(!expandAll);
  }

  function startCtProcessing() {
    setCtProcessStatus('Processing');
    setCtProcessPct(0);
    let pct = 0;
    const timer = setInterval(() => {
      pct += 8;
      if (pct >= 100) {
        clearInterval(timer);
        setCtProcessPct(100);
        setCtProcessStatus('Done');
      } else {
        setCtProcessPct(pct);
      }
    }, 200);
  }

  // Mock contexts for CT data viewer
  const CT_MOCK_CONTEXTS: Record<string, string[]> = {
    Demographics: [
      'Patient demographics: DOB 1958-04-12, age 67 years. Gender: F. Race: White.',
      'Demographics note: Male patient, 72 years old, DOB 1953-11-22. Ethnicity: Non-Hispanic.',
      'Patient info: Age 65, Female. Primary language: English. Insurance: Medicare.',
    ],
    Imaging: [
      'IMAGING REPORT: Florbetapir PET scan. Visual read: POSITIVE for amyloid plaques. Centiloid: 45.',
      'MRI Brain w/o contrast: Mild cortical atrophy. No acute infarct. Periventricular WMH Fazekas 2.',
      'PET-CT Report: FDG uptake showing temporoparietal hypometabolism consistent with AD pattern.',
    ],
    Procedures: [
      'SURGICAL HISTORY: 1. Appendectomy 1995. No cranial procedures. No lumbar punctures on record.',
      'Procedure log: Lumbar puncture performed 2024-01-15. CSF collected for biomarker analysis.',
      'No surgical history relevant to neurological condition. Routine colonoscopy 2022.',
    ],
    Diagnosis: [
      'Assessment: Mild cognitive impairment (MCI) due to Alzheimer disease. MMSE 24/30.',
      'Diagnosis: Early-onset Alzheimer disease, amnestic presentation. CDR 0.5.',
      'Clinical impression: Probable AD dementia per NIA-AA criteria. Biomarker-supported.',
    ],
    Labs: [
      'Lab results: CSF A-beta42 = 385 pg/mL (low), p-tau181 = 62 pg/mL (elevated). Ratio 6.2.',
      'Blood panel: CBC within normal limits. CMP unremarkable. TSH 2.1 mIU/L. B12 normal.',
      'Plasma biomarkers: p-tau217 = 0.85 pg/mL (elevated). NfL = 22.5 pg/mL.',
    ],
    Medication: [
      'Current medications: Donepezil 10mg daily, Memantine 10mg BID, Atorvastatin 20mg.',
      'Med reconciliation: Lecanemab 10mg/kg IV q2w (started 2024-03). No adverse infusion reactions.',
      'Active prescriptions: Aducanumab discontinued 2023-06. Switched to donanemab trial.',
    ],
    Cognitive: [
      'Neuropsych testing: MMSE 22/30, MoCA 18/30. Significant decline in delayed recall domain.',
      'CDR assessment: Global CDR = 1.0 (mild dementia). CDR-SB = 5.5. Memory box score = 2.',
      'Cognitive screening: ADAS-Cog 28. Trail Making B: 180 seconds (impaired).',
    ],
    Biomarkers: [
      'Amyloid PET: Centiloid 55, positive. Tau PET: Braak stage III-IV pattern.',
      'CSF analysis: A-beta42/40 ratio = 0.052 (abnormal). Total tau = 520 pg/mL (elevated).',
      'Blood biomarkers: GFAP 285 pg/mL (elevated, suggesting astrocyte activation).',
    ],
    General: [
      'Clinical note: Patient seen for follow-up. Stable on current regimen.',
      'Progress note: Caregiver reports mild worsening of ADLs over past 3 months.',
      'Encounter summary: Routine 6-month neurology visit. Medication compliance good.',
    ],
  };

  function generateCtRecords(criterion: CohortCriterion, keywords: string[]) {
    if (!cohort) return [];
    const contexts = CT_MOCK_CONTEXTS[criterion.category] ?? CT_MOCK_CONTEXTS['General']!;
    return cohort.patients.map((p, i) => ({
      patientId: p.patientId,
      keywords: keywords.length > 0 ? keywords : ['(no keywords)'],
      context: contexts[i % contexts.length],
    }));
  }

  // The selected reference run
  const referenceRun = useMemo(() => {
    if (selectedRefRunId) return completedRunsWithCost.find(r => r.id === selectedRefRunId) ?? null;
    // Default to first completed run for this criterion, else most recent
    const sameCrit = completedRunsWithCost.filter(r => r.criterionId === selected);
    if (sameCrit.length > 0) return sameCrit[sameCrit.length - 1];
    return completedRunsWithCost.length > 0 ? completedRunsWithCost[completedRunsWithCost.length - 1] : null;
  }, [selectedRefRunId, completedRunsWithCost, selected]);

  const refAvgPerPatient = referenceRun?.costProfile
    ? referenceRun.costProfile.totalCost / referenceRun.costProfile.patientsProcessed
    : null;

  // Refine with AI
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineMinimized, setRefineMinimized] = useState(false);
  const [refineTarget, setRefineTarget] = useState<'extraction' | 'reasoning'>('extraction');
  const [refineStage, setRefineStage] = useState<1 | 2 | 3>(1);
  const [refineStatus, setRefineStatus] = useState<'idle' | 'running' | 'done' | 'stopped'>('idle');
  const [refineSuggestionAccepted, setRefineSuggestionAccepted] = useState<Set<number>>(new Set());

  // Runs grouped by criterion
  const runsByCrit = useMemo(() => {
    const map = new Map<string, RunConfig[]>();
    localCriteria.forEach((c) => map.set(c.id, []));
    runs.forEach((r) => { const arr = map.get(r.criterionId) ?? []; arr.push(r); map.set(r.criterionId, arr); });
    return map;
  }, [localCriteria, runs]);

  const selectedRuns = runsByCrit.get(selected) ?? [];
  const allRuns = runs;

  useEffect(() => {
    if (selCrit) {
      setExtractionPrompt(selCrit.extractionPrompt);
      setExtractionValidation(selCrit.extractionValidation);
      setReasoningPrompt(selCrit.reasoningPrompt);
      setReasoningValidation(selCrit.reasoningValidation);
      setExtractionModel(selCrit.model);
      setReasoningModel(selCrit.model);
      setSkipExtraction(false);
    }
  }, [selCrit]);

  useEffect(() => {
    if (isCTFlow && ctSynthesizedCriteria.length > 0) {
      setLocalCriteria(ctSynthesizedCriteria);
    } else {
      setLocalCriteria(criteria);
    }
  }, [criteria, isCTFlow, ctSynthesizedCriteria]);

  useEffect(() => {
    if (stage !== 4 || status !== 'Processing' || processingMode === 'batch') return;
    const id = setInterval(() => {
      setCount((prev) => { const next = prev + 1; if (next >= totalCount) { clearInterval(id); setStatus('Done'); } return Math.min(next, totalCount); });
    }, 200);
    return () => clearInterval(id);
  }, [stage, status, totalCount, processingMode]);

  function addCriterion() {
    if (!newCritName.trim()) return;
    const newC = { id: `cri-${Math.random().toString(36).slice(2, 8)}`, name: newCritName.trim(), type: newCritType, description: '', extractionPrompt: '', extractionValidation: '', reasoningPrompt: '', reasoningValidation: '', model: 'GPT-5.4', keywords: [] as string[] };
    setLocalCriteria((prev) => [...prev, newC]);
    setSelected(newC.id);
    setNewCritName('');
    setAddMode(false);
  }

  const showRunsPanel = stage >= 2;

  // Find criterion name for a run
  function critNameForRun(r: RunConfig) {
    return localCriteria.find((c) => c.id === r.criterionId)?.name ?? r.criterionId;
  }

  const MOCK_EVAL = {
    dimensions: [
      { dimension: 'Task Clarity', score: 0.82, rationale: 'Primary goal is clear but lacks specificity on multi-encounter handling.' },
      { dimension: 'Input-Output Contract', score: 0.65, rationale: 'Output format partially specified. Missing handling for null values.' },
      { dimension: 'Determinism', score: 0.71, rationale: 'Ambiguity in resolving conflicting evidence across encounters.' },
      { dimension: 'Entity Coverage', score: 0.88, rationale: 'Key clinical entities well covered. Minor gap in dosage extraction.' },
      { dimension: 'Field Extraction Precision', score: 0.75, rationale: 'Extraction targets defined but boundary conditions need tightening.' },
      { dimension: 'Classification Logic', score: 0.69, rationale: 'Thresholds stated but edge case handling near boundary is missing.' },
      { dimension: 'Edge Case Handling', score: 0.55, rationale: 'No instructions for negated mentions, historical vs current, or abbreviations.' },
      { dimension: 'Structural Organization', score: 0.78, rationale: 'Logical structure but could benefit from numbered steps.' },
      { dimension: 'Token Efficiency', score: 0.84, rationale: 'Reasonably concise. Minor redundancy could be eliminated.' },
    ],
    overallScore: 0.74,
    failureModes: [
      { description: 'May extract historical conditions as current when temporal context is ambiguous.', severity: 'high', type: 'hallucination', probability: 0.30 },
      { description: 'Negated findings ("no evidence of X") may be misclassified as positive.', severity: 'critical', type: 'misclassification', probability: 0.25 },
      { description: 'Abbreviations like "hx"/"dx" may be inconsistently expanded.', severity: 'medium', type: 'inconsistency', probability: 0.15 },
    ],
    summary: 'Prompt is functional but needs stronger edge-case handling and explicit output contract rules.',
  };

  const MOCK_SUGGESTIONS = [
    { suggestion: 'Add explicit instruction to distinguish current conditions from historical mentions using temporal markers.', dimension: 'Edge Case Handling', priority: 'high' },
    { suggestion: 'Include a negation detection rule: if preceded by "no", "denies", "negative for", treat as absent.', dimension: 'Classification Logic', priority: 'critical' },
    { suggestion: 'Specify output schema explicitly with field types, allowed values, and null handling.', dimension: 'Input-Output Contract', priority: 'high' },
    { suggestion: 'Add numbered processing steps (1. Identify, 2. Classify, 3. Extract) for deterministic execution.', dimension: 'Structural Organization', priority: 'medium' },
  ];

  const MOCK_REVISED = `You are a clinical data extraction agent. Follow these steps precisely:

1. IDENTIFY all mentions of the target criterion in the clinical note:
   - Direct mentions (e.g., "migraine frequency: 6/month")
   - Indirect evidence (e.g., "triptan usage 5-7 times monthly")
   - Negated mentions (e.g., "no history of migraine" → mark as ABSENT)

2. CLASSIFY each mention:
   - PRESENT: Active/current condition with supporting evidence
   - ABSENT: Explicitly negated or denied
   - HISTORICAL: Past condition, not currently active
   - AMBIGUOUS: Cannot determine temporal status

3. EXTRACT structured data:
   - field: string (required)
   - value: string | number | null (null when not stated — do NOT invent)
   - unit: string | null (preserve source unit; null if absent)
   - temporality: "current" | "historical" | "ambiguous"
   - evidence_text: string (exact quote from source)

4. OUTPUT: JSON with key "findings" containing array of extracted items.
   If none found: { "findings": [] }

RULES:
- Never infer values not explicitly stated
- "no", "denies", "negative for", "without" = negation markers
- Prefer most recent encounter date when dates conflict`;

  function openRefine(target: 'extraction' | 'reasoning') {
    setRefineTarget(target);
    setRefineOpen(true);
    setRefineMinimized(false);
    setRefineStage(1);
    setRefineStatus('idle');
    setRefineSuggestionAccepted(new Set());
  }

  function toggleSuggestion(idx: number) {
    setRefineSuggestionAccepted(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* CT addNew banner */}
      {isCTFlow && isAddNewCT && (
        <div className="flex items-center justify-between rounded-xl border-2 border-primary/40 bg-primary/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/projects/${projectId}/ct-overview`)}
              className="flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back to Overview
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="text-[9px] px-2 py-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">CT</Badge>
                <span className="text-sm font-semibold">Add New Criterion to {currentProject?.name}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Configure prompt + run extraction. The new criterion will be added to the validation overview.
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-4">
      {/* ─── LEFT PANEL ─── */}
      <aside className={`shrink-0 rounded-2xl border bg-card transition-all shadow-sm ${collapsed ? 'w-14' : 'w-72'}`}>
        <div className="flex items-center justify-between border-b p-4">
          {!collapsed && <span className="text-sm font-semibold">{showRunsPanel ? 'Criteria & Runs' : 'Criteria'}</span>}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed((s) => !s)}>
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        {!collapsed && (
          <div className="flex flex-col h-[calc(100vh-220px)]">
            {!showRunsPanel ? (
              <div className="p-4 space-y-3 flex-1 overflow-hidden flex flex-col">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={''} onChange={() => {}} placeholder="Search criteria..." className="h-9 pl-9 text-xs" />
                </div>
                {addMode ? (
                  <div className="space-y-2 rounded-xl border p-3">
                    <Input value={newCritName} onChange={(e) => setNewCritName(e.target.value)} placeholder="Criterion name" className="h-8 text-xs" autoFocus onKeyDown={(e) => e.key === 'Enter' && addCriterion()} />
                    <Select value={newCritType} onChange={(e) => setNewCritType(e.target.value as CriterionType)} className="h-8 text-xs"><option value="inclusion">Inclusion</option><option value="exclusion">Exclusion</option></Select>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 h-7 text-xs" onClick={addCriterion}>Add</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddMode(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setAddMode(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Add criteria</Button>
                )}
                <ScrollArea className="flex-1">
                  <div className="space-y-1">
                    {/* Imported base criteria (CT flow only) */}
                    {isCTFlow && cohort && cohort.criteria.length > 0 && (
                      <>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-3.5 pt-2 pb-1">Base Criteria (Imported)</p>
                        {cohort.criteria.map((cr) => (
                          <div key={`imported-${cr.id}`} className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm bg-muted/30 opacity-70 cursor-default">
                            <div className="flex items-center gap-1.5 truncate">
                              <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                              <span className="truncate text-xs text-muted-foreground">{cr.name}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Badge variant="secondary" className="text-[8px] px-1 py-0">BASE</Badge>
                              <Badge variant={cr.type === 'inclusion' ? 'success' : 'destructive'} className="text-[9px]">{cr.type === 'inclusion' ? 'IN' : 'EX'}</Badge>
                            </div>
                          </div>
                        ))}
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-3.5 pt-3 pb-1">Additional Criteria (Extraction)</p>
                      </>
                    )}
                    {localCriteria.map((criterion) => (
                      <button key={criterion.id} onClick={() => setSelected(criterion.id)} className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors cursor-pointer ${selected === criterion.id ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-foreground'}`}>
                        <span className="truncate text-xs">{criterion.name}</span>
                        <Badge variant={criterion.type === 'inclusion' ? 'success' : 'destructive'} className="text-[9px] ml-2 shrink-0">{criterion.type === 'inclusion' ? 'IN' : 'EX'}</Badge>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="p-3 border-b space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Criterion</label>
                  <Select value={selected} onChange={(e) => setSelected(e.target.value)} className="h-8 text-xs">
                    {localCriteria.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                  {selCrit && (
                    <div className="flex items-center gap-1.5">
                      <Badge variant={selCrit.type === 'inclusion' ? 'success' : 'destructive'} className="text-[8px] px-1.5 py-0">{selCrit.type}</Badge>
                      <span className="text-[10px] text-muted-foreground">{selCrit.model}</span>
                    </div>
                  )}
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Runs</p>
                    {selectedRuns.length === 0 && <p className="text-[10px] text-muted-foreground italic py-2">No runs yet</p>}
                    {selectedRuns.map((run) => (
                      <div key={run.id} className="rounded-lg border p-2.5 text-[10px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{run.runId}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setInspectRun(run)} className="rounded p-0.5 hover:bg-muted cursor-pointer text-muted-foreground hover:text-primary transition-colors" title="View run details">
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            {run.status === 'Done' && (
                              <button onClick={() => setCostPanelRunId(costPanelRunId === run.id ? null : run.id)} className="rounded p-0.5 hover:bg-muted cursor-pointer text-emerald-600 transition-colors" title="View run cost">
                                <DollarSign className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <Badge variant={run.status === 'Done' ? 'success' : run.status === 'Processing' ? 'processing' : 'secondary'} className="text-[8px] px-1.5 py-0">{run.status}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>{run.extractionCount}/{run.totalCount}</span>
                          <span>·</span>
                          <span className="truncate">{run.fileName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* ─── MAIN AREA ─── */}
      <div className="min-w-0 flex-1 space-y-4">
        {/* Stage 1 */}
        {stage === 1 && (
          isCTFlow && ctSubStage ? (
            /* ─── CT Sub-stages ─── */
            ctSubStage === 'criteriaConfig' ? (
              (() => {
                const allCrit = cohort!.criteria;
                const allAtoms = allCrit.flatMap(cr => cr.atoms);
                const getClassification = (atomId: string, defaultVal: 'structured' | 'unstructured') => atomClassification[atomId] ?? defaultVal;
                const unstructuredAtomCount = allAtoms.filter(a => getClassification(a.id, a.dataSource) === 'unstructured').length;
                const structuredAtomCount = allAtoms.length - unstructuredAtomCount;

                function sortAndFilter(rows: CohortCriterion[], view: SectionView, sort: SectionSort): CohortCriterion[] {
                  let out = rows;
                  if (view !== 'all') {
                    out = out.filter(cr => {
                      const hasType = cr.atoms.some(a => getClassification(a.id, a.dataSource) === view);
                      return hasType;
                    });
                  }
                  if (sort === 'atom-count') {
                    out = [...out].sort((a, b) => b.atoms.length - a.atoms.length);
                  } else if (sort === 'pct-unstructured') {
                    out = [...out].sort((a, b) => {
                      const aPct = a.atoms.length ? a.atoms.filter(x => getClassification(x.id, x.dataSource) === 'unstructured').length / a.atoms.length : 0;
                      const bPct = b.atoms.length ? b.atoms.filter(x => getClassification(x.id, x.dataSource) === 'unstructured').length / b.atoms.length : 0;
                      return bPct - aPct;
                    });
                  }
                  return out;
                }

                const inclusionCriteria = allCrit.filter(c => c.type === 'inclusion');
                const exclusionCriteria = allCrit.filter(c => c.type === 'exclusion');
                const incFiltered = sortAndFilter(inclusionCriteria, incView, incSort);
                const excFiltered = sortAndFilter(exclusionCriteria, excView, excSort);

                function renderAtom(atom: typeof allAtoms[number]) {
                  const classification = getClassification(atom.id, atom.dataSource);
                  const keywords = ctKeywords[atom.id] ?? [];
                  const isStructured = classification === 'structured';
                  return (
                    <div key={atom.id} className={`rounded-lg border p-3 space-y-2 ${isStructured ? 'bg-blue-50/30 dark:bg-blue-900/5 border-blue-200 dark:border-blue-800' : 'bg-amber-50/30 dark:bg-amber-900/5 border-amber-200 dark:border-amber-800'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-xs text-muted-foreground">↳</span>
                          <span className="text-xs font-medium truncate">{atom.label}</span>
                          <span className="text-[10px] text-muted-foreground font-mono truncate">{atom.structuredExpression}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); setAtomClassification(prev => ({ ...prev, [atom.id]: 'structured' })); }}
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold cursor-pointer transition-colors ${isStructured ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400 ring-1 ring-blue-300' : 'text-muted-foreground hover:bg-muted'}`}
                          >
                            Structured
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setAtomClassification(prev => ({ ...prev, [atom.id]: 'unstructured' })); }}
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold cursor-pointer transition-colors ${!isStructured ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 ring-1 ring-amber-300' : 'text-muted-foreground hover:bg-muted'}`}
                          >
                            Unstructured
                          </button>
                        </div>
                      </div>
                      {isStructured ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {keywords.length === 0 ? (
                            <span className="text-[10px] text-muted-foreground italic">Matched from mapped table — no keywords needed</span>
                          ) : (
                            <>
                              <span className="text-[10px] text-blue-700 dark:text-blue-400 font-semibold mr-1">Matched from table:</span>
                              {keywords.map((kw, i) => (
                                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-background border px-2 py-0.5 text-[10px] font-medium opacity-70">{kw}</span>
                              ))}
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {keywords.map((kw, i) => (
                              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-background border px-2 py-0.5 text-[10px] font-medium">
                                {kw}
                                <button onClick={(e) => { e.stopPropagation(); removeCtKeyword(atom.id, i); }} className="hover:text-destructive cursor-pointer"><X className="h-2.5 w-2.5" /></button>
                              </span>
                            ))}
                            <input
                              value={ctKeywordInput[atom.id] ?? ''}
                              onChange={(e) => setCtKeywordInput(prev => ({ ...prev, [atom.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCtKeyword(atom.id); } }}
                              placeholder="+ keyword"
                              className="h-6 w-24 rounded-full border bg-background px-2 text-[10px] outline-none focus:ring-1 focus:ring-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              value={ctBulkKeywordInput[atom.id] ?? ''}
                              onChange={(e) => setCtBulkKeywordInput(prev => ({ ...prev, [atom.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCtBulkKeywords(atom.id); } }}
                              placeholder="+ paste comma-separated keywords (e.g. amyloid pet, cognitive decline, lecanemab)"
                              className="h-7 flex-1 rounded-md border bg-background px-2 text-[11px] outline-none focus:ring-1 focus:ring-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => addCtBulkKeywords(atom.id)}>Add</Button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                }

                function renderCriterion(cr: CohortCriterion, crIdx: number, view: SectionView) {
                  const isExpanded = expandedCriteria.has(cr.id);
                  const structCount = cr.atoms.filter(a => getClassification(a.id, a.dataSource) === 'structured').length;
                  const unstructCount = cr.atoms.length - structCount;
                  const visibleAtoms = view === 'all'
                    ? cr.atoms
                    : cr.atoms.filter(a => getClassification(a.id, a.dataSource) === view);
                  const unstructured = visibleAtoms.filter(a => getClassification(a.id, a.dataSource) === 'unstructured');
                  const structured = visibleAtoms.filter(a => getClassification(a.id, a.dataSource) === 'structured');
                  return (
                    <div key={cr.id} className="rounded-xl border overflow-hidden">
                      <button
                        onClick={() => toggleCriterion(cr.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <span className="text-xs font-bold text-muted-foreground w-6">C{crIdx + 1}</span>
                        <span className="text-sm font-semibold flex-1 truncate">{cr.name}</span>
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0">{cr.category}</Badge>
                        <span className="text-[10px] text-muted-foreground shrink-0">{cr.atoms.length} atom{cr.atoms.length !== 1 ? 's' : ''}</span>
                        {structCount > 0 && <Badge variant="processing" className="text-[8px] px-1 py-0 shrink-0">{structCount} struct</Badge>}
                        {unstructCount > 0 && <Badge variant="warning" className="text-[8px] px-1 py-0 shrink-0">{unstructCount} unstruct</Badge>}
                      </button>
                      {isExpanded && (
                        <div className="border-t bg-muted/10 px-4 py-3 space-y-3">
                          {cr.atoms.length > 1 && (
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-semibold">
                              <span>Atom logic:</span>
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{cr.atomLogic}</Badge>
                              <span>{cr.atomLogic === 'AND' ? '— all atoms must pass' : '— any atom passing is sufficient'}</span>
                            </div>
                          )}
                          {unstructured.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Unstructured — needs review ({unstructured.length})</p>
                              {unstructured.map(renderAtom)}
                            </div>
                          )}
                          {structured.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 pt-2 border-t border-dashed">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Structured — auto-validated, no prompts needed ({structured.length})</p>
                              </div>
                              {structured.map(renderAtom)}
                            </div>
                          )}
                          {cr.description && <p className="text-[10px] text-muted-foreground pt-1">{cr.description}</p>}
                        </div>
                      )}
                    </div>
                  );
                }

                function SectionHeader({ title, rows, tone, view, sort, onViewChange, onSortChange }: {
                  title: string;
                  rows: CohortCriterion[];
                  tone: 'success' | 'destructive';
                  view: SectionView;
                  sort: SectionSort;
                  onViewChange: (v: SectionView) => void;
                  onSortChange: (s: SectionSort) => void;
                }) {
                  const total = rows.length;
                  const atomTotal = rows.reduce((s, c) => s + c.atoms.length, 0);
                  const unstructTotal = rows.reduce((s, c) => s + c.atoms.filter(a => getClassification(a.id, a.dataSource) === 'unstructured').length, 0);
                  return (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={tone} className="text-[10px] px-1.5 py-0 font-bold">{title}</Badge>
                        <span className="text-xs text-muted-foreground">{total} criteria · {atomTotal} atoms · {unstructTotal} unstructured</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 gap-0.5">
                          {(['all', 'unstructured', 'structured'] as SectionView[]).map(v => (
                            <button
                              key={v}
                              onClick={() => onViewChange(v)}
                              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold cursor-pointer transition-colors ${view === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                              {v === 'all' ? 'All' : v === 'unstructured' ? 'Unstructured' : 'Structured'}
                            </button>
                          ))}
                        </div>
                        <select
                          value={sort}
                          onChange={(e) => onSortChange(e.target.value as SectionSort)}
                          className="rounded-md border bg-background px-2 py-1 text-[10px] font-medium cursor-pointer"
                        >
                          <option value="order">Sort: Order</option>
                          <option value="atom-count">Sort: Atom count</option>
                          <option value="pct-unstructured">Sort: % unstructured</option>
                        </select>
                      </div>
                    </div>
                  );
                }

                return (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg font-bold">Criteria Configuration</CardTitle>
                          <CardDescription>
                            Review imported criteria, configure keywords per unstructured atom, and tag data sources. {allCrit.length} criteria · {allAtoms.length} atoms · <span className="text-amber-600 font-semibold">{unstructuredAtomCount} unstructured (review required)</span> · <span className="text-blue-600 font-semibold">{structuredAtomCount} structured (auto)</span>
                          </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={toggleExpandAll}>
                          {expandAll ? <><ChevronUp className="mr-1 h-3.5 w-3.5" /> Collapse All</> : <><ChevronDown className="mr-1 h-3.5 w-3.5" /> Expand All</>}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* ── Inclusion section ── */}
                      <div className="space-y-3">
                        <SectionHeader title="INCLUSION CRITERIA" rows={inclusionCriteria} tone="success" view={incView} sort={incSort} onViewChange={setIncView} onSortChange={setIncSort} />
                        {incFiltered.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-4 text-center">No inclusion criteria match this filter.</p>
                        ) : (
                          incFiltered.map((cr) => renderCriterion(cr, inclusionCriteria.indexOf(cr), incView))
                        )}
                      </div>

                      {/* ── Exclusion section ── */}
                      <div className="space-y-3">
                        <SectionHeader title="EXCLUSION CRITERIA" rows={exclusionCriteria} tone="destructive" view={excView} sort={excSort} onViewChange={setExcView} onSortChange={setExcSort} />
                        {excFiltered.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic py-4 text-center">No exclusion criteria match this filter.</p>
                        ) : (
                          excFiltered.map((cr) => renderCriterion(cr, exclusionCriteria.indexOf(cr), excView))
                        )}
                      </div>

                      {/* ── Footer CTA ── */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex gap-4 text-xs">
                          <span className="text-blue-600 font-semibold">{structuredAtomCount} structured atoms (auto-validated)</span>
                          <span className="text-amber-600 font-semibold">{unstructuredAtomCount} unstructured atoms (need prompts)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {unstructuredAtomCount === 0 ? (
                            <Button onClick={() => navigate(`/projects/${projectId}/ct-overview`)} variant="ghost">
                              Skip — all atoms are structured <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          ) : (
                            <Button onClick={() => { setCtSubStage('processing'); startCtProcessing(); }}>
                              Process {unstructuredAtomCount} Unstructured Atom{unstructuredAtomCount !== 1 ? 's' : ''} <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })()
            ) : ctSubStage === 'processing' ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Data Processing</CardTitle>
                  <CardDescription>Generating patient data per criterion using keywords</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge variant={ctProcessStatus === 'Done' ? 'success' : ctProcessStatus === 'Processing' ? 'processing' : 'secondary'}>
                      {ctProcessStatus}
                    </Badge>
                    <Badge variant="secondary">{cohort?.criteria.length ?? 0} criteria</Badge>
                    <Badge variant="secondary">{cohort?.patients.length ?? 0} patients</Badge>
                  </div>
                  <Progress value={ctProcessPct} max={100} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {ctProcessStatus === 'Done'
                      ? 'Data generation complete. Verify the data before configuring prompts.'
                      : `Processing... ${ctProcessPct}%`}
                  </p>
                  {ctProcessStatus === 'Done' && (
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-[11px] text-muted-foreground">
                        Next: review each unstructured atom from the project home.
                      </p>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setCtSubStage('dataViewer')}>
                          <Eye className="mr-2 h-4 w-4" /> Verify Data
                        </Button>
                        <Button onClick={() => navigate(`/projects/${projectId}/ct-overview`)}>
                          Go to Project Home <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : ctSubStage === 'dataViewer' ? (
              <Dialog open={ctSubStage === 'dataViewer'} onClose={() => setCtSubStage('processing')} title="Verify Data" className="max-w-6xl">
                {(() => {
                  const currentCriterion = cohort?.criteria[ctDataTab];
                  const hasStructured = currentCriterion?.atoms.some(a => (atomClassification[a.id] ?? a.dataSource) === 'structured') ?? false;
                  const hasUnstructured = currentCriterion?.atoms.some(a => (atomClassification[a.id] ?? a.dataSource) === 'unstructured') ?? false;
                  const effectiveKind: 'structured' | 'unstructured' =
                    hasStructured && !hasUnstructured ? 'structured' :
                    !hasStructured && hasUnstructured ? 'unstructured' :
                    ctDataKind;

                  return (
                    <>
                      {/* Per-criterion tabs */}
                      <div className="flex gap-2 border-b pb-2 mb-3 overflow-x-auto">
                        {cohort?.criteria.map((cr, idx) => (
                          <button
                            key={cr.id}
                            onClick={() => setCtDataTab(idx)}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer ${ctDataTab === idx ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                          >
                            <Badge variant={cr.type === 'inclusion' ? 'success' : 'destructive'} className="text-[8px] px-1 py-0 mr-1">
                              {cr.type === 'inclusion' ? 'INC' : 'EXC'}
                            </Badge>
                            {cr.name}
                          </button>
                        ))}
                      </div>

                      {/* Kind sub-toggle + status filter */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <div className="flex items-center rounded-lg border bg-muted/40 p-0.5 gap-0.5">
                          <button
                            disabled={!hasUnstructured}
                            onClick={() => setCtDataKind('unstructured')}
                            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${effectiveKind === 'unstructured' ? 'bg-background text-amber-700 dark:text-amber-400 shadow-sm' : 'text-muted-foreground hover:text-foreground'} ${!hasUnstructured ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            Unstructured rows (evidence)
                          </button>
                          <button
                            disabled={!hasStructured}
                            onClick={() => setCtDataKind('structured')}
                            className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${effectiveKind === 'structured' ? 'bg-background text-blue-700 dark:text-blue-400 shadow-sm' : 'text-muted-foreground hover:text-foreground'} ${!hasStructured ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            Structured rows (mapping)
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={ctDataStatus}
                            onChange={(e) => setCtDataStatus(e.target.value as typeof ctDataStatus)}
                            className="rounded-md border bg-background px-2 py-1 text-xs font-medium cursor-pointer"
                          >
                            <option value="all">Show: All</option>
                            <option value="matched">Show: Matched</option>
                            <option value="unmatched">Show: Unmatched</option>
                            <option value="pending">Show: Pending</option>
                          </select>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input value={ctDataSearch} onChange={(e) => setCtDataSearch(e.target.value)} placeholder="Search…" className="pl-9 h-8 w-56 text-xs" />
                          </div>
                        </div>
                      </div>

                      {/* Table */}
                      <div className="rounded-lg border overflow-auto max-h-[60vh]">
                        {effectiveKind === 'unstructured' ? (
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider">#</th>
                                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider">Patient ID</th>
                                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider">Encounter ID</th>
                                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider">Keywords Hit</th>
                                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider">Context Snippet</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {(() => {
                                if (!currentCriterion) return null;
                                const unstructAtoms = currentCriterion.atoms.filter(a => (atomClassification[a.id] ?? a.dataSource) === 'unstructured');
                                const atomKeywords = unstructAtoms.flatMap(a => ctKeywords[a.id] ?? []);
                                const records = generateCtRecords(currentCriterion, [...new Set(atomKeywords)]);
                                const searchLower = ctDataSearch.toLowerCase();
                                let filtered = searchLower
                                  ? records.filter(rec =>
                                      rec.patientId.toLowerCase().includes(searchLower) ||
                                      rec.keywords.some(kw => kw.toLowerCase().includes(searchLower)) ||
                                      rec.context.toLowerCase().includes(searchLower)
                                    )
                                  : records;
                                if (ctDataStatus === 'matched') filtered = filtered.filter((_, i) => i % 3 !== 0);
                                else if (ctDataStatus === 'unmatched') filtered = filtered.filter((_, i) => i % 3 === 0);
                                else if (ctDataStatus === 'pending') filtered = filtered.filter((_, i) => i % 5 === 0);
                                if (filtered.length === 0) return (<tr><td colSpan={5} className="px-3 py-6 text-center text-xs text-muted-foreground">No rows match.</td></tr>);
                                return filtered.map((rec, i) => (
                                  <tr key={i} className="hover:bg-muted/20">
                                    <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                                    <td className="px-3 py-2 text-xs font-mono font-semibold">{rec.patientId}</td>
                                    <td className="px-3 py-2 text-xs font-mono">{rec.patientId}</td>
                                    <td className="px-3 py-2">
                                      <div className="flex flex-wrap gap-1">
                                        {rec.keywords.map((kw) => (
                                          <Badge key={kw} variant="warning" className="text-[9px] px-1.5 py-0">{kw}</Badge>
                                        ))}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[400px]">{rec.context}</td>
                                  </tr>
                                ));
                              })()}
                            </tbody>
                          </table>
                        ) : (
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider">#</th>
                                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider">Patient ID</th>
                                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider">Encounter ID</th>
                                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider">Mapped Field</th>
                                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider">Value</th>
                                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider">Match?</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {(() => {
                                if (!currentCriterion) return null;
                                const structAtoms = currentCriterion.atoms.filter(a => (atomClassification[a.id] ?? a.dataSource) === 'structured');
                                const atomKeywords = structAtoms.flatMap(a => ctKeywords[a.id] ?? []);
                                const records = generateCtRecords(currentCriterion, [...new Set(atomKeywords)]);
                                const searchLower = ctDataSearch.toLowerCase();
                                let filtered = searchLower
                                  ? records.filter(rec => rec.patientId.toLowerCase().includes(searchLower))
                                  : records;
                                if (ctDataStatus === 'matched') filtered = filtered.filter((_, i) => i % 4 !== 0);
                                else if (ctDataStatus === 'unmatched') filtered = filtered.filter((_, i) => i % 4 === 0);
                                else if (ctDataStatus === 'pending') filtered = [];
                                if (filtered.length === 0) return (<tr><td colSpan={6} className="px-3 py-6 text-center text-xs text-muted-foreground">No rows match.</td></tr>);
                                const mappedField = structAtoms[0]?.structuredExpression || currentCriterion.category;
                                return filtered.map((rec, i) => {
                                  const matches = i % 4 !== 0;
                                  return (
                                    <tr key={i} className="hover:bg-muted/20">
                                      <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                                      <td className="px-3 py-2 text-xs font-mono font-semibold">{rec.patientId}</td>
                                      <td className="px-3 py-2 text-xs font-mono">{rec.patientId}</td>
                                      <td className="px-3 py-2 text-[11px] font-mono text-muted-foreground truncate max-w-[250px]">{mappedField}</td>
                                      <td className="px-3 py-2 text-xs">{rec.keywords[0] ?? '—'}</td>
                                      <td className="px-3 py-2">
                                        <Badge variant={matches ? 'success' : 'destructive'} className="text-[9px] px-1.5 py-0">
                                          {matches ? 'TRUE' : 'FALSE'}
                                        </Badge>
                                      </td>
                                    </tr>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        )}
                      </div>

                      <div className="flex justify-end pt-4">
                        <Button variant="outline" onClick={() => setCtSubStage('processing')}>
                          <ChevronLeft className="mr-1 h-4 w-4" /> Back to Processing
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </Dialog>
            ) : null
          ) : (
            /* ─── Original RWE Stage 1 (unchanged) ─── */
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Criteria Review</CardTitle>
                <CardDescription>{selCrit ? `Selected: ${selCrit.name}` : 'Select a criterion from the left panel'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {role === 'Admin' && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => {
                      const criteriaData = localCriteria.map((c) => ({ name: c.name, type: c.type, description: c.description, extractionPrompt: c.extractionPrompt, extractionValidation: c.extractionValidation, reasoningPrompt: c.reasoningPrompt, reasoningValidation: c.reasoningValidation, model: c.model, keywords: c.keywords }));
                      navigate('/projects/new', { state: { duplicate: true, project: currentProject ? { name: `${currentProject.name} (Copy)`, description: currentProject.description, clientId: currentProject.clientId, types: currentProject.types, lead: currentProject.lead, dataTypes: currentProject.dataTypes, providers: currentProject.providers, shared: currentProject.shared, teamAvatars: currentProject.teamAvatars, criteriaList: currentProject.criteriaList } : null, criteria: criteriaData } });
                    }}><Copy className="mr-1 h-3.5 w-3.5" /> Duplicate project</Button>
                    <Button variant="outline" size="sm"><Pencil className="mr-1 h-3.5 w-3.5" /> Edit project</Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete project</Button>
                  </div>
                )}
                {selCrit && (
                  <div className="rounded-xl border bg-muted/30 p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={selCrit.type === 'inclusion' ? 'success' : 'destructive'}>{selCrit.type}</Badge>
                        <span className="text-sm font-bold">{selCrit.name}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDraftExtractionPrompt(selCrit.extractionPrompt);
                          setDraftReasoningPrompt(selCrit.reasoningPrompt);
                          setPromptsSheetOpen(true);
                        }}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" /> See Prompts & Re-run
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">{selCrit.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div><p className="font-semibold text-muted-foreground">Model</p><p>{selCrit.model}</p></div>
                      <div><p className="font-semibold text-muted-foreground">Extraction prompt</p><p className="truncate">{selCrit.extractionPrompt.slice(0, 80)}...</p></div>
                    </div>
                    <Badge variant="secondary">Resume: Ready for prompt configuration</Badge>
                  </div>
                )}
                <div className="flex justify-end"><Button onClick={() => setStage(2)} disabled={!selCrit}>Configure Prompts<ArrowRight className="ml-2 h-4 w-4" /></Button></div>
              </CardContent>
            </Card>
          )
        )}

        {/* Stage 2 — Prompts */}
        {stage === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Prompts & Model Selection</CardTitle>
              <CardDescription>Configure extraction and reasoning prompts for "{selCrit?.name}"</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><h3 className={`text-sm font-bold ${skipExtraction ? 'text-muted-foreground' : ''}`}>Extraction</h3><label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={skipExtraction} onChange={(e) => setSkipExtraction((e.target as HTMLInputElement).checked)} /><span className={skipExtraction ? 'text-muted-foreground' : ''}>Skip extraction</span></label></div>
                  {!skipExtraction && <div className="flex items-center gap-2"><Select value={extractionModel} onChange={(e) => setExtractionModel(e.target.value)} className="h-8 w-48 text-xs">{LLM_OPTIONS.map((m) => <option key={m}>{m}</option>)}</Select><Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openRefine('extraction')}><Sparkles className="mr-1 h-3 w-3" /> Refine with AI</Button></div>}
                </div>
                <div className={`grid gap-4 md:grid-cols-2 transition-opacity ${skipExtraction ? 'opacity-30 pointer-events-none' : ''}`}>
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Prompt</label><Textarea rows={4} value={extractionPrompt} onChange={(e) => setExtractionPrompt(e.target.value)} placeholder="Define extraction logic..." disabled={skipExtraction} /></div>
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Validation</label><Textarea rows={4} value={extractionValidation} onChange={(e) => setExtractionValidation(e.target.value)} placeholder="Validate extraction output..." disabled={skipExtraction} /></div>
                </div>
                {skipExtraction && <p className="text-[11px] text-amber-600 dark:text-amber-400">Extraction step will be skipped — only reasoning results will be used for validation.</p>}
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between"><h3 className="text-sm font-bold">Reasoning</h3><div className="flex items-center gap-2"><Select value={reasoningModel} onChange={(e) => setReasoningModel(e.target.value)} className="h-8 w-48 text-xs">{LLM_OPTIONS.map((m) => <option key={m}>{m}</option>)}</Select><Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openRefine('reasoning')}><Sparkles className="mr-1 h-3 w-3" /> Refine with AI</Button></div></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Prompt</label><Textarea rows={4} value={reasoningPrompt} onChange={(e) => setReasoningPrompt(e.target.value)} placeholder="Define reasoning chain..." /></div>
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Validation</label><Textarea rows={4} value={reasoningValidation} onChange={(e) => setReasoningValidation(e.target.value)} placeholder="Validate reasoning output..." /></div>
                </div>
              </div>
              {/* Subtle Studio entry point */}
              <div className="rounded-xl border border-dashed border-primary/20 bg-primary/[0.02] p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs text-muted-foreground">Want to test this prompt before running? <span className="font-semibold text-primary cursor-pointer hover:underline" onClick={() => navigate(`/studio?from=project&projectId=${currentProject?.id ?? projectId}&criterionId=${selected}`)}>Validate with AI agents</span></p>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStage(1)}><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>
                <Button onClick={() => setStage(3)}>Next: Run Configuration<ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Stage 3 — Run configuration with override fields ═══ */}
        {stage === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Run Configuration</CardTitle>
              <CardDescription>Set run ID, overrides, and scope for "{selCrit?.name}"</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Run ID</label>
                <Input value={runId} onChange={(e) => setRunId(e.target.value)} />
              </div>

              {/* Override options */}
              <div className="space-y-3">
                <label className="text-sm font-semibold">Override options</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={overrideModels} onChange={(e) => setOverrideModels((e.target as HTMLInputElement).checked)} /> Override LLMs</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={overridePrompts} onChange={(e) => setOverridePrompts((e.target as HTMLInputElement).checked)} /> Override prompts</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={overrideKeywords} onChange={(e) => setOverrideKeywords((e.target as HTMLInputElement).checked)} /> Override keywords</label>
                </div>

                {/* Override LLMs expanded */}
                {overrideModels && (
                  <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">New LLM Selection</p>
                      <button onClick={() => setExpandedOverride('models')} className="rounded-md p-1 hover:bg-muted cursor-pointer text-muted-foreground hover:text-primary transition-colors" title="Expand to full screen"><Maximize2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      {!skipExtraction && (
                        <>
                          <div className="space-y-1">
                            <p className="text-muted-foreground">Previous extraction model</p>
                            <p className="font-medium">{extractionModel}</p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-muted-foreground">New extraction model</label>
                            <Select value={overrideExModel} onChange={(e) => setOverrideExModel(e.target.value)} className="h-8 text-xs">{LLM_OPTIONS.map((m) => <option key={m}>{m}</option>)}</Select>
                          </div>
                        </>
                      )}
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Previous reasoning model</p>
                        <p className="font-medium">{reasoningModel}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-muted-foreground">New reasoning model</label>
                        <Select value={overrideReModel} onChange={(e) => setOverrideReModel(e.target.value)} className="h-8 text-xs">{LLM_OPTIONS.map((m) => <option key={m}>{m}</option>)}</Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Override Prompts expanded */}
                {overridePrompts && (
                  <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">New Prompts</p>
                      <button onClick={() => setExpandedOverride('prompts')} className="rounded-md p-1 hover:bg-muted cursor-pointer text-muted-foreground hover:text-primary transition-colors" title="Expand to full screen"><Maximize2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="space-y-3">
                      {!skipExtraction && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-semibold text-muted-foreground">Previous extraction prompt</p>
                              <div className="rounded-lg border bg-muted/30 p-2.5 text-xs text-muted-foreground max-h-20 overflow-y-auto">{extractionPrompt || <span className="italic">Empty</span>}</div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-muted-foreground">New extraction prompt</label>
                              <Textarea rows={3} value={overrideExPrompt} onChange={(e) => setOverrideExPrompt(e.target.value)} placeholder="Override extraction prompt..." className="text-xs" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-semibold text-muted-foreground">Previous extraction validation</p>
                              <div className="rounded-lg border bg-muted/30 p-2.5 text-xs text-muted-foreground max-h-20 overflow-y-auto">{extractionValidation || <span className="italic">Empty</span>}</div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-muted-foreground">New extraction validation</label>
                              <Textarea rows={3} value={overrideExValidation} onChange={(e) => setOverrideExValidation(e.target.value)} placeholder="Override extraction validation..." className="text-xs" />
                            </div>
                          </div>
                          <Separator />
                        </>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold text-muted-foreground">Previous reasoning prompt</p>
                          <div className="rounded-lg border bg-muted/30 p-2.5 text-xs text-muted-foreground max-h-20 overflow-y-auto">{reasoningPrompt || <span className="italic">Empty</span>}</div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-muted-foreground">New reasoning prompt</label>
                          <Textarea rows={3} value={overrideRePrompt} onChange={(e) => setOverrideRePrompt(e.target.value)} placeholder="Override reasoning prompt..." className="text-xs" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold text-muted-foreground">Previous reasoning validation</p>
                          <div className="rounded-lg border bg-muted/30 p-2.5 text-xs text-muted-foreground max-h-20 overflow-y-auto">{reasoningValidation || <span className="italic">Empty</span>}</div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-muted-foreground">New reasoning validation</label>
                          <Textarea rows={3} value={overrideReValidation} onChange={(e) => setOverrideReValidation(e.target.value)} placeholder="Override reasoning validation..." className="text-xs" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Override Keywords expanded */}
                {overrideKeywords && (
                  <div className="rounded-xl border p-4 space-y-2 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">New Keywords</p>
                      <button onClick={() => setExpandedOverride('keywords')} className="rounded-md p-1 hover:bg-muted cursor-pointer text-muted-foreground hover:text-primary transition-colors" title="Expand to full screen"><Maximize2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground">Previous keywords</p>
                        <div className="rounded-lg border bg-muted/30 p-2.5 text-xs text-muted-foreground">{selCrit?.keywords?.join(', ') || <span className="italic">None set</span>}</div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-muted-foreground">New keywords (comma-separated)</label>
                        <Textarea rows={2} value={overrideKw} onChange={(e) => setOverrideKw(e.target.value)} placeholder="keyword1, keyword2, ..." className="text-xs" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Run scope */}
              <div className="space-y-3">
                <label className="text-sm font-semibold">Run scope</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: 'sample' as const, label: 'Sample set', desc: 'Random patient sample' },
                    { value: 'specific' as const, label: 'Specific patient IDs', desc: 'Enter patient IDs manually' },
                    { value: 'reuse' as const, label: 'Reuse previous sample', desc: 'Pick a previous run to reuse patients' },
                    { value: 'full' as const, label: 'Full run', desc: 'All indexed patients' },
                  ]).map((opt) => (
                    <label key={opt.value} className={`flex items-start gap-2 rounded-xl border p-3 cursor-pointer transition-colors ${runScope === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}>
                      <input type="radio" name="runScope" checked={runScope === opt.value} onChange={() => setRunScope(opt.value)} className="accent-primary mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {runScope === 'sample' && (
                <div className="space-y-2"><label className="text-sm font-semibold">Sample size</label><Input type="number" value={sampleSize} onChange={(e) => setSampleSize(e.target.value)} placeholder="50" /></div>
              )}
              {runScope === 'specific' && (
                <div className="space-y-2"><label className="text-sm font-semibold">Patient IDs</label><Textarea value={patientIds} onChange={(e) => setPatientIds(e.target.value)} placeholder="PT-10211, PT-10520, PT-10602..." rows={3} /></div>
              )}
              {runScope === 'reuse' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Select run to reuse patients from</label>
                  {allRuns.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No previous runs available</p>
                  ) : (
                    <div className="space-y-2">
                      <Select value={reuseRunId} onChange={(e) => setReuseRunId(e.target.value)} className="text-xs">
                        <option value="">Select a run...</option>
                        {allRuns.map((r) => (
                          <option key={r.id} value={r.runId}>{r.runId} — {critNameForRun(r)} ({r.extractionCount}/{r.totalCount} patients, {r.status})</option>
                        ))}
                      </Select>
                      {reuseRunId && (() => {
                        const r = allRuns.find((x) => x.runId === reuseRunId);
                        if (!r) return null;
                        return (
                          <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{r.runId}</span>
                              <Badge variant={r.status === 'Done' ? 'success' : 'secondary'} className="text-[8px] px-1.5 py-0">{r.status}</Badge>
                            </div>
                            <p className="text-muted-foreground">Criterion: {critNameForRun(r)}</p>
                            <p className="text-muted-foreground">{r.extractionCount} patients · {r.fileName}</p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Processing Mode ─── */}
              <div className="space-y-3">
                <label className="text-sm font-semibold">Processing mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${processingMode === 'fast' ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}>
                    <input type="radio" name="processingMode" checked={processingMode === 'fast'} onChange={() => setProcessingMode('fast')} className="accent-primary mt-1" />
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        <p className="text-sm font-semibold">Fast Processing</p>
                      </div>
                      <p className="text-xs text-muted-foreground">Great for small runs and quick turnaround. See live progress as it runs.</p>
                    </div>
                  </label>
                  <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${processingMode === 'batch' ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}>
                    <input type="radio" name="processingMode" checked={processingMode === 'batch'} onChange={() => setProcessingMode('batch')} className="accent-primary mt-1" />
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-emerald-600" />
                        <p className="text-sm font-semibold">Batch Processing</p>
                        <Badge variant="success" className="text-[9px] px-1.5 py-0">~50% lower cost</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Runs on pooled LLM capacity for lower cost per patient. Slower turnaround — we'll email you when it's ready.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* ─── Cost Estimate ─── */}
              {(() => {
                const pCount = runScope === 'sample' ? Number(sampleSize || 50)
                  : runScope === 'reuse' ? Number(sampleSize || 50)
                  : runScope === 'full' ? (currentProject?.patientCount ?? 12320)
                  : runScope === 'specific' ? (patientIds.split(',').filter(s => s.trim()).length || 0)
                  : 0;
                const batchMultiplier = processingMode === 'batch' ? 0.5 : 1;
                return (
                  <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-semibold">Cost Estimate</span>
                      </div>
                    </div>

                    {completedRunsWithCost.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No previous runs available. Cost estimate will be available after your first completed run.</p>
                    ) : (
                      <div className="space-y-3">
                        {/* Reference run picker */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Base estimate on</label>
                          <Select
                            value={selectedRefRunId || (referenceRun?.id ?? '')}
                            onChange={(e) => { setSelectedRefRunId(e.target.value); setCostCalculating(true); setTimeout(() => setCostCalculating(false), 1200); }}
                            className="text-xs h-9"
                          >
                            {completedRunsWithCost.map((r) => {
                              const cp = r.costProfile!;
                              const avg = (cp.totalCost / cp.patientsProcessed).toFixed(2);
                              return (
                                <option key={r.id} value={r.id}>
                                  {r.runId} — {cp.patientsProcessed} patients · ${avg}/patient · {critNameForRun(r)}
                                </option>
                              );
                            })}
                          </Select>
                        </div>

                        {/* Estimate result */}
                        {costCalculating ? (
                          <div className="rounded-lg bg-background border p-4 flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Calculating estimate...</span>
                          </div>
                        ) : referenceRun?.costProfile && pCount > 0 ? (
                          <div className="rounded-lg bg-background border p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">{pCount} patients × ${(refAvgPerPatient! * batchMultiplier).toFixed(2)}/patient</span>
                              <div className="flex items-baseline gap-2">
                                {processingMode === 'batch' && (
                                  <span className="text-xs text-muted-foreground line-through">${(pCount * refAvgPerPatient!).toFixed(2)}</span>
                                )}
                                <span className="text-lg font-bold text-emerald-600">${(pCount * refAvgPerPatient! * batchMultiplier).toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                              <span>Extraction: ~${(pCount * referenceRun.costProfile.extractionCost / referenceRun.costProfile.patientsProcessed * batchMultiplier).toFixed(2)}</span>
                              <span>Reasoning: ~${(pCount * referenceRun.costProfile.reasoningCost / referenceRun.costProfile.patientsProcessed * batchMultiplier).toFixed(2)}</span>
                            </div>
                            {processingMode === 'batch' && (
                              <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-semibold pt-1 border-t">
                                <Package className="h-3 w-3" />
                                <span>Batch pricing · pooled LLM capacity, ~50% lower per-patient cost</span>
                              </div>
                            )}
                          </div>
                        ) : pCount === 0 ? (
                          <p className="text-xs text-muted-foreground">Enter patient count or IDs to see estimate.</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Max attempts */}
              <div className="grid grid-cols-2 gap-4">
                {!skipExtraction && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Max extraction attempts</label>
                    <Input type="number" min={1} max={10} value={maxExtractionAttempts} onChange={(e) => setMaxExtractionAttempts(Number(e.target.value))} />
                    <p className="text-[10px] text-muted-foreground">Number of retry attempts for extraction per patient</p>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Max reasoning attempts</label>
                  <Input type="number" min={1} max={10} value={maxReasoningAttempts} onChange={(e) => setMaxReasoningAttempts(Number(e.target.value))} />
                  <p className="text-[10px] text-muted-foreground">Number of retry attempts for reasoning per patient</p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Agentic Flow Entry — Entry Point 2 */}
              <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/[0.03] p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Check with Agentic Flow</p>
                    <p className="text-[11px] text-muted-foreground">Validate your setup with AI agents before running. Test prompts, check accuracy, verify evidence.</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => navigate(`/studio?from=project&projectId=${currentProject?.id ?? projectId}&criterionId=${selected}`)}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Open Agentic Studio
                </Button>
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStage(2)}><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => navigate(`/studio?from=project&projectId=${currentProject?.id ?? projectId}&criterionId=${selected}`)}>
                    <Sparkles className="mr-2 h-4 w-4" /> Check with Agents
                  </Button>
                  <Button onClick={() => { setStage(4); setStatus('Processing'); setCount(0); }}><Play className="mr-2 h-4 w-4" /> Run now</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stage 4 — Processing */}
        {stage === 4 && processingMode === 'fast' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Processing</CardTitle>
              <CardDescription>Run {runId} for "{selCrit?.name}" is being processed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">File: {fileName}</Badge>
                <Badge variant="secondary">Extraction: {count}/{totalCount}</Badge>
                <Badge variant={status === 'Done' ? 'success' : status === 'Failed' ? 'destructive' : 'processing'}>
                  {status === 'Processing' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}{status}
                </Badge>
                {status === 'Done' && <Badge variant="success">File Ready</Badge>}
                <Badge variant="secondary" className="gap-1"><Zap className="h-3 w-3 text-amber-500" /> Fast mode</Badge>
              </div>
              <Progress value={count} max={totalCount} />
              <div className="flex gap-2">
                {status === 'Processing' && <Button variant="outline" size="sm" onClick={() => setStatus('Failed')}><Square className="mr-1 h-3 w-3" /> Stop processing</Button>}
                {status === 'Failed' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setStatus('Processing')}>Resume remaining</Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground"><ExternalLink className="mr-1 h-3.5 w-3.5" /> View Logs</Button>
                  </>
                )}
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  disabled={count < 1}
                  onClick={() =>
                    navigate(
                      isCTFlow && selCrit
                        ? `/projects/${projectId}/review?criterion=${encodeURIComponent(selCrit.name)}`
                        : `/projects/${projectId}/review`,
                    )
                  }
                >
                  Start Reviewing<ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stage 4 — Batch Queued */}
        {stage === 4 && processingMode === 'batch' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Batch run queued</CardTitle>
              <CardDescription>Run {runId} for "{selCrit?.name}" has been submitted to the batch queue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/[0.03] p-8 text-center space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                  <Mail className="h-7 w-7 text-emerald-600" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <p className="text-base font-semibold">We'll email you when it's ready</p>
                  <p className="text-sm text-muted-foreground">
                    Batch runs use pooled LLM capacity — the full output is processed together, so there's no live progress. You'll get an email at{' '}
                    <span className="font-semibold text-foreground">aragjha@gmail.com</span> once the run is ready to review.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <Badge variant="secondary">File: {fileName}</Badge>
                  <Badge variant="secondary">{totalCount} patients</Badge>
                  <Badge variant="success" className="gap-1"><Package className="h-3 w-3" /> Batch · pooled capacity</Badge>
                  <Badge variant="processing"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Queued</Badge>
                </div>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStage(3)}><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>
                <Button variant="outline" onClick={() => navigate(`/projects/${projectId}`)}>Back to Project<ChevronRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── OVERRIDE EXPAND MODAL ─── */}
      <Dialog
        open={!!expandedOverride}
        onClose={() => setExpandedOverride(null)}
        title={expandedOverride === 'models' ? 'Override LLM Selection' : expandedOverride === 'prompts' ? 'Override Prompts' : 'Override Keywords'}
        description={`Full-screen view for "${selCrit?.name ?? ''}"`}
        fullscreen
      >
        <div className="space-y-6">
          {expandedOverride === 'models' && (
            <div className="grid grid-cols-2 gap-6">
              {!skipExtraction && (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-muted-foreground">Previous extraction model</p>
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm font-medium">{extractionModel}</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">New extraction model</label>
                    <Select value={overrideExModel} onChange={(e) => setOverrideExModel(e.target.value)} className="text-sm">{LLM_OPTIONS.map((m) => <option key={m}>{m}</option>)}</Select>
                  </div>
                </>
              )}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">Previous reasoning model</p>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm font-medium">{reasoningModel}</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">New reasoning model</label>
                <Select value={overrideReModel} onChange={(e) => setOverrideReModel(e.target.value)} className="text-sm">{LLM_OPTIONS.map((m) => <option key={m}>{m}</option>)}</Select>
              </div>
            </div>
          )}

          {expandedOverride === 'prompts' && (
            <div className="space-y-5">
              {!skipExtraction && (
                <>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-muted-foreground">Previous extraction prompt</p>
                      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground min-h-[120px] whitespace-pre-wrap">{extractionPrompt || <span className="italic">Empty</span>}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground">New extraction prompt</label>
                      <Textarea rows={5} value={overrideExPrompt} onChange={(e) => setOverrideExPrompt(e.target.value)} placeholder="Override extraction prompt..." className="min-h-[120px]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-muted-foreground">Previous extraction validation</p>
                      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground min-h-[120px] whitespace-pre-wrap">{extractionValidation || <span className="italic">Empty</span>}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground">New extraction validation</label>
                      <Textarea rows={5} value={overrideExValidation} onChange={(e) => setOverrideExValidation(e.target.value)} placeholder="Override extraction validation..." className="min-h-[120px]" />
                    </div>
                  </div>
                  <Separator />
                </>
              )}
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Previous reasoning prompt</p>
                  <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground min-h-[120px] whitespace-pre-wrap">{reasoningPrompt || <span className="italic">Empty</span>}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">New reasoning prompt</label>
                  <Textarea rows={5} value={overrideRePrompt} onChange={(e) => setOverrideRePrompt(e.target.value)} placeholder="Override reasoning prompt..." className="min-h-[120px]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Previous reasoning validation</p>
                  <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground min-h-[120px] whitespace-pre-wrap">{reasoningValidation || <span className="italic">Empty</span>}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">New reasoning validation</label>
                  <Textarea rows={5} value={overrideReValidation} onChange={(e) => setOverrideReValidation(e.target.value)} placeholder="Override reasoning validation..." className="min-h-[120px]" />
                </div>
              </div>
            </div>
          )}

          {expandedOverride === 'keywords' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">Previous keywords</p>
                <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground min-h-[100px]">{selCrit?.keywords?.join(', ') || <span className="italic">None set</span>}</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">New keywords (comma-separated)</label>
                <Textarea rows={5} value={overrideKw} onChange={(e) => setOverrideKw(e.target.value)} placeholder="keyword1, keyword2, ..." className="min-h-[100px]" />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setExpandedOverride(null)}><Minimize2 className="mr-1.5 h-3.5 w-3.5" /> Close</Button>
          </div>
        </div>
      </Dialog>

      {/* ─── RUN INSPECT MODAL ─── */}
      <Dialog open={!!inspectRun} onClose={() => setInspectRun(null)} title={`Run Details — ${inspectRun?.runId ?? ''}`} description={`Configuration snapshot for ${inspectRun ? critNameForRun(inspectRun) : ''}`}>
        {inspectRun && (() => {
          const crit = localCriteria.find((c) => c.id === inspectRun.criterionId);
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs font-semibold text-muted-foreground">Run ID</p><p className="font-medium">{inspectRun.runId}</p></div>
                <div><p className="text-xs font-semibold text-muted-foreground">Status</p><Badge variant={inspectRun.status === 'Done' ? 'success' : inspectRun.status === 'Processing' ? 'processing' : 'secondary'}>{inspectRun.status}</Badge></div>
                <div><p className="text-xs font-semibold text-muted-foreground">Criterion</p><p className="font-medium">{crit?.name ?? inspectRun.criterionId}</p></div>
                <div><p className="text-xs font-semibold text-muted-foreground">Type</p><Badge variant={crit?.type === 'inclusion' ? 'success' : 'destructive'} className="text-[9px]">{crit?.type ?? 'unknown'}</Badge></div>
                <div><p className="text-xs font-semibold text-muted-foreground">Extraction</p><p>{inspectRun.extractionCount}/{inspectRun.totalCount} patients</p></div>
                <div><p className="text-xs font-semibold text-muted-foreground">File</p><p className="truncate">{inspectRun.fileName}</p></div>
                <div><p className="text-xs font-semibold text-muted-foreground">Sample size</p><p>{inspectRun.sampleSize}</p></div>
                <div><p className="text-xs font-semibold text-muted-foreground">Full run</p><p>{inspectRun.fullRun ? 'Yes' : 'No'}</p></div>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">LLM Model</p>
                <p className="text-sm font-medium">{crit?.model ?? 'GPT-5.4'}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Extraction Prompt</p>
                <div className="rounded-lg border bg-muted/30 p-3 text-xs max-h-32 overflow-y-auto">{crit?.extractionPrompt || <span className="italic text-muted-foreground">Empty</span>}</div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Extraction Validation</p>
                <div className="rounded-lg border bg-muted/30 p-3 text-xs max-h-32 overflow-y-auto">{crit?.extractionValidation || <span className="italic text-muted-foreground">Empty</span>}</div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reasoning Prompt</p>
                <div className="rounded-lg border bg-muted/30 p-3 text-xs max-h-32 overflow-y-auto">{crit?.reasoningPrompt || <span className="italic text-muted-foreground">Empty</span>}</div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reasoning Validation</p>
                <div className="rounded-lg border bg-muted/30 p-3 text-xs max-h-32 overflow-y-auto">{crit?.reasoningValidation || <span className="italic text-muted-foreground">Empty</span>}</div>
              </div>
              {crit?.keywords && crit.keywords.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Keywords</p>
                  <div className="flex flex-wrap gap-1">{crit.keywords.map((k, i) => <Badge key={i} variant="secondary" className="text-[9px]">{k}</Badge>)}</div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg border p-2.5 text-center"><p className="text-muted-foreground">Override models</p><p className="font-bold">{inspectRun.overrideModels ? 'Yes' : 'No'}</p></div>
                <div className="rounded-lg border p-2.5 text-center"><p className="text-muted-foreground">Override prompts</p><p className="font-bold">{inspectRun.overridePrompts ? 'Yes' : 'No'}</p></div>
                <div className="rounded-lg border p-2.5 text-center"><p className="text-muted-foreground">Override keywords</p><p className="font-bold">{inspectRun.overrideKeywords ? 'Yes' : 'No'}</p></div>
              </div>
              <div className="flex justify-end"><Button variant="outline" onClick={() => setInspectRun(null)}><X className="mr-1 h-3.5 w-3.5" /> Close</Button></div>
            </div>
          );
        })()}
      </Dialog>

      {/* ─── COST PANEL SHEET ─── */}
      <Sheet open={!!costPanelRunId} onClose={() => setCostPanelRunId(null)} title={`Run Cost — ${runs.find(r => r.id === costPanelRunId)?.runId ?? ''}`}>
        {costPanelRunId && (() => {
          const run = runs.find(r => r.id === costPanelRunId);
          if (!run) return <p className="text-sm text-muted-foreground">No cost data available.</p>;
          const cp = run.costProfile;
          if (!cp) return <p className="text-sm text-muted-foreground">No cost profile recorded for this run.</p>;
          const avgPerPatient = cp.totalCost / cp.patientsProcessed;
          const dist = cp.costPerPatient;
          return (
            <div className="space-y-5">
              {/* Total cost — the hero number */}
              <div className="rounded-xl bg-emerald-500/10 p-5 text-center space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Total Cost</p>
                <p className="text-3xl font-bold text-emerald-600">${cp.totalCost.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">{cp.patientsProcessed} patients processed</p>
              </div>

              {/* Key stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border p-3 text-center">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Avg. per Patient</p>
                  <p className="text-lg font-bold mt-1">${avgPerPatient.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border p-3 text-center">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Cost Range</p>
                  <p className="text-lg font-bold mt-1">${dist.min.toFixed(2)} – ${dist.max.toFixed(2)}</p>
                </div>
              </div>

              <Separator />

              {/* Breakdown */}
              <div className="space-y-3">
                <p className="text-xs font-semibold">Breakdown</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      <span>Extraction</span>
                    </div>
                    <span className="font-semibold">${cp.extractionCost.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                      <span>Reasoning</span>
                    </div>
                    <span className="font-semibold">${cp.reasoningCost.toFixed(2)}</span>
                  </div>
                  {/* Stacked bar */}
                  <div className="flex h-2.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500" style={{ width: `${(cp.extractionCost / cp.totalCost * 100)}%` }} />
                    <div className="bg-violet-500" style={{ width: `${(cp.reasoningCost / cp.totalCost * 100)}%` }} />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Run info — compact */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Criterion</span><span className="font-medium">{localCriteria.find(c => c.id === run.criterionId)?.name ?? run.criterionId}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">File</span><span className="font-medium truncate ml-4">{run.fileName}</span></div>
                <div className="flex items-center justify-between"><span className="text-muted-foreground">Model</span><span className="font-medium">{cp.modelUsed}</span></div>
              </div>
            </div>
          );
        })()}
      </Sheet>

      {/* ═══ REFINE WITH AI — Minimized pill ═══ */}
      {refineOpen && refineMinimized && (
        <button
          onClick={() => setRefineMinimized(false)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2.5 shadow-lg hover:shadow-xl transition-all cursor-pointer"
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-semibold">Refine with AI</span>
          <Badge variant="secondary" className="text-[9px]">Stage {refineStage}/3</Badge>
        </button>
      )}

      {/* ═══ REFINE WITH AI — Full overlay ═══ */}
      {refineOpen && !refineMinimized && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold">Refine with AI — {refineTarget === 'extraction' ? 'Extraction' : 'Reasoning'} Prompt</h2>
                <p className="text-[11px] text-muted-foreground">3-stage prompt evaluation pipeline</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`h-2 w-8 rounded-full ${s < refineStage ? 'bg-primary/40' : s === refineStage ? 'bg-primary' : 'bg-muted'}`} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground ml-2">Stage {refineStage}/3</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRefineMinimized(true)} title="Minimize">
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setRefineOpen(false); setRefineMinimized(false); }}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Body */}
          <ScrollArea className="flex-1 overflow-auto">
            <div className="max-w-4xl mx-auto p-6 space-y-6">

              {/* STAGE 1: Evaluate */}
              {refineStage === 1 && (
                <div className="space-y-6">
                  <div><h3 className="text-lg font-bold">Prompt Evaluation</h3><p className="text-sm text-muted-foreground">Evaluate your {refineTarget} prompt across 9 quality dimensions.</p></div>

                  <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current Prompt</p>
                    <pre className="text-xs whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">{refineTarget === 'extraction' ? extractionPrompt || '(empty)' : reasoningPrompt || '(empty)'}</pre>
                  </div>

                  {refineStatus === 'idle' && (
                    <Button onClick={() => { setRefineStatus('running'); setTimeout(() => setRefineStatus('done'), 2500); }}>
                      <Play className="mr-2 h-4 w-4" /> Run Evaluation
                    </Button>
                  )}

                  {refineStatus === 'running' && (
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="text-sm">Evaluating prompt across 9 dimensions...</span>
                      <Button variant="outline" size="sm" onClick={() => setRefineStatus('stopped')}><Square className="mr-1 h-3 w-3" /> Stop</Button>
                    </div>
                  )}

                  {refineStatus === 'stopped' && (
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Stopped</Badge>
                      <Button variant="outline" size="sm" onClick={() => { setRefineStatus('idle'); }}>Restart</Button>
                    </div>
                  )}

                  {refineStatus === 'done' && (
                    <div className="space-y-5">
                      <div className="flex items-center gap-4">
                        <div className={`text-4xl font-bold ${MOCK_EVAL.overallScore >= 0.8 ? 'text-emerald-600' : MOCK_EVAL.overallScore >= 0.6 ? 'text-amber-600' : 'text-red-600'}`}>{(MOCK_EVAL.overallScore * 100).toFixed(0)}%</div>
                        <div><p className="text-sm font-semibold">Overall Score</p><p className="text-xs text-muted-foreground">{MOCK_EVAL.summary}</p></div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dimension Scores</p>
                        <div className="grid gap-2">
                          {MOCK_EVAL.dimensions.map((d, i) => (
                            <div key={i} className="rounded-lg border p-3 flex items-start gap-3">
                              <div className={`text-lg font-bold shrink-0 w-12 text-center rounded-md py-1 ${d.score >= 0.8 ? 'text-emerald-600 bg-emerald-500/10' : d.score >= 0.6 ? 'text-amber-600 bg-amber-500/10' : 'text-red-600 bg-red-500/10'}`}>
                                {(d.score * 100).toFixed(0)}
                              </div>
                              <div><p className="text-sm font-semibold">{d.dimension}</p><p className="text-xs text-muted-foreground">{d.rationale}</p></div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Failure Modes</p>
                        {MOCK_EVAL.failureModes.map((fm, i) => (
                          <div key={i} className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/10 p-3 text-xs space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={fm.severity === 'critical' ? 'destructive' : 'secondary'} className="text-[8px]">{fm.severity}</Badge>
                              <Badge variant="secondary" className="text-[8px]">{fm.type}</Badge>
                              <span className="text-muted-foreground">P={((fm.probability) * 100).toFixed(0)}%</span>
                            </div>
                            <p>{fm.description}</p>
                          </div>
                        ))}
                      </div>

                      <Button onClick={() => setRefineStage(2)}>Next: View Suggestions <ArrowRight className="ml-2 h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              )}

              {/* STAGE 2: Suggest */}
              {refineStage === 2 && (
                <div className="space-y-6">
                  <div><h3 className="text-lg font-bold">Improvement Suggestions</h3><p className="text-sm text-muted-foreground">Accept or reject each suggestion. Accepted ones will be applied in the revised prompt.</p></div>

                  <div className="space-y-3">
                    {MOCK_SUGGESTIONS.map((s, i) => (
                      <div key={i} className={`rounded-xl border p-4 space-y-2 transition-colors ${refineSuggestionAccepted.has(i) ? 'border-primary bg-primary/5' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={s.priority === 'critical' ? 'destructive' : 'secondary'} className="text-[9px]">{s.priority}</Badge>
                            <Badge variant="secondary" className="text-[9px]">{s.dimension}</Badge>
                          </div>
                          <Button variant={refineSuggestionAccepted.has(i) ? 'default' : 'outline'} size="sm" className="h-7 text-xs" onClick={() => toggleSuggestion(i)}>
                            {refineSuggestionAccepted.has(i) ? <><Check className="mr-1 h-3 w-3" /> Accepted</> : 'Accept'}
                          </Button>
                        </div>
                        <p className="text-sm">{s.suggestion}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={() => setRefineStage(1)}><ChevronLeft className="mr-1 h-4 w-4" /> Back to Evaluation</Button>
                    <Button disabled={refineSuggestionAccepted.size === 0} onClick={() => setRefineStage(3)}>
                      Revise Prompt ({refineSuggestionAccepted.size} accepted) <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* STAGE 3: Revise */}
              {refineStage === 3 && (
                <div className="space-y-6">
                  <div><h3 className="text-lg font-bold">Revised Prompt</h3><p className="text-sm text-muted-foreground">Compare original and revised prompts. Apply the revision to your prompt field.</p></div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Original</p>
                      <div className="rounded-xl border bg-muted/20 p-4 text-xs whitespace-pre-wrap min-h-[300px] max-h-[500px] overflow-y-auto font-mono">
                        {refineTarget === 'extraction' ? extractionPrompt || '(empty)' : reasoningPrompt || '(empty)'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Revised</p>
                      <div className="rounded-xl border border-primary/30 bg-primary/[0.03] p-4 text-xs whitespace-pre-wrap min-h-[300px] max-h-[500px] overflow-y-auto font-mono">
                        {MOCK_REVISED}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button variant="ghost" onClick={() => setRefineStage(2)}><ChevronLeft className="mr-1 h-4 w-4" /> Back to Suggestions</Button>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => { void navigator.clipboard.writeText(MOCK_REVISED); }}>
                        <Copy className="mr-1.5 h-4 w-4" /> Copy to clipboard
                      </Button>
                      <Button onClick={() => { if (refineTarget === 'extraction') setExtractionPrompt(MOCK_REVISED); else setReasoningPrompt(MOCK_REVISED); setRefineOpen(false); setRefineMinimized(false); }}>
                        <Check className="mr-1.5 h-4 w-4" /> Apply to {refineTarget} prompt
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </ScrollArea>
        </div>
      )}
      </div>

      {/* See Prompts & Re-run Sheet */}
      <Sheet open={promptsSheetOpen} onClose={() => setPromptsSheetOpen(false)} title={selCrit ? `Prompts — ${selCrit.name}` : 'Prompts'}>
        {selCrit && (
          <div className="space-y-5">
            {/* Quick info */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={selCrit.type === 'inclusion' ? 'success' : 'destructive'} className="text-[9px]">{selCrit.type}</Badge>
              <Badge variant="secondary" className="text-[9px]">Model: {selCrit.model}</Badge>
              <Badge variant="secondary" className="text-[9px]">{selectedRuns.length} runs</Badge>
            </div>

            {/* Extraction Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Extraction Prompt</label>
                {draftExtractionPrompt !== selCrit.extractionPrompt && (
                  <Badge variant="warning" className="text-[8px]">Modified</Badge>
                )}
              </div>
              <Textarea
                value={draftExtractionPrompt}
                onChange={(e) => setDraftExtractionPrompt(e.target.value)}
                rows={8}
                className="text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">Validation: {selCrit.extractionValidation || '—'}</p>
            </div>

            {/* Reasoning Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reasoning Prompt</label>
                {draftReasoningPrompt !== selCrit.reasoningPrompt && (
                  <Badge variant="warning" className="text-[8px]">Modified</Badge>
                )}
              </div>
              <Textarea
                value={draftReasoningPrompt}
                onChange={(e) => setDraftReasoningPrompt(e.target.value)}
                rows={8}
                className="text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">Validation: {selCrit.reasoningValidation || '—'}</p>
            </div>

            {/* Keywords (read-only summary) */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Keywords</label>
              <div className="flex flex-wrap gap-1">
                {selCrit.keywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="text-[9px]">{kw}</Badge>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="border-t pt-4 space-y-2">
              <Button
                className="w-full"
                disabled={reRunning || (draftExtractionPrompt === selCrit.extractionPrompt && draftReasoningPrompt === selCrit.reasoningPrompt)}
                onClick={() => {
                  setReRunning(true);
                  // Apply changes locally and simulate re-run
                  setLocalCriteria((prev) => prev.map((c) => c.id === selCrit.id ? { ...c, extractionPrompt: draftExtractionPrompt, reasoningPrompt: draftReasoningPrompt } : c));
                  setExtractionPrompt(draftExtractionPrompt);
                  setReasoningPrompt(draftReasoningPrompt);
                  setTimeout(() => {
                    setReRunning(false);
                    setPromptsSheetOpen(false);
                    setStage(4);
                    setStatus('Processing');
                    setCount(0);
                  }, 600);
                }}
              >
                {reRunning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Applying & Re-running…</> : <><Play className="mr-2 h-4 w-4" /> Re-run with Changes</>}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setDraftExtractionPrompt(selCrit.extractionPrompt);
                  setDraftReasoningPrompt(selCrit.reasoningPrompt);
                }}
              >
                Reset to Original
              </Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
