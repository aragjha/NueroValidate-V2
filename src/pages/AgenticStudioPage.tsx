import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { AGENT_LIBRARY, getAgent, WORKFLOW_TEMPLATES } from '@/data/agents';
import { USE_CASES, STUDIO_STEPS, recommendSteps, getStep } from '@/data/useCases';
import type { UseCase, StudioStep } from '@/data/useCases';
import type { Workflow, WorkflowStage, WorkflowTemplate } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bot,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  Clock,
  ExternalLink,
  FileSearch,
  FileStack,
  FolderOpen,
  GitCompare,
  GripVertical,
  HelpCircle,
  Info,
  Languages,
  Layers,
  ListChecks,
  Loader2,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Save,
  Scale,
  Search,
  Settings2,
  Sparkles,
  Stethoscope,
  Trash2,
  UserCheck,
  Wand2,
  Workflow as WorkflowIcon,
  X,
  Zap,
} from 'lucide-react';

/* ─── Helpers ─── */

function randomId() {
  return Math.random().toString(36).slice(2, 8);
}

/* ─── Icon Maps ─── */

const ICON_MAP: Record<string, React.ReactNode> = {
  FileSearch: <FileSearch className="h-5 w-5" />,
  FileStack: <FileStack className="h-5 w-5" />,
  ClipboardCheck: <ClipboardCheck className="h-5 w-5" />,
  BookOpen: <BookOpen className="h-5 w-5" />,
  Stethoscope: <Stethoscope className="h-5 w-5" />,
  Calculator: <Calculator className="h-5 w-5" />,
  UserCheck: <UserCheck className="h-5 w-5" />,
  Layers: <Layers className="h-5 w-5" />,
  Workflow: <WorkflowIcon className="h-5 w-5" />,
  ListChecks: <ListChecks className="h-5 w-5" />,
  Scale: <Scale className="h-5 w-5" />,
  Languages: <Languages className="h-5 w-5" />,
  GitCompare: <GitCompare className="h-5 w-5" />,
};
function renderIcon(name: string) {
  return ICON_MAP[name] ?? <Bot className="h-5 w-5" />;
}

const ICON_SM: Record<string, React.ReactNode> = {
  FileSearch: <FileSearch className="h-4 w-4" />,
  FileStack: <FileStack className="h-4 w-4" />,
  ClipboardCheck: <ClipboardCheck className="h-4 w-4" />,
  BookOpen: <BookOpen className="h-4 w-4" />,
  Stethoscope: <Stethoscope className="h-4 w-4" />,
  Calculator: <Calculator className="h-4 w-4" />,
  UserCheck: <UserCheck className="h-4 w-4" />,
  Layers: <Layers className="h-4 w-4" />,
  Workflow: <WorkflowIcon className="h-4 w-4" />,
  ListChecks: <ListChecks className="h-4 w-4" />,
  Scale: <Scale className="h-4 w-4" />,
  Languages: <Languages className="h-4 w-4" />,
  GitCompare: <GitCompare className="h-4 w-4" />,
};
function renderIconSm(name: string) {
  return ICON_SM[name] ?? <Bot className="h-4 w-4" />;
}

/* ─── Step Labels ─── */

const STEP_LABELS = ['Choose Goal', 'Setup', 'Builder', 'Run & Results', 'Save'];

/* ─── Mock Findings Data ─── */

const MOCK_FINDING_TITLES = [
  'Negated condition extracted as positive',
  'Missing evidence anchor for diagnosis',
  'Lab value out of reference range',
  'Temporal mismatch in medication timeline',
  'Ambiguous eligibility criterion logic',
  'Hallucinated medication not in source',
  'Inconsistent date format across records',
  'Uncertain language treated as confirmed',
  'Missing required field evaluation',
  'Contradictory information across encounters',
];

const MOCK_FINDING_DETAILS = [
  'Patient note states "no history of seizures" but extraction marked seizure history as present.',
  'Claim about PD diagnosis lacks a direct citation from the clinical note.',
  'HbA1c value of 14.2% exceeds the expected clinical range for this population.',
  'Medication start date precedes the documented diagnosis date by 3 years.',
  'Compound inclusion criterion with AND/OR logic was evaluated inconsistently.',
  'Extraction references "metformin 500mg" but source note contains no mention of metformin.',
  'Date formats mix MM/DD/YYYY and DD/MM/YYYY within the same patient record.',
  '"Possible migraine" was extracted as a confirmed diagnosis without hedging qualifier.',
  'Exclusion criterion for renal function was not evaluated for 3 patients.',
  'Progress note from 2023 contradicts findings documented in 2024 encounter.',
];

const MOCK_EVIDENCE_QUOTES = [
  '"Patient denies history of seizure disorder."',
  '"Assessment: likely Parkinson disease, early stage."',
  '"Lab results: HbA1c 14.2% (reference: 4.0-5.6%)"',
  '"Started on levodopa 03/2019. Diagnosis confirmed 06/2022."',
  '"Include if (age >= 50 AND BMI < 30) OR documented PD."',
  'No supporting passage found in source document.',
  '"Visit date: 12/03/2024" vs "Admission: 03/12/2024"',
  '"Assessment: possible migraine, consider further evaluation."',
  'No evaluation found for criterion: eGFR > 30 mL/min.',
  '"2023: No tremor observed." vs "2024: Resting tremor present since 2022."',
];

/* ─── Component ─── */

export function AgenticStudioPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, projects, criteria, workflows, customAgents, addWorkflow } = useAppContext();
  const fromProject = searchParams.get('from') === 'project';
  const prefillProjectId = searchParams.get('projectId') ?? '';
  const prefillCriterionId = searchParams.get('criterionId') ?? '';

  /* ─── Local State ─── */

  const [step, setStep] = useState(0);

  // Step 0: Goals
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showGoalDetails, setShowGoalDetails] = useState(false);

  // Step 0: Dashboard
  const [agentTab, setAgentTab] = useState<'builtin' | 'custom'>('builtin');
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);

  // Step 1: Setup
  const [selectedProjectId, setSelectedProjectId] = useState(prefillProjectId);
  const [selectedCriterionId, setSelectedCriterionId] = useState('');
  const [promptText, setPromptText] = useState('');
  const [sampleSize, setSampleSize] = useState('20');
  const [isFirstRun, setIsFirstRun] = useState(true);
  const [isRegulatory, setIsRegulatory] = useState(false);
  const [isMultiSource, setIsMultiSource] = useState(false);
  const [hasTemporal, setHasTemporal] = useState(false);
  const [hasNumeric, setHasNumeric] = useState(false);

  // Pipeline
  const [pipeline, setPipeline] = useState<StudioStep[]>([]);
  const [removedStepIds, setRemovedStepIds] = useState<string[]>([]);
  const [showWhyRecommended, setShowWhyRecommended] = useState(false);
  const [showAddStep, setShowAddStep] = useState(false);

  // Step 2: Builder
  const [selectedBuilderStepId, setSelectedBuilderStepId] = useState<string | null>(null);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  // Step 3: Run & Results
  const [runPhase, setRunPhase] = useState<'ready' | 'running' | 'done'>('ready');
  const [runProgress, setRunProgress] = useState(0);
  const [runningStepIdx, setRunningStepIdx] = useState(0);
  const [stepStatuses, setStepStatuses] = useState<Record<string, 'pending' | 'running' | 'done' | 'failed'>>({});
  const [resultData, setResultData] = useState<Record<string, { findings: number; issues: number; confidence: number; summary: string }>>({});
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);
  const [findingsModalStepId, setFindingsModalStepId] = useState<string | null>(null);
  const [findingsSeverityFilter, setFindingsSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [findingsSearch, setFindingsSearch] = useState('');

  // Step 4: Save
  const [wfName, setWfName] = useState('');
  const [wfDescription, setWfDescription] = useState('');
  const [wfScope, setWfScope] = useState('Generic');
  const [wfDisease, setWfDisease] = useState('');
  const [wfVersion, setWfVersion] = useState('V1');
  const [wfVisibility, setWfVisibility] = useState<'Personal' | 'Team' | 'Published'>('Personal');
  const [wfTagsInput, setWfTagsInput] = useState('');
  const [saved, setSaved] = useState(false);

  /* ─── Effects ─── */

  useEffect(() => {
    if (fromProject && prefillProjectId) {
      setSelectedProjectId(prefillProjectId);
    }
  }, [fromProject, prefillProjectId]);

  // Criterion prefill from query params
  useEffect(() => {
    if (prefillCriterionId && criteria.length > 0) {
      setSelectedCriterionId(prefillCriterionId);
      const crit = criteria.find((c) => c.id === prefillCriterionId);
      if (crit) setPromptText(crit.extractionPrompt);
    }
  }, [prefillCriterionId, criteria]);

  // Criterion change auto-fill prompt
  useEffect(() => {
    if (!selectedCriterionId) return;
    const crit = criteria.find((c) => c.id === selectedCriterionId);
    if (crit?.extractionPrompt) setPromptText(crit.extractionPrompt);
  }, [selectedCriterionId, criteria]);

  // Reset runPhase when entering step 3
  useEffect(() => {
    if (step === 3) setRunPhase('ready');
  }, [step]);

  /* ─── Computed ─── */

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const totalEstTime = useMemo(
    () =>
      pipeline.reduce((acc, s) => {
        const mins = parseInt(s.estimatedTime.replace(/[^0-9]/g, '')) || 1;
        return acc + mins;
      }, 0),
    [pipeline],
  );

  const totalEstCost = useMemo(
    () =>
      pipeline.reduce((acc, s) => {
        const cost = parseFloat(s.estimatedCost.replace('$', '')) || 0;
        return acc + cost;
      }, 0),
    [pipeline],
  );

  const totalAgents = useMemo(
    () => pipeline.reduce((acc, s) => acc + s.agentIds.length, 0),
    [pipeline],
  );

  const totalFindings = useMemo(
    () => Object.values(resultData).reduce((acc, r) => acc + r.findings, 0),
    [resultData],
  );

  const totalIssues = useMemo(
    () => Object.values(resultData).reduce((acc, r) => acc + r.issues, 0),
    [resultData],
  );

  const avgConfidence = useMemo(() => {
    const vals = Object.values(resultData);
    if (vals.length === 0) return 0;
    return vals.reduce((acc, r) => acc + r.confidence, 0) / vals.length;
  }, [resultData]);

  const useCaseTag = useMemo(() => {
    const first = USE_CASES.find((uc) => selectedGoals.includes(uc.id));
    return first?.label?.replace(/\s+/g, '') ?? 'Custom';
  }, [selectedGoals]);

  const autoName = useMemo(() => {
    const d = wfDisease.trim() || 'General';
    const tag = useCaseTag;
    return `${wfScope}_${d}_${tag}_${wfVersion}`;
  }, [wfScope, wfDisease, useCaseTag, wfVersion]);

  /* ─── Pipeline computation ─── */

  const computePipeline = useCallback(() => {
    let recommended = recommendSteps(selectedGoals);

    // Apply context signal enhancements
    if (isFirstRun) {
      const promptStep = getStep('step-evaluate-prompt');
      if (promptStep && !recommended.find((s) => s.id === promptStep.id)) {
        recommended = [promptStep, ...recommended];
      }
    }
    if (isRegulatory) {
      const evidenceStep = getStep('step-check-evidence');
      if (evidenceStep && !recommended.find((s) => s.id === evidenceStep.id)) {
        recommended.push(evidenceStep);
      }
    }
    if (isMultiSource) {
      const conflictStep = getStep('step-detect-conflicts');
      if (conflictStep && !recommended.find((s) => s.id === conflictStep.id)) {
        recommended.push(conflictStep);
      }
    }
    if (hasTemporal || hasNumeric) {
      const dataStep = getStep('step-validate-data-integrity');
      if (dataStep && !recommended.find((s) => s.id === dataStep.id)) {
        recommended.push(dataStep);
      }
    }

    // Re-sort by canonical order
    const order = STUDIO_STEPS.map((s) => s.id);
    recommended.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

    setPipeline(recommended);
    setRemovedStepIds([]);
  }, [selectedGoals, isFirstRun, isRegulatory, isMultiSource, hasTemporal, hasNumeric]);

  /* ─── Load Template ─── */

  function loadTemplate(template: WorkflowTemplate) {
    const steps = STUDIO_STEPS.filter((s) => s.agentIds.some((aid) => template.agentIds.includes(aid)));
    setPipeline(steps.length > 0 ? steps : []);
    setStep(1);
  }

  /* ─── Navigation ─── */

  function canProceed(): boolean {
    switch (step) {
      case 0:
        return true;
      case 1:
        return pipeline.length > 0;
      case 2:
        return pipeline.length > 0;
      default:
        return true;
    }
  }

  function handleNext() {
    if (step === 0) computePipeline(); // compute on advancing from goals
    if (step < 4) setStep(step + 1);
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  /* ─── Pipeline mutations ─── */

  function removePipelineStep(id: string) {
    setPipeline((prev) => prev.filter((s) => s.id !== id));
    setRemovedStepIds((prev) => [...prev, id]);
    if (expandedStepId === id) setExpandedStepId(null);
    if (selectedBuilderStepId === id) setSelectedBuilderStepId(null);
  }

  function addPipelineStep(studioStep: StudioStep) {
    setPipeline((prev) => [...prev, studioStep]);
    setRemovedStepIds((prev) => prev.filter((rid) => rid !== studioStep.id));
    setShowAddStep(false);
  }

  function movePipelineStep(index: number, direction: 'up' | 'down') {
    const swap = direction === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= pipeline.length) return;
    const updated = [...pipeline];
    [updated[index], updated[swap]] = [updated[swap], updated[index]];
    setPipeline(updated);
  }

  /* ─── Step 3: Run Simulation ─── */

  useEffect(() => {
    if (step !== 3 || runPhase !== 'running') return;

    const statuses: Record<string, 'pending' | 'running' | 'done' | 'failed'> = {};
    pipeline.forEach((s) => {
      statuses[s.id] = 'pending';
    });
    setStepStatuses(statuses);
    setRunProgress(0);
    setRunningStepIdx(0);

    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= pipeline.length) {
        clearInterval(interval);
        setRunProgress(100);
        // Generate mock results
        const results: Record<string, { findings: number; issues: number; confidence: number; summary: string }> = {};
        pipeline.forEach((s) => {
          const findings = Math.floor(Math.random() * 20) + 5;
          const issues = Math.floor(Math.random() * Math.min(findings, 8));
          results[s.id] = {
            findings,
            issues,
            confidence: Math.round((0.78 + Math.random() * 0.2) * 100) / 100,
            summary: `Analyzed ${sampleSize} patients. Found ${findings} observations, ${issues} requiring attention.`,
          };
        });
        setResultData(results);
        setExpandedResultId(pipeline[0]?.id ?? null);
        setRunPhase('done');
        return;
      }

      if (!pipeline[idx]) { clearInterval(interval); return; }
      const currentStepId = pipeline[idx].id;
      const prevStepId = idx > 0 ? pipeline[idx - 1]?.id : null;
      setStepStatuses((prev) => ({
        ...prev,
        [currentStepId]: 'running',
        ...(prevStepId ? { [prevStepId]: 'done' } : {}),
      }));
      setRunningStepIdx(idx);
      setRunProgress(Math.round(((idx + 0.5) / pipeline.length) * 100));

      const currentIdx = idx;
      setTimeout(() => {
        if (!pipeline[currentIdx]) return;
        setStepStatuses((prev) => ({ ...prev, [pipeline[currentIdx].id]: 'done' }));
        setRunProgress(Math.round(((currentIdx + 1) / pipeline.length) * 100));
      }, 1200);

      idx++;
    }, 2000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, runPhase]);

  /* ─── Step 4: Save ─── */

  async function handleSaveWorkflow(status: 'Draft' | 'Published') {
    const now = new Date().toISOString();
    const stages: WorkflowStage[] = pipeline.flatMap((s, sIdx) =>
      s.agentIds.map((agentId, aIdx) => ({
        id: `stg-${randomId()}`,
        agentId,
        label: s.label,
        config: { threshold: 0.85, strictMode: true },
        order: sIdx * 10 + aIdx,
      })),
    );

    const name = wfName.trim() || autoName;
    const desc = wfDescription.trim() || `Validation pipeline with ${pipeline.length} steps: ${pipeline.map((s) => s.label).join(', ')}.`;

    const goalTags = selectedGoals
      .map((gid) => USE_CASES.find((uc) => uc.id === gid)?.label)
      .filter(Boolean) as string[];
    const extraTags = wfTagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const allTags = [...new Set([...goalTags, ...extraTags])];

    const workflow: Workflow = {
      id: `wf-${randomId()}`,
      name,
      description: desc,
      status,
      version: 1,
      stages,
      createdBy: currentUser,
      createdAt: now,
      updatedAt: now,
      tags: allTags,
      runCount: 1,
      lastRunAt: now,
      lastRunStatus: 'Success',
      attachedProjectIds: selectedProjectId ? [selectedProjectId] : [],
    };

    await addWorkflow(workflow);
    setSaved(true);
  }

  /* ─── Remaining time helper ─── */

  const remainingTime = useMemo(() => {
    if (pipeline.length === 0) return 0;
    const doneCount = Object.values(stepStatuses).filter((s) => s === 'done').length;
    const perStep = totalEstTime / pipeline.length;
    return Math.max(0, Math.round((pipeline.length - doneCount) * perStep));
  }, [stepStatuses, pipeline, totalEstTime]);

  /* ─── Available steps for add ─── */

  const availableSteps = useMemo(
    () => STUDIO_STEPS.filter((s) => !pipeline.find((p) => p.id === s.id)),
    [pipeline],
  );

  /* ─── Goals that led to a step ─── */

  function goalsForStep(stepId: string): string[] {
    return USE_CASES.filter((uc) => selectedGoals.includes(uc.id) && uc.recommendedStepIds.includes(stepId)).map((uc) => uc.label);
  }

  /* ─── Full findings for a step (for the modal) ─── */

  const PATIENT_IDS = ['P-100284', 'P-100285', 'P-100286', 'P-100287', 'P-100288', 'P-100289', 'P-100290', 'P-100291', 'P-100292', 'P-100293', 'P-100294', 'P-100295', 'P-100296', 'P-100297', 'P-100298'];
  const SEVERITIES: ('critical' | 'high' | 'medium' | 'low')[] = ['critical', 'high', 'medium', 'low'];

  const allFindingsForStep = useMemo(() => {
    if (!findingsModalStepId) return [];
    const studioStep = pipeline.find((s) => s.id === findingsModalStepId);
    if (!studioStep) return [];
    const data = resultData[findingsModalStepId];
    if (!data) return [];
    const count = data.findings;
    const findings: { id: string; severity: 'critical' | 'high' | 'medium' | 'low'; title: string; detail: string; evidence: string; patientId: string; agentName: string; agentShortName: string; status: 'open' | 'acknowledged' | 'dismissed' }[] = [];
    for (let i = 0; i < count; i++) {
      const idx = i % MOCK_FINDING_TITLES.length;
      const sevIdx = i < data.issues ? (i % 2 === 0 ? 0 : 1) : (i % 2 === 0 ? 2 : 3);
      const agentIdx = i % studioStep.agentIds.length;
      const agent = getAgent(studioStep.agentIds[agentIdx]);
      findings.push({
        id: `f-${findingsModalStepId}-${i}`,
        severity: SEVERITIES[sevIdx],
        title: MOCK_FINDING_TITLES[idx],
        detail: MOCK_FINDING_DETAILS[idx],
        evidence: MOCK_EVIDENCE_QUOTES[idx],
        patientId: PATIENT_IDS[i % PATIENT_IDS.length],
        agentName: agent?.name ?? 'Unknown',
        agentShortName: agent?.shortName ?? '?',
        status: 'open',
      });
    }
    return findings;
  }, [findingsModalStepId, pipeline, resultData]);

  const filteredFindings = useMemo(() => {
    let list = allFindingsForStep;
    if (findingsSeverityFilter !== 'all') list = list.filter((f) => f.severity === findingsSeverityFilter);
    if (findingsSearch.trim()) {
      const q = findingsSearch.toLowerCase();
      list = list.filter((f) => f.title.toLowerCase().includes(q) || f.detail.toLowerCase().includes(q) || f.patientId.toLowerCase().includes(q) || f.agentName.toLowerCase().includes(q));
    }
    return list;
  }, [allFindingsForStep, findingsSeverityFilter, findingsSearch]);

  /* ─── Use cases split ─── */

  const validateUseCases = USE_CASES.filter((uc) => uc.id !== 'uc-reusable-workflow');
  const buildUseCase = USE_CASES.find((uc) => uc.id === 'uc-reusable-workflow');

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* ══════════════ PERSISTENT "BACK TO PROJECT" BAR ══════════════ */}
      {fromProject && selectedProject && (
        <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <FolderOpen className="h-4 w-4 text-primary shrink-0" />
            <span className="text-muted-foreground">
              Testing for: <strong className="text-foreground">{selectedProject.name}</strong>
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs h-7 px-3"
            onClick={() => navigate(`/projects/${selectedProjectId}/criteria`)}
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back to Project
          </Button>
        </div>
      )}

      {/* ══════════════ PROGRESS BAR (steps 1-4 only) ══════════════ */}
      {step >= 1 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-center gap-0">
            {['Setup', 'Builder', 'Run & Results', 'Save'].map((label, idx) => {
              const stepNum = idx + 1;
              const isCompleted = stepNum < step;
              const isCurrent = stepNum === step;
              return (
                <div key={label} className="flex items-center">
                  {idx > 0 && (
                    <div className={`h-px w-6 sm:w-10 ${isCompleted ? 'bg-primary' : 'bg-border'}`} />
                  )}
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                          : isCompleted
                            ? 'bg-primary/15 text-primary'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
                    </div>
                    <span
                      className={`text-[10px] font-semibold whitespace-nowrap ${
                        isCurrent
                          ? 'text-primary'
                          : isCompleted
                            ? 'text-primary/70'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════ STEP 0: STUDIO DASHBOARD ══════════════ */}
      {step === 0 && (
        <div className="space-y-6">
          {/* From-project banner */}
          {fromProject && selectedProject && (
            <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
              <Info className="h-5 w-5 text-primary shrink-0" />
              <span>
                You're checking project: <strong>{selectedProject.name}</strong>. We've prefilled your context.
              </span>
            </div>
          )}

          {/* Header row with help toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Agentic Studio</h1>
                <p className="text-sm text-muted-foreground">
                  Build, run, and manage validation workflows.
                </p>
              </div>
            </div>
            <button
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer rounded-full border px-3 py-1.5"
              onClick={() => setShowHowItWorks(!showHowItWorks)}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              How this works
            </button>
          </div>

          {/* Collapsible "How this works" */}
          {showHowItWorks && (
            <div className="rounded-xl bg-muted/30 p-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { num: '1', title: 'Choose your goal', desc: "Tell us what you want to validate. We'll recommend the right checks." },
                  { num: '2', title: 'Review & customize', desc: 'See recommended agents, reorder steps, adjust configuration.' },
                  { num: '3', title: 'Run & review results', desc: 'Execute your pipeline, inspect per-step results, and save for reuse.' },
                ].map((item) => (
                  <div key={item.num} className="rounded-xl bg-muted/30 p-4 space-y-2 text-center">
                    <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {item.num}
                    </div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                This is an optional advanced tool. Your existing project workflow remains unchanged.
              </p>
            </div>
          )}

          {/* ─── SECTION A: YOUR WORKFLOWS ─── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Your Workflows
              </p>
              <button
                className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
                onClick={() => navigate('/workflows')}
              >
                View All
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {workflows.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                  <WorkflowIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-muted-foreground">No workflows yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create your first workflow below using a use case or template.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {workflows.slice(0, 4).map((wf) => {
                  const statusVariant: 'success' | 'processing' | 'secondary' =
                    wf.status === 'Published' ? 'success' : wf.status === 'Validated' ? 'processing' : 'secondary';
                  return (
                    <div
                      key={wf.id}
                      className="rounded-xl border bg-card p-4 cursor-pointer hover:shadow-md transition-all"
                      onClick={() => navigate(`/workflows/${wf.id}`)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={statusVariant} className="text-[9px] px-1.5 py-0 rounded-full">
                          {wf.status}
                        </Badge>
                        <span className="text-[9px] text-muted-foreground">v{wf.version}</span>
                      </div>
                      <p className="text-sm font-bold line-clamp-1">{wf.name}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{wf.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {wf.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[9px] text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
                        <span>{wf.stages.length} stages</span>
                        {wf.lastRunAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(wf.lastRunAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── SECTION B: CREATE A WORKFLOW ─── */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Create a Workflow
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Left card: Start from a Use Case */}
              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-primary" />
                  <p className="text-base font-bold">Start from a Use Case</p>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Tell us what you want to validate. We recommend the right agents.
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {USE_CASES.map((uc) => {
                    const isSelected = selectedGoals.includes(uc.id);
                    return (
                      <div
                        key={uc.id}
                        onClick={() => {
                          setSelectedGoals((prev) =>
                            prev.includes(uc.id) ? prev.filter((g) => g !== uc.id) : [...prev, uc.id],
                          );
                        }}
                        className={`relative rounded-lg border p-3 cursor-pointer transition-all ${
                          isSelected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:bg-muted/30'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="h-2.5 w-2.5" />
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mb-1">
                          <div className="text-primary shrink-0">{renderIconSm(uc.icon)}</div>
                          <p className="text-xs font-semibold">{uc.label}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{uc.description}</p>
                      </div>
                    );
                  })}
                </div>

                {selectedGoals.length > 0 && (
                  <div className="flex items-center justify-between pt-3 border-t mt-3">
                    <p className="text-xs text-muted-foreground">{selectedGoals.length} goal{selectedGoals.length !== 1 ? 's' : ''} selected</p>
                    <Button
                      size="sm"
                      className="rounded-full text-xs"
                      onClick={() => { computePipeline(); setStep(1); }}
                    >
                      Continue with goals
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Right card: Start from a Template */}
              <div className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-2 mb-1">
                  <ListChecks className="h-4 w-4 text-primary" />
                  <p className="text-base font-bold">Start from a Template</p>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Use a pre-built workflow template as your starting point.
                </p>

                <div className="space-y-2">
                  {WORKFLOW_TEMPLATES.slice(0, 5).map((template) => (
                    <div
                      key={template.id}
                      className="rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => loadTemplate(template)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold">{template.name}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{template.description}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 rounded-full">
                            {template.agentIds.length} agents
                          </Badge>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {template.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-muted px-1.5 py-0 text-[9px] text-muted-foreground">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ─── SECTION C: AGENTS ─── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Agents
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => navigate('/agent-runner')}
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  Run &amp; Test Agents
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => navigate('/agent-builder')}
                >
                  <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                  Build Custom Agent
                </Button>
              </div>
            </div>

            {/* Tab buttons */}
            <div className="flex items-center gap-2">
              <button
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  agentTab === 'builtin' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
                onClick={() => setAgentTab('builtin')}
              >
                Built-in ({AGENT_LIBRARY.length})
              </button>
              <button
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  agentTab === 'custom' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
                onClick={() => setAgentTab('custom')}
              >
                Custom ({customAgents.length})
              </button>
            </div>

            {/* Built-in tab */}
            {agentTab === 'builtin' && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {AGENT_LIBRARY.map((agent) => {
                  const isExpanded = expandedAgentId === agent.id;
                  return (
                    <div
                      key={agent.id}
                      className={`rounded-xl border bg-card p-4 cursor-pointer hover:shadow-md transition-all ${
                        isExpanded ? 'ring-1 ring-primary/20' : ''
                      }`}
                      onClick={() => setExpandedAgentId(isExpanded ? null : agent.id)}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="default" className="text-[9px] px-1.5 py-0 rounded-full shrink-0">
                          {agent.shortName}
                        </Badge>
                        <p className="text-xs font-semibold flex-1 line-clamp-1">{agent.name}</p>
                        <Badge
                          variant={agent.category === 'validation' ? 'secondary' : 'processing'}
                          className="text-[8px] px-1.5 py-0 rounded-full shrink-0"
                        >
                          {agent.category}
                        </Badge>
                      </div>
                      <p className={`text-[10px] text-muted-foreground ${isExpanded ? '' : 'line-clamp-2'}`}>
                        {agent.description}
                      </p>

                      {isExpanded && (
                        <>
                          <Separator className="my-2" />
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="font-semibold uppercase tracking-wider text-muted-foreground">Default Enabled:</span>
                              <span className={agent.defaultEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>
                                {agent.defaultEnabled ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="font-semibold uppercase tracking-wider text-muted-foreground">Category:</span>
                              <span className="text-muted-foreground">{agent.category}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Custom tab */}
            {agentTab === 'custom' && (
              <>
                {customAgents.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                      <Bot className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground">No custom agents yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Describe what you need and we'll build one.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full mt-3 text-xs"
                      onClick={() => navigate('/agent-builder')}
                    >
                      <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                      Build Custom Agent
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {customAgents.map((agent) => (
                      <div key={agent.id} className="rounded-xl border bg-card p-4 cursor-pointer hover:shadow-md transition-all">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge variant="default" className="text-[9px] px-1.5 py-0 rounded-full shrink-0">
                            {agent.shortName}
                          </Badge>
                          <Badge className="text-[8px] px-1.5 py-0 rounded-full shrink-0 bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/20">
                            Custom
                          </Badge>
                          <p className="text-xs font-semibold flex-1 line-clamp-1">{agent.name}</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2">{agent.description}</p>
                        <p className="text-[10px] font-mono text-muted-foreground line-clamp-2 mt-1.5 bg-muted/30 rounded px-2 py-1">
                          {agent.prompt}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════ STEP 1: SETUP ══════════════ */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Configure your setup</h1>
              <p className="text-sm text-muted-foreground">
                Set context and review the recommended pipeline.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            {/* Left column: Form (3/5) */}
            <div className="lg:col-span-3">
              <div className="rounded-xl border bg-card p-6 space-y-5">
                {/* Project Select */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Select Project</label>
                  <Select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                  >
                    <option value="">No project (generic mode)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.patientCount} patients)
                      </option>
                    ))}
                  </Select>
                  <p className="text-[10px] text-muted-foreground">Optional. Select a project for tailored recommendations.</p>
                </div>

                {/* Criteria Select */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Select Criteria</label>
                  <Select
                    value={selectedCriterionId}
                    onChange={(e) => setSelectedCriterionId(e.target.value)}
                  >
                    <option value="">No criteria selected</option>
                    {criteria.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </Select>
                  <p className="text-[10px] text-muted-foreground">Optional. Selecting a criterion will auto-fill the prompt below.</p>
                </div>

                {/* Prompt */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Your Prompt</label>
                  <Textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="Paste your extraction prompt here for evaluation..."
                    rows={6}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    If provided, we can evaluate quality and tailor agent configuration.
                  </p>
                </div>

                {/* Sample Size */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Sample size for test run</label>
                  <Input
                    type="number"
                    value={sampleSize}
                    onChange={(e) => setSampleSize(e.target.value)}
                    min="5"
                    max="500"
                  />
                </div>

                {/* Context signals */}
                <div className="space-y-3">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Context Signals
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox checked={isFirstRun} onChange={() => setIsFirstRun(!isFirstRun)} />
                      <span className="text-sm">This is my first run with this prompt</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox checked={isRegulatory} onChange={() => setIsRegulatory(!isRegulatory)} />
                      <span className="text-sm">Data for regulatory submission</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox checked={isMultiSource} onChange={() => setIsMultiSource(!isMultiSource)} />
                      <span className="text-sm">Data from multiple EHR providers</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox checked={hasTemporal} onChange={() => setHasTemporal(!hasTemporal)} />
                      <span className="text-sm">Criteria involve temporal windows</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <Checkbox checked={hasNumeric} onChange={() => setHasNumeric(!hasNumeric)} />
                      <span className="text-sm">Criteria involve numeric values</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: Recommended Pipeline (2/5) */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border bg-card p-5 space-y-4 sticky top-6">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Recommended Pipeline
                </p>

                {/* Summary row */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-medium">{pipeline.length} steps</span>
                  <span className="text-muted-foreground/30">|</span>
                  <span>~{totalEstTime}m</span>
                  <span className="text-muted-foreground/30">|</span>
                  <span>~${totalEstCost.toFixed(2)}</span>
                </div>

                {/* Pipeline cards */}
                {pipeline.length === 0 ? (
                  <div className="rounded-xl bg-muted/30 p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      Pipeline will populate after you continue from goals.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pipeline.map((s) => (
                      <div key={s.id} className="rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <div className="text-primary shrink-0">{renderIconSm(s.icon)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold">{s.label}</p>
                              <button
                                className="text-muted-foreground hover:text-primary cursor-pointer p-0.5 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedStepId(expandedStepId === s.id ? null : s.id);
                                }}
                              >
                                <Info className="h-3 w-3" />
                              </button>
                            </div>
                            <p className="text-[10px] text-muted-foreground truncate">{s.plainAction}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {s.agentIds.map((aid) => {
                                const agent = getAgent(aid);
                                return (
                                  <Badge key={aid} variant="secondary" className="text-[9px] px-1.5 py-0 rounded-full">
                                    {agent?.shortName}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] text-muted-foreground">{s.estimatedTime}</p>
                            <p className="text-[10px] text-muted-foreground">{s.estimatedCost}</p>
                          </div>
                          <button
                            className="text-muted-foreground hover:text-destructive cursor-pointer p-1 shrink-0"
                            onClick={() => removePipelineStep(s.id)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Expanded agent details */}
                        {expandedStepId === s.id && (
                          <div className="mt-2 pt-2 border-t space-y-1.5">
                            {s.agentIds.map((aid) => {
                              const agent = getAgent(aid);
                              if (!agent) return null;
                              return (
                                <div key={aid} className="rounded-lg bg-muted/30 p-2.5 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="default" className="text-[9px] px-1.5 py-0 rounded-full">
                                      {agent.shortName}
                                    </Badge>
                                    <p className="text-[10px] font-semibold">{agent.name}</p>
                                    <Badge
                                      variant={agent.category === 'validation' ? 'secondary' : 'processing'}
                                      className="text-[8px] px-1 py-0 rounded-full"
                                    >
                                      {agent.category}
                                    </Badge>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">{agent.description}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add a step */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setShowAddStep(!showAddStep)}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add a step
                  </Button>

                  {showAddStep && availableSteps.length > 0 && (
                    <div className="absolute top-full left-0 mt-2 z-10 w-full rounded-xl border bg-card shadow-lg p-3 space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                        Available Steps
                      </p>
                      {availableSteps.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => addPipelineStep(s)}
                        >
                          <div className="text-primary shrink-0">{renderIconSm(s.icon)}</div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold">{s.label}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{s.plainAction}</p>
                          </div>
                          <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        </div>
                      ))}
                      {availableSteps.length === 0 && (
                        <p className="text-xs text-muted-foreground p-2">All available steps have been added.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Why recommended */}
                <div>
                  <button
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                    onClick={() => setShowWhyRecommended(!showWhyRecommended)}
                  >
                    {showWhyRecommended ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    Why these were recommended
                  </button>

                  {showWhyRecommended && (
                    <div className="mt-2 rounded-xl bg-muted/30 p-3 space-y-2">
                      {pipeline.map((s) => {
                        const goals = goalsForStep(s.id);
                        return (
                          <div key={s.id} className="flex items-start gap-2">
                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <p className="text-[11px] text-muted-foreground">
                              <strong>{s.label}</strong>: {goals.length > 0 ? `Recommended because you selected [${goals.join(', ')}].` : 'Added based on your context signals.'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Skip to Run */}
                {pipeline.length > 0 && (
                  <Button
                    variant="ghost"
                    className="rounded-full w-full text-xs"
                    onClick={() => setStep(3)}
                  >
                    Skip to Run
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ STEP 2: BUILDER ══════════════ */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <WorkflowIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Pipeline Builder</h1>
              <p className="text-sm text-muted-foreground">
                Arrange, configure, and inspect each validation step.
              </p>
            </div>
          </div>

          {/* Skip to Run banner */}
          <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">
              Pipeline looks good? Skip the builder and run directly.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => setStep(3)}
            >
              Skip to Run
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>

          {/* TOP HALF: Visual Pipeline Strip */}
          <div className="rounded-xl border bg-card p-4 overflow-x-auto">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Pipeline Flow
            </p>
            <div className="flex items-center gap-0 min-w-max">
              {pipeline.map((s, idx) => {
                const isSelected = selectedBuilderStepId === s.id;
                return (
                  <div key={s.id} className="flex items-center">
                    {idx > 0 && (
                      <div className="flex items-center px-1">
                        <div className="w-8 h-px bg-border" />
                        <ArrowRight className="h-3 w-3 text-muted-foreground -ml-1.5" />
                      </div>
                    )}
                    <div
                      className={`rounded-lg border p-3 min-w-[120px] text-center cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:bg-muted/30'
                      }`}
                      onClick={() => setSelectedBuilderStepId(isSelected ? null : s.id)}
                    >
                      <div className="flex justify-center mb-1.5 text-primary">
                        {renderIconSm(s.icon)}
                      </div>
                      <p className="text-xs font-semibold">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {s.agentIds.length} agent{s.agentIds.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* BOTTOM HALF: Two-panel layout */}
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Left panel (60%): Step Sequence List */}
            <div className="lg:col-span-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Step Sequence
              </p>

              {pipeline.map((s, idx) => {
                const isLast = idx === pipeline.length - 1;
                return (
                  <div
                    key={s.id}
                    className={`rounded-xl border bg-card transition-shadow hover:shadow-md cursor-pointer ${
                      selectedBuilderStepId === s.id ? 'ring-1 ring-primary/20' : ''
                    }`}
                    onClick={() => setSelectedBuilderStepId(selectedBuilderStepId === s.id ? null : s.id)}
                  >
                    <div className="flex items-center gap-2.5 p-3.5">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <div className="text-primary shrink-0">{renderIconSm(s.icon)}</div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold">{s.label}</span>
                        <span className="text-[11px] text-muted-foreground ml-2">{s.plainAction}</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {s.agentIds.map((aid) => {
                            const agent = getAgent(aid);
                            return (
                              <Badge key={aid} variant="secondary" className="text-[9px] px-1.5 py-0 rounded-full">
                                {agent?.shortName}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={idx === 0}
                          onClick={(e) => { e.stopPropagation(); movePipelineStep(idx, 'up'); }}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={isLast}
                          onClick={(e) => { e.stopPropagation(); movePipelineStep(idx, 'down'); }}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); removePipelineStep(s.id); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add Step */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setShowAddStep(!showAddStep)}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Step
                </Button>
                {showAddStep && availableSteps.length > 0 && (
                  <div className="absolute top-full left-0 mt-2 z-10 w-full max-w-sm rounded-xl border bg-card shadow-lg p-3 space-y-2">
                    {availableSteps.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => addPipelineStep(s)}
                      >
                        <div className="text-primary shrink-0">{renderIconSm(s.icon)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold">{s.label}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{s.plainAction}</p>
                        </div>
                        <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right panel (40%): Step Detail */}
            <div className="lg:col-span-2">
              {selectedBuilderStepId ? (
                (() => {
                  const s = pipeline.find((p) => p.id === selectedBuilderStepId);
                  if (!s) return null;
                  return (
                    <div className="rounded-xl border bg-card p-5 space-y-4 sticky top-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          {renderIcon(s.icon)}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{s.label}</p>
                          <p className="text-[11px] text-muted-foreground">{s.plainAction}</p>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>

                      <Separator />

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">When to Use</p>
                        <p className="text-[11px] text-muted-foreground">{s.whenToUse}</p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Best For</p>
                        <p className="text-[11px] text-muted-foreground">{s.bestFor}</p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">What It Catches</p>
                        <p className="text-[11px] text-muted-foreground">{s.whatItCatches}</p>
                      </div>

                      <Separator />

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                          Included Agents
                        </p>
                        <div className="space-y-2">
                          {s.agentIds.map((aid) => {
                            const agent = getAgent(aid);
                            if (!agent) return null;
                            return (
                              <div key={aid} className="rounded-lg border p-3 space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="default" className="text-[10px] px-2 py-0 rounded-full">
                                    {agent.shortName}
                                  </Badge>
                                  <p className="text-xs font-semibold">{agent.name}</p>
                                </div>
                                <p className="text-[10px] text-muted-foreground">{agent.description}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                          Configuration
                        </p>
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold">Threshold</label>
                            <Input type="number" step="0.05" min="0" max="1" defaultValue="0.85" />
                          </div>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <Checkbox defaultChecked />
                            <span className="text-xs font-semibold">Strict mode</span>
                          </label>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                          Expected Output
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          This step produces per-patient validation results including findings, issues, confidence scores, and evidence links.
                        </p>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="rounded-xl border border-dashed bg-card p-12 flex flex-col items-center justify-center text-center">
                  <Settings2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Select a step to view details.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ STEP 3: RUN & RESULTS ══════════════ */}
      {step === 3 && (
        <div className="space-y-6">

          {/* ── Phase: READY ── */}
          {runPhase === 'ready' && (
            <>
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Play className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Ready to run</h1>
                  <p className="text-sm text-muted-foreground">
                    Review your pipeline and start validation.
                  </p>
                </div>
              </div>

              {/* Pre-run validation card */}
              <div className="rounded-xl border bg-card p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Readiness Checks
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <PreRunCheck
                    label="Pipeline configured"
                    passed={pipeline.length > 0}
                    type="check"
                  />
                  <PreRunCheck
                    label="At least 2 agents"
                    passed={totalAgents >= 2}
                    type="check"
                  />
                  <PreRunCheck
                    label="Prompt provided"
                    passed={promptText.trim().length > 0}
                    type={promptText.trim().length > 0 ? 'check' : 'warning'}
                  />
                  <PreRunCheck
                    label="Project selected"
                    passed={!!selectedProjectId}
                    type={selectedProjectId ? 'check' : 'warning'}
                  />
                </div>
              </div>

              {/* Pipeline summary strip */}
              <div className="rounded-xl border bg-card p-4 overflow-x-auto">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Pipeline Preview
                </p>
                <div className="flex items-center gap-0 min-w-max">
                  {pipeline.map((s, idx) => (
                    <div key={s.id} className="flex items-center">
                      {idx > 0 && (
                        <div className="flex items-center px-1">
                          <div className="w-6 h-px bg-border" />
                          <ArrowRight className="h-3 w-3 text-muted-foreground -ml-1" />
                        </div>
                      )}
                      <div className="rounded-lg border p-2.5 min-w-[100px] text-center">
                        <div className="flex justify-center mb-1 text-primary">{renderIconSm(s.icon)}</div>
                        <p className="text-[10px] font-semibold">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats row */}
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Steps</p>
                  <p className="text-lg font-bold">{pipeline.length}</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Est. Time</p>
                  <p className="text-lg font-bold">~{totalEstTime}m</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Est. Cost</p>
                  <p className="text-lg font-bold">~${totalEstCost.toFixed(2)}</p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Agents</p>
                  <p className="text-lg font-bold">{totalAgents}</p>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  size="lg"
                  className="rounded-full px-8 text-sm font-semibold shadow-md"
                  disabled={pipeline.length === 0}
                  onClick={() => setRunPhase('running')}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Run Pipeline
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full px-6 text-sm font-semibold"
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Builder
                </Button>
              </div>
            </>
          )}

          {/* ── Phase: RUNNING ── */}
          {runPhase === 'running' && (
            <>
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Running validation...</h1>
                  <p className="text-sm text-muted-foreground">
                    Estimated ~{totalEstTime}m remaining
                  </p>
                </div>
              </div>

              {/* Overall progress */}
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    {runProgress === 100 ? 'Pipeline Complete' : 'Running...'}
                  </p>
                  <Badge
                    variant={runProgress === 100 ? 'success' : 'processing'}
                    className="text-[10px] px-2 py-0 rounded-full"
                  >
                    {runProgress === 100 && <Check className="mr-1 h-3 w-3" />}
                    {runProgress < 100 && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    {runProgress}%
                  </Badge>
                </div>
                <Progress value={runProgress} />
              </div>

              {/* Step-by-step cards */}
              <div className="space-y-2">
                {pipeline.map((s) => {
                  const status = stepStatuses[s.id] ?? 'pending';
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                        status === 'running'
                          ? 'border-primary/30 bg-primary/5'
                          : status === 'done'
                            ? 'bg-card'
                            : 'bg-card opacity-60'
                      }`}
                    >
                      {/* Status icon */}
                      <div className="shrink-0">
                        {status === 'pending' && (
                          <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/30" />
                        )}
                        {status === 'running' && (
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        )}
                        {status === 'done' && (
                          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                        )}
                        {status === 'failed' && (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                            <X className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      {/* Center */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{s.label}</p>
                          <span className="text-[11px] text-muted-foreground">— {s.plainAction}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {s.agentIds.map((aid) => {
                            const agent = getAgent(aid);
                            return (
                              <Badge key={aid} variant="secondary" className="text-[9px] px-1.5 py-0 rounded-full">
                                {agent?.shortName}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right */}
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-medium ${
                          status === 'done'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : status === 'running'
                              ? 'text-primary'
                              : status === 'failed'
                                ? 'text-destructive'
                                : 'text-muted-foreground'
                        }`}>
                          {status === 'pending' && 'Waiting...'}
                          {status === 'running' && 'Processing...'}
                          {status === 'done' && 'Complete'}
                          {status === 'failed' && 'Failed'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stop button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  className="rounded-full px-6 text-sm font-semibold text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setRunPhase('ready')}
                >
                  <X className="mr-2 h-4 w-4" />
                  Stop
                </Button>
              </div>
            </>
          )}

          {/* ── Phase: DONE ── */}
          {runPhase === 'done' && (
            <>
              {/* Empty results guard */}
              {runPhase === 'done' && Object.keys(resultData).length === 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-5 py-4 text-center">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">No results available</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">The pipeline may have been empty. Go back and add steps.</p>
                  <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={() => { setRunPhase('ready'); setStep(1); }}>
                    Back to Setup
                  </Button>
                </div>
              )}

              {/* Success banner */}
              {Object.keys(resultData).length > 0 && (
                <>
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 px-5 py-4">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Validation Complete</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        {pipeline.length} steps completed · {totalFindings} findings · {totalIssues} issues
                      </p>
                    </div>
                  </div>

                  {/* Summary stats row */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border bg-card p-5 space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Findings</p>
                      <p className="text-2xl font-bold">{totalFindings}</p>
                    </div>
                    <div className="rounded-xl border bg-card p-5 space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Issues Found</p>
                      <p className={`text-2xl font-bold ${totalIssues > 0 ? 'text-destructive' : ''}`}>{totalIssues}</p>
                    </div>
                    <div className="rounded-xl border bg-card p-5 space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avg Confidence</p>
                      <p className="text-2xl font-bold">{(avgConfidence * 100).toFixed(1)}%</p>
                    </div>
                    <div className="rounded-xl border bg-card p-5 space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Steps Completed</p>
                      <p className="text-2xl font-bold">{pipeline.length}</p>
                    </div>
                  </div>

                  {/* Per-step result cards */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Results by Step
                    </p>
                    {pipeline.map((s) => {
                      const data = resultData[s.id];
                      if (!data) return null;
                      const isExpanded = expandedResultId === s.id;
                      const statusLabel =
                        data.issues > data.findings / 2
                          ? 'Critical'
                          : data.issues >= 3
                            ? 'Needs Review'
                            : 'Passed';
                      const statusVariant: 'success' | 'warning' | 'destructive' =
                        statusLabel === 'Passed' ? 'success' : statusLabel === 'Needs Review' ? 'warning' : 'destructive';

                      return (
                        <div key={s.id} className="rounded-xl border bg-card overflow-hidden">
                          {/* Header */}
                          <div
                            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                            onClick={() => setExpandedResultId(isExpanded ? null : s.id)}
                          >
                            <Badge variant={statusVariant} className="text-[10px] px-2.5 py-0.5 rounded-full shrink-0">
                              {statusLabel}
                            </Badge>
                            <div className="text-primary shrink-0">{renderIconSm(s.icon)}</div>
                            <p className="text-sm font-semibold flex-1">{s.label}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                              <span>{data.findings} findings</span>
                              <span className="text-muted-foreground/30">|</span>
                              <span>{data.issues} issues</span>
                              <span className="text-muted-foreground/30">|</span>
                              <span>{(data.confidence * 100).toFixed(0)}%</span>
                            </div>
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                          </div>

                          {/* Expanded */}
                          {isExpanded && (
                            <>
                              <Separator />
                              <div className="p-4 space-y-4">
                                <p className="text-xs text-muted-foreground">{data.summary}</p>

                                {/* Agent-level breakdown */}
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                    Agent-level breakdown
                                  </p>
                                  <div className="space-y-1.5">
                                    {s.agentIds.map((aid) => {
                                      const agent = getAgent(aid);
                                      if (!agent) return null;
                                      const agentFindings = Math.floor(Math.random() * 10) + 2;
                                      const agentIssues = Math.floor(Math.random() * Math.min(agentFindings, 4));
                                      return (
                                        <div key={aid} className="flex items-center gap-3 rounded-lg bg-muted/30 p-2.5">
                                          <Badge variant="default" className="text-[10px] px-2 py-0 rounded-full shrink-0">
                                            {agent.shortName}
                                          </Badge>
                                          <p className="text-xs font-semibold flex-1">{agent.name}</p>
                                          <p className="text-[10px] text-muted-foreground">{agentFindings} findings, {agentIssues} issues</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                <Separator />

                                {/* Sample findings */}
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                    Sample Findings
                                  </p>
                                  <div className="space-y-2">
                                    {[0, 1, 2].map((i) => {
                                      const severities = ['critical', 'high', 'medium', 'low'] as const;
                                      const sev = severities[Math.floor(Math.random() * severities.length)];
                                      const idx = (s.agentIds.length + i) % MOCK_FINDING_TITLES.length;
                                      return (
                                        <div key={i} className="rounded-lg border p-3 space-y-1.5">
                                          <div className="flex items-center gap-2">
                                            <Badge
                                              variant={sev === 'critical' || sev === 'high' ? 'destructive' : sev === 'medium' ? 'warning' : 'secondary'}
                                              className="text-[9px] px-1.5 py-0 rounded-full"
                                            >
                                              {sev}
                                            </Badge>
                                            <p className="text-xs font-semibold">{MOCK_FINDING_TITLES[idx]}</p>
                                          </div>
                                          <p className="text-[11px] text-muted-foreground">{MOCK_FINDING_DETAILS[idx]}</p>
                                          <p className="text-[10px] text-muted-foreground/70 italic">{MOCK_EVIDENCE_QUOTES[idx]}</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <button
                                    className="mt-2 text-xs text-primary hover:underline cursor-pointer"
                                    onClick={(e) => { e.stopPropagation(); setFindingsModalStepId(s.id); setFindingsSeverityFilter('all'); setFindingsSearch(''); }}
                                  >
                                    View all findings &rarr;
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      className="rounded-full px-6 text-sm font-semibold shadow-md"
                      onClick={() => setStep(4)}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save as Workflow
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-full px-6 text-sm font-semibold"
                      onClick={() => setRunPhase('ready')}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Re-run with Changes
                    </Button>
                    <Button
                      variant="ghost"
                      className="rounded-full px-6 text-sm font-semibold"
                      onClick={() => alert('Export coming soon.')}
                    >
                      Export Results
                    </Button>
                    {fromProject && selectedProjectId && (
                      <Button
                        variant="ghost"
                        className="rounded-full px-6 text-sm font-semibold"
                        onClick={() => navigate(`/projects/${selectedProjectId}/criteria`)}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Return to Project
                      </Button>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════ STEP 4: SAVE WORKFLOW ══════════════ */}
      {step === 4 && !saved && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Save className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Save your workflow</h1>
              <p className="text-sm text-muted-foreground">
                Name and tag your workflow for reuse across projects.
              </p>
            </div>
          </div>

          {/* Naming convention helper */}
          <div className="rounded-xl bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">
              <strong>Suggested naming:</strong> [Scope]_[Disease]_[UseCase]_[Version]
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-1">
              Examples: Generic_PD_PromptTest_V1, ClientA_Migraine_EligibilityCheck_V2
            </p>
          </div>

          {/* Form */}
          <div className="rounded-xl border bg-card p-6 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Scope */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Scope</label>
                <Select value={wfScope} onChange={(e) => setWfScope(e.target.value)}>
                  <option value="Generic">Generic</option>
                  <option value="Client-specific">Client-specific</option>
                </Select>
              </div>

              {/* Disease area */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Disease area</label>
                <Input
                  value={wfDisease}
                  onChange={(e) => setWfDisease(e.target.value)}
                  placeholder="e.g., PD, Migraine, AD, MS"
                />
              </div>

              {/* Version */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Version</label>
                <Input
                  value={wfVersion}
                  onChange={(e) => setWfVersion(e.target.value)}
                  placeholder="V1"
                />
              </div>

              {/* Use case tag */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Use case tag</label>
                <Input
                  value={useCaseTag}
                  readOnly
                  className="bg-muted/30"
                />
              </div>
            </div>

            {/* Auto-generated name */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Auto-generated name</label>
              <Input value={autoName} readOnly className="bg-muted/30 font-mono text-xs" />
              <p className="text-[10px] text-muted-foreground">Or override with a custom name below.</p>
            </div>

            {/* Custom name override */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Workflow name (optional override)</label>
              <Input
                value={wfName}
                onChange={(e) => setWfName(e.target.value)}
                placeholder={autoName}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Description</label>
              <Textarea
                value={wfDescription}
                onChange={(e) => setWfDescription(e.target.value)}
                placeholder={`Validation pipeline with ${pipeline.length} steps: ${pipeline.map((s) => s.label).join(', ')}.`}
                rows={3}
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Tags (comma-separated)</label>
              <Input
                value={wfTagsInput}
                onChange={(e) => setWfTagsInput(e.target.value)}
                placeholder={selectedGoals.map((gid) => USE_CASES.find((uc) => uc.id === gid)?.label).filter(Boolean).join(', ')}
              />
            </div>

            {/* Visibility */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Visibility
              </label>
              <div className="flex items-center gap-4">
                {(['Personal', 'Team', 'Published'] as const).map((v) => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      checked={wfVisibility === v}
                      onChange={() => setWfVisibility(v)}
                      className="accent-primary"
                    />
                    <span className="text-sm">{v}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Pipeline summary strip */}
          <div className="rounded-xl border bg-card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Pipeline Summary
            </p>
            <div className="flex flex-wrap gap-2">
              {pipeline.map((s) => (
                <div key={s.id} className="flex items-center gap-1.5 rounded-lg bg-muted/30 px-2.5 py-1.5">
                  <div className="text-primary">{renderIconSm(s.icon)}</div>
                  <span className="text-xs font-medium">{s.label}</span>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 rounded-full">
                    {s.agentIds.length}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              size="lg"
              className="rounded-full px-8 text-sm font-semibold shadow-md"
              onClick={() => void handleSaveWorkflow(wfVisibility === 'Published' ? 'Published' : 'Draft')}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Workflow
            </Button>
            <Button
              variant="outline"
              className="rounded-full px-6 text-sm font-semibold"
              onClick={() => void handleSaveWorkflow('Draft')}
            >
              Save as Draft
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════ STEP 4: SAVED SUCCESS ══════════════ */}
      {step === 4 && saved && (
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-full max-w-md rounded-xl border bg-card p-8 space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold">Workflow saved!</h2>
            <p className="text-sm font-semibold">{wfName.trim() || autoName}</p>
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
              <span>{pipeline.length} steps</span>
              <span className="text-muted-foreground/30">|</span>
              <span>{totalAgents} agents</span>
            </div>

            <div className="flex flex-col gap-2 pt-3">
              {fromProject && selectedProjectId && (
                <Button
                  className="rounded-full text-sm font-semibold"
                  onClick={() => navigate(`/projects/${selectedProjectId}/criteria`)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Project
                </Button>
              )}
              <Button
                variant={fromProject ? 'outline' : 'default'}
                className="rounded-full text-sm font-semibold"
                onClick={() => navigate('/workflows')}
              >
                View Workflows
              </Button>
              <Button
                variant="ghost"
                className="rounded-full text-sm font-semibold"
                onClick={() => navigate(fromProject && selectedProjectId ? `/projects/${selectedProjectId}/criteria` : '/home')}
              >
                {fromProject ? 'Back to Project' : 'Back to Home'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ FINDINGS DETAIL MODAL ══════════════ */}
      {findingsModalStepId && (() => {
        const modalStep = pipeline.find((s) => s.id === findingsModalStepId);
        const modalData = resultData[findingsModalStepId];
        if (!modalStep || !modalData) return null;
        const criticalCount = allFindingsForStep.filter((f) => f.severity === 'critical').length;
        const highCount = allFindingsForStep.filter((f) => f.severity === 'high').length;
        const mediumCount = allFindingsForStep.filter((f) => f.severity === 'medium').length;
        const lowCount = allFindingsForStep.filter((f) => f.severity === 'low').length;

        return (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4 pt-8">
            <div className="w-full max-w-4xl rounded-2xl border bg-card shadow-2xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b px-6 py-4 sticky top-0 bg-card rounded-t-2xl z-10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {renderIcon(modalStep.icon)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{modalStep.label} — All Findings</h2>
                    <p className="text-xs text-muted-foreground">
                      {modalData.findings} findings · {modalData.issues} issues · {(modalData.confidence * 100).toFixed(0)}% confidence
                    </p>
                  </div>
                </div>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  onClick={() => setFindingsModalStepId(null)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Severity summary bar */}
              <div className="px-6 py-3 border-b bg-muted/20">
                <div className="flex items-center gap-3">
                  {criticalCount > 0 && (
                    <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1">
                      <AlertTriangle className="h-3 w-3 text-red-600" />
                      <span className="text-[11px] font-semibold text-red-700 dark:text-red-400">{criticalCount} Critical</span>
                    </div>
                  )}
                  {highCount > 0 && (
                    <div className="flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1">
                      <span className="text-[11px] font-semibold text-orange-700 dark:text-orange-400">{highCount} High</span>
                    </div>
                  )}
                  {mediumCount > 0 && (
                    <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1">
                      <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">{mediumCount} Medium</span>
                    </div>
                  )}
                  {lowCount > 0 && (
                    <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1">
                      <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400">{lowCount} Low</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Filter + Search bar */}
              <div className="px-6 py-3 border-b flex items-center gap-3 flex-wrap">
                {/* Severity filter */}
                <div className="flex items-center gap-1">
                  {(['all', 'critical', 'high', 'medium', 'low'] as const).map((sev) => (
                    <button
                      key={sev}
                      className={`rounded-full px-3 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
                        findingsSeverityFilter === sev
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setFindingsSeverityFilter(sev)}
                    >
                      {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={findingsSearch}
                    onChange={(e) => setFindingsSearch(e.target.value)}
                    placeholder="Search findings, patients, agents..."
                    className="pl-8 h-8 text-xs"
                  />
                  {findingsSearch && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                      onClick={() => setFindingsSearch('')}
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                </div>

                <span className="text-[10px] text-muted-foreground shrink-0">
                  {filteredFindings.length} of {allFindingsForStep.length} findings
                </span>
              </div>

              {/* Findings list */}
              <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-2">
                {filteredFindings.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-muted-foreground">No findings match your filter.</p>
                  </div>
                ) : (
                  filteredFindings.map((f) => (
                    <div key={f.id} className="rounded-xl border p-4 space-y-2 hover:bg-muted/20 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Badge
                            variant={f.severity === 'critical' || f.severity === 'high' ? 'destructive' : f.severity === 'medium' ? 'warning' : 'secondary'}
                            className="text-[9px] px-1.5 py-0 rounded-full shrink-0"
                          >
                            {f.severity}
                          </Badge>
                          <p className="text-sm font-semibold">{f.title}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 rounded-full">
                            {f.agentShortName}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono">{f.patientId}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{f.detail}</p>
                      {f.evidence && (
                        <p className="text-[11px] text-muted-foreground/70 italic bg-muted/30 rounded-lg px-3 py-2">
                          {f.evidence}
                        </p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] text-muted-foreground">Agent: {f.agentName}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-between border-t px-6 py-3 bg-muted/20 rounded-b-2xl">
                <p className="text-xs text-muted-foreground">
                  {filteredFindings.filter((f) => f.severity === 'critical' || f.severity === 'high').length} critical/high issues need attention
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full text-xs"
                  onClick={() => setFindingsModalStepId(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════ NAVIGATION FOOTER (steps 1-2 only) ══════════════ */}
      {step >= 1 && step <= 2 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            className="rounded-full px-6 text-sm font-semibold"
            onClick={() => {
              handleBack();
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-3">
            {step === 1 && (
              <Button
                variant="ghost"
                className="rounded-full px-6 text-sm font-semibold"
                onClick={() => setStep(3)}
              >
                Skip to Run
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            <Button
              className="rounded-full px-6 text-sm font-semibold shadow-md"
              onClick={() => {
                if (step === 2) {
                  setStep(3);
                } else {
                  handleNext();
                }
              }}
              disabled={!canProceed()}
            >
              {step === 1 && 'Customize in Builder'}
              {step === 2 && (
                <>
                  Run Pipeline
                  <Play className="ml-2 h-4 w-4" />
                </>
              )}
              {step === 1 && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Subcomponents ─── */

function PreRunCheck({
  label,
  passed,
  type,
}: {
  label: string;
  passed: boolean;
  type: 'check' | 'warning' | 'info';
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-5 w-5 items-center justify-center rounded-full shrink-0 ${
          passed
            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
            : type === 'warning'
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              : 'bg-muted text-muted-foreground'
        }`}
      >
        {passed ? (
          <Check className="h-3 w-3" />
        ) : type === 'warning' ? (
          <Minus className="h-3 w-3" />
        ) : (
          <Info className="h-3 w-3" />
        )}
      </div>
      <span
        className={`text-xs ${
          passed
            ? 'text-foreground'
            : type === 'warning'
              ? 'text-amber-700 dark:text-amber-300'
              : 'text-muted-foreground'
        }`}
      >
        {label}
      </span>
    </div>
  );
}
