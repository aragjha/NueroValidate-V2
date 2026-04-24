import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  BookOpen,
  Bot,
  CheckCircle2,
  Clock,
  DatabaseZap,
  FolderOpen,
  GitBranch,
  Hammer,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  Workflow,
  Wand2,
  Zap,
  FlaskConical,
} from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();
  const { projects, workflows, workflowRuns, customAgents, cohortImports } = useAppContext();

  const activeProjects = projects.filter((p) => p.status === 'Active').length;
  const publishedWorkflows = workflows.filter((w) => w.status === 'Published').length;
  const recentRuns = workflowRuns.filter((r) => r.status === 'Completed').length;

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      {/* Hero */}
      <div className="text-center space-y-3 pt-4">
        <div className="flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">NeuroAudit</h1>
        </div>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Real-world evidence validation platform for neurology. Choose your workspace below.
        </p>
      </div>

      {/* Two entry point cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Projects Card */}
        <div
          className="group relative flex flex-col rounded-2xl border-2 border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-xl cursor-pointer"
          onClick={() => navigate('/projects')}
        >
          <div className="flex items-start justify-between mb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FolderOpen className="h-6 w-6" />
            </div>
            <Badge variant="secondary" className="text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              CURRENT FLOW
            </Badge>
          </div>

          <h2 className="text-xl font-bold tracking-tight mb-2">Projects</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Create and manage neurology validation studies. Configure criteria, run extractions, and review patient-level evidence.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <p className="text-lg font-bold">{activeProjects}</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Active</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <p className="text-lg font-bold">{projects.length}</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <p className="text-lg font-bold">4</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Stages</p>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">What you can do</p>
            {['Create validation studies for RWE/RWD', 'Configure criteria & LLM prompts', 'Run patient cohort extractions', 'Review evidence & mark decisions'].map((item) => (
              <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                {item}
              </div>
            ))}
          </div>

          <div className="mt-auto flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Your familiar workspace</span>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
              Open Projects <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Agentic Studio Card */}
        <div
          className="group relative flex flex-col rounded-2xl border-2 border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-xl cursor-pointer"
          onClick={() => navigate('/studio')}
        >
          <div className="flex items-start justify-between mb-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <Badge className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-gradient-to-r from-primary to-purple-600 text-white border-0">
              NEW IN V3
            </Badge>
          </div>

          <h2 className="text-xl font-bold tracking-tight mb-2">Agentic Studio</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            Test your prompts, validate extraction accuracy, or build custom multi-agent pipelines. For normal validation, use Projects. For advanced testing and experiments, use the Studio.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <p className="text-lg font-bold">9</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Use Cases</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <p className="text-lg font-bold">15+</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Agents</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <p className="text-lg font-bold">{workflows.length}</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Workflows</p>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">What you can do</p>
            {['Test prompts before running at scale', 'Check extraction accuracy with evidence', 'Validate eligibility with multi-agent pipelines', 'Save and reuse workflows across projects'].map((item) => (
              <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="h-3 w-3 text-primary shrink-0" />
                {item}
              </div>
            ))}
          </div>

          <div className="mt-auto flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Goal-first validation studio</span>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-2.5 transition-all">
              Open Studio <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Model Quantisation entry */}
      <button
        onClick={() => navigate('/quantisation/comorbidities')}
        className="group flex w-full items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-all hover:border-primary/40 hover:shadow-md cursor-pointer"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <FlaskConical className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold">Model Quantisation</span>
        <Badge className="text-[9px] font-bold px-1.5 py-0 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border-0">
          NEW
        </Badge>
        <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
          Open Table <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </button>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Quick Actions</h3>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <button
            onClick={() => navigate('/vault')}
            className="flex flex-col items-start gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:bg-muted/50 hover:shadow-md cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
              <DatabaseZap className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Data Vault</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Import & review clinical trial cohorts from NeuroTerminal.</p>
              {cohortImports.length > 0 && (
                <p className="text-[10px] text-primary font-medium mt-1">{cohortImports.length} cohort{cohortImports.length > 1 ? 's' : ''} imported</p>
              )}
            </div>
          </button>

          <button
            onClick={() => navigate('/agent-runner')}
            className="flex flex-col items-start gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:bg-muted/50 hover:shadow-md cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Play className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Agent Runner</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Run single or multiple agents and review per-agent output.</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/workflows')}
            className="flex flex-col items-start gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:bg-muted/50 hover:shadow-md cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
              <Workflow className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Saved Workflows</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Browse, manage, and reuse your saved validation workflows.</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/agent-builder')}
            className="flex flex-col items-start gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:bg-muted/50 hover:shadow-md cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Wand2 className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Agent Builder</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Describe what you need. We generate the agent for you.</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/guide')}
            className="flex flex-col items-start gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:bg-muted/50 hover:shadow-md cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">How It Works</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">Guide with use cases, walkthroughs, and best practices.</p>
            </div>
          </button>
        </div>
      </div>

      {/* More shortcuts */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <button
          onClick={() => navigate('/projects/new')}
          className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50 cursor-pointer"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Plus className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">New Project</p>
            <p className="text-[11px] text-muted-foreground">Start a validation study</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/workflows/new')}
          className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50 cursor-pointer"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <GitBranch className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">New Workflow</p>
            <p className="text-[11px] text-muted-foreground">Build an agent pipeline</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/agent-builder')}
          className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50 cursor-pointer"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Hammer className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Build Custom Agent</p>
            <p className="text-[11px] text-muted-foreground">Create from description</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/agent-runner')}
          className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50 cursor-pointer"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Run Agents</p>
            <p className="text-[11px] text-muted-foreground">Single or multi-agent</p>
          </div>
        </button>
      </div>

      {/* Recent activity */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
        <div className="rounded-xl border bg-card divide-y">
          {workflows.slice(0, 3).map((wf) => (
            <div
              key={wf.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/workflows/${wf.id}`)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Workflow className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{wf.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    v{wf.version} · {wf.stages.length} stages · {wf.runCount} runs
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={wf.status === 'Published' ? 'success' : wf.status === 'Validated' ? 'processing' : 'secondary'}
                  className="text-[10px] px-2 py-0"
                >
                  {wf.status}
                </Badge>
                {wf.lastRunAt && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {wf.lastRunAt}
                  </span>
                )}
              </div>
            </div>
          ))}
          {projects.slice(0, 2).map((proj) => (
            <div
              key={proj.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => navigate(`/projects/${proj.id}/criteria`)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <FolderOpen className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{proj.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Stage {proj.currentStage}/{proj.totalStages} · {proj.patientCount.toLocaleString()} patients
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={proj.stageProgress >= 75 ? 'success' : 'processing'} className="text-[10px] px-2 py-0">
                  {proj.stageProgress}%
                </Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {proj.lastUpdated}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
