export type Theme = 'light' | 'dark';
export type Role = 'Admin' | 'Reviewer';
export type Status = 'Queued' | 'Processing' | 'Done' | 'Failed';

export type ProjectType = 'RWE' | 'RWD';

export type Project = {
  id: string;
  name: string;
  types: ProjectType[];
  lead: string;
  dataSource: string;
  patientCount: number;
  lastUpdated: string;
  shared: boolean;
  status?: 'Active' | 'Archived';
  stageProgress: number;
  currentStage: number;
  totalStages: number;
  teamAvatars: string[];
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
  patientId: string;
  encounterId: string;
  encounterDate: string;
  processing: Status;
  fileName: string;
  evidenceCount: number;
  criterionName: string;
  decision?: 'True' | 'False' | 'Unclear';
  reviewedBy?: string;
  reason?: string;
  comments?: { id: string; user: string; text: string; timestamp: string }[];
  assignedTo?: string[];
  flagged?: boolean;
  decisionLog?: { decision: string; user: string; timestamp: string; reason: string }[];
};
