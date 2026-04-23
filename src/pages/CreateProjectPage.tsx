import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import type { DataType, ProjectType, Provider, ReviewItem, Status } from '@/types';
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
import { Dialog } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Copy, DatabaseZap, ExternalLink, Loader2, Maximize2, Plus, Search, Trash2, X } from 'lucide-react';

function randomId() {
  return `prj-${Math.random().toString(36).slice(2, 8)}`;
}

const STAGES_SCHEMA = [
  { label: 'Project Setup', step: 1 },
  { label: 'Data Creation', step: 2 },
  { label: 'Processing', step: 3 },
] as const;

const STAGES_SQL = [
  { label: 'Project Setup', step: 1 },
  { label: 'Processing', step: 3 },
] as const;

const MOCK_RECORDS = [
  {
    _id: '69c0daae7a350e616a579627',
    project_id: '69c0daa67a350e616a579625',
    criteria_id: 'crit-001',
    request_id: 'b8966df4-bd2c-4372-a646-dcea350c6468',
    patient_id: '100100050286813',
    encounter_id: '100100050286813',
    context: 'P-TAU217 for ((GUARANTORLASTNAME)), ((GUARANTORFIRSTNAME)) 1965 (60yo ((MIDDLENAME))) #1147597 E#1147597 P-TAU217 (#8493162, Final,    2025-11-29    3:17pm, tied to order #8273650) Clinical cutoff value was established using samples from a cohort characterized with amyloid PET data. A p-tau217 value of >0.18 is a reported surrogate marker for beta amyloid pathology, and can be facilitate biological identification of Alzheimer\'s disease p-tau217 has also been used in clinical trials to monitor patients on anti-amyloid therapy (2,3) . Test performed by Fujirebio Lumipulse chemiluminescent enzyme immunoassay (CLEIA) . Values obtained with different methods cannot be used interchangeably. The validated limit of quantification is 0.06 pg/mL. Assay detection limit is 0. 03 pg/mL. COMMENT Final 03    2025-11-29    Phosphorylated Tau 217 Immunoassay for Alzheimer Disease Pathology." "Differential roles and p-tau217 for Alzheimer\'s trial selection and disease monitoring." ((LASTUPDATED))ure medicine 28.12 (2022): 2555-2562. Fontecorvo MU, Lu ((MIDDLENAME)), Burnham S Bionarkers in Barly Symptomatic et al. "Association of Donanemab Treatment With Exploratory Plasma Alzheimer Disease: A Secondary Analysis of the TRAILBLAZER-ALZ Randomized Clinical Trial". JAMA Neurol. 2022; 79 (12) : 1250-1259. FASTING NO Test(s) 484391-p-tau217 was developed and its performance characteristics determined by Labcorp. It has not been cleared or approved by the Food and Drug Administration. FOOTNOTES RESULT NOTE',
    keywords: ['amyloid pet', 'pet scan', 'pet imaging'],
    encounter_date: '',
    created_at: '2026-03-23T06:16:06.097Z',
  },
  {
    _id: '69c0daae7a350e616a579628',
    project_id: '69c0daa67a350e616a579625',
    criteria_id: 'crit-001',
    request_id: 'c9077ef5-ce3d-4483-b757-edcb461d7579',
    patient_id: '100100050312456',
    encounter_id: '100100050312456',
    context: 'CLINICAL NOTE: Patient presents with progressive memory decline over 18 months. MMSE score 22/30. Family history of Alzheimer\'s disease in mother (onset age 68). MRI shows moderate hippocampal atrophy. CSF biomarkers: A-beta42 low, total tau elevated. P-tau217 ordered for confirmatory testing. Assessment: Probable Alzheimer\'s disease, mild cognitive impairment stage. Plan: Refer to clinical trial screening for anti-amyloid therapy. Continue donepezil 10mg daily. Follow-up in 3 months with repeat cognitive testing.',
    keywords: ['amyloid pet', 'cognitive decline', 'alzheimer'],
    encounter_date: '2025-12-15',
    created_at: '2026-03-23T06:16:06.097Z',
  },
  {
    _id: '69c0daae7a350e616a579629',
    project_id: '69c0daa67a350e616a579625',
    criteria_id: 'crit-001',
    request_id: 'd0188fg6-df4e-5594-c868-fedc572e8680',
    patient_id: '100100050345789',
    encounter_id: '100100050345789',
    context: 'PROGRESS NOTE: 72 yo male. Known diagnosis of amnestic MCI. Recent PET scan shows elevated amyloid burden (Centiloid 45). P-tau217 result: 0.42 pg/mL (positive, above clinical cutoff of 0.18). Patient meets biomarker criteria for early Alzheimer\'s disease. Discussed treatment options including lecanemab infusion therapy. Patient agreeable to proceed. Labs: CBC normal, CMP normal, LFTs within normal limits. APOE genotype: e3/e4 heterozygous. No contraindications to anti-amyloid therapy identified.',
    keywords: ['amyloid pet', 'pet scan', 'lecanemab'],
    encounter_date: '2026-01-08',
    created_at: '2026-03-23T06:16:06.097Z',
  },
  {
    _id: '69c0daae7a350e616a579630',
    project_id: '69c0daa67a350e616a579625',
    criteria_id: 'crit-002',
    request_id: 'e1299gh7-eg5f-6605-d979-gfed683f9791',
    patient_id: '100100050378012',
    encounter_id: '100100050378012',
    context: 'NEUROLOGY CONSULT: 65 yo female referred for evaluation of chronic migraine with aura. Reports 18 headache days/month, 8 with aura features including visual scotoma and unilateral paresthesias lasting 20-45 minutes. Failed adequate trials of topiramate (100mg), propranolol (80mg), and amitriptyline (50mg). Currently on galcanezumab 240mg monthly with partial response (reduced to 12 days/month). Considering switch to fremanezumab or addition of rimegepant PRN. No history of cardiovascular disease. BMI 26. Normal neurological examination.',
    keywords: ['migraine', 'aura', 'CGRP'],
    encounter_date: '2026-02-10',
    created_at: '2026-03-23T06:16:06.097Z',
  },
  {
    _id: '69c0daae7a350e616a579631',
    project_id: '69c0daa67a350e616a579625',
    criteria_id: 'crit-002',
    request_id: 'f2310hi8-fh6g-7716-e080-hgfe794g0802',
    patient_id: '100100050401345',
    encounter_id: '100100050401345',
    context: 'HEADACHE CENTER VISIT: 58 yo male with episodic migraine transitioning to chronic pattern. Previously responsive to sumatriptan 100mg PRN. Now averaging 16 headache days/month. History of medication overuse (combination analgesics 4-5 days/week). Initiated detoxification protocol. Started erenumab 140mg monthly. MIDAS score: 42 (severe disability). PHQ-9: 8 (mild depression, monitoring). Plan includes behavioral headache management, biofeedback referral, and 3-month follow-up for CGRP response assessment.',
    keywords: ['migraine', 'CGRP', 'medication overuse'],
    encounter_date: '2026-01-22',
    created_at: '2026-03-23T06:16:06.097Z',
  },
];

export function CreateProjectPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addProject, clients, criteria: globalCriteria, cohortImports, linkCohortToProject, addReviewItems } = useAppContext();
  const searchParams = new URLSearchParams(location.search);
  const [stage, setStage] = useState(1);
  const [flowType, setFlowType] = useState<'rwe' | 'ct'>(searchParams.get('flow') === 'ct' ? 'ct' : 'rwe');
  const [selectedCohortId, setSelectedCohortId] = useState(searchParams.get('cohort') ?? '');
  const [cohortSearch, setCohortSearch] = useState('');
  const selectedCohort = cohortImports.find((c) => c.id === selectedCohortId);
  const availableCohorts = cohortImports.filter((c) => {
    if (c.status !== 'Active' && c.status !== 'Linked') return false;
    if (!cohortSearch.trim()) return true;
    const q = cohortSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.metadata.indication?.toLowerCase().includes(q) ||
      c.metadata.trialName?.toLowerCase().includes(q) ||
      c.metadata.trialPhase?.toLowerCase().includes(q) ||
      c.source.toLowerCase().includes(q)
    );
  });

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
  const [isPrivate, setIsPrivate] = useState(dupProject ? !dupProject.shared : false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Reviewer'>('Reviewer');

  // Criteria input
  const [criteriaMode, setCriteriaMode] = useState<'freetext' | 'individual'>('individual');
  const [freeTextCriteria, setFreeTextCriteria] = useState('');
  const [criteriaItems, setCriteriaItems] = useState<{ name: string; keywords: string }[]>(
    dupProject?.criteriaList?.length
      ? dupProject.criteriaList.map((c) => ({ name: c, keywords: '' }))
      : [{ name: '', keywords: '' }],
  );
  const criteriaList = criteriaItems.map((c) => c.name).filter(Boolean);
  const [newCriterion, setNewCriterion] = useState('');

  // Data type
  const [dataTypes, setDataTypes] = useState<DataType[]>(dupProject?.dataTypes ?? ['All']);

  // Providers
  const [providers, setProviders] = useState<Provider[]>(dupProject?.providers ?? ['FCN']);

  // Data mode: schema creation vs SQL query
  const [dataMode, setDataMode] = useState<'schema' | 'sql'>('schema');
  const [sqlSchemaName, setSqlSchemaName] = useState('');
  const [sqlTableName, setSqlTableName] = useState('');
  const [sqlColumnName, setSqlColumnName] = useState('');
  const [sqlKeywords, setSqlKeywords] = useState('');
  const [sqlDateCutoff, setSqlDateCutoff] = useState('');
  const [sqlDateColumn, setSqlDateColumn] = useState('');

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
    if (dupProject.criteriaList) setCriteriaItems(dupProject.criteriaList.map((c) => ({ name: c, keywords: '' })));
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

  // ── Data Viewer state ──
  const [dataViewerOpen, setDataViewerOpen] = useState(false);
  const [dataViewerTab, setDataViewerTab] = useState(0);
  const [contextModalRecord, setContextModalRecord] = useState<typeof MOCK_RECORDS[number] | null>(null);
  const [dataSearch, setDataSearch] = useState('');

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
    setCriteriaItems((prev) => [...prev, { name: newCriterion.trim(), keywords: '' }]);
    setNewCriterion('');
  }

  function addEmptyCriterion() {
    setCriteriaItems((prev) => [...prev, { name: '', keywords: '' }]);
  }

  function removeCriterion(idx: number) {
    setCriteriaItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateCriterionName(idx: number, name: string) {
    setCriteriaItems((prev) => prev.map((c, i) => i === idx ? { ...c, name } : c));
  }

  function updateCriterionKeywords(idx: number, keywords: string) {
    setCriteriaItems((prev) => prev.map((c, i) => i === idx ? { ...c, keywords } : c));
  }

  function addFromGlobal(name: string) {
    if (!criteriaList.includes(name)) {
      setCriteriaItems((prev) => [...prev, { name, keywords: '' }]);
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

  function goToReview() {
    setStage(2);
  }

  function generateIndices(prov: Provider): string[] {
    const p = prov.toLowerCase();
    return [`emb_${p}_athenaone_progressnotes`, `emb_${p}_athenaone_udm_tables`];
  }

  async function handleCreate() {
    const newId = randomId();
    if (flowType === 'ct' && selectedCohort) {
      await addProject({
        id: newId,
        name: name.trim() || 'Untitled CT Project',
        description: description.trim(),
        clientId,
        types: ['CT'],
        lead,
        dataSource: `${selectedCohort.source} Import`,
        dataTypes: ['All'],
        providers: [],
        patientCount: selectedCohort.metadata.totalPatients,
        lastUpdated: 'Now',
        shared: !isPrivate,
        status: 'Active',
        stageProgress: 25,
        currentStage: 2,
        totalStages: 3,
        teamAvatars: teamMembers.map((n) => n.slice(0, 2).toUpperCase()),
        criteriaList: selectedCohort.criteria.map((c) => c.name),
        flowType: 'ct',
        cohortImportId: selectedCohort.id,
      });
      await linkCohortToProject(selectedCohort.id, newId);

      // Generate ReviewItems from the cohort patients × criteria flags
      // (For simulated imports without explicit encounters, create 1 encounter per patient×criterion)
      const generatedItems: ReviewItem[] = [];
      for (const patient of selectedCohort.patients) {
        for (const cr of selectedCohort.criteria) {
          const flag = patient.flags.find((f) => f.criterionId === cr.id);
          if (!flag) continue;
          generatedItems.push({
            projectId: newId,
            patientId: patient.patientId,
            encounterId: `${newId}-${patient.patientId}-${cr.id}`,
            encounterDate: new Date().toISOString().slice(0, 10),
            processing: 'Done',
            fileName: `${patient.patientId}_${cr.id}.txt`,
            evidenceCount: 1,
            criterionName: cr.name,
            llmEligibility: (cr.type === 'inclusion' ? flag.value : !flag.value) ? 'Eligible' : 'Ineligible',
            llmReason: `Imported from ${selectedCohort.source}: ${cr.name} flag = ${flag.value ? 'TRUE' : 'FALSE'}`,
            evidenceText: `[Imported from ${selectedCohort.source}] Cohort Builder fuzzy match for criterion "${cr.name}". Initial flag: ${flag.value ? 'TRUE' : 'FALSE'}. Review the patient's clinical record to confirm this finding.`,
            assignedTo: [],
            comments: [],
            flagged: false,
            decisionLog: [],
          });
        }
      }
      if (generatedItems.length > 0) await addReviewItems(generatedItems);

      navigate(`/projects/${newId}/criteria`);
    } else {
      await addProject({
        id: newId,
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
        flowType: 'rwe',
      });
      navigate(`/projects/${newId}/criteria`);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      {/* ══════════════ STAGE 1: PROJECT SETUP ══════════════ */}
      {stage === 1 && (
        <>
          {/* Header */}
          <div>
            <h1 className="text-xl font-bold">Create Project</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {flowType === 'ct'
                ? 'Create a clinical trial cohort validation project from an imported cohort.'
                : 'Configure your neurology RWE/RWD validation project. At least one criteria is required.'}
            </p>
          </div>

          {/* Flow Type Selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setFlowType('rwe'); setSelectedCohortId(''); }}
              className={`flex flex-col rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${flowType === 'rwe' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <DatabaseZap className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold">RWE / RWD Study</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Configure criteria, run extractions, and review patient-level evidence from real-world data.</p>
            </button>
            <button
              onClick={() => setFlowType('ct')}
              className={`flex flex-col rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${flowType === 'ct' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/></svg>
                <span className="text-sm font-bold">Clinical Trial (CT)</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Validate a pre-built cohort from NeuroTerminal / Cohort Builder against trial criteria.</p>
            </button>
          </div>

          {isDuplicate && (
            <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-200">
              <Copy className="h-4 w-4 shrink-0" />
              <span>Duplicating project — all settings, criteria, prompts, and models are pre-filled. Modify anything before creating.</span>
            </div>
          )}

          <div className="space-y-6">
            {/* Project name */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Project name <span className="text-destructive">*</span></label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Migraine Prophylaxis Cohort" />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief 1-liner about this project..." />
            </div>

            {/* Client */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Client</label>
              <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>

            {/* CT: Cohort Selector */}
            {flowType === 'ct' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Select Cohort from NeuroTerminal</label>
                  <span className="text-[11px] text-muted-foreground">{availableCohorts.length} cohort{availableCohorts.length === 1 ? '' : 's'} available</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={cohortSearch}
                    onChange={(e) => setCohortSearch(e.target.value)}
                    placeholder="Search by trial name, indication, phase, or source..."
                    className="pl-9"
                  />
                </div>
                {availableCohorts.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center">
                    <p className="text-sm text-muted-foreground">{cohortSearch ? 'No cohorts match your search.' : 'No cohorts available. Import one from the Data Vault first.'}</p>
                    {!cohortSearch && <button onClick={() => navigate('/vault')} className="mt-2 text-sm font-semibold text-primary underline cursor-pointer">Go to Data Vault</button>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {availableCohorts.map((c) => {
                      const atomCount = c.criteria.reduce((s, cr) => s + cr.atoms.length, 0);
                      const unstructuredAtoms = c.criteria.reduce((s, cr) => s + cr.atoms.filter(a => a.dataSource === 'unstructured').length, 0);
                      const structuredAtoms = atomCount - unstructuredAtoms;
                      return (
                        <button
                          key={c.id}
                          onClick={() => setSelectedCohortId(c.id)}
                          className={`flex items-center justify-between w-full rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${selectedCohortId === c.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{c.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {c.source} &middot; {c.metadata.totalPatients} patients &middot; {c.criteria.length} criteria &middot; {atomCount} atoms
                              {c.metadata.indication && ` · ${c.metadata.indication}`}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {structuredAtoms > 0 && <Badge variant="processing" className="text-[9px] px-1.5 py-0">{structuredAtoms} structured</Badge>}
                              {unstructuredAtoms > 0 && <Badge variant="warning" className="text-[9px] px-1.5 py-0">{unstructuredAtoms} unstructured (review)</Badge>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge variant="success" className="text-[10px]">{c.metadata.eligibleCount} eligible</Badge>
                            <Badge variant="destructive" className="text-[10px]">{c.metadata.ineligibleCount} ineligible</Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Show cohort criteria read-only */}
                {selectedCohort && (
                  <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cohort Criteria (from {selectedCohort.source})</p>
                    {selectedCohort.criteria.map((cr) => (
                      <div key={cr.id} className="flex items-center gap-2 text-sm">
                        <Badge variant={cr.type === 'inclusion' ? 'success' : 'destructive'} className="text-[9px] px-1.5 py-0 shrink-0">
                          {cr.type === 'inclusion' ? 'INC' : 'EXC'}
                        </Badge>
                        <span className="font-medium">{cr.id}: {cr.name}</span>
                        <span className="text-xs text-muted-foreground">— {cr.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Data Source toggle — RWE only */}
            {flowType === 'rwe' && (<>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Data Source</label>
              <div className="flex items-center rounded-xl border bg-muted/40 p-1">
                <button
                  onClick={() => setDataMode('sql')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${dataMode === 'sql' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  SQL
                </button>
                <button
                  onClick={() => setDataMode('schema')}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer ${dataMode === 'schema' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <ArrowRight className="h-4 w-4" /> Create Schema
                </button>
              </div>

              {dataMode === 'sql' && (
                <div className="space-y-4 rounded-xl border p-4 mt-2">
                  <p className="text-[11px] text-muted-foreground">Provide SQL source details to generate data for this project.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Schema name <span className="text-destructive">*</span></label>
                      <Input value={sqlSchemaName} onChange={(e) => setSqlSchemaName(e.target.value)} placeholder="e.g. neuro_migraine_v3" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Table name <span className="text-destructive">*</span></label>
                      <Input value={sqlTableName} onChange={(e) => setSqlTableName(e.target.value)} placeholder="e.g. RGD_dent_udm" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Column name <span className="text-destructive">*</span></label>
                    <Input value={sqlColumnName} onChange={(e) => setSqlColumnName(e.target.value)} placeholder="e.g. encounter_text" />
                  </div>
                  <Separator />
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Date cut off <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <Input type="date" value={sqlDateCutoff} onChange={(e) => setSqlDateCutoff(e.target.value)} />
                  </div>
                  {sqlDateCutoff && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Date column <span className="text-destructive">*</span></label>
                      <Input value={sqlDateColumn} onChange={(e) => setSqlDateColumn(e.target.value)} placeholder="e.g. encounter_date" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Select type of data — only for schema mode */}
            {dataMode === 'schema' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold">Select type of data</label>
                <div className="flex gap-2">
                  {(['All', 'Structured', 'Unstructured'] as DataType[]).map((dt) => {
                    const active = dataTypes.includes(dt) || (dt === 'All' && dataTypes.includes('All'));
                    return (
                      <button
                        key={dt}
                        onClick={() => toggleDataType(dt)}
                        className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors cursor-pointer ${
                          active ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted/30 text-muted-foreground'
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
            )}

            {/* Providers — only for schema mode */}
            {dataMode === 'schema' && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Providers <span className="text-destructive">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PROVIDERS.map((p) => (
                    <button
                      key={p}
                      onClick={() => toggleProvider(p)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                        providers.includes(p) ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {providers.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">{providers.length} provider{providers.length > 1 ? 's' : ''} selected</p>
                )}
              </div>
            )}
            </>)}

            {/* Criteria — RWE only */}
            {flowType === 'rwe' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">Criteria <span className="text-destructive">*</span></label>
                <button onClick={addEmptyCriterion} className="flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 cursor-pointer">
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>

              <div className="space-y-4">
                {criteriaItems.map((item, idx) => (
                  <div key={idx} className="rounded-xl border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">Criterion {idx + 1}</span>
                      {criteriaItems.length > 1 && (
                        <button onClick={() => removeCriterion(idx)} className="text-muted-foreground hover:text-destructive cursor-pointer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <Input
                      value={item.name}
                      onChange={(e) => updateCriterionName(idx, e.target.value)}
                      placeholder="Criteria name"
                    />
                    <Textarea
                      value={item.keywords}
                      onChange={(e) => updateCriterionKeywords(idx, e.target.value)}
                      placeholder="Keywords (comma or semicolon separated)"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>
            )}

            {/* ── Secondary fields (below fold) ── */}
            <Separator />

            <div className="grid grid-cols-2 gap-4">
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
              {/* Type of project */}
              {flowType === 'rwe' && (
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Type of project</label>
                <Select value={type[0]} onChange={(e) => setType([e.target.value as ProjectType])}>
                  <option value="RWE">RWE</option>
                  <option value="RWD">RWD</option>
                </Select>
              </div>
              )}
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

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => navigate('/projects')}>Cancel</Button>
              {flowType === 'ct' ? (
                <Button onClick={() => void handleCreate()} disabled={!selectedCohortId || !name.trim()}>
                  Create CT Project
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : dataMode === 'schema' ? (
                <Button onClick={goToReview} disabled={finalCriteria.length === 0}>
                  Review Project
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => { setStage(3); setSchemaStatus('Processing'); setProgressPct(0); setFileStatus('pending'); setSimulateError(false); }}
                  disabled={!sqlSchemaName.trim() || !sqlTableName.trim() || !sqlColumnName.trim()}
                >
                  Generate Data
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ══════════════ STAGE 2: REVIEW PROJECT ══════════════ */}
      {stage === 2 && (() => {
        const selectedClient = clients.find((c) => c.id === clientId);
        const dataSourceLabel = dataMode === 'sql' ? 'SQL' : 'Create Schema';
        const dataTypeLabel = dataTypes.includes('All') ? 'All data' : dataTypes.join(', ');

        return (
          <Card className="mx-auto max-w-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Review Project</CardTitle>
              <CardDescription>Confirm your project details before creating.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Project Name */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Project Name</p>
                <p className="text-sm font-semibold">{name || 'Untitled'}</p>
              </div>

              {/* Description */}
              {description && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</p>
                  <p className="text-sm">{description}</p>
                </div>
              )}

              {/* Client */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Client</p>
                <p className="text-sm font-semibold">{selectedClient?.name ?? '—'}</p>
              </div>

              {/* Data Source */}
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Data Source</p>
                <p className="text-sm font-semibold">{dataSourceLabel} — {dataTypeLabel}</p>
              </div>

              {/* Providers */}
              {providers.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Providers</p>
                  <div className="flex flex-wrap gap-1.5">
                    {providers.map((p) => (
                      <Badge key={p} variant="secondary" className="text-xs">{p.toLowerCase()}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Criteria */}
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Criteria ({finalCriteria.length})</p>
                {criteriaItems.filter((ci) => ci.name.trim()).map((item, idx) => {
                  const allIndices = providers.flatMap((p) => generateIndices(p));
                  return (
                    <div key={idx} className="rounded-xl border bg-card p-4 space-y-2">
                      <p className="text-sm font-bold">{item.name}</p>
                      {item.keywords.trim() && (
                        <p className="text-xs text-muted-foreground">Keywords: {item.keywords}</p>
                      )}
                      {allIndices.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Indices</p>
                          <div className="flex flex-wrap gap-1.5">
                            {allIndices.map((idx_name) => (
                              <Badge key={idx_name} variant="secondary" className="text-[10px] font-mono">{idx_name}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStage(1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={() => void handleCreate()}>
                  Create Project
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })()}

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

            {/* ── Verify Data entry point (shown when Done) ── */}
            {schemaStatus === 'Done' && (
              <button
                onClick={() => { setDataViewerOpen(true); setDataViewerTab(0); }}
                className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/[0.03] p-4 transition-all hover:border-primary/50 hover:bg-primary/[0.06] cursor-pointer group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 group-hover:bg-primary/20 transition-colors">
                  <DatabaseZap className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Verify Data</p>
                  <p className="text-[11px] text-muted-foreground">Inspect indexed records by criteria. Review patient data before validation.</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            )}

            {/* Move to validation CTA */}
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStage(dataMode === 'sql' ? 1 : 2)} disabled={schemaStatus === 'Processing'}>
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

      {/* ══════════════ DATA VIEWER OVERLAY ══════════════ */}
      {dataViewerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <DatabaseZap className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold">Verify Data</h2>
                <p className="text-[11px] text-muted-foreground">
                  {MOCK_RECORDS.length} records across {(() => {
                    const critIds = [...new Set(MOCK_RECORDS.map((r) => r.criteria_id))];
                    return critIds.length;
                  })()} criteria
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setDataViewerOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Criteria tabs */}
          {(() => {
            const critMap = new Map<string, typeof MOCK_RECORDS>();
            MOCK_RECORDS.forEach((r) => {
              const arr = critMap.get(r.criteria_id) ?? [];
              arr.push(r);
              critMap.set(r.criteria_id, arr);
            });
            const critEntries = [...critMap.entries()];
            const critLabels = criteriaItems.filter((c) => c.name.trim());

            return (
              <>
                <div className="flex items-center gap-1 border-b px-6 py-2 overflow-x-auto">
                  {critEntries.map(([critId], idx) => {
                    const label = critLabels[idx]?.name ?? `Criterion ${idx + 1}`;
                    const count = critMap.get(critId)?.length ?? 0;
                    return (
                      <button
                        key={critId}
                        onClick={() => { setDataViewerTab(idx); setDataSearch(''); }}
                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                          dataViewerTab === idx
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                      >
                        {label}
                        <Badge variant={dataViewerTab === idx ? 'secondary' : 'secondary'} className="text-[10px] px-1.5 py-0">
                          {count}
                        </Badge>
                      </button>
                    );
                  })}
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto px-6 py-4">
                  {(() => {
                    const currentCritId = critEntries[dataViewerTab]?.[0];
                    const allRecords = critMap.get(currentCritId ?? '') ?? [];
                    const critLabel = critLabels[dataViewerTab]?.name ?? `Criterion ${dataViewerTab + 1}`;
                    const q = dataSearch.trim().toLowerCase();
                    const records = q
                      ? allRecords.filter((r) =>
                          r.patient_id.toLowerCase().includes(q) ||
                          r.encounter_id.toLowerCase().includes(q) ||
                          r.request_id.toLowerCase().includes(q) ||
                          r.context.toLowerCase().includes(q) ||
                          r.keywords.some((kw) => kw.toLowerCase().includes(q)) ||
                          (r.encounter_date && r.encounter_date.toLowerCase().includes(q))
                        )
                      : allRecords;

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h3 className="text-sm font-bold">{critLabel}</h3>
                            <p className="text-[11px] text-muted-foreground">
                              {q ? `${records.length} of ${allRecords.length} records` : `${records.length} records found`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                value={dataSearch}
                                onChange={(e) => setDataSearch(e.target.value)}
                                placeholder="Search by ID, keyword, or text..."
                                className="h-8 w-64 pl-8 text-xs"
                              />
                              {dataSearch && (
                                <button
                                  onClick={() => setDataSearch('')}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-[10px] shrink-0">criteria_id: {currentCritId}</Badge>
                          </div>
                        </div>

                        <div className="rounded-xl border overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/50 border-b">
                                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[60px]">#</th>
                                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[140px]">Patient ID</th>
                                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[140px]">Encounter ID</th>
                                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[200px]">Request ID</th>
                                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[100px]">Date</th>
                                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[130px]">Keywords</th>
                                <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Context</th>
                                <th className="px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[50px]"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {records.length === 0 && (
                                <tr>
                                  <td colSpan={8} className="px-3 py-10 text-center">
                                    <p className="text-sm text-muted-foreground">No records match "{dataSearch}"</p>
                                    <button onClick={() => setDataSearch('')} className="mt-1 text-xs text-primary hover:underline cursor-pointer">Clear search</button>
                                  </td>
                                </tr>
                              )}
                              {records.map((rec, rIdx) => (
                                <tr key={rec._id} className="hover:bg-muted/20 transition-colors">
                                  <td className="px-3 py-3 text-xs text-muted-foreground font-mono">{rIdx + 1}</td>
                                  <td className="px-3 py-3 text-xs font-mono font-medium">{rec.patient_id}</td>
                                  <td className="px-3 py-3 text-xs font-mono">{rec.encounter_id}</td>
                                  <td className="px-3 py-3">
                                    <span className="text-[10px] font-mono text-muted-foreground break-all">{rec.request_id}</span>
                                  </td>
                                  <td className="px-3 py-3 text-xs">
                                    {rec.encounter_date ? (
                                      <span className="font-medium">{rec.encounter_date}</span>
                                    ) : (
                                      <span className="text-muted-foreground italic">—</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="flex flex-wrap gap-1">
                                      {rec.keywords.map((kw) => (
                                        <Badge key={kw} variant="secondary" className="text-[9px] px-1.5 py-0">{kw}</Badge>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <p className="text-xs text-muted-foreground line-clamp-2 max-w-[400px] leading-relaxed">{rec.context}</p>
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <button
                                      onClick={() => setContextModalRecord(rec)}
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                      title="Expand record"
                                    >
                                      <Maximize2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t px-6 py-3">
                  <p className="text-[11px] text-muted-foreground">
                    Showing {(() => {
                      const all = critMap.get(critEntries[dataViewerTab]?.[0] ?? '') ?? [];
                      if (!dataSearch.trim()) return `${all.length} records for selected criteria`;
                      const ql = dataSearch.trim().toLowerCase();
                      const filtered = all.filter((r) =>
                        r.patient_id.toLowerCase().includes(ql) ||
                        r.encounter_id.toLowerCase().includes(ql) ||
                        r.request_id.toLowerCase().includes(ql) ||
                        r.context.toLowerCase().includes(ql) ||
                        r.keywords.some((kw) => kw.toLowerCase().includes(ql)) ||
                        (r.encounter_date && r.encounter_date.toLowerCase().includes(ql))
                      );
                      return `${filtered.length} of ${all.length} records matching "${dataSearch}"`;
                    })()}
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setDataViewerOpen(false)}>
                    Close
                  </Button>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* ══════════════ CONTEXT EXPAND MODAL ══════════════ */}
      {contextModalRecord && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border bg-background shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-base font-bold">Record Detail</h3>
                <p className="text-[11px] text-muted-foreground">Patient {contextModalRecord.patient_id} · Encounter {contextModalRecord.encounter_id}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setContextModalRecord(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Modal body — scrollable */}
            <ScrollArea className="flex-1 overflow-auto">
              <div className="p-6 space-y-5">
                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 rounded-xl bg-muted/30 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Patient ID</p>
                    <p className="text-sm font-mono font-semibold">{contextModalRecord.patient_id}</p>
                  </div>
                  <div className="space-y-1 rounded-xl bg-muted/30 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Encounter ID</p>
                    <p className="text-sm font-mono font-semibold">{contextModalRecord.encounter_id}</p>
                  </div>
                  <div className="space-y-1 rounded-xl bg-muted/30 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Request ID</p>
                    <p className="text-xs font-mono break-all">{contextModalRecord.request_id}</p>
                  </div>
                  <div className="space-y-1 rounded-xl bg-muted/30 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Encounter Date</p>
                    <p className="text-sm font-semibold">{contextModalRecord.encounter_date || '—'}</p>
                  </div>
                  <div className="space-y-1 rounded-xl bg-muted/30 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Document ID</p>
                    <p className="text-xs font-mono break-all">{contextModalRecord._id}</p>
                  </div>
                  <div className="space-y-1 rounded-xl bg-muted/30 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Created At</p>
                    <p className="text-sm">{new Date(contextModalRecord.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {/* Keywords */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {contextModalRecord.keywords.map((kw) => (
                      <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Full context */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Context</p>
                  <div className="rounded-xl border bg-muted/20 p-5">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{contextModalRecord.context}</p>
                  </div>
                </div>

                {/* IDs reference */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">References</p>
                  <div className="rounded-xl border bg-muted/20 p-4 space-y-1.5">
                    <p className="text-xs"><span className="font-semibold text-muted-foreground">project_id:</span> <span className="font-mono">{contextModalRecord.project_id}</span></p>
                    <p className="text-xs"><span className="font-semibold text-muted-foreground">criteria_id:</span> <span className="font-mono">{contextModalRecord.criteria_id}</span></p>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Modal footer */}
            <div className="flex items-center justify-end border-t px-6 py-3">
              <Button variant="outline" onClick={() => setContextModalRecord(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
