import { Fragment, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import type { Client } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  DatabaseZap,
  Filter,
  FlaskConical,
  FolderOpen,
  LayoutGrid,
  List,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  Bookmark,
  MessageSquare,
  X,
} from 'lucide-react';

/* ─── Mock Data Sync Log ─── */
type SyncEntry = {
  date: string; provider: string; sqlSchema: string; sqlLastTransfer: string; sqlRows: number;
  lastSync: string; esIndex: string; esRecords: number;
  meta: { sqlNdids: number; sqlEncounterIds: number; sqlAvgCharSize: number; esNdids: number; esEncounterIds: number; esAvgCharSize: number; tableCount: number; lastFullRefresh: string; incrementalSince: string; status: string };
};
const SYNC_LOG: SyncEntry[] = [
  { date: '2026-02-20', provider: 'Dent', sqlSchema: 'RGD_dent_udm', sqlLastTransfer: '2026-02-20 08:15:22', sqlRows: 215_600, lastSync: '2026-02-20 08:32:10', esIndex: 'dent_udm_idx', esRecords: 215_600, meta: { sqlNdids: 18_420, sqlEncounterIds: 87_340, sqlAvgCharSize: 2_450, esNdids: 18_420, esEncounterIds: 87_340, esAvgCharSize: 2_440, tableCount: 12, lastFullRefresh: '2026-02-15 02:00:00', incrementalSince: '2026-02-19 08:00:00', status: 'Healthy' } },
  { date: '2026-02-20', provider: 'Dent', sqlSchema: 'dent_progress_notes', sqlLastTransfer: '2026-02-20 08:20:45', sqlRows: 342_100, lastSync: '2026-02-20 08:45:30', esIndex: 'dent_notes_idx', esRecords: 341_820, meta: { sqlNdids: 18_420, sqlEncounterIds: 92_510, sqlAvgCharSize: 5_820, esNdids: 18_400, esEncounterIds: 92_380, esAvgCharSize: 5_810, tableCount: 4, lastFullRefresh: '2026-02-15 02:00:00', incrementalSince: '2026-02-19 08:00:00', status: 'Healthy' } },
  { date: '2026-02-20', provider: 'FCN', sqlSchema: 'RGD_fcn_udm', sqlLastTransfer: '2026-02-20 07:45:00', sqlRows: 98_320, lastSync: '2026-02-20 08:01:45', esIndex: 'fcn_udm_idx', esRecords: 97_815, meta: { sqlNdids: 11_200, sqlEncounterIds: 42_850, sqlAvgCharSize: 2_180, esNdids: 11_180, esEncounterIds: 42_720, esAvgCharSize: 2_170, tableCount: 10, lastFullRefresh: '2026-02-14 02:00:00', incrementalSince: '2026-02-19 07:00:00', status: 'Healthy' } },
  { date: '2026-02-20', provider: 'FCN', sqlSchema: 'fcn_progress_notes', sqlLastTransfer: '2026-02-20 07:50:10', sqlRows: 156_700, lastSync: '2026-02-20 08:10:20', esIndex: 'fcn_notes_idx', esRecords: 156_700, meta: { sqlNdids: 11_200, sqlEncounterIds: 44_300, sqlAvgCharSize: 4_950, esNdids: 11_200, esEncounterIds: 44_300, esAvgCharSize: 4_950, tableCount: 3, lastFullRefresh: '2026-02-14 02:00:00', incrementalSince: '2026-02-19 07:00:00', status: 'Healthy' } },
  { date: '2026-02-19', provider: 'TNG', sqlSchema: 'RGD_tng_udm', sqlLastTransfer: '2026-02-19 22:30:15', sqlRows: 67_400, lastSync: '2026-02-19 23:05:30', esIndex: 'tng_udm_idx', esRecords: 67_400, meta: { sqlNdids: 8_950, sqlEncounterIds: 31_200, sqlAvgCharSize: 2_340, esNdids: 8_950, esEncounterIds: 31_200, esAvgCharSize: 2_340, tableCount: 11, lastFullRefresh: '2026-02-13 02:00:00', incrementalSince: '2026-02-18 22:00:00', status: 'Healthy' } },
  { date: '2026-02-19', provider: 'TNG', sqlSchema: 'tng_progress_notes', sqlLastTransfer: '2026-02-19 22:35:00', sqlRows: 89_600, lastSync: '2026-02-19 23:15:40', esIndex: 'tng_notes_idx', esRecords: 89_120, meta: { sqlNdids: 8_950, sqlEncounterIds: 33_100, sqlAvgCharSize: 5_150, esNdids: 8_920, esEncounterIds: 32_980, esAvgCharSize: 5_080, tableCount: 3, lastFullRefresh: '2026-02-13 02:00:00', incrementalSince: '2026-02-18 22:00:00', status: 'Delta detected' } },
  { date: '2026-02-19', provider: 'Arizona', sqlSchema: 'RGD_arizona_udm', sqlLastTransfer: '2026-02-19 22:30:15', sqlRows: 184_320, lastSync: '2026-02-19 23:12:40', esIndex: 'arizona_udm_idx', esRecords: 183_900, meta: { sqlNdids: 22_100, sqlEncounterIds: 78_600, sqlAvgCharSize: 2_620, esNdids: 22_050, esEncounterIds: 78_340, esAvgCharSize: 2_610, tableCount: 14, lastFullRefresh: '2026-02-12 02:00:00', incrementalSince: '2026-02-18 22:00:00', status: 'Minor delta' } },
  { date: '2026-02-19', provider: 'Arizona', sqlSchema: 'arizona_progress_notes', sqlLastTransfer: '2026-02-19 22:40:00', sqlRows: 265_800, lastSync: '2026-02-19 23:25:50', esIndex: 'arizona_notes_idx', esRecords: 265_800, meta: { sqlNdids: 22_100, sqlEncounterIds: 81_200, sqlAvgCharSize: 6_240, esNdids: 22_100, esEncounterIds: 81_200, esAvgCharSize: 6_240, tableCount: 4, lastFullRefresh: '2026-02-12 02:00:00', incrementalSince: '2026-02-18 22:00:00', status: 'Healthy' } },
  { date: '2026-02-18', provider: 'MIND', sqlSchema: 'RGD_mind_udm', sqlLastTransfer: '2026-02-18 03:00:00', sqlRows: 128_500, lastSync: '2026-02-18 03:22:05', esIndex: 'mind_udm_idx', esRecords: 128_500, meta: { sqlNdids: 14_800, sqlEncounterIds: 56_200, sqlAvgCharSize: 2_250, esNdids: 14_800, esEncounterIds: 56_200, esAvgCharSize: 2_250, tableCount: 10, lastFullRefresh: '2026-02-11 02:00:00', incrementalSince: '2026-02-17 03:00:00', status: 'Healthy' } },
  { date: '2026-02-18', provider: 'MIND', sqlSchema: 'mind_progress_notes', sqlLastTransfer: '2026-02-18 03:10:00', sqlRows: 178_300, lastSync: '2026-02-18 03:35:15', esIndex: 'mind_notes_idx', esRecords: 178_300, meta: { sqlNdids: 14_800, sqlEncounterIds: 58_900, sqlAvgCharSize: 5_520, esNdids: 14_800, esEncounterIds: 58_900, esAvgCharSize: 5_520, tableCount: 3, lastFullRefresh: '2026-02-11 02:00:00', incrementalSince: '2026-02-17 03:00:00', status: 'Healthy' } },
  { date: '2026-02-17', provider: 'Raleigh', sqlSchema: 'RGD_raleigh_udm', sqlLastTransfer: '2026-02-17 03:00:00', sqlRows: 74_200, lastSync: '2026-02-17 03:18:30', esIndex: 'raleigh_udm_idx', esRecords: 74_200, meta: { sqlNdids: 9_600, sqlEncounterIds: 34_500, sqlAvgCharSize: 2_050, esNdids: 9_600, esEncounterIds: 34_500, esAvgCharSize: 2_050, tableCount: 9, lastFullRefresh: '2026-02-10 02:00:00', incrementalSince: '2026-02-16 03:00:00', status: 'Healthy' } },
  { date: '2026-02-17', provider: 'Raleigh', sqlSchema: 'raleigh_progress_notes', sqlLastTransfer: '2026-02-17 03:05:00', sqlRows: 102_400, lastSync: '2026-02-17 03:28:40', esIndex: 'raleigh_notes_idx', esRecords: 102_400, meta: { sqlNdids: 9_600, sqlEncounterIds: 36_100, sqlAvgCharSize: 4_720, esNdids: 9_600, esEncounterIds: 36_100, esAvgCharSize: 4_720, tableCount: 3, lastFullRefresh: '2026-02-10 02:00:00', incrementalSince: '2026-02-16 03:00:00', status: 'Healthy' } },
  { date: '2026-02-17', provider: 'JWM', sqlSchema: 'RGD_jwm_udm', sqlLastTransfer: '2026-02-17 03:00:00', sqlRows: 53_800, lastSync: '2026-02-17 03:14:20', esIndex: 'jwm_udm_idx', esRecords: 53_210, meta: { sqlNdids: 6_800, sqlEncounterIds: 24_100, sqlAvgCharSize: 1_940, esNdids: 6_750, esEncounterIds: 23_900, esAvgCharSize: 1_920, tableCount: 8, lastFullRefresh: '2026-02-09 02:00:00', incrementalSince: '2026-02-16 03:00:00', status: 'Minor delta' } },
  { date: '2026-02-17', provider: 'JWM', sqlSchema: 'jwm_progress_notes', sqlLastTransfer: '2026-02-17 03:08:00', sqlRows: 71_500, lastSync: '2026-02-17 03:22:55', esIndex: 'jwm_notes_idx', esRecords: 71_500, meta: { sqlNdids: 6_800, sqlEncounterIds: 25_400, sqlAvgCharSize: 4_380, esNdids: 6_800, esEncounterIds: 25_400, esAvgCharSize: 4_380, tableCount: 3, lastFullRefresh: '2026-02-09 02:00:00', incrementalSince: '2026-02-16 03:00:00', status: 'Healthy' } },
];

const PROVIDER_COLORS: Record<string, string> = {
  Dent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  FCN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  TNG: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Arizona: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  MIND: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Raleigh: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  JWM: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

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
        <div key={i} className={`h-1.5 rounded-full transition-all ${i < current ? 'w-5 bg-primary' : 'w-3 bg-border'}`} />
      ))}
    </div>
  );
}

const CLIENT_COLORS: Record<string, string> = {
  Biogen: 'bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-800',
  Lilly: 'bg-red-500/10 text-red-700 border-red-200 dark:text-red-400 dark:border-red-800',
  Biohaven: 'bg-purple-500/10 text-purple-700 border-purple-200 dark:text-purple-400 dark:border-purple-800',
  Roche: 'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800',
  AbbVie: 'bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800',
};

function ClientTag({ name }: { name: string }) {
  const color = CLIENT_COLORS[name] ?? 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${color}`}>
      <Building2 className="h-2.5 w-2.5" />
      {name}
    </span>
  );
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, clients, role, removeProject, dupProject, addClient } = useAppContext();
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Archived'>('all');
  const [clientFilter, setClientFilter] = useState('all');

  // Client sheet
  const [clientSheetOpen, setClientSheetOpen] = useState(false);
  // Data sync log
  const [syncLogOpen, setSyncLogOpen] = useState(false);
  const [expandedSyncRows, setExpandedSyncRows] = useState<Set<number>>(new Set());
  function toggleSyncRow(idx: number) { setExpandedSyncRows((prev) => { const n = new Set(prev); if (n.has(idx)) n.delete(idx); else n.add(idx); return n; }); }
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [newClient, setNewClient] = useState<Partial<Client>>({ name: '', industry: '', contactName: '', contactEmail: '', contractedRevenue: '', notes: '', status: 'Active' as const });

  const clientMap = useMemo(() => {
    const m = new Map<string, string>();
    clients.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [clients]);

  const filtered = useMemo(
    () =>
      projects.filter((p) => {
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        if (clientFilter !== 'all' && p.clientId !== clientFilter) return false;
        const q = search.toLowerCase();
        const cName = clientMap.get(p.clientId) ?? '';
        return (
          p.name.toLowerCase().includes(q) ||
          p.lead.toLowerCase().includes(q) ||
          p.types.some((t) => t.toLowerCase().includes(q)) ||
          cName.toLowerCase().includes(q)
        );
      }),
    [projects, search, statusFilter, clientFilter, clientMap],
  );

  const clientProjectCounts = useMemo(() => {
    const m = new Map<string, number>();
    projects.forEach((p) => m.set(p.clientId, (m.get(p.clientId) ?? 0) + 1));
    return m;
  }, [projects]);

  function handleAddClient() {
    if (!newClient.name?.trim()) return;
    const c: Client = {
      id: `cli-${Math.random().toString(36).slice(2, 8)}`,
      name: newClient.name.trim(),
      logo: newClient.name.trim().slice(0, 2).toUpperCase(),
      industry: newClient.industry ?? '',
      contactName: newClient.contactName ?? '',
      contactEmail: newClient.contactEmail ?? '',
      contractedRevenue: newClient.contractedRevenue ?? '$0',
      status: (newClient.status as 'Active' | 'Inactive') ?? 'Active',
      notes: newClient.notes ?? '',
      createdAt: new Date().toISOString().split('T')[0],
    };
    void addClient(c);
    setNewClient({ name: '', industry: '', contactName: '', contactEmail: '', contractedRevenue: '', notes: '', status: 'Active' });
    setAddClientOpen(false);
  }

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/quantisation')}
            className="flex h-9 w-9 items-center justify-center rounded-full border bg-card text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer"
            title="Model Quantisation"
          >
            <FlaskConical className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSyncLogOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border bg-card text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer"
            title="Data Sync Log"
          >
            <DatabaseZap className="h-4 w-4" />
          </button>
          <Button variant="outline" className="rounded-full px-5 text-sm font-semibold" onClick={() => setClientSheetOpen(true)}>
            <Building2 className="mr-2 h-4 w-4" />
            View all Clients
          </Button>
          <Button size="lg" className="rounded-full px-6 text-sm font-semibold shadow-md" onClick={() => navigate('/projects/new')}>
            <Plus className="mr-2 h-4 w-4" />
            CREATE PROJECT
          </Button>
        </div>
      </div>

      {/* Search + filter + view toggle */}
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name, lead, type, or client..."
            className="border-0 bg-transparent pl-10 shadow-none focus-visible:ring-0"
          />
        </div>
        {/* Client filter */}
        <Select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="h-9 w-auto text-xs border-muted-foreground/15"
        >
          <option value="all">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
          <button onClick={() => setViewMode('grid')} className={`rounded-md p-2 transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button onClick={() => setViewMode('list')} className={`rounded-md p-2 transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <List className="h-4 w-4" />
          </button>
        </div>
        <button
          onClick={() => setStatusFilter(statusFilter === 'all' ? 'Active' : statusFilter === 'Active' ? 'Archived' : 'all')}
          className={`rounded-md p-2 transition-colors cursor-pointer ${statusFilter !== 'all' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
        >
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {/* Cards */}
      <div className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'grid gap-3'}>
        {filtered.map((project) => {
          const clientName = clientMap.get(project.clientId) ?? 'Unknown';
          return (
            <div
              key={project.id}
              className="group relative flex flex-col rounded-xl border bg-card transition-shadow hover:shadow-lg cursor-pointer"
              onClick={() => navigate(project.flowType === 'ct' || project.types.includes('CT') ? `/projects/${project.id}/ct-overview` : `/projects/${project.id}/criteria`)}
            >
              {/* Top row */}
              <div className="flex items-center justify-between px-4 pt-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <ClientTag name={clientName} />
                  {project.types.map((t, idx) => (
                    <Badge key={`${t}-${idx}`} variant={t === 'RWE' ? 'processing' : t === 'CT' ? 'default' : 'warning'} className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${t === 'CT' ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0' : ''}`}>{t}</Badge>
                  ))}
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {project.shared ? <Users className="h-3.5 w-3.5 text-muted-foreground" /> : <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="relative">
                    <button className="rounded p-1 hover:bg-muted transition-colors cursor-pointer" onClick={() => setOpenMenu(openMenu === project.id ? null : project.id)}>
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {openMenu === project.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                        <div className="absolute right-0 top-8 z-50 w-44 rounded-xl border bg-popover p-1 shadow-xl">
                          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent cursor-pointer" onClick={() => { navigate(project.flowType === 'ct' || project.types.includes('CT') ? `/projects/${project.id}/ct-overview` : `/projects/${project.id}/criteria`); setOpenMenu(null); }}>
                            <FolderOpen className="h-3.5 w-3.5" /> Open
                          </button>
                          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent cursor-pointer" onClick={() => { void dupProject(project.id); setOpenMenu(null); }}>
                            <Copy className="h-3.5 w-3.5" /> Duplicate
                          </button>
                          {role === 'Admin' && (
                            <>
                              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent cursor-pointer" onClick={() => setOpenMenu(null)}>
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </button>
                              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 cursor-pointer" onClick={() => { void removeProject(project.id); setOpenMenu(null); }}>
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

              {/* Project name + description */}
              <div className="px-4 pt-3 pb-1">
                <h3 className="text-sm font-bold uppercase leading-tight tracking-wide truncate">{project.name}</h3>
                {project.description && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{project.description}</p>
                )}
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-2">
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
              <div className="flex items-center gap-0 px-4 pb-2">
                <div className="flex -space-x-1.5">
                  {project.teamAvatars.map((initials, idx) => (
                    <Avatar key={`${initials}-${idx}`} initials={initials} />
                  ))}
                </div>
                {project.teamAvatars.length > 2 && (
                  <span className="ml-2 text-[10px] text-muted-foreground">+{project.teamAvatars.length - 2}</span>
                )}
              </div>

              {/* Roadmap */}
              <div className="border-t px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Study Roadmap</p>
                  <Badge variant={project.stageProgress >= 75 ? 'success' : project.stageProgress >= 40 ? 'processing' : 'secondary'} className="text-[10px] px-2 py-0 rounded-full">{project.stageProgress}%</Badge>
                </div>
                <RoadmapDots current={project.currentStage} total={project.totalStages} />
              </div>

              {/* Footer */}
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
          );
        })}

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

      {/* ==================== DATA SYNC LOG ==================== */}
      <Dialog
        open={syncLogOpen}
        onClose={() => { setSyncLogOpen(false); setExpandedSyncRows(new Set()); }}
        title="Data Sync Log"
        description="Track data transfer from SQL to Elasticsearch — schema availability, record counts, and fill rates"
        fullscreen
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <DatabaseZap className="h-4 w-4 text-primary" />
              <span>{SYNC_LOG.length} sync entries across {[...new Set(SYNC_LOG.map((r) => r.provider))].length} providers</span>
              <span className="text-[10px]">·</span>
              <span className="text-[10px]">Last updated: {SYNC_LOG[0]?.lastSync ?? 'N/A'}</span>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-1.5 h-3 w-3" /> Refresh
            </Button>
          </div>

          <div className="rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="w-8 px-2 py-3" />
                    <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Provider</th>
                    <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SQL Schema</th>
                    <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SQL Last Transfer</th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SQL Rows</th>
                    <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Last Sync (SQL → ES)</th>
                    <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ES Index</th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ES Records</th>
                    <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fill Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {SYNC_LOG.map((row, i) => {
                    const fillRate = row.sqlRows > 0 ? (row.esRecords / row.sqlRows) * 100 : 0;
                    const fillVariant = fillRate >= 100 ? 'success' : fillRate >= 99 ? 'processing' : fillRate >= 95 ? 'warning' : 'destructive';
                    const isOpen = expandedSyncRows.has(i);
                    const provColor = PROVIDER_COLORS[row.provider] ?? 'bg-muted text-muted-foreground';
                    return (
                      <Fragment key={i}>
                        <tr onClick={() => toggleSyncRow(i)} className="border-b hover:bg-muted/20 transition-colors cursor-pointer">
                          <td className="px-2 py-2.5 text-center">
                            {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground inline" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground inline" />}
                          </td>
                          <td className="px-3 py-2.5 text-xs font-medium">{row.date}</td>
                          <td className="px-3 py-2.5">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${provColor}`}>{row.provider}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{row.sqlSchema}</code>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{row.sqlLastTransfer}</td>
                          <td className="px-3 py-2.5 text-xs font-medium text-right tabular-nums">{row.sqlRows.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-xs text-muted-foreground">{row.lastSync}</td>
                          <td className="px-3 py-2.5">
                            <code className="rounded bg-primary/10 text-primary px-1.5 py-0.5 text-xs font-mono">{row.esIndex}</code>
                          </td>
                          <td className="px-3 py-2.5 text-xs font-medium text-right tabular-nums">{row.esRecords.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right">
                            <Badge variant={fillVariant} className="text-[10px] px-2 py-0 font-bold tabular-nums">
                              {fillRate.toFixed(2)}%
                            </Badge>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="border-b bg-muted/10">
                            <td colSpan={10} className="px-6 py-3">
                              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">SQL Details</p>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="rounded-lg border p-2">
                                      <p className="text-muted-foreground text-[10px]">No. of NDIDs</p>
                                      <p className="font-bold tabular-nums">{row.meta.sqlNdids.toLocaleString()}</p>
                                    </div>
                                    <div className="rounded-lg border p-2">
                                      <p className="text-muted-foreground text-[10px]">No. of Encounter IDs</p>
                                      <p className="font-bold tabular-nums">{row.meta.sqlEncounterIds.toLocaleString()}</p>
                                    </div>
                                    <div className="rounded-lg border p-2">
                                      <p className="text-muted-foreground text-[10px]">Table Count</p>
                                      <p className="font-bold">{row.meta.tableCount}</p>
                                    </div>
                                    <div className="rounded-lg border p-2">
                                      <p className="text-muted-foreground text-[10px]">Avg Character Size</p>
                                      <p className="font-bold tabular-nums">{row.meta.sqlAvgCharSize.toLocaleString()}</p>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">ES Details</p>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="rounded-lg border p-2">
                                      <p className="text-muted-foreground text-[10px]">No. of NDIDs</p>
                                      <p className="font-bold tabular-nums">{row.meta.esNdids.toLocaleString()}</p>
                                    </div>
                                    <div className="rounded-lg border p-2">
                                      <p className="text-muted-foreground text-[10px]">No. of Encounter IDs</p>
                                      <p className="font-bold tabular-nums">{row.meta.esEncounterIds.toLocaleString()}</p>
                                    </div>
                                    <div className="rounded-lg border p-2">
                                      <p className="text-muted-foreground text-[10px]">Avg Character Size</p>
                                      <p className="font-bold tabular-nums">{row.meta.esAvgCharSize.toLocaleString()}</p>
                                    </div>
                                    <div className="rounded-lg border p-2">
                                      <p className="text-muted-foreground text-[10px]">Last Full Refresh</p>
                                      <p className="font-bold text-[11px]">{row.meta.lastFullRefresh}</p>
                                    </div>
                                    <div className="rounded-lg border p-2 col-span-2">
                                      <p className="text-muted-foreground text-[10px]">Incremental Since</p>
                                      <p className="font-bold text-[11px]">{row.meta.incrementalSince}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 flex items-center gap-4 text-xs">
                                <span className="text-muted-foreground">NDID Fill: <strong className="text-foreground">{row.meta.sqlNdids > 0 ? ((row.meta.esNdids / row.meta.sqlNdids) * 100).toFixed(2) : 0}%</strong></span>
                                <span className="text-muted-foreground">Encounter Fill: <strong className="text-foreground">{row.meta.sqlEncounterIds > 0 ? ((row.meta.esEncounterIds / row.meta.sqlEncounterIds) * 100).toFixed(2) : 0}%</strong></span>
                                <Badge variant={row.meta.status === 'Healthy' ? 'success' : row.meta.status === 'Minor delta' ? 'processing' : 'warning'} className="text-[10px] px-2 py-0">{row.meta.status}</Badge>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground text-sm">Legend</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span><Badge variant="success" className="text-[9px] px-1.5 py-0">100%</Badge> — Full sync, all SQL rows indexed in ES</span>
              <span><Badge variant="processing" className="text-[9px] px-1.5 py-0">≥ 99%</Badge> — Near-complete, minor delta</span>
              <span><Badge variant="warning" className="text-[9px] px-1.5 py-0">≥ 95%</Badge> — Partial sync, investigation recommended</span>
              <span><Badge variant="destructive" className="text-[9px] px-1.5 py-0">&lt; 95%</Badge> — Sync failure, action required</span>
            </div>
          </div>
        </div>
      </Dialog>

      {/* ==================== VIEW ALL CLIENTS SHEET ==================== */}
      <Dialog
        open={clientSheetOpen}
        onClose={() => { setClientSheetOpen(false); setAddClientOpen(false); }}
        title="All Clients"
        description="Pharma clients, associated projects, and contract details"
        fullscreen
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{clients.length} clients registered</p>
            <Button onClick={() => setAddClientOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add new client
            </Button>
          </div>

          {/* Add client form */}
          {addClientOpen && (
            <div className="rounded-xl border bg-muted/30 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">New Client</h3>
                <button onClick={() => setAddClientOpen(false)} className="rounded p-1 hover:bg-muted cursor-pointer"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Client name *</label>
                  <Input value={newClient.name} onChange={(e) => setNewClient((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Novartis" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Industry</label>
                  <Input value={newClient.industry} onChange={(e) => setNewClient((p) => ({ ...p, industry: e.target.value }))} placeholder="e.g. Neuroscience Biopharma" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Contact name</label>
                  <Input value={newClient.contactName} onChange={(e) => setNewClient((p) => ({ ...p, contactName: e.target.value }))} placeholder="Dr. Jane Smith" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Contact email</label>
                  <Input value={newClient.contactEmail} onChange={(e) => setNewClient((p) => ({ ...p, contactEmail: e.target.value }))} placeholder="j.smith@pharma.com" type="email" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Contracted revenue</label>
                  <Input value={newClient.contractedRevenue} onChange={(e) => setNewClient((p) => ({ ...p, contractedRevenue: e.target.value }))} placeholder="$1.5M" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Status</label>
                  <Select value={newClient.status} onChange={(e) => setNewClient((p) => ({ ...p, status: e.target.value as 'Active' | 'Inactive' }))}>
                    <option>Active</option>
                    <option>Inactive</option>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Notes</label>
                <Textarea value={newClient.notes} onChange={(e) => setNewClient((p) => ({ ...p, notes: e.target.value }))} placeholder="Additional details about the engagement..." rows={2} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddClientOpen(false)}>Cancel</Button>
                <Button onClick={handleAddClient} disabled={!newClient.name?.trim()}>Create Client</Button>
              </div>
            </div>
          )}

          <Separator />

          {/* Client cards */}
          <ScrollArea className="max-h-[calc(100vh-320px)]">
            <div className="grid gap-4 sm:grid-cols-2">
              {clients.map((client) => {
                const projCount = clientProjectCounts.get(client.id) ?? 0;
                const clientProjects = projects.filter((p) => p.clientId === client.id);
                return (
                  <div key={client.id} className="rounded-xl border bg-card p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${CLIENT_COLORS[client.name] ?? 'bg-muted text-muted-foreground'}`}>
                          {client.logo}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold">{client.name}</h3>
                          <p className="text-[11px] text-muted-foreground">{client.industry}</p>
                        </div>
                      </div>
                      <Badge variant={client.status === 'Active' ? 'success' : 'secondary'}>{client.status}</Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground font-medium">Projects</p>
                        <p className="font-bold text-lg">{projCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium">Revenue</p>
                        <p className="font-bold text-lg">{client.contractedRevenue}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium">Since</p>
                        <p className="font-bold">{client.createdAt}</p>
                      </div>
                    </div>

                    <div className="text-xs">
                      <p className="text-muted-foreground font-medium">Contact</p>
                      <p>{client.contactName} · <span className="text-primary">{client.contactEmail}</span></p>
                    </div>

                    {client.notes && (
                      <p className="text-[11px] text-muted-foreground italic">{client.notes}</p>
                    )}

                    {clientProjects.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Associated Projects</p>
                        {clientProjects.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() => { setClientSheetOpen(false); navigate(p.flowType === 'ct' || p.types.includes('CT') ? `/projects/${p.id}/ct-overview` : `/projects/${p.id}/criteria`); }}
                          >
                            <span className="font-medium truncate">{p.name}</span>
                            <div className="flex items-center gap-1.5">
                              {p.types.map((t, i) => (
                                <Badge key={`${t}-${i}`} variant={t === 'RWE' ? 'processing' : 'warning'} className="text-[9px] px-1.5 py-0">{t}</Badge>
                              ))}
                              <Badge variant={p.status === 'Active' ? 'success' : 'secondary'} className="text-[9px] px-1.5 py-0">{p.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </Dialog>
    </div>
  );
}
