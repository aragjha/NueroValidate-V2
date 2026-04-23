import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import type { ReviewItem } from '@/types';
import { Card } from '@/components/ui/card';
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
import { EligibilityMatrix } from '@/components/ct/EligibilityMatrix';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Maximize2,
  Minimize2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  Filter,
  Flag,
  Grid3x3,
  MessageSquare,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Search,
  Send,
  StickyNote,
  UserPlus,
  X,
} from 'lucide-react';

/* ─── helpers ─── */
type PatientSummary = { serial: number; patientId: string; encounters: ReviewItem[]; status: string; decision: string; assignedTo: string[] };

const NEURO_EVIDENCE: Record<string, { green: string[]; red: string[]; neutral: string[] }> = {
  'Kisunla Discontinuation': {
    green: [
      'Patient received donanemab (Kisunla) 700mg IV infusions per ALZH-12681 protocol. Treatment discontinued on 2025-10-14 after surveillance MRI showed ARIA-E in right parietal region. Dr. Patel documented: "Discontinuing Kisunla due to ARIA risk profile — patient informed and agrees with clinical decision to cease therapy."',
      'Pharmacy records confirm donanemab infusion schedule terminated effective 2025-10-14. Reason code: ADVERSE-IMAGING. Prior 3 infusions completed without incident. Discontinuation letter sent to patient and referring neurologist.',
    ],
    red: [
      'Progress note from 2025-08-20: "Patient tolerating Kisunla infusions well. No ARIA findings on interim MRI. Plan to continue q4w schedule per protocol." — No discontinuation documented at this earlier encounter.',
    ],
    neutral: [
      'Neurology follow-up 2025-11-10: Post-discontinuation monitoring visit. MRI shows resolving ARIA-E signal. Cognitive status stable, MMSE 22/30. Patient transitioned to supportive care with donepezil 10mg daily. No new neurological symptoms reported.',
    ],
  },
  'Migraine frequency ≥ 4 episodes/month': {
    green: ['Patient reports 6 migraine episodes per month with aura over the past 4 months. Headache diary confirms frequency.', 'Triptan usage recorded 5-7 times monthly. CGRP inhibitor prescribed as prophylaxis indicating high-frequency migraine.'],
    red: ['Headache frequency documented as 2-3 episodes/month in most recent neurology follow-up. Below inclusion threshold.'],
    neutral: ['Patient switched from sumatriptan to rizatriptan due to side effects. Follow-up in 6 weeks to reassess frequency.'],
  },
  'MMSE score < 24 (cognitive impairment)': {
    green: ['MMSE score: 19/30 recorded on 2025-11-15. Significant decline from baseline of 26/30 documented 8 months ago.', 'Neuropsychological testing reveals deficits in delayed recall and visuospatial function consistent with early AD.'],
    red: ['Most recent MMSE score: 25/30. Patient does not meet cognitive impairment threshold per study protocol.'],
    neutral: ['Donepezil 10mg initiated. Caregiver reports progressive difficulty with instrumental ADLs over past 6 months.'],
  },
  'Tremor assessment documented': {
    green: ['UPDRS Part III motor examination performed: resting tremor score 3/4 in right upper extremity. Postural tremor 2/4 bilateral.', 'Tremor amplitude measured via accelerometry. Asymmetric resting tremor consistent with Parkinson disease.'],
    red: ['No formal tremor assessment documented in this encounter. Neurological exam limited to cranial nerves and gait.'],
    neutral: ['Patient reports tremor worsening with stress. Levodopa dose adjusted from 300mg to 450mg daily.'],
  },
  'MS relapse within 12 months': {
    green: ['New T2 lesion identified on brain MRI dated 2025-09-20. Gd-enhancing lesion in periventricular white matter.', 'Patient presented with acute optic neuritis 3 months ago treated with IV methylprednisolone. Confirmed MS relapse.'],
    red: ['No new clinical relapses documented in the past 18 months. Stable on fingolimod with no MRI activity.'],
    neutral: ['EDSS score stable at 3.0. Patient reports mild fatigue but no new neurological symptoms.'],
  },
  'No prior brain surgery': {
    green: ['Surgical history reviewed: appendectomy (2015), knee arthroscopy (2019). No neurosurgical procedures documented.', 'Patient denies any history of brain surgery, craniotomy, or deep brain stimulation implantation.'],
    red: ['VP shunt placed in 2018 for communicating hydrocephalus. Patient has documented history of neurosurgical intervention.'],
    neutral: ['Patient scheduled for EEG monitoring. Previous MRI shows no post-surgical changes in brain parenchyma.'],
  },
};

const NEURO_FULLTEXT: Record<string, string> = {
  'Kisunla Discontinuation': `Encounter date: 2025-10-14T00:00:00
Category: Clinical Notes  Note Type: ChiefComplaint
Note content: IV Kisunla Discontinuation  Note Source: encounterdata
Note Type: notes  Note content: ALZH-12681 Kisunla (donanemab) — Treatment Discontinuation

2025-10-14T00:00:00 Category: Visit Detail  Type: 1
Start Date: 2025-10-14  End Date: 2025-10-14
Reason: Kisunla discontinuation — ARIA-E finding  Location: FCN Neurology  Admission: KIS-DISC-001

Encounter summary: 68-year-old female presents to neurology clinic for donanemab (Kisunla) treatment review. Patient has been receiving Kisunla 700mg IV q4w infusions since 2025-06-10 as part of anti-amyloid therapy for early Alzheimer disease.

Surveillance MRI brain dated 2025-10-10 revealed new ARIA-E signal in right parietal region (edema/effusion pattern). No ARIA-H (microhemorrhages) identified. Prior MRI from 2025-08-15 was negative for ARIA findings.

Clinical decision: DISCONTINUE donanemab (Kisunla) therapy effective immediately. Rationale: ARIA-E finding per surveillance imaging protocol. Risk of continued infusion outweighs benefit given imaging findings.

Discussion with patient: Risks and benefits of discontinuation reviewed. Patient understands rationale and agrees with clinical decision. Questions addressed regarding long-term prognosis and alternative treatment options.

Current medications: Donepezil 10mg daily (continue), Memantine 10mg BID (continue), Atorvastatin 20mg daily. Kisunla — DISCONTINUED.

Plan:
1. Discontinue donanemab (Kisunla) infusions permanently
2. Repeat MRI brain in 4 weeks to monitor ARIA-E resolution
3. Continue donepezil and memantine for symptomatic management
4. Neuropsychological follow-up in 3 months
5. Notify referring physician and pharmacy of treatment cessation

Physical examination: Alert and oriented x3. Cranial nerves II-XII intact. No focal deficits. No headache or visual symptoms suggestive of symptomatic ARIA.

Vitals: BP 128/76, HR 68, Temp 98.2°F
Weight: 62kg, BMI: 24.2

Attending: Dr. Ravi Patel, MD — Board Certified Neurologist
FCN Department of Neurology`,
  'Migraine frequency ≥ 4 episodes/month': `Encounter date: 2024-11-17T00:00:00
Category: Clinical Notes  Note Type: ChiefComplaint
Note content: IV Kisunla Note Source: encounterdata
Note Type: notes  Note content: ALZH-12681 Kisunla Infusion 1, 2, and 3 — 700mg to be given in 30min every 4 weeks (70ml) INFUSION

2024-11-17T00:00:00 Category: Visit Detail  Type: 1
Start Date: 2024-11-17  End Date: 1901-02-08
Reason: IV Kisunla  Location: 11  Admission: IV-KINS-BB

Encounter summary: 38-year-old female presents to neurology clinic for migraine management follow-up. Patient reports approximately 6 migraine episodes per month over the past 4 months, typically with visual aura preceding unilateral throbbing headache lasting 8-24 hours.

Current medications include sumatriptan 100mg PRN and topiramate 50mg BID for prophylaxis. Patient has tried and failed amitriptyline and propranolol. CGRP inhibitor (erenumab) discussed as next-line prophylaxis given high-frequency episodic migraine transitioning toward chronic pattern.

Headache diary reviewed confirming 6-7 headache days per month with at least 4 meeting migraine criteria. Patient describes photophobia and phonophobia with most attacks. Nausea present in approximately 60% of episodes.

Assessment: High-frequency episodic migraine with aura (ICD-10: G43.109). Failed two prophylactic agents. Candidate for CGRP monoclonal antibody therapy.

Plan: Initiate erenumab 70mg SC monthly, continue rescue triptan, headache diary, follow-up in 3 months. Consider adding neuromodulation device if CGRP response suboptimal.

Physical examination findings: Alert and oriented. Cranial nerves II-XII intact. No papilledema. No focal neurological deficits. Neck: mild trapezius tenderness bilaterally. Pericranial muscle tenderness noted.

Vitals: BP 122/78, HR 72, Temp 98.4°F
Weight: 65kg, BMI: 23.1`,
  'MMSE score < 24 (cognitive impairment)': `Encounter summary: 72-year-old male referred by PCP for progressive memory loss over 12 months. Caregiver (spouse) reports difficulty with finances, medication management, and word-finding. MMSE administered: 19/30 with deficits in orientation (3/5 temporal), recall (0/3), and visuospatial copy. Previous MMSE from 8 months ago was 22/30 and baseline 18 months ago was 26/30 indicating progressive decline.

Montreal Cognitive Assessment (MoCA) score: 15/30. Brain MRI ordered; prior imaging showed bilateral hippocampal atrophy grade 2-3 on Scheltens scale. Amyloid PET pending.

Assessment: probable Alzheimer disease per NIA-AA criteria.

Plan: initiate donepezil 5mg daily, titrate to 10mg after 4 weeks, caregiver education, OT referral for ADL support, follow-up 3 months.`,
  'Tremor assessment documented': `Encounter summary: 65-year-old male presenting for follow-up of Parkinson disease diagnosed 3 years ago. Chief complaint: worsening right-hand tremor affecting writing and eating.

Motor examination (UPDRS Part III): resting tremor right upper extremity 3/4, left upper extremity 1/4. Postural tremor bilateral 2/4. Rigidity moderate in right arm. Bradykinesia present bilaterally, worse on right. Gait: mild shuffling with reduced arm swing. No freezing episodes reported.

Current medications: carbidopa-levodopa 25/100 TID, rasagiline 1mg daily.

Plan: increase levodopa to 25/250 TID, consider adding pramipexole if insufficient response. Refer to PT for gait training.`,
  'MS relapse within 12 months': `Encounter summary: 34-year-old female with relapsing-remitting MS (diagnosed 2020) presents with 5-day history of right eye pain and blurred vision. Examination reveals relative afferent pupillary defect (RAPD) right eye, visual acuity 20/100 OD (20/20 OS), color desaturation.

Assessment: acute optic neuritis consistent with MS relapse. Brain MRI with contrast obtained: 2 new T2/FLAIR periventricular lesions and 1 Gd-enhancing lesion in right optic nerve. This represents the second relapse in 8 months. EDSS increased from 2.0 to 3.0.

Plan: admit for IV methylprednisolone 1g daily x 3 days, discuss DMT escalation to natalizumab or ocrelizumab.`,
  'No prior brain surgery': `Encounter summary: 28-year-old male with newly diagnosed focal epilepsy (temporal lobe) presenting for pre-surgical evaluation discussion. Video-EEG monitoring completed showing right temporal epileptiform discharges. MRI brain: right mesial temporal sclerosis.

Surgical history: appendectomy age 15, no prior cranial procedures. Patient is a candidate for right anterior temporal lobectomy.

Current AEDs: levetiracetam 1500mg BID, lacosamide 200mg BID with incomplete seizure control. No history of brain surgery, craniotomy, or neurostimulation device implantation.`,
};

function isAutoValidated(item: ReviewItem) {
  return item.processing === 'Done' && item.evidenceCount >= 4;
}

function hl(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'ig'));
  return <>{parts.map((part, idx) => part.toLowerCase() === query.toLowerCase() ? <mark key={idx} className="rounded-sm bg-yellow-300 px-0.5 dark:bg-yellow-500/40 dark:text-yellow-100">{part}</mark> : <span key={idx}>{part}</span>)}</>;
}

function summarize(items: ReviewItem[], allItems: ReviewItem[]): PatientSummary[] {
  const allPids = [...new Set(allItems.map((r) => r.patientId))];
  const map = new Map<string, ReviewItem[]>();
  items.forEach((it) => { const arr = map.get(it.patientId) ?? []; arr.push(it); map.set(it.patientId, arr); });
  return Array.from(map.entries()).map(([pid, rows]) => ({
    serial: allPids.indexOf(pid) + 1,
    patientId: pid,
    encounters: rows,
    status: rows.every((r) => r.decision) ? 'Complete' : rows.some((r) => r.decision) ? 'In progress' : 'Not started',
    decision: rows.find((r) => r.decision)?.decision ?? 'Not decided',
    assignedTo: rows[0]?.assignedTo ?? [],
  }));
}

function statusVariant(s: string) { if (s === 'Done') return 'success' as const; if (s === 'Failed') return 'destructive' as const; if (s === 'Processing') return 'processing' as const; return 'secondary' as const; }

const LINES_PER_PAGE = 15;

/* ─── component ─── */
export function ReviewPage() {
  const { reviewItems: allReviewItems, currentUser, users, saveDecision, saveAssignment, editComment, toggleItemFlag, projects, cohortImports } = useAppContext();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCriterion = searchParams.get('criterion');

  /* ── CT switcher: users can change the criterion/atom filter from the page ── */
  const [ctViewMode, setCtViewMode] = useState<'criterion' | 'atom'>('criterion');
  const [criterionFilterState, setCriterionFilterState] = useState<string | null>(urlCriterion);
  const criterionFilter = criterionFilterState;

  /* Keep URL in sync so refreshes retain the filter */
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (criterionFilterState) next.set('criterion', criterionFilterState);
    else next.delete('criterion');
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criterionFilterState]);

  const [matrixOpen, setMatrixOpen] = useState(false);

  const currentProject = projects.find((p) => p.id === projectId);
  const isCTContext = currentProject?.flowType === 'ct';
  const ctCohort = useMemo(
    () => (isCTContext ? cohortImports.find((c) => c.id === currentProject?.cohortImportId) : undefined),
    [cohortImports, currentProject?.cohortImportId, isCTContext],
  );

  /* Build criterion + atom option lists for the switcher */
  const criterionOptions = useMemo(() => {
    if (!ctCohort) return [] as { id: string; name: string; type: 'inclusion' | 'exclusion' }[];
    return ctCohort.criteria.map((c) => ({ id: c.id, name: c.name, type: c.type }));
  }, [ctCohort]);

  const atomOptions = useMemo(() => {
    if (!ctCohort) return [] as { id: string; label: string; parentName: string; parentType: 'inclusion' | 'exclusion' }[];
    return ctCohort.criteria.flatMap((c) =>
      c.atoms.map((a) => ({ id: a.id, label: a.label, parentName: c.name, parentType: c.type })),
    );
  }, [ctCohort]);

  // For CT projects: filter to this project's review items + the specific criterion
  // For RWE projects: use all review items (existing behavior)
  const reviewItems = useMemo(() => {
    if (isCTContext) {
      let items = allReviewItems.filter((ri) => ri.projectId === projectId);
      if (criterionFilter) {
        items = items.filter((ri) => ri.criterionName === criterionFilter);
      }
      return items;
    }
    // For RWE: if there are items tagged with this projectId, filter to those
    const projectItems = allReviewItems.filter((ri) => ri.projectId === projectId);
    if (projectItems.length > 0) return projectItems;
    return allReviewItems;
  }, [allReviewItems, isCTContext, projectId, criterionFilter]);

  const [leftOpen, setLeftOpen] = useState(true);
  const [notepadOpen, setNotepadOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [validationTab, setValidationTab] = useState<'all' | 'manual' | 'auto'>('all');
  const [assignedFilter, setAssignedFilter] = useState<'all' | 'mine'>('all');
  const [search, setSearch] = useState('');
  const [selectedEnc, setSelectedEnc] = useState(() => {
    // For CT context, default to first filtered item
    if (isCTContext && reviewItems.length > 0) return reviewItems[0].encounterId;
    // For RWE with project-specific items, default to first project item
    const projItems = allReviewItems.filter((ri) => ri.projectId === projectId);
    if (projItems.length > 0) return projItems[0].encounterId;
    return 'ENC-883100';
  });

  // Keep selected encounter valid when CT criterion filter changes
  useEffect(() => {
    if (isCTContext && reviewItems.length > 0) {
      const stillValid = reviewItems.find((r) => r.encounterId === selectedEnc);
      if (!stillValid) setSelectedEnc(reviewItems[0].encounterId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criterionFilter, projectId, isCTContext]);
  const [viewMode, setViewMode] = useState<'snips' | 'text'>('snips');
  const [sessionNotes, setSessionNotes] = useState('');
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [showError, setShowError] = useState(false);
  const [groupByPatient, setGroupByPatient] = useState(true);
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(() => {
    const projItems = allReviewItems.filter((ri) => ri.projectId === projectId);
    if (projItems.length > 0) return new Set([projItems[0].patientId]);
    return new Set(['PT-10211']);
  });

  // Full text search
  const [textSearch, setTextSearch] = useState('');
  const [snipSearch, setSnipSearch] = useState('');

  // Full text pagination
  const [textPage, setTextPage] = useState(0);

  // Decision confirmation dialog
  const [pendingDecision, setPendingDecision] = useState<'True' | 'False' | 'Unclear' | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');

  // Filter modal
  const [filterOpen, setFilterOpen] = useState(false);
  const [fLlmEligibility, setFLlmEligibility] = useState<string[]>([]);
  const [fReviewedStatus, setFReviewedStatus] = useState<string[]>([]);
  const [fReviewerEligibility, setFReviewerEligibility] = useState<string[]>([]);
  const [fReviewerName, setFReviewerName] = useState<string[]>([]);
  const [filterLogic, setFilterLogic] = useState<'AND' | 'OR'>('AND');

  // Activity log tab
  const [logTab, setLogTab] = useState<'comments' | 'log'>('comments');
  const [downloadOpen, setDownloadOpen] = useState(false);

  // Assignment dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<'batch' | 'individual'>('batch');
  const [batchSize, setBatchSize] = useState(2);
  const [batchAssignments, setBatchAssignments] = useState<Record<string, string>>({});
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

  const hasActiveFilters = fLlmEligibility.length > 0 || fReviewedStatus.length > 0 || fReviewerEligibility.length > 0 || fReviewerName.length > 0;

  /* ─── derived ─── */
  const visible = useMemo(() => {
    let rows = [...reviewItems];
    if (validationTab === 'auto') rows = rows.filter(isAutoValidated);
    else if (validationTab === 'manual') rows = rows.filter((r) => !isAutoValidated(r));
    if (assignedFilter === 'mine') rows = rows.filter((r) => r.assignedTo?.includes(currentUser));

    if (hasActiveFilters) {
      const checks: ((r: ReviewItem) => boolean)[] = [];
      if (fLlmEligibility.length > 0) checks.push((r) => fLlmEligibility.includes(r.llmEligibility ?? ''));
      if (fReviewedStatus.length > 0) checks.push((r) => {
        const isReviewed = !!r.decision;
        return (fReviewedStatus.includes('Reviewed') && isReviewed) || (fReviewedStatus.includes('Not Reviewed') && !isReviewed);
      });
      if (fReviewerEligibility.length > 0) checks.push((r) => {
        const d = r.decision;
        return (fReviewerEligibility.includes('Eligible') && d === 'True') ||
          (fReviewerEligibility.includes('Ineligible') && d === 'False') ||
          (fReviewerEligibility.includes('Unclear') && d === 'Unclear');
      });
      if (fReviewerName.length > 0) checks.push((r) => {
        if (!r.assignedTo || r.assignedTo.length === 0) return fReviewerName.includes('Unassigned');
        return r.assignedTo.some((name) => fReviewerName.includes(name));
      });
      if (filterLogic === 'AND') rows = rows.filter((r) => checks.every((fn) => fn(r)));
      else rows = rows.filter((r) => checks.some((fn) => fn(r)));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.patientId.toLowerCase().includes(q) || r.encounterId.toLowerCase().includes(q) || r.criterionName.toLowerCase().includes(q));
    }
    return rows;
  }, [reviewItems, validationTab, assignedFilter, currentUser, search, hasActiveFilters, fLlmEligibility, fReviewedStatus, fReviewerEligibility, fReviewerName, filterLogic]);

  const sel = reviewItems.find((r) => r.encounterId === selectedEnc);
  const patients = summarize(visible, reviewItems);
  const allPatients = summarize(reviewItems, reviewItems);
  const assignFilteredPatients = allPatients.filter((p) => {
    if (revFilter !== 'All') { if (revFilter === 'Reviewed' && p.status === 'Not started') return false; if (revFilter === 'Not started' && p.status !== 'Not started') return false; }
    if (decFilter !== 'All' && p.decision !== decFilter) return false;
    return true;
  });

  const processed = reviewItems.filter((r) => r.processing === 'Done').length;
  const reviewed = reviewItems.filter((r) => r.decision).length;
  const trueC = reviewItems.filter((r) => r.decision === 'True').length;
  const falseC = reviewItems.filter((r) => r.decision === 'False').length;
  const unclearC = reviewItems.filter((r) => r.decision === 'Unclear').length;
  const autoCount = reviewItems.filter(isAutoValidated).length;
  const manualCount = reviewItems.length - autoCount;

  // For CT context: each ReviewItem has its own evidence text. For RWE: use static lookups by criterion name.
  const evidence = useMemo(() => {
    if (!sel) return { green: [], red: [], neutral: [] };
    if (isCTContext && sel.evidenceText) {
      // CT items have a single block of evidence text imported from Cohort Builder
      const isSupport = sel.llmEligibility === 'Eligible';
      return {
        green: isSupport ? [sel.evidenceText] : [],
        red: !isSupport ? [sel.evidenceText] : [],
        neutral: [],
      };
    }
    return NEURO_EVIDENCE[sel.criterionName] ?? { green: [], red: [], neutral: [] };
  }, [sel, isCTContext]);

  const fullText = useMemo(() => {
    if (!sel) return '';
    if (isCTContext && sel.evidenceText) return sel.evidenceText;
    return NEURO_FULLTEXT[sel.criterionName] ?? '';
  }, [sel, isCTContext]);

  // Full text: when searching, show all text (no pagination) so highlights are visible; paginate only when not searching
  const fullTextLines = useMemo(() => fullText.split('\n'), [fullText]);
  const isTextSearchActive = textSearch.trim().length > 0;
  const totalTextPages = isTextSearchActive ? 1 : Math.max(1, Math.ceil(fullTextLines.length / LINES_PER_PAGE));
  const displayText = useMemo(() => {
    if (isTextSearchActive) return fullText;
    const start = textPage * LINES_PER_PAGE;
    return fullTextLines.slice(start, start + LINES_PER_PAGE).join('\n');
  }, [fullTextLines, textPage, isTextSearchActive, fullText]);

  // Decision confirmation flow
  function initiateDecision(d: 'True' | 'False' | 'Unclear') {
    if (!sel || sel.processing !== 'Done') return;
    setPendingDecision(d);
    setReviewerNotes('');
  }

  async function confirmDecision() {
    if (!sel || !pendingDecision) return;
    await saveDecision({ encounterId: sel.encounterId, decision: pendingDecision, reason: reviewerNotes || reason, comment: reviewerNotes });
    setReason(''); setComment(''); setReviewerNotes(''); setPendingDecision(null);
  }

  const clearFilters = useCallback(() => {
    setFLlmEligibility([]); setFReviewedStatus([]); setFReviewerEligibility([]); setFReviewerName([]);
  }, []);

  function toggleFilter<T extends string>(arr: T[], val: T, setter: React.Dispatch<React.SetStateAction<T[]>>) {
    setter(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);
  }

  function togglePatient(pid: string) {
    setExpandedPatients((prev) => { const next = new Set(prev); if (next.has(pid)) next.delete(pid); else next.add(pid); return next; });
  }

  async function doBatchAssign() {
    const pats = assignFilteredPatients;
    const chunks: { assignee: string; patients: string[] }[] = [];
    let idx = 0;
    const assigneeEntries = Object.entries(batchAssignments).filter(([, v]) => v).sort(([a], [b]) => a.localeCompare(b));
    for (const [, assignee] of assigneeEntries) {
      const start = idx;
      const end = Math.min(idx + batchSize, pats.length);
      if (start < pats.length) chunks.push({ assignee, patients: pats.slice(start, end).map((p) => p.patientId) });
      idx = end;
    }
    for (const chunk of chunks) await saveAssignment(chunk.patients, [chunk.assignee]);
    setAssignOpen(false); setBatchAssignments({});
  }

  async function doIndividualAssign() {
    if (!selPatients.length || !selAssignees.length) return;
    await saveAssignment(selPatients, selAssignees);
    setAssignOpen(false); setSelPatients([]); setSelAssignees([]); setInviteEmails(''); setAssignMsg('');
  }

  const batchGroupCount = Math.ceil(assignFilteredPatients.length / batchSize);

  function reviewerDecisionLabel(d?: string) {
    if (d === 'True') return { text: 'Eligible', variant: 'success' as const };
    if (d === 'False') return { text: 'Ineligible', variant: 'destructive' as const };
    if (d === 'Unclear') return { text: 'Unclear', variant: 'warning' as const };
    return { text: 'Pending Review', variant: 'processing' as const };
  }

  const decisionLabels: Record<string, { title: string; desc: string; variant: 'success' | 'destructive' | 'outline' }> = {
    True: { title: 'Mark as Eligible', desc: 'Please provide reviewer notes for this eligibility decision. This will be recorded for audit purposes.', variant: 'success' },
    False: { title: 'Mark as Ineligible', desc: 'Please provide reviewer notes for this eligibility decision. This will be recorded for audit purposes.', variant: 'destructive' },
    Unclear: { title: 'Mark as Unclear', desc: 'Please provide reviewer notes explaining why this decision is unclear. This will be recorded for audit purposes.', variant: 'outline' },
  };

  return (
    <div className={fullscreen ? 'fixed inset-0 z-50 bg-background flex flex-col gap-2 p-4 overflow-auto' : 'flex flex-col gap-2 h-[calc(100vh-130px)]'}>
      {/* ─── CT CONTEXT BANNER ─── */}
      {isCTContext && (
        <div className="flex items-center justify-between rounded-xl border-2 border-primary/40 bg-primary/5 px-4 py-2.5 flex-wrap gap-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate(`/projects/${projectId}/ct-overview`)}
              className="flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Overview
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Badge className="text-[9px] px-2 py-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">CT</Badge>
                <span className="text-xs font-semibold">{currentProject?.name}</span>
              </div>
              {criterionFilter && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Reviewing: <span className="font-bold">{criterionFilter}</span>
                  {ctViewMode === 'atom' && <span className="ml-1 italic">(atom view)</span>}
                </p>
              )}
            </div>

            {/* View switcher: Criteria vs Atoms */}
            <div className="flex items-center gap-1 rounded-lg border bg-background p-0.5">
              {(['criterion', 'atom'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setCtViewMode(mode)}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
                    viewMode === mode ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {mode === 'criterion' ? 'By Criterion' : 'By Atom'}
                </button>
              ))}
            </div>

            {/* Dropdown */}
            {ctViewMode === 'criterion' ? (
              <select
                value={criterionFilter ?? ''}
                onChange={(e) => setCriterionFilterState(e.target.value || null)}
                className="h-8 rounded-lg border bg-background px-2 text-xs font-medium cursor-pointer max-w-[300px]"
              >
                <option value="">All criteria</option>
                {criterionOptions.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.type === 'inclusion' ? '[INC] ' : '[EXC] '}
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={criterionFilter ?? ''}
                onChange={(e) => setCriterionFilterState(e.target.value || null)}
                className="h-8 rounded-lg border bg-background px-2 text-xs font-medium cursor-pointer max-w-[320px]"
              >
                <option value="">All atoms</option>
                {atomOptions.map((a) => (
                  <option key={a.id} value={a.parentName}>
                    {a.parentType === 'inclusion' ? '[INC] ' : '[EXC] '}
                    {a.label} <span>— {a.parentName}</span>
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground">
              {reviewed === reviewItems.length && reviewItems.length > 0 ? (
                <span className="font-semibold text-emerald-600">All {reviewItems.length} encounters reviewed</span>
              ) : (
                <span>{reviewed}/{reviewItems.length} reviewed</span>
              )}
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setMatrixOpen(true)}>
              <Grid3x3 className="h-3.5 w-3.5 mr-1" /> Patient Eligibility Matrix
            </Button>
            <button
              onClick={() => setFullscreen((s) => !s)}
              className="flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted cursor-pointer"
              title={fullscreen ? 'Exit fullscreen' : 'Expand to fullscreen'}
            >
              {fullscreen ? <><Minimize2 className="h-3.5 w-3.5" /> Exit</> : <><Maximize2 className="h-3.5 w-3.5" /> Fullscreen</>}
            </button>
          </div>
        </div>
      )}

      {/* ─── 1. COLLAPSIBLE STATS ACCORDION ─── */}
      <div className="rounded-xl border bg-card">
        <button onClick={() => setStatsOpen((s) => !s)} className="flex w-full items-center justify-between px-4 py-2 cursor-pointer hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-bold text-sm">Review</span>
            <Badge variant="secondary" className="text-[9px] px-2 py-0">Records: {reviewItems.length}</Badge>
            <Badge variant={reviewed === reviewItems.length ? 'success' : 'processing'} className="text-[9px] px-2 py-0">{reviewed}/{reviewItems.length} reviewed</Badge>
            <span className="text-emerald-600">T:{trueC}</span>
            <span className="text-red-500">F:{falseC}</span>
            <span className="text-amber-500">U:{unclearC}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setAssignOpen(true); }}><UserPlus className="mr-1 h-3 w-3" /> Assign</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); setDownloadOpen(true); }}><Download className="mr-1 h-3 w-3" /> Download CSV</Button>
            {statsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>
        {statsOpen && (
          <div className="border-t px-4 py-3 space-y-2">
            <Progress value={processed} max={reviewItems.length} className="h-1.5" />
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
              <span>Processed: <strong className="text-foreground">{processed}/{reviewItems.length}</strong></span>
              <span>Reviewed: <strong className="text-foreground">{reviewed}/{reviewItems.length}</strong></span>
              <span>Auto-validated: <strong className="text-foreground">{autoCount}</strong></span>
              <span>Manual review: <strong className="text-foreground">{manualCount}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* ─── 2. MAIN WORKSPACE ─── */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* ─── LEFT PANEL ─── */}
        {leftOpen ? (
          <aside className="w-56 shrink-0 rounded-xl border bg-card flex flex-col shadow-sm">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <p className="text-xs font-bold">Queue</p>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setLeftOpen(false)}><PanelLeftClose className="h-3.5 w-3.5" /></Button>
            </div>

            {/* Validation tabs */}
            <div className="flex border-b">
              {([['all', `Total`], ['manual', `Manual`], ['auto', `Auto`]] as const).map(([tab, label]) => (
                <button key={tab} onClick={() => setValidationTab(tab)} className={`flex-1 py-1.5 text-[10px] font-bold transition-colors cursor-pointer ${validationTab === tab ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>{label}</button>
              ))}
            </div>

            {/* Search + filter + group by */}
            <div className="p-2 space-y-1.5 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter Patient ID..." className="h-7 pl-7 text-[10px]" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5 flex-1">
                  {(['all', 'mine'] as const).map((f) => (
                    <button key={f} onClick={() => setAssignedFilter(f)} className={`flex-1 rounded-md px-1.5 py-0.5 text-[9px] font-semibold transition-colors cursor-pointer ${assignedFilter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{f === 'all' ? 'All' : 'Mine'}</button>
                  ))}
                </div>
                <button onClick={() => setFilterOpen(true)} className={`relative rounded-md p-1 transition-colors cursor-pointer ${hasActiveFilters ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`} title="Advanced Filters">
                  <Filter className="h-3 w-3" />
                  {hasActiveFilters && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />}
                </button>
              </div>
              <label className="flex items-center gap-1.5 text-[10px] cursor-pointer"><Checkbox checked={groupByPatient} onChange={(e) => setGroupByPatient((e.target as HTMLInputElement).checked)} /> Group by patient</label>
            </div>

            {/* Patient / Encounter list */}
            <ScrollArea className="flex-1">
              <div className="p-1">
                <p className="px-2 py-1 text-[9px] text-muted-foreground font-bold">Showing {visible.length} of {reviewItems.length} results</p>

                {groupByPatient ? (
                  <div className="space-y-0.5">
                    {patients.map((patient) => {
                      const llmStatus = patient.encounters[0]?.llmEligibility;
                      return (
                        <div key={patient.patientId}>
                          <button onClick={() => togglePatient(patient.patientId)} className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted/50 transition-colors cursor-pointer ${patient.encounters.some((e) => e.encounterId === selectedEnc) ? 'bg-primary/5' : ''}`}>
                            <span className="text-[10px] font-bold text-muted-foreground w-4 shrink-0 text-right">{patient.serial}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] font-bold truncate">{patient.patientId}</span>
                                {llmStatus && <Badge variant={llmStatus === 'Eligible' ? 'success' : 'destructive'} className="text-[7px] px-1 py-0 shrink-0">{llmStatus === 'Eligible' ? 'VERIFIED' : 'INELIG.'}</Badge>}
                              </div>
                              <span className="text-[9px] text-muted-foreground">{isAutoValidated(patient.encounters[0]) ? 'Auto-validated' : 'Manual review'}</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <span className="text-[9px] text-muted-foreground">{patient.encounters.length}</span>
                              {expandedPatients.has(patient.patientId) ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                            </div>
                          </button>
                          {expandedPatients.has(patient.patientId) && (
                            <div className="ml-6 space-y-0.5 mb-0.5">
                              {patient.encounters.map((item) => (
                                <button key={item.encounterId} onClick={() => setSelectedEnc(item.encounterId)} className={`w-full rounded-md px-2 py-1.5 text-left transition-all cursor-pointer ${selectedEnc === item.encounterId ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted'}`}>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-medium">{item.encounterId}</span>
                                    <Badge variant={statusVariant(item.processing)} className="text-[8px] px-1 py-0">{item.processing}</Badge>
                                  </div>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    {item.decision && <Badge variant={item.decision === 'True' ? 'success' : item.decision === 'False' ? 'destructive' : 'warning'} className="text-[7px] px-1 py-0">{item.decision}</Badge>}
                                    {item.flagged && <Flag className="h-2.5 w-2.5 text-amber-500" />}
                                    <span className="text-[8px] text-muted-foreground">{item.encounterDate}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {visible.map((item, idx) => (
                      <button key={item.encounterId} onClick={() => setSelectedEnc(item.encounterId)} className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all cursor-pointer ${selectedEnc === item.encounterId ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'}`}>
                        <span className="text-[10px] font-bold text-muted-foreground w-4 shrink-0 text-right">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] font-medium truncate">{item.patientId}</span>
                            <Badge variant={statusVariant(item.processing)} className="text-[7px] px-1 py-0">{item.processing}</Badge>
                          </div>
                          <p className="text-[9px] text-muted-foreground">{item.encounterId}</p>
                        </div>
                      </button>
                    ))}
                    {visible.length === 0 && <p className="p-3 text-center text-[10px] text-muted-foreground">No items match</p>}
                  </div>
                )}
              </div>
            </ScrollArea>
          </aside>
        ) : (
          <Button variant="outline" size="icon" className="h-auto self-start shrink-0" onClick={() => setLeftOpen(true)}><PanelLeftOpen className="h-4 w-4" /></Button>
        )}

        {/* ─── CENTER: REVIEW CONTENT ─── */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Card className="flex-1 flex flex-col min-h-0 rounded-xl">
            {!sel && !showError && (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <BookOpen className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">Select a patient from the queue to begin reviewing</p>
              </div>
            )}
            {showError && (
              <div className="flex-1 flex flex-col items-center justify-center">
                <AlertCircle className="h-10 w-10 text-destructive mb-3" />
                <p className="text-sm font-semibold text-destructive">Failed to load review data</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowError(false)}>Retry</Button>
              </div>
            )}
            {sel && !showError && (
              <>
                {/* Sticky header: context + tabs + pagination controls */}
                <div className="sticky top-0 z-10 bg-card border-b px-4 py-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Context Area: <strong className="text-foreground">{sel.patientId}</strong></p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span>{sel.encounterId}</span>
                      <span>·</span>
                      <span>{sel.encounterDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View mode tabs */}
                    <div className="flex gap-0.5 rounded-lg border bg-muted/50 p-0.5 flex-1">
                      {([
                        { key: 'snips' as const, label: 'Evidence Snips' },
                        { key: 'text' as const, label: 'Full Text View' },
                      ]).map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => { setViewMode(tab.key); setTextPage(0); setTextSearch(''); setSnipSearch(''); }}
                          className={`flex-1 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all cursor-pointer ${viewMode === tab.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          {tab.label}
                          {tab.key === 'snips' && <span className="ml-1 text-[8px] text-red-500">● keywords</span>}
                          {tab.key === 'snips' && <span className="ml-0.5 text-[8px] text-emerald-500">● rationale</span>}
                        </button>
                      ))}
                    </div>

                    {/* Pagination controls for full text (at the top) */}
                    {viewMode === 'text' && !isTextSearchActive && fullTextLines.length > LINES_PER_PAGE && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" disabled={textPage === 0} onClick={() => setTextPage((p) => p - 1)}><ChevronLeft className="h-3 w-3" /></Button>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{textPage + 1}/{totalTextPages}</span>
                        <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" disabled={textPage >= totalTextPages - 1} onClick={() => setTextPage((p) => p + 1)}><ChevronRight className="h-3 w-3" /></Button>
                      </div>
                    )}
                  </div>

                  {/* Full text search bar */}
                  {viewMode === 'text' && (
                    <div className="flex items-center gap-2">
                      <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <Input value={textSearch} onChange={(e) => { setTextSearch(e.target.value); setTextPage(0); }} placeholder="Search in full text..." className="h-7 text-xs flex-1" />
                      {textSearch && (
                        <button onClick={() => setTextSearch('')} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-3 w-3" /></button>
                      )}
                      {isTextSearchActive && <span className="text-[9px] text-muted-foreground shrink-0">Showing all lines (search active)</span>}
                    </div>
                  )}

                  {/* Evidence snips search bar */}
                  {viewMode === 'snips' && (
                    <div className="flex items-center gap-2">
                      <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <Input value={snipSearch} onChange={(e) => setSnipSearch(e.target.value)} placeholder="Search in evidence snips..." className="h-7 text-xs flex-1" />
                      {snipSearch && (
                        <button onClick={() => setSnipSearch('')} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-3 w-3" /></button>
                      )}
                      {snipSearch.trim() && <span className="text-[9px] text-muted-foreground shrink-0">Filtering snippets</span>}
                    </div>
                  )}
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4">
                    {viewMode === 'snips' && (() => {
                      const sq = snipSearch.trim().toLowerCase();
                      const greens = sq ? evidence.green.filter(t => t.toLowerCase().includes(sq)) : evidence.green;
                      const reds = sq ? evidence.red.filter(t => t.toLowerCase().includes(sq)) : evidence.red;
                      const neutrals = sq ? evidence.neutral.filter(t => t.toLowerCase().includes(sq)) : evidence.neutral;
                      const total = greens.length + reds.length + neutrals.length;
                      const hlQuery = snipSearch.trim() || search;
                      return (
                        <div className="space-y-2">
                          {greens.map((t, i) => <div key={`g${i}`} className="rounded-lg border-l-4 border-emerald-500 bg-emerald-500/5 p-3 text-xs leading-relaxed">{hl(t, hlQuery)}</div>)}
                          {reds.map((t, i) => <div key={`r${i}`} className="rounded-lg border-l-4 border-red-500 bg-red-500/5 p-3 text-xs leading-relaxed">{hl(t, hlQuery)}</div>)}
                          {neutrals.map((t, i) => <div key={`n${i}`} className="rounded-lg border-l-4 border-gray-400 bg-muted/30 p-3 text-xs leading-relaxed">{hl(t, hlQuery)}</div>)}
                          {total === 0 && <p className="text-[10px] text-muted-foreground italic text-center py-6">{sq ? `No snippets match "${snipSearch}".` : 'No evidence snips available.'}</p>}
                        </div>
                      );
                    })()}

                    {viewMode === 'text' && (
                      <>
                        {fullText ? (
                          <div className="text-sm leading-relaxed whitespace-pre-wrap font-mono">{hl(displayText, textSearch)}</div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground italic text-center py-6">No full text available.</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* ─── STICKY DECISION BAR ─── */}
                <div className="border-t bg-card px-4 py-2.5 flex items-center gap-2 rounded-b-xl shrink-0">
                  <Button variant="destructive" disabled={sel.processing !== 'Done'} onClick={() => initiateDecision('False')} className="h-9 px-4">
                    <X className="mr-1.5 h-4 w-4" /> Mark Ineligible
                  </Button>
                  <Button variant="success" disabled={sel.processing !== 'Done'} onClick={() => initiateDecision('True')} className="h-9 px-4">
                    <Check className="mr-1.5 h-4 w-4" /> Mark Eligible
                  </Button>
                  <Button variant="outline" disabled={sel.processing !== 'Done'} onClick={() => initiateDecision('Unclear')} className="h-9 px-3">
                    <Minus className="mr-1 h-4 w-4" /> Unclear
                  </Button>
                  <div className="flex-1" />
                  <div className="relative">
                    <Button variant="outline" size="sm" className="h-8" onClick={() => setDownloadOpen((s) => !s)}><Download className="mr-1 h-3 w-3" /> Export</Button>
                    {downloadOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setDownloadOpen(false)} />
                        <div className="absolute bottom-full right-0 mb-1 z-50 w-48 rounded-xl border bg-popover p-1 shadow-xl">
                          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-accent cursor-pointer" onClick={() => setDownloadOpen(false)}><Download className="h-3 w-3 text-emerald-600" /> True export</button>
                          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-accent cursor-pointer" onClick={() => setDownloadOpen(false)}><Download className="h-3 w-3 text-blue-600" /> Exploded export</button>
                          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-accent cursor-pointer" onClick={() => setDownloadOpen(false)}><Download className="h-3 w-3 text-amber-600" /> Null-safe export</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* ─── RIGHT PANEL ─── */}
        {sel && !showError && (
          <aside className="w-72 shrink-0 rounded-xl border bg-card flex flex-col shadow-sm overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Final LLM Output */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Final LLM Output</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Eligibility Status</span>
                      <Badge variant={sel.llmEligibility === 'Eligible' ? 'success' : 'destructive'} className="text-xs px-2 py-0.5">
                        {sel.llmEligibility ?? 'N/A'}
                      </Badge>
                    </div>
                    <Separator />
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium">Reason</p>
                      <div className="rounded-lg border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground min-h-[60px]">
                        {sel.llmReason || 'No reason provided by the LLM output.'}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Patient Eligibility by Reviewer */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Patient Eligibility by Reviewer</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status</span>
                    {(() => {
                      const rv = reviewerDecisionLabel(sel.decision);
                      return <Badge variant={rv.variant} className="text-xs px-2 py-0.5">{rv.text}</Badge>;
                    })()}
                  </div>
                  {sel.reviewedBy && <p className="text-xs text-muted-foreground">Reviewed by: <strong className="text-foreground">{sel.reviewedBy}</strong></p>}
                  {sel.reason && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Reason</p>
                      <div className="rounded-lg border bg-muted/20 p-2.5 text-xs text-muted-foreground">{sel.reason}</div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Quick actions */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[10px] shrink-0 cursor-pointer">
                    <Checkbox checked={sel.flagged ?? false} onChange={() => void toggleItemFlag(sel.encounterId)} />
                    <Flag className="h-3 w-3 text-amber-500" /> Flag
                  </label>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setNotepadOpen((s) => !s)}><StickyNote className="mr-1 h-3 w-3" /> Notepad</Button>
                </div>

                <Separator />

                {/* Comments & Review Log */}
                <div className="space-y-2">
                  <div className="flex border-b">
                    <button onClick={() => setLogTab('comments')} className={`flex-1 py-1.5 text-[10px] font-bold transition-colors cursor-pointer ${logTab === 'comments' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}>
                      Comments ({sel.comments?.length ?? 0})
                    </button>
                    <button onClick={() => setLogTab('log')} className={`flex-1 py-1.5 text-[10px] font-bold transition-colors cursor-pointer ${logTab === 'log' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}>
                      Review Log ({sel.decisionLog?.length ?? 0})
                    </button>
                  </div>
                  <div className="space-y-2">
                    {logTab === 'comments' ? (
                      <>
                        {(!sel.comments || sel.comments.length === 0) && <p className="text-[10px] text-muted-foreground italic text-center py-2">No comments yet</p>}
                        {sel.comments?.map((c) => (
                          <div key={c.id} className="rounded-lg border p-2.5 text-xs">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold">{c.user}</span>
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-muted-foreground">{c.timestamp}</span>
                                {c.user === currentUser && <button onClick={() => { setEditingComment(c.id); setEditCommentText(c.text); }} className="text-primary cursor-pointer"><Pencil className="h-2.5 w-2.5" /></button>}
                              </div>
                            </div>
                            {editingComment === c.id ? (
                              <div className="flex gap-1.5 mt-1">
                                <Input value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)} className="flex-1 h-6 text-[10px]" />
                                <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => { void editComment(sel.encounterId, c.id, editCommentText); setEditingComment(null); }}>Save</Button>
                                <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setEditingComment(null)}>X</Button>
                              </div>
                            ) : <p className="text-muted-foreground">{c.text}</p>}
                          </div>
                        ))}
                        <div className="flex gap-1.5">
                          <Input placeholder="Add comment..." value={comment} onChange={(e) => setComment(e.target.value)} className="flex-1 h-7 text-[10px]" onKeyDown={(e) => { if (e.key === 'Enter' && comment.trim()) { void saveDecision({ encounterId: sel.encounterId, decision: sel.decision ?? 'Unclear', reason: sel.reason ?? '', comment }); setComment(''); } }} />
                          <Button variant="outline" size="icon" className="h-7 w-7 shrink-0" onClick={() => { if (comment.trim()) { void saveDecision({ encounterId: sel.encounterId, decision: sel.decision ?? 'Unclear', reason: sel.reason ?? '', comment }); setComment(''); } }}><Send className="h-3 w-3" /></Button>
                        </div>
                      </>
                    ) : (
                      <>
                        {(!sel.decisionLog || sel.decisionLog.length === 0) && <p className="text-[10px] text-muted-foreground italic text-center py-2">No decisions logged yet</p>}
                        {sel.decisionLog?.map((log, i) => (
                          <div key={i} className="rounded-lg border p-2 text-[10px] space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Badge variant={log.decision === 'True' ? 'success' : log.decision === 'False' ? 'destructive' : 'warning'} className="text-[8px] px-1 py-0">{log.decision}</Badge>
                              <span className="font-semibold">{log.user}</span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-2.5 w-2.5" />
                              <span>{log.timestamp}</span>
                            </div>
                            {log.reason && <p className="text-muted-foreground">{log.reason}</p>}
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {sel.processing !== 'Done' && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                    Decision controls disabled — item is still {sel.processing.toLowerCase()}.
                  </div>
                )}
              </div>
            </ScrollArea>
          </aside>
        )}
      </div>

      {/* Session notepad overlay */}
      {notepadOpen && (
        <div className="fixed right-6 top-32 z-20 w-64 rounded-xl border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-[10px] font-bold flex items-center gap-1"><StickyNote className="h-3 w-3" /> Session Notepad</span>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setNotepadOpen(false)}><X className="h-2.5 w-2.5" /></Button>
          </div>
          <div className="p-2"><Textarea placeholder="Notes (not exported)..." value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} rows={5} className="text-[10px]" /></div>
        </div>
      )}

      {/* ─── DECISION CONFIRMATION DIALOG ─── */}
      <Dialog
        open={!!pendingDecision}
        onClose={() => setPendingDecision(null)}
        title={pendingDecision ? decisionLabels[pendingDecision].title : ''}
        description={pendingDecision ? decisionLabels[pendingDecision].desc : ''}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Reviewer Notes</label>
            <Textarea
              value={reviewerNotes}
              onChange={(e) => setReviewerNotes(e.target.value)}
              placeholder="Enter review notes or reason for eligibility decision..."
              rows={4}
              autoFocus
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setPendingDecision(null)}>Cancel</Button>
            {pendingDecision === 'True' && (
              <Button variant="success" onClick={() => void confirmDecision()}>
                <Check className="mr-1.5 h-4 w-4" /> Mark Eligible
              </Button>
            )}
            {pendingDecision === 'False' && (
              <Button variant="destructive" onClick={() => void confirmDecision()}>
                <X className="mr-1.5 h-4 w-4" /> Mark Ineligible
              </Button>
            )}
            {pendingDecision === 'Unclear' && (
              <Button variant="outline" onClick={() => void confirmDecision()}>
                <Minus className="mr-1 h-4 w-4" /> Mark Unclear
              </Button>
            )}
          </div>
        </div>
      </Dialog>

      {/* ─── FILTER MODAL ─── */}
      <Dialog open={filterOpen} onClose={() => setFilterOpen(false)} title="Advanced Filters" description="Filter review items by LLM eligibility, reviewed status, and reviewer eligibility">
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">Combine filters with:</span>
            <div className="flex rounded-lg border overflow-hidden">
              <button onClick={() => setFilterLogic('AND')} className={`px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${filterLogic === 'AND' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>AND</button>
              <button onClick={() => setFilterLogic('OR')} className={`px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${filterLogic === 'OR' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>OR</button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">LLM Eligibility</p>
            <div className="flex gap-2">
              {(['Eligible', 'Ineligible'] as const).map((v) => (
                <label key={v} className={`flex items-center gap-2 rounded-xl border px-4 py-2 cursor-pointer transition-colors text-sm ${fLlmEligibility.includes(v) ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted/30'}`}>
                  <Checkbox checked={fLlmEligibility.includes(v)} onChange={() => toggleFilter(fLlmEligibility, v, setFLlmEligibility)} />
                  {v}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Reviewed Status</p>
            <div className="flex gap-2">
              {(['Reviewed', 'Not Reviewed'] as const).map((v) => (
                <label key={v} className={`flex items-center gap-2 rounded-xl border px-4 py-2 cursor-pointer transition-colors text-sm ${fReviewedStatus.includes(v) ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted/30'}`}>
                  <Checkbox checked={fReviewedStatus.includes(v)} onChange={() => toggleFilter(fReviewedStatus, v, setFReviewedStatus)} />
                  {v}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Reviewer Eligibility</p>
            <div className="flex gap-2">
              {(['Eligible', 'Ineligible', 'Unclear'] as const).map((v) => (
                <label key={v} className={`flex items-center gap-2 rounded-xl border px-4 py-2 cursor-pointer transition-colors text-sm ${fReviewerEligibility.includes(v) ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted/30'}`}>
                  <Checkbox checked={fReviewerEligibility.includes(v)} onChange={() => toggleFilter(fReviewerEligibility, v, setFReviewerEligibility)} />
                  {v}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Reviewer Name</p>
            <div className="flex flex-wrap gap-2">
              {[...users, 'Unassigned'].map((v) => (
                <label key={v} className={`flex items-center gap-2 rounded-xl border px-4 py-2 cursor-pointer transition-colors text-sm ${fReviewerName.includes(v) ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted/30'}`}>
                  <Checkbox checked={fReviewerName.includes(v)} onChange={() => toggleFilter(fReviewerName, v, setFReviewerName)} />
                  {v}
                </label>
              ))}
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-2">
            <Button onClick={() => setFilterOpen(false)}>Apply Filters</Button>
            <Button variant="outline" onClick={() => { clearFilters(); setFilterOpen(false); }}>Clear All</Button>
          </div>
        </div>
      </Dialog>

      {/* ─── ASSIGNMENT DIALOG ─── */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign patients for review" description="Choose batch assignment by serial numbers or assign individually" fullscreen>
        <div className="space-y-5">
          <div className="flex items-center rounded-xl border bg-muted/50 p-1">
            <button onClick={() => setAssignMode('batch')} className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${assignMode === 'batch' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>Batch Assignment (by Serial #)</button>
            <button onClick={() => setAssignMode('individual')} className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${assignMode === 'individual' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>Per-Patient Assignment</button>
          </div>

          {assignMode === 'batch' ? (
            <section className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Patients per group</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 5, 10, 15, 20].map((n) => (
                    <button key={n} onClick={() => setBatchSize(n)} className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors cursor-pointer ${batchSize === n ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted/30 text-muted-foreground'}`}>{n}</button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{assignFilteredPatients.length} patients available → {batchGroupCount} group{batchGroupCount !== 1 ? 's' : ''}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Assign groups to reviewers</label>
                <div className="rounded-xl border overflow-hidden">
                  <div className="grid grid-cols-4 gap-2 border-b bg-muted/30 px-4 py-2 text-xs font-bold text-muted-foreground">
                    <span>Group</span><span>Serial #</span><span>Patient IDs</span><span>Assignee</span>
                  </div>
                  <ScrollArea className="max-h-72">
                    {Array.from({ length: batchGroupCount }, (_, gi) => {
                      const start = gi * batchSize;
                      const end = Math.min(start + batchSize, assignFilteredPatients.length);
                      const groupPats = assignFilteredPatients.slice(start, end);
                      const serialStart = groupPats[0]?.serial ?? start + 1;
                      const serialEnd = groupPats[groupPats.length - 1]?.serial ?? end;
                      return (
                        <div key={gi} className="grid grid-cols-4 items-center gap-2 px-4 py-2.5 border-b last:border-0 text-sm">
                          <span className="font-semibold text-xs">Group {gi + 1}</span>
                          <span className="text-xs font-bold text-primary">{serialStart}–{serialEnd}</span>
                          <div className="text-[10px] text-muted-foreground truncate">{groupPats.map((p) => p.patientId).join(', ')}</div>
                          <Select value={batchAssignments[`g${gi}`] ?? ''} onChange={(e) => setBatchAssignments((p) => ({ ...p, [`g${gi}`]: e.target.value }))} className="h-8 text-xs">
                            <option value="">Select...</option>
                            {users.map((u) => <option key={u}>{u}</option>)}
                          </Select>
                        </div>
                      );
                    })}
                  </ScrollArea>
                </div>
              </div>

              <Separator />
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={sendEmail} onChange={(e) => setSendEmail((e.target as HTMLInputElement).checked)} /> Send email notification</label>
                <Textarea value={assignMsg} onChange={(e) => setAssignMsg(e.target.value)} placeholder="Optional message..." rows={2} />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => void doBatchAssign()} disabled={Object.values(batchAssignments).filter(Boolean).length === 0}><MessageSquare className="mr-1.5 h-4 w-4" /> Assign groups</Button>
                <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
              </div>
            </section>
          ) : (
            <section className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-bold">Select patients</h3>
                <div className="flex gap-2">
                  <Select value={revFilter} onChange={(e) => setRevFilter(e.target.value)} className="w-auto"><option>All</option><option>Not started</option><option>In progress</option><option>Reviewed</option></Select>
                  <Select value={decFilter} onChange={(e) => setDecFilter(e.target.value)} className="w-auto"><option>All</option><option>True</option><option>False</option><option>Unclear</option><option>Not decided</option></Select>
                  <Button variant="outline" size="sm" onClick={() => setSelPatients(assignFilteredPatients.map((p) => p.patientId))}>Select all ({assignFilteredPatients.length})</Button>
                </div>
                <div className="rounded-xl border overflow-hidden">
                  <div className="grid grid-cols-6 gap-2 border-b bg-muted/30 px-4 py-2 text-xs font-bold text-muted-foreground"><span></span><span>#</span><span>Patient</span><span>Encounters</span><span>Status</span><span>Assigned</span></div>
                  <ScrollArea className="max-h-48">
                    {assignFilteredPatients.map((row) => (
                      <label key={row.patientId} className="grid grid-cols-6 items-center gap-2 px-4 py-2 text-sm hover:bg-muted/30 cursor-pointer border-b last:border-0">
                        <Checkbox checked={selPatients.includes(row.patientId)} onChange={(e) => { if ((e.target as HTMLInputElement).checked) setSelPatients((p) => [...p, row.patientId]); else setSelPatients((p) => p.filter((id) => id !== row.patientId)); }} />
                        <span className="text-xs font-bold text-primary">{row.serial}</span>
                        <span className="font-medium text-xs">{row.patientId}</span>
                        <span className="text-xs">{row.encounters.length}</span>
                        <Badge variant={row.status === 'Complete' ? 'success' : 'secondary'} className="w-fit text-[9px] px-1 py-0">{row.status}</Badge>
                        <span className="text-[10px] text-muted-foreground">{row.assignedTo.length ? row.assignedTo.join(', ') : '—'}</span>
                      </label>
                    ))}
                  </ScrollArea>
                </div>
                <p className="text-xs font-bold">Selected: {selPatients.length}</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-bold">Assign to</h3>
                <div className="flex flex-wrap gap-2">
                  {users.map((name) => (
                    <label key={name} className="flex items-center gap-2 rounded-xl border px-3 py-2 hover:bg-muted/30 cursor-pointer text-sm transition-colors">
                      <Checkbox checked={selAssignees.includes(name)} onChange={(e) => { if ((e.target as HTMLInputElement).checked) setSelAssignees((p) => [...p, name]); else setSelAssignees((p) => p.filter((n) => n !== name)); }} />
                      {name}
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input value={inviteEmails} onChange={(e) => setInviteEmails(e.target.value)} placeholder="email@company.com" className="col-span-2" />
                  <Select><option>Admin</option><option>Reviewer</option></Select>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={sendEmail} onChange={(e) => setSendEmail((e.target as HTMLInputElement).checked)} /> Send email notification</label>
                <Textarea value={assignMsg} onChange={(e) => setAssignMsg(e.target.value)} placeholder="Optional message..." rows={2} />
              </div>
              <div className="flex gap-2">
                <Button disabled={!selPatients.length || !selAssignees.length} onClick={() => void doIndividualAssign()}><MessageSquare className="mr-1.5 h-4 w-4" /> Assign</Button>
                <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
              </div>
            </section>
          )}
        </div>
      </Dialog>

      {/* ── Patient Eligibility Matrix (CT only) ── */}
      {isCTContext && ctCohort && (
        <Dialog
          open={matrixOpen}
          onClose={() => setMatrixOpen(false)}
          title="Patient Eligibility Matrix"
          description={`All patients × criteria for ${currentProject?.name ?? 'this cohort'}`}
          fullscreen
        >
          <div className="h-full">
            <EligibilityMatrix cohort={ctCohort} reviewItems={allReviewItems.filter((ri) => ri.projectId === projectId)} height="100%" />
          </div>
        </Dialog>
      )}
    </div>
  );
}
