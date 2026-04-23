export type Theme = 'light' | 'dark';
export type Role = 'Admin' | 'Reviewer';
export type Status = 'Queued' | 'Processing' | 'Done' | 'Failed';

export type ProjectType = 'RWE' | 'RWD' | 'CT';
export type DataType = 'All' | 'Structured' | 'Unstructured';
export type Provider = 'Dent' | 'Arizona' | 'MIND' | 'Raleigh' | 'JWM' | 'FCN' | 'TNG';

export const ALL_PROVIDERS: Provider[] = ['Dent', 'Arizona', 'MIND', 'Raleigh', 'JWM', 'FCN', 'TNG'];

export type Client = {
  id: string;
  name: string;
  logo: string;
  industry: string;
  contactName: string;
  contactEmail: string;
  contractedRevenue: string;
  status: 'Active' | 'Inactive';
  notes: string;
  createdAt: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  clientId: string;
  types: ProjectType[];
  lead: string;
  dataSource: string;
  dataTypes: DataType[];
  providers: Provider[];
  patientCount: number;
  lastUpdated: string;
  shared: boolean;
  status?: 'Active' | 'Archived';
  stageProgress: number;
  currentStage: number;
  totalStages: number;
  teamAvatars: string[];
  criteriaList: string[];
  cohortImportId?: string;
  flowType?: 'rwe' | 'ct';
};

export type CriterionType = 'inclusion' | 'exclusion';

export type Criterion = {
  id: string;
  name: string;
  type: CriterionType;
  description: string;
  extractionPrompt: string;
  extractionValidation: string;
  reasoningPrompt: string;
  reasoningValidation: string;
  model: string;
  keywords: string[];
};

export type CostDistribution = {
  min: number;
  p25: number;
  median: number;
  p75: number;
  max: number;
};

export type RunCostProfile = {
  runId: string;
  criterionId: string;
  criterionText: string;
  fileName: string;
  patientsProcessed: number;
  totalCost: number;
  costPerPatient: CostDistribution;
  extractionCost: number;
  reasoningCost: number;
  modelUsed: string;
  timestamp: string;
  estimationAccuracy?: number; // actual / estimated ratio
};

export type RunConfig = {
  id: string;
  runId: string;
  criterionId: string;
  overrideModels: boolean;
  overridePrompts: boolean;
  overrideKeywords: boolean;
  sampleSize: number;
  patientIds: string;
  reuseSample: boolean;
  fullRun: boolean;
  status: Status;
  extractionCount: number;
  totalCount: number;
  fileName: string;
  costProfile?: RunCostProfile;
  processingMode?: 'fast' | 'batch';
};

export type AuditEntry = {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  detail: string;
};

export type LogEntry = {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
};

export type Notification = {
  id: string;
  timestamp: string;
  title: string;
  body: string;
  read: boolean;
};

export type ReviewItem = {
  projectId?: string;
  patientId: string;
  encounterId: string;
  encounterDate: string;
  processing: Status;
  fileName: string;
  evidenceCount: number;
  criterionName: string;
  llmEligibility?: 'Eligible' | 'Ineligible';
  llmReason?: string;
  evidenceText?: string;
  evidenceSnips?: { text: string; type: 'support' | 'contradict' | 'neutral' }[];
  decision?: 'True' | 'False' | 'Unclear';
  reviewedBy?: string;
  reason?: string;
  comments?: { id: string; user: string; text: string; timestamp: string }[];
  assignedTo?: string[];
  flagged?: boolean;
  decisionLog?: { decision: string; user: string; timestamp: string; reason: string }[];
};

/* ─── Workflow / Agent Types ─── */

export type AgentCategory = 'validation' | 'operational';

export type AgentDef = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: AgentCategory;
  defaultEnabled: boolean;
};

export type WorkflowStatus = 'Draft' | 'Validated' | 'Published' | 'Archived';

export type WorkflowStage = {
  id: string;
  agentId: string;
  label: string;
  config: Record<string, string | number | boolean>;
  order: number;
};

export type Workflow = {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  version: number;
  stages: WorkflowStage[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  runCount: number;
  lastRunAt?: string;
  lastRunStatus?: 'Success' | 'Failed' | 'Partial';
  attachedProjectIds: string[];
  templateId?: string;
};

export type WorkflowRunStatus = 'Queued' | 'Running' | 'Completed' | 'Failed' | 'Cancelled';

export type WorkflowStageResult = {
  stageId: string;
  agentName: string;
  status: 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Skipped';
  startedAt?: string;
  completedAt?: string;
  findings: number;
  issues: number;
  confidence: number;
};

export type WorkflowRunMetrics = {
  precision: number;
  recall: number;
  f1: number;
  evidenceGrounding: number;
  totalFindings: number;
  totalIssues: number;
  avgConfidence: number;
  processingTime: string;
  estimatedCost: string;
};

export type WorkflowRun = {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: WorkflowRunStatus;
  startedAt: string;
  completedAt?: string;
  triggeredBy: string;
  projectId?: string;
  stageResults: WorkflowStageResult[];
  metrics?: WorkflowRunMetrics;
};

export type WorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  agentIds: string[];
  tags: string[];
};

/* ─── Custom Agent Types ─── */

export type CustomAgent = AgentDef & {
  isCustom: true;
  prompt: string;
  validationRules: string;
  inputSpec: string;
  outputSpec: string;
  createdAt: string;
  createdBy: string;
};

/* ─── Agent Run Result (for single/multi agent runner) ─── */

export type AgentRunOutput = {
  agentId: string;
  agentName: string;
  status: 'Pending' | 'Running' | 'Completed' | 'Failed';
  startedAt?: string;
  completedAt?: string;
  findings: AgentFinding[];
  summary: string;
  confidence: number;
  processingTime: string;
  tokenUsage: number;
  cost: string;
};

export type AgentFinding = {
  id: string;
  type: 'issue' | 'pass' | 'warning' | 'info';
  title: string;
  detail: string;
  evidence?: string;
  location?: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: number;
};

/* ─── Clinical Trial Cohort Types ─── */

export type CohortSource = 'NeuroTerminal' | 'CohortBuilder' | 'Manual';

/* ─── NeuroTerminal API Contract (raw JSON from Cohort Builder) ─── */

export type AtomMetadata = {
  concept_label: string;
  operator: string;
  polarity: string;
  primary_category: string;
};

export type CohortAtomResult = {
  atom_id: string;
  parent_criterion_id: string;
  evaluation_scope: string;
  metadata: AtomMetadata;
  patient_count_yes: number;
  patient_count_no: number;
  patient_count_unknown: number;
  patient_list_yes: string[];
  patient_list_no: string[];
  patient_list_unknown: string[];
  patient_list_no_structured: string[];
  patient_list_no_unstructured: string[];
  patient_list_no_unstructured_gcp_path: string[];
  error: string | null;
  keywords?: string[];
};

export type CohortCriterionResult = {
  criterion_id: string;
  atom_ids: string[];
  atoms: CohortAtomResult[];
};

export type CohortScope = {
  S1_diagnosis_or_seed_count: number;
  S2_after_demographics_count: number;
  description: string;
};

/* ─── Display Layer Types (derived from raw JSON for UI rendering) ─── */

export type CriterionAtom = {
  id: string;
  label: string;
  structuredExpression: string;
  dataSource: 'structured' | 'unstructured';
};

export type CohortCriterion = {
  id: string;
  name: string;
  type: CriterionType;
  description: string;
  source?: 'imported' | 'extracted';
  atoms: CriterionAtom[];
  atomLogic: 'AND' | 'OR';
  category: string;
};

export type PatientCriterionFlag = {
  criterionId: string;
  value: boolean;
  override?: boolean;
  overrideBy?: string;
  overrideReason?: string;
  overrideAt?: string;
};

export type CohortEncounter = {
  encounterId: string;
  encounterDate: string;
  criterionId: string;
  evidence: string;
  llmFlag: boolean;
};

export type CohortPatient = {
  patientId: string;
  flags: PatientCriterionFlag[];
  eligible: boolean;
  overrideEligible?: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  encounters?: CohortEncounter[];
};

export type CohortImport = {
  id: string;
  name: string;
  source: CohortSource;
  importedAt: string;
  importedBy: string;
  status: 'Pending' | 'Active' | 'Linked';
  linkedProjectId?: string;
  /* Raw NeuroTerminal JSON (source of truth) */
  cohortScope?: CohortScope;
  criteriaResults?: CohortCriterionResult[];
  /* Display-layer (derived from raw JSON for UI rendering, backward compat) */
  criteria: CohortCriterion[];
  patients: CohortPatient[];
  metadata: {
    totalPatients: number;
    eligibleCount: number;
    ineligibleCount: number;
    trialName?: string;
    trialPhase?: string;
    indication?: string;
  };
};
