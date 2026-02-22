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
  assignPatients,
  createProject,
  deleteProject,
  duplicateProject,
  fetchAppData,
  toggleFlag,
  updateComment,
  updateDecision,
} from '@/mock/neuroApi';
import type { AuditEntry, Criterion, LogEntry, Notification, Project, ReviewItem, Role, RunConfig, Theme } from '@/types';

type AppContextValue = {
  loading: boolean;
  theme: Theme;
  role: Role;
  currentUser: string;
  users: string[];
  projects: Project[];
  reviewItems: ReviewItem[];
  criteria: Criterion[];
  runs: RunConfig[];
  audit: AuditEntry[];
  logs: LogEntry[];
  notifications: Notification[];
  setTheme: (theme: Theme) => void;
  setRole: (role: Role) => void;
  setCurrentUser: (user: string) => void;
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
  refresh: () => Promise<void>;
};

const users = ['Anurag', 'Nida', 'Neha', 'Sonick'];

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>('light');
  const [role, setRole] = useState<Role>('Admin');
  const [currentUser, setCurrentUser] = useState('Anurag');
  const [projects, setProjects] = useState<Project[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [runs, setRuns] = useState<RunConfig[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await fetchAppData();
    setProjects(data.projects);
    setReviewItems(data.reviewItems);
    setCriteria(data.criteria);
    setRuns(data.runs);
    setAudit(data.audit);
    setLogs(data.logs);
    setNotifications(data.notifications);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

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

  const saveAssignment = useCallback(
    async (patientIds: string[], assignees: string[]) => {
      await assignPatients({ patientIds, assignees });
      setReviewItems((prev) =>
        prev.map((item) =>
          patientIds.includes(item.patientId) ? { ...item, assignedTo: assignees } : item,
        ),
      );
    },
    [],
  );

  const saveDecision = useCallback(
    async (payload: {
      encounterId: string;
      decision: 'True' | 'False' | 'Unclear';
      reason: string;
      comment?: string;
    }) => {
      await updateDecision({ ...payload, reviewedBy: currentUser });
      setReviewItems((prev) =>
        prev.map((item) =>
          item.encounterId === payload.encounterId
            ? {
                ...item,
                decision: payload.decision,
                reviewedBy: currentUser,
                reason: payload.reason,
                comments: payload.comment
                  ? [
                      ...(item.comments ?? []),
                      {
                        id: `c-${Date.now()}`,
                        user: currentUser,
                        text: payload.comment,
                        timestamp: new Date().toLocaleString(),
                      },
                    ]
                  : item.comments,
                decisionLog: [
                  ...(item.decisionLog ?? []),
                  {
                    decision: payload.decision,
                    user: currentUser,
                    timestamp: new Date().toLocaleString(),
                    reason: payload.reason,
                  },
                ],
              }
            : item,
        ),
      );
    },
    [currentUser],
  );

  const editComment = useCallback(
    async (encounterId: string, commentId: string, newText: string) => {
      await updateComment({ encounterId, commentId, newText });
      setReviewItems((prev) =>
        prev.map((item) =>
          item.encounterId === encounterId
            ? {
                ...item,
                comments: (item.comments ?? []).map((c) =>
                  c.id === commentId ? { ...c, text: newText } : c,
                ),
              }
            : item,
        ),
      );
    },
    [],
  );

  const toggleItemFlag = useCallback(async (encounterId: string) => {
    await toggleFlag(encounterId);
    setReviewItems((prev) =>
      prev.map((item) =>
        item.encounterId === encounterId ? { ...item, flagged: !item.flagged } : item,
      ),
    );
  }, []);

  const markNotifRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      loading,
      theme,
      role,
      currentUser,
      users,
      projects,
      reviewItems,
      criteria,
      runs,
      audit,
      logs,
      notifications,
      setTheme,
      setRole,
      setCurrentUser,
      addProject,
      removeProject,
      dupProject,
      saveAssignment,
      saveDecision,
      editComment,
      toggleItemFlag,
      markNotifRead,
      refresh,
    }),
    [
      loading, theme, role, currentUser, projects, reviewItems, criteria, runs,
      audit, logs, notifications, addProject, removeProject, dupProject,
      saveAssignment, saveDecision, editComment, toggleItemFlag, markNotifRead, refresh,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useAppContext must be used inside AppProvider');
  return value;
}
