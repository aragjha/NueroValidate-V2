import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ArrowRight,
  BookOpen,
  Bot,
  Brain,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Cog,
  Eye,
  FileText,
  FlaskConical,
  GitBranch,
  Layers,
  Lightbulb,
  ListChecks,
  MessageSquareText,
  Pencil,
  Play,
  Puzzle,
  Save,
  Search,
  Settings2,
  Sparkles,
  Split,
  Target,
  TestTube2,
  ThumbsDown,
  ThumbsUp,
  Wand2,
  Workflow,
  Zap,
} from 'lucide-react';

/* ─── Tab definitions ─── */
const TABS = [
  'Getting Started',
  'Agent Builder',
  'Agent Runner',
  'Workflows',
  'Use Cases',
] as const;
type Tab = (typeof TABS)[number];

/* ─── Use case data ─── */
const USE_CASES = [
  {
    title: 'Migraine Prophylaxis Cohort Validation',
    scenario:
      'Pharma client needs to validate CGRP inhibitor eligibility across 12,000 patients from multiple providers.',
    agents: [
      'Correctness',
      'Evidence Grounding',
      'Negation Detection',
      'Eligibility Logic',
      'Completeness',
    ],
    insight:
      'Need to ensure migraine frequency thresholds are correctly extracted, negated mentions don\'t create false positives, and all required fields are present.',
    result: '94% precision, 89% recall, 43 issues flagged out of 925 findings',
  },
  {
    title: "Alzheimer's Biomarker Evidence Audit",
    scenario:
      'Regulatory submission requires deep evidence audit of amyloid PET and CSF biomarker concordance data.',
    agents: [
      'Evidence Grounding',
      'Hallucination Detection',
      'Conflict Detection',
      'Uncertainty Detection',
      'Numerical Validation',
    ],
    insight:
      'Regulatory requires every claim traceable to source with zero fabrication tolerance.',
    result:
      'Identified 2 hallucinated claims, 4 inter-source conflicts, 6 uncertain assertions',
  },
  {
    title: "Parkinson's Treatment Response Monitoring",
    scenario:
      'Track motor symptom progression and treatment response patterns across 7,200 patients.',
    agents: [
      'Temporal Context',
      'Date Validation',
      'Numerical Validation',
      'Terminology Mapping',
    ],
    insight:
      'Longitudinal data needs temporal consistency, correct UPDRS scoring, and standardized terminology.',
    result:
      'Caught 18 date sequence errors, 7 unit mismatches, mapped 145 terms to SNOMED CT',
  },
  {
    title: 'Custom Agent for Rare Disease Protocol',
    scenario:
      'No built-in agent exists for validating gene therapy eligibility criteria for SMA patients.',
    agents: [
      'Custom "SMA Eligibility Agent"',
      'Completeness',
      'Evidence Grounding',
    ],
    insight:
      'Rare disease protocols have unique criteria not covered by standard agents.',
    result:
      'Custom agent achieved 91% accuracy on first run, improved to 96% after prompt refinement',
  },
  {
    title: 'MS Relapse Detection Across Multi-Provider Data',
    scenario:
      'Need consistent relapse detection across 3 different EHR systems with varying documentation styles.',
    agents: [
      'Auto-generated workflow',
      'Format Normalization',
      'Evidence Grounding',
      'Conflict Detection',
    ],
    insight:
      'Documentation style varies wildly \u2014 auto-generator selected agents for format normalization, evidence grounding, and conflict detection.',
    result:
      'Normalized relapse definitions across providers, flagged 24 pseudo-relapse misclassifications',
  },
];

/* ─── Getting Started steps ─── */
const GETTING_STARTED_STEPS = [
  {
    title: 'Choose Your Path',
    description:
      'From Home, pick Projects (traditional validation) or Workflows (agent-powered pipelines).',
    icon: GitBranch,
  },
  {
    title: 'Build or Select Agents',
    description:
      "Use the Agent Library's 15 built-in agents or create custom ones with the Agent Builder.",
    icon: Bot,
  },
  {
    title: 'Run Single or Multi-Agent',
    description:
      'Test individual agents on data or combine them in the Agent Runner for parallel execution.',
    icon: Play,
  },
  {
    title: 'Create Workflows',
    description:
      'Chain agents into reusable pipelines with the Workflow Builder for repeatable validation.',
    icon: Workflow,
  },
  {
    title: 'Auto-Generate Workflows',
    description:
      'Describe your problem and let the system pick and arrange agents for you automatically.',
    icon: Wand2,
  },
  {
    title: 'Review Results',
    description:
      'Transparent per-agent output, metrics, and evidence for every validation finding.',
    icon: Eye,
  },
];

const KEY_CONCEPTS = [
  {
    title: 'Agents',
    description:
      'Specialized AI modules that perform one specific validation task \u2014 like checking correctness, detecting hallucinations, or grounding evidence.',
    icon: Bot,
  },
  {
    title: 'Workflows',
    description:
      'Ordered pipelines of agents that run sequentially on your data, producing cumulative validation results.',
    icon: Workflow,
  },
  {
    title: 'Runs',
    description:
      "Execution instances of a workflow or agent against a project's data, with full metrics and audit trail.",
    icon: Play,
  },
];

/* ─── Agent Builder steps ─── */
const BUILDER_STEPS = [
  {
    title: 'Describe Your Need',
    description:
      'Write what the agent should do in natural language (e.g., "Check if medication dosages mentioned in clinical notes are within FDA-approved ranges").',
    icon: MessageSquareText,
  },
  {
    title: 'System Generates Configuration',
    description:
      'AI creates: agent name, prompt template, input specification, output specification, validation rules, and category.',
    icon: Sparkles,
  },
  {
    title: 'Review & Edit',
    description:
      'See the generated config, edit any field, and test with sample data before finalizing.',
    icon: Pencil,
  },
  {
    title: 'Save to Library',
    description:
      'Agent appears in your personal agent library alongside the 15 built-in agents.',
    icon: Save,
  },
  {
    title: 'Use Anywhere',
    description:
      'Custom agents can be used in the Agent Runner, Workflows, or attached to Projects.',
    icon: Puzzle,
  },
];

const BUILDER_TIPS = [
  'Be specific about what data the agent should examine',
  'Mention the medical/clinical domain explicitly',
  'Define what "correct" vs "incorrect" looks like',
  'Include edge cases you want handled',
  'Reference standards or guidelines if applicable (e.g., "according to SNOMED CT")',
];

/* ─── Workflow Builder steps ─── */
const WORKFLOW_STEPS = [
  { label: 'Choose Template', icon: FileText },
  { label: 'Select Agents', icon: Bot },
  { label: 'Arrange Pipeline', icon: Layers },
  { label: 'Configure Stages', icon: Settings2 },
  { label: 'Validate', icon: CheckCircle2 },
  { label: 'Test Run', icon: TestTube2 },
  { label: 'Publish', icon: Zap },
];

const LIFECYCLE_STAGES = [
  { label: 'Draft', variant: 'secondary' as const },
  { label: 'Validated', variant: 'processing' as const },
  { label: 'Published', variant: 'success' as const },
  { label: 'Archived', variant: 'warning' as const },
];

/* ═══════════════════════════════════════════════════════════════════════════ */

export function GuidePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('Getting Started');

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* ─── Page Header ─── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BookOpen className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">How It Works</h1>
          <p className="text-sm text-muted-foreground">
            Learn how to build agents, run validations, and create automated
            workflows.
          </p>
        </div>
      </div>

      {/* ─── Tab Bar ─── */}
      <div className="flex items-center gap-1 rounded-xl border bg-card p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ─── */}
      {activeTab === 'Getting Started' && <GettingStartedTab />}
      {activeTab === 'Agent Builder' && <AgentBuilderTab />}
      {activeTab === 'Agent Runner' && <AgentRunnerTab />}
      {activeTab === 'Workflows' && <WorkflowsTab />}
      {activeTab === 'Use Cases' && <UseCasesTab navigate={navigate} />}

      {/* ─── Footer CTA ─── */}
      <Separator />
      <div className="grid gap-4 sm:grid-cols-3 pb-4">
        <button
          onClick={() => navigate('/workflows/new')}
          className="flex items-center gap-3 rounded-xl border bg-card p-5 text-left transition-all hover:shadow-lg hover:border-primary/30 cursor-pointer group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Cog className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Build an Agent</p>
            <p className="text-[11px] text-muted-foreground">
              Create a custom validation agent
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>

        <button
          onClick={() => navigate('/workflows')}
          className="flex items-center gap-3 rounded-xl border bg-card p-5 text-left transition-all hover:shadow-lg hover:border-primary/30 cursor-pointer group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Play className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Run Agents</p>
            <p className="text-[11px] text-muted-foreground">
              Execute single or multi-agent runs
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>

        <button
          onClick={() => navigate('/workflows/new')}
          className="flex items-center gap-3 rounded-xl border bg-card p-5 text-left transition-all hover:shadow-lg hover:border-primary/30 cursor-pointer group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Wand2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Auto-Generate Workflow</p>
            <p className="text-[11px] text-muted-foreground">
              Describe a problem, get a pipeline
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TAB 1 — Getting Started                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

function GettingStartedTab() {
  return (
    <div className="space-y-8">
      {/* Numbered steps with vertical connector */}
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Platform Flow
        </p>
        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-5 top-6 bottom-6 w-px bg-border" />

          <div className="space-y-0">
            {GETTING_STARTED_STEPS.map((step, idx) => (
              <div key={step.title} className="relative flex items-start gap-4 py-4">
                {/* Numbered circle */}
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold shadow-md">
                  {idx + 1}
                </div>

                {/* Content */}
                <div className="flex-1 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <step.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">{step.title}</h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Concepts */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Key Concepts
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {KEY_CONCEPTS.map((concept) => (
            <div
              key={concept.title}
              className="rounded-xl border bg-card p-5 space-y-3 transition-colors hover:bg-muted/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <concept.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold">{concept.title}</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {concept.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TAB 2 — Agent Builder                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function AgentBuilderTab() {
  return (
    <div className="space-y-8">
      {/* What is the Agent Builder */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          What is the Agent Builder?
        </p>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Cog className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold">
                Create Custom Agents from Natural Language
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                When no existing agent fits your need, describe what you want in
                plain English. The system generates the agent's prompt, input/output
                spec, and validation rules. You review, tweak, and save it to your
                library \u2014 ready to use in any workflow or runner session.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How to Build a Custom Agent */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          How to Build a Custom Agent
        </p>
        <div className="grid gap-3">
          {BUILDER_STEPS.map((step, idx) => (
            <div
              key={step.title}
              className="flex items-start gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {idx + 1}
              </div>
              <div className="flex items-start gap-3 flex-1">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
                  <step.icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">{step.title}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System generates detail */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          What the System Generates
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Agent Name', detail: 'Descriptive identifier', icon: FileText },
            { label: 'Prompt Template', detail: 'LLM instructions for the task', icon: MessageSquareText },
            { label: 'Input Specification', detail: 'Expected data schema', icon: Layers },
            { label: 'Output Specification', detail: 'Structured result format', icon: ListChecks },
            { label: 'Validation Rules', detail: 'Quality checks & thresholds', icon: CheckCircle2 },
            { label: 'Category', detail: 'Taxonomy classification', icon: Target },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/30"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Tips for Good Agent Descriptions
        </p>
        <div className="rounded-xl border bg-card p-5 space-y-2.5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold">
              Write better descriptions, get better agents
            </span>
          </div>
          {BUILDER_TIPS.map((tip) => (
            <div key={tip} className="flex items-start gap-2.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground">{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TAB 3 — Agent Runner                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

function AgentRunnerTab() {
  return (
    <div className="space-y-8">
      {/* Single Agent Mode */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Single Agent Mode
        </p>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CircleDot className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold">Run One Agent at a Time</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Select an agent, configure it, point it at your data, and see full
                output with every finding, evidence citation, and confidence score.
                Perfect for testing a new agent or debugging a specific validation
                check.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Agent Mode */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Multi-Agent Mode
        </p>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Split className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold">
                Run Multiple Agents Simultaneously
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Run multiple agents on the same data at once. Results appear in a
                side-by-side panel view. Compare how different agents evaluate the
                same evidence. Each agent's output is independently reviewable.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reviewing Agent Output */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Reviewing Agent Output
        </p>
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h3 className="text-sm font-bold">Output Anatomy</h3>

          {/* Finding card mock */}
          <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="destructive" className="text-[9px] px-2 py-0">
                ISSUE
              </Badge>
              <Badge variant="secondary" className="text-[9px] px-2 py-0">
                High Severity
              </Badge>
              <span className="text-xs font-bold ml-1">Finding Title</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Detailed description of what the agent found, including the specific
              data point and why it was flagged.
            </p>
            <div className="rounded-lg bg-muted/50 p-2.5 border-l-2 border-primary">
              <p className="text-[10px] text-muted-foreground italic">
                "Evidence quote from source document that supports this finding..."
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>
                  Confidence: <strong className="text-primary">0.92</strong>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer">
                  <ThumbsUp className="h-3 w-3" /> Approve
                </button>
                <button className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer">
                  <FlaskConical className="h-3 w-3" /> Flag
                </button>
                <button className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer">
                  <ThumbsDown className="h-3 w-3" /> Reject
                </button>
              </div>
            </div>
          </div>

          {/* Summary metrics mock */}
          <div className="grid grid-cols-5 gap-2">
            {[
              { label: 'Total Findings', value: '48' },
              { label: 'Issues Flagged', value: '12' },
              { label: 'Confidence', value: '0.89' },
              { label: 'Tokens Used', value: '24.3k' },
              { label: 'Cost', value: '$0.18' },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-lg border bg-muted/30 p-2.5 text-center"
              >
                <p className="text-sm font-bold">{m.value}</p>
                <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                  {m.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* When to Use What */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          When to Use What
        </p>
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="grid grid-cols-2">
            {/* Headers */}
            <div className="bg-primary/5 px-5 py-3 border-b border-r">
              <div className="flex items-center gap-2">
                <CircleDot className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold">Single Agent</span>
              </div>
            </div>
            <div className="bg-primary/5 px-5 py-3 border-b">
              <div className="flex items-center gap-2">
                <Split className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold">Multi-Agent</span>
              </div>
            </div>

            {/* Rows */}
            {[
              ['Testing a new custom agent', 'Running a validation pipeline'],
              ['Debugging a specific check', 'Comparing agent perspectives'],
              ['Quick spot check', 'Full data quality audit'],
              ['Learning how an agent works', 'Production validation run'],
            ].map(([single, multi], idx) => (
              <div key={idx} className="contents">
                <div
                  className={`px-5 py-3 text-[11px] text-muted-foreground border-r ${
                    idx < 3 ? 'border-b' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3 text-primary shrink-0" />
                    {single}
                  </div>
                </div>
                <div
                  className={`px-5 py-3 text-[11px] text-muted-foreground ${
                    idx < 3 ? 'border-b' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3 text-primary shrink-0" />
                    {multi}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TAB 4 — Workflows                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

function WorkflowsTab() {
  return (
    <div className="space-y-8">
      {/* Manual Workflow Builder */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Manual Workflow Builder
        </p>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {WORKFLOW_STEPS.map((step, idx) => (
              <div key={step.label} className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <step.icon className="h-4 w-4" />
                  </div>
                  <span className="text-[9px] font-semibold text-muted-foreground whitespace-nowrap">
                    {step.label}
                  </span>
                </div>
                {idx < WORKFLOW_STEPS.length - 1 && (
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 mb-4" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Auto-Generate Workflows */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Auto-Generate Workflows
        </p>
        <div className="rounded-xl border bg-card p-6 space-y-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wand2 className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold">
                Describe Your Problem, Get a Pipeline
              </h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Describe your validation problem in plain English. The system
                analyzes your description, identifies which agents are relevant,
                determines the optimal execution order, sets default configurations,
                and presents the generated workflow for your review.
              </p>
            </div>
          </div>

          {/* What the system does */}
          <div className="grid gap-2 sm:grid-cols-5">
            {[
              'Analyzes your description',
              'Identifies relevant agents',
              'Determines execution order',
              'Sets default configs',
              'Presents for review',
            ].map((item, idx) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-lg border bg-muted/20 p-2.5"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                  {idx + 1}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {item}
                </span>
              </div>
            ))}
          </div>

          <Separator />

          {/* Example */}
          <div className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Example
            </p>

            <div className="rounded-xl border bg-muted/10 p-4 space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Input
                  </span>
                </div>
                <p className="text-xs text-foreground italic rounded-lg bg-muted/50 p-3 border">
                  "I need to validate that patient eligibility criteria are correctly
                  extracted from clinical notes, check for hallucinated data, and
                  ensure all evidence is properly cited"
                </p>
              </div>

              <div className="flex items-center gap-1.5 py-1">
                <ArrowRight className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-semibold text-primary">
                  Auto-generated pipeline
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {[
                  'Correctness',
                  'Evidence Grounding',
                  'Hallucination Detection',
                  'Eligibility Logic',
                  'Completeness',
                ].map((agent, idx) => (
                  <div key={agent} className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="rounded-full px-3 py-1 text-[10px] font-bold bg-primary/8 text-primary border border-primary/15"
                    >
                      {agent}
                    </Badge>
                    {idx < 4 && (
                      <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Lifecycle */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Workflow Lifecycle
        </p>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {LIFECYCLE_STAGES.map((stage, idx) => (
              <div key={stage.label} className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1.5">
                  <Badge
                    variant={stage.variant}
                    className="rounded-full px-4 py-1.5 text-xs font-bold"
                  >
                    {stage.label}
                  </Badge>
                </div>
                {idx < LIFECYCLE_STAGES.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-3 mt-5">
            {[
              { label: 'Draft', detail: 'Initial creation, agents and config being set up' },
              { label: 'Validated', detail: 'All stages pass schema checks and test runs' },
              { label: 'Published', detail: 'Ready for production use across projects' },
              { label: 'Archived', detail: 'Retired from active use, preserved for audit' },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-xs font-bold">{item.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  TAB 5 — Use Cases                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

function UseCasesTab({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="space-y-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Real-World Neurology Use Cases
      </p>

      {USE_CASES.map((uc) => (
        <div
          key={uc.title}
          className="rounded-xl border bg-card p-6 space-y-4 transition-shadow hover:shadow-lg"
        >
          {/* Title row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Brain className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold leading-tight">{uc.title}</h3>
            </div>
          </div>

          {/* Scenario */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Scenario
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {uc.scenario}
            </p>
          </div>

          {/* Agents Used */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Agents Used
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {uc.agents.map((agent) => (
                <Badge
                  key={agent}
                  variant="secondary"
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-primary/8 text-primary border border-primary/15"
                >
                  {agent}
                </Badge>
              ))}
            </div>
          </div>

          {/* Key Insight */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Key Insight
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {uc.insight}
            </p>
          </div>

          {/* Result */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Outcome
              </p>
              <p className="text-xs font-semibold text-foreground">{uc.result}</p>
            </div>
            <Button
              variant="outline"
              className="rounded-full px-5 text-[11px] font-semibold shrink-0"
              onClick={() => navigate('/workflows/new')}
            >
              Try this workflow
              <ArrowRight className="ml-1.5 h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
