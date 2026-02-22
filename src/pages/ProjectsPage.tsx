import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Copy,
  Filter,
  FolderOpen,
  LayoutGrid,
  List,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  Bookmark,
  MessageSquare,
} from 'lucide-react';

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary ring-2 ring-background">
      {initials}
    </div>
  );
}

function RoadmapDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i < current ? 'w-5 bg-primary' : 'w-3 bg-border'
          }`}
        />
      ))}
    </div>
  );
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, role, removeProject, dupProject } = useAppContext();
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Archived'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const filtered = useMemo(
    () =>
      projects.filter((p) => {
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.lead.toLowerCase().includes(q) ||
          p.types.some((t) => t.toLowerCase().includes(q))
        );
      }),
    [projects, search, statusFilter],
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects Home</h1>
            <p className="text-sm text-muted-foreground">
              Select a neurology validation workspace or initialize a new study cohort.
            </p>
          </div>
        </div>
        <Button
          size="lg"
          className="rounded-full px-6 text-sm font-semibold shadow-md"
          onClick={() => navigate('/projects/new')}
        >
          <Plus className="mr-2 h-4 w-4" />
          CREATE PROJECT
        </Button>
      </div>

      {/* Search + filter + view toggle */}
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name, lead, or type..."
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
        <div className="relative">
          <button
            onClick={() => setStatusFilter(statusFilter === 'all' ? 'Active' : statusFilter === 'Active' ? 'Archived' : 'all')}
            className={`rounded-md p-2 transition-colors cursor-pointer ${statusFilter !== 'all' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
          >
            <Filter className="h-4 w-4" />
          </button>
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="absolute -top-2 -right-4 text-[9px] px-1.5 py-0">
              {statusFilter}
            </Badge>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'grid gap-3'}>
        {filtered.map((project) => (
          <div
            key={project.id}
            className="group relative flex flex-col rounded-xl border bg-card transition-shadow hover:shadow-lg cursor-pointer"
            onClick={() => navigate(`/projects/${project.id}/criteria`)}
          >
            {/* Top row: badges + icons + menu */}
            <div className="flex items-center justify-between px-4 pt-4">
              <div className="flex items-center gap-1.5">
                {project.types.map((t, idx) => (
                  <Badge
                    key={`${t}-${idx}`}
                    variant={t === 'RWE' ? 'processing' : 'warning'}
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  >
                    {t}
                  </Badge>
                ))}
                {project.status === 'Archived' && (
                  <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px]">
                    Archived
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {project.shared ? (
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="relative">
                  <button
                    className="rounded p-1 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => setOpenMenu(openMenu === project.id ? null : project.id)}
                  >
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {openMenu === project.id && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                      <div className="absolute right-0 top-8 z-50 w-44 rounded-xl border bg-popover p-1 shadow-xl">
                        <button
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                          onClick={() => { navigate(`/projects/${project.id}/criteria`); setOpenMenu(null); }}
                        >
                          <FolderOpen className="h-3.5 w-3.5" /> Open
                        </button>
                        <button
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                          onClick={() => { void dupProject(project.id); setOpenMenu(null); }}
                        >
                          <Copy className="h-3.5 w-3.5" /> Duplicate
                        </button>
                        {role === 'Admin' && (
                          <>
                            <button
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                              onClick={() => { setEditingId(project.id); setEditName(project.name); setOpenMenu(null); }}
                            >
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 cursor-pointer"
                              onClick={() => { void removeProject(project.id); setOpenMenu(null); }}
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

            {/* Project name */}
            <div className="px-4 pt-3 pb-2">
              {editingId === project.id ? (
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Escape') setEditingId(null); }}
                  />
                  <Button size="sm" onClick={() => setEditingId(null)}>Save</Button>
                </div>
              ) : (
                <h3 className="text-sm font-bold uppercase leading-tight tracking-wide truncate">
                  {project.name}
                </h3>
              )}
            </div>

            {/* Metadata rows */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 pb-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Lead</p>
                <p className="text-xs font-medium truncate">{project.lead}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data Source</p>
                <p className="text-xs font-medium truncate">{project.dataSource}</p>
              </div>
              {project.patientCount > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Patients</p>
                  <p className="text-xs font-medium">{project.patientCount.toLocaleString()}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Shared</p>
                <p className="text-xs font-medium">{project.shared ? 'Shared' : 'Private'}</p>
              </div>
            </div>

            {/* Team avatars */}
            <div className="flex items-center gap-0 px-4 pb-3">
              <div className="flex -space-x-1.5">
                {project.teamAvatars.map((initials, idx) => (
                  <Avatar key={`${initials}-${idx}`} initials={initials} />
                ))}
              </div>
              {project.teamAvatars.length > 2 && (
                <span className="ml-2 text-[10px] text-muted-foreground">
                  +{project.teamAvatars.length - 2}
                </span>
              )}
            </div>

            {/* Study roadmap */}
            <div className="border-t px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Study Roadmap
                </p>
                <Badge
                  variant={project.stageProgress >= 75 ? 'success' : project.stageProgress >= 40 ? 'processing' : 'secondary'}
                  className="text-[10px] px-2 py-0 rounded-full"
                >
                  {project.stageProgress}%
                </Badge>
              </div>
              <RoadmapDots current={project.currentStage} total={project.totalStages} />
            </div>

            {/* Card footer */}
            <div className="flex items-center justify-between border-t px-4 py-2.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="text-primary font-semibold">{project.stageProgress}%</span>
                Stage {project.currentStage} of {project.totalStages}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {project.lastUpdated}
              </span>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-sm text-muted-foreground">No projects found</p>
            <Button variant="outline" className="mt-4 rounded-full" onClick={() => navigate('/projects/new')}>
              <Plus className="mr-2 h-4 w-4" /> Create your first project
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
