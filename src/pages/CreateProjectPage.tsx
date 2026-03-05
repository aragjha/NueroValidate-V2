import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import type { DataType, ProjectType, Provider, Status } from '@/types';
import { ALL_PROVIDERS } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, ArrowRight, Check, ClipboardCopy, Copy, ExternalLink, Loader2, Plus, Trash2, Upload, X } from 'lucide-react';

function randomId() {
  return `prj-${Math.random().toString(36).slice(2, 8)}`;
}

const STAGES_SCHEMA = [
  { label: 'Project Setup', step: 1 },
  { label: 'Data Creation', step: 2 },
  { label: 'Processing', step: 3 },
] as const;

const STAGES_CSV = [
  { label: 'Project Setup', step: 1 },
  { label: 'Processing', step: 3 },
] as const;

export function CreateProjectPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addProject, clients, criteria: globalCriteria } = useAppContext();
  const [stage, setStage] = useState(1);

  const dupState = (location.state as { duplicate?: boolean; project?: Record<string, unknown>; criteria?: Array<Record<string, unknown>> } | null);
  const isDuplicate = dupState?.duplicate === true;
  const dupProject = dupState?.project as {
    name?: string; description?: string; clientId?: string; types?: ProjectType[];
    lead?: string; dataTypes?: DataType[]; providers?: Provider[]; shared?: boolean;
    teamAvatars?: string[]; criteriaList?: string[];
  } | null;
  const dupCriteria = dupState?.criteria as Array<{
    name: string; type: string; description: string;
    extractionPrompt: string; extractionValidation: string;
    reasoningPrompt: string; reasoningValidation: string;
    model: string; keywords: string[];
  }> | null;

  // ── Stage 1: Project Setup ──
  const [name, setName] = useState(dupProject?.name ?? '');
  const [description, setDescription] = useState(dupProject?.description ?? '');
  const [clientId, setClientId] = useState(dupProject?.clientId ?? clients[0]?.id ?? '');
  const [type, setType] = useState<ProjectType[]>(dupProject?.types ?? ['RWE']);
  const [lead, setLead] = useState(dupProject?.lead ?? 'Anurag');
  const [teamMembers, setTeamMembers] = useState<string[]>(() => {
    if (dupProject?.teamAvatars) {
      const nameMap: Record<string, string> = { AN: 'Anurag', NI: 'Nida', NE: 'Neha', SO: 'Sonick' };
      return dupProject.teamAvatars.map((a) => nameMap[a] ?? a).filter(Boolean);
    }
    return ['Anurag', 'Nida', 'Neha', 'Sonick'];
  });
  const [isPrivate, setIsPrivate] = useState(dupProject ? !dupProject.shared : true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Reviewer'>('Reviewer');

  // Criteria input: toggle between free-text and one-by-one
  const [criteriaMode, setCriteriaMode] = useState<'freetext' | 'individual'>('individual');
  const [freeTextCriteria, setFreeTextCriteria] = useState('');
  const [criteriaList, setCriteriaList] = useState<string[]>(dupProject?.criteriaList ?? []);
  const [newCriterion, setNewCriterion] = useState('');

  // Data type
  const [dataTypes, setDataTypes] = useState<DataType[]>(dupProject?.dataTypes ?? ['All']);

  // Providers
  const [providers, setProviders] = useState<Provider[]>(dupProject?.providers ?? []);

  // ── Stage 2: Data Creation ──
  const [criteriaKeywords, setCriteriaKeywords] = useState<Record<string, string>>({});
  const [groupBy, setGroupBy] = useState<'encounter' | 'patient'>('encounter');

  // Data mode: schema creation vs CSV upload
  const [dataMode, setDataMode] = useState<'schema' | 'csv'>('schema');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);

  // Hydrate form from duplicate state (safety net if useState initializers didn't run)
  useEffect(() => {
    if (!isDuplicate || !dupProject) return;
    setName(dupProject.name ?? '');
    setDescription(dupProject.description ?? '');
    if (dupProject.clientId) setClientId(dupProject.clientId);
    if (dupProject.types) setType(dupProject.types);
    if (dupProject.lead) setLead(dupProject.lead);
    if (dupProject.dataTypes) setDataTypes(dupProject.dataTypes);
    if (dupProject.providers) setProviders(dupProject.providers);
    if (dupProject.criteriaList) setCriteriaList(dupProject.criteriaList);
    setIsPrivate(!dupProject.shared);
    if (dupProject.teamAvatars) {
      const nameMap: Record<string, string> = { AN: 'Anurag', NI: 'Nida', NE: 'Neha', SO: 'Sonick' };
      setTeamMembers(dupProject.teamAvatars.map((a) => nameMap[a] ?? a).filter(Boolean));
    }
    setStage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDuplicate]);

  // ── Stage 3: Processing ──
  const [schemaStatus, setSchemaStatus] = useState<Status>('Queued');
  const [progressPct, setProgressPct] = useState(0);
  const [fileStatus, setFileStatus] = useState<'pending' | 'ready' | 'error'>('pending');
  const [simulateError, setSimulateError] = useState(false);

  useEffect(() => {
    if (stage !== 3 || schemaStatus !== 'Processing') return;
    const timer = setInterval(() => {
      setProgressPct((prev) => {
        if (simulateError && prev >= 60) {
          clearInterval(timer);
          setSchemaStatus('Failed');
          setFileStatus('error');
          return prev;
        }
        const next = Math.min(prev + 8, 100);
        if (next >= 100) {
          clearInterval(timer);
          setSchemaStatus('Done');
          setFileStatus('ready');
        }
        return next;
      });
    }, 350);
    return () => clearInterval(timer);
  }, [stage, schemaStatus, simulateError]);

  // Derived final criteria list
  const finalCriteria = criteriaMode === 'freetext'
    ? freeTextCriteria.split(/[;\n]/).map((s) => s.trim()).filter(Boolean)
    : criteriaList;

  function addCriterion() {
    if (!newCriterion.trim()) return;
    setCriteriaList((prev) => [...prev, newCriterion.trim()]);
    setNewCriterion('');
  }

  function removeCriterion(idx: number) {
    setCriteriaList((prev) => prev.filter((_, i) => i !== idx));
  }

  function addFromGlobal(name: string) {
    if (!criteriaList.includes(name)) {
      setCriteriaList((prev) => [...prev, name]);
    }
  }

  function toggleDataType(dt: DataType) {
    setDataTypes((prev) => {
      if (dt === 'All') return ['All'];
      const without = prev.filter((d) => d !== 'All');
      const has = without.includes(dt);
      const next = has ? without.filter((d) => d !== dt) : [...without, dt];
      if (next.length === 0) return ['All'];
      if (next.includes('Structured') && next.includes('Unstructured')) return ['All'];
      return next;
    });
  }

  function toggleProvider(p: Provider) {
    setProviders((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  }

  function toggleTeam(name: string) {
    setTeamMembers((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);
  }

  function goToStage2() {
    const kw: Record<string, string> = {};
    finalCriteria.forEach((c) => {
      const dupMatch = dupCriteria?.find((dc) => dc.name === c);
      if (dupMatch && dupMatch.keywords.length > 0) {
        kw[c] = dupMatch.keywords.join(', ');
      } else {
        const match = globalCriteria.find((gc) => gc.name === c);
        kw[c] = match ? match.keywords.join(', ') : '';
      }
    });
    setCriteriaKeywords(kw);
    setStage(2);
  }

  async function handleCreate() {
    await addProject({
      id: randomId(),
      name: name.trim() || 'Untitled Neurology Project',
      description: description.trim(),
      clientId,
      types: type,
      lead,
      dataSource: providers.join(', ') || 'Manual Upload',
      dataTypes,
      providers,
      patientCount: 0,
      lastUpdated: 'Now',
      shared: !isPrivate,
      status: 'Active',
      stageProgress: 0,
      currentStage: 1,
      totalStages: 5,
      teamAvatars: teamMembers.map((n) => n.slice(0, 2).toUpperCase()),
      criteriaList: finalCriteria,
    });
    navigate('/projects/prj-01/criteria');
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Stepper */}
      <div className="flex items-center gap-3">
        {(dataMode === 'csv' ? STAGES_CSV : STAGES_SCHEMA).map((s, idx) => {
          const done = stage > s.step;
          const active = stage === s.step;
          return (
            <div key={s.step} className="flex items-center gap-3">
              {idx > 0 && <div className={`h-px w-10 rounded-full ${done ? 'bg-primary' : 'bg-border'}`} />}
              <div className="flex items-center gap-2.5">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-extrabold transition-all ${done ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25' : active ? 'border-2 border-primary text-primary' : 'border border-border text-muted-foreground'}`}>
                  {done ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <span className={`text-sm ${active ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'}`}>{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════ STAGE 1: PROJECT SETUP ══════════════ */}
      {stage === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">{isDuplicate ? 'Duplicate Project' : 'Project Setup'}</CardTitle>
            <CardDescription>
              {isDuplicate
                ? 'All fields have been pre-filled from the source project. Review and modify as needed.'
                : 'Configure your neurology RWE/RWD validation project'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {isDuplicate && (
              <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-200">
                <Copy className="h-4 w-4 shrink-0" />
                <span>Duplicating project — all settings, criteria, prompts, and models are pre-filled. Modify anything before creating.</span>
              </div>
            )}
            {/* Project name */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Project name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Migraine Prophylaxis Cohort" />
            </div>

            {/* 1-liner description */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief 1-liner about this project..." />
            </div>

            {/* Client + Type row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Client</label>
                <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Type of project</label>
                <Select value={type[0]} onChange={(e) => setType([e.target.value as ProjectType])}>
                  <option value="RWE">RWE</option>
                  <option value="RWD">RWD</option>
                </Select>
              </div>
            </div>

            {/* Criteria */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">Criteria</label>
                <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
                  <button
                    onClick={() => setCriteriaMode('individual')}
                    className={`rounded-md px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${criteriaMode === 'individual' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                  >
                    One by one
                  </button>
                  <button
                    onClick={() => setCriteriaMode('freetext')}
                    className={`rounded-md px-3 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${criteriaMode === 'freetext' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                  >
                    Free text
                  </button>
                </div>
              </div>

              {criteriaMode === 'freetext' ? (
                <Textarea
                  value={freeTextCriteria}
                  onChange={(e) => setFreeTextCriteria(e.target.value)}
                  placeholder="Enter criteria separated by semicolons or newlines...&#10;e.g. Migraine frequency ≥ 4/month; MMSE < 24; No prior brain surgery"
                  rows={4}
                />
              ) : (
                <div className="space-y-2">
                  {/* Existing global criteria quick-add */}
                  {globalCriteria.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {globalCriteria.map((gc) => (
                        <button
                          key={gc.id}
                          onClick={() => addFromGlobal(gc.name)}
                          disabled={criteriaList.includes(gc.name)}
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors cursor-pointer ${
                            criteriaList.includes(gc.name) ? 'bg-primary/10 text-primary border-primary/30' : 'hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          <Plus className="inline h-2.5 w-2.5 mr-0.5" />
                          {gc.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Added criteria list */}
                  {criteriaList.length > 0 && (
                    <div className="space-y-1">
                      {criteriaList.map((c, idx) => (
                        <div key={idx} className="flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2 text-sm">
                          <span>{c}</span>
                          <button onClick={() => removeCriterion(idx)} className="text-muted-foreground hover:text-destructive cursor-pointer">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add custom */}
                  <div className="flex gap-2">
                    <Input
                      value={newCriterion}
                      onChange={(e) => setNewCriterion(e.target.value)}
                      placeholder="Add a custom criterion..."
                      className="flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && addCriterion()}
                    />
                    <Button variant="outline" size="sm" onClick={addCriterion} disabled={!newCriterion.trim()}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Lead */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Lead</label>
              <Select value={lead} onChange={(e) => setLead(e.target.value)}>
                <option>Anurag</option>
                <option>Nida</option>
                <option>Neha</option>
                <option>Sonick</option>
              </Select>
            </div>

            {/* Team members */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Team members</label>
              <div className="flex flex-wrap gap-2">
                {['Anurag', 'Nida', 'Neha', 'Sonick'].map((n) => (
                  <label
                    key={n}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 cursor-pointer transition-colors text-sm ${
                      teamMembers.includes(n) ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                    }`}
                  >
                    <Checkbox
                      checked={teamMembers.includes(n)}
                      onChange={() => toggleTeam(n)}
                    />
                    {n}
                  </label>
                ))}
              </div>
            </div>

            <Separator />

            {/* Visibility */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Visibility</label>
              <div className="flex gap-3">
                <label className={`flex items-center gap-2 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${isPrivate ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}>
                  <input type="radio" name="visibility" checked={isPrivate} onChange={() => setIsPrivate(true)} className="accent-primary" />
                  <div>
                    <p className="text-sm font-semibold">Private</p>
                    <p className="text-[11px] text-muted-foreground">Only you can access</p>
                  </div>
                </label>
                <label className={`flex items-center gap-2 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${!isPrivate ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}>
                  <input type="radio" name="visibility" checked={!isPrivate} onChange={() => setIsPrivate(false)} className="accent-primary" />
                  <div>
                    <p className="text-sm font-semibold">Shared</p>
                    <p className="text-[11px] text-muted-foreground">Team members can access</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Invite by email */}
            {!isPrivate && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Invite by email</label>
                <div className="grid grid-cols-3 gap-3">
                  <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="email@company.com" className="col-span-2" />
                  <Select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'Admin' | 'Reviewer')}>
                    <option>Admin</option>
                    <option>Reviewer</option>
                  </Select>
                </div>
              </div>
            )}

            <Separator />

            {/* Data type selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Select type of data</label>
              <div className="flex gap-2">
                {(['All', 'Structured', 'Unstructured'] as DataType[]).map((dt) => {
                  const active = dataTypes.includes(dt) || (dt === 'All' && dataTypes.includes('All'));
                  return (
                    <button
                      key={dt}
                      onClick={() => toggleDataType(dt)}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                        active ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      {dt}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {dataTypes.includes('All') ? 'Both structured and unstructured data will be used.' : `Only ${dataTypes.join(' and ').toLowerCase()} data will be used.`}
              </p>
            </div>

            {/* Provider data source */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Provider data source</label>
              <div className="flex flex-wrap gap-2">
                {ALL_PROVIDERS.map((p) => (
                  <label
                    key={p}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 cursor-pointer transition-colors text-sm ${
                      providers.includes(p) ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted/30 text-muted-foreground'
                    }`}
                  >
                    <Checkbox checked={providers.includes(p)} onChange={() => toggleProvider(p)} />
                    {p}
                  </label>
                ))}
              </div>
              {providers.length > 0 && (
                <p className="text-[11px] text-muted-foreground">{providers.length} provider{providers.length > 1 ? 's' : ''} selected</p>
              )}
            </div>

            <Separator />

            {/* Data mode switch: Create Schema vs Upload CSV */}
            <div className="space-y-3">
              <label className="text-sm font-semibold">How would you like to provide data?</label>
              <div className="flex items-center rounded-xl border bg-muted/40 p-1">
                <button
                  onClick={() => setDataMode('schema')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${dataMode === 'schema' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <ArrowRight className="h-4 w-4" /> Create Schema
                </button>
                <button
                  onClick={() => setDataMode('csv')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${dataMode === 'csv' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Upload className="h-4 w-4" /> Upload CSV
                </button>
              </div>

              {dataMode === 'schema' && (
                <p className="text-[11px] text-muted-foreground">You'll configure keywords and grouping for each criterion in the next step.</p>
              )}

              {dataMode === 'csv' && (
                <div className="space-y-3 rounded-xl border p-4">
                  <p className="text-[11px] text-muted-foreground">Upload a prepared CSV with patient data. The Data Creation step will be skipped and processing will begin immediately.</p>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 rounded-xl border border-dashed px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors flex-1">
                      <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground truncate">{csvFile ? csvFile.name : 'Choose .csv file...'}</span>
                      <input type="file" accept=".csv" className="hidden" onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} />
                    </label>
                    {csvFile && (
                      <Button variant="outline" size="sm" onClick={() => setCsvFile(null)}>
                        <X className="mr-1 h-3 w-3" /> Remove
                      </Button>
                    )}
                  </div>
                  {csvFile && (
                    <div className="flex items-center gap-2 rounded-lg border bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      <span><strong>{csvFile.name}</strong> ({(csvFile.size / 1024).toFixed(1)} KB) ready for upload</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              {dataMode === 'schema' ? (
                <Button onClick={goToStage2} disabled={finalCriteria.length === 0}>
                  Next: Data Creation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => { setStage(3); setSchemaStatus('Processing'); setProgressPct(0); setFileStatus('pending'); setSimulateError(false); }}
                  disabled={!csvFile}
                >
                  <Upload className="mr-2 h-4 w-4" /> Upload & Process
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════ STAGE 2: DATA CREATION ══════════════ */}
      {stage === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Data Creation</CardTitle>
            <CardDescription>Review criteria and configure keywords for extraction. Each criterion will generate a distinct data processing tile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Criteria tiles with keywords */}
            <ScrollArea className="max-h-[calc(100vh-400px)]">
              <div className="space-y-4">
                {finalCriteria.map((criterion, idx) => {
                  const match = globalCriteria.find((gc) => gc.name === criterion);
                  return (
                    <div key={idx} className="flex gap-4 rounded-xl border bg-card">
                      {/* Left: criterion info */}
                      <div className="flex-1 border-r p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={match?.type === 'exclusion' ? 'destructive' : 'success'} className="text-[9px]">
                            {match?.type === 'exclusion' ? 'Exclusion' : 'Inclusion'}
                          </Badge>
                          <span className="text-xs font-bold">Criterion {idx + 1}</span>
                        </div>
                        <p className="text-sm font-semibold">{criterion}</p>
                        {match?.description && (
                          <p className="text-[11px] text-muted-foreground">{match.description}</p>
                        )}
                        <button
                          onClick={() => {
                            const updated = finalCriteria.filter((_, i) => i !== idx);
                            if (criteriaMode === 'freetext') {
                              setFreeTextCriteria(updated.join('; '));
                            } else {
                              setCriteriaList(updated);
                            }
                            const kw = { ...criteriaKeywords };
                            delete kw[criterion];
                            setCriteriaKeywords(kw);
                          }}
                          className="flex items-center gap-1 text-[11px] text-destructive hover:underline cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" /> Remove
                        </button>
                      </div>

                      {/* Right: keywords */}
                      <div className="flex-1 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-muted-foreground">Keywords</label>
                          {criteriaKeywords[criterion]?.trim() && (
                            <button
                              onClick={() => {
                                const text = criteriaKeywords[criterion].split(',').map((k) => k.trim()).filter(Boolean).join(', ');
                                void navigator.clipboard.writeText(text);
                                setCopiedKeyword(criterion);
                                setTimeout(() => setCopiedKeyword(null), 1500);
                              }}
                              className="flex items-center gap-1 text-[10px] text-primary hover:underline cursor-pointer"
                            >
                              {copiedKeyword === criterion ? <><Check className="h-3 w-3" /> Copied</> : <><ClipboardCopy className="h-3 w-3" /> Copy</>}
                            </button>
                          )}
                        </div>
                        <Textarea
                          value={criteriaKeywords[criterion] ?? ''}
                          onChange={(e) => setCriteriaKeywords((prev) => ({ ...prev, [criterion]: e.target.value }))}
                          placeholder="Add comma-separated keywords for extraction..."
                          rows={3}
                          className="text-xs"
                        />
                        {criteriaKeywords[criterion]?.trim() && (
                          <div className="flex flex-wrap gap-1">
                            {criteriaKeywords[criterion].split(',').map((kw, i) => kw.trim() && (
                              <Badge key={i} variant="secondary" className="text-[9px]">{kw.trim()}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Duplicated prompts & models summary */}
            {isDuplicate && dupCriteria && dupCriteria.length > 0 && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20 p-4 space-y-2">
                <p className="text-xs font-bold text-blue-800 dark:text-blue-200">Duplicated prompts & models (carried over)</p>
                <div className="space-y-1.5">
                  {dupCriteria.map((dc, i) => (
                    <div key={i} className="flex items-center gap-3 text-[11px] text-blue-700 dark:text-blue-300">
                      <span className="font-semibold truncate flex-1">{dc.name}</span>
                      <Badge variant="secondary" className="text-[9px]">{dc.model}</Badge>
                      <span className="text-blue-500">{dc.extractionPrompt ? 'Prompts set' : 'No prompts'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add more criteria inline */}
            <div className="flex gap-2">
              <Input
                value={newCriterion}
                onChange={(e) => setNewCriterion(e.target.value)}
                placeholder="Add another criterion..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCriterion.trim()) {
                    if (criteriaMode === 'freetext') {
                      setFreeTextCriteria((prev) => prev + (prev ? '; ' : '') + newCriterion.trim());
                    } else {
                      setCriteriaList((prev) => [...prev, newCriterion.trim()]);
                    }
                    setCriteriaKeywords((prev) => ({ ...prev, [newCriterion.trim()]: '' }));
                    setNewCriterion('');
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!newCriterion.trim()}
                onClick={() => {
                  if (!newCriterion.trim()) return;
                  if (criteriaMode === 'freetext') {
                    setFreeTextCriteria((prev) => prev + (prev ? '; ' : '') + newCriterion.trim());
                  } else {
                    setCriteriaList((prev) => [...prev, newCriterion.trim()]);
                  }
                  setCriteriaKeywords((prev) => ({ ...prev, [newCriterion.trim()]: '' }));
                  setNewCriterion('');
                }}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add
              </Button>
            </div>

            <Separator />

            {/* Grouping strategy */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">Grouping strategy</label>
              <div className="flex gap-4">
                <label className={`flex items-center gap-2 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${groupBy === 'encounter' ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}>
                  <input type="radio" name="groupBy" checked={groupBy === 'encounter'} onChange={() => setGroupBy('encounter')} className="accent-primary" />
                  <div>
                    <p className="text-sm font-semibold">Club by Encounter ID</p>
                    <p className="text-[11px] text-muted-foreground">Each encounter processed independently</p>
                  </div>
                </label>
                <label className={`flex items-center gap-2 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${groupBy === 'patient' ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}>
                  <input type="radio" name="groupBy" checked={groupBy === 'patient'} onChange={() => setGroupBy('patient')} className="accent-primary" />
                  <div>
                    <p className="text-sm font-semibold">Club by Patient ID (NDID)</p>
                    <p className="text-[11px] text-muted-foreground">All encounters grouped under patient</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStage(1)}>Back</Button>
              <Button onClick={() => { setStage(3); setSchemaStatus('Processing'); setProgressPct(0); setFileStatus('pending'); setSimulateError(false); }}>
                Create Schema
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════ STAGE 3: PROCESSING ══════════════ */}
      {stage === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">Schema Processing</CardTitle>
            <CardDescription>Monitoring schema creation and data indexing for {finalCriteria.length} criteria</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Status chips */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant={schemaStatus === 'Done' ? 'success' : schemaStatus === 'Failed' ? 'destructive' : 'processing'}
              >
                {schemaStatus === 'Processing' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                {schemaStatus}
              </Badge>
              <Badge variant="secondary">
                File: {fileStatus === 'ready' ? 'Ready' : fileStatus === 'error' ? 'Error' : 'Pending'}
              </Badge>
              <Badge variant="secondary">{finalCriteria.length} criteria</Badge>
              {providers.length > 0 && <Badge variant="secondary">{providers.length} providers</Badge>}
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Schema creation</span>
                <span>{progressPct}%</span>
              </div>
              <Progress value={progressPct} />
            </div>

            {/* Status message */}
            <div className={`rounded-xl border p-5 text-sm leading-relaxed ${
              schemaStatus === 'Failed'
                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'
                : 'bg-muted/30'
            }`}>
              {schemaStatus === 'Processing' && 'Preparing neurology data schema, indexing patient records across selected providers...'}
              {schemaStatus === 'Done' && 'Schema created successfully. All criteria indexed and ready for validation pipeline.'}
              {schemaStatus === 'Failed' && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Schema creation failed</p>
                    <p className="mt-1">Source file corrupted or index configuration invalid. Check logs for details.</p>
                  </div>
                </div>
              )}
              {schemaStatus === 'Queued' && 'Waiting to start schema creation...'}
            </div>

            {/* Error state controls */}
            {schemaStatus === 'Failed' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSchemaStatus('Processing'); setProgressPct(0); setFileStatus('pending'); setSimulateError(false); }}
                >
                  Retry
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <ExternalLink className="mr-1 h-3.5 w-3.5" /> View Logs
                </Button>
              </div>
            )}

            {/* Simulate error button (while processing) */}
            {schemaStatus === 'Processing' && (
              <Button variant="outline" size="sm" onClick={() => setSimulateError(true)} className="text-destructive">
                Simulate Error
              </Button>
            )}

            {/* Logs link */}
            {schemaStatus !== 'Failed' && (
              <button className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
                <ExternalLink className="h-3 w-3" /> View processing logs
              </button>
            )}

            {/* Move to validation CTA */}
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStage(dataMode === 'csv' ? 1 : 2)} disabled={schemaStatus === 'Processing'}>
                Back
              </Button>
              {schemaStatus === 'Done' && (
                <Button onClick={() => void handleCreate()}>
                  Move ahead with Validation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
