import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import type { CohortImport, CohortSource } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import {
  ArrowRight,
  DatabaseZap,
  Download,
  Filter,
  FlaskConical,
  Plus,
  Search,
  Upload,
} from 'lucide-react';

const SOURCE_LABELS: Record<CohortSource, string> = {
  NeuroTerminal: 'NeuroTerminal',
  CohortBuilder: 'Cohort Builder',
  Manual: 'Manual Import',
};

export function DataVaultPage() {
  const navigate = useNavigate();
  const { cohortImports, addCohortImport, currentUser } = useAppContext();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<CohortSource | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<CohortImport['status'] | 'All'>('All');
  const [importOpen, setImportOpen] = useState(false);
  const [importName, setImportName] = useState('');
  const [importSource, setImportSource] = useState<CohortSource>('NeuroTerminal');
  const [importing, setImporting] = useState(false);

  const filtered = useMemo(() => {
    return cohortImports.filter((c) => {
      if (sourceFilter !== 'All' && c.source !== sourceFilter) return false;
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.metadata.indication?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [cohortImports, sourceFilter, statusFilter, search]);

  async function handleSimulatedImport() {
    if (!importName.trim()) return;
    setImporting(true);
    const newCohort: CohortImport = {
      id: `cohort-${Date.now()}`,
      name: importName.trim(),
      source: importSource,
      importedAt: new Date().toISOString(),
      importedBy: currentUser,
      status: 'Active',
      criteria: [
        { id: 'C1', name: 'Sample Criterion 1', type: 'inclusion', description: 'Auto-generated placeholder criterion', atoms: [{ id: 'C1-a1', label: 'Placeholder atom', structuredExpression: 'placeholder == true', dataSource: 'structured' }], atomLogic: 'AND', category: 'Clinical' },
        { id: 'C2', name: 'Sample Criterion 2', type: 'exclusion', description: 'Auto-generated placeholder criterion', atoms: [{ id: 'C2-a1', label: 'Placeholder atom', structuredExpression: 'placeholder == false', dataSource: 'structured' }], atomLogic: 'AND', category: 'Clinical' },
      ],
      patients: [
        { patientId: 'PT-NEW-01', flags: [{ criterionId: 'C1', value: true }, { criterionId: 'C2', value: false }], eligible: true },
        { patientId: 'PT-NEW-02', flags: [{ criterionId: 'C1', value: false }, { criterionId: 'C2', value: false }], eligible: false },
        { patientId: 'PT-NEW-03', flags: [{ criterionId: 'C1', value: true }, { criterionId: 'C2', value: true }], eligible: false },
      ],
      metadata: { totalPatients: 3, eligibleCount: 1, ineligibleCount: 2, trialName: importName.trim(), indication: 'Neurology' },
    };
    await addCohortImport(newCohort);
    setImporting(false);
    setImportOpen(false);
    setImportName('');
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <DatabaseZap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Data Vault</h1>
            <p className="text-sm text-muted-foreground">
              Imported clinical trial cohorts from NeuroTerminal & Cohort Builder
            </p>
          </div>
        </div>
        <button
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
        >
          <Upload className="h-4 w-4" />
          Import Cohort
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{cohortImports.length}</p>
          <p className="text-xs text-muted-foreground font-medium">Total Cohorts</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{cohortImports.filter((c) => c.status === 'Linked').length}</p>
          <p className="text-xs text-muted-foreground font-medium">Linked to Projects</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{cohortImports.filter((c) => c.status === 'Active').length}</p>
          <p className="text-xs text-muted-foreground font-medium">Ready for Review</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{cohortImports.filter((c) => c.status === 'Pending').length}</p>
          <p className="text-xs text-muted-foreground font-medium">Pending</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search cohorts by name or indication..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(['All', 'NeuroTerminal', 'CohortBuilder', 'Manual'] as const).map((s) => {
            const isManual = s === 'Manual';
            return (
              <button
                key={s}
                onClick={() => { if (!isManual) setSourceFilter(s); }}
                disabled={isManual}
                title={isManual ? 'No longer available for now' : undefined}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${isManual ? 'opacity-50 cursor-not-allowed text-muted-foreground' : sourceFilter === s ? 'bg-primary text-primary-foreground cursor-pointer' : 'text-muted-foreground hover:bg-muted cursor-pointer'}`}
              >
                {s === 'All' ? 'All Sources' : SOURCE_LABELS[s]}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 border-l pl-3">
          {(['All', 'Pending', 'Active', 'Linked'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${statusFilter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Cohort Cards */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-xl border bg-card p-12 text-center">
            <DatabaseZap className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No cohorts found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or import a new cohort</p>
          </div>
        )}
        {filtered.map((cohort) => (
          <div key={cohort.id} className="rounded-xl border bg-card transition-shadow hover:shadow-md">
            {/* Card Header */}
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                  <FlaskConical className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{cohort.name}</h3>
                    <Badge variant={cohort.status === 'Linked' ? 'success' : cohort.status === 'Active' ? 'processing' : 'warning'} className="text-[10px] px-2 py-0 shrink-0">
                      {cohort.status}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] px-2 py-0 shrink-0">
                      {SOURCE_LABELS[cohort.source]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    {cohort.metadata.indication && <span>{cohort.metadata.indication}</span>}
                    {cohort.metadata.trialPhase && <span>{cohort.metadata.trialPhase}</span>}
                    <span>Imported {new Date(cohort.importedAt).toLocaleDateString()}</span>
                    <span>by {cohort.importedBy}</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <p className="text-sm font-bold">{cohort.metadata.totalPatients}</p>
                  <p className="text-[10px] text-muted-foreground">Patients</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold">{cohort.criteria.length}</p>
                  <p className="text-[10px] text-muted-foreground">Criteria</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-emerald-600">{cohort.metadata.eligibleCount}</p>
                  <p className="text-[10px] text-muted-foreground">Eligible</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-red-600">{cohort.metadata.ineligibleCount}</p>
                  <p className="text-[10px] text-muted-foreground">Ineligible</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-2">
                  <button
                    onClick={() => navigate(`/vault/${cohort.id}`)}
                    className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-muted cursor-pointer"
                  >
                    Open Explorer <ArrowRight className="h-3 w-3" />
                  </button>
                  {cohort.status === 'Linked' ? (
                    <button
                      onClick={() => navigate(`/projects/${cohort.linkedProjectId}/criteria`)}
                      className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
                    >
                      Open Project <ArrowRight className="h-3 w-3" />
                    </button>
                  ) : cohort.status === 'Active' ? (
                    <button
                      onClick={() => navigate(`/projects/new?flow=ct&cohort=${cohort.id}`)}
                      className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> Create CT Project
                    </button>
                  ) : (
                    <Badge variant="warning" className="text-[10px]">Processing</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Import Dialog */}
      <Dialog open={importOpen} onClose={() => setImportOpen(false)} title="Import Cohort">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Simulate receiving a cohort export from NeuroTerminal or Cohort Builder.
          </p>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cohort Name</label>
            <Input
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              placeholder="e.g., PD Phase II Motor Symptoms"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source</label>
            <div className="flex gap-2 mt-1">
              {(['NeuroTerminal', 'CohortBuilder', 'Manual'] as CohortSource[]).map((s) => {
                const isManual = s === 'Manual';
                const isActive = importSource === s;
                return (
                  <button
                    key={s}
                    onClick={() => { if (!isManual) setImportSource(s); }}
                    disabled={isManual}
                    className={`flex flex-col items-start rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${isManual ? 'opacity-50 cursor-not-allowed bg-muted/30' : isActive ? 'border-primary bg-primary/10 text-primary cursor-pointer' : 'hover:bg-muted cursor-pointer'}`}
                  >
                    <span>{SOURCE_LABELS[s]}</span>
                    {isManual && (
                      <span className="text-[9px] text-muted-foreground font-normal mt-0.5">No longer available for now</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setImportOpen(false)}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSimulatedImport}
              disabled={!importName.trim() || importing}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
            >
              {importing ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {importing ? 'Importing...' : 'Import'}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
