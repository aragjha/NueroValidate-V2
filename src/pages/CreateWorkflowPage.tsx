import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { AGENT_LIBRARY, WORKFLOW_TEMPLATES, getAgent } from '@/data/agents';
import type {
  AgentDef,
  Workflow,
  WorkflowRun,
  WorkflowStage,
  WorkflowStageResult,
  WorkflowRunMetrics,
  WorkflowTemplate,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Cpu,
  FlaskConical,
  GripVertical,
  Layers,
  Loader2,
  Play,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  Workflow as WorkflowIcon,
  X,
  Zap,
} from 'lucide-react';

function randomId() {
  return Math.random().toString(36).slice(2, 8);
}

const STEP_LABELS = ['Setup', 'Template', 'Agents', 'Builder', 'Validate', 'Test Run', 'Results'] as const;

export function CreateWorkflowPage() {
  const navigate = useNavigate();
  const { currentUser, projects, addWorkflow, addWorkflowRun } = useAppContext();

  const [currentStep, setCurrentStep] = useState(0);

  // ── Stage 1: Setup ──
  const [workflowName, setWorkflowName] = useState('');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const tags = useMemo(
    () => tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
    [tagsInput],
  );

  // ── Stage 2: Template ──
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // ── Stage 3: Agent Selection ──
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());

  // ── Stage 4: Pipeline Builder ──
  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);

  // ── Stage 6: Test Run ──
  const [testProjectId, setTestProjectId] = useState('');
  const [sampleSize, setSampleSize] = useState(25);
  const [testRunning, setTestRunning] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [stageResults, setStageResults] = useState<WorkflowStageResult[]>([]);
  const [currentRunningIdx, setCurrentRunningIdx] = useState(-1);

  // ── Stage 7: Results ──
  const [publishStatus, setPublishStatus] = useState<'Draft' | 'Published'>('Draft');
  const [mockMetrics] = useState<WorkflowRunMetrics>({
    precision: 0.924,
    recall: 0.891,
    f1: 0.907,
    evidenceGrounding: 0.956,
    totalFindings: 347,
    totalIssues: 23,
    avgConfidence: 0.912,
    processingTime: '4m 32s',
    estimatedCost: '$2.48',
  });

  // ── Sync agents → stages when entering Stage 4 ──
  useEffect(() => {
    if (currentStep === 3) {
      const existingAgentIds = new Set(stages.map((s) => s.agentId));
      const newAgentIds = [...selectedAgentIds].filter((id) => !existingAgentIds.has(id));
      const removedAgentIds = stages.filter((s) => !selectedAgentIds.has(s.agentId)).map((s) => s.agentId);

      if (newAgentIds.length > 0 || removedAgentIds.length > 0) {
        let updated = stages.filter((s) => selectedAgentIds.has(s.agentId));
        newAgentIds.forEach((agentId) => {
          const agent = getAgent(agentId);
          if (agent) {
            updated.push({
              id: `stg-${randomId()}`,
              agentId,
              label: agent.name,
              config: { threshold: 0.8, maxRetries: 3, verbose: false },
              order: updated.length,
            });
          }
        });
        updated = updated.map((s, i) => ({ ...s, order: i }));
        setStages(updated);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, selectedAgentIds]);

  // ── Template selection handler ──
  function handleSelectTemplate(template: WorkflowTemplate) {
    setSelectedTemplateId(template.id);
    if (template.agentIds.length > 0) {
      setSelectedAgentIds(new Set(template.agentIds));
    } else {
      setSelectedAgentIds(new Set());
    }
  }

  // ── Agent toggle ──
  function toggleAgent(agentId: string) {
    setSelectedAgentIds((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  }

  // ── Pipeline reorder ──
  function moveStage(index: number, direction: 'up' | 'down') {
    const swap = direction === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= stages.length) return;
    const updated = [...stages];
    [updated[index], updated[swap]] = [updated[swap], updated[index]];
    setStages(updated.map((s, i) => ({ ...s, order: i })));
  }

  function removeStage(index: number) {
    const removed = stages[index];
    const updated = stages.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i }));
    setStages(updated);
    setSelectedAgentIds((prev) => {
      const next = new Set(prev);
      next.delete(removed.agentId);
      return next;
    });
  }

  function updateStageConfig(stageId: string, key: string, value: string | number | boolean) {
    setStages((prev) =>
      prev.map((s) => (s.id === stageId ? { ...s, config: { ...s.config, [key]: value } } : s)),
    );
  }

  // ── Test Run Simulation ──
  const startTestRun = useCallback(() => {
    const initialResults: WorkflowStageResult[] = stages.map((s) => {
      const agent = getAgent(s.agentId);
      return {
        stageId: s.id,
        agentName: agent?.name ?? s.label,
        status: 'Pending' as const,
        findings: 0,
        issues: 0,
        confidence: 0,
      };
    });
    setStageResults(initialResults);
    setTestRunning(true);
    setTestCompleted(false);
    setCurrentRunningIdx(0);
  }, [stages]);

  useEffect(() => {
    if (!testRunning || currentRunningIdx < 0) return;

    if (currentRunningIdx >= stages.length) {
      setTestRunning(false);
      setTestCompleted(true);
      setTimeout(() => setCurrentStep(6), 800);
      return;
    }

    // Set current stage to Running
    setStageResults((prev) =>
      prev.map((r, i) => (i === currentRunningIdx ? { ...r, status: 'Running' as const, startedAt: new Date().toISOString() } : r)),
    );

    const timer = setTimeout(() => {
      // Complete current stage
      setStageResults((prev) =>
        prev.map((r, i) =>
          i === currentRunningIdx
            ? {
                ...r,
                status: 'Completed' as const,
                completedAt: new Date().toISOString(),
                findings: Math.floor(Math.random() * 80) + 20,
                issues: Math.floor(Math.random() * 10),
                confidence: Math.round((Math.random() * 15 + 85)) / 100,
              }
            : r,
        ),
      );
      setCurrentRunningIdx((prev) => prev + 1);
    }, 1500);

    return () => clearTimeout(timer);
  }, [testRunning, currentRunningIdx, stages.length]);

  // ── Validation checks ──
  const validationChecks = useMemo(() => {
    const hasAgents = selectedAgentIds.size > 0;
    const allConfigured = stages.every((s) => Object.keys(s.config).length > 0);
    const validOrder = stages.length === selectedAgentIds.size;
    const hasConflicts = false; // No actual conflict logic, always passes
    const hasEvidenceAgent = selectedAgentIds.has('agent-evidence');

    return {
      hasAgents,
      allConfigured,
      validOrder,
      noConflicts: !hasConflicts,
      hasEvidenceAgent,
      allPassed: hasAgents && allConfigured && validOrder && !hasConflicts,
    };
  }, [selectedAgentIds, stages]);

  const estimatedCostPerRun = useMemo(() => {
    const baseCost = 0.15;
    return `$${(stages.length * baseCost + 0.50).toFixed(2)}`;
  }, [stages.length]);

  const estimatedTime = useMemo(() => {
    const minutes = Math.ceil(stages.length * 0.8 + 1);
    return `~${minutes}m per 100 patients`;
  }, [stages.length]);

  // ── Navigation ──
  function canProceed(): boolean {
    switch (currentStep) {
      case 0:
        return workflowName.trim().length > 0;
      case 1:
        return selectedTemplateId !== null;
      case 2:
        return selectedAgentIds.size > 0;
      case 3:
        return stages.length > 0;
      case 4:
        return validationChecks.allPassed;
      case 5:
        return testCompleted;
      default:
        return true;
    }
  }

  function handleNext() {
    if (currentStep < 6) setCurrentStep(currentStep + 1);
  }

  function handleBack() {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  }

  // ── Save Workflow ──
  async function handleSaveWorkflow(status: 'Draft' | 'Published') {
    const now = new Date().toISOString();
    const workflow: Workflow = {
      id: `wf-${randomId()}`,
      name: workflowName.trim(),
      description: workflowDescription.trim(),
      status,
      version: 1,
      stages,
      createdBy: currentUser,
      createdAt: now,
      updatedAt: now,
      tags,
      runCount: testCompleted ? 1 : 0,
      lastRunAt: testCompleted ? now : undefined,
      lastRunStatus: testCompleted ? 'Success' : undefined,
      attachedProjectIds: testProjectId ? [testProjectId] : [],
      templateId: selectedTemplateId ?? undefined,
    };

    await addWorkflow(workflow);

    if (testCompleted) {
      const run: WorkflowRun = {
        id: `run-${randomId()}`,
        workflowId: workflow.id,
        workflowVersion: 1,
        status: 'Completed',
        startedAt: now,
        completedAt: now,
        triggeredBy: currentUser,
        projectId: testProjectId || undefined,
        stageResults,
        metrics: mockMetrics,
      };
      await addWorkflowRun(run);
    }

    navigate('/workflows');
  }

  // ── Agent grouping helpers ──
  const validationAgents = AGENT_LIBRARY.filter((a) => a.category === 'validation');
  const operationalAgents = AGENT_LIBRARY.filter((a) => a.category === 'operational');

  // ── Overall progress ──
  const completedStages = stageResults.filter((r) => r.status === 'Completed').length;
  const overallProgress = stages.length > 0 ? Math.round((completedStages / stages.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* ══════════════ STEP PROGRESS INDICATOR ══════════════ */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-center gap-0">
          {STEP_LABELS.map((label, idx) => {
            const isCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;
            return (
              <div key={label} className="flex items-center">
                {idx > 0 && (
                  <div className={`h-px w-8 sm:w-12 ${isCompleted ? 'bg-primary' : 'bg-border'}`} />
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
                    {isCompleted ? <Check className="h-4 w-4" /> : idx + 1}
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

      {/* ══════════════ STAGE 1: SETUP ══════════════ */}
      {currentStep === 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Create Workflow</h1>
              <p className="text-sm text-muted-foreground">Configure a new validation pipeline for your neurology data.</p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 space-y-6">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">
                Workflow name <span className="text-destructive">*</span>
              </label>
              <Input
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="e.g. Migraine Eligibility Validation Pipeline"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Description</label>
              <Textarea
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                placeholder="Describe the purpose and scope of this workflow..."
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Tags</label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. migraine, phase-3, eligibility (comma-separated)"
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0 rounded-full">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ STAGE 2: CHOOSE TEMPLATE ══════════════ */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Choose Template</h1>
              <p className="text-sm text-muted-foreground">Select a pre-configured template or start from scratch.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WORKFLOW_TEMPLATES.map((template) => {
              const isSelected = selectedTemplateId === template.id;
              const isBlank = template.agentIds.length === 0;
              return (
                <div
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className={`rounded-xl border bg-card p-5 transition-all cursor-pointer hover:shadow-lg ${
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : 'hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isBlank ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                      {isBlank ? <Plus className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                    </div>
                    {isSelected && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-bold mb-1">{template.name}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">{template.description}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {template.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0 rounded-full">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    {template.agentIds.length > 0 && (
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {template.agentIds.length} agents
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════ STAGE 3: SELECT AGENTS ══════════════ */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Select Agents</h1>
                <p className="text-sm text-muted-foreground">Choose the validation and operational agents for your pipeline.</p>
              </div>
            </div>
            <Badge variant="processing" className="text-xs px-3 py-1 rounded-full">
              {selectedAgentIds.size} selected
            </Badge>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Available Agents */}
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Available Agents</p>

              {/* Validation Agents */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Validation Agents
                </p>
                <div className="space-y-2">
                  {validationAgents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      isSelected={selectedAgentIds.has(agent.id)}
                      onToggle={() => toggleAgent(agent.id)}
                    />
                  ))}
                </div>
              </div>

              <Separator />

              {/* Operational Agents */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5" /> Operational Agents
                </p>
                <div className="space-y-2">
                  {operationalAgents.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      isSelected={selectedAgentIds.has(agent.id)}
                      onToggle={() => toggleAgent(agent.id)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Selected Agents */}
            <div className="space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Selected Agents ({selectedAgentIds.size})</p>
              {selectedAgentIds.size === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
                  <Bot className="h-10 w-10 text-muted-foreground/30" />
                  <p className="mt-3 text-sm text-muted-foreground">No agents selected yet</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Click agents on the left to add them to your pipeline</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...selectedAgentIds].map((agentId) => {
                    const agent = getAgent(agentId);
                    if (!agent) return null;
                    return (
                      <div
                        key={agentId}
                        className="flex items-center gap-3 rounded-xl border border-primary bg-primary/5 p-3 transition-colors"
                      >
                        <Badge variant="default" className="text-[10px] px-2 py-0 rounded-full shrink-0">
                          {agent.shortName}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{agent.name}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{agent.description}</p>
                        </div>
                        <button
                          onClick={() => toggleAgent(agentId)}
                          className="text-muted-foreground hover:text-destructive cursor-pointer shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ STAGE 4: PIPELINE BUILDER ══════════════ */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <WorkflowIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Pipeline Builder</h1>
              <p className="text-sm text-muted-foreground">Order your agents and configure each stage of the validation pipeline.</p>
            </div>
          </div>

          {stages.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center">
              <WorkflowIcon className="h-12 w-12 text-muted-foreground/30" />
              <p className="mt-4 text-sm text-muted-foreground">No stages in the pipeline</p>
              <p className="text-[11px] text-muted-foreground mt-1">Go back and select agents first</p>
            </div>
          ) : (
            <div className="space-y-0">
              {stages.map((stage, idx) => {
                const agent = getAgent(stage.agentId);
                const isExpanded = expandedStageId === stage.id;
                const isLast = idx === stages.length - 1;
                return (
                  <div key={stage.id}>
                    <div className="flex gap-4">
                      {/* Pipeline connector line */}
                      <div className="flex flex-col items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-sm font-bold shrink-0">
                          {idx + 1}
                        </div>
                        {!isLast && (
                          <div className="w-px flex-1 bg-border min-h-[20px]" />
                        )}
                      </div>

                      {/* Stage card */}
                      <div className={`flex-1 rounded-xl border bg-card mb-3 transition-shadow hover:shadow-md ${isExpanded ? 'ring-1 ring-primary/20' : ''}`}>
                        <div className="flex items-center gap-3 p-4">
                          <div className="flex items-center gap-1 text-muted-foreground/40 cursor-grab shrink-0">
                            <GripVertical className="h-4 w-4" />
                          </div>
                          <Badge variant="processing" className="text-[10px] px-2 py-0 rounded-full shrink-0">
                            {agent?.shortName ?? '???'}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{agent?.name ?? stage.label}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{agent?.description}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={idx === 0}
                              onClick={() => moveStage(idx, 'up')}
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={isLast}
                              onClick={() => moveStage(idx, 'down')}
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setExpandedStageId(isExpanded ? null : stage.id)}
                            >
                              <Settings2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => removeStage(idx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <>
                            <Separator />
                            <div className="p-4 space-y-3">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Stage Configuration</p>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold">Threshold</label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="1"
                                    value={stage.config.threshold as number ?? 0.8}
                                    onChange={(e) => updateStageConfig(stage.id, 'threshold', parseFloat(e.target.value) || 0)}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold">Max Retries</label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={stage.config.maxRetries as number ?? 3}
                                    onChange={(e) => updateStageConfig(stage.id, 'maxRetries', parseInt(e.target.value) || 0)}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs font-semibold">Verbose Logging</label>
                                  <Select
                                    value={stage.config.verbose ? 'true' : 'false'}
                                    onChange={(e) => updateStageConfig(stage.id, 'verbose', e.target.value === 'true')}
                                  >
                                    <option value="false">Off</option>
                                    <option value="true">On</option>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════ STAGE 5: VALIDATION / PRE-RUN CHECK ══════════════ */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Pre-Run Validation</h1>
              <p className="text-sm text-muted-foreground">Review your workflow configuration before running the pipeline.</p>
            </div>
          </div>

          {/* Summary Card */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Workflow Summary</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Name</p>
                <p className="text-sm font-bold">{workflowName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Stages</p>
                <p className="text-sm font-bold">{stages.length} agents in pipeline</p>
              </div>
              {workflowDescription && (
                <div className="space-y-1 col-span-2">
                  <p className="text-[11px] text-muted-foreground">Description</p>
                  <p className="text-sm">{workflowDescription}</p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {stages.map((s) => {
                const agent = getAgent(s.agentId);
                return (
                  <Badge key={s.id} variant="secondary" className="text-[10px] px-2 py-0 rounded-full">
                    {agent?.shortName ?? '???'} {agent?.name}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Validation Checks */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Validation Checks</p>
            <div className="space-y-3">
              <ValidationCheck label="At least one agent selected" passed={validationChecks.hasAgents} />
              <ValidationCheck label="All stages configured" passed={validationChecks.allConfigured} />
              <ValidationCheck label="Pipeline order is valid" passed={validationChecks.validOrder} />
              <ValidationCheck label="No conflicting agents" passed={validationChecks.noConflicts} />
            </div>

            {!validationChecks.hasEvidenceAgent && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>No Evidence Grounding Agent selected. Consider adding one for better citation traceability.</span>
              </div>
            )}
          </div>

          {/* Estimates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Estimated Cost</p>
                  <p className="text-lg font-bold">{estimatedCostPerRun} <span className="text-sm font-normal text-muted-foreground">per run</span></p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <CircleDot className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Estimated Time</p>
                  <p className="text-lg font-bold">{estimatedTime}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ STAGE 6: TEST RUN ══════════════ */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Test Run</h1>
              <p className="text-sm text-muted-foreground">Run the pipeline against a sample dataset to validate output quality.</p>
            </div>
          </div>

          {!testRunning && !testCompleted && (
            <div className="rounded-xl border bg-card p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Project</label>
                  <Select
                    value={testProjectId}
                    onChange={(e) => setTestProjectId(e.target.value)}
                  >
                    <option value="">Select a project (optional)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Sample Size</label>
                  <Select
                    value={sampleSize.toString()}
                    onChange={(e) => setSampleSize(parseInt(e.target.value))}
                  >
                    <option value="10">10 patients</option>
                    <option value="25">25 patients</option>
                    <option value="50">50 patients</option>
                    <option value="100">100 patients</option>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-4 text-sm">
                <FlaskConical className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-semibold">Ready to test</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    This will run {stages.length} agents against {sampleSize} patient records.
                    Estimated cost: {estimatedCostPerRun}. Estimated time: {estimatedTime}.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="lg"
                  className="rounded-full px-6 text-sm font-semibold"
                  onClick={startTestRun}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start Test Run
                </Button>
              </div>
            </div>
          )}

          {/* Test run in progress */}
          {(testRunning || testCompleted) && (
            <div className="space-y-4">
              {/* Overall progress */}
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    {testCompleted ? 'Test Run Complete' : 'Running Pipeline...'}
                  </p>
                  <Badge variant={testCompleted ? 'success' : 'processing'} className="text-[10px] px-2 py-0 rounded-full">
                    {testCompleted && <Check className="mr-1 h-3 w-3" />}
                    {testRunning && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                    {overallProgress}%
                  </Badge>
                </div>
                <Progress value={overallProgress} />
              </div>

              {/* Stage-by-stage results */}
              <div className="space-y-2">
                {stageResults.map((result, idx) => (
                  <div
                    key={result.stageId}
                    className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                      result.status === 'Running'
                        ? 'border-primary/30 bg-primary/5'
                        : result.status === 'Completed'
                          ? 'bg-card'
                          : 'bg-card opacity-60'
                    }`}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{result.agentName}</p>
                      {result.status === 'Completed' && (
                        <p className="text-[11px] text-muted-foreground">
                          {result.findings} findings, {result.issues} issues, {(result.confidence * 100).toFixed(0)}% confidence
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={
                        result.status === 'Completed'
                          ? 'success'
                          : result.status === 'Running'
                            ? 'processing'
                            : result.status === 'Failed'
                              ? 'destructive'
                              : 'secondary'
                      }
                      className="text-[10px] px-2 py-0 rounded-full shrink-0"
                    >
                      {result.status === 'Running' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      {result.status === 'Completed' && <Check className="mr-1 h-3 w-3" />}
                      {result.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ STAGE 7: RESULTS & PUBLISH ══════════════ */}
      {currentStep === 6 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Results & Publish</h1>
              <p className="text-sm text-muted-foreground">Review test run results and publish your workflow.</p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Precision" value={mockMetrics.precision} />
            <MetricCard label="Recall" value={mockMetrics.recall} />
            <MetricCard label="F1 Score" value={mockMetrics.f1} />
            <MetricCard label="Evidence Grounding" value={mockMetrics.evidenceGrounding} />
          </div>

          {/* Summary Stats */}
          <div className="rounded-xl border bg-card p-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">Summary Statistics</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div>
                <p className="text-[11px] text-muted-foreground">Total Findings</p>
                <p className="text-lg font-bold">{mockMetrics.totalFindings}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Total Issues</p>
                <p className="text-lg font-bold text-destructive">{mockMetrics.totalIssues}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Avg Confidence</p>
                <p className="text-lg font-bold">{(mockMetrics.avgConfidence * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Processing Time</p>
                <p className="text-lg font-bold">{mockMetrics.processingTime}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Estimated Cost</p>
                <p className="text-lg font-bold">{mockMetrics.estimatedCost}</p>
              </div>
            </div>
          </div>

          {/* Stage-Level Results Table */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="p-4 border-b">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Agent-Level Results</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">#</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Agent</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Findings</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Issues</th>
                    <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {stageResults.map((result, idx) => (
                    <tr key={result.stageId} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs font-medium">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-semibold">{result.agentName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={result.status === 'Completed' ? 'success' : result.status === 'Failed' ? 'destructive' : 'secondary'}
                          className="text-[10px] px-2 py-0 rounded-full"
                        >
                          {result.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-right tabular-nums">{result.findings}</td>
                      <td className="px-4 py-3 text-xs font-medium text-right tabular-nums">
                        <span className={result.issues > 0 ? 'text-destructive' : ''}>{result.issues}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-right tabular-nums">
                        {result.confidence > 0 ? `${(result.confidence * 100).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Publish Section */}
          <Separator />

          <div className="rounded-xl border bg-card p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold">Publish Workflow</p>
                <p className="text-[11px] text-muted-foreground">Choose a status and save your workflow to the library.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Status</label>
              <Select
                value={publishStatus}
                onChange={(e) => setPublishStatus(e.target.value as 'Draft' | 'Published')}
              >
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
              </Select>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                className="rounded-full px-6 text-sm font-semibold"
                onClick={() => void handleSaveWorkflow('Draft')}
              >
                <Save className="mr-2 h-4 w-4" />
                Save as Draft
              </Button>
              <Button
                size="lg"
                className="rounded-full px-6 text-sm font-semibold shadow-md"
                onClick={() => void handleSaveWorkflow(publishStatus)}
              >
                <Check className="mr-2 h-4 w-4" />
                Save Workflow
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ NAVIGATION FOOTER ══════════════ */}
      {currentStep < 6 && (
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            className="rounded-full px-6 text-sm font-semibold"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {currentStep !== 5 && (
            <Button
              className="rounded-full px-6 text-sm font-semibold shadow-md"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Subcomponents ─── */

function AgentCard({
  agent,
  isSelected,
  onToggle,
}: {
  agent: AgentDef;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      className={`flex items-center gap-3 rounded-xl border p-3 transition-all cursor-pointer ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'hover:bg-muted/30 hover:shadow-sm'
      }`}
    >
      <Badge
        variant={isSelected ? 'default' : 'secondary'}
        className="text-[10px] px-2 py-0 rounded-full shrink-0"
      >
        {agent.shortName}
      </Badge>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate">{agent.name}</p>
          <Badge
            variant={agent.category === 'validation' ? 'processing' : 'warning'}
            className="text-[9px] px-1.5 py-0 rounded-full shrink-0"
          >
            {agent.category}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground truncate">{agent.description}</p>
      </div>
      {isSelected && (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
          <Check className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}

function ValidationCheck({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full shrink-0 ${
          passed ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/15 text-destructive'
        }`}
      >
        {passed ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      </div>
      <span className={`text-sm ${passed ? 'text-foreground' : 'text-destructive font-semibold'}`}>
        {label}
      </span>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  const pct = (value * 100).toFixed(1);
  const variant: 'success' | 'warning' | 'destructive' =
    value >= 0.9 ? 'success' : value >= 0.75 ? 'warning' : 'destructive';

  return (
    <div className="rounded-xl border bg-card p-5 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold tabular-nums">{pct}%</p>
        <Badge variant={variant} className="text-[10px] px-2 py-0 rounded-full mb-1">
          {variant === 'success' ? 'Good' : variant === 'warning' ? 'Fair' : 'Low'}
        </Badge>
      </div>
      <Progress value={value * 100} className="h-1.5" />
    </div>
  );
}
