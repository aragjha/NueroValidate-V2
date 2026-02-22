import type { AuditEntry, Criterion, LogEntry, Notification, Project, ReviewItem, RunConfig } from '../types';

type AppData = {
  projects: Project[];
  reviewItems: ReviewItem[];
  criteria: Criterion[];
  runs: RunConfig[];
  audit: AuditEntry[];
  logs: LogEntry[];
  notifications: Notification[];
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const db: AppData = {
  projects: [
    {
      id: 'prj-01',
      name: 'Migraine Prophylaxis RWE Cohort',
      types: ['RWE'],
      lead: 'Anurag',
      dataSource: 'Epic EHR / S3',
      patientCount: 12320,
      lastUpdated: '2h ago',
      shared: true,
      status: 'Active',
      stageProgress: 85,
      currentStage: 4,
      totalStages: 5,
      teamAvatars: ['AN', 'NI'],
    },
    {
      id: 'prj-02',
      name: "Alzheimer's Phase III Biomarker Validation",
      types: ['RWE', 'RWD'],
      lead: 'Nida',
      dataSource: 'Veeva Vault',
      patientCount: 4800,
      lastUpdated: '1d ago',
      shared: true,
      status: 'Active',
      stageProgress: 40,
      currentStage: 2,
      totalStages: 5,
      teamAvatars: ['NI', 'NE'],
    },
    {
      id: 'prj-03',
      name: "Parkinson's Motor Symptom Progression Study",
      types: ['RWD'],
      lead: 'Neha',
      dataSource: 'Flatiron Health',
      patientCount: 7200,
      lastUpdated: '3d ago',
      shared: false,
      status: 'Active',
      stageProgress: 15,
      currentStage: 1,
      totalStages: 5,
      teamAvatars: ['NE', 'SO', 'AN'],
    },
    {
      id: 'prj-04',
      name: 'Multiple Sclerosis Relapse Prevention Cohort',
      types: ['RWE', 'RWD'],
      lead: 'Sonick',
      dataSource: 'OMOP CDM',
      patientCount: 9410,
      lastUpdated: '2h ago',
      shared: true,
      status: 'Active',
      stageProgress: 85,
      currentStage: 4,
      totalStages: 5,
      teamAvatars: ['SO', 'AN'],
    },
    {
      id: 'prj-05',
      name: 'AD Tau PET Imaging Validation',
      types: ['RWD'],
      lead: 'Anurag',
      dataSource: 'ADNI Repository',
      patientCount: 3200,
      lastUpdated: '2d ago',
      shared: true,
      status: 'Active',
      stageProgress: 60,
      currentStage: 3,
      totalStages: 5,
      teamAvatars: ['AN', 'NI'],
    },
    {
      id: 'prj-06',
      name: 'Epilepsy Focal Seizure Frequency Analysis',
      types: ['RWE'],
      lead: 'Nida',
      dataSource: 'Redshift DW',
      patientCount: 5100,
      lastUpdated: '2w ago',
      shared: false,
      status: 'Archived',
      stageProgress: 100,
      currentStage: 5,
      totalStages: 5,
      teamAvatars: ['NI'],
    },
  ],
  criteria: [
    {
      id: 'cri-01',
      name: 'Migraine frequency ≥ 4 episodes/month',
      type: 'inclusion',
      description: 'Patient must have documented migraine frequency of 4 or more episodes per month over at least 3 months.',
      extractionPrompt: 'Extract all mentions of migraine episode frequency, headache days per month, and migraine attack counts from the clinical notes.',
      extractionValidation: 'Verify the extracted frequency is a numeric value and corresponds to migraine-specific episodes, not general headaches.',
      reasoningPrompt: 'Based on the extracted evidence, determine if the patient meets the threshold of ≥ 4 migraine episodes per month consistently.',
      reasoningValidation: 'Confirm the reasoning accounts for temporal consistency (≥ 3 months) and distinguishes migraine from tension-type headaches.',
      model: 'GPT-4.1',
    },
    {
      id: 'cri-02',
      name: 'MMSE score < 24 (cognitive impairment)',
      type: 'inclusion',
      description: 'Patient must have a documented Mini-Mental State Examination score below 24 indicating cognitive impairment.',
      extractionPrompt: 'Extract MMSE scores, cognitive assessment results, and any neuropsychological testing scores from the encounter notes.',
      extractionValidation: 'Validate that extracted scores are from MMSE specifically and not other cognitive scales like MoCA unless converted.',
      reasoningPrompt: 'Determine if the patient has documented cognitive impairment based on MMSE score < 24 at any point during the study period.',
      reasoningValidation: 'Ensure the reasoning differentiates between baseline and follow-up scores and considers confounders like delirium.',
      model: 'GPT-4.1',
    },
    {
      id: 'cri-03',
      name: 'No prior brain surgery',
      type: 'exclusion',
      description: 'Exclude patients with any documented history of neurosurgical intervention including craniotomy, DBS implant, or shunt placement.',
      extractionPrompt: 'Extract any mentions of brain surgery, craniotomy, deep brain stimulation, VP shunt, or other neurosurgical procedures.',
      extractionValidation: 'Confirm that surgical references are neurosurgical and not unrelated procedures. Check for negated mentions.',
      reasoningPrompt: 'Determine if the patient has any history of brain surgery that would make them ineligible for the study.',
      reasoningValidation: 'Verify the reasoning correctly handles negation (e.g. "no history of brain surgery") and temporal context.',
      model: 'Claude Sonnet',
    },
    {
      id: 'cri-04',
      name: 'Tremor assessment documented',
      type: 'inclusion',
      description: 'Patient must have at least one documented tremor assessment (UPDRS Part III or equivalent) in the study period.',
      extractionPrompt: 'Extract all tremor assessments, UPDRS scores, motor examination findings related to tremor, and movement disorder evaluations.',
      extractionValidation: 'Ensure extracted data pertains to tremor specifically and includes standardized scoring when available.',
      reasoningPrompt: 'Assess whether a formal tremor evaluation has been documented and whether it meets the study protocol requirements.',
      reasoningValidation: 'Confirm reasoning distinguishes between incidental tremor mentions and formal structured assessments.',
      model: 'GPT-4.1',
    },
    {
      id: 'cri-05',
      name: 'MS relapse within 12 months',
      type: 'inclusion',
      description: 'Patient must have experienced at least one confirmed MS relapse within the past 12 months of enrollment.',
      extractionPrompt: 'Extract all mentions of MS relapses, exacerbations, flare-ups, new or enlarging T2 lesions, and Gd-enhancing lesions from clinical and radiology notes.',
      extractionValidation: 'Validate that the identified events are true relapses (new neurological symptoms lasting > 24h) and not pseudo-relapses.',
      reasoningPrompt: 'Determine if the patient had a confirmed MS relapse within the 12-month window preceding enrollment date.',
      reasoningValidation: 'Ensure reasoning accounts for the temporal window and distinguishes relapses from progression or pseudo-relapses.',
      model: 'Gemini 2.5 Pro',
    },
  ],
  runs: [
    {
      id: 'run-cfg-01',
      runId: 'RUN-001',
      criterionId: 'cri-01',
      overrideModels: false,
      overridePrompts: false,
      overrideKeywords: false,
      sampleSize: 50,
      patientIds: '',
      reuseSample: false,
      fullRun: false,
      status: 'Done',
      extractionCount: 48,
      totalCount: 50,
      fileName: 'migraine_cohort_batch_01.csv',
    },
    {
      id: 'run-cfg-02',
      runId: 'RUN-002',
      criterionId: 'cri-02',
      overrideModels: true,
      overridePrompts: false,
      overrideKeywords: false,
      sampleSize: 30,
      patientIds: '',
      reuseSample: true,
      fullRun: false,
      status: 'Processing',
      extractionCount: 12,
      totalCount: 30,
      fileName: 'alzheimers_mmse_batch_02.csv',
    },
  ],
  reviewItems: [
    {
      patientId: 'PT-10211',
      encounterId: 'ENC-883100',
      encounterDate: '2025-12-10',
      processing: 'Done',
      fileName: 'enc_883100_migraine.txt',
      evidenceCount: 4,
      criterionName: 'Migraine frequency ≥ 4 episodes/month',
      assignedTo: ['Nida'],
      comments: [
        { id: 'c1', user: 'Nida', text: 'Evidence clearly shows 6 episodes/month documented across 3 visits.', timestamp: '2025-12-11 09:15' },
      ],
      flagged: false,
      decisionLog: [],
    },
    {
      patientId: 'PT-10211',
      encounterId: 'ENC-883109',
      encounterDate: '2025-12-13',
      processing: 'Done',
      fileName: 'enc_883109_migraine.txt',
      evidenceCount: 3,
      criterionName: 'Migraine frequency ≥ 4 episodes/month',
      assignedTo: ['Nida'],
      comments: [],
      flagged: false,
      decisionLog: [],
    },
    {
      patientId: 'PT-10520',
      encounterId: 'ENC-884500',
      encounterDate: '2025-12-07',
      processing: 'Done',
      fileName: 'enc_884500_alzheimers.txt',
      evidenceCount: 2,
      criterionName: 'MMSE score < 24 (cognitive impairment)',
      assignedTo: ['Anurag'],
      comments: [],
      flagged: false,
      decisionLog: [],
    },
    {
      patientId: 'PT-10520',
      encounterId: 'ENC-884501',
      encounterDate: '2025-12-14',
      processing: 'Done',
      fileName: 'enc_884501_alzheimers.txt',
      evidenceCount: 5,
      criterionName: 'MMSE score < 24 (cognitive impairment)',
      assignedTo: ['Anurag'],
      comments: [
        { id: 'c2', user: 'Anurag', text: 'MMSE dropped from 22 to 19 over 6 months — clear progression.', timestamp: '2025-12-15 14:30' },
      ],
      flagged: true,
      decisionLog: [],
    },
    {
      patientId: 'PT-10602',
      encounterId: 'ENC-885007',
      encounterDate: '2025-12-11',
      processing: 'Done',
      fileName: 'enc_885007_parkinsons.txt',
      evidenceCount: 3,
      criterionName: 'Tremor assessment documented',
      assignedTo: ['Neha'],
      comments: [],
      flagged: false,
      decisionLog: [],
    },
    {
      patientId: 'PT-10602',
      encounterId: 'ENC-885008',
      encounterDate: '2025-12-18',
      processing: 'Processing',
      fileName: 'enc_885008_parkinsons.txt',
      evidenceCount: 0,
      criterionName: 'Tremor assessment documented',
      assignedTo: ['Neha'],
      comments: [],
      flagged: false,
      decisionLog: [],
    },
    {
      patientId: 'PT-10780',
      encounterId: 'ENC-886200',
      encounterDate: '2025-12-09',
      processing: 'Done',
      fileName: 'enc_886200_ms.txt',
      evidenceCount: 6,
      criterionName: 'MS relapse within 12 months',
      assignedTo: ['Sonick'],
      comments: [],
      flagged: false,
      decisionLog: [],
    },
    {
      patientId: 'PT-10780',
      encounterId: 'ENC-886201',
      encounterDate: '2025-12-20',
      processing: 'Failed',
      fileName: 'enc_886201_ms.txt',
      evidenceCount: 0,
      criterionName: 'MS relapse within 12 months',
      assignedTo: [],
      comments: [],
      flagged: false,
      decisionLog: [],
    },
    {
      patientId: 'PT-10899',
      encounterId: 'ENC-887300',
      encounterDate: '2025-12-15',
      processing: 'Done',
      fileName: 'enc_887300_epilepsy.txt',
      evidenceCount: 4,
      criterionName: 'No prior brain surgery',
      assignedTo: [],
      comments: [],
      flagged: false,
      decisionLog: [],
    },
    {
      patientId: 'PT-10899',
      encounterId: 'ENC-887301',
      encounterDate: '2025-12-22',
      processing: 'Queued',
      fileName: 'enc_887301_epilepsy.txt',
      evidenceCount: 0,
      criterionName: 'No prior brain surgery',
      assignedTo: [],
      comments: [],
      flagged: false,
      decisionLog: [],
    },
  ],
  audit: [
    { id: 'a1', timestamp: '2025-12-20 10:00', user: 'Anurag', action: 'Prompt updated', detail: 'Extraction prompt v3 → v4 for Migraine frequency criterion' },
    { id: 'a2', timestamp: '2025-12-20 10:15', user: 'Nida', action: 'Model changed', detail: 'GPT-4.1 → Claude Sonnet for MMSE criterion' },
    { id: 'a3', timestamp: '2025-12-20 11:30', user: 'Sonick', action: 'Run started', detail: 'RUN-001 started with 50 patient sample for Migraine criterion' },
    { id: 'a4', timestamp: '2025-12-20 14:00', user: 'Neha', action: 'Assignment', detail: 'Assigned PT-10602 to Neha for Parkinson tremor review' },
    { id: 'a5', timestamp: '2025-12-21 09:00', user: 'Anurag', action: 'Decision logged', detail: 'Marked PT-10520/ENC-884500 as True with reason' },
    { id: 'a6', timestamp: '2025-12-21 11:00', user: 'Anurag', action: 'Export', detail: 'Exported review_batch_01.csv (True decisions)' },
  ],
  logs: [
    { id: 'l1', timestamp: '2025-12-20 10:00', level: 'info', message: 'RUN-001 started: Migraine frequency criterion, 50 patients' },
    { id: 'l2', timestamp: '2025-12-20 10:02', level: 'info', message: 'Schema indexed successfully for migraine_cohort index' },
    { id: 'l3', timestamp: '2025-12-20 10:05', level: 'info', message: 'Extraction completed: 48/50 patients processed' },
    { id: 'l4', timestamp: '2025-12-20 10:05', level: 'warn', message: '2 patients skipped: insufficient encounter data (PT-11023, PT-11045)' },
    { id: 'l5', timestamp: '2025-12-20 14:00', level: 'info', message: 'Patient assignment event: PT-10602 → Neha' },
    { id: 'l6', timestamp: '2025-12-21 09:00', level: 'info', message: 'Decision recorded: PT-10520/ENC-884500 marked True by Anurag' },
    { id: 'l7', timestamp: '2025-12-21 11:00', level: 'error', message: 'ENC-886201 processing failed: source file corrupted or inaccessible' },
    { id: 'l8', timestamp: '2025-12-21 11:30', level: 'info', message: 'RUN-002 started: MMSE criterion, 30 patients, model override active' },
  ],
  notifications: [
    { id: 'n1', timestamp: '5 min ago', title: 'Assignment received', body: 'You have been assigned 2 patients for Migraine frequency review.', read: false },
    { id: 'n2', timestamp: '1h ago', title: 'Processing complete', body: 'RUN-001 finished: 48 of 50 extractions succeeded.', read: false },
    { id: 'n3', timestamp: '3h ago', title: 'Processing failed', body: 'ENC-886201 failed during extraction. Check logs for details.', read: true },
    { id: 'n4', timestamp: '1d ago', title: 'New project created', body: "Alzheimer's Phase III Biomarker Validation project initialized.", read: true },
    { id: 'n5', timestamp: '2d ago', title: 'Review flagged', body: 'Anurag flagged PT-10520/ENC-884501 for adjudication.', read: true },
  ],
};

export async function fetchAppData() {
  await delay(240);
  return structuredClone(db);
}

export async function createProject(project: Project): Promise<Project> {
  await delay(260);
  db.projects.unshift(project);
  db.audit.unshift({
    id: `a-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: 'System',
    action: 'Project created',
    detail: `Project "${project.name}" created`,
  });
  return structuredClone(project);
}

export async function deleteProject(projectId: string): Promise<void> {
  await delay(160);
  const p = db.projects.find((proj) => proj.id === projectId);
  db.projects = db.projects.filter((proj) => proj.id !== projectId);
  db.audit.unshift({
    id: `a-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: 'System',
    action: 'Project deleted',
    detail: `Project "${p?.name ?? projectId}" deleted`,
  });
}

export async function duplicateProject(projectId: string): Promise<Project | null> {
  await delay(200);
  const orig = db.projects.find((p) => p.id === projectId);
  if (!orig) return null;
  const dup: Project = {
    ...structuredClone(orig),
    id: `prj-${Math.random().toString(36).slice(2, 8)}`,
    name: `${orig.name} (Copy)`,
    lastUpdated: 'Now',
    stageProgress: 0,
    currentStage: 1,
  };
  db.projects.unshift(dup);
  return dup;
}

export async function assignPatients(payload: {
  patientIds: string[];
  assignees: string[];
}): Promise<void> {
  await delay(340);
  db.reviewItems = db.reviewItems.map((item) =>
    payload.patientIds.includes(item.patientId)
      ? { ...item, assignedTo: payload.assignees }
      : item,
  );
  db.audit.unshift({
    id: `a-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: 'System',
    action: 'Patients assigned',
    detail: `${payload.patientIds.length} patients assigned to ${payload.assignees.join(', ')}`,
  });
}

export async function updateDecision(payload: {
  encounterId: string;
  decision: 'True' | 'False' | 'Unclear';
  reviewedBy: string;
  reason: string;
  comment?: string;
}): Promise<void> {
  await delay(200);
  db.reviewItems = db.reviewItems.map((item) =>
    item.encounterId === payload.encounterId
      ? {
          ...item,
          decision: payload.decision,
          reviewedBy: payload.reviewedBy,
          reason: payload.reason,
          comments: payload.comment
            ? [
                ...(item.comments ?? []),
                {
                  id: `c-${Date.now()}`,
                  user: payload.reviewedBy,
                  text: payload.comment,
                  timestamp: new Date().toLocaleString(),
                },
              ]
            : item.comments,
          decisionLog: [
            ...(item.decisionLog ?? []),
            {
              decision: payload.decision,
              user: payload.reviewedBy,
              timestamp: new Date().toLocaleString(),
              reason: payload.reason,
            },
          ],
        }
      : item,
  );
}

export async function updateComment(payload: {
  encounterId: string;
  commentId: string;
  newText: string;
}): Promise<void> {
  await delay(150);
  db.reviewItems = db.reviewItems.map((item) =>
    item.encounterId === payload.encounterId
      ? {
          ...item,
          comments: (item.comments ?? []).map((c) =>
            c.id === payload.commentId ? { ...c, text: payload.newText } : c,
          ),
        }
      : item,
  );
}

export async function toggleFlag(encounterId: string): Promise<void> {
  await delay(100);
  db.reviewItems = db.reviewItems.map((item) =>
    item.encounterId === encounterId ? { ...item, flagged: !item.flagged } : item,
  );
}
