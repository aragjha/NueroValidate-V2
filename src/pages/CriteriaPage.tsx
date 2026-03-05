import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import type { CriterionType, RunConfig, Status } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog } from '@/components/ui/dialog';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  Loader2,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Play,
  Plus,
  Search,
  Square,
  Trash2,
  X,
} from 'lucide-react';

const LLM_OPTIONS = ['GPT-4.1', 'Claude Sonnet', 'Gemini 2.5 Pro', 'Llama 4 Maverick'] as const;

export function CriteriaPage() {
  const navigate = useNavigate();
  const { role, criteria, runs, projects } = useAppContext();
  const currentProject = projects.find((p) => p.id === 'prj-01') ?? projects[0];
  const [stage, setStage] = useState(1);
  const [collapsed, setCollapsed] = useState(false);
  const [selected, setSelected] = useState(criteria[0]?.id ?? '');

  // Local criteria state
  const [localCriteria, setLocalCriteria] = useState(criteria);
  const [addMode, setAddMode] = useState(false);
  const [newCritName, setNewCritName] = useState('');
  const [newCritType, setNewCritType] = useState<CriterionType>('inclusion');

  // Prompt editing (stage 2)
  const selCrit = localCriteria.find((c) => c.id === selected);
  const [extractionPrompt, setExtractionPrompt] = useState('');
  const [extractionValidation, setExtractionValidation] = useState('');
  const [extractionModel, setExtractionModel] = useState('GPT-4.1');
  const [reasoningPrompt, setReasoningPrompt] = useState('');
  const [reasoningValidation, setReasoningValidation] = useState('');
  const [reasoningModel, setReasoningModel] = useState('GPT-4.1');
  const [skipReasoning, setSkipReasoning] = useState(false);

  // Run configuration (stage 3)
  const [runId, setRunId] = useState('RUN-001');
  const [overrideModels, setOverrideModels] = useState(false);
  const [overridePrompts, setOverridePrompts] = useState(false);
  const [overrideKeywords, setOverrideKeywords] = useState(false);
  const [sampleSize, setSampleSize] = useState('50');
  const [patientIds, setPatientIds] = useState('');
  const [runScope, setRunScope] = useState<'sample' | 'specific' | 'reuse' | 'full'>('sample');
  const [reuseRunId, setReuseRunId] = useState('');

  // Override fields (new values when overriding)
  const [overrideExModel, setOverrideExModel] = useState('GPT-4.1');
  const [overrideReModel, setOverrideReModel] = useState('GPT-4.1');
  const [overrideExPrompt, setOverrideExPrompt] = useState('');
  const [overrideExValidation, setOverrideExValidation] = useState('');
  const [overrideRePrompt, setOverrideRePrompt] = useState('');
  const [overrideReValidation, setOverrideReValidation] = useState('');
  const [overrideKw, setOverrideKw] = useState('');

  // Processing (stage 4)
  const [status, setStatus] = useState<Status>('Queued');
  const [count, setCount] = useState(0);
  const [totalCount] = useState(50);
  const [fileName] = useState('migraine_cohort_batch_01.csv');

  // Expanded override modal
  const [expandedOverride, setExpandedOverride] = useState<'models' | 'prompts' | 'keywords' | null>(null);

  // Run detail modal
  const [inspectRun, setInspectRun] = useState<RunConfig | null>(null);

  // Runs grouped by criterion
  const runsByCrit = useMemo(() => {
    const map = new Map<string, RunConfig[]>();
    localCriteria.forEach((c) => map.set(c.id, []));
    runs.forEach((r) => { const arr = map.get(r.criterionId) ?? []; arr.push(r); map.set(r.criterionId, arr); });
    return map;
  }, [localCriteria, runs]);

  const selectedRuns = runsByCrit.get(selected) ?? [];
  const allRuns = runs;

  useEffect(() => {
    if (selCrit) {
      setExtractionPrompt(selCrit.extractionPrompt);
      setExtractionValidation(selCrit.extractionValidation);
      setReasoningPrompt(selCrit.reasoningPrompt);
      setReasoningValidation(selCrit.reasoningValidation);
      setExtractionModel(selCrit.model);
      setReasoningModel(selCrit.model);
      setSkipReasoning(false);
    }
  }, [selCrit]);

  useEffect(() => { setLocalCriteria(criteria); }, [criteria]);

  useEffect(() => {
    if (stage !== 4 || status !== 'Processing') return;
    const id = setInterval(() => {
      setCount((prev) => { const next = prev + 1; if (next >= totalCount) { clearInterval(id); setStatus('Done'); } return Math.min(next, totalCount); });
    }, 200);
    return () => clearInterval(id);
  }, [stage, status, totalCount]);

  function addCriterion() {
    if (!newCritName.trim()) return;
    const newC = { id: `cri-${Math.random().toString(36).slice(2, 8)}`, name: newCritName.trim(), type: newCritType, description: '', extractionPrompt: '', extractionValidation: '', reasoningPrompt: '', reasoningValidation: '', model: 'GPT-4.1', keywords: [] as string[] };
    setLocalCriteria((prev) => [...prev, newC]);
    setSelected(newC.id);
    setNewCritName('');
    setAddMode(false);
  }

  const showRunsPanel = stage >= 2;

  // Find criterion name for a run
  function critNameForRun(r: RunConfig) {
    return localCriteria.find((c) => c.id === r.criterionId)?.name ?? r.criterionId;
  }

  return (
    <div className="flex gap-4">
      {/* ─── LEFT PANEL ─── */}
      <aside className={`shrink-0 rounded-2xl border bg-card transition-all shadow-sm ${collapsed ? 'w-14' : 'w-72'}`}>
        <div className="flex items-center justify-between border-b p-4">
          {!collapsed && <span className="text-sm font-semibold">{showRunsPanel ? 'Criteria & Runs' : 'Criteria'}</span>}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed((s) => !s)}>
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        {!collapsed && (
          <div className="flex flex-col h-[calc(100vh-220px)]">
            {!showRunsPanel ? (
              <div className="p-4 space-y-3 flex-1 overflow-hidden flex flex-col">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={''} onChange={() => {}} placeholder="Search criteria..." className="h-9 pl-9 text-xs" />
                </div>
                {addMode ? (
                  <div className="space-y-2 rounded-xl border p-3">
                    <Input value={newCritName} onChange={(e) => setNewCritName(e.target.value)} placeholder="Criterion name" className="h-8 text-xs" autoFocus onKeyDown={(e) => e.key === 'Enter' && addCriterion()} />
                    <Select value={newCritType} onChange={(e) => setNewCritType(e.target.value as CriterionType)} className="h-8 text-xs"><option value="inclusion">Inclusion</option><option value="exclusion">Exclusion</option></Select>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 h-7 text-xs" onClick={addCriterion}>Add</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddMode(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setAddMode(true)}><Plus className="mr-1 h-3.5 w-3.5" /> Add criteria</Button>
                )}
                <ScrollArea className="flex-1">
                  <div className="space-y-1">
                    {localCriteria.map((criterion) => (
                      <button key={criterion.id} onClick={() => setSelected(criterion.id)} className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors cursor-pointer ${selected === criterion.id ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted text-foreground'}`}>
                        <span className="truncate text-xs">{criterion.name}</span>
                        <Badge variant={criterion.type === 'inclusion' ? 'success' : 'destructive'} className="text-[9px] ml-2 shrink-0">{criterion.type === 'inclusion' ? 'IN' : 'EX'}</Badge>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="p-3 border-b space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Criterion</label>
                  <Select value={selected} onChange={(e) => setSelected(e.target.value)} className="h-8 text-xs">
                    {localCriteria.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                  {selCrit && (
                    <div className="flex items-center gap-1.5">
                      <Badge variant={selCrit.type === 'inclusion' ? 'success' : 'destructive'} className="text-[8px] px-1.5 py-0">{selCrit.type}</Badge>
                      <span className="text-[10px] text-muted-foreground">{selCrit.model}</span>
                    </div>
                  )}
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-3 space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Runs</p>
                    {selectedRuns.length === 0 && <p className="text-[10px] text-muted-foreground italic py-2">No runs yet</p>}
                    {selectedRuns.map((run) => (
                      <div key={run.id} className="rounded-lg border p-2.5 text-[10px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{run.runId}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setInspectRun(run)} className="rounded p-0.5 hover:bg-muted cursor-pointer text-muted-foreground hover:text-primary transition-colors" title="View run details">
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <Badge variant={run.status === 'Done' ? 'success' : run.status === 'Processing' ? 'processing' : 'secondary'} className="text-[8px] px-1.5 py-0">{run.status}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>{run.extractionCount}/{run.totalCount}</span>
                          <span>·</span>
                          <span className="truncate">{run.fileName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* ─── MAIN AREA ─── */}
      <div className="min-w-0 flex-1 space-y-4">
        {/* Stage 1 */}
        {stage === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Criteria Review</CardTitle>
              <CardDescription>{selCrit ? `Selected: ${selCrit.name}` : 'Select a criterion from the left panel'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {role === 'Admin' && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const criteriaData = localCriteria.map((c) => ({ name: c.name, type: c.type, description: c.description, extractionPrompt: c.extractionPrompt, extractionValidation: c.extractionValidation, reasoningPrompt: c.reasoningPrompt, reasoningValidation: c.reasoningValidation, model: c.model, keywords: c.keywords }));
                    navigate('/projects/new', { state: { duplicate: true, project: currentProject ? { name: `${currentProject.name} (Copy)`, description: currentProject.description, clientId: currentProject.clientId, types: currentProject.types, lead: currentProject.lead, dataTypes: currentProject.dataTypes, providers: currentProject.providers, shared: currentProject.shared, teamAvatars: currentProject.teamAvatars, criteriaList: currentProject.criteriaList } : null, criteria: criteriaData } });
                  }}><Copy className="mr-1 h-3.5 w-3.5" /> Duplicate project</Button>
                  <Button variant="outline" size="sm"><Pencil className="mr-1 h-3.5 w-3.5" /> Edit project</Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete project</Button>
                </div>
              )}
              {selCrit && (
                <div className="rounded-xl border bg-muted/30 p-5 space-y-3">
                  <div className="flex items-center gap-2"><Badge variant={selCrit.type === 'inclusion' ? 'success' : 'destructive'}>{selCrit.type}</Badge><span className="text-sm font-bold">{selCrit.name}</span></div>
                  <p className="text-sm text-muted-foreground">{selCrit.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div><p className="font-semibold text-muted-foreground">Model</p><p>{selCrit.model}</p></div>
                    <div><p className="font-semibold text-muted-foreground">Extraction prompt</p><p className="truncate">{selCrit.extractionPrompt.slice(0, 80)}...</p></div>
                  </div>
                  <Badge variant="secondary">Resume: Ready for prompt configuration</Badge>
                </div>
              )}
              <div className="flex justify-end"><Button onClick={() => setStage(2)} disabled={!selCrit}>Configure Prompts<ArrowRight className="ml-2 h-4 w-4" /></Button></div>
            </CardContent>
          </Card>
        )}

        {/* Stage 2 — Prompts */}
        {stage === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Prompts & Model Selection</CardTitle>
              <CardDescription>Configure extraction and reasoning prompts for "{selCrit?.name}"</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between"><h3 className="text-sm font-bold">Extraction</h3><Select value={extractionModel} onChange={(e) => setExtractionModel(e.target.value)} className="h-8 w-48 text-xs">{LLM_OPTIONS.map((m) => <option key={m}>{m}</option>)}</Select></div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Prompt</label><Textarea rows={4} value={extractionPrompt} onChange={(e) => setExtractionPrompt(e.target.value)} placeholder="Define extraction logic..." /></div>
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Validation</label><Textarea rows={4} value={extractionValidation} onChange={(e) => setExtractionValidation(e.target.value)} placeholder="Validate extraction output..." /></div>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><h3 className={`text-sm font-bold ${skipReasoning ? 'text-muted-foreground' : ''}`}>Reasoning</h3><label className="flex items-center gap-2 text-xs cursor-pointer"><Checkbox checked={skipReasoning} onChange={(e) => setSkipReasoning((e.target as HTMLInputElement).checked)} /><span className={skipReasoning ? 'text-muted-foreground' : ''}>Skip reasoning</span></label></div>
                  {!skipReasoning && <Select value={reasoningModel} onChange={(e) => setReasoningModel(e.target.value)} className="h-8 w-48 text-xs">{LLM_OPTIONS.map((m) => <option key={m}>{m}</option>)}</Select>}
                </div>
                <div className={`grid gap-4 md:grid-cols-2 transition-opacity ${skipReasoning ? 'opacity-30 pointer-events-none' : ''}`}>
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Prompt</label><Textarea rows={4} value={reasoningPrompt} onChange={(e) => setReasoningPrompt(e.target.value)} placeholder="Define reasoning chain..." disabled={skipReasoning} /></div>
                  <div className="space-y-1.5"><label className="text-xs font-semibold text-muted-foreground">Validation</label><Textarea rows={4} value={reasoningValidation} onChange={(e) => setReasoningValidation(e.target.value)} placeholder="Validate reasoning output..." disabled={skipReasoning} /></div>
                </div>
                {skipReasoning && <p className="text-[11px] text-amber-600 dark:text-amber-400">Reasoning step will be skipped — only extraction results will be used for validation.</p>}
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStage(1)}><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>
                <Button onClick={() => setStage(3)}>Next: Run Configuration<ArrowRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ Stage 3 — Run configuration with override fields ═══ */}
        {stage === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Run Configuration</CardTitle>
              <CardDescription>Set run ID, overrides, and scope for "{selCrit?.name}"</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Run ID</label>
                <Input value={runId} onChange={(e) => setRunId(e.target.value)} />
              </div>

              {/* Override options */}
              <div className="space-y-3">
                <label className="text-sm font-semibold">Override options</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={overrideModels} onChange={(e) => setOverrideModels((e.target as HTMLInputElement).checked)} /> Override LLMs</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={overridePrompts} onChange={(e) => setOverridePrompts((e.target as HTMLInputElement).checked)} /> Override prompts</label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={overrideKeywords} onChange={(e) => setOverrideKeywords((e.target as HTMLInputElement).checked)} /> Override keywords</label>
                </div>

                {/* Override LLMs expanded */}
                {overrideModels && (
                  <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">New LLM Selection</p>
                      <button onClick={() => setExpandedOverride('models')} className="rounded-md p-1 hover:bg-muted cursor-pointer text-muted-foreground hover:text-primary transition-colors" title="Expand to full screen"><Maximize2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Previous extraction model</p>
                        <p className="font-medium">{extractionModel}</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-muted-foreground">New extraction model</label>
                        <Select value={overrideExModel} onChange={(e) => setOverrideExModel(e.target.value)} className="h-8 text-xs">{LLM_OPTIONS.map((m) => <option key={m}>{m}</option>)}</Select>
                      </div>
                      {!skipReasoning && (
                        <>
                          <div className="space-y-1">
                            <p className="text-muted-foreground">Previous reasoning model</p>
                            <p className="font-medium">{reasoningModel}</p>
                          </div>
                          <div className="space-y-1">
                            <label className="text-muted-foreground">New reasoning model</label>
                            <Select value={overrideReModel} onChange={(e) => setOverrideReModel(e.target.value)} className="h-8 text-xs">{LLM_OPTIONS.map((m) => <option key={m}>{m}</option>)}</Select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Override Prompts expanded */}
                {overridePrompts && (
                  <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">New Prompts</p>
                      <button onClick={() => setExpandedOverride('prompts')} className="rounded-md p-1 hover:bg-muted cursor-pointer text-muted-foreground hover:text-primary transition-colors" title="Expand to full screen"><Maximize2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold text-muted-foreground">Previous extraction prompt</p>
                          <div className="rounded-lg border bg-muted/30 p-2.5 text-xs text-muted-foreground max-h-20 overflow-y-auto">{extractionPrompt || <span className="italic">Empty</span>}</div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-muted-foreground">New extraction prompt</label>
                          <Textarea rows={3} value={overrideExPrompt} onChange={(e) => setOverrideExPrompt(e.target.value)} placeholder="Override extraction prompt..." className="text-xs" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold text-muted-foreground">Previous extraction validation</p>
                          <div className="rounded-lg border bg-muted/30 p-2.5 text-xs text-muted-foreground max-h-20 overflow-y-auto">{extractionValidation || <span className="italic">Empty</span>}</div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-muted-foreground">New extraction validation</label>
                          <Textarea rows={3} value={overrideExValidation} onChange={(e) => setOverrideExValidation(e.target.value)} placeholder="Override extraction validation..." className="text-xs" />
                        </div>
                      </div>
                      {!skipReasoning && (
                        <>
                          <Separator />
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-semibold text-muted-foreground">Previous reasoning prompt</p>
                              <div className="rounded-lg border bg-muted/30 p-2.5 text-xs text-muted-foreground max-h-20 overflow-y-auto">{reasoningPrompt || <span className="italic">Empty</span>}</div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-muted-foreground">New reasoning prompt</label>
                              <Textarea rows={3} value={overrideRePrompt} onChange={(e) => setOverrideRePrompt(e.target.value)} placeholder="Override reasoning prompt..." className="text-xs" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-semibold text-muted-foreground">Previous reasoning validation</p>
                              <div className="rounded-lg border bg-muted/30 p-2.5 text-xs text-muted-foreground max-h-20 overflow-y-auto">{reasoningValidation || <span className="italic">Empty</span>}</div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-muted-foreground">New reasoning validation</label>
                              <Textarea rows={3} value={overrideReValidation} onChange={(e) => setOverrideReValidation(e.target.value)} placeholder="Override reasoning validation..." className="text-xs" />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Override Keywords expanded */}
                {overrideKeywords && (
                  <div className="rounded-xl border p-4 space-y-2 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">New Keywords</p>
                      <button onClick={() => setExpandedOverride('keywords')} className="rounded-md p-1 hover:bg-muted cursor-pointer text-muted-foreground hover:text-primary transition-colors" title="Expand to full screen"><Maximize2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground">Previous keywords</p>
                        <div className="rounded-lg border bg-muted/30 p-2.5 text-xs text-muted-foreground">{selCrit?.keywords?.join(', ') || <span className="italic">None set</span>}</div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-muted-foreground">New keywords (comma-separated)</label>
                        <Textarea rows={2} value={overrideKw} onChange={(e) => setOverrideKw(e.target.value)} placeholder="keyword1, keyword2, ..." className="text-xs" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Run scope */}
              <div className="space-y-3">
                <label className="text-sm font-semibold">Run scope</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: 'sample' as const, label: 'Sample set', desc: 'Random patient sample' },
                    { value: 'specific' as const, label: 'Specific patient IDs', desc: 'Enter patient IDs manually' },
                    { value: 'reuse' as const, label: 'Reuse previous sample', desc: 'Pick a previous run to reuse patients' },
                    { value: 'full' as const, label: 'Full run', desc: 'All indexed patients' },
                  ]).map((opt) => (
                    <label key={opt.value} className={`flex items-start gap-2 rounded-xl border p-3 cursor-pointer transition-colors ${runScope === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'}`}>
                      <input type="radio" name="runScope" checked={runScope === opt.value} onChange={() => setRunScope(opt.value)} className="accent-primary mt-0.5" />
                      <div><p className="text-sm font-semibold">{opt.label}</p><p className="text-xs text-muted-foreground">{opt.desc}</p></div>
                    </label>
                  ))}
                </div>
              </div>

              {runScope === 'sample' && (
                <div className="space-y-2"><label className="text-sm font-semibold">Sample size</label><Input type="number" value={sampleSize} onChange={(e) => setSampleSize(e.target.value)} placeholder="50" /></div>
              )}
              {runScope === 'specific' && (
                <div className="space-y-2"><label className="text-sm font-semibold">Patient IDs</label><Textarea value={patientIds} onChange={(e) => setPatientIds(e.target.value)} placeholder="PT-10211, PT-10520, PT-10602..." rows={3} /></div>
              )}
              {runScope === 'reuse' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Select run to reuse patients from</label>
                  {allRuns.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No previous runs available</p>
                  ) : (
                    <div className="space-y-2">
                      <Select value={reuseRunId} onChange={(e) => setReuseRunId(e.target.value)} className="text-xs">
                        <option value="">Select a run...</option>
                        {allRuns.map((r) => (
                          <option key={r.id} value={r.runId}>{r.runId} — {critNameForRun(r)} ({r.extractionCount}/{r.totalCount} patients, {r.status})</option>
                        ))}
                      </Select>
                      {reuseRunId && (() => {
                        const r = allRuns.find((x) => x.runId === reuseRunId);
                        if (!r) return null;
                        return (
                          <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{r.runId}</span>
                              <Badge variant={r.status === 'Done' ? 'success' : 'secondary'} className="text-[8px] px-1.5 py-0">{r.status}</Badge>
                            </div>
                            <p className="text-muted-foreground">Criterion: {critNameForRun(r)}</p>
                            <p className="text-muted-foreground">{r.extractionCount} patients · {r.fileName}</p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStage(2)}><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>
                <Button onClick={() => { setStage(4); setStatus('Processing'); setCount(0); }}><Play className="mr-2 h-4 w-4" /> Run now</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stage 4 — Processing */}
        {stage === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Processing</CardTitle>
              <CardDescription>Run {runId} for "{selCrit?.name}" is being processed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">File: {fileName}</Badge>
                <Badge variant="secondary">Extraction: {count}/{totalCount}</Badge>
                <Badge variant={status === 'Done' ? 'success' : status === 'Failed' ? 'destructive' : 'processing'}>
                  {status === 'Processing' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}{status}
                </Badge>
                {status === 'Done' && <Badge variant="success">File Ready</Badge>}
              </div>
              <Progress value={count} max={totalCount} />
              <div className="flex gap-2">
                {status === 'Processing' && <Button variant="outline" size="sm" onClick={() => setStatus('Failed')}><Square className="mr-1 h-3 w-3" /> Stop processing</Button>}
                {status === 'Failed' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setStatus('Processing')}>Resume remaining</Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground"><ExternalLink className="mr-1 h-3.5 w-3.5" /> View Logs</Button>
                  </>
                )}
              </div>
              <div className="flex justify-end pt-2">
                <Button disabled={count < 1} onClick={() => navigate('/projects/prj-01/review')}>Start Reviewing<ChevronRight className="ml-2 h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── OVERRIDE EXPAND MODAL ─── */}
      <Dialog
        open={!!expandedOverride}
        onClose={() => setExpandedOverride(null)}
        title={expandedOverride === 'models' ? 'Override LLM Selection' : expandedOverride === 'prompts' ? 'Override Prompts' : 'Override Keywords'}
        description={`Full-screen view for "${selCrit?.name ?? ''}"`}
        fullscreen
      >
        <div className="space-y-6">
          {expandedOverride === 'models' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">Previous extraction model</p>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm font-medium">{extractionModel}</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">New extraction model</label>
                <Select value={overrideExModel} onChange={(e) => setOverrideExModel(e.target.value)} className="text-sm">{LLM_OPTIONS.map((m) => <option key={m}>{m}</option>)}</Select>
              </div>
              {!skipReasoning && (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-muted-foreground">Previous reasoning model</p>
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm font-medium">{reasoningModel}</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-muted-foreground">New reasoning model</label>
                    <Select value={overrideReModel} onChange={(e) => setOverrideReModel(e.target.value)} className="text-sm">{LLM_OPTIONS.map((m) => <option key={m}>{m}</option>)}</Select>
                  </div>
                </>
              )}
            </div>
          )}

          {expandedOverride === 'prompts' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Previous extraction prompt</p>
                  <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground min-h-[120px] whitespace-pre-wrap">{extractionPrompt || <span className="italic">Empty</span>}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">New extraction prompt</label>
                  <Textarea rows={5} value={overrideExPrompt} onChange={(e) => setOverrideExPrompt(e.target.value)} placeholder="Override extraction prompt..." className="min-h-[120px]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Previous extraction validation</p>
                  <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground min-h-[120px] whitespace-pre-wrap">{extractionValidation || <span className="italic">Empty</span>}</div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-muted-foreground">New extraction validation</label>
                  <Textarea rows={5} value={overrideExValidation} onChange={(e) => setOverrideExValidation(e.target.value)} placeholder="Override extraction validation..." className="min-h-[120px]" />
                </div>
              </div>
              {!skipReasoning && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-muted-foreground">Previous reasoning prompt</p>
                      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground min-h-[120px] whitespace-pre-wrap">{reasoningPrompt || <span className="italic">Empty</span>}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground">New reasoning prompt</label>
                      <Textarea rows={5} value={overrideRePrompt} onChange={(e) => setOverrideRePrompt(e.target.value)} placeholder="Override reasoning prompt..." className="min-h-[120px]" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-muted-foreground">Previous reasoning validation</p>
                      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground min-h-[120px] whitespace-pre-wrap">{reasoningValidation || <span className="italic">Empty</span>}</div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-muted-foreground">New reasoning validation</label>
                      <Textarea rows={5} value={overrideReValidation} onChange={(e) => setOverrideReValidation(e.target.value)} placeholder="Override reasoning validation..." className="min-h-[120px]" />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {expandedOverride === 'keywords' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground">Previous keywords</p>
                <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground min-h-[100px]">{selCrit?.keywords?.join(', ') || <span className="italic">None set</span>}</div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-muted-foreground">New keywords (comma-separated)</label>
                <Textarea rows={5} value={overrideKw} onChange={(e) => setOverrideKw(e.target.value)} placeholder="keyword1, keyword2, ..." className="min-h-[100px]" />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setExpandedOverride(null)}><Minimize2 className="mr-1.5 h-3.5 w-3.5" /> Close</Button>
          </div>
        </div>
      </Dialog>

      {/* ─── RUN INSPECT MODAL ─── */}
      <Dialog open={!!inspectRun} onClose={() => setInspectRun(null)} title={`Run Details — ${inspectRun?.runId ?? ''}`} description={`Configuration snapshot for ${inspectRun ? critNameForRun(inspectRun) : ''}`}>
        {inspectRun && (() => {
          const crit = localCriteria.find((c) => c.id === inspectRun.criterionId);
          return (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs font-semibold text-muted-foreground">Run ID</p><p className="font-medium">{inspectRun.runId}</p></div>
                <div><p className="text-xs font-semibold text-muted-foreground">Status</p><Badge variant={inspectRun.status === 'Done' ? 'success' : inspectRun.status === 'Processing' ? 'processing' : 'secondary'}>{inspectRun.status}</Badge></div>
                <div><p className="text-xs font-semibold text-muted-foreground">Criterion</p><p className="font-medium">{crit?.name ?? inspectRun.criterionId}</p></div>
                <div><p className="text-xs font-semibold text-muted-foreground">Type</p><Badge variant={crit?.type === 'inclusion' ? 'success' : 'destructive'} className="text-[9px]">{crit?.type ?? 'unknown'}</Badge></div>
                <div><p className="text-xs font-semibold text-muted-foreground">Extraction</p><p>{inspectRun.extractionCount}/{inspectRun.totalCount} patients</p></div>
                <div><p className="text-xs font-semibold text-muted-foreground">File</p><p className="truncate">{inspectRun.fileName}</p></div>
                <div><p className="text-xs font-semibold text-muted-foreground">Sample size</p><p>{inspectRun.sampleSize}</p></div>
                <div><p className="text-xs font-semibold text-muted-foreground">Full run</p><p>{inspectRun.fullRun ? 'Yes' : 'No'}</p></div>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">LLM Model</p>
                <p className="text-sm font-medium">{crit?.model ?? 'GPT-4.1'}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Extraction Prompt</p>
                <div className="rounded-lg border bg-muted/30 p-3 text-xs max-h-32 overflow-y-auto">{crit?.extractionPrompt || <span className="italic text-muted-foreground">Empty</span>}</div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Extraction Validation</p>
                <div className="rounded-lg border bg-muted/30 p-3 text-xs max-h-32 overflow-y-auto">{crit?.extractionValidation || <span className="italic text-muted-foreground">Empty</span>}</div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reasoning Prompt</p>
                <div className="rounded-lg border bg-muted/30 p-3 text-xs max-h-32 overflow-y-auto">{crit?.reasoningPrompt || <span className="italic text-muted-foreground">Empty</span>}</div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Reasoning Validation</p>
                <div className="rounded-lg border bg-muted/30 p-3 text-xs max-h-32 overflow-y-auto">{crit?.reasoningValidation || <span className="italic text-muted-foreground">Empty</span>}</div>
              </div>
              {crit?.keywords && crit.keywords.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Keywords</p>
                  <div className="flex flex-wrap gap-1">{crit.keywords.map((k, i) => <Badge key={i} variant="secondary" className="text-[9px]">{k}</Badge>)}</div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg border p-2.5 text-center"><p className="text-muted-foreground">Override models</p><p className="font-bold">{inspectRun.overrideModels ? 'Yes' : 'No'}</p></div>
                <div className="rounded-lg border p-2.5 text-center"><p className="text-muted-foreground">Override prompts</p><p className="font-bold">{inspectRun.overridePrompts ? 'Yes' : 'No'}</p></div>
                <div className="rounded-lg border p-2.5 text-center"><p className="text-muted-foreground">Override keywords</p><p className="font-bold">{inspectRun.overrideKeywords ? 'Yes' : 'No'}</p></div>
              </div>
              <div className="flex justify-end"><Button variant="outline" onClick={() => setInspectRun(null)}><X className="mr-1 h-3.5 w-3.5" /> Close</Button></div>
            </div>
          );
        })()}
      </Dialog>
    </div>
  );
}
