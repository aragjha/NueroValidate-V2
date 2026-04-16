/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  addReviewItems as apiAddReviewItems,
  assignPatients,
  createClient as apiCreateClient,
  createCohortImport as apiCreateCohortImport,
  createProject,
  createWorkflow as apiCreateWorkflow,
  createWorkflowRun as apiCreateWorkflowRun,
  deleteProject,
  deleteWorkflow as apiDeleteWorkflow,
  duplicateProject,
  fetchAppData,
  linkCohortToProject as apiLinkCohortToProject,
  toggleFlag,
  updateCohortPatientEligibility as apiUpdateCohortPatientEligibility,
  updateCohortPatientFlag as apiUpdateCohortPatientFlag,
  updateComment,
  updateDecision,
  updateWorkflow as apiUpdateWorkflow,
} from '@/mock/neuroApi';
import type { AuditEntry, Client, CohortImport, Criterion, CustomAgent, LogEntry, Notification, Project, ReviewItem, Role, RunConfig, Theme, Workflow, WorkflowRun } from '@/types';

type AppContextValue = {
  loading: boolean;
  theme: Theme;
  role: Role;
  currentUser: string;
  users: string[];
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
  customAgents: CustomAgent[];
  cohortImports: CohortImport[];
  setTheme: (theme: Theme) => void;
  setRole: (role: Role) => void;
  setCurrentUser: (user: string) => void;
  addClient: (client: Client) => Promise<void>;
  addProject: (project: Project) => Promise<void>;
  removeProject: (projectId: string) => Promise<void>;
  dupProject: (projectId: string) => Promise<void>;
  saveAssignment: (patientIds: string[], assignees: string[]) => Promise<void>;
  saveDecision: (payload: {
    encounterId: string;
    decision: 'True' | 'False' | 'Unclear';
    reason: string;
    comment?: string;
  }) => Promise<void>;
  editComment: (encounterId: string, commentId: string, newText: string) => Promise<void>;
  toggleItemFlag: (encounterId: string) => Promise<void>;
  markNotifRead: (id: string) => void;
  addWorkflow: (workflow: Workflow) => Promise<void>;
  removeWorkflow: (workflowId: string) => Promise<void>;
  updateWorkflow: (workflow: Workflow) => Promise<void>;
  addWorkflowRun: (run: WorkflowRun) => Promise<void>;
  addCustomAgent: (agent: CustomAgent) => void;
  removeCustomAgent: (agentId: string) => void;
  addReviewItems: (items: ReviewItem[]) => Promise<void>;
  addCohortImport: (cohort: CohortImport) => Promise<void>;
  linkCohortToProject: (cohortId: string, projectId: string) => Promise<void>;
  updatePatientFlag: (cohortId: string, patientId: string, criterionId: string, override: boolean, reason: string) => Promise<void>;
  updatePatientEligibility: (cohortId: string, patientId: string, eligible: boolean, notes?: string) => Promise<void>;
  addRun: (run: RunConfig) => void;
  refresh: () => Promise<void>;
};

const users = ['Anurag', 'Nida', 'Neha', 'Sonick'];

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>('light');
  const [role, setRole] = useState<Role>('Admin');
  const [currentUser, setCurrentUser] = useState('Anurag');
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [runs, setRuns] = useState<RunConfig[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [workflowRuns, setWorkflowRuns] = useState<WorkflowRun[]>([]);
  const [customAgents, setCustomAgents] = useState<CustomAgent[]>([]);
  const [cohortImports, setCohortImports] = useState<CohortImport[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await fetchAppData();
    setClients(data.clients);
    setProjects(data.projects);
    setReviewItems(data.reviewItems);
    setCriteria(data.criteria);
    setRuns(data.runs);
    setAudit(data.audit);
    setLogs(data.logs);
    setNotifications(data.notifications);
    setWorkflows(data.workflows);
    setWorkflowRuns(data.workflowRuns);
    setCohortImports(data.cohortImports);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  useEffect(() => { document.body.setAttribute('data-theme', theme); }, [theme]);

  const addClient = useCallback(async (client: Client) => {
    await apiCreateClient(client);
    setClients((prev) => [client, ...prev]);
  }, []);

  const addProject = useCallback(async (project: Project) => {
    await createProject(project);
    setProjects((prev) => [project, ...prev]);
  }, []);

  const removeProject = useCallback(async (projectId: string) => {
    await deleteProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }, []);

  const dupProject = useCallback(async (projectId: string) => {
    const dup = await duplicateProject(projectId);
    if (dup) setProjects((prev) => [dup, ...prev]);
  }, []);

  const saveAssignment = useCallback(async (patientIds: string[], assignees: string[]) => {
    await assignPatients({ patientIds, assignees });
    setReviewItems((prev) => prev.map((item) => patientIds.includes(item.patientId) ? { ...item, assignedTo: assignees } : item));
  }, []);

  const saveDecision = useCallback(async (payload: { encounterId: string; decision: 'True' | 'False' | 'Unclear'; reason: string; comment?: string }) => {
    await updateDecision({ ...payload, reviewedBy: currentUser });
    setReviewItems((prev) => prev.map((item) =>
      item.encounterId === payload.encounterId
        ? { ...item, decision: payload.decision, reviewedBy: currentUser, reason: payload.reason, comments: payload.comment ? [...(item.comments ?? []), { id: `c-${Date.now()}`, user: currentUser, text: payload.comment, timestamp: new Date().toLocaleString() }] : item.comments, decisionLog: [...(item.decisionLog ?? []), { decision: payload.decision, user: currentUser, timestamp: new Date().toLocaleString(), reason: payload.reason }] }
        : item,
    ));
  }, [currentUser]);

  const editComment = useCallback(async (encounterId: string, commentId: string, newText: string) => {
    await updateComment({ encounterId, commentId, newText });
    setReviewItems((prev) => prev.map((item) => item.encounterId === encounterId ? { ...item, comments: (item.comments ?? []).map((c) => c.id === commentId ? { ...c, text: newText } : c) } : item));
  }, []);

  const toggleItemFlag = useCallback(async (encounterId: string) => {
    await toggleFlag(encounterId);
    setReviewItems((prev) => prev.map((item) => item.encounterId === encounterId ? { ...item, flagged: !item.flagged } : item));
  }, []);

  const markNotifRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const addWorkflow = useCallback(async (workflow: Workflow) => {
    await apiCreateWorkflow(workflow);
    setWorkflows((prev) => [workflow, ...prev]);
  }, []);

  const removeWorkflow = useCallback(async (workflowId: string) => {
    await apiDeleteWorkflow(workflowId);
    setWorkflows((prev) => prev.filter((w) => w.id !== workflowId));
  }, []);

  const updateWorkflow = useCallback(async (workflow: Workflow) => {
    await apiUpdateWorkflow(workflow);
    setWorkflows((prev) => prev.map((w) => w.id === workflow.id ? workflow : w));
  }, []);

  const addWorkflowRun = useCallback(async (run: WorkflowRun) => {
    await apiCreateWorkflowRun(run);
    setWorkflowRuns((prev) => [run, ...prev]);
  }, []);

  const addCustomAgent = useCallback((agent: CustomAgent) => {
    setCustomAgents((prev) => [agent, ...prev]);
  }, []);

  const removeCustomAgent = useCallback((agentId: string) => {
    setCustomAgents((prev) => prev.filter((a) => a.id !== agentId));
  }, []);

  const addReviewItems = useCallback(async (items: ReviewItem[]) => {
    await apiAddReviewItems(items);
    setReviewItems((prev) => [...items, ...prev]);
  }, []);

  const addCohortImport = useCallback(async (cohort: CohortImport) => {
    await apiCreateCohortImport(cohort);
    setCohortImports((prev) => [cohort, ...prev]);
  }, []);

  const linkCohortToProjectFn = useCallback(async (cohortId: string, projectId: string) => {
    await apiLinkCohortToProject(cohortId, projectId);
    setCohortImports((prev) => prev.map((c) => c.id === cohortId ? { ...c, status: 'Linked' as const, linkedProjectId: projectId } : c));
  }, []);

  const updatePatientFlag = useCallback(async (cohortId: string, patientId: string, criterionId: string, override: boolean, reason: string) => {
    await apiUpdateCohortPatientFlag({ cohortId, patientId, criterionId, override, reason, user: currentUser });
    setCohortImports((prev) => prev.map((c) => {
      if (c.id !== cohortId) return c;
      const patients = c.patients.map((p) => {
        if (p.patientId !== patientId) return p;
        const flags = p.flags.map((f) => f.criterionId === criterionId ? { ...f, override, overrideBy: currentUser, overrideReason: reason, overrideAt: new Date().toISOString() } : f);
        const eligible = c.criteria.every((cr) => {
          const flag = flags.find((fl) => fl.criterionId === cr.id);
          const effective = flag?.override !== undefined ? flag.override : flag?.value;
          return cr.type === 'inclusion' ? effective === true : effective === false;
        });
        return { ...p, flags, eligible };
      });
      const eligibleCount = patients.filter((p) => p.eligible).length;
      return { ...c, patients, metadata: { ...c.metadata, eligibleCount, ineligibleCount: patients.length - eligibleCount } };
    }));
  }, [currentUser]);

  const updatePatientEligibility = useCallback(async (cohortId: string, patientId: string, eligible: boolean, notes?: string) => {
    await apiUpdateCohortPatientEligibility({ cohortId, patientId, eligible, user: currentUser, notes });
    setCohortImports((prev) => prev.map((c) => {
      if (c.id !== cohortId) return c;
      return { ...c, patients: c.patients.map((p) => p.patientId === patientId ? { ...p, overrideEligible: eligible, reviewedBy: currentUser, reviewedAt: new Date().toISOString(), notes } : p) };
    }));
  }, [currentUser]);

  const addRun = useCallback((run: RunConfig) => {
    setRuns((prev) => [run, ...prev]);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      loading, theme, role, currentUser, users, clients, projects, reviewItems, criteria, runs, audit, logs, notifications, workflows, workflowRuns, customAgents, cohortImports,
      setTheme, setRole, setCurrentUser, addClient, addProject, removeProject, dupProject, saveAssignment, saveDecision, editComment, toggleItemFlag, markNotifRead, addWorkflow, removeWorkflow, updateWorkflow, addWorkflowRun, addCustomAgent, removeCustomAgent, addReviewItems, addCohortImport, linkCohortToProject: linkCohortToProjectFn, updatePatientFlag, updatePatientEligibility, addRun, refresh,
    }),
    [loading, theme, role, currentUser, clients, projects, reviewItems, criteria, runs, audit, logs, notifications, workflows, workflowRuns, customAgents, cohortImports, addClient, addProject, removeProject, dupProject, saveAssignment, saveDecision, editComment, toggleItemFlag, markNotifRead, addWorkflow, removeWorkflow, updateWorkflow, addWorkflowRun, addCustomAgent, removeCustomAgent, addReviewItems, addCohortImport, linkCohortToProjectFn, updatePatientFlag, updatePatientEligibility, addRun, refresh],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useAppContext must be used inside AppProvider');
  return value;
}
