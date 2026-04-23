import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { getAgent } from '@/data/agents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  Clock,
  Filter,
  GitBranch,
  LayoutGrid,
  List,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Trash2,
  Workflow,
  Copy,
  Eye,
  Pencil,
  Archive,
  Link,
} from 'lucide-react';
import type { WorkflowStatus } from '@/types';

const STATUS_COLORS: Record<WorkflowStatus, string> = {
  Draft: 'secondary',
  Validated: 'processing',
  Published: 'success',
  Archived: 'warning',
};

function StagePills({ stages }: { stages: { agentId: string }[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {stages.slice(0, 5).map((s, i) => {
        const agent = getAgent(s.agentId);
        return (
          <span
            key={i}
            className="inline-flex items-center rounded-full bg-primary/8 px-2 py-0.5 text-[9px] font-bold text-primary border border-primary/15"
            title={agent?.name}
          >
            {agent?.shortName ?? '?'}
          </span>
        );
      })}
      {stages.length > 5 && (
        <span className="text-[10px] text-muted-foreground">+{stages.length - 5}</span>
      )}
    </div>
  );
}

export function WorkflowsPage() {
  const navigate = useNavigate();
  const { workflows, workflowRuns, projects, role, removeWorkflow } = useAppContext();

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<'all' | WorkflowStatus>('all');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      workflows.filter((wf) => {
        if (statusFilter !== 'all' && wf.status !== statusFilter) return false;
        const q = search.toLowerCase();
        return (
          wf.name.toLowerCase().includes(q) ||
          wf.description.toLowerCase().includes(q) ||
          wf.tags.some((t) => t.toLowerCase().includes(q)) ||
          wf.createdBy.toLowerCase().includes(q)
        );
      }),
    [workflows, search, statusFilter],
  );

  const statusCycle: ('all' | WorkflowStatus)[] = ['all', 'Draft', 'Validated', 'Published', 'Archived'];
  function cycleStatus() {
    const idx = statusCycle.indexOf(statusFilter);
    setStatusFilter(statusCycle[(idx + 1) % statusCycle.length]);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-purple-500/15 text-primary">
            <Workflow className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
            <p className="text-sm text-muted-foreground">
              Build, configure, and run multi-agent validation pipelines.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button size="lg" className="rounded-full px-6 text-sm font-semibold shadow-md" onClick={() => navigate('/workflows/new')}>
            <Plus className="mr-2 h-4 w-4" />
            CREATE WORKFLOW
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Workflows', value: workflows.length, icon: Workflow },
          { label: 'Published', value: workflows.filter((w) => w.status === 'Published').length, icon: Play },
          { label: 'Total Runs', value: workflowRuns.length, icon: GitBranch },
          { label: 'Agents Available', value: 15, icon: Bot },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <stat.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows by name, description, tag, or creator..."
            className="border-0 bg-transparent pl-10 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`rounded-md p-2 transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`rounded-md p-2 transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={cycleStatus}
          className={`rounded-md p-2 transition-colors cursor-pointer ${statusFilter !== 'all' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
          title={statusFilter === 'all' ? 'Filter by status' : `Showing: ${statusFilter}`}
        >
          <Filter className="h-4 w-4" />
        </button>
        {statusFilter !== 'all' && (
          <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full">
            {statusFilter}
          </Badge>
        )}
      </div>

      {/* Workflow cards */}
      <div className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'grid gap-3'}>
        {filtered.map((wf) => {
          const runs = workflowRuns.filter((r) => r.workflowId === wf.id);
          const attachedProjects = projects.filter((p) => wf.attachedProjectIds.includes(p.id));

          return (
            <div
              key={wf.id}
              className="group relative flex flex-col rounded-xl border bg-card transition-shadow hover:shadow-lg cursor-pointer"
              onClick={() => navigate(`/workflows/${wf.id}`)}
            >
              {/* Top */}
              <div className="flex items-center justify-between px-4 pt-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    variant={STATUS_COLORS[wf.status] as 'success' | 'processing' | 'secondary' | 'warning'}
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  >
                    {wf.status}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-medium">v{wf.version}</span>
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <div className="relative">
                    <button
                      className="rounded p-1 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => setOpenMenu(openMenu === wf.id ? null : wf.id)}
                    >
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {openMenu === wf.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                        <div className="absolute right-0 top-8 z-50 w-44 rounded-xl border bg-popover p-1 shadow-xl">
                          <button
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                            onClick={() => { navigate(`/workflows/${wf.id}`); setOpenMenu(null); }}
                          >
                            <Eye className="h-3.5 w-3.5" /> View
                          </button>
                          <button
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                            onClick={() => setOpenMenu(null)}
                          >
                            <Copy className="h-3.5 w-3.5" /> Duplicate
                          </button>
                          {role === 'Admin' && (
                            <>
                              <button
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                                onClick={() => setOpenMenu(null)}
                              >
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </button>
                              <button
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                                onClick={() => setOpenMenu(null)}
                              >
                                <Archive className="h-3.5 w-3.5" /> Archive
                              </button>
                              <button
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 cursor-pointer"
                                onClick={() => { void removeWorkflow(wf.id); setOpenMenu(null); }}
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Delete
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Name + description */}
              <div className="px-4 pt-3 pb-1">
                <h3 className="text-sm font-bold leading-tight truncate">{wf.name}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{wf.description}</p>
              </div>

              {/* Stage pills */}
              <div className="px-4 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Pipeline ({wf.stages.length} stages)
                </p>
                <StagePills stages={wf.stages} />
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Created by</p>
                  <p className="text-xs font-medium">{wf.createdBy}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Runs</p>
                  <p className="text-xs font-medium">{wf.runCount}</p>
                </div>
              </div>

              {/* Tags */}
              <div className="px-4 py-2">
                <div className="flex items-center gap-1 flex-wrap">
                  {wf.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Attached projects */}
              {attachedProjects.length > 0 && (
                <div className="px-4 py-2 border-t">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Attached Projects</p>
                  <div className="flex items-center gap-1 flex-wrap">
                    {attachedProjects.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium text-muted-foreground"
                      >
                        <Link className="h-2 w-2" />
                        {p.name.length > 25 ? p.name.slice(0, 25) + '...' : p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between border-t px-4 py-2.5 text-[11px] text-muted-foreground mt-auto">
                <span>
                  {wf.lastRunStatus && (
                    <Badge
                      variant={wf.lastRunStatus === 'Success' ? 'success' : wf.lastRunStatus === 'Failed' ? 'destructive' : 'warning'}
                      className="text-[9px] px-1.5 py-0 mr-1"
                    >
                      {wf.lastRunStatus}
                    </Badge>
                  )}
                  {runs.length} run{runs.length !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {wf.updatedAt}
                </span>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center">
            <Workflow className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-sm text-muted-foreground">
              {search || statusFilter !== 'all' ? 'No workflows match your filters' : 'No workflows yet'}
            </p>
            <Button variant="outline" className="mt-4 rounded-full" onClick={() => navigate('/workflows/new')}>
              <Plus className="mr-2 h-4 w-4" /> Create your first workflow
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
