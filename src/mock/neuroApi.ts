import type { AuditEntry, Client, CohortImport, Criterion, LogEntry, Notification, Project, ReviewItem, RunConfig, Workflow, WorkflowRun } from '../types';

type AppData = {
  clients: Client[];
  projects: Project[];
  reviewItems: ReviewItem[];
  criteria: Criterion[];
  runs: RunConfig[];
  audit: AuditEntry[];
  logs: LogEntry[];
  notifications: Notification[];
  workflows: Workflow[];
  workflowRuns: WorkflowRun[];
  cohortImports: CohortImport[];
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function generatePatientIds(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}-${(i + 1).toString().padStart(4, '0')}`);
}

function splitPatientList(ids: string[], yesRate: number, unknownRate: number, seed: number) {
  let s = seed;
  const next = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
  const yes: string[] = [], no: string[] = [], unknown: string[] = [];
  for (const id of ids) {
    const r = next();
    if (r < yesRate) yes.push(id);
    else if (r < yesRate + unknownRate) unknown.push(id);
    else no.push(id);
  }
  return { yes, no, unknown };
}

function splitNoList(noIds: string[], unstructuredRate: number, seed: number) {
  let s = seed;
  const next = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
  const structured: string[] = [], unstructured: string[] = [];
  for (const id of noIds) {
    if (next() < unstructuredRate) unstructured.push(id);
    else structured.push(id);
  }
  return { structured, unstructured };
}

function generatePatients(prefix: string, count: number, criteriaIds: string[], eligibilityRate = 0.25) {
  // Seed a simple deterministic sequence so mock data is stable across reloads
  let seed = prefix.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const next = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };
  return Array.from({ length: count }, (_, i) => {
    const id = `${prefix}-${(i + 1).toString().padStart(3, '0')}`;
    const flags = criteriaIds.map(cId => ({
      criterionId: cId,
      value: next() < (cId.includes('EX') ? 0.3 : 0.7),
    }));
    const eligible = flags.every(f => f.value);
    return { patientId: id, flags, eligible };
  });
}

const db: AppData = {
  clients: [
    {
      id: 'cli-01',
      name: 'Biogen',
      logo: 'BG',
      industry: 'Neuroscience Biopharma',
      contactName: 'Dr. Sarah Mitchell',
      contactEmail: 's.mitchell@biogen.com',
      contractedRevenue: '$2.4M',
      status: 'Active',
      notes: 'Focus on Alzheimer\'s and MS therapies. Primary engagement through aducanumab and tofersen programs.',
      createdAt: '2024-06-15',
    },
    {
      id: 'cli-02',
      name: 'Lilly',
      logo: 'LY',
      industry: 'Pharmaceutical',
      contactName: 'Dr. James Chen',
      contactEmail: 'j.chen@lilly.com',
      contractedRevenue: '$1.8M',
      status: 'Active',
      notes: 'Donanemab AD program and migraine portfolio. Expanding to Parkinson\'s biomarker studies.',
      createdAt: '2024-08-20',
    },
    {
      id: 'cli-03',
      name: 'Biohaven',
      logo: 'BH',
      industry: 'Neuroscience Pharma',
      contactName: 'Dr. Maria Lopez',
      contactEmail: 'm.lopez@biohaven.com',
      contractedRevenue: '$950K',
      status: 'Active',
      notes: 'CGRP migraine prophylaxis cohorts. Expanding into rare neurological disorders.',
      createdAt: '2025-01-10',
    },
    {
      id: 'cli-04',
      name: 'Roche',
      logo: 'RO',
      industry: 'Global Pharma',
      contactName: 'Dr. Hans Weber',
      contactEmail: 'h.weber@roche.com',
      contractedRevenue: '$3.1M',
      status: 'Active',
      notes: 'Gantenerumab AD program, MS ocrelizumab studies, SMA gene therapy validation.',
      createdAt: '2024-03-05',
    },
    {
      id: 'cli-05',
      name: 'AbbVie',
      logo: 'AV',
      industry: 'Pharmaceutical',
      contactName: 'Dr. Emily Park',
      contactEmail: 'e.park@abbvie.com',
      contractedRevenue: '$1.2M',
      status: 'Inactive',
      notes: 'Migraine and Parkinson\'s pipeline. Currently in renewal discussions.',
      createdAt: '2024-11-01',
    },
  ],
  projects: [
    {
      id: 'prj-8bylad',
      name: 'Kisunla Discontinuation Cohort',
      description: 'Identify and validate donanemab (Kisunla) discontinuation events from real-world neurology EHR data.',
      clientId: 'cli-02',
      types: ['RWE'],
      lead: 'Anurag',
      dataSource: 'FCN',
      dataTypes: ['All'],
      providers: ['FCN'],
      patientCount: 3850,
      lastUpdated: '1h ago',
      shared: true,
      status: 'Active',
      stageProgress: 60,
      currentStage: 3,
      totalStages: 5,
      teamAvatars: ['AN', 'NI', 'NE', 'SO'],
      criteriaList: ['Kisunla Discontinuation'],
      flowType: 'rwe',
    },
    {
      id: 'prj-01',
      name: 'Migraine Prophylaxis RWE Cohort',
      description: 'Evaluate CGRP inhibitor efficacy in high-frequency episodic migraine patients using real-world evidence.',
      clientId: 'cli-03',
      types: ['RWE'],
      lead: 'Anurag',
      dataSource: 'Epic EHR / S3',
      dataTypes: ['All'],
      providers: ['Dent', 'Arizona', 'MIND'],
      patientCount: 12320,
      lastUpdated: '2h ago',
      shared: true,
      status: 'Active',
      stageProgress: 85,
      currentStage: 4,
      totalStages: 5,
      teamAvatars: ['AN', 'NI'],
      criteriaList: ['Migraine frequency ≥ 4 episodes/month', 'No prior brain surgery'],
    },
    {
      id: 'prj-02',
      name: "Alzheimer's Phase III Biomarker Validation",
      description: 'Validate amyloid PET and CSF biomarker concordance in early-stage AD patients.',
      clientId: 'cli-01',
      types: ['RWE', 'RWD'],
      lead: 'Nida',
      dataSource: 'Veeva Vault',
      dataTypes: ['Structured', 'Unstructured'],
      providers: ['Raleigh', 'JWM'],
      patientCount: 4800,
      lastUpdated: '1d ago',
      shared: true,
      status: 'Active',
      stageProgress: 40,
      currentStage: 2,
      totalStages: 5,
      teamAvatars: ['NI', 'NE'],
      criteriaList: ['MMSE score < 24 (cognitive impairment)'],
    },
    {
      id: 'prj-03',
      name: "Parkinson's Motor Symptom Progression Study",
      description: 'Track motor symptom progression and treatment response in PD patients across multiple providers.',
      clientId: 'cli-02',
      types: ['RWD'],
      lead: 'Neha',
      dataSource: 'Flatiron Health',
      dataTypes: ['Unstructured'],
      providers: ['FCN', 'TNG', 'Dent'],
      patientCount: 7200,
      lastUpdated: '3d ago',
      shared: false,
      status: 'Active',
      stageProgress: 15,
      currentStage: 1,
      totalStages: 5,
      teamAvatars: ['NE', 'SO', 'AN'],
      criteriaList: ['Tremor assessment documented'],
    },
    {
      id: 'prj-04',
      name: 'Multiple Sclerosis Relapse Prevention Cohort',
      description: 'Assess DMT escalation patterns and relapse reduction in RRMS patients from real-world data.',
      clientId: 'cli-04',
      types: ['RWE', 'RWD'],
      lead: 'Sonick',
      dataSource: 'OMOP CDM',
      dataTypes: ['All'],
      providers: ['Arizona', 'MIND', 'Raleigh'],
      patientCount: 9410,
      lastUpdated: '2h ago',
      shared: true,
      status: 'Active',
      stageProgress: 85,
      currentStage: 4,
      totalStages: 5,
      teamAvatars: ['SO', 'AN'],
      criteriaList: ['MS relapse within 12 months'],
    },
    {
      id: 'prj-05',
      name: 'AD Tau PET Imaging Validation',
      description: 'Validate tau PET tracer uptake patterns against clinical cognitive decline measures.',
      clientId: 'cli-01',
      types: ['RWD'],
      lead: 'Anurag',
      dataSource: 'ADNI Repository',
      dataTypes: ['Structured'],
      providers: ['JWM', 'FCN'],
      patientCount: 3200,
      lastUpdated: '2d ago',
      shared: true,
      status: 'Active',
      stageProgress: 60,
      currentStage: 3,
      totalStages: 5,
      teamAvatars: ['AN', 'NI'],
      criteriaList: ['MMSE score < 24 (cognitive impairment)', 'No prior brain surgery'],
    },
    {
      id: 'prj-06',
      name: 'Epilepsy Focal Seizure Frequency Analysis',
      description: 'Analyze seizure frequency patterns and AED response in focal epilepsy cohort.',
      clientId: 'cli-02',
      types: ['RWE'],
      lead: 'Nida',
      dataSource: 'Redshift DW',
      dataTypes: ['All'],
      providers: ['TNG'],
      patientCount: 5100,
      lastUpdated: '2w ago',
      shared: false,
      status: 'Archived',
      stageProgress: 100,
      currentStage: 5,
      totalStages: 5,
      teamAvatars: ['NI'],
      criteriaList: ['No prior brain surgery'],
    },
    {
      id: 'prj-07',
      name: 'AD Phase III Lecanemab CT Screening',
      description: 'Clinical trial cohort validation for Lecanemab Phase III — screening patient eligibility against trial inclusion/exclusion criteria.',
      clientId: 'cli-01',
      types: ['CT'],
      lead: 'Anurag',
      dataSource: 'NeuroTerminal Import',
      dataTypes: ['All'],
      providers: [],
      patientCount: 7,
      lastUpdated: '1h ago',
      shared: true,
      status: 'Active',
      stageProgress: 25,
      currentStage: 1,
      totalStages: 4,
      teamAvatars: ['AN', 'NI'],
      criteriaList: ['Age ≥ 50', 'Amyloid PET Positive', 'No Prior Brain Surgery'],
      flowType: 'ct',
      cohortImportId: 'cohort-01',
    },
    {
      id: 'prj-08',
      name: "Parkinson's Phase II Motor Function CT",
      description: 'CT cohort validation for dopaminergic therapy trial in early PD patients.',
      clientId: 'cli-02',
      types: ['CT'],
      lead: 'Neha',
      dataSource: 'NeuroTerminal Import',
      dataTypes: ['All'],
      providers: [],
      patientCount: 25,
      lastUpdated: '3h ago',
      shared: true,
      status: 'Active',
      stageProgress: 10,
      currentStage: 2,
      totalStages: 3,
      teamAvatars: ['NE', 'AN'],
      criteriaList: ['Age 40-80', 'Hoehn & Yahr 1-3', 'Idiopathic PD'],
      flowType: 'ct',
      cohortImportId: 'cohort-03',
    },
  ],
  criteria: [
    {
      id: 'cri-kisunla', name: 'Kisunla Discontinuation', type: 'inclusion',
      description: 'Patient must have documented discontinuation of donanemab (Kisunla) anti-amyloid therapy with clinical rationale noted.',
      extractionPrompt: 'Extract all mentions of donanemab (Kisunla) discontinuation, cessation, termination, or stopping of anti-amyloid infusion therapy from clinical notes. Include reason for discontinuation (e.g., ARIA, patient preference, insurance, clinical decision), dates of last infusion, and any follow-up treatment plan.',
      extractionValidation: 'Verify extracted events refer specifically to donanemab/Kisunla and not other anti-amyloid therapies (e.g., lecanemab, aducanumab). Confirm discontinuation is definitive, not a temporary hold or dose delay.',
      reasoningPrompt: 'Based on the extracted evidence, determine if the patient has a confirmed discontinuation of donanemab (Kisunla) therapy. Assess whether the discontinuation reason is documented and whether it aligns with known safety signals (e.g., ARIA-E, ARIA-H) or other clinical rationale.',
      reasoningValidation: 'Ensure the reasoning correctly distinguishes between permanent discontinuation and temporary holds. Verify the temporal context (discontinued vs. planned to discontinue) and that the reason is explicitly stated rather than inferred.',
      model: 'GPT-5.4',
      keywords: ['discontinued', 'discontinue', 'donanemab', 'kisunla', 'stopped', 'ceased', 'terminated'],
    },
    {
      id: 'cri-01', name: 'Migraine frequency ≥ 4 episodes/month', type: 'inclusion',
      description: 'Patient must have documented migraine frequency of 4 or more episodes per month over at least 3 months.',
      extractionPrompt: 'Extract all mentions of migraine episode frequency, headache days per month, and migraine attack counts from the clinical notes.',
      extractionValidation: 'Verify the extracted frequency is a numeric value and corresponds to migraine-specific episodes, not general headaches.',
      reasoningPrompt: 'Based on the extracted evidence, determine if the patient meets the threshold of ≥ 4 migraine episodes per month consistently.',
      reasoningValidation: 'Confirm the reasoning accounts for temporal consistency (≥ 3 months) and distinguishes migraine from tension-type headaches.',
      model: 'GPT-5.4',
      keywords: ['migraine', 'headache', 'aura', 'triptan', 'CGRP', 'episodic', 'frequency', 'headache days'],
    },
    {
      id: 'cri-02', name: 'MMSE score < 24 (cognitive impairment)', type: 'inclusion',
      description: 'Patient must have a documented Mini-Mental State Examination score below 24 indicating cognitive impairment.',
      extractionPrompt: 'Extract MMSE scores, cognitive assessment results, and any neuropsychological testing scores from the encounter notes.',
      extractionValidation: 'Validate that extracted scores are from MMSE specifically and not other cognitive scales like MoCA unless converted.',
      reasoningPrompt: 'Determine if the patient has documented cognitive impairment based on MMSE score < 24 at any point during the study period.',
      reasoningValidation: 'Ensure the reasoning differentiates between baseline and follow-up scores and considers confounders like delirium.',
      model: 'GPT-5.4',
      keywords: ['MMSE', 'cognitive', 'dementia', 'memory', 'orientation', 'recall', 'visuospatial'],
    },
    {
      id: 'cri-03', name: 'No prior brain surgery', type: 'exclusion',
      description: 'Exclude patients with any documented history of neurosurgical intervention including craniotomy, DBS implant, or shunt placement.',
      extractionPrompt: 'Extract any mentions of brain surgery, craniotomy, deep brain stimulation, VP shunt, or other neurosurgical procedures.',
      extractionValidation: 'Confirm that surgical references are neurosurgical and not unrelated procedures. Check for negated mentions.',
      reasoningPrompt: 'Determine if the patient has any history of brain surgery that would make them ineligible for the study.',
      reasoningValidation: 'Verify the reasoning correctly handles negation (e.g. "no history of brain surgery") and temporal context.',
      model: 'Claude Sonnet',
      keywords: ['craniotomy', 'brain surgery', 'DBS', 'shunt', 'neurosurgery', 'lobectomy'],
    },
    {
      id: 'cri-04', name: 'Tremor assessment documented', type: 'inclusion',
      description: 'Patient must have at least one documented tremor assessment (UPDRS Part III or equivalent) in the study period.',
      extractionPrompt: 'Extract all tremor assessments, UPDRS scores, motor examination findings related to tremor, and movement disorder evaluations.',
      extractionValidation: 'Ensure extracted data pertains to tremor specifically and includes standardized scoring when available.',
      reasoningPrompt: 'Assess whether a formal tremor evaluation has been documented and whether it meets the study protocol requirements.',
      reasoningValidation: 'Confirm reasoning distinguishes between incidental tremor mentions and formal structured assessments.',
      model: 'GPT-5.4',
      keywords: ['tremor', 'UPDRS', 'resting tremor', 'postural tremor', 'bradykinesia', 'rigidity'],
    },
    {
      id: 'cri-05', name: 'MS relapse within 12 months', type: 'inclusion',
      description: 'Patient must have experienced at least one confirmed MS relapse within the past 12 months of enrollment.',
      extractionPrompt: 'Extract all mentions of MS relapses, exacerbations, flare-ups, new or enlarging T2 lesions, and Gd-enhancing lesions from clinical and radiology notes.',
      extractionValidation: 'Validate that the identified events are true relapses (new neurological symptoms lasting > 24h) and not pseudo-relapses.',
      reasoningPrompt: 'Determine if the patient had a confirmed MS relapse within the 12-month window preceding enrollment date.',
      reasoningValidation: 'Ensure reasoning accounts for the temporal window and distinguishes relapses from progression or pseudo-relapses.',
      model: 'Gemini 2.5 Pro',
      keywords: ['relapse', 'exacerbation', 'T2 lesion', 'Gd-enhancing', 'optic neuritis', 'flare-up', 'DMT'],
    },
  ],
  runs: [
    { id: 'run-cfg-kisunla-01', runId: 'RUN-001', criterionId: 'cri-kisunla', overrideModels: false, overridePrompts: false, overrideKeywords: false, sampleSize: 50, patientIds: '', reuseSample: false, fullRun: false, status: 'Done', extractionCount: 48, totalCount: 50, fileName: 'kisunla_discontinuation_batch_01.csv', costProfile: { runId: 'RUN-001', criterionId: 'cri-kisunla', criterionText: 'Kisunla Discontinuation', fileName: 'kisunla_discontinuation_batch_01.csv', patientsProcessed: 48, totalCost: 6.24, costPerPatient: { min: 0.07, p25: 0.10, median: 0.13, p75: 0.19, max: 0.29 }, extractionCost: 4.16, reasoningCost: 2.08, modelUsed: 'GPT-5.4', timestamp: '2026-04-14T16:45:00Z', estimationAccuracy: 0.98 } },
    { id: 'run-cfg-01', runId: 'RUN-001', criterionId: 'cri-01', overrideModels: false, overridePrompts: false, overrideKeywords: false, sampleSize: 50, patientIds: '', reuseSample: false, fullRun: false, status: 'Done', extractionCount: 48, totalCount: 50, fileName: 'migraine_cohort_batch_01.csv', costProfile: { runId: 'RUN-001', criterionId: 'cri-01', criterionText: 'Migraine frequency ≥ 4 episodes/month', fileName: 'migraine_cohort_batch_01.csv', patientsProcessed: 48, totalCost: 5.76, costPerPatient: { min: 0.06, p25: 0.09, median: 0.12, p75: 0.18, max: 0.31 }, extractionCost: 3.84, reasoningCost: 1.92, modelUsed: 'GPT-5.4', timestamp: '2026-04-05T14:30:00Z', estimationAccuracy: 1.0 } },
    { id: 'run-cfg-02', runId: 'RUN-002', criterionId: 'cri-02', overrideModels: true, overridePrompts: false, overrideKeywords: false, sampleSize: 30, patientIds: '', reuseSample: true, fullRun: false, status: 'Done', extractionCount: 28, totalCount: 30, fileName: 'alzheimers_mmse_batch_02.csv', costProfile: { runId: 'RUN-002', criterionId: 'cri-02', criterionText: 'MMSE score < 24', fileName: 'alzheimers_mmse_batch_02.csv', patientsProcessed: 28, totalCost: 6.16, costPerPatient: { min: 0.10, p25: 0.16, median: 0.22, p75: 0.28, max: 0.38 }, extractionCost: 4.11, reasoningCost: 2.05, modelUsed: 'GPT-5.4', timestamp: '2026-04-06T10:15:00Z', estimationAccuracy: 0.94 } },
    { id: 'run-cfg-03', runId: 'RUN-003', criterionId: 'cri-01', overrideModels: false, overridePrompts: false, overrideKeywords: false, sampleSize: 100, patientIds: '', reuseSample: false, fullRun: false, status: 'Done', extractionCount: 100, totalCount: 100, fileName: 'migraine_cohort_batch_02.csv', costProfile: { runId: 'RUN-003', criterionId: 'cri-01', criterionText: 'Migraine frequency ≥ 4 episodes/month', fileName: 'migraine_cohort_batch_02.csv', patientsProcessed: 100, totalCost: 14.00, costPerPatient: { min: 0.05, p25: 0.10, median: 0.14, p75: 0.20, max: 0.35 }, extractionCost: 9.33, reasoningCost: 4.67, modelUsed: 'GPT-5.4', timestamp: '2026-04-07T09:00:00Z', estimationAccuracy: 0.97 } },
  ],
  reviewItems: [
    /* ─── Kisunla Discontinuation project (prj-8bylad) ─── */
    { projectId: 'prj-8bylad', patientId: 'PT-40112', encounterId: 'ENC-KIS-001', encounterDate: '2025-10-14', processing: 'Done', fileName: 'enc_kis001_discontinuation.txt', evidenceCount: 5, criterionName: 'Kisunla Discontinuation', llmEligibility: 'Eligible', llmReason: 'Patient received donanemab (Kisunla) 700mg IV per ALZH protocol. Discontinued 2025-10-14 due to ARIA-E finding on surveillance MRI. Dr. Patel documented clinical decision to cease therapy. Reason for discontinuation clearly stated.', assignedTo: ['Anurag'], comments: [{ id: 'c-k1', user: 'Nida', text: 'ARIA-E confirmed on imaging — clear discontinuation trigger documented by Dr. Patel.', timestamp: '2025-10-20 11:30' }], flagged: false, decisionLog: [] },
    { projectId: 'prj-8bylad', patientId: 'PT-40112', encounterId: 'ENC-KIS-002', encounterDate: '2025-11-10', processing: 'Done', fileName: 'enc_kis002_followup.txt', evidenceCount: 3, criterionName: 'Kisunla Discontinuation', llmEligibility: 'Eligible', llmReason: 'Follow-up visit confirms discontinuation of Kisunla. MRI shows resolving ARIA-E. Patient stable on donepezil monotherapy. No plan to restart anti-amyloid therapy.', assignedTo: ['Anurag'], comments: [], flagged: false, decisionLog: [] },
    { projectId: 'prj-8bylad', patientId: 'PT-40228', encounterId: 'ENC-KIS-003', encounterDate: '2025-09-22', processing: 'Done', fileName: 'enc_kis003_discontinuation.txt', evidenceCount: 4, criterionName: 'Kisunla Discontinuation', llmEligibility: 'Eligible', llmReason: 'Donanemab therapy stopped after 6 infusions. Patient requested discontinuation due to infusion-related reactions (nausea, headache). No ARIA events. Physician documented patient preference as primary reason for cessation.', assignedTo: ['Nida'], comments: [], flagged: false, decisionLog: [] },
    { projectId: 'prj-8bylad', patientId: 'PT-40335', encounterId: 'ENC-KIS-004', encounterDate: '2025-11-05', processing: 'Done', fileName: 'enc_kis004_insurance.txt', evidenceCount: 2, criterionName: 'Kisunla Discontinuation', llmEligibility: 'Ineligible', llmReason: 'Notes reference "temporary hold on Kisunla pending insurance reauthorization." This is a treatment pause, not a confirmed permanent discontinuation. Patient and physician both intend to resume therapy once coverage is resolved.', assignedTo: ['Neha'], comments: [], flagged: true, decisionLog: [] },
    { projectId: 'prj-8bylad', patientId: 'PT-40441', encounterId: 'ENC-KIS-005', encounterDate: '2025-10-30', processing: 'Done', fileName: 'enc_kis005_aria_h.txt', evidenceCount: 6, criterionName: 'Kisunla Discontinuation', llmEligibility: 'Eligible', llmReason: 'Kisunla terminated after ARIA-H (microhemorrhages) detected on routine MRI surveillance. Neurology note explicitly states "permanent discontinuation of donanemab due to hemorrhagic ARIA." Safety event well documented.', assignedTo: ['Sonick'], comments: [{ id: 'c-k2', user: 'Sonick', text: 'Multiple microhemorrhages on MRI — definitive discontinuation. Clear safety signal.', timestamp: '2025-11-02 09:00' }], flagged: false, decisionLog: [] },
    { projectId: 'prj-8bylad', patientId: 'PT-40441', encounterId: 'ENC-KIS-006', encounterDate: '2025-12-01', processing: 'Processing', fileName: 'enc_kis006_followup.txt', evidenceCount: 0, criterionName: 'Kisunla Discontinuation', assignedTo: ['Sonick'], comments: [], flagged: false, decisionLog: [] },
    { projectId: 'prj-8bylad', patientId: 'PT-40557', encounterId: 'ENC-KIS-007', encounterDate: '2025-11-20', processing: 'Done', fileName: 'enc_kis007_completion.txt', evidenceCount: 4, criterionName: 'Kisunla Discontinuation', llmEligibility: 'Eligible', llmReason: 'Patient completed full donanemab treatment course (18 months, 18 infusions). Therapy ceased per protocol — amyloid plaque clearance achieved on PET. This represents planned protocol completion, not adverse event discontinuation.', assignedTo: [], comments: [], flagged: false, decisionLog: [] },
    { projectId: 'prj-8bylad', patientId: 'PT-40663', encounterId: 'ENC-KIS-008', encounterDate: '2025-12-05', processing: 'Failed', fileName: 'enc_kis008_error.txt', evidenceCount: 0, criterionName: 'Kisunla Discontinuation', assignedTo: [], comments: [], flagged: false, decisionLog: [] },
    /* ─── Existing RWE review items ─── */
    { patientId: 'PT-10211', encounterId: 'ENC-883100', encounterDate: '2025-12-10', processing: 'Done', fileName: 'enc_883100_migraine.txt', evidenceCount: 4, criterionName: 'Migraine frequency ≥ 4 episodes/month', llmEligibility: 'Eligible', llmReason: 'Patient reports 6 migraine episodes per month with aura. Headache diary confirms ≥ 4 episodes/month threshold over 4 consecutive months. CGRP inhibitor prescribed indicating high-frequency pattern.', assignedTo: ['Nida'], comments: [{ id: 'c1', user: 'Nida', text: 'Evidence clearly shows 6 episodes/month documented across 3 visits.', timestamp: '2025-12-11 09:15' }], flagged: false, decisionLog: [] },
    { patientId: 'PT-10211', encounterId: 'ENC-883109', encounterDate: '2025-12-13', processing: 'Done', fileName: 'enc_883109_migraine.txt', evidenceCount: 3, criterionName: 'Migraine frequency ≥ 4 episodes/month', llmEligibility: 'Eligible', llmReason: 'Continuation encounter confirms ongoing migraine pattern. Rescue triptan usage 5-7 times per month further supports high-frequency episodic migraine classification.', assignedTo: ['Nida'], comments: [], flagged: false, decisionLog: [] },
    { patientId: 'PT-10520', encounterId: 'ENC-884500', encounterDate: '2025-12-07', processing: 'Done', fileName: 'enc_884500_alzheimers.txt', evidenceCount: 2, criterionName: 'MMSE score < 24 (cognitive impairment)', llmEligibility: 'Ineligible', llmReason: 'MMSE score at this encounter was 25/30, which does not meet the < 24 threshold for cognitive impairment inclusion.', assignedTo: ['Anurag'], comments: [], flagged: false, decisionLog: [] },
    { patientId: 'PT-10520', encounterId: 'ENC-884501', encounterDate: '2025-12-14', processing: 'Done', fileName: 'enc_884501_alzheimers.txt', evidenceCount: 5, criterionName: 'MMSE score < 24 (cognitive impairment)', llmEligibility: 'Eligible', llmReason: 'MMSE score 19/30, significant decline from prior baseline of 26/30. MoCA 15/30 corroborates cognitive impairment. Meets inclusion criterion.', assignedTo: ['Anurag'], comments: [{ id: 'c2', user: 'Anurag', text: 'MMSE dropped from 22 to 19 over 6 months — clear progression.', timestamp: '2025-12-15 14:30' }], flagged: true, decisionLog: [] },
    { patientId: 'PT-10602', encounterId: 'ENC-885007', encounterDate: '2025-12-11', processing: 'Done', fileName: 'enc_885007_parkinsons.txt', evidenceCount: 3, criterionName: 'Tremor assessment documented', llmEligibility: 'Eligible', llmReason: 'UPDRS Part III motor examination documented with resting tremor score 3/4 in right upper extremity. Formal tremor assessment present.', assignedTo: ['Neha'], comments: [], flagged: false, decisionLog: [] },
    { patientId: 'PT-10602', encounterId: 'ENC-885008', encounterDate: '2025-12-18', processing: 'Processing', fileName: 'enc_885008_parkinsons.txt', evidenceCount: 0, criterionName: 'Tremor assessment documented', assignedTo: ['Neha'], comments: [], flagged: false, decisionLog: [] },
    { patientId: 'PT-10780', encounterId: 'ENC-886200', encounterDate: '2025-12-09', processing: 'Done', fileName: 'enc_886200_ms.txt', evidenceCount: 6, criterionName: 'MS relapse within 12 months', llmEligibility: 'Eligible', llmReason: 'Acute optic neuritis confirmed as MS relapse 3 months ago. New Gd-enhancing lesion on MRI. Two relapses within 8 months. Clearly meets the 12-month relapse criterion.', assignedTo: ['Sonick'], comments: [], flagged: false, decisionLog: [] },
    { patientId: 'PT-10780', encounterId: 'ENC-886201', encounterDate: '2025-12-20', processing: 'Failed', fileName: 'enc_886201_ms.txt', evidenceCount: 0, criterionName: 'MS relapse within 12 months', assignedTo: [], comments: [], flagged: false, decisionLog: [] },
    { patientId: 'PT-10899', encounterId: 'ENC-887300', encounterDate: '2025-12-15', processing: 'Done', fileName: 'enc_887300_epilepsy.txt', evidenceCount: 4, criterionName: 'No prior brain surgery', llmEligibility: 'Eligible', llmReason: 'Surgical history reviewed: appendectomy and knee arthroscopy only. No cranial procedures, craniotomy, or neurostimulation device history documented. Meets exclusion criterion (no prior brain surgery).', assignedTo: [], comments: [], flagged: false, decisionLog: [] },
    { patientId: 'PT-10899', encounterId: 'ENC-887301', encounterDate: '2025-12-22', processing: 'Queued', fileName: 'enc_887301_epilepsy.txt', evidenceCount: 0, criterionName: 'No prior brain surgery', assignedTo: [], comments: [], flagged: false, decisionLog: [] },
    /* ─── CT Project (prj-07) — Imported from NeuroTerminal ─── */
    /* C1: Age ≥ 50 — pre-validated, mostly TRUE */
    { projectId: 'prj-07', patientId: 'CT-1001', encounterId: 'CT-ENC-1001-C1', encounterDate: '2026-03-10', processing: 'Done', fileName: 'ct_1001_demographics.txt', evidenceCount: 1, criterionName: 'Age ≥ 50 years', llmEligibility: 'Eligible', llmReason: 'DOB confirms patient age 67 at screening.', evidenceText: 'Patient demographics: DOB 1958-04-12, current age 67 years. Gender: F. Index date 2026-03-10.', decision: 'True', reviewedBy: 'Anurag', assignedTo: ['Anurag'], comments: [], flagged: false, decisionLog: [{ decision: 'True', user: 'Anurag', timestamp: '2026-04-08 09:15', reason: 'Age confirmed via DOB' }] },
    { projectId: 'prj-07', patientId: 'CT-1002', encounterId: 'CT-ENC-1002-C1', encounterDate: '2026-03-10', processing: 'Done', fileName: 'ct_1002_demographics.txt', evidenceCount: 1, criterionName: 'Age ≥ 50 years', llmEligibility: 'Eligible', llmReason: 'DOB confirms age 71.', evidenceText: 'Patient demographics: DOB 1955-08-22, current age 71 years. Gender: M.', decision: 'True', reviewedBy: 'Anurag', assignedTo: ['Anurag'], comments: [], flagged: false, decisionLog: [{ decision: 'True', user: 'Anurag', timestamp: '2026-04-08 09:18', reason: 'Confirmed' }] },
    { projectId: 'prj-07', patientId: 'CT-1003', encounterId: 'CT-ENC-1003-C1', encounterDate: '2026-03-11', processing: 'Done', fileName: 'ct_1003_demographics.txt', evidenceCount: 1, criterionName: 'Age ≥ 50 years', llmEligibility: 'Ineligible', llmReason: 'Patient age 47, below threshold.', evidenceText: 'Patient demographics: DOB 1979-01-05, current age 47 years. Gender: M.', decision: 'False', reviewedBy: 'Anurag', assignedTo: ['Anurag'], comments: [], flagged: false, decisionLog: [] },
    { projectId: 'prj-07', patientId: 'CT-1004', encounterId: 'CT-ENC-1004-C1', encounterDate: '2026-03-11', processing: 'Done', fileName: 'ct_1004_demographics.txt', evidenceCount: 1, criterionName: 'Age ≥ 50 years', llmEligibility: 'Ineligible', llmReason: 'Patient age 42.', evidenceText: 'Patient demographics: DOB 1984-06-30, current age 42 years.', decision: 'False', reviewedBy: 'Anurag', assignedTo: ['Anurag'], comments: [], flagged: false, decisionLog: [] },
    { projectId: 'prj-07', patientId: 'CT-1006', encounterId: 'CT-ENC-1006-C1', encounterDate: '2026-03-12', processing: 'Done', fileName: 'ct_1006_demographics.txt', evidenceCount: 1, criterionName: 'Age ≥ 50 years', llmEligibility: 'Ineligible', llmReason: 'Age 38.', evidenceText: 'DOB 1988-02-14, age 38 at index.', decision: 'False', reviewedBy: 'Anurag', assignedTo: ['Anurag'], comments: [], flagged: false, decisionLog: [] },
    { projectId: 'prj-07', patientId: 'CT-1007', encounterId: 'CT-ENC-1007-C1', encounterDate: '2026-03-12', processing: 'Done', fileName: 'ct_1007_demographics.txt', evidenceCount: 1, criterionName: 'Age ≥ 50 years', llmEligibility: 'Ineligible', llmReason: 'Age 33.', evidenceText: 'DOB 1993-11-08, age 33 at index.', decision: 'False', reviewedBy: 'Anurag', assignedTo: ['Anurag'], comments: [], flagged: false, decisionLog: [] },
    { projectId: 'prj-07', patientId: 'CT-1008', encounterId: 'CT-ENC-1008-C1', encounterDate: '2026-03-13', processing: 'Done', fileName: 'ct_1008_demographics.txt', evidenceCount: 1, criterionName: 'Age ≥ 50 years', llmEligibility: 'Ineligible', llmReason: 'Age 29.', evidenceText: 'DOB 1997-05-18, age 29 at index.', decision: 'False', reviewedBy: 'Anurag', assignedTo: ['Anurag'], comments: [], flagged: false, decisionLog: [] },

    /* C2: Amyloid PET Positive — partially reviewed (in progress) */
    { projectId: 'prj-07', patientId: 'CT-1001', encounterId: 'CT-ENC-1001-C2a', encounterDate: '2026-02-15', processing: 'Done', fileName: 'ct_1001_pet_scan.txt', evidenceCount: 3, criterionName: 'Amyloid PET Positive', llmEligibility: 'Eligible', llmReason: 'Florbetapir PET scan SUVR 1.42, well above positivity threshold of 1.10. Centiloid score 78.', evidenceText: 'IMAGING REPORT: Florbetapir F-18 PET brain scan performed 2026-02-12. Visual read: POSITIVE for amyloid pathology. SUVR composite: 1.42 (positivity threshold > 1.10). Centiloid score: 78. Distribution: diffuse cortical uptake involving frontal, parietal, and posterior cingulate regions. Impression: Amyloid PET positive, consistent with Alzheimer disease pathology.', decision: 'True', reviewedBy: 'Nida', assignedTo: ['Nida'], comments: [], flagged: false, decisionLog: [] },
    { projectId: 'prj-07', patientId: 'CT-1001', encounterId: 'CT-ENC-1001-C2b', encounterDate: '2026-02-20', processing: 'Done', fileName: 'ct_1001_neuro_visit.txt', evidenceCount: 2, criterionName: 'Amyloid PET Positive', llmEligibility: 'Eligible', llmReason: 'Neurology note references PET scan as positive.', evidenceText: 'NEUROLOGY FOLLOW-UP: Reviewed recent amyloid PET imaging which was positive. SUVR 1.42. Discussed implications with patient including eligibility for anti-amyloid therapy trials. Patient interested in screening for Lecanemab study.', decision: 'True', reviewedBy: 'Nida', assignedTo: ['Nida'], comments: [], flagged: false, decisionLog: [] },
    { projectId: 'prj-07', patientId: 'CT-1002', encounterId: 'CT-ENC-1002-C2', encounterDate: '2026-02-18', processing: 'Done', fileName: 'ct_1002_pet_scan.txt', evidenceCount: 2, criterionName: 'Amyloid PET Positive', llmEligibility: 'Eligible', llmReason: 'PET scan positive. SUVR 1.38, Centiloid 65.', evidenceText: 'IMAGING REPORT: Florbetapir PET scan 2026-02-15. Visual read: POSITIVE. SUVR 1.38. Centiloid 65. Bilateral cortical amyloid deposition consistent with AD pathology.', decision: 'True', reviewedBy: 'Nida', assignedTo: ['Nida'], comments: [], flagged: false, decisionLog: [] },
    { projectId: 'prj-07', patientId: 'CT-1003', encounterId: 'CT-ENC-1003-C2', encounterDate: '2026-02-22', processing: 'Done', fileName: 'ct_1003_pet_scan.txt', evidenceCount: 2, criterionName: 'Amyloid PET Positive', llmEligibility: 'Eligible', llmReason: 'PET positive, SUVR 1.55.', evidenceText: 'IMAGING: Amyloid PET POSITIVE. SUVR 1.55. Centiloid 92. Significant amyloid burden noted in frontal and parietal cortex.', assignedTo: ['Nida'], comments: [], flagged: false, decisionLog: [] },
    { projectId: 'prj-07', patientId: 'CT-1004', encounterId: 'CT-ENC-1004-C2', encounterDate: '2026-02-25', processing: 'Done', fileName: 'ct_1004_pet_scan.txt', evidenceCount: 2, criterionName: 'Amyloid PET Positive', llmEligibility: 'Eligible', llmReason: 'PET positive, mild burden.', evidenceText: 'IMAGING: Amyloid PET POSITIVE. SUVR 1.18 (just above threshold). Centiloid 38. Mild diffuse uptake.', assignedTo: ['Nida'], comments: [], flagged: false, decisionLog: [] },
    { projectId: 'prj-07', patientId: 'CT-1006', encounterId: 'CT-ENC-1006-C2', encounterDate: '2026-03-01', processing: 'Done', fileName: 'ct_1006_pet_scan.txt', evidenceCount: 2, criterionName: 'Amyloid PET Positive', llmEligibility: 'Ineligible', llmReason: 'PET scan negative.', evidenceText: 'IMAGING: Amyloid PET NEGATIVE. SUVR 0.95. Centiloid 12. No significant amyloid deposition.', assignedTo: ['Nida'], comments: [], flagged: false, decisionLog: [] },
    { projectId: 'prj-07', patientId: 'CT-1007', encounterId: 'CT-ENC-1007-C2', encounterDate: '2026-03-03', processing: 'Done', fileName: 'ct_1007_pet_scan.txt', evidenceCount: 2, criterionName: 'Amyloid PET Positive', llmEligibility: 'Ineligible', llmReason: 'PET negative.', evidenceText: 'IMAGING: Amyloid PET NEGATIVE. SUVR 0.88. No amyloid burden.', assignedTo: ['Nida'], comments: [], flagged: false, decisionLog: [] },
    { projectId: 'prj-07', patientId: 'CT-1008', encounterId: 'CT-ENC-1008-C2', encounterDate: '2026-03-05', processing: 'Done', fileName: 'ct_1008_pet_scan.txt', evidenceCount: 2, criterionName: 'Amyloid PET Positive', llmEligibility: 'Ineligible', llmReason: 'PET negative.', evidenceText: 'IMAGING: Amyloid PET NEGATIVE. SUVR 0.92.', assignedTo: ['Nida'], comments: [], flagged: false, decisionLog: [] },

    /* C3: No Prior Brain Surgery (EXCLUSION) — not yet reviewed */
    { projectId: 'prj-07', patientId: 'CT-1001', encounterId: 'CT-ENC-1001-C3', encounterDate: '2026-03-08', processing: 'Done', fileName: 'ct_1001_surgical_history.txt', evidenceCount: 1, criterionName: 'Prior Brain Surgery', llmEligibility: 'Eligible', llmReason: 'No history of neurosurgical procedures documented. Surgical history: appendectomy only.', evidenceText: 'SURGICAL HISTORY REVIEW: 1. Appendectomy 1995. 2. Tonsillectomy 1968. No history of craniotomy, deep brain stimulation, ventriculoperitoneal shunt, or other neurosurgical procedures. Imaging archives show no evidence of prior cranial surgery.', assignedTo: [], comments: [], flagged: false, decisionLog: [] },
    { projectId: 'prj-07', patientId: 'CT-1002', encounterId: 'CT-ENC-1002-C3', encounterDate: '2026-03-09', processing: 'Done', fileName: 'ct_1002_surgical_history.txt', evidenceCount: 1, criterionName: 'Prior Brain Surgery', llmEligibility: 'Ineligible', llmReason: 'History of craniotomy 2018 for meningioma resection.', evidenceText: 'SURGICAL HISTORY: 1. Craniotomy 2018 for resection of left frontal meningioma (WHO Grade I). 2. Cholecystectomy 2010. Patient has prior neurosurgical procedure — review for trial exclusion criteria.', assignedTo: [], comments: [], flagged: false, decisionLog: [] },
    { projectId: 'prj-07', patientId: 'CT-1003', encounterId: 'CT-ENC-1003-C3', encounterDate: '2026-03-09', processing: 'Done', fileName: 'ct_1003_surgical_history.txt', evidenceCount: 1, criterionName: 'Prior Brain Surgery', llmEligibility: 'Ineligible', llmReason: 'DBS implant 2020 for Parkinson disease.', evidenceText: 'SURGICAL HISTORY: Deep brain stimulation (DBS) electrode implantation 2020 for Parkinson disease management. Bilateral subthalamic nucleus targets. Generator replacement 2024.', assignedTo: [], comments: [], flagged: false, decisionLog: [] },
    { projectId: 'prj-07', patientId: 'CT-1004', encounterId: 'CT-ENC-1004-C3', encounterDate: '2026-03-10', processing: 'Done', fileName: 'ct_1004_surgical_history.txt', evidenceCount: 1, criterionName: 'Prior Brain Surgery', llmEligibility: 'Ineligible', llmReason: 'VP shunt placed 2015 for hydrocephalus.', evidenceText: 'SURGICAL HISTORY: Ventriculoperitoneal shunt placement 2015 for normal pressure hydrocephalus. Shunt revision 2019.', assignedTo: [], comments: [], flagged: false, decisionLog: [] },
    { projectId: 'prj-07', patientId: 'CT-1006', encounterId: 'CT-ENC-1006-C3', encounterDate: '2026-03-11', processing: 'Done', fileName: 'ct_1006_surgical_history.txt', evidenceCount: 1, criterionName: 'Prior Brain Surgery', llmEligibility: 'Ineligible', llmReason: 'Craniotomy for tumor resection 2017.', evidenceText: 'SURGICAL HISTORY: Craniotomy 2017 for resection of right temporal lobe glioma. Adjuvant radiation and chemotherapy completed 2018.', assignedTo: [], comments: [], flagged: false, decisionLog: [] },
    { projectId: 'prj-07', patientId: 'CT-1007', encounterId: 'CT-ENC-1007-C3', encounterDate: '2026-03-12', processing: 'Done', fileName: 'ct_1007_surgical_history.txt', evidenceCount: 1, criterionName: 'Prior Brain Surgery', llmEligibility: 'Ineligible', llmReason: 'DBS implant 2021.', evidenceText: 'SURGICAL HISTORY: DBS implantation 2021 bilateral STN for essential tremor.', assignedTo: [], comments: [], flagged: false, decisionLog: [] },
    { projectId: 'prj-07', patientId: 'CT-1008', encounterId: 'CT-ENC-1008-C3', encounterDate: '2026-03-13', processing: 'Done', fileName: 'ct_1008_surgical_history.txt', evidenceCount: 1, criterionName: 'Prior Brain Surgery', llmEligibility: 'Eligible', llmReason: 'No prior cranial procedures. Cleared.', evidenceText: 'SURGICAL HISTORY: 1. Knee arthroscopy 2019. 2. Hernia repair 2010. No history of brain surgery, DBS, shunt, or other neurosurgical interventions.', assignedTo: [], comments: [], flagged: false, decisionLog: [] },

    /* ─── CT Project prj-08 (Parkinson's Phase II) — PD-C1: Age 40-80 (auto-validated) ─── */
    ...(() => {
      // Re-run the same deterministic generator to get consistent flags
      let seed = 'PD'.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
      const next = () => { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; };
      const criteriaIds = ['PD-C1','PD-C2','PD-C3','PD-C4','PD-C5','PD-C6','PD-C7','PD-C8','PD-C9','PD-C10','PD-EX1','PD-EX2'];
      const patients: { id: string; flags: Record<string, boolean> }[] = [];
      for (let i = 0; i < 25; i++) {
        const id = `PD-${(i + 1).toString().padStart(3, '0')}`;
        const flags: Record<string, boolean> = {};
        criteriaIds.forEach(cId => { flags[cId] = next() < (cId.includes('EX') ? 0.3 : 0.7); });
        patients.push({ id, flags });
      }
      const items: ReviewItem[] = [];
      patients.forEach(p => {
        // PD-C1: Age 40-80 (structured, auto-validated)
        const c1Val = p.flags['PD-C1'];
        items.push({
          projectId: 'prj-08', patientId: p.id, encounterId: `PD-ENC-${p.id}-C1`, encounterDate: '2026-04-06',
          processing: 'Done', fileName: `pd_${p.id.toLowerCase()}_demographics.txt`, evidenceCount: 1,
          criterionName: 'Age 40-80 years',
          llmEligibility: c1Val ? 'Eligible' : 'Ineligible',
          llmReason: c1Val ? 'Patient age within 40-80 range confirmed from structured demographics.' : 'Patient age outside 40-80 range.',
          evidenceText: c1Val ? `Structured demographic record: age within eligible range.` : `Structured demographic record: age outside eligible range.`,
          decision: c1Val ? 'True' : 'False', reviewedBy: 'System',
          assignedTo: [], comments: [], flagged: false, decisionLog: [{ decision: c1Val ? 'True' : 'False', user: 'System', timestamp: '2026-04-06 12:00', reason: 'Auto-validated from structured data' }],
        });
        // PD-C2: Hoehn & Yahr 1-3 (structured, auto-validated)
        const c2Val = p.flags['PD-C2'];
        items.push({
          projectId: 'prj-08', patientId: p.id, encounterId: `PD-ENC-${p.id}-C2`, encounterDate: '2026-04-06',
          processing: 'Done', fileName: `pd_${p.id.toLowerCase()}_hoehn_yahr.txt`, evidenceCount: 1,
          criterionName: 'Hoehn & Yahr Stage 1-3',
          llmEligibility: c2Val ? 'Eligible' : 'Ineligible',
          llmReason: c2Val ? 'Hoehn & Yahr stage within 1-3 confirmed from structured assessment.' : 'Hoehn & Yahr stage outside 1-3 range.',
          evidenceText: c2Val ? `Structured motor assessment: H&Y stage within eligible range.` : `Structured motor assessment: H&Y stage outside eligible range.`,
          decision: c2Val ? 'True' : 'False', reviewedBy: 'System',
          assignedTo: [], comments: [], flagged: false, decisionLog: [{ decision: c2Val ? 'True' : 'False', user: 'System', timestamp: '2026-04-06 12:00', reason: 'Auto-validated from structured data' }],
        });
      });
      return items;
    })(),
  ],
  audit: [
    { id: 'a1', timestamp: '2025-12-20 10:00', user: 'Anurag', action: 'Prompt updated', detail: 'Extraction prompt v3 → v4 for Migraine frequency criterion' },
    { id: 'a2', timestamp: '2025-12-20 10:15', user: 'Nida', action: 'Model changed', detail: 'GPT-5.4 → Claude Sonnet for MMSE criterion' },
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
  workflows: [
    {
      id: 'wf-01',
      name: 'Standard Clinical Validation Pipeline',
      description: 'Core 5-stage validation for RWE/RWD studies covering correctness, evidence grounding, negation, eligibility, and completeness checks.',
      status: 'Published',
      version: 3,
      stages: [
        { id: 'stg-01', agentId: 'agent-correctness', label: 'Correctness Check', config: { threshold: 0.85, strictMode: true }, order: 1 },
        { id: 'stg-02', agentId: 'agent-evidence', label: 'Evidence Grounding', config: { minCitations: 2, requireDirectQuote: true }, order: 2 },
        { id: 'stg-03', agentId: 'agent-negation', label: 'Negation Detection', config: { sensitivity: 'high' }, order: 3 },
        { id: 'stg-04', agentId: 'agent-eligibility', label: 'Eligibility Logic', config: { mode: 'strict' }, order: 4 },
        { id: 'stg-05', agentId: 'agent-completeness', label: 'Completeness Audit', config: { requiredCoverage: 0.9 }, order: 5 },
      ],
      createdBy: 'Anurag',
      createdAt: '2026-02-10',
      updatedAt: '2026-03-15',
      tags: ['clinical', 'validation', 'standard'],
      runCount: 14,
      lastRunAt: '2026-03-15 10:30',
      lastRunStatus: 'Success',
      attachedProjectIds: ['prj-01', 'prj-04'],
      templateId: 'tpl-standard',
    },
    {
      id: 'wf-02',
      name: 'Comprehensive Evidence Audit',
      description: 'Deep-dive evidence quality audit with hallucination detection, conflict resolution, and uncertainty flagging for regulatory submissions.',
      status: 'Published',
      version: 2,
      stages: [
        { id: 'stg-06', agentId: 'agent-correctness', label: 'Correctness Check', config: { threshold: 0.95, strictMode: true }, order: 1 },
        { id: 'stg-07', agentId: 'agent-evidence', label: 'Deep Evidence Grounding', config: { minCitations: 3, requireDirectQuote: true }, order: 2 },
        { id: 'stg-08', agentId: 'agent-hallucination', label: 'Hallucination Scan', config: { sensitivity: 'high' }, order: 3 },
        { id: 'stg-09', agentId: 'agent-conflict', label: 'Conflict Detection', config: { crossEncounter: true }, order: 4 },
        { id: 'stg-10', agentId: 'agent-uncertainty', label: 'Uncertainty Flags', config: { hedgeThreshold: 0.3 }, order: 5 },
        { id: 'stg-11', agentId: 'agent-completeness', label: 'Completeness Audit', config: { requiredCoverage: 0.95 }, order: 6 },
      ],
      createdBy: 'Nida',
      createdAt: '2026-02-25',
      updatedAt: '2026-03-12',
      tags: ['audit', 'regulatory', 'thorough'],
      runCount: 6,
      lastRunAt: '2026-03-12 14:20',
      lastRunStatus: 'Success',
      attachedProjectIds: ['prj-02'],
      templateId: 'tpl-evidence-audit',
    },
    {
      id: 'wf-03',
      name: 'Quick Eligibility Screening',
      description: 'Lightweight 3-stage eligibility determination for rapid patient screening.',
      status: 'Draft',
      version: 1,
      stages: [
        { id: 'stg-12', agentId: 'agent-eligibility', label: 'Eligibility Check', config: { mode: 'standard' }, order: 1 },
        { id: 'stg-13', agentId: 'agent-negation', label: 'Negation Filter', config: { sensitivity: 'medium' }, order: 2 },
        { id: 'stg-14', agentId: 'agent-completeness', label: 'Completeness Check', config: { requiredCoverage: 0.7 }, order: 3 },
      ],
      createdBy: 'Neha',
      createdAt: '2026-03-10',
      updatedAt: '2026-03-10',
      tags: ['eligibility', 'quick', 'screening'],
      runCount: 0,
      attachedProjectIds: [],
    },
    {
      id: 'wf-04',
      name: 'Data Integrity Validation',
      description: 'Focused on numerical accuracy, date validation, and unit consistency for structured data QA.',
      status: 'Validated',
      version: 1,
      stages: [
        { id: 'stg-15', agentId: 'agent-date', label: 'Date Validation', config: { format: 'ISO-8601', checkFutureDates: true }, order: 1 },
        { id: 'stg-16', agentId: 'agent-numerical', label: 'Numerical Check', config: { validateRanges: true }, order: 2 },
        { id: 'stg-17', agentId: 'agent-unit', label: 'Unit Consistency', config: { standardize: true }, order: 3 },
        { id: 'stg-18', agentId: 'agent-temporal', label: 'Temporal Logic', config: { validateSequence: true }, order: 4 },
      ],
      createdBy: 'Sonick',
      createdAt: '2026-03-05',
      updatedAt: '2026-03-14',
      tags: ['data-quality', 'structured', 'numerical'],
      runCount: 3,
      lastRunAt: '2026-03-14 09:00',
      lastRunStatus: 'Partial',
      attachedProjectIds: ['prj-05'],
      templateId: 'tpl-data-integrity',
    },
  ],
  workflowRuns: [
    {
      id: 'wr-01', workflowId: 'wf-01', workflowVersion: 3, status: 'Completed', startedAt: '2026-03-15 10:30', completedAt: '2026-03-15 10:48', triggeredBy: 'Anurag', projectId: 'prj-01',
      stageResults: [
        { stageId: 'stg-01', agentName: 'Correctness Agent', status: 'Completed', startedAt: '2026-03-15 10:30', completedAt: '2026-03-15 10:34', findings: 245, issues: 12, confidence: 0.94 },
        { stageId: 'stg-02', agentName: 'Evidence Grounding Agent', status: 'Completed', startedAt: '2026-03-15 10:34', completedAt: '2026-03-15 10:38', findings: 230, issues: 8, confidence: 0.91 },
        { stageId: 'stg-03', agentName: 'Negation Detection Agent', status: 'Completed', startedAt: '2026-03-15 10:38', completedAt: '2026-03-15 10:41', findings: 42, issues: 3, confidence: 0.96 },
        { stageId: 'stg-04', agentName: 'Eligibility Logic Agent', status: 'Completed', startedAt: '2026-03-15 10:41', completedAt: '2026-03-15 10:45', findings: 198, issues: 15, confidence: 0.88 },
        { stageId: 'stg-05', agentName: 'Completeness Agent', status: 'Completed', startedAt: '2026-03-15 10:45', completedAt: '2026-03-15 10:48', findings: 210, issues: 5, confidence: 0.93 },
      ],
      metrics: { precision: 0.92, recall: 0.89, f1: 0.905, evidenceGrounding: 0.91, totalFindings: 925, totalIssues: 43, avgConfidence: 0.924, processingTime: '18m 12s', estimatedCost: '$4.80' },
    },
    {
      id: 'wr-02', workflowId: 'wf-01', workflowVersion: 3, status: 'Completed', startedAt: '2026-03-14 16:00', completedAt: '2026-03-14 16:22', triggeredBy: 'Nida', projectId: 'prj-04',
      stageResults: [
        { stageId: 'stg-01', agentName: 'Correctness Agent', status: 'Completed', startedAt: '2026-03-14 16:00', completedAt: '2026-03-14 16:05', findings: 310, issues: 18, confidence: 0.91 },
        { stageId: 'stg-02', agentName: 'Evidence Grounding Agent', status: 'Completed', startedAt: '2026-03-14 16:05', completedAt: '2026-03-14 16:10', findings: 290, issues: 22, confidence: 0.87 },
        { stageId: 'stg-03', agentName: 'Negation Detection Agent', status: 'Completed', startedAt: '2026-03-14 16:10', completedAt: '2026-03-14 16:13', findings: 55, issues: 7, confidence: 0.93 },
        { stageId: 'stg-04', agentName: 'Eligibility Logic Agent', status: 'Completed', startedAt: '2026-03-14 16:13', completedAt: '2026-03-14 16:18', findings: 280, issues: 24, confidence: 0.85 },
        { stageId: 'stg-05', agentName: 'Completeness Agent', status: 'Completed', startedAt: '2026-03-14 16:18', completedAt: '2026-03-14 16:22', findings: 295, issues: 11, confidence: 0.90 },
      ],
      metrics: { precision: 0.88, recall: 0.86, f1: 0.87, evidenceGrounding: 0.87, totalFindings: 1230, totalIssues: 82, avgConfidence: 0.892, processingTime: '22m 05s', estimatedCost: '$6.20' },
    },
    {
      id: 'wr-03', workflowId: 'wf-02', workflowVersion: 2, status: 'Completed', startedAt: '2026-03-12 14:20', completedAt: '2026-03-12 14:55', triggeredBy: 'Nida', projectId: 'prj-02',
      stageResults: [
        { stageId: 'stg-06', agentName: 'Correctness Agent', status: 'Completed', startedAt: '2026-03-12 14:20', completedAt: '2026-03-12 14:26', findings: 180, issues: 8, confidence: 0.95 },
        { stageId: 'stg-07', agentName: 'Evidence Grounding Agent', status: 'Completed', startedAt: '2026-03-12 14:26', completedAt: '2026-03-12 14:33', findings: 175, issues: 12, confidence: 0.92 },
        { stageId: 'stg-08', agentName: 'Hallucination Detection Agent', status: 'Completed', startedAt: '2026-03-12 14:33', completedAt: '2026-03-12 14:40', findings: 15, issues: 2, confidence: 0.97 },
        { stageId: 'stg-09', agentName: 'Conflict Detection Agent', status: 'Completed', startedAt: '2026-03-12 14:40', completedAt: '2026-03-12 14:46', findings: 8, issues: 4, confidence: 0.89 },
        { stageId: 'stg-10', agentName: 'Uncertainty Detection Agent', status: 'Completed', startedAt: '2026-03-12 14:46', completedAt: '2026-03-12 14:50', findings: 22, issues: 6, confidence: 0.91 },
        { stageId: 'stg-11', agentName: 'Completeness Agent', status: 'Completed', startedAt: '2026-03-12 14:50', completedAt: '2026-03-12 14:55', findings: 170, issues: 3, confidence: 0.94 },
      ],
      metrics: { precision: 0.94, recall: 0.91, f1: 0.925, evidenceGrounding: 0.92, totalFindings: 570, totalIssues: 35, avgConfidence: 0.93, processingTime: '35m 18s', estimatedCost: '$9.40' },
    },
  ],
  cohortImports: [
    {
      id: 'cohort-01',
      name: 'AD Phase III Lecanemab Screening Cohort',
      source: 'NeuroTerminal',
      importedAt: '2026-04-08T14:30:00Z',
      importedBy: 'Anurag',
      status: 'Linked',
      linkedProjectId: 'prj-07',
      criteria: [
        { id: 'C1', name: 'Age ≥ 50 years', type: 'inclusion', description: 'Patient must be 50 years or older at screening date', atoms: [{ id: 'C1-a1', label: 'Age ≥ 50', structuredExpression: 'age >= 50', dataSource: 'structured' }], atomLogic: 'AND', category: 'Demographics' },
        { id: 'C2', name: 'Amyloid PET Positive', type: 'inclusion', description: 'Confirmed amyloid-positive status via PET imaging', atoms: [{ id: 'C2-a1', label: 'Amyloid PET visual read positive', structuredExpression: 'amyloid_pet_visual == positive', dataSource: 'unstructured' }, { id: 'C2-a2', label: 'SUVR > 1.10', structuredExpression: 'amyloid_pet_suvr > 1.10', dataSource: 'structured' }], atomLogic: 'OR', category: 'Imaging' },
        { id: 'C3', name: 'Prior Brain Surgery', type: 'exclusion', description: 'History of any neurosurgical procedure including craniotomy, DBS, or shunt', atoms: [{ id: 'C3-a1', label: 'No craniotomy', structuredExpression: 'craniotomy_hx == false', dataSource: 'unstructured' }, { id: 'C3-a2', label: 'No DBS implant', structuredExpression: 'dbs_hx == false', dataSource: 'unstructured' }, { id: 'C3-a3', label: 'No VP shunt', structuredExpression: 'vp_shunt_hx == false', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Procedures' },
      ],
      patients: generatePatients('CT', 1143, ['C1','C2','C3']),
      metadata: {
        totalPatients: 1143,
        eligibleCount: 274,
        ineligibleCount: 869,
        trialName: 'Lecanemab Phase III CLARITY-AD Extension',
        trialPhase: 'Phase III',
        indication: "Alzheimer's Disease",
      },
      cohortScope: {
        S1_diagnosis_or_seed_count: 4711,
        S2_after_demographics_count: 4710,
        description: 'S2 is the evaluation scope for Phase 3 per-atom lists.',
      },
      criteriaResults: (() => {
        const allPts = generatePatientIds('CT', 1143);
        const a1 = splitPatientList(allPts, 0.85, 0.0, 101);
        const a2 = splitPatientList(allPts, 0.72, 0.0, 202);
        const a3 = splitPatientList(allPts, 0.45, 0.15, 303);
        const a3no = splitNoList(a3.no, 0.6, 304);
        const a4 = splitPatientList(allPts, 0.55, 0.0, 404);
        const a5 = splitPatientList(allPts, 0.80, 0.08, 505);
        const a5no = splitNoList(a5.no, 0.7, 506);
        const a6 = splitPatientList(allPts, 0.75, 0.10, 606);
        const a6no = splitNoList(a6.no, 0.65, 607);
        const a7 = splitPatientList(allPts, 0.90, 0.0, 707);
        const a7no = splitNoList(a7.no, 0.5, 708);
        return [
        {
          criterion_id: 'c_ad_diagnosis',
          atom_ids: ['A1'],
          atoms: [{
            atom_id: 'A1', parent_criterion_id: 'c_ad_diagnosis', evaluation_scope: 'S1',
            metadata: { concept_label: "Alzheimer's disease", operator: 'equals', polarity: 'present', primary_category: 'Diagnosis' },
            patient_count_yes: a1.yes.length, patient_count_no: a1.no.length, patient_count_unknown: a1.unknown.length,
            patient_list_yes: a1.yes, patient_list_no: a1.no, patient_list_unknown: a1.unknown,
            patient_list_no_structured: a1.no, patient_list_no_unstructured: [],
            patient_list_no_unstructured_gcp_path: [], error: null,
          }],
        },
        {
          criterion_id: 'c_age_50',
          atom_ids: ['A2'],
          atoms: [{
            atom_id: 'A2', parent_criterion_id: 'c_age_50', evaluation_scope: 'S2',
            metadata: { concept_label: 'Age ≥ 50 years', operator: '>=', polarity: 'present', primary_category: 'Demographics' },
            patient_count_yes: a2.yes.length, patient_count_no: a2.no.length, patient_count_unknown: 0,
            patient_list_yes: a2.yes, patient_list_no: a2.no, patient_list_unknown: [],
            patient_list_no_structured: a2.no, patient_list_no_unstructured: [],
            patient_list_no_unstructured_gcp_path: [], error: null,
          }],
        },
        {
          criterion_id: 'c_amyloid_pet',
          atom_ids: ['A3', 'A4'],
          atoms: [
            {
              atom_id: 'A3', parent_criterion_id: 'c_amyloid_pet', evaluation_scope: 'S2',
              metadata: { concept_label: 'Amyloid PET visual read positive', operator: 'equals', polarity: 'present', primary_category: 'Imaging' },
              patient_count_yes: a3.yes.length, patient_count_no: a3.no.length, patient_count_unknown: a3.unknown.length,
              patient_list_yes: a3.yes, patient_list_no: a3.no, patient_list_unknown: a3.unknown,
              patient_list_no_structured: a3no.structured, patient_list_no_unstructured: a3no.unstructured,
              patient_list_no_unstructured_gcp_path: a3no.unstructured.map(id => `gs://neuro-evidence/${id}/pet_report.txt`),
              error: null,
            },
            {
              atom_id: 'A4', parent_criterion_id: 'c_amyloid_pet', evaluation_scope: 'S2',
              metadata: { concept_label: 'SUVR > 1.10', operator: '>', polarity: 'present', primary_category: 'Imaging' },
              patient_count_yes: a4.yes.length, patient_count_no: a4.no.length, patient_count_unknown: 0,
              patient_list_yes: a4.yes, patient_list_no: a4.no, patient_list_unknown: [],
              patient_list_no_structured: a4.no, patient_list_no_unstructured: [],
              patient_list_no_unstructured_gcp_path: [], error: null,
            },
          ],
        },
        {
          criterion_id: 'c_brain_surgery',
          atom_ids: ['A5', 'A6', 'A7'],
          atoms: [
            {
              atom_id: 'A5', parent_criterion_id: 'c_brain_surgery', evaluation_scope: 'S2',
              metadata: { concept_label: 'No craniotomy history', operator: 'equals', polarity: 'absent', primary_category: 'Procedures' },
              patient_count_yes: a5.yes.length, patient_count_no: a5.no.length, patient_count_unknown: a5.unknown.length,
              patient_list_yes: a5.yes, patient_list_no: a5.no, patient_list_unknown: a5.unknown,
              patient_list_no_structured: a5no.structured, patient_list_no_unstructured: a5no.unstructured,
              patient_list_no_unstructured_gcp_path: a5no.unstructured.map(id => `gs://neuro-evidence/${id}/surgical_history.txt`),
              error: null,
            },
            {
              atom_id: 'A6', parent_criterion_id: 'c_brain_surgery', evaluation_scope: 'S2',
              metadata: { concept_label: 'No DBS implant', operator: 'equals', polarity: 'absent', primary_category: 'Procedures' },
              patient_count_yes: a6.yes.length, patient_count_no: a6.no.length, patient_count_unknown: a6.unknown.length,
              patient_list_yes: a6.yes, patient_list_no: a6.no, patient_list_unknown: a6.unknown,
              patient_list_no_structured: a6no.structured, patient_list_no_unstructured: a6no.unstructured,
              patient_list_no_unstructured_gcp_path: a6no.unstructured.map(id => `gs://neuro-evidence/${id}/surgical_history.txt`),
              error: null,
            },
            {
              atom_id: 'A7', parent_criterion_id: 'c_brain_surgery', evaluation_scope: 'S2',
              metadata: { concept_label: 'No VP shunt', operator: 'equals', polarity: 'absent', primary_category: 'Procedures' },
              patient_count_yes: a7.yes.length, patient_count_no: a7.no.length, patient_count_unknown: a7.unknown.length,
              patient_list_yes: a7.yes, patient_list_no: a7.no, patient_list_unknown: a7.unknown,
              patient_list_no_structured: a7no.structured, patient_list_no_unstructured: a7no.unstructured,
              patient_list_no_unstructured_gcp_path: a7no.unstructured.map(id => `gs://neuro-evidence/${id}/surgical_history.txt`),
              error: null,
            },
          ],
        },
      ];
      })(),
    },
    {
      id: 'cohort-02',
      name: 'Migraine CGRP Trial Pre-Screen Cohort',
      source: 'CohortBuilder',
      importedAt: '2026-04-07T09:15:00Z',
      importedBy: 'Nida',
      status: 'Active',
      criteria: [
        { id: 'C1', name: 'Age 18-65 years', type: 'inclusion', description: 'Patient age between 18 and 65 at enrollment', atoms: [{ id: 'C1-a1', label: 'Age ≥ 18', structuredExpression: 'age >= 18', dataSource: 'structured' }, { id: 'C1-a2', label: 'Age ≤ 65', structuredExpression: 'age <= 65', dataSource: 'structured' }], atomLogic: 'AND', category: 'Demographics' },
        { id: 'C2', name: 'Migraine ≥ 4 episodes/month', type: 'inclusion', description: 'Documented migraine frequency of 4+ episodes per month for at least 3 months', atoms: [{ id: 'C2-a1', label: 'Migraine frequency ≥ 4/month', structuredExpression: 'migraine_freq >= 4', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Clinical' },
        { id: 'C3', name: 'Prior CGRP therapy', type: 'exclusion', description: 'No prior exposure to any CGRP inhibitor therapy', atoms: [{ id: 'C3-a1', label: 'Prior CGRP exposure', structuredExpression: 'prior_cgrp == true', dataSource: 'structured' }], atomLogic: 'AND', category: 'Medications' },
        { id: 'C4', name: 'Medication overuse headache', type: 'exclusion', description: 'Current or recent medication overuse headache diagnosis', atoms: [{ id: 'C4-a1', label: 'MOH diagnosis', structuredExpression: 'moh_dx == true', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Diagnosis' },
      ],
      patients: generatePatients('MG', 820, ['C1','C2','C3','C4']),
      metadata: {
        totalPatients: 820,
        eligibleCount: 198,
        ineligibleCount: 622,
        trialName: 'CGRP Prophylaxis Efficacy Trial',
        trialPhase: 'Phase II',
        indication: 'Chronic Migraine',
      },
    },
    /* ─── cohort-03: Parkinson's Disease Phase II ─── */
    {
      id: 'cohort-03',
      name: "Parkinson's Disease Phase II Motor Function Cohort",
      source: 'NeuroTerminal',
      importedAt: '2026-04-06T11:00:00Z',
      importedBy: 'Neha',
      status: 'Linked',
      linkedProjectId: 'prj-08',
      criteria: [
        // Demographics
        { id: 'PD-C1', name: 'Age 40-80 years', type: 'inclusion', description: 'Patient age between 40 and 80 at screening', atoms: [{ id: 'PD-C1-a1', label: 'Age ≥ 40', structuredExpression: 'age >= 40', dataSource: 'structured' }, { id: 'PD-C1-a2', label: 'Age ≤ 80', structuredExpression: 'age <= 80', dataSource: 'structured' }], atomLogic: 'AND', category: 'Demographics' },
        { id: 'PD-C2', name: 'Hoehn & Yahr Stage 1-3', type: 'inclusion', description: 'Modified Hoehn & Yahr stage between 1 and 3 inclusive', atoms: [{ id: 'PD-C2-a1', label: 'H&Y 1-3', structuredExpression: 'hoehn_yahr >= 1 AND hoehn_yahr <= 3', dataSource: 'structured' }], atomLogic: 'AND', category: 'Demographics' },
        // Diagnosis
        { id: 'PD-C3', name: 'Idiopathic PD per UK Brain Bank criteria', type: 'inclusion', description: 'Diagnosis of idiopathic Parkinson disease meeting UK Brain Bank criteria', atoms: [{ id: 'PD-C3-a1', label: 'PD diagnosis on record', structuredExpression: 'dx_pd == true', dataSource: 'structured' }, { id: 'PD-C3-a2', label: 'UK Brain Bank criteria reference', structuredExpression: 'uk_brain_bank_ref == true', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Diagnosis' },
        { id: 'PD-C4', name: 'Symptom duration ≥ 1 year', type: 'inclusion', description: 'PD motor symptom duration of at least 1 year prior to screening', atoms: [{ id: 'PD-C4-a1', label: 'Symptom onset ≥ 1yr ago', structuredExpression: 'pd_symptom_duration_months >= 12', dataSource: 'structured' }], atomLogic: 'AND', category: 'Diagnosis' },
        // Labs
        { id: 'PD-C5', name: 'eGFR ≥ 60 mL/min', type: 'inclusion', description: 'Adequate renal function with eGFR at or above 60', atoms: [{ id: 'PD-C5-a1', label: 'eGFR ≥ 60', structuredExpression: 'egfr >= 60', dataSource: 'structured' }], atomLogic: 'AND', category: 'Labs' },
        { id: 'PD-C6', name: 'ALT/AST < 2x ULN', type: 'inclusion', description: 'Hepatic transaminases below twice the upper limit of normal', atoms: [{ id: 'PD-C6-a1', label: 'ALT < 2x ULN', structuredExpression: 'alt < 2 * uln_alt', dataSource: 'structured' }, { id: 'PD-C6-a2', label: 'AST < 2x ULN', structuredExpression: 'ast < 2 * uln_ast', dataSource: 'structured' }], atomLogic: 'AND', category: 'Labs' },
        // Imaging
        { id: 'PD-C7', name: 'DaTscan positive', type: 'inclusion', description: 'DaTscan showing dopaminergic deficit consistent with PD', atoms: [{ id: 'PD-C7-a1', label: 'DaTscan abnormal', structuredExpression: 'datscan_result == abnormal', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Imaging' },
        // Medications
        { id: 'PD-C8', name: 'Stable dopaminergic therapy ≥ 4 weeks', type: 'inclusion', description: 'On stable dose of dopaminergic medication for at least 4 weeks prior to screening', atoms: [{ id: 'PD-C8-a1', label: 'Dopaminergic med on record', structuredExpression: 'dopaminergic_med == true', dataSource: 'structured' }, { id: 'PD-C8-a2', label: 'Stable dose ≥ 4 weeks', structuredExpression: 'dopaminergic_stable_weeks >= 4', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Medications' },
        // Clinical
        { id: 'PD-C9', name: 'UPDRS Part III score 20-45', type: 'inclusion', description: 'Motor examination score between 20 and 45 on MDS-UPDRS Part III', atoms: [{ id: 'PD-C9-a1', label: 'UPDRS III ≥ 20', structuredExpression: 'updrs_iii >= 20', dataSource: 'structured' }, { id: 'PD-C9-a2', label: 'UPDRS III ≤ 45', structuredExpression: 'updrs_iii <= 45', dataSource: 'structured' }], atomLogic: 'AND', category: 'Clinical' },
        { id: 'PD-C10', name: 'MMSE ≥ 24', type: 'inclusion', description: 'Mini-Mental State Examination score of 24 or higher indicating adequate cognition', atoms: [{ id: 'PD-C10-a1', label: 'MMSE ≥ 24', structuredExpression: 'mmse >= 24', dataSource: 'structured' }], atomLogic: 'AND', category: 'Clinical' },
        // Procedures (exclusions)
        { id: 'PD-EX1', name: 'No DBS implant', type: 'exclusion', description: 'Exclude patients with prior deep brain stimulation implant', atoms: [{ id: 'PD-EX1-a1', label: 'No DBS history', structuredExpression: 'dbs_hx == false', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Procedures' },
        { id: 'PD-EX2', name: 'No atypical parkinsonism', type: 'exclusion', description: 'Exclude patients with atypical parkinsonian syndromes (MSA, PSP, CBD)', atoms: [{ id: 'PD-EX2-a1', label: 'No atypical parkinsonism dx', structuredExpression: 'atypical_parkinsonism == false', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Procedures' },
      ],
      patients: generatePatients('PD', 2450, ['PD-C1','PD-C2','PD-C3','PD-C4','PD-C5','PD-C6','PD-C7','PD-C8','PD-C9','PD-C10','PD-EX1','PD-EX2']),
      metadata: {
        totalPatients: 2450,
        eligibleCount: 612,
        ineligibleCount: 1838,
        trialName: "Parkinson's Disease Motor Function Phase II",
        trialPhase: 'Phase II',
        indication: "Parkinson's Disease",
      },
    },
    /* ─── cohort-04: RRMS Phase III ─── */
    {
      id: 'cohort-04',
      name: 'RRMS Phase III Cohort',
      source: 'NeuroTerminal',
      importedAt: '2026-04-05T08:00:00Z',
      importedBy: 'Sonick',
      status: 'Active',
      criteria: [
        // Demographics
        { id: 'MS-C1', name: 'Age 18-55 years', type: 'inclusion', description: 'Patient age between 18 and 55 at screening', atoms: [{ id: 'MS-C1-a1', label: 'Age ≥ 18', structuredExpression: 'age >= 18', dataSource: 'structured' }, { id: 'MS-C1-a2', label: 'Age ≤ 55', structuredExpression: 'age <= 55', dataSource: 'structured' }], atomLogic: 'AND', category: 'Demographics' },
        { id: 'MS-C2', name: 'Informed consent obtained', type: 'inclusion', description: 'Patient has provided written informed consent', atoms: [{ id: 'MS-C2-a1', label: 'Consent on file', structuredExpression: 'informed_consent == true', dataSource: 'structured' }], atomLogic: 'AND', category: 'Demographics' },
        // Diagnosis
        { id: 'MS-C3', name: 'RRMS per McDonald 2017 criteria', type: 'inclusion', description: 'Diagnosis of relapsing-remitting MS per 2017 McDonald criteria', atoms: [{ id: 'MS-C3-a1', label: 'MS diagnosis code', structuredExpression: 'dx_ms_rrms == true', dataSource: 'structured' }, { id: 'MS-C3-a2', label: 'McDonald 2017 criteria met', structuredExpression: 'mcdonald_2017 == true', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Diagnosis' },
        { id: 'MS-C4', name: 'Disease duration ≤ 15 years', type: 'inclusion', description: 'Time since first MS symptom no more than 15 years', atoms: [{ id: 'MS-C4-a1', label: 'Disease duration ≤ 15yr', structuredExpression: 'ms_duration_years <= 15', dataSource: 'structured' }], atomLogic: 'AND', category: 'Diagnosis' },
        { id: 'MS-EX1', name: 'No progressive MS', type: 'exclusion', description: 'Exclude patients with primary or secondary progressive MS', atoms: [{ id: 'MS-EX1-a1', label: 'No PPMS/SPMS diagnosis', structuredExpression: 'progressive_ms == false', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Diagnosis' },
        // Labs
        { id: 'MS-C5', name: 'WBC ≥ 3500/μL', type: 'inclusion', description: 'White blood cell count at or above 3500', atoms: [{ id: 'MS-C5-a1', label: 'WBC ≥ 3500', structuredExpression: 'wbc >= 3500', dataSource: 'structured' }], atomLogic: 'AND', category: 'Labs' },
        { id: 'MS-C6', name: 'Lymphocyte count ≥ 1000/μL', type: 'inclusion', description: 'Absolute lymphocyte count at or above 1000', atoms: [{ id: 'MS-C6-a1', label: 'ALC ≥ 1000', structuredExpression: 'alc >= 1000', dataSource: 'structured' }], atomLogic: 'AND', category: 'Labs' },
        { id: 'MS-C7', name: 'No hepatitis B/C', type: 'inclusion', description: 'Negative hepatitis B and C serology', atoms: [{ id: 'MS-C7-a1', label: 'HBsAg negative', structuredExpression: 'hbsag == negative', dataSource: 'structured' }, { id: 'MS-C7-a2', label: 'HCV Ab negative', structuredExpression: 'hcv_ab == negative', dataSource: 'structured' }], atomLogic: 'AND', category: 'Labs' },
        { id: 'MS-C8', name: 'Negative pregnancy test', type: 'inclusion', description: 'Negative serum pregnancy test at screening (females of childbearing potential)', atoms: [{ id: 'MS-C8-a1', label: 'Pregnancy test negative', structuredExpression: 'pregnancy_test == negative', dataSource: 'structured' }], atomLogic: 'AND', category: 'Labs' },
        // Imaging
        { id: 'MS-C9', name: '≥1 Gd-enhancing lesion OR ≥2 new T2 in 12mo', type: 'inclusion', description: 'At least 1 gadolinium-enhancing lesion on MRI or at least 2 new T2 lesions in past 12 months', atoms: [{ id: 'MS-C9-a1', label: '≥1 Gd+ lesion', structuredExpression: 'gd_enhancing_lesions >= 1', dataSource: 'unstructured' }, { id: 'MS-C9-a2', label: '≥2 new T2 lesions in 12mo', structuredExpression: 'new_t2_lesions_12mo >= 2', dataSource: 'unstructured' }], atomLogic: 'OR', category: 'Imaging' },
        // Clinical
        { id: 'MS-C10', name: 'EDSS 0-5.5', type: 'inclusion', description: 'Expanded Disability Status Scale score between 0 and 5.5', atoms: [{ id: 'MS-C10-a1', label: 'EDSS 0-5.5', structuredExpression: 'edss >= 0 AND edss <= 5.5', dataSource: 'structured' }], atomLogic: 'AND', category: 'Clinical' },
        { id: 'MS-C11', name: '≥1 relapse in 12mo OR ≥2 in 24mo', type: 'inclusion', description: 'At least 1 confirmed relapse in 12 months or 2 in 24 months', atoms: [{ id: 'MS-C11-a1', label: '≥1 relapse in 12mo', structuredExpression: 'relapses_12mo >= 1', dataSource: 'unstructured' }, { id: 'MS-C11-a2', label: '≥2 relapses in 24mo', structuredExpression: 'relapses_24mo >= 2', dataSource: 'unstructured' }], atomLogic: 'OR', category: 'Clinical' },
        // Medications
        { id: 'MS-EX2', name: 'No prior B-cell depleting therapy', type: 'exclusion', description: 'Exclude patients with prior B-cell depleting therapy exposure', atoms: [{ id: 'MS-EX2-a1', label: 'No prior anti-CD20', structuredExpression: 'prior_bcell_depleting == false', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Medications' },
        { id: 'MS-EX3', name: 'No rituximab within 6 months', type: 'exclusion', description: 'No rituximab administration within 6 months of screening', atoms: [{ id: 'MS-EX3-a1', label: 'Rituximab > 6mo ago or never', structuredExpression: 'rituximab_last_months > 6 OR rituximab_last_months == null', dataSource: 'structured' }], atomLogic: 'AND', category: 'Medications' },
        { id: 'MS-EX4', name: 'No natalizumab within 6 months', type: 'exclusion', description: 'No natalizumab administration within 6 months of screening', atoms: [{ id: 'MS-EX4-a1', label: 'Natalizumab > 6mo ago or never', structuredExpression: 'natalizumab_last_months > 6 OR natalizumab_last_months == null', dataSource: 'structured' }], atomLogic: 'AND', category: 'Medications' },
        // Clinical exclusions
        { id: 'MS-EX5', name: 'No relapse within 30 days', type: 'exclusion', description: 'No MS relapse within 30 days of screening visit', atoms: [{ id: 'MS-EX5-a1', label: 'No relapse in 30d', structuredExpression: 'relapse_within_30d == false', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Clinical' },
        { id: 'MS-EX6', name: 'No corticosteroid within 30 days', type: 'exclusion', description: 'No systemic corticosteroid use within 30 days of screening', atoms: [{ id: 'MS-EX6-a1', label: 'No steroids in 30d', structuredExpression: 'corticosteroid_within_30d == false', dataSource: 'structured' }], atomLogic: 'AND', category: 'Clinical' },
      ],
      patients: generatePatients('MS', 3200, ['MS-C1','MS-C2','MS-C3','MS-C4','MS-EX1','MS-C5','MS-C6','MS-C7','MS-C8','MS-C9','MS-C10','MS-C11','MS-EX2','MS-EX3','MS-EX4','MS-EX5','MS-EX6']),
      metadata: {
        totalPatients: 3200,
        eligibleCount: 840,
        ineligibleCount: 2360,
        trialName: 'RRMS Phase III B-cell Modulation Trial',
        trialPhase: 'Phase III',
        indication: 'Relapsing-Remitting Multiple Sclerosis',
      },
    },
    /* ─── cohort-05: ALS Phase II ─── */
    {
      id: 'cohort-05',
      name: 'ALS Phase II Neuroprotection Cohort',
      source: 'NeuroTerminal',
      importedAt: '2026-04-04T16:30:00Z',
      importedBy: 'Anurag',
      status: 'Pending',
      criteria: [
        // Demographics
        { id: 'ALS-C1', name: 'Age 18-75 years', type: 'inclusion', description: 'Patient age between 18 and 75 at screening', atoms: [{ id: 'ALS-C1-a1', label: 'Age ≥ 18', structuredExpression: 'age >= 18', dataSource: 'structured' }, { id: 'ALS-C1-a2', label: 'Age ≤ 75', structuredExpression: 'age <= 75', dataSource: 'structured' }], atomLogic: 'AND', category: 'Demographics' },
        // Diagnosis
        { id: 'ALS-C2', name: 'ALS per revised El Escorial criteria', type: 'inclusion', description: 'Diagnosis of definite or probable ALS per revised El Escorial criteria', atoms: [{ id: 'ALS-C2-a1', label: 'ALS diagnosis code', structuredExpression: 'dx_als == true', dataSource: 'structured' }, { id: 'ALS-C2-a2', label: 'El Escorial criteria met', structuredExpression: 'el_escorial_criteria == true', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Diagnosis' },
        // Labs
        { id: 'ALS-C3', name: 'FVC ≥ 60% predicted', type: 'inclusion', description: 'Forced vital capacity at or above 60% of predicted value', atoms: [{ id: 'ALS-C3-a1', label: 'FVC ≥ 60%', structuredExpression: 'fvc_pct >= 60', dataSource: 'structured' }], atomLogic: 'AND', category: 'Labs' },
        { id: 'ALS-C4', name: 'Hemoglobin ≥ 9 g/dL', type: 'inclusion', description: 'Hemoglobin level at or above 9 g/dL', atoms: [{ id: 'ALS-C4-a1', label: 'Hgb ≥ 9', structuredExpression: 'hgb >= 9', dataSource: 'structured' }], atomLogic: 'AND', category: 'Labs' },
        { id: 'ALS-C5', name: 'Platelet count ≥ 100,000/μL', type: 'inclusion', description: 'Platelet count at or above 100,000', atoms: [{ id: 'ALS-C5-a1', label: 'Plt ≥ 100k', structuredExpression: 'plt >= 100000', dataSource: 'structured' }], atomLogic: 'AND', category: 'Labs' },
        { id: 'ALS-C6', name: 'ANC ≥ 1500/μL', type: 'inclusion', description: 'Absolute neutrophil count at or above 1500', atoms: [{ id: 'ALS-C6-a1', label: 'ANC ≥ 1500', structuredExpression: 'anc >= 1500', dataSource: 'structured' }], atomLogic: 'AND', category: 'Labs' },
        // Clinical
        { id: 'ALS-C7', name: 'ALSFRS-R ≥ 30', type: 'inclusion', description: 'ALS Functional Rating Scale-Revised total score of 30 or higher', atoms: [{ id: 'ALS-C7-a1', label: 'ALSFRS-R ≥ 30', structuredExpression: 'alsfrs_r >= 30', dataSource: 'structured' }], atomLogic: 'AND', category: 'Clinical' },
        { id: 'ALS-C8', name: 'Symptom onset within 24 months', type: 'inclusion', description: 'First ALS symptom onset within 24 months of screening', atoms: [{ id: 'ALS-C8-a1', label: 'Onset ≤ 24mo', structuredExpression: 'als_onset_months <= 24', dataSource: 'structured' }], atomLogic: 'AND', category: 'Clinical' },
        // Exclusions
        { id: 'ALS-EX1', name: 'No tracheostomy', type: 'exclusion', description: 'Exclude patients with tracheostomy or invasive ventilation', atoms: [{ id: 'ALS-EX1-a1', label: 'No tracheostomy', structuredExpression: 'tracheostomy == false', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Procedures' },
        { id: 'ALS-EX2', name: 'No other neurodegenerative disease', type: 'exclusion', description: 'Exclude patients with concurrent neurodegenerative disease (e.g., AD, PD, FTD)', atoms: [{ id: 'ALS-EX2-a1', label: 'No concurrent NDD', structuredExpression: 'other_ndd == false', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Diagnosis' },
      ],
      patients: generatePatients('ALS', 680, ['ALS-C1','ALS-C2','ALS-C3','ALS-C4','ALS-C5','ALS-C6','ALS-C7','ALS-C8','ALS-EX1','ALS-EX2']),
      metadata: {
        totalPatients: 680,
        eligibleCount: 172,
        ineligibleCount: 508,
        trialName: 'ALS Neuroprotection Phase II',
        trialPhase: 'Phase II',
        indication: 'Amyotrophic Lateral Sclerosis',
      },
    },
    /* ─── cohort-06: Essential Tremor Phase III ─── */
    {
      id: 'cohort-06',
      name: 'Essential Tremor Phase III Cohort',
      source: 'CohortBuilder',
      importedAt: '2026-04-03T10:45:00Z',
      importedBy: 'Neha',
      status: 'Active',
      criteria: [
        // Demographics
        { id: 'ET-C1', name: 'Age 22-80 years', type: 'inclusion', description: 'Patient age between 22 and 80 at screening', atoms: [{ id: 'ET-C1-a1', label: 'Age ≥ 22', structuredExpression: 'age >= 22', dataSource: 'structured' }, { id: 'ET-C1-a2', label: 'Age ≤ 80', structuredExpression: 'age <= 80', dataSource: 'structured' }], atomLogic: 'AND', category: 'Demographics' },
        // Diagnosis
        { id: 'ET-C2', name: 'Essential tremor per MDS criteria', type: 'inclusion', description: 'Diagnosis of essential tremor per Movement Disorder Society consensus criteria', atoms: [{ id: 'ET-C2-a1', label: 'ET diagnosis code', structuredExpression: 'dx_et == true', dataSource: 'structured' }, { id: 'ET-C2-a2', label: 'MDS criteria met', structuredExpression: 'mds_et_criteria == true', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Diagnosis' },
        { id: 'ET-C3', name: 'ET duration ≥ 3 years', type: 'inclusion', description: 'Essential tremor symptom duration of at least 3 years', atoms: [{ id: 'ET-C3-a1', label: 'Duration ≥ 3yr', structuredExpression: 'et_duration_years >= 3', dataSource: 'structured' }], atomLogic: 'AND', category: 'Diagnosis' },
        // Clinical
        { id: 'ET-C4', name: 'TRS ≥ 2 upper extremity', type: 'inclusion', description: 'Tremor Rating Scale score of 2 or higher in at least one upper extremity', atoms: [{ id: 'ET-C4-a1', label: 'TRS upper extremity ≥ 2', structuredExpression: 'trs_upper_extremity >= 2', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Clinical' },
        { id: 'ET-C5', name: 'Failed ≥ 1 first-line therapy', type: 'inclusion', description: 'Inadequate response to at least one first-line therapy (propranolol or primidone)', atoms: [{ id: 'ET-C5-a1', label: 'Failed first-line med', structuredExpression: 'failed_first_line_count >= 1', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Clinical' },
        // Medications
        { id: 'ET-C6', name: 'Stable medication dose ≥ 30 days', type: 'inclusion', description: 'If on tremor medication, dose must be stable for at least 30 days', atoms: [{ id: 'ET-C6-a1', label: 'Tremor med on record', structuredExpression: 'tremor_med == true OR tremor_med == null', dataSource: 'structured' }, { id: 'ET-C6-a2', label: 'Stable dose ≥ 30d', structuredExpression: 'tremor_med_stable_days >= 30 OR tremor_med == null', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Medications' },
        // Exclusions
        { id: 'ET-EX1', name: "No Parkinson's disease", type: 'exclusion', description: 'Exclude patients with concurrent Parkinson disease diagnosis', atoms: [{ id: 'ET-EX1-a1', label: 'No PD diagnosis', structuredExpression: 'dx_pd == false', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Diagnosis' },
        { id: 'ET-EX2', name: 'No DBS or thalamotomy', type: 'exclusion', description: 'Exclude patients with prior DBS implant or thalamotomy for tremor', atoms: [{ id: 'ET-EX2-a1', label: 'No DBS/thalamotomy', structuredExpression: 'dbs_or_thalamotomy == false', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Procedures' },
      ],
      patients: generatePatients('ET', 950, ['ET-C1','ET-C2','ET-C3','ET-C4','ET-C5','ET-C6','ET-EX1','ET-EX2']),
      metadata: {
        totalPatients: 950,
        eligibleCount: 241,
        ineligibleCount: 709,
        trialName: 'Essential Tremor Novel Agent Phase III',
        trialPhase: 'Phase III',
        indication: 'Essential Tremor',
      },
    },
    /* ─── cohort-07: Focal Epilepsy Phase II ─── */
    {
      id: 'cohort-07',
      name: 'Focal Epilepsy Phase II Adjunctive Therapy Cohort',
      source: 'NeuroTerminal',
      importedAt: '2026-04-02T14:00:00Z',
      importedBy: 'Nida',
      status: 'Active',
      criteria: [
        // Demographics
        { id: 'EP-C1', name: 'Age 18-65 years', type: 'inclusion', description: 'Patient age between 18 and 65 at screening', atoms: [{ id: 'EP-C1-a1', label: 'Age ≥ 18', structuredExpression: 'age >= 18', dataSource: 'structured' }, { id: 'EP-C1-a2', label: 'Age ≤ 65', structuredExpression: 'age <= 65', dataSource: 'structured' }], atomLogic: 'AND', category: 'Demographics' },
        { id: 'EP-C2', name: 'BMI 18-40 kg/m²', type: 'inclusion', description: 'Body mass index between 18 and 40', atoms: [{ id: 'EP-C2-a1', label: 'BMI ≥ 18', structuredExpression: 'bmi >= 18', dataSource: 'structured' }, { id: 'EP-C2-a2', label: 'BMI ≤ 40', structuredExpression: 'bmi <= 40', dataSource: 'structured' }], atomLogic: 'AND', category: 'Demographics' },
        // Diagnosis
        { id: 'EP-C3', name: 'Focal epilepsy confirmed by EEG', type: 'inclusion', description: 'Diagnosis of focal epilepsy confirmed by EEG findings', atoms: [{ id: 'EP-C3-a1', label: 'Focal epilepsy on EEG', structuredExpression: 'eeg_focal_epilepsy == true', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Diagnosis' },
        { id: 'EP-C4', name: '≥ 4 seizures in 28-day baseline', type: 'inclusion', description: 'At least 4 countable seizures during 28-day prospective baseline period', atoms: [{ id: 'EP-C4-a1', label: '≥ 4 seizures in baseline', structuredExpression: 'baseline_seizure_count >= 4', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Diagnosis' },
        // Labs
        { id: 'EP-C5', name: 'Normal hepatic function (ALT/AST ≤ ULN)', type: 'inclusion', description: 'Hepatic transaminases at or below upper limit of normal', atoms: [{ id: 'EP-C5-a1', label: 'ALT ≤ ULN', structuredExpression: 'alt <= uln_alt', dataSource: 'structured' }, { id: 'EP-C5-a2', label: 'AST ≤ ULN', structuredExpression: 'ast <= uln_ast', dataSource: 'structured' }], atomLogic: 'AND', category: 'Labs' },
        { id: 'EP-C6', name: 'Normal renal function (eGFR ≥ 60)', type: 'inclusion', description: 'Estimated glomerular filtration rate at or above 60 mL/min', atoms: [{ id: 'EP-C6-a1', label: 'eGFR ≥ 60', structuredExpression: 'egfr >= 60', dataSource: 'structured' }], atomLogic: 'AND', category: 'Labs' },
        { id: 'EP-C7', name: 'AED levels within therapeutic range', type: 'inclusion', description: 'Current antiepileptic drug levels within therapeutic range at screening', atoms: [{ id: 'EP-C7-a1', label: 'AED levels in range', structuredExpression: 'aed_levels_in_range == true', dataSource: 'structured' }], atomLogic: 'AND', category: 'Labs' },
        // Imaging
        { id: 'EP-C8', name: 'MRI without progressive lesion', type: 'inclusion', description: 'Brain MRI showing no progressive structural lesion', atoms: [{ id: 'EP-C8-a1', label: 'No progressive lesion on MRI', structuredExpression: 'mri_progressive_lesion == false', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Imaging' },
        // Medications
        { id: 'EP-C9', name: 'Stable AED regimen ≥ 4 weeks', type: 'inclusion', description: 'On stable antiepileptic drug regimen for at least 4 weeks prior to baseline', atoms: [{ id: 'EP-C9-a1', label: 'AED on record', structuredExpression: 'aed_current == true', dataSource: 'structured' }, { id: 'EP-C9-a2', label: 'Stable AED ≥ 4wk', structuredExpression: 'aed_stable_weeks >= 4', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Medications' },
        { id: 'EP-C10', name: 'Max 3 concurrent AEDs', type: 'inclusion', description: 'Currently on no more than 3 concurrent antiepileptic drugs', atoms: [{ id: 'EP-C10-a1', label: 'Concurrent AEDs ≤ 3', structuredExpression: 'concurrent_aed_count <= 3', dataSource: 'structured' }], atomLogic: 'AND', category: 'Medications' },
        // Clinical
        { id: 'EP-C11', name: 'Seizure diary compliance ≥ 80%', type: 'inclusion', description: 'Seizure diary completion rate of 80% or higher during baseline', atoms: [{ id: 'EP-C11-a1', label: 'Diary compliance ≥ 80%', structuredExpression: 'diary_compliance_pct >= 80', dataSource: 'structured' }], atomLogic: 'AND', category: 'Clinical' },
        // Exclusions
        { id: 'EP-EX1', name: 'No status epilepticus in 12 months', type: 'exclusion', description: 'No episode of status epilepticus within 12 months of screening', atoms: [{ id: 'EP-EX1-a1', label: 'No SE in 12mo', structuredExpression: 'status_epilepticus_12mo == false', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Clinical' },
        { id: 'EP-EX2', name: 'No non-epileptic events', type: 'exclusion', description: 'Exclude patients with psychogenic non-epileptic events (PNEE)', atoms: [{ id: 'EP-EX2-a1', label: 'No PNEE', structuredExpression: 'pnee == false', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Diagnosis' },
        { id: 'EP-EX3', name: 'No VNS/RNS device', type: 'exclusion', description: 'Exclude patients with vagus nerve stimulator or responsive neurostimulation device', atoms: [{ id: 'EP-EX3-a1', label: 'No VNS/RNS implant', structuredExpression: 'vns_rns_device == false', dataSource: 'unstructured' }], atomLogic: 'AND', category: 'Procedures' },
        { id: 'EP-EX4', name: 'No vagal nerve/responsive neurostimulator on record', type: 'exclusion', description: 'No neurostimulator device documented in structured records', atoms: [{ id: 'EP-EX4-a1', label: 'No neurostimulator in records', structuredExpression: 'neurostimulator_on_record == false', dataSource: 'structured' }], atomLogic: 'AND', category: 'Procedures' },
      ],
      patients: generatePatients('EP', 1800, ['EP-C1','EP-C2','EP-C3','EP-C4','EP-C5','EP-C6','EP-C7','EP-C8','EP-C9','EP-C10','EP-C11','EP-EX1','EP-EX2','EP-EX3','EP-EX4']),
      metadata: {
        totalPatients: 1800,
        eligibleCount: 456,
        ineligibleCount: 1344,
        trialName: 'Focal Epilepsy Adjunctive Therapy Phase II',
        trialPhase: 'Phase II',
        indication: 'Focal Epilepsy',
      },
    },
  ],
};

export async function fetchAppData() {
  await delay(240);
  return structuredClone(db);
}

export async function createClient(client: Client): Promise<Client> {
  await delay(200);
  db.clients.unshift(client);
  return structuredClone(client);
}

export async function createProject(project: Project): Promise<Project> {
  await delay(260);
  db.projects.unshift(project);
  db.audit.unshift({ id: `a-${Date.now()}`, timestamp: new Date().toISOString(), user: 'System', action: 'Project created', detail: `Project "${project.name}" created` });
  return structuredClone(project);
}

export async function deleteProject(projectId: string): Promise<void> {
  await delay(160);
  const p = db.projects.find((proj) => proj.id === projectId);
  db.projects = db.projects.filter((proj) => proj.id !== projectId);
  db.audit.unshift({ id: `a-${Date.now()}`, timestamp: new Date().toISOString(), user: 'System', action: 'Project deleted', detail: `Project "${p?.name ?? projectId}" deleted` });
}

export async function duplicateProject(projectId: string): Promise<Project | null> {
  await delay(200);
  const orig = db.projects.find((p) => p.id === projectId);
  if (!orig) return null;
  const dup: Project = { ...structuredClone(orig), id: `prj-${Math.random().toString(36).slice(2, 8)}`, name: `${orig.name} (Copy)`, lastUpdated: 'Now', stageProgress: 0, currentStage: 1 };
  db.projects.unshift(dup);
  return dup;
}

export async function assignPatients(payload: { patientIds: string[]; assignees: string[] }): Promise<void> {
  await delay(340);
  db.reviewItems = db.reviewItems.map((item) => payload.patientIds.includes(item.patientId) ? { ...item, assignedTo: payload.assignees } : item);
  db.audit.unshift({ id: `a-${Date.now()}`, timestamp: new Date().toISOString(), user: 'System', action: 'Patients assigned', detail: `${payload.patientIds.length} patients assigned to ${payload.assignees.join(', ')}` });
}

export async function updateDecision(payload: { encounterId: string; decision: 'True' | 'False' | 'Unclear'; reviewedBy: string; reason: string; comment?: string }): Promise<void> {
  await delay(200);
  db.reviewItems = db.reviewItems.map((item) =>
    item.encounterId === payload.encounterId
      ? { ...item, decision: payload.decision, reviewedBy: payload.reviewedBy, reason: payload.reason, comments: payload.comment ? [...(item.comments ?? []), { id: `c-${Date.now()}`, user: payload.reviewedBy, text: payload.comment, timestamp: new Date().toLocaleString() }] : item.comments, decisionLog: [...(item.decisionLog ?? []), { decision: payload.decision, user: payload.reviewedBy, timestamp: new Date().toLocaleString(), reason: payload.reason }] }
      : item,
  );
}

export async function updateComment(payload: { encounterId: string; commentId: string; newText: string }): Promise<void> {
  await delay(150);
  db.reviewItems = db.reviewItems.map((item) => item.encounterId === payload.encounterId ? { ...item, comments: (item.comments ?? []).map((c) => c.id === payload.commentId ? { ...c, text: payload.newText } : c) } : item);
}

export async function toggleFlag(encounterId: string): Promise<void> {
  await delay(100);
  db.reviewItems = db.reviewItems.map((item) => item.encounterId === encounterId ? { ...item, flagged: !item.flagged } : item);
}

/* ─── Workflow API ─── */

export async function createWorkflow(workflow: Workflow): Promise<Workflow> {
  await delay(260);
  db.workflows.unshift(workflow);
  db.audit.unshift({ id: `a-${Date.now()}`, timestamp: new Date().toISOString(), user: 'System', action: 'Workflow created', detail: `Workflow "${workflow.name}" created` });
  return structuredClone(workflow);
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  await delay(160);
  const w = db.workflows.find((wf) => wf.id === workflowId);
  db.workflows = db.workflows.filter((wf) => wf.id !== workflowId);
  db.audit.unshift({ id: `a-${Date.now()}`, timestamp: new Date().toISOString(), user: 'System', action: 'Workflow deleted', detail: `Workflow "${w?.name ?? workflowId}" deleted` });
}

export async function updateWorkflow(workflow: Workflow): Promise<Workflow> {
  await delay(200);
  db.workflows = db.workflows.map((w) => w.id === workflow.id ? workflow : w);
  return structuredClone(workflow);
}

export async function createWorkflowRun(run: WorkflowRun): Promise<WorkflowRun> {
  await delay(200);
  db.workflowRuns.unshift(run);
  return structuredClone(run);
}

/* ─── Cohort Import API ─── */

export async function createCohortImport(cohort: CohortImport): Promise<CohortImport> {
  await delay(260);
  db.cohortImports.unshift(cohort);
  db.audit.unshift({ id: `a-${Date.now()}`, timestamp: new Date().toISOString(), user: cohort.importedBy, action: 'Cohort imported', detail: `Cohort "${cohort.name}" imported from ${cohort.source}` });
  return structuredClone(cohort);
}

export async function linkCohortToProject(cohortId: string, projectId: string): Promise<void> {
  await delay(150);
  db.cohortImports = db.cohortImports.map((c) => c.id === cohortId ? { ...c, status: 'Linked' as const, linkedProjectId: projectId } : c);
}

export async function updateCohortPatientFlag(payload: { cohortId: string; patientId: string; criterionId: string; override: boolean; reason: string; user: string }): Promise<void> {
  await delay(200);
  db.cohortImports = db.cohortImports.map((c) => {
    if (c.id !== payload.cohortId) return c;
    const patients = c.patients.map((p) => {
      if (p.patientId !== payload.patientId) return p;
      const flags = p.flags.map((f) => f.criterionId === payload.criterionId ? { ...f, override: payload.override, overrideBy: payload.user, overrideReason: payload.reason, overrideAt: new Date().toISOString() } : f);
      const effectiveFlags = flags.map((f) => ({ ...f, effective: f.override !== undefined ? f.override : f.value }));
      const eligible = c.criteria.every((cr) => {
        const flag = effectiveFlags.find((ef) => ef.criterionId === cr.id);
        return cr.type === 'inclusion' ? flag?.effective === true : flag?.effective === false;
      });
      return { ...p, flags, eligible };
    });
    const eligibleCount = patients.filter((p) => p.eligible).length;
    return { ...c, patients, metadata: { ...c.metadata, eligibleCount, ineligibleCount: patients.length - eligibleCount } };
  });
  db.audit.unshift({ id: `a-${Date.now()}`, timestamp: new Date().toISOString(), user: payload.user, action: 'Cohort flag override', detail: `Override ${payload.criterionId} for ${payload.patientId} → ${payload.override}` });
}

export async function addReviewItems(items: ReviewItem[]): Promise<void> {
  await delay(150);
  db.reviewItems = [...items, ...db.reviewItems];
}

export async function updateCohortPatientEligibility(payload: { cohortId: string; patientId: string; eligible: boolean; user: string; notes?: string }): Promise<void> {
  await delay(200);
  db.cohortImports = db.cohortImports.map((c) => {
    if (c.id !== payload.cohortId) return c;
    const patients = c.patients.map((p) => p.patientId === payload.patientId ? { ...p, overrideEligible: payload.eligible, reviewedBy: payload.user, reviewedAt: new Date().toISOString(), notes: payload.notes } : p);
    return { ...c, patients };
  });
  db.audit.unshift({ id: `a-${Date.now()}`, timestamp: new Date().toISOString(), user: payload.user, action: 'Eligibility override', detail: `${payload.patientId} eligibility set to ${payload.eligible}` });
}
