import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { AGENT_LIBRARY } from '@/data/agents';
import type { AgentCategory, CustomAgent } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  FlaskConical,
  Info,
  Lightbulb,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Wand2,
  Workflow,
  X,
  Zap,
} from 'lucide-react';

/* ─── Helpers ─── */

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Extract a reasonable agent name from the user description. */
function deriveAgentName(desc: string): string {
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall',
    'should', 'may', 'might', 'must', 'can', 'could', 'of', 'in', 'to',
    'for', 'with', 'on', 'at', 'from', 'by', 'about', 'as', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'between',
    'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either',
    'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than',
    'too', 'very', 'just', 'if', 'that', 'this', 'these', 'those',
    'it', 'its', 'i', 'we', 'you', 'he', 'she', 'they', 'me', 'us',
    'him', 'her', 'them', 'my', 'our', 'your', 'his', 'their', 'check',
    'verify', 'validate', 'ensure', 'whether', 'what', 'how', 'when',
    'where', 'which', 'who', 'whom', 'whose', 'why', 'e.g.', 'eg',
    'etc', 'mentioned', 'within', 'against',
  ]);
  const words = desc
    .replace(/[^a-zA-Z\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w.toLowerCase()));
  const meaningful = words.slice(0, 3).map(capitalize);
  if (meaningful.length === 0) return 'Custom Validation Agent';
  return meaningful.join(' ') + ' Agent';
}

function deriveShortName(name: string): string {
  const words = name.split(/\s+/).filter((w) => w.length > 1 && w !== 'Agent');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0] + (words[2]?.[0] ?? words[0][1])).toUpperCase();
  }
  return name.replace(/[^A-Z]/g, '').slice(0, 3) || 'CUS';
}

function generatePrompt(desc: string, domain: string, standards: string, edgeCases: string): string {
  const domainText = domain || 'neurology clinical data';
  const standardsText = standards || 'established clinical guidelines and FDA labeling';
  const edgeCasesText = edgeCases
    ? `\n\n## Edge Cases & Exceptions\nPay special attention to the following scenarios:\n- ${edgeCases.split(',').map((s) => s.trim()).filter(Boolean).join('\n- ')}`
    : '';

  return `You are a clinical validation agent specialized in ${domainText}.

## Primary Objective
${desc}

## Input Processing
Given the following patient data (clinical encounter notes, extracted data fields, and reference values):
1. Parse all relevant clinical entities, measurements, and temporal references.
2. Identify the specific data points that fall within your validation scope.
3. Cross-reference each data point against ${standardsText}.

## Validation Rules
For each data point under review:
- Compare extracted values against reference ranges and approved thresholds.
- Flag any discrepancies with severity level (critical, high, medium, low).
- Provide the source citation for each finding.
- Calculate a confidence score (0.0-1.0) for each validation decision.
- If evidence is ambiguous or insufficient, mark as "Needs Review" rather than making a definitive call.${edgeCasesText}

## Output Format
Return a structured JSON object with:
- "findings": Array of { type, title, detail, evidence, severity, confidence }
- "summary": One-paragraph summary of overall validation results
- "flagCount": Number of issues requiring attention
- "overallConfidence": Weighted average confidence across all checks
- "recommendations": Array of suggested next steps

## Quality Standards
- Never hallucinate or fabricate clinical references.
- Always cite the specific source passage supporting each finding.
- When uncertain, explicitly state the uncertainty and its source.
- Maintain HIPAA-compliant handling of all patient identifiers.`;
}

function generateValidationRules(desc: string, standards: string): string[] {
  const rules = [
    'All flagged values must include a source citation from the original clinical documentation',
    'Confidence scores below 0.7 must trigger a manual review flag',
    'Critical severity findings require at least two corroborating evidence passages',
  ];

  if (desc.toLowerCase().includes('dosage') || desc.toLowerCase().includes('medication')) {
    rules.push('Medication dosages must be cross-referenced against FDA-approved labeling for the specific indication');
    rules.push('Off-label usage must be explicitly flagged with supporting clinical rationale');
  } else if (desc.toLowerCase().includes('temporal') || desc.toLowerCase().includes('timeline') || desc.toLowerCase().includes('date')) {
    rules.push('All temporal sequences must follow clinically plausible ordering');
    rules.push('Date discrepancies exceeding 30 days from expected ranges must be escalated');
  } else if (desc.toLowerCase().includes('eligibility') || desc.toLowerCase().includes('criteria')) {
    rules.push('Inclusion/exclusion criteria must be evaluated independently with explicit pass/fail per criterion');
    rules.push('Compound eligibility logic (AND/OR) must be resolved with full decision trace');
  } else {
    rules.push(
      standards
        ? `Extracted values must conform to ${standards} reference standards`
        : 'Extracted values must conform to established clinical reference standards',
    );
    rules.push('Contradictory findings across encounters must be flagged for adjudication');
  }

  return rules;
}

/* ─── Stage labels ─── */

const STAGE_LABELS = ['Describe', 'Generate', 'Review', 'Save'] as const;

/* ─── Generation steps ─── */

const GEN_STEPS = [
  'Analyzing your requirements...',
  'Identifying relevant clinical capabilities...',
  'Generating prompt template...',
  'Defining input/output specification...',
  'Creating validation rules...',
] as const;

/* ─── Mock test findings ─── */

const MOCK_TEST_FINDINGS = [
  {
    type: 'issue' as const,
    title: 'Dosage exceeds recommended range',
    detail: 'Levetiracetam 4500mg/day exceeds the FDA-approved maximum of 3000mg/day for adult epilepsy.',
    severity: 'high',
    confidence: 0.94,
  },
  {
    type: 'pass' as const,
    title: 'Diagnosis code validated',
    detail: 'ICD-10 code G40.309 (Generalized idiopathic epilepsy, not intractable) correctly maps to patient presentation.',
    severity: 'info',
    confidence: 0.98,
  },
  {
    type: 'warning' as const,
    title: 'Temporal inconsistency detected',
    detail: 'Treatment start date (2024-01-15) precedes documented diagnosis date (2024-02-03) by 19 days.',
    severity: 'medium',
    confidence: 0.82,
  },
];

/* ─── Component ─── */

export function AgentBuilderPage() {
  const navigate = useNavigate();
  const { currentUser, customAgents, addCustomAgent, removeCustomAgent } = useAppContext();

  // ── Stage state ──
  const [stage, setStage] = useState(1);

  // ── Stage 1: Describe ──
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<AgentCategory>('validation');
  const [domain, setDomain] = useState('');
  const [standards, setStandards] = useState('');
  const [edgeCases, setEdgeCases] = useState('');

  // ── Stage 2: Generating ──
  const [genStep, setGenStep] = useState(0);
  const [genProgress, setGenProgress] = useState(0);

  // ── Stage 3: Review & Edit ──
  const [agentName, setAgentName] = useState('');
  const [shortName, setShortName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [agentCategory, setAgentCategory] = useState<AgentCategory>('validation');
  const [prompt, setPrompt] = useState('');
  const [inputSpec, setInputSpec] = useState('');
  const [outputSpec, setOutputSpec] = useState('');
  const [validationRules, setValidationRules] = useState<string[]>([]);

  // ── Stage 3: Quick Test ──
  const [testInput, setTestInput] = useState('');
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<typeof MOCK_TEST_FINDINGS | null>(null);

  // ── Stage 4: Saved agent ref ──
  const [savedAgent, setSavedAgent] = useState<CustomAgent | null>(null);

  // ── Generation simulation ──
  const startGeneration = useCallback(() => {
    setStage(2);
    setGenStep(0);
    setGenProgress(0);
  }, []);

  useEffect(() => {
    if (stage !== 2) return;

    const stepDuration = 500;
    const totalSteps = GEN_STEPS.length;

    const timer = setInterval(() => {
      setGenStep((prev) => {
        const next = prev + 1;
        setGenProgress(Math.round((next / totalSteps) * 100));
        if (next >= totalSteps) {
          clearInterval(timer);
          // Build generated values and advance to stage 3
          setTimeout(() => {
            const name = deriveAgentName(description);
            const sn = deriveShortName(name);
            setAgentName(name);
            setShortName(sn);
            setAgentDescription(
              description.length > 120
                ? description.slice(0, 117) + '...'
                : description,
            );
            setAgentCategory(category);
            setPrompt(generatePrompt(description, domain, standards, edgeCases));
            setInputSpec(
              'Clinical encounter notes, extracted data fields, reference values' +
              (domain ? `, ${domain}-specific clinical parameters` : ''),
            );
            setOutputSpec(
              'Structured findings list with severity classification, evidence citations, confidence scores, and actionable recommendations',
            );
            setValidationRules(generateValidationRules(description, standards));
            setTestResults(null);
            setTestInput('');
            setStage(3);
          }, 300);
        }
        return next;
      });
    }, stepDuration);

    return () => clearInterval(timer);
  }, [stage, description, category, domain, standards, edgeCases]);

  // ── Quick test simulation ──
  function runQuickTest() {
    if (!testInput.trim()) return;
    setTestRunning(true);
    setTestResults(null);
    setTimeout(() => {
      setTestResults(MOCK_TEST_FINDINGS);
      setTestRunning(false);
    }, 1200);
  }

  // ── Save agent ──
  function handleSave() {
    const agent: CustomAgent = {
      id: `custom-${randomId()}`,
      name: agentName,
      shortName: shortName.toUpperCase().slice(0, 3) || 'CUS',
      description: agentDescription,
      category: agentCategory,
      defaultEnabled: false,
      isCustom: true,
      prompt,
      validationRules: validationRules.join('\n'),
      inputSpec,
      outputSpec,
      createdAt: new Date().toISOString().split('T')[0],
      createdBy: currentUser,
    };
    addCustomAgent(agent);
    setSavedAgent(agent);
    setStage(4);
  }

  // ── Reset for new agent ──
  function resetForm() {
    setStage(1);
    setDescription('');
    setCategory('validation');
    setDomain('');
    setStandards('');
    setEdgeCases('');
    setAgentName('');
    setShortName('');
    setAgentDescription('');
    setAgentCategory('validation');
    setPrompt('');
    setInputSpec('');
    setOutputSpec('');
    setValidationRules([]);
    setTestInput('');
    setTestResults(null);
    setSavedAgent(null);
    setGenStep(0);
    setGenProgress(0);
  }

  // ── Validation rule helpers ──
  function updateRule(index: number, value: string) {
    setValidationRules((prev) => prev.map((r, i) => (i === index ? value : r)));
  }

  function removeRule(index: number) {
    setValidationRules((prev) => prev.filter((_, i) => i !== index));
  }

  function addRule() {
    setValidationRules((prev) => [...prev, '']);
  }

  // ── Current stage index for the step indicator (0-based) ──
  const currentStepIdx = stage - 1;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* ══════════════ STEP PROGRESS INDICATOR ══════════════ */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-center gap-0">
          {STAGE_LABELS.map((label, idx) => {
            const isCompleted = idx < currentStepIdx;
            const isCurrent = idx === currentStepIdx;
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

      {/* ══════════════ STAGE 1: DESCRIBE YOUR AGENT ══════════════ */}
      {stage === 1 && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Agent Builder</h1>
              <p className="text-sm text-muted-foreground">
                Describe what you need — we'll generate the agent configuration for you.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* Main form card */}
            <div className="rounded-xl border bg-card p-6 space-y-6">
              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">
                  What should this agent do? <span className="text-destructive">*</span>
                </label>
                <Textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Check if medication dosages mentioned in clinical notes are within FDA-approved ranges for neurological conditions..."
                />
                <p className="text-xs text-muted-foreground">
                  Be specific about the data domain, what to check, and what correct vs incorrect looks like.
                </p>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Agent category</label>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AgentCategory)}
                >
                  <option value="validation">Validation</option>
                  <option value="operational">Operational</option>
                </Select>
              </div>

              {/* Domain */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Clinical domain focus</label>
                <Input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g., Neurology, Migraine, Parkinson's, Alzheimer's"
                />
              </div>

              {/* Standards */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Reference standards</label>
                <Input
                  value={standards}
                  onChange={(e) => setStandards(e.target.value)}
                  placeholder="e.g., FDA labeling, SNOMED CT, ICD-10, UPDRS"
                />
              </div>

              {/* Edge cases */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Edge cases to handle</label>
                <Textarea
                  rows={2}
                  value={edgeCases}
                  onChange={(e) => setEdgeCases(e.target.value)}
                  placeholder="e.g., Off-label dosages, pediatric vs adult ranges, combination therapies"
                />
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button
                  disabled={!description.trim()}
                  onClick={startGeneration}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate Agent
                </Button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Tips card */}
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tips for Better Results
                  </p>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    Be specific about the data type (clinical notes, lab values, imaging reports)
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    Mention the therapeutic area explicitly
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    Define what "correct" and "incorrect" mean for your use case
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    Include edge cases and exceptions
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    Reference clinical standards or guidelines
                  </li>
                </ul>
              </div>

              {/* Existing agents card */}
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Existing Agents
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">{AGENT_LIBRARY.length}</span> built-in agents available. Your custom agent will work alongside these.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {AGENT_LIBRARY.map((a) => (
                    <Badge key={a.id} variant="secondary" className="text-[10px] font-medium px-2 py-0.5">
                      {a.shortName}
                    </Badge>
                  ))}
                </div>
                {customAgents.length > 0 && (
                  <>
                    <Separator />
                    <p className="text-xs text-muted-foreground">
                      <span className="font-bold text-foreground">{customAgents.length}</span> custom agent{customAgents.length !== 1 ? 's' : ''}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {customAgents.map((a) => (
                        <Badge key={a.id} variant="outline" className="text-[10px] font-medium px-2 py-0.5">
                          {a.shortName}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ STAGE 2: GENERATING ══════════════ */}
      {stage === 2 && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="rounded-xl border bg-card p-8 w-full max-w-lg space-y-6 text-center">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold">Generating Your Agent</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Building a custom validation agent from your description...
              </p>
            </div>

            <div className="space-y-3 text-left">
              {GEN_STEPS.map((step, idx) => {
                const isDone = genStep > idx;
                const isActive = genStep === idx;
                return (
                  <div
                    key={step}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-300 ${
                      isDone
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : isActive
                          ? 'bg-primary/5 text-foreground'
                          : 'text-muted-foreground/50'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : isActive ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                    ) : (
                      <div className="h-4 w-4 shrink-0 rounded-full border border-muted-foreground/30" />
                    )}
                    <span className="text-sm">{step}</span>
                  </div>
                );
              })}
            </div>

            <Progress value={genProgress} />
          </div>
        </div>
      )}

      {/* ══════════════ STAGE 3: REVIEW & EDIT ══════════════ */}
      {stage === 3 && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Review & Edit Agent</h1>
              <p className="text-sm text-muted-foreground">
                Fine-tune the generated configuration. All fields are editable.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {/* Left column: Agent configuration */}
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-6 space-y-6">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Agent Identity
                </p>

                {/* Agent name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Agent Name</label>
                  <Input
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="Agent name"
                  />
                </div>

                {/* Short name */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Short Name</label>
                  <Input
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value.toUpperCase().slice(0, 3))}
                    placeholder="3-letter code"
                    maxLength={3}
                    className="w-28 font-mono uppercase"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Description</label>
                  <Textarea
                    rows={2}
                    value={agentDescription}
                    onChange={(e) => setAgentDescription(e.target.value)}
                    placeholder="One-line description of what this agent does"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Category</label>
                  <Select
                    value={agentCategory}
                    onChange={(e) => setAgentCategory(e.target.value as AgentCategory)}
                  >
                    <option value="validation">Validation</option>
                    <option value="operational">Operational</option>
                  </Select>
                </div>
              </div>

              {/* Prompt template */}
              <div className="rounded-xl border bg-card p-6 space-y-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Prompt Template
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This prompt defines your agent's behavior — the system prompt sent to the LLM.
                  </p>
                </div>
                <Textarea
                  rows={10}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="font-mono text-xs leading-relaxed"
                  placeholder="System prompt for your agent..."
                />
              </div>

              {/* Input / Output spec */}
              <div className="rounded-xl border bg-card p-6 space-y-6">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Input / Output Specification
                </p>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Input Specification</label>
                  <Textarea
                    rows={3}
                    value={inputSpec}
                    onChange={(e) => setInputSpec(e.target.value)}
                    placeholder="What data this agent expects..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Output Specification</label>
                  <Textarea
                    rows={3}
                    value={outputSpec}
                    onChange={(e) => setOutputSpec(e.target.value)}
                    placeholder="What this agent produces..."
                  />
                </div>
              </div>

              {/* Validation rules */}
              <div className="rounded-xl border bg-card p-6 space-y-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Validation Rules
                </p>

                <div className="space-y-3">
                  {validationRules.map((rule, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="mt-2.5 text-xs font-bold text-muted-foreground shrink-0 w-5 text-right">
                        {idx + 1}.
                      </span>
                      <Input
                        value={rule}
                        onChange={(e) => updateRule(idx, e.target.value)}
                        placeholder="Validation rule..."
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRule(idx)}
                        className="shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={addRule}
                  className="gap-1.5 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add rule
                </Button>
              </div>

              {/* CTAs */}
              <div className="flex items-center gap-3">
                <Button onClick={handleSave} className="gap-2 cursor-pointer">
                  <Save className="h-4 w-4" />
                  Save to Library
                </Button>
                <Button
                  variant="outline"
                  onClick={startGeneration}
                  className="gap-2 cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  Regenerate
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setStage(1)}
                  className="gap-2 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Edit Description
                </Button>
              </div>
            </div>

            {/* Right column: Preview & Test */}
            <div className="space-y-4">
              {/* Agent preview */}
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Agent Preview
                </p>

                <div className="rounded-xl border border-primary bg-primary/5 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xs font-bold shrink-0">
                      {shortName || '---'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{agentName || 'Agent Name'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {agentDescription || 'Agent description will appear here.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">
                      {agentCategory === 'validation' ? 'Validation' : 'Operational'}
                    </Badge>
                    <Badge variant="processing" className="text-[10px]">
                      Custom
                    </Badge>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Created by {currentUser}</span>
                    <span>{new Date().toISOString().split('T')[0]}</span>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-3 flex gap-2">
                  <Info className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This agent will be available in Agent Runner, Workflow Builder, and can be attached to projects.
                  </p>
                </div>
              </div>

              {/* Quick test */}
              <div className="rounded-xl border bg-card p-5 space-y-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Quick Test
                </p>

                <Textarea
                  rows={3}
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Paste sample clinical text to test your agent..."
                  className="text-xs"
                />

                <Button
                  variant="outline"
                  size="sm"
                  disabled={!testInput.trim() || testRunning}
                  onClick={runQuickTest}
                  className="gap-1.5 w-full cursor-pointer"
                >
                  {testRunning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {testRunning ? 'Running...' : 'Test Agent'}
                </Button>

                {testResults && (
                  <div className="space-y-2">
                    <Separator />
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Sample Findings
                    </p>
                    {testResults.map((f, idx) => (
                      <div
                        key={idx}
                        className={`rounded-lg p-3 text-xs space-y-1 ${
                          f.type === 'issue'
                            ? 'bg-destructive/10 border border-destructive/20'
                            : f.type === 'warning'
                              ? 'bg-amber-500/10 border border-amber-500/20'
                              : 'bg-emerald-500/10 border border-emerald-500/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{f.title}</span>
                          <Badge
                            variant={
                              f.severity === 'high'
                                ? 'destructive'
                                : f.severity === 'medium'
                                  ? 'warning'
                                  : 'success'
                            }
                            className="text-[9px] px-1.5 py-0"
                          >
                            {f.severity}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{f.detail}</p>
                        <p className="text-muted-foreground/70">
                          Confidence: {(f.confidence * 100).toFixed(0)}%
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ STAGE 4: SAVED CONFIRMATION ══════════════ */}
      {stage === 4 && savedAgent && (
        <div className="space-y-6">
          {/* Success card */}
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="rounded-xl border bg-card p-8 w-full max-w-lg space-y-6 text-center">
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold">Agent Created Successfully</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-semibold text-foreground">{savedAgent.name}</span>{' '}
                  <Badge variant="secondary" className="text-[10px] ml-1">
                    {savedAgent.shortName}
                  </Badge>
                </p>
                <p className="text-sm text-muted-foreground mt-3">
                  Your agent has been added to the library and is ready to use.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button onClick={resetForm} variant="outline" className="gap-2 cursor-pointer w-full sm:w-auto">
                  <Wand2 className="h-4 w-4" />
                  Build Another Agent
                </Button>
                <Button onClick={() => navigate('/agent-runner')} className="gap-2 cursor-pointer w-full sm:w-auto">
                  <Play className="h-4 w-4" />
                  Run This Agent
                </Button>
                <Button onClick={() => navigate('/workflows')} variant="ghost" className="gap-2 cursor-pointer w-full sm:w-auto">
                  <Workflow className="h-4 w-4" />
                  Go to Workflows
                </Button>
              </div>
            </div>
          </div>

          {/* Saved agent card */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Saved Agent
            </p>
            <div className="rounded-xl border p-4 flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xs font-bold shrink-0">
                {savedAgent.shortName}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm">{savedAgent.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{savedAgent.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {savedAgent.category === 'validation' ? 'Validation' : 'Operational'}
                  </Badge>
                  <Badge variant="processing" className="text-[10px]">
                    Custom
                  </Badge>
                </div>
              </div>
              <div className="text-xs text-muted-foreground shrink-0 text-right">
                <p>by {savedAgent.createdBy}</p>
                <p>{savedAgent.createdAt}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ YOUR CUSTOM AGENTS (always visible) ══════════════ */}
      <Separator />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Your Custom Agents
          </p>
        </div>

        {customAgents.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
            <Bot className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground mt-3">
              No custom agents yet. Build your first one above.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {customAgents.map((agent) => (
              <div
                key={agent.id}
                className="rounded-xl border bg-card p-4 space-y-3 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
                    {agent.shortName}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{agent.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {agent.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="processing" className="text-[10px]">
                    Custom
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {agent.category === 'validation' ? 'Validation' : 'Operational'}
                  </Badge>
                </div>

                <div className="text-[10px] text-muted-foreground">
                  {agent.createdBy} &middot; {agent.createdAt}
                </div>

                <Separator />

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/agent-runner')}
                    className="gap-1.5 flex-1 cursor-pointer"
                  >
                    <Play className="h-3 w-3" />
                    Run
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCustomAgent(agent.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
