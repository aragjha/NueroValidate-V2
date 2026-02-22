import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import type { CriterionType, Status } from '@/types';
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
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Play,
  Plus,
  Search,
  Square,
  Trash2,
} from 'lucide-react';

export function CriteriaPage() {
  const navigate = useNavigate();
  const { role, criteria, runs } = useAppContext();
  const [stage, setStage] = useState(1);
  const [collapsed, setCollapsed] = useState(false);
  const [selected, setSelected] = useState(criteria[0]?.id ?? '');
  const [critSearch, setCritSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'inclusion' | 'exclusion'>('all');

  // Local criteria state for add/edit
  const [localCriteria, setLocalCriteria] = useState(criteria);
  const [addMode, setAddMode] = useState(false);
  const [newCritName, setNewCritName] = useState('');
  const [newCritType, setNewCritType] = useState<CriterionType>('inclusion');

  // Prompt editing (stage 2)
  const selCrit = localCriteria.find((c) => c.id === selected);
  const [extractionPrompt, setExtractionPrompt] = useState('');
  const [extractionValidation, setExtractionValidation] = useState('');
  const [reasoningPrompt, setReasoningPrompt] = useState('');
  const [reasoningValidation, setReasoningValidation] = useState('');
  const [model, setModel] = useState('GPT-4.1');

  // Run configuration (stage 3)
  const [runId, setRunId] = useState('RUN-001');
  const [overrideModels, setOverrideModels] = useState(false);
  const [overridePrompts, setOverridePrompts] = useState(false);
  const [overrideKeywords, setOverrideKeywords] = useState(false);
  const [sampleSize, setSampleSize] = useState('50');
  const [patientIds, setPatientIds] = useState('');
  const [, setReuseSample] = useState(false);
  const [, setFullRun] = useState(false);
  const [runScope, setRunScope] = useState<'sample' | 'specific' | 'reuse' | 'full'>('sample');

  // Processing (stage 4)
  const [status, setStatus] = useState<Status>('Queued');
  const [count, setCount] = useState(0);
  const [totalCount] = useState(50);
  const [fileName] = useState('migraine_cohort_batch_01.csv');

  useEffect(() => {
    if (selCrit) {
      setExtractionPrompt(selCrit.extractionPrompt);
      setExtractionValidation(selCrit.extractionValidation);
      setReasoningPrompt(selCrit.reasoningPrompt);
      setReasoningValidation(selCrit.reasoningValidation);
      setModel(selCrit.model);
    }
  }, [selCrit]);

  useEffect(() => {
    setLocalCriteria(criteria);
  }, [criteria]);

  useEffect(() => {
    if (stage !== 4 || status !== 'Processing') return;
    const id = setInterval(() => {
      setCount((prev) => {
        const next = prev + 1;
        if (next >= totalCount) {
          clearInterval(id);
          setStatus('Done');
        }
        return Math.min(next, totalCount);
      });
    }, 200);
    return () => clearInterval(id);
  }, [stage, status, totalCount]);

  const filteredCriteria = localCriteria.filter((c) => {
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (critSearch.trim()) return c.name.toLowerCase().includes(critSearch.toLowerCase());
    return true;
  });

  function addCriterion() {
    if (!newCritName.trim()) return;
    const newC = {
      id: `cri-${Math.random().toString(36).slice(2, 8)}`,
      name: newCritName.trim(),
      type: newCritType,
      description: '',
      extractionPrompt: '',
      extractionValidation: '',
      reasoningPrompt: '',
      reasoningValidation: '',
      model: 'GPT-4.1',
    };
    setLocalCriteria((prev) => [...prev, newC]);
    setSelected(newC.id);
    setNewCritName('');
    setAddMode(false);
  }

  return (
    <div className="flex gap-4">
      {/* Left panel */}
      <aside
        className={`shrink-0 rounded-2xl border bg-card transition-all shadow-sm ${collapsed ? 'w-14' : 'w-72'}`}
      >
        <div className="flex items-center justify-between border-b p-4">
          {!collapsed && (
            <span className="text-sm font-semibold">
              {stage < 3 ? 'Criteria' : stage === 3 ? 'Run Config' : 'Runs'}
            </span>
          )}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed((s) => !s)}>
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>
        {!collapsed && (
          <div className="p-4 space-y-3">
            {/* Criteria search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={critSearch}
                onChange={(e) => setCritSearch(e.target.value)}
                placeholder="Search criteria..."
                className="h-9 pl-9 text-xs"
              />
            </div>

            {/* Inclusion / Exclusion filter */}
            <div className="flex gap-1">
              {(['all', 'inclusion', 'exclusion'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`flex-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
                    filterType === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'inclusion' ? 'Inclusion' : 'Exclusion'}
                </button>
              ))}
            </div>

            {/* Add criteria */}
            {addMode ? (
              <div className="space-y-2 rounded-xl border p-3">
                <Input
                  value={newCritName}
                  onChange={(e) => setNewCritName(e.target.value)}
                  placeholder="Criterion name"
                  className="h-8 text-xs"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && addCriterion()}
                />
                <Select value={newCritType} onChange={(e) => setNewCritType(e.target.value as CriterionType)} className="h-8 text-xs">
                  <option value="inclusion">Inclusion</option>
                  <option value="exclusion">Exclusion</option>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-7 text-xs" onClick={addCriterion}>Add</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setAddMode(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setAddMode(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add criteria
              </Button>
            )}

            {/* Criteria list */}
            <ScrollArea className="max-h-[calc(100vh-420px)]">
              <div className="space-y-1">
                {filteredCriteria.map((criterion) => (
                  <button
                    key={criterion.id}
                    onClick={() => setSelected(criterion.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                      selected === criterion.id
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span className="truncate text-xs">{criterion.name}</span>
                    <Badge variant={criterion.type === 'inclusion' ? 'success' : 'destructive'} className="text-[9px] ml-2 shrink-0">
                      {criterion.type === 'inclusion' ? 'IN' : 'EX'}
                    </Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>

            {/* Runs side panel (when on stage 3+) */}
            {stage >= 3 && (
              <>
                <Separator />
                <p className="text-xs font-semibold text-muted-foreground">Previous Runs</p>
                <div className="space-y-1">
                  {runs.map((run) => (
                    <div key={run.id} className="rounded-lg border p-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{run.runId}</span>
                        <Badge
                          variant={run.status === 'Done' ? 'success' : run.status === 'Processing' ? 'processing' : 'secondary'}
                          className="text-[9px]"
                        >
                          {run.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-0.5">{run.extractionCount}/{run.totalCount} extracted</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </aside>

      {/* Main area */}
      <div className="min-w-0 flex-1 space-y-4">
        {/* Stage 1 — Criteria list view */}
        {stage === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Criteria Review</CardTitle>
              <CardDescription>
                {selCrit ? `Selected: ${selCrit.name}` : 'Select a criterion from the left panel'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Project actions */}
              {role === 'Admin' && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"><Copy className="mr-1 h-3.5 w-3.5" /> Duplicate project</Button>
                  <Button variant="outline" size="sm"><Pencil className="mr-1 h-3.5 w-3.5" /> Edit project</Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete project</Button>
                </div>
              )}

              {selCrit && (
                <div className="rounded-xl border bg-muted/30 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={selCrit.type === 'inclusion' ? 'success' : 'destructive'}>{selCrit.type}</Badge>
                    <span className="text-sm font-bold">{selCrit.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{selCrit.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="font-semibold text-muted-foreground">Model</p>
                      <p>{selCrit.model}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground">Extraction prompt</p>
                      <p className="truncate">{selCrit.extractionPrompt.slice(0, 80)}...</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Resume: Ready for prompt configuration</Badge>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setStage(2)} disabled={!selCrit}>
                  Configure Prompts
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stage 2 — Prompt editor & model selection */}
        {stage === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Prompts & Model Selection</CardTitle>
              <CardDescription>Configure extraction and reasoning prompts for "{selCrit?.name}"</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Extraction prompt</label>
                  <Textarea
                    rows={4}
                    value={extractionPrompt}
                    onChange={(e) => setExtractionPrompt(e.target.value)}
                    placeholder="Define extraction logic..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Extraction validation</label>
                  <Textarea
                    rows={4}
                    value={extractionValidation}
                    onChange={(e) => setExtractionValidation(e.target.value)}
                    placeholder="Validate extraction output..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Reasoning prompt</label>
                  <Textarea
                    rows={4}
                    value={reasoningPrompt}
                    onChange={(e) => setReasoningPrompt(e.target.value)}
                    placeholder="Define reasoning chain..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Reasoning validation</label>
                  <Textarea
                    rows={4}
                    value={reasoningValidation}
                    onChange={(e) => setReasoningValidation(e.target.value)}
                    placeholder="Validate reasoning output..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">LLM Model</label>
                <Select value={model} onChange={(e) => setModel(e.target.value)}>
                  <option>GPT-4.1</option>
                  <option>Claude Sonnet</option>
                  <option>Gemini 2.5 Pro</option>
                  <option>Llama 4 Maverick</option>
                </Select>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStage(1)}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button onClick={() => setStage(3)}>
                  Next: Run Configuration
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stage 3 — Run configuration */}
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

              {/* Overrides */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Override options</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={overrideModels} onChange={(e) => setOverrideModels((e.target as HTMLInputElement).checked)} />
                    Override LLMs
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={overridePrompts} onChange={(e) => setOverridePrompts((e.target as HTMLInputElement).checked)} />
                    Override prompts
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={overrideKeywords} onChange={(e) => setOverrideKeywords((e.target as HTMLInputElement).checked)} />
                    Override keywords
                  </label>
                </div>
              </div>

              {/* Run scope */}
              <div className="space-y-3">
                <label className="text-sm font-semibold">Run scope</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: 'sample' as const, label: 'Sample set', desc: 'Random patient sample' },
                    { value: 'specific' as const, label: 'Specific patient IDs', desc: 'Enter patient IDs manually' },
                    { value: 'reuse' as const, label: 'Reuse previous sample', desc: 'Same patients as last run' },
                    { value: 'full' as const, label: 'Full run', desc: 'All indexed patients' },
                  ]).map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-2 rounded-xl border p-3 cursor-pointer transition-colors ${
                        runScope === opt.value ? 'border-primary bg-primary/5' : 'hover:bg-muted/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="runScope"
                        checked={runScope === opt.value}
                        onChange={() => {
                          setRunScope(opt.value);
                          setFullRun(opt.value === 'full');
                          setReuseSample(opt.value === 'reuse');
                        }}
                        className="accent-primary mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-semibold">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sample size (for sample scope) */}
              {runScope === 'sample' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Sample size</label>
                  <Input
                    type="number"
                    value={sampleSize}
                    onChange={(e) => setSampleSize(e.target.value)}
                    placeholder="50"
                  />
                </div>
              )}

              {/* Patient IDs (for specific scope) */}
              {runScope === 'specific' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Patient IDs</label>
                  <Textarea
                    value={patientIds}
                    onChange={(e) => setPatientIds(e.target.value)}
                    placeholder="PT-10211, PT-10520, PT-10602..."
                    rows={3}
                  />
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="ghost" onClick={() => setStage(2)}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={() => {
                    setStage(4);
                    setStatus('Processing');
                    setCount(0);
                  }}
                >
                  <Play className="mr-2 h-4 w-4" /> Run now
                </Button>
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
              {/* Status chips */}
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">File: {fileName}</Badge>
                <Badge variant="secondary">Extraction: {count}/{totalCount}</Badge>
                <Badge
                  variant={status === 'Done' ? 'success' : status === 'Failed' ? 'destructive' : 'processing'}
                >
                  {status === 'Processing' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  {status}
                </Badge>
                {status === 'Done' && <Badge variant="success">File Ready</Badge>}
              </div>

              <Progress value={count} max={totalCount} />

              {/* Controls */}
              <div className="flex gap-2">
                {status === 'Processing' && (
                  <Button variant="outline" size="sm" onClick={() => setStatus('Failed')}>
                    <Square className="mr-1 h-3 w-3" /> Stop processing
                  </Button>
                )}
                {status === 'Failed' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => { setStatus('Processing'); }}>
                      Resume remaining
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground">
                      <ExternalLink className="mr-1 h-3.5 w-3.5" /> View Logs
                    </Button>
                  </>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  disabled={count < 1}
                  onClick={() => navigate('/projects/prj-01/review')}
                >
                  Start Reviewing
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
