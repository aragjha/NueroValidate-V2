import { useMemo, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import type { ReviewItem } from '@/types';
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
  AlertCircle,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  Filter,
  Flag,
  MessageSquare,
  Minus,
  PanelBottomClose,
  PanelBottomOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Search,
  Send,
  SkipForward,
  StickyNote,
  UserPlus,
  X,
} from 'lucide-react';

type PatientSummary = {
  patientId: string;
  encounters: ReviewItem[];
  status: string;
  decision: string;
  assignedTo: string[];
};

const NEURO_EVIDENCE: Record<string, { green: string[]; red: string[]; neutral: string[] }> = {
  'Migraine frequency ≥ 4 episodes/month': {
    green: [
      'Patient reports 6 migraine episodes per month with aura over the past 4 months. Headache diary confirms frequency.',
      'Triptan usage recorded 5-7 times monthly. CGRP inhibitor prescribed as prophylaxis indicating high-frequency migraine.',
    ],
    red: [
      'Headache frequency documented as 2-3 episodes/month in most recent neurology follow-up. Below inclusion threshold.',
    ],
    neutral: [
      'Patient switched from sumatriptan to rizatriptan due to side effects. Follow-up in 6 weeks to reassess frequency.',
    ],
  },
  'MMSE score < 24 (cognitive impairment)': {
    green: [
      'MMSE score: 19/30 recorded on 2025-11-15. Significant decline from baseline of 26/30 documented 8 months ago.',
      'Neuropsychological testing reveals deficits in delayed recall and visuospatial function consistent with early AD.',
    ],
    red: [
      'Most recent MMSE score: 25/30. Patient does not meet cognitive impairment threshold per study protocol.',
    ],
    neutral: [
      'Donepezil 10mg initiated. Caregiver reports progressive difficulty with instrumental ADLs over past 6 months.',
    ],
  },
  'Tremor assessment documented': {
    green: [
      'UPDRS Part III motor examination performed: resting tremor score 3/4 in right upper extremity. Postural tremor 2/4 bilateral.',
      'Tremor amplitude measured via accelerometry. Asymmetric resting tremor consistent with Parkinson disease.',
    ],
    red: [
      'No formal tremor assessment documented in this encounter. Neurological exam limited to cranial nerves and gait.',
    ],
    neutral: [
      'Patient reports tremor worsening with stress. Levodopa dose adjusted from 300mg to 450mg daily.',
    ],
  },
  'MS relapse within 12 months': {
    green: [
      'New T2 lesion identified on brain MRI dated 2025-09-20. Gd-enhancing lesion in periventricular white matter.',
      'Patient presented with acute optic neuritis 3 months ago treated with IV methylprednisolone. Confirmed MS relapse.',
    ],
    red: [
      'No new clinical relapses documented in the past 18 months. Stable on fingolimod with no MRI activity.',
    ],
    neutral: [
      'EDSS score stable at 3.0. Patient reports mild fatigue but no new neurological symptoms.',
    ],
  },
  'No prior brain surgery': {
    green: [
      'Surgical history reviewed: appendectomy (2015), knee arthroscopy (2019). No neurosurgical procedures documented.',
      'Patient denies any history of brain surgery, craniotomy, or deep brain stimulation implantation.',
    ],
    red: [
      'VP shunt placed in 2018 for communicating hydrocephalus. Patient has documented history of neurosurgical intervention.',
    ],
    neutral: [
      'Patient scheduled for EEG monitoring. Previous MRI shows no post-surgical changes in brain parenchyma.',
    ],
  },
};

const NEURO_FULLTEXT: Record<string, string> = {
  'Migraine frequency ≥ 4 episodes/month':
    'Encounter summary: 38-year-old female presents to neurology clinic for migraine management follow-up. Patient reports approximately 6 migraine episodes per month over the past 4 months, typically with visual aura preceding unilateral throbbing headache lasting 8-24 hours. Current medications include sumatriptan 100mg PRN and topiramate 50mg BID for prophylaxis. Patient has tried and failed amitriptyline and propranolol. CGRP inhibitor (erenumab) discussed as next-line prophylaxis given high-frequency episodic migraine transitioning toward chronic pattern. Headache diary reviewed confirming 6-7 headache days per month with at least 4 meeting migraine criteria. Plan: initiate erenumab 70mg SC monthly, continue rescue triptan, follow-up in 3 months with headache diary.',
  'MMSE score < 24 (cognitive impairment)':
    'Encounter summary: 72-year-old male referred by PCP for progressive memory loss over 12 months. Caregiver (spouse) reports difficulty with finances, medication management, and word-finding. MMSE administered: 19/30 with deficits in orientation (3/5 temporal), recall (0/3), and visuospatial copy. Previous MMSE from 8 months ago was 22/30 and baseline 18 months ago was 26/30 indicating progressive decline. Montreal Cognitive Assessment (MoCA) score: 15/30. Brain MRI ordered; prior imaging showed bilateral hippocampal atrophy grade 2-3 on Scheltens scale. Amyloid PET pending. Assessment: probable Alzheimer disease per NIA-AA criteria. Plan: initiate donepezil 5mg daily, titrate to 10mg after 4 weeks, caregiver education, OT referral for ADL support, follow-up 3 months.',
  'Tremor assessment documented':
    'Encounter summary: 65-year-old male presenting for follow-up of Parkinson disease diagnosed 3 years ago. Chief complaint: worsening right-hand tremor affecting writing and eating. Motor examination (UPDRS Part III): resting tremor right upper extremity 3/4, left upper extremity 1/4. Postural tremor bilateral 2/4. Rigidity moderate in right arm. Bradykinesia present bilaterally, worse on right. Gait: mild shuffling with reduced arm swing. No freezing episodes reported. Current medications: carbidopa-levodopa 25/100 TID, rasagiline 1mg daily. Plan: increase levodopa to 25/250 TID, consider adding pramipexole if insufficient response. Refer to PT for gait training. DAT scan not repeated as diagnosis established clinically.',
  'MS relapse within 12 months':
    'Encounter summary: 34-year-old female with relapsing-remitting MS (diagnosed 2020) presents with 5-day history of right eye pain and blurred vision. Examination reveals relative afferent pupillary defect (RAPD) right eye, visual acuity 20/100 OD (20/20 OS), color desaturation. Assessment: acute optic neuritis consistent with MS relapse. Brain MRI with contrast obtained: 2 new T2/FLAIR periventricular lesions and 1 Gd-enhancing lesion in right optic nerve. This represents the second relapse in 8 months (prior relapse: left-sided numbness in 2025-04). EDSS increased from 2.0 to 3.0. Current DMT: interferon beta-1a. Plan: admit for IV methylprednisolone 1g daily x 3 days, discuss DMT escalation to natalizumab or ocrelizumab given breakthrough disease activity.',
  'No prior brain surgery':
    'Encounter summary: 28-year-old male with newly diagnosed focal epilepsy (temporal lobe) presenting for pre-surgical evaluation discussion. Video-EEG monitoring completed showing right temporal epileptiform discharges. Seizure semiology: aura of déjà vu followed by impaired awareness episodes lasting 60-90 seconds. MRI brain: right mesial temporal sclerosis. Surgical history: appendectomy age 15, no prior cranial procedures. Patient is a candidate for right anterior temporal lobectomy if non-invasive workup concordant. Neuropsychological testing scheduled. Current AEDs: levetiracetam 1500mg BID, lacosamide 200mg BID with incomplete seizure control (2-3 focal aware seizures monthly). No history of brain surgery, craniotomy, or neurostimulation device implantation.',
};

function hl(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'ig'));
  return (
    <>
      {parts.map((part, idx) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={idx} className="rounded-sm bg-yellow-200/80 px-0.5 dark:bg-yellow-500/30">
            {part}
          </mark>
        ) : (
          <span key={idx}>{part}</span>
        ),
      )}
    </>
  );
}

function summarize(items: ReviewItem[]): PatientSummary[] {
  const map = new Map<string, ReviewItem[]>();
  items.forEach((it) => {
    const arr = map.get(it.patientId) ?? [];
    arr.push(it);
    map.set(it.patientId, arr);
  });
  return Array.from(map.entries()).map(([pid, rows]) => ({
    patientId: pid,
    encounters: rows,
    status: rows.every((r) => r.decision) ? 'Complete' : rows.some((r) => r.decision) ? 'In progress' : 'Not started',
    decision: rows.find((r) => r.decision)?.decision ?? 'Not decided',
    assignedTo: rows[0]?.assignedTo ?? [],
  }));
}

function statusVariant(s: string) {
  if (s === 'Done') return 'success' as const;
  if (s === 'Failed') return 'destructive' as const;
  if (s === 'Processing') return 'processing' as const;
  return 'secondary' as const;
}

export function ReviewPage() {
  const { reviewItems, currentUser, role, users, saveDecision, saveAssignment, editComment, toggleItemFlag } = useAppContext();

  const [leftOpen, setLeftOpen] = useState(true);
  const [bottomOpen, setBottomOpen] = useState(true);
  const [notepadOpen, setNotepadOpen] = useState(false);
  const [assignedFilter, setAssignedFilter] = useState<'all' | 'mine'>('all');
  const [search, setSearch] = useState('');
  const [selectedEnc, setSelectedEnc] = useState('ENC-883100');
  const [viewMode, setViewMode] = useState<'split' | 'text' | 'snips'>('split');
  const [sessionNotes, setSessionNotes] = useState('');
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [groupByPatient, setGroupByPatient] = useState(true);
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set(['PT-10211']));
  const [searchMatchIdx, setSearchMatchIdx] = useState(0);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [decisionFilter, setDecisionFilter] = useState('All');
  const [processingFilter, setProcessingFilter] = useState('All');
  const [filterPreset, setFilterPreset] = useState('none');

  // Download menu
  const [downloadOpen, setDownloadOpen] = useState(false);

  // Assignment dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [selPatients, setSelPatients] = useState<string[]>([]);
  const [selAssignees, setSelAssignees] = useState<string[]>([]);
  const [revFilter, setRevFilter] = useState('All');
  const [decFilter, setDecFilter] = useState('All');
  const [sendEmail, setSendEmail] = useState(true);
  const [assignMsg, setAssignMsg] = useState('');
  const [inviteEmails, setInviteEmails] = useState('');

  // Comment editing
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  // Error state simulation
  const [showError, setShowError] = useState(false);

  const visible = useMemo(() => {
    let rows = [...reviewItems];
    if (assignedFilter === 'mine') rows = rows.filter((r) => r.assignedTo?.includes(currentUser));
    if (statusFilter !== 'All') {
      if (statusFilter === 'Reviewed') rows = rows.filter((r) => r.decision);
      if (statusFilter === 'Not reviewed') rows = rows.filter((r) => !r.decision);
      if (statusFilter === 'Flagged') rows = rows.filter((r) => r.flagged);
    }
    if (decisionFilter !== 'All') rows = rows.filter((r) => (r.decision ?? 'Not decided') === decisionFilter);
    if (processingFilter !== 'All') rows = rows.filter((r) => r.processing === processingFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.patientId.toLowerCase().includes(q) ||
          r.encounterId.toLowerCase().includes(q) ||
          r.criterionName.toLowerCase().includes(q) ||
          (r.reason ?? '').toLowerCase().includes(q) ||
          r.assignedTo?.some((n) => n.toLowerCase().includes(q)),
      );
    }
    return rows;
  }, [reviewItems, assignedFilter, currentUser, search, statusFilter, decisionFilter, processingFilter]);

  const sel = reviewItems.find((r) => r.encounterId === selectedEnc);
  const patients = summarize(visible);
  const allPatients = summarize(reviewItems);

  const assignPatients = allPatients.filter((p) => {
    if (revFilter !== 'All') {
      if (revFilter === 'Reviewed' && p.status === 'Not started') return false;
      if (revFilter === 'Not started' && p.status !== 'Not started') return false;
      if (revFilter === 'In progress' && p.status !== 'In progress') return false;
    }
    if (decFilter !== 'All' && p.decision !== decFilter) return false;
    return true;
  });

  const processed = reviewItems.filter((r) => r.processing === 'Done').length;
  const reviewed = reviewItems.filter((r) => r.decision).length;
  const trueC = reviewItems.filter((r) => r.decision === 'True').length;
  const falseC = reviewItems.filter((r) => r.decision === 'False').length;
  const unclearC = reviewItems.filter((r) => r.decision === 'Unclear').length;

  const evidence = sel ? (NEURO_EVIDENCE[sel.criterionName] ?? { green: [], red: [], neutral: [] }) : { green: [], red: [], neutral: [] };
  const fullText = sel ? (NEURO_FULLTEXT[sel.criterionName] ?? '') : '';

  async function mark(d: 'True' | 'False' | 'Unclear') {
    if (!sel || sel.processing !== 'Done') return;
    await saveDecision({ encounterId: sel.encounterId, decision: d, reason, comment });
    setReason('');
    setComment('');
  }

  async function doAssign() {
    if (!selPatients.length || !selAssignees.length) return;
    await saveAssignment(selPatients, selAssignees);
    setAssignOpen(false);
    setSelPatients([]);
    setSelAssignees([]);
    setInviteEmails('');
    setAssignMsg('');
  }

  const goNext = () => {
    const n = visible.find((r) => r.processing === 'Done' && !r.decision);
    if (n) setSelectedEnc(n.encounterId);
  };

  const goSkip = () => {
    const idx = visible.findIndex((r) => r.encounterId === selectedEnc);
    const next = visible[idx + 1] ?? visible[0];
    if (next) setSelectedEnc(next.encounterId);
  };

  function applyPreset(preset: string) {
    setFilterPreset(preset);
    if (preset === 'unreviewed') { setStatusFilter('Not reviewed'); setDecisionFilter('All'); setProcessingFilter('Done'); }
    else if (preset === 'flagged') { setStatusFilter('Flagged'); setDecisionFilter('All'); setProcessingFilter('All'); }
    else if (preset === 'true-only') { setStatusFilter('All'); setDecisionFilter('True'); setProcessingFilter('All'); }
    else if (preset === 'false-only') { setStatusFilter('All'); setDecisionFilter('False'); setProcessingFilter('All'); }
    else { setStatusFilter('All'); setDecisionFilter('All'); setProcessingFilter('All'); }
  }

  function togglePatient(pid: string) {
    setExpandedPatients((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid); else next.add(pid);
      return next;
    });
  }

  const searchMatches = useMemo(() => {
    if (!search.trim()) return [];
    return visible.filter((r) =>
      r.patientId.toLowerCase().includes(search.toLowerCase()) ||
      r.encounterId.toLowerCase().includes(search.toLowerCase()),
    );
  }, [visible, search]);

  function nextMatch() {
    if (!searchMatches.length) return;
    const idx = (searchMatchIdx + 1) % searchMatches.length;
    setSearchMatchIdx(idx);
    setSelectedEnc(searchMatches[idx].encounterId);
  }
  function prevMatch() {
    if (!searchMatches.length) return;
    const idx = (searchMatchIdx - 1 + searchMatches.length) % searchMatches.length;
    setSearchMatchIdx(idx);
    setSelectedEnc(searchMatches[idx].encounterId);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Progress header card */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold">Final Review Workspace</h2>
              <Badge variant="processing">
                {processed === reviewItems.length ? 'All processed' : 'Processing'}
              </Badge>
              {reviewed > 0 && reviewed < reviewItems.length && (
                <Badge variant="warning">Resume: {reviewItems.length - reviewed} remaining</Badge>
              )}
            </div>
            <Progress value={processed} max={reviewItems.length} className="h-2" />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Processed: <strong className="text-foreground">{processed}/{reviewItems.length}</strong></span>
              <span>Reviewed: <strong className="text-foreground">{reviewed}/{reviewItems.length}</strong></span>
              <span className="text-emerald-600">True: {trueC}</span>
              <span className="text-red-500">False: {falseC}</span>
              <span className="text-amber-500">Unclear: {unclearC}</span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm">
              <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Reference
            </Button>
            {(role === 'Admin' || role === 'Reviewer') && (
              <Button variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
                <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Assign patients
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main workspace */}
      <div className="flex gap-4 min-h-[calc(100vh-280px)]">
        {/* Left panel */}
        {leftOpen ? (
          <aside className="w-72 shrink-0 rounded-2xl border bg-card flex flex-col shadow-sm">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <p className="text-sm font-bold">Review Queue</p>
                <p className="text-[11px] text-muted-foreground">
                  {patients.length} patients · {visible.length} encounters
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setLeftOpen(false)}>
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2.5 p-4">
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={goNext}>
                  <SkipForward className="mr-1 h-3.5 w-3.5" /> Next Pending
                </Button>
                <Button variant="outline" size="sm" onClick={goSkip}>
                  Skip
                </Button>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSearchMatchIdx(0); }}
                  placeholder="Search patients, encounters..."
                  className="h-9 pl-9 text-xs"
                />
              </div>

              {/* Match controls */}
              {search.trim() && searchMatches.length > 0 && (
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{searchMatchIdx + 1} of {searchMatches.length} matches</span>
                  <div className="flex gap-1">
                    <button onClick={prevMatch} className="rounded p-0.5 hover:bg-muted cursor-pointer"><ChevronUp className="h-3 w-3" /></button>
                    <button onClick={nextMatch} className="rounded p-0.5 hover:bg-muted cursor-pointer"><ChevronDown className="h-3 w-3" /></button>
                  </div>
                </div>
              )}

              {/* Filter controls */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-1">
                  <button
                    onClick={() => setAssignedFilter('all')}
                    className={`flex-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${assignedFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setAssignedFilter('mine')}
                    className={`flex-1 rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${assignedFilter === 'mine' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    Mine
                  </button>
                </div>
                <button
                  onClick={() => setShowFilters((s) => !s)}
                  className={`rounded-lg p-1.5 transition-colors cursor-pointer ${showFilters ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  <Filter className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Advanced filters */}
              {showFilters && (
                <div className="rounded-xl border p-3 space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Filters</p>
                  <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-7 text-[11px]">
                    <option value="All">Status: All</option>
                    <option value="Reviewed">Reviewed</option>
                    <option value="Not reviewed">Not reviewed</option>
                    <option value="Flagged">Flagged</option>
                  </Select>
                  <Select value={decisionFilter} onChange={(e) => setDecisionFilter(e.target.value)} className="h-7 text-[11px]">
                    <option value="All">Decision: All</option>
                    <option value="True">True</option>
                    <option value="False">False</option>
                    <option value="Unclear">Unclear</option>
                    <option value="Not decided">Not decided</option>
                  </Select>
                  <Select value={processingFilter} onChange={(e) => setProcessingFilter(e.target.value)} className="h-7 text-[11px]">
                    <option value="All">Processing: All</option>
                    <option value="Done">Done</option>
                    <option value="Processing">Processing</option>
                    <option value="Failed">Failed</option>
                    <option value="Queued">Queued</option>
                  </Select>
                  <Separator />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Presets</p>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { value: 'none', label: 'Clear' },
                      { value: 'unreviewed', label: 'Unreviewed' },
                      { value: 'flagged', label: 'Flagged' },
                      { value: 'true-only', label: 'True only' },
                      { value: 'false-only', label: 'False only' },
                    ].map((p) => (
                      <button
                        key={p.value}
                        onClick={() => applyPreset(p.value)}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors cursor-pointer ${
                          filterPreset === p.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Group by patient toggle */}
              <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                <Checkbox checked={groupByPatient} onChange={(e) => setGroupByPatient((e.target as HTMLInputElement).checked)} />
                Group by patient
              </label>
            </div>
            <Separator />

            {/* Review queue list */}
            <ScrollArea className="flex-1 p-2">
              {groupByPatient ? (
                <div className="space-y-1">
                  {patients.map((patient) => (
                    <div key={patient.patientId}>
                      {/* Patient accordion header */}
                      <button
                        onClick={() => togglePatient(patient.patientId)}
                        className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-muted transition-colors cursor-pointer"
                      >
                        <div>
                          <span className="text-xs font-bold">{patient.patientId}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant={patient.status === 'Complete' ? 'success' : patient.status === 'In progress' ? 'processing' : 'secondary'} className="text-[9px] px-1.5 py-0">
                              {patient.status}
                            </Badge>
                            {patient.assignedTo.length > 0 && (
                              <span className="text-[9px] text-muted-foreground">{patient.assignedTo.join(', ')}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">{patient.encounters.length}</span>
                          {expandedPatients.has(patient.patientId) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </div>
                      </button>
                      {/* Encounter list */}
                      {expandedPatients.has(patient.patientId) && (
                        <div className="ml-3 space-y-0.5 mb-1">
                          {patient.encounters.map((item) => (
                            <button
                              key={item.encounterId}
                              onClick={() => setSelectedEnc(item.encounterId)}
                              className={`w-full rounded-lg px-3 py-2 text-left transition-all cursor-pointer ${
                                selectedEnc === item.encounterId
                                  ? 'bg-primary/10 ring-1 ring-primary/30 shadow-sm'
                                  : 'hover:bg-muted'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-medium">{item.encounterId}</span>
                                <Badge variant={statusVariant(item.processing)} className="text-[9px] px-1.5 py-0">
                                  {item.processing}
                                </Badge>
                              </div>
                              {item.decision && (
                                <Badge
                                  variant={item.decision === 'True' ? 'success' : item.decision === 'False' ? 'destructive' : 'warning'}
                                  className="mt-0.5 text-[9px] px-1.5 py-0"
                                >
                                  {item.decision}
                                </Badge>
                              )}
                              {item.flagged && <Flag className="h-3 w-3 text-amber-500 mt-0.5" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {visible.map((item) => (
                    <button
                      key={item.encounterId}
                      onClick={() => setSelectedEnc(item.encounterId)}
                      className={`w-full rounded-xl px-3.5 py-2.5 text-left transition-all cursor-pointer ${
                        selectedEnc === item.encounterId
                          ? 'bg-primary/10 ring-1 ring-primary/30 shadow-sm'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.patientId}</span>
                        <Badge variant={statusVariant(item.processing)} className="text-[10px]">{item.processing}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.encounterId}</p>
                      <p className="text-[10px] text-muted-foreground">{item.criterionName}</p>
                      {item.decision && (
                        <Badge
                          variant={item.decision === 'True' ? 'success' : item.decision === 'False' ? 'destructive' : 'warning'}
                          className="mt-1 text-[10px]"
                        >
                          {item.decision}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        {item.assignedTo?.length ? (
                          <span className="text-[10px] text-muted-foreground">{item.assignedTo.join(', ')}</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Unassigned</span>
                        )}
                        {item.flagged && <Flag className="h-3 w-3 text-amber-500" />}
                      </div>
                    </button>
                  ))}
                  {visible.length === 0 && (
                    <p className="p-4 text-center text-xs text-muted-foreground">No items match your filters</p>
                  )}
                </div>
              )}
            </ScrollArea>
          </aside>
        ) : (
          <Button variant="outline" size="icon" className="h-auto self-start" onClick={() => setLeftOpen(true)}>
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        )}

        {/* Center card */}
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold">Review Eligibility</CardTitle>
              <CardDescription>
                Validate AI-identified evidence and reasoning against original clinical text
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              {/* Empty state */}
              {!sel && !showError && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <BookOpen className="h-10 w-10 mb-3 opacity-40" />
                  <p className="text-sm">Select an item from the queue to begin reviewing</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={goNext}>
                    <SkipForward className="mr-1 h-3.5 w-3.5" /> Jump to next pending
                  </Button>
                </div>
              )}

              {/* Error state */}
              {showError && (
                <div className="flex flex-col items-center justify-center py-16">
                  <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                  <p className="text-sm font-semibold text-destructive">Failed to load review data</p>
                  <p className="text-xs text-muted-foreground mt-1">The encounter file may be corrupted or the extraction pipeline failed.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowError(false)}>
                    Retry
                  </Button>
                </div>
              )}

              {sel && !showError && (
                <>
                  {/* Item summary */}
                  <div className="grid grid-cols-2 gap-4 rounded-xl border bg-muted/30 p-5 text-sm sm:grid-cols-3">
                    <div><span className="text-muted-foreground">Patient</span><p className="font-medium">{sel.patientId}</p></div>
                    <div><span className="text-muted-foreground">Encounter</span><p className="font-medium">{sel.encounterId}</p></div>
                    <div><span className="text-muted-foreground">Date</span><p className="font-medium">{sel.encounterDate}</p></div>
                    <div><span className="text-muted-foreground">Criterion</span><p className="font-medium text-xs">{sel.criterionName}</p></div>
                    <div><span className="text-muted-foreground">File</span>
                      <div className="flex items-center gap-1">
                        <p className="font-medium">{sel.fileName}</p>
                        <Badge variant={sel.processing === 'Done' ? 'success' : 'secondary'} className="text-[9px] px-1.5 py-0">
                          {sel.processing === 'Done' ? 'Ready' : sel.processing}
                        </Badge>
                      </div>
                    </div>
                    <div><span className="text-muted-foreground">Evidence Snips</span><p className="font-medium">{sel.evidenceCount}</p></div>
                  </div>

                  {/* View mode tabs */}
                  <div className="flex gap-1 rounded-xl border bg-muted/50 p-1">
                    {(['split', 'text', 'snips'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setViewMode(m)}
                        className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                          viewMode === m ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {m === 'split' ? 'Split View' : m === 'text' ? 'Full Text' : 'Evidence Snips'}
                      </button>
                    ))}
                  </div>

                  {/* Viewers */}
                  <div className={`grid gap-4 ${viewMode === 'split' ? 'md:grid-cols-2' : ''}`}>
                    {(viewMode === 'split' || viewMode === 'snips') && (
                      <div className="rounded-xl border p-5 space-y-3">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Evidence Snips</h4>
                        <div className="space-y-2.5 text-sm leading-relaxed">
                          {evidence.green.map((text, i) => (
                            <div key={`g${i}`} className="rounded-xl border-l-4 border-emerald-500 bg-emerald-500/5 p-4">
                              {hl(text, search)}
                            </div>
                          ))}
                          {evidence.red.map((text, i) => (
                            <div key={`r${i}`} className="rounded-xl border-l-4 border-red-500 bg-red-500/5 p-4">
                              {hl(text, search)}
                            </div>
                          ))}
                          {evidence.neutral.map((text, i) => (
                            <div key={`n${i}`} className="rounded-xl border-l-4 border-gray-400 bg-muted/30 p-4">
                              {hl(text, search)}
                            </div>
                          ))}
                          {evidence.green.length === 0 && evidence.red.length === 0 && evidence.neutral.length === 0 && (
                            <p className="text-xs text-muted-foreground italic">No evidence snips available for this criterion.</p>
                          )}
                        </div>
                      </div>
                    )}
                    {(viewMode === 'split' || viewMode === 'text') && (
                      <div className="rounded-xl border p-5 space-y-3">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Full Text</h4>
                        <p className="text-sm leading-relaxed">
                          {fullText ? hl(fullText, search) : <span className="text-muted-foreground italic">No full text available.</span>}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Decision controls */}
                  <div className="flex items-center gap-2 rounded-xl border bg-muted/30 p-4">
                    <Button variant="success" size="sm" disabled={sel.processing !== 'Done'} onClick={() => void mark('True')}>
                      <Check className="mr-1 h-3.5 w-3.5" /> True
                    </Button>
                    <Button variant="destructive" size="sm" disabled={sel.processing !== 'Done'} onClick={() => void mark('False')}>
                      <X className="mr-1 h-3.5 w-3.5" /> False
                    </Button>
                    <Button variant="outline" size="sm" disabled={sel.processing !== 'Done'} onClick={() => void mark('Unclear')}>
                      <Minus className="mr-1 h-3.5 w-3.5" /> Unclear
                    </Button>
                    <div className="flex-1" />
                    <Button variant="ghost" size="sm" onClick={() => setBottomOpen((s) => !s)}>
                      {bottomOpen ? <PanelBottomClose className="h-4 w-4" /> : <PanelBottomOpen className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setNotepadOpen((s) => !s)}>
                      <StickyNote className="h-4 w-4" />
                    </Button>
                  </div>

                  {sel.processing !== 'Done' && (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                      Decision controls are disabled — item is still {sel.processing.toLowerCase()}.
                    </div>
                  )}

                  {/* Decision log */}
                  {sel.decisionLog && sel.decisionLog.length > 0 && (
                    <div className="rounded-xl border p-4 space-y-2">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Decision Log</h4>
                      {sel.decisionLog.map((log, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs">
                          <Badge
                            variant={log.decision === 'True' ? 'success' : log.decision === 'False' ? 'destructive' : 'warning'}
                            className="text-[9px] px-1.5 py-0"
                          >
                            {log.decision}
                          </Badge>
                          <span className="font-medium">{log.user}</span>
                          <span className="text-muted-foreground">{log.timestamp}</span>
                          {log.reason && <span className="text-muted-foreground truncate">— {log.reason}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bottom CTA + Download */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button onClick={goNext}>
                      {reviewed === reviewItems.length ? 'Finish Review' : 'Continue Reviewing'}
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                    {/* Download menu */}
                    <div className="relative">
                      <Button variant="outline" size="sm" onClick={() => setDownloadOpen((s) => !s)}>
                        <Download className="mr-1 h-3.5 w-3.5" /> Download
                      </Button>
                      {downloadOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setDownloadOpen(false)} />
                          <div className="absolute bottom-full left-0 mb-1 z-50 w-52 rounded-xl border bg-popover p-1 shadow-xl">
                            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent cursor-pointer" onClick={() => setDownloadOpen(false)}>
                              <Download className="h-3.5 w-3.5 text-emerald-600" /> True decisions export
                            </button>
                            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent cursor-pointer" onClick={() => setDownloadOpen(false)}>
                              <Download className="h-3.5 w-3.5 text-blue-600" /> Exploded export (all fields)
                            </button>
                            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent cursor-pointer" onClick={() => setDownloadOpen(false)}>
                              <Download className="h-3.5 w-3.5 text-amber-600" /> Null-safe export
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowError(true)}>
                      Simulate error
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Reason / Comments / Flag panel */}
          {bottomOpen && sel && (
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">Reason / Comments</p>
                  <Button variant="ghost" size="icon" onClick={() => setBottomOpen(false)}>
                    <PanelBottomClose className="h-4 w-4" />
                  </Button>
                </div>

                {/* Reason field */}
                <Textarea
                  placeholder="Reason for True / False / Unclear decision..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                />

                {/* Comments thread */}
                {sel.comments && sel.comments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Comments</p>
                    {sel.comments.map((c) => (
                      <div key={c.id} className="rounded-xl border p-3 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold">{c.user}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">{c.timestamp}</span>
                            {c.user === currentUser && (
                              <button
                                onClick={() => { setEditingComment(c.id); setEditCommentText(c.text); }}
                                className="text-primary hover:underline cursor-pointer"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        {editingComment === c.id ? (
                          <div className="flex gap-2 mt-1">
                            <Input
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              className="flex-1 h-7 text-xs"
                            />
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => { void editComment(sel.encounterId, c.id, editCommentText); setEditingComment(null); }}
                            >
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingComment(null)}>
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <p>{c.text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add comment */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && comment.trim()) {
                        void saveDecision({ encounterId: sel.encounterId, decision: sel.decision ?? 'Unclear', reason: sel.reason ?? '', comment });
                        setComment('');
                      }
                    }}
                  />
                  <Button variant="outline" size="icon" onClick={() => {
                    if (comment.trim()) {
                      void saveDecision({ encounterId: sel.encounterId, decision: sel.decision ?? 'Unclear', reason: sel.reason ?? '', comment });
                      setComment('');
                    }
                  }}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {/* Flag adjudication */}
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox checked={sel.flagged ?? false} onChange={() => void toggleItemFlag(sel.encounterId)} />
                  <Flag className="h-3 w-3 text-amber-500" /> Flag for adjudication
                </label>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Session notepad overlay */}
      {notepadOpen && (
        <div className="fixed right-6 top-32 z-20 w-72 rounded-2xl border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5" /> Session Notepad
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setNotepadOpen(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="p-3">
            <Textarea
              placeholder="Session-only notes (not exported)..."
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              rows={6}
              className="text-xs"
            />
          </div>
        </div>
      )}

      {/* Assignment dialog */}
      <Dialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign patients for review"
        description="Select patients, choose assignees, and send notifications"
        fullscreen
      >
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-bold">Select patients</h3>
            <div className="flex gap-2">
              <Select value={revFilter} onChange={(e) => setRevFilter(e.target.value)} className="w-auto">
                <option>All</option>
                <option>Not started</option>
                <option>In progress</option>
                <option>Reviewed</option>
              </Select>
              <Select value={decFilter} onChange={(e) => setDecFilter(e.target.value)} className="w-auto">
                <option>All</option>
                <option>True</option>
                <option>False</option>
                <option>Unclear</option>
                <option>Not decided</option>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setSelPatients(assignPatients.map((p) => p.patientId))}>
                Select all ({assignPatients.length})
              </Button>
            </div>
            <div className="rounded-xl border overflow-hidden">
              <div className="grid grid-cols-6 gap-2 border-b bg-muted/30 px-4 py-2.5 text-xs font-bold text-muted-foreground">
                <span></span><span>Patient ID</span><span>Encounters</span><span>Status</span><span>Decision</span><span>Assigned</span>
              </div>
              <ScrollArea className="max-h-64">
                {assignPatients.map((row) => (
                  <label key={row.patientId} className="grid grid-cols-6 items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted/30 cursor-pointer border-b last:border-0">
                    <Checkbox
                      checked={selPatients.includes(row.patientId)}
                      onChange={(e) => {
                        if ((e.target as HTMLInputElement).checked) setSelPatients((p) => [...p, row.patientId]);
                        else setSelPatients((p) => p.filter((id) => id !== row.patientId));
                      }}
                    />
                    <span className="font-medium">{row.patientId}</span>
                    <span>{row.encounters.length}</span>
                    <Badge variant={row.status === 'Complete' ? 'success' : row.status === 'In progress' ? 'processing' : 'secondary'} className="w-fit text-[10px]">{row.status}</Badge>
                    <Badge variant={row.decision === 'True' ? 'success' : row.decision === 'False' ? 'destructive' : 'outline'} className="w-fit text-[10px]">{row.decision}</Badge>
                    <span className="text-xs text-muted-foreground truncate">{row.assignedTo.length ? row.assignedTo.join(', ') : '—'}</span>
                  </label>
                ))}
              </ScrollArea>
            </div>
            <div className="text-sm font-bold">Selected: {selPatients.length} patients</div>
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-bold">Assign to team members</h3>
            <div className="flex flex-wrap gap-3">
              {users.map((name) => (
                <label key={name} className="flex items-center gap-2 rounded-xl border px-4 py-3 hover:bg-muted/30 cursor-pointer text-sm transition-colors">
                  <Checkbox
                    checked={selAssignees.includes(name)}
                    onChange={(e) => {
                      if ((e.target as HTMLInputElement).checked) setSelAssignees((p) => [...p, name]);
                      else setSelAssignees((p) => p.filter((n) => n !== name));
                    }}
                  />
                  {name}
                  <Badge variant="secondary" className="text-[10px]">
                    {name === 'Anurag' ? 'Admin' : 'Reviewer'}
                  </Badge>
                </label>
              ))}
            </div>
            <Separator />
            <h3 className="text-sm font-bold">Or invite new people</h3>
            <div className="grid grid-cols-3 gap-3">
              <Input value={inviteEmails} onChange={(e) => setInviteEmails(e.target.value)} placeholder="email@company.com" className="col-span-2" />
              <Select><option>Admin</option><option>Reviewer</option></Select>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-sm font-bold">Notify & Confirm</h3>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={sendEmail} onChange={(e) => setSendEmail((e.target as HTMLInputElement).checked)} />
              Send email notification
            </label>
            <Textarea value={assignMsg} onChange={(e) => setAssignMsg(e.target.value)} placeholder="Optional message..." rows={2} />
            <div className="rounded-xl border bg-muted/30 p-5 text-sm space-y-1">
              <p><strong>{selPatients.length}</strong> patients selected</p>
              <p>Assigned to: <strong>{selAssignees.join(', ') || 'None'}</strong></p>
              <p>New invites: <strong>{inviteEmails.trim() ? '1' : '0'}</strong></p>
            </div>
            <div className="flex gap-2">
              <Button disabled={!selPatients.length || !selAssignees.length} onClick={() => void doAssign()}>
                <MessageSquare className="mr-1.5 h-4 w-4" /> Assign and notify
              </Button>
              <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            </div>
          </section>
        </div>
      </Dialog>
    </div>
  );
}
