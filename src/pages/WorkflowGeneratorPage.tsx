import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { AGENT_LIBRARY, getAgent } from '@/data/agents';
import type { Workflow, WorkflowStage } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
  Lightbulb,
  Loader2,
  MessageSquareText,
  Play,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  X,
  Zap,
  Workflow as WorkflowIcon,
} from 'lucide-react';

/* ─── Helpers ─── */

function randomId() {
  return Math.random().toString(36).slice(2, 8);
}

/* ─── Agent ordering priority for deterministic sort ─── */

const AGENT_ORDER: Record<string, number> = {
  'agent-correctness': 0,
  'agent-evidence': 1,
  'agent-hallucination': 2,
  'agent-negation': 3,
  'agent-conflict': 4,
  'agent-uncertainty': 5,
  'agent-eligibility': 6,
  'agent-temporal': 7,
  'agent-date': 8,
  'agent-numerical': 9,
  'agent-unit': 10,
  'agent-terminology': 11,
  'agent-bias': 12,
  'agent-prompt-eval': 13,
  'agent-completeness': 14,
};

/* ─── Example prompts ─── */

type ExamplePrompt = {
  description: string;
  priority: string;
  complexity: string;
};

const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    description:
      'Validate eligibility criteria extraction for a migraine clinical trial with data from 3 EHR providers',
    priority: 'accuracy',
    complexity: 'multi-mixed',
  },
  {
    description:
      'Deep evidence audit for an Alzheimer\'s biomarker study headed for FDA submission',
    priority: 'evidence',
    complexity: 'multi-complex',
  },
  {
    description:
      'Check data integrity of longitudinal Parkinson\'s motor assessment scores across 5 years of records',
    priority: 'data-quality',
    complexity: 'multi-complex',
  },
  {
    description:
      'Quick screening pipeline to check if MS relapse detection is consistent across different documentation styles',
    priority: 'speed',
    complexity: 'multi-mixed',
  },
];

/* ─── Priority & Complexity option maps ─── */

const PRIORITY_OPTIONS = [
  { value: 'accuracy', label: 'Accuracy & Correctness' },
  { value: 'evidence', label: 'Evidence & Traceability' },
  { value: 'data-quality', label: 'Data Quality & Integrity' },
  { value: 'speed', label: 'Speed & Efficiency' },
  { value: 'comprehensive', label: 'Comprehensive Audit' },
];

const COMPLEXITY_OPTIONS = [
  { value: 'single-structured', label: 'Single source, structured' },
  { value: 'single-unstructured', label: 'Single source, unstructured' },
  { value: 'multi-mixed', label: 'Multi-source, mixed' },
  { value: 'multi-complex', label: 'Multi-source, complex' },
];

/* ─── Analysis step labels ─── */

const ANALYSIS_STEPS = [
  'Understanding your validation requirements...',
  'Scanning agent library for relevant capabilities...',
  'Determining optimal agent sequence...',
  'Configuring agent parameters...',
  'Estimating cost and processing time...',
  'Generating workflow...',
];

/* ─── Keyword matching & generation logic ─── */

type AgentReason = { agentId: string; reason: string };

function generateWorkflowAgents(
  description: string,
  priority: string,
): AgentReason[] {
  const desc = description.toLowerCase();
  const selected = new Map<string, string>();

  // Always include Correctness Agent
  selected.set('agent-correctness', 'Included by default as the foundation of every validation pipeline.');

  // Keyword rules
  if (/evidence|citation|grounding|traceable/.test(desc)) {
    selected.set('agent-evidence', 'Selected because your description mentions evidence/citation needs. This agent ensures every claim is anchored to specific source passages.');
  }
  if (/hallucin|fabricat|fabrication|made up/.test(desc)) {
    selected.set('agent-hallucination', 'Selected because your description mentions hallucination or fabrication concerns. This agent identifies unsupported assertions.');
  }
  if (/date|temporal|timeline|longitudinal/.test(desc)) {
    selected.set('agent-date', 'Selected because your description mentions date or temporal data. This agent checks temporal consistency and plausibility.');
    selected.set('agent-temporal', 'Selected because your description mentions timeline or longitudinal data. This agent validates clinically plausible event sequences.');
  }
  if (/negat|denies|no history/.test(desc)) {
    selected.set('agent-negation', 'Selected because your description mentions negation handling. This agent detects negated mentions to prevent false-positive extraction.');
  }
  if (/eligib|criteria|inclusion|exclusion/.test(desc)) {
    selected.set('agent-eligibility', 'Selected because your description mentions eligibility criteria. This agent evaluates inclusion/exclusion logic.');
  }
  if (/complete|missing|all fields|populated/.test(desc)) {
    selected.set('agent-completeness', 'Selected because your description mentions completeness requirements. This agent checks whether all required fields are evaluated.');
  }
  if (/dosage|numeric|value|range|score/.test(desc)) {
    selected.set('agent-numerical', 'Selected because your description mentions numerical values or scores. This agent validates numeric ranges and thresholds.');
  }
  if (/unit|mg|measurement/.test(desc)) {
    selected.set('agent-unit', 'Selected because your description mentions units or measurements. This agent checks unit consistency and correctness.');
  }
  if (/terminology|coding|snomed|icd/.test(desc)) {
    selected.set('agent-terminology', 'Selected because your description mentions terminology or coding standards. This agent maps clinical terms to standard ontologies.');
  }
  if (/conflict|contradict|inconsistent/.test(desc)) {
    selected.set('agent-conflict', 'Selected because your description mentions conflicts or contradictions. This agent identifies contradictory information across sources.');
  }
  if (/uncertain|unclear|ambiguous|hedge/.test(desc)) {
    selected.set('agent-uncertainty', 'Selected because your description mentions uncertainty or ambiguity. This agent flags speculative phrasing and low-confidence assertions.');
  }
  if (/bias/.test(desc)) {
    selected.set('agent-bias', 'Selected because your description mentions bias concerns. This agent tests for demographic, linguistic, and clinical bias.');
  }
  if (/prompt|evaluate prompt/.test(desc)) {
    selected.set('agent-prompt-eval', 'Selected because your description mentions prompt evaluation. This agent evaluates prompt quality and coverage.');
  }

  // Priority modifiers
  if (priority === 'accuracy') {
    if (!selected.has('agent-evidence')) {
      selected.set('agent-evidence', 'Added by Accuracy & Correctness priority to ensure evidence grounding alongside correctness validation.');
    }
  }
  if (priority === 'evidence') {
    if (!selected.has('agent-evidence')) {
      selected.set('agent-evidence', 'Added by Evidence & Traceability priority to ensure full citation traceability.');
    }
    if (!selected.has('agent-hallucination')) {
      selected.set('agent-hallucination', 'Added by Evidence & Traceability priority to catch unsupported claims.');
    }
    if (!selected.has('agent-completeness')) {
      selected.set('agent-completeness', 'Added by Evidence & Traceability priority to verify all claims are accounted for.');
    }
  }
  if (priority === 'data-quality') {
    if (!selected.has('agent-date')) {
      selected.set('agent-date', 'Added by Data Quality & Integrity priority to validate date formats and ordering.');
    }
    if (!selected.has('agent-numerical')) {
      selected.set('agent-numerical', 'Added by Data Quality & Integrity priority to validate numerical values.');
    }
    if (!selected.has('agent-unit')) {
      selected.set('agent-unit', 'Added by Data Quality & Integrity priority to validate measurement units.');
    }
    if (!selected.has('agent-temporal')) {
      selected.set('agent-temporal', 'Added by Data Quality & Integrity priority to validate temporal context.');
    }
  }
  if (priority === 'comprehensive') {
    // Add all validation agents
    for (const agent of AGENT_LIBRARY) {
      if (agent.category === 'validation' && !selected.has(agent.id)) {
        selected.set(agent.id, `Added by Comprehensive Audit priority to ensure thorough validation coverage with ${agent.name}.`);
      }
    }
  }
  if (priority === 'speed') {
    // Limit to max 4 agents — keep the ones already selected but cap
    const entries = Array.from(selected.entries());
    if (entries.length > 4) {
      const kept = entries.slice(0, 4);
      selected.clear();
      for (const [id, reason] of kept) {
        selected.set(id, reason);
      }
    }
  }

  // Sort by AGENT_ORDER
  const result: AgentReason[] = Array.from(selected.entries())
    .sort(([a], [b]) => (AGENT_ORDER[a] ?? 99) - (AGENT_ORDER[b] ?? 99))
    .map(([agentId, reason]) => ({ agentId, reason }));

  return result;
}

function generateWorkflowName(description: string): string {
  const desc = description.toLowerCase();
  const parts: string[] = [];

  // Clinical domain detection
  if (/migraine/.test(desc)) parts.push('Migraine');
  else if (/alzheimer/.test(desc)) parts.push("Alzheimer's");
  else if (/parkinson/.test(desc)) parts.push("Parkinson's");
  else if (/\bms\b|multiple sclerosis/.test(desc)) parts.push('MS');
  else if (/epilepsy/.test(desc)) parts.push('Epilepsy');
  else if (/stroke/.test(desc)) parts.push('Stroke');
  else parts.push('Clinical');

  // Purpose detection
  if (/eligib|criteria|inclusion|exclusion/.test(desc)) parts.push('Eligibility');
  else if (/evidence|audit/.test(desc)) parts.push('Evidence Audit');
  else if (/integrity|data quality/.test(desc)) parts.push('Data Integrity');
  else if (/screen/.test(desc)) parts.push('Screening');
  else parts.push('Validation');

  parts.push('Pipeline');
  return parts.join(' ');
}

function generateTags(description: string, priority: string): string[] {
  const desc = description.toLowerCase();
  const tags: string[] = [];

  if (/migraine/.test(desc)) tags.push('migraine');
  if (/alzheimer/.test(desc)) tags.push('alzheimers');
  if (/parkinson/.test(desc)) tags.push('parkinsons');
  if (/\bms\b|multiple sclerosis/.test(desc)) tags.push('ms');
  if (/eligib/.test(desc)) tags.push('eligibility');
  if (/audit/.test(desc)) tags.push('audit');
  if (/ehr/.test(desc)) tags.push('ehr');
  if (/fda/.test(desc)) tags.push('regulatory');
  if (/biomarker/.test(desc)) tags.push('biomarker');
  if (/longitudinal/.test(desc)) tags.push('longitudinal');
  if (/trial/.test(desc)) tags.push('clinical-trial');

  const priorityTag = PRIORITY_OPTIONS.find((p) => p.value === priority);
  if (priorityTag) tags.push(priority);

  // Always add 'auto-generated'
  tags.push('auto-generated');

  return [...new Set(tags)];
}

/* ─── Component ─── */

export function WorkflowGeneratorPage() {
  const navigate = useNavigate();
  const { currentUser, projects, addWorkflow } = useAppContext();

  // ── Stage state ──
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(1);

  // ── Stage 1: Inputs ──
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('accuracy');
  const [complexity, setComplexity] = useState('multi-mixed');
  const [clinicalDomain, setClinicalDomain] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // ── Stage 2: Analysis progress ──
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // ── Stage 3: Generated workflow ──
  const [generatedAgents, setGeneratedAgents] = useState<AgentReason[]>([]);
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [workflowTags, setWorkflowTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showAddAgent, setShowAddAgent] = useState(false);

  // ── Stage 4: Saved workflow info ──
  const [savedWorkflow, setSavedWorkflow] = useState<Workflow | null>(null);

  // ── Derived ──
  const agentsInPipeline = useMemo(
    () => generatedAgents.map((ar) => ar.agentId),
    [generatedAgents],
  );

  const availableAgentsToAdd = useMemo(
    () => AGENT_LIBRARY.filter((a) => !agentsInPipeline.includes(a.id)),
    [agentsInPipeline],
  );

  const estimatedTime = useMemo(() => {
    const minutes = Math.ceil(generatedAgents.length * 1.8 + 2);
    return `~${minutes}m per 100 patients`;
  }, [generatedAgents.length]);

  const estimatedCost = useMemo(() => {
    const cost = generatedAgents.length * 0.35 + 0.85;
    return `$${cost.toFixed(2)}`;
  }, [generatedAgents.length]);

  const [initialAgentCount, setInitialAgentCount] = useState(0);

  const confidenceLabel = useMemo(() => {
    const diff = initialAgentCount - generatedAgents.length;
    if (diff <= 0) return { label: 'High', detail: `${generatedAgents.length} of ${initialAgentCount || generatedAgents.length} recommended agents included` };
    return { label: 'Medium', detail: `you removed ${diff} recommended agent${diff > 1 ? 's' : ''}` };
  }, [initialAgentCount, generatedAgents.length]);

  // ── Stage 2 animation ──
  useEffect(() => {
    if (stage !== 2) return;

    setAnalysisStep(0);
    setAnalysisProgress(0);

    const stepInterval = 500; // 0.5s per step
    const totalDuration = ANALYSIS_STEPS.length * stepInterval;
    let elapsed = 0;

    const timer = setInterval(() => {
      elapsed += 100;
      const currentStep = Math.min(
        Math.floor(elapsed / stepInterval),
        ANALYSIS_STEPS.length,
      );
      setAnalysisStep(currentStep);
      setAnalysisProgress(Math.min((elapsed / totalDuration) * 100, 100));

      if (elapsed >= totalDuration) {
        clearInterval(timer);
        // Generate the workflow
        const agents = generateWorkflowAgents(description, priority);
        const name = generateWorkflowName(description);
        const tags = generateTags(description, priority);

        setGeneratedAgents(agents);
        setInitialAgentCount(agents.length);
        setWorkflowName(name);
        setWorkflowDescription(description);
        setWorkflowTags(tags);

        setTimeout(() => setStage(3), 400);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [stage, description, priority]);

  // ── Pipeline manipulation ──
  const moveAgent = useCallback((index: number, direction: 'up' | 'down') => {
    setGeneratedAgents((prev) => {
      const swap = direction === 'up' ? index - 1 : index + 1;
      if (swap < 0 || swap >= prev.length) return prev;
      const updated = [...prev];
      [updated[index], updated[swap]] = [updated[swap], updated[index]];
      return updated;
    });
  }, []);

  const removeAgent = useCallback((index: number) => {
    setGeneratedAgents((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addAgent = useCallback((agentId: string) => {
    const agent = getAgent(agentId);
    if (!agent) return;
    setGeneratedAgents((prev) => [
      ...prev,
      {
        agentId,
        reason: `Manually added by user. ${agent.description}`,
      },
    ]);
    setShowAddAgent(false);
  }, []);

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !workflowTags.includes(trimmed)) {
      setWorkflowTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  }, [tagInput, workflowTags]);

  const removeTag = useCallback((tag: string) => {
    setWorkflowTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  // ── Example prompt click ──
  function applyExample(example: ExamplePrompt) {
    setDescription(example.description);
    setPriority(example.priority);
    setComplexity(example.complexity);
  }

  // ── Generate handler ──
  function handleGenerate() {
    if (!description.trim()) return;
    setStage(2);
  }

  // ── Save workflow ──
  async function handleSave() {
    const now = new Date().toISOString();
    const stages: WorkflowStage[] = generatedAgents.map((ar, idx) => {
      const agent = getAgent(ar.agentId);
      return {
        id: `stg-${randomId()}`,
        agentId: ar.agentId,
        label: agent?.name ?? ar.agentId,
        config: { threshold: 0.8, maxRetries: 3, verbose: false },
        order: idx,
      };
    });

    const workflow: Workflow = {
      id: `wf-${randomId()}`,
      name: workflowName.trim() || 'Untitled Workflow',
      description: workflowDescription.trim(),
      status: 'Draft',
      version: 1,
      stages,
      createdBy: currentUser,
      createdAt: now,
      updatedAt: now,
      tags: workflowTags,
      runCount: 0,
      attachedProjectIds: selectedProjectId ? [selectedProjectId] : [],
    };

    await addWorkflow(workflow);
    setSavedWorkflow(workflow);
    setStage(4);
  }

  // ── Start over ──
  function handleStartOver() {
    setStage(1);
    setDescription('');
    setPriority('accuracy');
    setComplexity('multi-mixed');
    setClinicalDomain('');
    setSelectedProjectId('');
    setGeneratedAgents([]);
    setWorkflowName('');
    setWorkflowDescription('');
    setWorkflowTags([]);
    setTagInput('');
    setShowAddAgent(false);
    setSavedWorkflow(null);
    setInitialAgentCount(0);
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* ══════════════ STAGE 1: DESCRIBE ══════════════ */}
      {stage === 1 && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Auto-Generate Workflow</h1>
              <p className="text-sm text-muted-foreground">
                Describe your validation challenge — we'll build the right agent pipeline for you.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* Main form card */}
            <div className="rounded-xl border bg-card p-6 space-y-6">
              {/* Problem description */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">
                  Problem Description <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="e.g., I need to validate patient eligibility for a migraine prophylaxis clinical trial. The data comes from multiple EHR providers with inconsistent documentation styles. Key concerns are accurate medication extraction, proper handling of negated diagnoses, and ensuring all required criteria fields are populated."
                />
              </div>

              {/* Priority focus */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Priority Focus</label>
                <Select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Data complexity */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Data Complexity</label>
                <Select
                  value={complexity}
                  onChange={(e) => setComplexity(e.target.value)}
                >
                  {COMPLEXITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Clinical domain */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">
                  Clinical Domain{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Input
                  value={clinicalDomain}
                  onChange={(e) => setClinicalDomain(e.target.value)}
                  placeholder="e.g., Migraine, Alzheimer's, Parkinson's, MS"
                />
              </div>

              {/* Project selection */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">
                  Select a Project{' '}
                  <span className="text-muted-foreground font-normal">(optional — helps system understand the data)</span>
                </label>
                <Select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  <option value="">No project selected</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>

              <Separator />

              {/* CTA */}
              <div className="flex justify-end">
                <Button
                  onClick={handleGenerate}
                  disabled={!description.trim()}
                  className="gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Generate Workflow
                </Button>
              </div>
            </div>

            {/* Sidebar: Example Prompts */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Lightbulb className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Example Prompts
                </span>
              </div>

              {EXAMPLE_PROMPTS.map((example, idx) => (
                <div
                  key={idx}
                  onClick={() => applyExample(example)}
                  className="rounded-xl border bg-card p-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/40 hover:bg-primary/5 group"
                >
                  <div className="flex items-start gap-2.5">
                    <MessageSquareText className="h-4 w-4 mt-0.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    <p className="text-[12px] leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors">
                      {example.description}
                    </p>
                  </div>
                </div>
              ))}

              <p className="text-[10px] text-muted-foreground/60 px-1 leading-relaxed">
                Click any example to auto-fill the description and configure priority and complexity settings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ STAGE 2: ANALYZING ══════════════ */}
      {stage === 2 && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="rounded-xl border bg-card p-8 w-full max-w-lg space-y-6 text-center">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold">Generating Your Workflow</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Analyzing your requirements and building the optimal agent pipeline...
              </p>
            </div>

            <div className="space-y-3 text-left">
              {ANALYSIS_STEPS.map((step, idx) => {
                const isDone = analysisStep > idx;
                const isCurrent = analysisStep === idx;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 transition-all duration-300 ${
                      isDone
                        ? 'opacity-100'
                        : isCurrent
                          ? 'opacity-100'
                          : 'opacity-30'
                    }`}
                  >
                    {isDone ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 shrink-0">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    ) : isCurrent ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary shrink-0">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      </div>
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0">
                        <span className="text-[10px] font-bold">{idx + 1}</span>
                      </div>
                    )}
                    <span
                      className={`text-sm ${
                        isDone
                          ? 'text-foreground font-medium'
                          : isCurrent
                            ? 'text-primary font-medium'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>

            <Progress value={analysisProgress} />
          </div>
        </div>
      )}

      {/* ══════════════ STAGE 3: REVIEW GENERATED WORKFLOW ══════════════ */}
      {stage === 3 && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <WorkflowIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Review Generated Workflow</h1>
              <p className="text-sm text-muted-foreground">
                We built this pipeline based on your description. Customize it before saving.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* Left column */}
            <div className="space-y-6">
              {/* Summary card */}
              <div className="rounded-xl border bg-card p-6 space-y-5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Workflow Summary
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Name</label>
                  <Input
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    placeholder="Workflow name"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Description</label>
                  <Textarea
                    value={workflowDescription}
                    onChange={(e) => setWorkflowDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Tags</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {workflowTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px] px-2 py-0.5 rounded-full gap-1 cursor-pointer hover:bg-destructive/15 hover:text-destructive transition-colors"
                        onClick={() => removeTag(tag)}
                      >
                        {tag}
                        <X className="h-2.5 w-2.5" />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add a tag..."
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button variant="outline" size="sm" onClick={addTag} disabled={!tagInput.trim()}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Stats row */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Zap className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-semibold text-foreground">{generatedAgents.length}</span>
                    <span>agents</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Clock className="h-3.5 w-3.5" />
                    </div>
                    <span>{estimatedTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <DollarSign className="h-3.5 w-3.5" />
                    </div>
                    <span>{estimatedCost} per run</span>
                  </div>
                </div>
              </div>

              {/* Pipeline Visualization */}
              <div className="rounded-xl border bg-card p-6 space-y-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Agent Pipeline
                </div>

                {generatedAgents.length === 0 && (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No agents in the pipeline. Add agents below.
                  </div>
                )}

                <div className="space-y-0">
                  {generatedAgents.map((ar, idx) => {
                    const agent = getAgent(ar.agentId);
                    if (!agent) return null;
                    const isFirst = idx === 0;
                    const isLast = idx === generatedAgents.length - 1;

                    return (
                      <div key={ar.agentId} className="flex gap-4">
                        {/* Order indicator with vertical line */}
                        <div className="flex flex-col items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                            {idx + 1}
                          </div>
                          {!isLast && (
                            <div className="w-px flex-1 bg-border min-h-[16px]" />
                          )}
                        </div>

                        {/* Agent card */}
                        <div className="flex-1 rounded-xl border bg-card p-4 mb-3 group hover:border-primary/30 transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-2 py-0 rounded-full font-mono"
                                >
                                  {agent.shortName}
                                </Badge>
                                <span className="text-sm font-bold truncate">
                                  {agent.name}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                                {agent.description}
                              </p>
                              <p className="text-[11px] text-primary/70 italic mt-1.5 leading-relaxed">
                                {ar.reason}
                              </p>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={() => moveAgent(idx, 'up')}
                                disabled={isFirst}
                                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => moveAgent(idx, 'down')}
                                disabled={isLast}
                                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => removeAgent(idx)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-destructive/10 hover:text-destructive cursor-pointer transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Agent */}
                <div className="relative">
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setShowAddAgent(!showAddAgent)}
                    disabled={availableAgentsToAdd.length === 0}
                  >
                    <Plus className="h-4 w-4" />
                    Add Agent
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${showAddAgent ? 'rotate-180' : ''}`}
                    />
                  </Button>

                  {showAddAgent && availableAgentsToAdd.length > 0 && (
                    <div className="absolute z-10 mt-2 w-full rounded-xl border bg-card shadow-lg max-h-64 overflow-y-auto">
                      {availableAgentsToAdd.map((agent) => (
                        <div
                          key={agent.id}
                          onClick={() => addAgent(agent.id)}
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                        >
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-2 py-0 rounded-full font-mono shrink-0"
                          >
                            {agent.shortName}
                          </Badge>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold truncate">{agent.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {agent.description}
                            </div>
                          </div>
                          <Plus className="h-4 w-4 text-muted-foreground shrink-0 ml-auto" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Estimation card */}
              <div className="rounded-xl border bg-card p-6 space-y-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Estimation
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-muted/30 p-4 space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Processing Time</span>
                    </div>
                    <p className="text-sm font-bold">{estimatedTime}</p>
                  </div>

                  <div className="rounded-lg bg-muted/30 p-4 space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Cost</span>
                    </div>
                    <p className="text-sm font-bold">{estimatedCost} per run</p>
                  </div>

                  <div className="rounded-lg bg-muted/30 p-4 space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Confidence</span>
                    </div>
                    <p className="text-sm font-bold">{confidenceLabel.label}</p>
                    <p className="text-[11px] text-muted-foreground">{confidenceLabel.detail}</p>
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={handleStartOver} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Start Over
                </Button>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      void handleSave();
                      navigate('/workflows');
                    }}
                    className="gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Test Run First
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={generatedAgents.length === 0}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save as Workflow
                  </Button>
                </div>
              </div>
            </div>

            {/* Right sidebar: Generation Reasoning */}
            <div className="space-y-6">
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Generation Reasoning
                </div>

                <div className="space-y-4">
                  {generatedAgents.map((ar) => {
                    const agent = getAgent(ar.agentId);
                    if (!agent) return null;
                    return (
                      <div key={ar.agentId} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-2 py-0 rounded-full font-mono"
                          >
                            {agent.shortName}
                          </Badge>
                          <span className="text-sm font-bold">{agent.name}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                          {ar.reason}
                        </p>
                        <Separator className="mt-3" />
                      </div>
                    );
                  })}

                  {generatedAgents.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No agents selected.
                    </p>
                  )}
                </div>
              </div>

              {/* Priority & complexity info */}
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Input Configuration
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Priority</span>
                    <Badge variant="secondary" className="text-[10px] px-2 py-0 rounded-full">
                      {PRIORITY_OPTIONS.find((p) => p.value === priority)?.label ?? priority}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Complexity</span>
                    <Badge variant="secondary" className="text-[10px] px-2 py-0 rounded-full">
                      {COMPLEXITY_OPTIONS.find((c) => c.value === complexity)?.label ?? complexity}
                    </Badge>
                  </div>
                  {clinicalDomain && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Domain</span>
                      <Badge variant="secondary" className="text-[10px] px-2 py-0 rounded-full">
                        {clinicalDomain}
                      </Badge>
                    </div>
                  )}
                  {selectedProjectId && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Project</span>
                      <Badge variant="secondary" className="text-[10px] px-2 py-0 rounded-full truncate max-w-[160px]">
                        {projects.find((p) => p.id === selectedProjectId)?.name ?? selectedProjectId}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ STAGE 4: SAVED ══════════════ */}
      {stage === 4 && savedWorkflow && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="rounded-xl border bg-card p-8 w-full max-w-lg space-y-6 text-center">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600">
                <CheckCircle2 className="h-7 w-7" />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold">Workflow Generated & Saved</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your workflow has been saved as a draft and is ready to use.
              </p>
            </div>

            <div className="rounded-xl bg-muted/30 p-5 space-y-3 text-left">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="text-sm font-bold">{savedWorkflow.name}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Stages</span>
                <span className="text-sm font-bold">{savedWorkflow.stages.length} agents</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Agents</span>
                <div className="flex flex-wrap gap-1 justify-end max-w-[240px]">
                  {savedWorkflow.stages.map((s) => {
                    const agent = getAgent(s.agentId);
                    return (
                      <Badge
                        key={s.id}
                        variant="secondary"
                        className="text-[10px] px-2 py-0 rounded-full font-mono"
                      >
                        {agent?.shortName ?? s.agentId}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="warning" className="text-[10px] px-2 py-0.5 rounded-full">
                  Draft
                </Badge>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate('/workflows')} className="w-full gap-2">
                <WorkflowIcon className="h-4 w-4" />
                View Workflow
              </Button>
              <Button
                variant="outline"
                onClick={handleStartOver}
                className="w-full gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Generate Another
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/agent-runner')}
                className="w-full gap-2"
              >
                <Play className="h-4 w-4" />
                Run Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
