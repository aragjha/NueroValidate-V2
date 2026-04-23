import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { getAgent } from '@/data/agents';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import type { WorkflowStatus, WorkflowRunStatus, WorkflowRun } from '@/types';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Cog,
  FolderOpen,
  GitBranch,
  Link,
  Pencil,
  Play,
  Search,
  Tag,
  User,
  Workflow,
  XCircle,
  AlertTriangle,
  Loader2,
  CircleDot,
  Minus,
  Save,
} from 'lucide-react';

const STATUS_BADGE: Record<WorkflowStatus, 'success' | 'processing' | 'warning' | 'secondary'> = {
  Draft: 'secondary',
  Validated: 'processing',
  Published: 'success',
  Archived: 'warning',
};

const RUN_STATUS_BADGE: Record<WorkflowRunStatus, 'success' | 'processing' | 'warning' | 'destructive' | 'secondary'> = {
  Queued: 'secondary',
  Running: 'processing',
  Completed: 'success',
  Failed: 'destructive',
  Cancelled: 'warning',
};

const STAGE_STATUS_ICON: Record<string, typeof CheckCircle2> = {
  Pending: Clock,
  Running: Loader2,
  Completed: CheckCircle2,
  Failed: XCircle,
  Skipped: Minus,
};

type Tab = 'overview' | 'runs' | 'attach';

export function WorkflowDetailPage() {
  const navigate = useNavigate();
  const { workflowId } = useParams<{ workflowId: string }>();
  const { workflows, workflowRuns, projects, updateWorkflow } = useAppContext();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [projectSearch, setProjectSearch] = useState('');
  const [pendingProjectIds, setPendingProjectIds] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);

  const workflow = useMemo(() => workflows.find((w) => w.id === workflowId), [workflows, workflowId]);
  const runs = useMemo(() => workflowRuns.filter((r) => r.workflowId === workflowId).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()), [workflowRuns, workflowId]);
  const attachedProjects = useMemo(() => (workflow ? projects.filter((p) => workflow.attachedProjectIds.includes(p.id)) : []), [projects, workflow]);

  // Lazy-init pending project IDs from workflow when switching to attach tab
  const currentProjectIds = useMemo(() => {
    if (pendingProjectIds !== null) return pendingProjectIds;
    return workflow?.attachedProjectIds ?? [];
  }, [pendingProjectIds, workflow]);

  const filteredProjects = useMemo(() => {
    const q = projectSearch.toLowerCase();
    return projects.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.clientId ?? '').toLowerCase().includes(q) ||
      (p.status ?? '').toLowerCase().includes(q),
    );
  }, [projects, projectSearch]);

  if (!workflow) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Workflow className="h-14 w-14 text-muted-foreground/30" />
        <p className="mt-4 text-lg font-semibold">Workflow not found</p>
        <p className="text-sm text-muted-foreground mt-1">The workflow you are looking for does not exist or has been removed.</p>
        <Button variant="outline" className="mt-6 rounded-full" onClick={() => navigate('/workflows')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Workflows
        </Button>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'runs', label: 'Run History' },
    { key: 'attach', label: 'Attach to Project' },
  ];

  async function handleSaveAttachments() {
    if (!workflow) return;
    setSaving(true);
    await updateWorkflow({ ...workflow, attachedProjectIds: currentProjectIds });
    setPendingProjectIds(null);
    setSaving(false);
  }

  function toggleProject(projectId: string) {
    const ids = pendingProjectIds ?? workflow.attachedProjectIds;
    if (ids.includes(projectId)) {
      setPendingProjectIds(ids.filter((id) => id !== projectId));
    } else {
      setPendingProjectIds([...ids, projectId]);
    }
  }

  return (
    <div className="space-y-6">
      {/* Back button + actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate('/workflows')}>
          <ArrowLeft className="h-4 w-4" /> Back to Workflows
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-full gap-2" onClick={() => alert('Edit functionality coming soon')}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button size="sm" className="rounded-full gap-2" onClick={() => navigate('/workflows/new')}>
            <Play className="h-3.5 w-3.5" /> Run Workflow
          </Button>
        </div>
      </div>

      {/* Header card */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-purple-500/15 text-primary">
            <Workflow className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight">{workflow.name}</h1>
              <Badge
                variant={STATUS_BADGE[workflow.status]}
                className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
              >
                {workflow.status}
              </Badge>
              <span className="text-[11px] text-muted-foreground font-medium">v{workflow.version}</span>
            </div>
            <div className="mt-2 flex items-center gap-4 flex-wrap text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" /> {workflow.createdBy}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Created {workflow.createdAt}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Updated {workflow.updatedAt}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-full border bg-muted/40 p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`cursor-pointer transition-colors ${
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-xs font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted rounded-full px-4 py-1.5 text-xs font-semibold'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab: Overview ─── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Description card */}
          <div className="rounded-xl border bg-card p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Description</p>
            <p className="text-sm leading-relaxed">{workflow.description}</p>
          </div>

          {/* Pipeline Visualization */}
          <div className="rounded-xl border bg-card p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Pipeline ({workflow.stages.length} stages)
            </p>
            <div className="relative">
              {workflow.stages
                .sort((a, b) => a.order - b.order)
                .map((stage, idx) => {
                  const agent = getAgent(stage.agentId);
                  const configEntries = Object.entries(stage.config);
                  const isLast = idx === workflow.stages.length - 1;

                  return (
                    <div key={stage.id} className="relative flex gap-4">
                      {/* Vertical line + numbered circle */}
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                          {idx + 1}
                        </div>
                        {!isLast && (
                          <div className="w-px flex-1 bg-border min-h-[24px]" />
                        )}
                      </div>

                      {/* Stage content */}
                      <div className={`flex-1 pb-6 ${isLast ? 'pb-0' : ''}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center rounded-full bg-primary/8 px-2 py-0.5 text-[9px] font-bold text-primary border border-primary/15">
                            {agent?.shortName ?? '?'}
                          </span>
                          <span className="text-sm font-semibold">{agent?.name ?? 'Unknown Agent'}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{stage.label}</p>
                        {configEntries.length > 0 && (
                          <div className="mt-2 rounded-lg bg-muted/50 p-2.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Config</p>
                            <div className="grid gap-1">
                              {configEntries.map(([key, value]) => (
                                <div key={key} className="flex items-center gap-2 text-[11px]">
                                  <span className="text-muted-foreground font-medium">{key}:</span>
                                  <span className="font-mono text-xs">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Tags */}
          {workflow.tags.length > 0 && (
            <div className="rounded-xl border bg-card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tags</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {workflow.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                  >
                    <Tag className="h-2.5 w-2.5" /> {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FolderOpen className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold">{attachedProjects.length}</p>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Attached Projects</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <GitBranch className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold">{workflow.runCount}</p>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Runs</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {workflow.lastRunStatus === 'Success' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : workflow.lastRunStatus === 'Failed' ? (
                  <XCircle className="h-4 w-4" />
                ) : workflow.lastRunStatus === 'Partial' ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
              </div>
              <div>
                {workflow.lastRunStatus ? (
                  <Badge
                    variant={workflow.lastRunStatus === 'Success' ? 'success' : workflow.lastRunStatus === 'Failed' ? 'destructive' : 'warning'}
                    className="text-[10px] px-2 py-0 font-bold"
                  >
                    {workflow.lastRunStatus}
                  </Badge>
                ) : (
                  <p className="text-sm font-medium text-muted-foreground">N/A</p>
                )}
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Last Run Status</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: Run History ─── */}
      {activeTab === 'runs' && (
        <div className="space-y-4">
          {runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center">
              <GitBranch className="h-12 w-12 text-muted-foreground/40" />
              <p className="mt-4 text-sm text-muted-foreground">No runs yet for this workflow.</p>
              <Button variant="outline" className="mt-4 rounded-full" onClick={() => navigate('/workflows/new')}>
                <Play className="mr-2 h-4 w-4" /> Run this Workflow
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[700px]">
              <div className="space-y-3">
                {runs.map((run) => (
                  <RunCard
                    key={run.id}
                    run={run}
                    projects={projects}
                    expanded={expandedRun === run.id}
                    onToggle={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}

      {/* ─── Tab: Attach to Project ─── */}
      {activeTab === 'attach' && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold">Attach Workflow to Projects</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Select projects that should use this workflow pipeline.</p>
              </div>
              <Button
                size="sm"
                className="rounded-full gap-2"
                disabled={saving || pendingProjectIds === null}
                onClick={() => void handleSaveAttachments()}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Attachments
              </Button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                placeholder="Search projects by name, client, or status..."
                className="pl-10"
              />
            </div>

            <Separator className="mb-4" />

            {/* Project list */}
            <ScrollArea className="max-h-[500px]">
              <div className="space-y-2">
                {filteredProjects.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No projects found.</p>
                ) : (
                  filteredProjects.map((project) => {
                    const isAttached = currentProjectIds.includes(project.id);
                    return (
                      <label
                        key={project.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
                          isAttached ? 'border-primary/30 bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                      >
                        <Checkbox
                          checked={isAttached}
                          onChange={() => toggleProject(project.id)}
                          className="cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold truncate">{project.name}</span>
                            {project.status && (
                              <Badge
                                variant={project.status === 'Active' ? 'success' : 'secondary'}
                                className="text-[9px] px-1.5 py-0 rounded-full"
                              >
                                {project.status}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                            <span>Client: {project.clientId}</span>
                            <span>{project.patientCount} patients</span>
                            <span>{project.types.join(', ')}</span>
                          </div>
                        </div>
                        {isAttached && (
                          <Link className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            {/* Summary footer */}
            <Separator className="mt-4 mb-3" />
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{currentProjectIds.length} project{currentProjectIds.length !== 1 ? 's' : ''} attached</span>
              {pendingProjectIds !== null && (
                <span className="text-amber-600 font-medium">Unsaved changes</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Run Card Sub-Component ─── */

function RunCard({
  run,
  projects,
  expanded,
  onToggle,
}: {
  run: WorkflowRun;
  projects: { id: string; name: string }[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const project = projects.find((p) => p.id === run.projectId);
  const metrics = run.metrics;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Run summary row */}
      <button
        className="flex items-center gap-4 w-full p-4 text-left cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="shrink-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold">{run.id}</span>
            <Badge
              variant={RUN_STATUS_BADGE[run.status]}
              className="rounded-full px-2 py-0 text-[9px] font-bold"
            >
              {run.status}
            </Badge>
            <span className="text-[10px] text-muted-foreground">v{run.workflowVersion}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" /> {run.triggeredBy}
            </span>
            {project && (
              <span className="flex items-center gap-1">
                <FolderOpen className="h-3 w-3" /> {project.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {run.startedAt}
            </span>
            {run.completedAt && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> {run.completedAt}
              </span>
            )}
          </div>
        </div>

        {/* Metrics summary */}
        {metrics && (
          <div className="hidden sm:flex items-center gap-4 shrink-0">
            <MetricPill label="Precision" value={metrics.precision} />
            <MetricPill label="Recall" value={metrics.recall} />
            <MetricPill label="F1" value={metrics.f1} />
          </div>
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t px-4 py-4 space-y-4">
          {/* Metrics grid */}
          {metrics && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Run Metrics</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Precision', value: `${(metrics.precision * 100).toFixed(1)}%` },
                  { label: 'Recall', value: `${(metrics.recall * 100).toFixed(1)}%` },
                  { label: 'F1 Score', value: `${(metrics.f1 * 100).toFixed(1)}%` },
                  { label: 'Evidence Grounding', value: `${(metrics.evidenceGrounding * 100).toFixed(1)}%` },
                  { label: 'Total Findings', value: metrics.totalFindings },
                  { label: 'Total Issues', value: metrics.totalIssues },
                  { label: 'Avg Confidence', value: `${(metrics.avgConfidence * 100).toFixed(1)}%` },
                  { label: 'Processing Time', value: metrics.processingTime },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</p>
                    <p className="text-sm font-bold mt-0.5">{m.value}</p>
                  </div>
                ))}
              </div>
              {metrics.estimatedCost && (
                <p className="text-[11px] text-muted-foreground mt-2">Estimated cost: {metrics.estimatedCost}</p>
              )}
            </div>
          )}

          {/* Stage results */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Stage Results</p>
            <div className="rounded-lg border overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1.5fr_0.8fr_0.6fr_0.6fr_0.8fr_0.8fr] gap-2 px-3 py-2 bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Agent</span>
                <span>Status</span>
                <span className="text-right">Findings</span>
                <span className="text-right">Issues</span>
                <span className="text-right">Confidence</span>
                <span className="text-right">Time</span>
              </div>
              {run.stageResults.map((sr) => {
                const StatusIcon = STAGE_STATUS_ICON[sr.status] ?? CircleDot;
                return (
                  <div
                    key={sr.stageId}
                    className="grid grid-cols-[1.5fr_0.8fr_0.6fr_0.6fr_0.8fr_0.8fr] gap-2 px-3 py-2.5 border-t items-center text-xs"
                  >
                    <span className="font-medium truncate">{sr.agentName}</span>
                    <span className="flex items-center gap-1.5">
                      <StatusIcon className={`h-3 w-3 ${
                        sr.status === 'Completed' ? 'text-emerald-600' :
                        sr.status === 'Failed' ? 'text-destructive' :
                        sr.status === 'Running' ? 'text-blue-600 animate-spin' :
                        'text-muted-foreground'
                      }`} />
                      <span className="text-[11px]">{sr.status}</span>
                    </span>
                    <span className="text-right font-mono">{sr.findings}</span>
                    <span className={`text-right font-mono ${sr.issues > 0 ? 'text-destructive font-semibold' : ''}`}>{sr.issues}</span>
                    <span className="text-right">
                      <span className="font-mono">{(sr.confidence * 100).toFixed(0)}%</span>
                    </span>
                    <span className="text-right text-[11px] text-muted-foreground">
                      {sr.startedAt && sr.completedAt
                        ? formatDuration(sr.startedAt, sr.completedAt)
                        : sr.status === 'Running' ? 'In progress' : '--'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Helpers ─── */

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-xs font-bold">{(value * 100).toFixed(0)}%</p>
    </div>
  );
}

function formatDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (isNaN(ms) || ms < 0) return '--';
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const remSecs = secs % 60;
  return `${mins}m ${remSecs}s`;
}
