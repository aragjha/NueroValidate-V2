import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sheet } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  BookOpen,
  ChevronRight,
  Clock,
  DatabaseZap,
  Moon,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Wand2,
  Workflow,
} from 'lucide-react';

const RWE_STEPS = ['Project', 'Criteria', 'Run', 'Review'] as const;
const CT_STEPS = ['Project', 'Criteria', 'Atom Config', 'Review', 'Funnel'] as const;

function activeStep(pathname: string, isCT: boolean) {
  if (isCT) {
    if (pathname.includes('/ct-funnel')) return 4;    // funnel
    if (pathname.includes('/ct-matrix')) return 3;    // matrix (review level)
    if (pathname.includes('/ct-criteria/')) return 2; // atom detail page
    if (pathname.includes('/ct-overview')) return 1;  // criteria list
    if (pathname.includes('/review')) return 3;       // review
    if (pathname.includes('/criteria')) return 2;     // prompt config (atom config)
    if (pathname.includes('/new')) return 0;
    return 0;
  }
  if (pathname.includes('/review')) return 3;
  if (pathname.includes('/criteria')) return 2;
  if (pathname.includes('/new')) return 1;
  return 0;
}

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [logsOpen, setLogsOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const {
    theme, role, currentUser, users, notifications, logs, audit, projects,
    setTheme, setRole, setCurrentUser, markNotifRead,
  } = useAppContext();

  const isHomePage = location.pathname === '/home';
  const isProjectsPage = location.pathname === '/projects';
  const isProjectFlow = location.pathname.startsWith('/projects');
  const isWorkflowsPage = location.pathname === '/workflows';
  const isWorkflowFlow = location.pathname.startsWith('/workflows');
  const isStudio = location.pathname === '/studio';
  const isAgentRunner = location.pathname === '/agent-runner';
  const isAgentBuilder = location.pathname === '/agent-builder';
  const isGuide = location.pathname === '/guide';
  const isVault = location.pathname === '/vault';
  const isCTOverview = location.pathname.includes('/ct-overview');
  const projectIdMatch = location.pathname.match(/\/projects\/([^/]+)/);
  const currentProject = projectIdMatch ? projects.find((p) => p.id === projectIdMatch[1]) : null;
  const isCTFlow = isCTOverview || currentProject?.flowType === 'ct';
  const STEPS = isCTFlow ? CT_STEPS : RWE_STEPS;
  const step = activeStep(location.pathname, isCTFlow);
  const showProjectSteps = isProjectFlow && !isProjectsPage && !location.pathname.endsWith('/new');
  const unreadCount = notifications.filter((n) => !n.read).length;

  /* Breadcrumb logic */
  let breadcrumbLabel = '';
  const isCTCriterionDetail = location.pathname.includes('/ct-criteria/');
  if (isVault) breadcrumbLabel = 'DATA VAULT';
  else if (isProjectFlow && !isProjectsPage) breadcrumbLabel = isCTFlow ? (isCTOverview ? 'CT CRITERIA' : isCTCriterionDetail ? 'ATOM DETAIL' : 'CT PROJECT') : 'CURRENT PROJECT';
  else if (isWorkflowFlow && !isWorkflowsPage) {
    if (location.pathname.endsWith('/new')) breadcrumbLabel = 'NEW WORKFLOW';
    else if (location.pathname.endsWith('/generate')) breadcrumbLabel = 'AUTO-GENERATE';
    else breadcrumbLabel = 'WORKFLOW DETAIL';
  } else if (isStudio) breadcrumbLabel = 'AGENTIC STUDIO';
  else if (isAgentRunner) breadcrumbLabel = 'AGENT RUNNER';
  else if (isAgentBuilder) breadcrumbLabel = 'AGENT BUILDER';
  else if (isGuide) breadcrumbLabel = 'GUIDE';

  function openDrawer(which: 'notif' | 'logs' | 'audit') {
    setNotifOpen(which === 'notif');
    setLogsOpen(which === 'logs');
    setAuditOpen(which === 'audit');
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background/95 backdrop-blur-md">
        <div className="flex items-center gap-4 px-5">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 cursor-pointer shrink-0"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold tracking-tight">NEURO AUDIT</span>
          </button>
          <nav className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <button
              onClick={() => navigate('/home')}
              className="rounded px-1.5 py-0.5 text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            >
              HOME
            </button>
            {breadcrumbLabel && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground">{breadcrumbLabel}</span>
              </>
            )}
          </nav>
        </div>

        <div className="flex-1 flex justify-center px-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search patients, protocols, workflows, agents..."
              className="h-9 pl-9 text-xs bg-muted/40 border-muted-foreground/15"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 px-5">
          <Select
            value={currentUser}
            onChange={(e) => setCurrentUser(e.target.value)}
            className="h-7 w-auto text-[10px] border-0 bg-transparent shadow-none"
          >
            {users.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </Select>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="h-7 w-auto text-[10px] border-0 bg-transparent shadow-none"
          >
            <option>Admin</option>
            <option>Reviewer</option>
          </Select>

          <div className="mx-2 h-5 w-px bg-border" />

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDrawer('logs')}>
            <Clock className="h-4 w-4" />
          </Button>
          <div className="relative">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDrawer('notif')}>
              <Bell className="h-4 w-4" />
            </Button>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDrawer('audit')}>
            <BookOpen className="h-4 w-4" />
          </Button>

          <div className="mx-2 h-5 w-px bg-border" />

          <button
            onClick={() => navigate('/projects')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              isProjectFlow
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            PROJECTS
          </button>
          <button
            onClick={() => navigate('/vault')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              isVault
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <DatabaseZap className="h-3 w-3" />
            DATA VAULT
          </button>
          <button
            onClick={() => navigate('/workflows')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              isWorkflowFlow
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Workflow className="h-3 w-3" />
            WORKFLOWS
          </button>
          <button
            onClick={() => navigate('/studio')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              isStudio
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Sparkles className="h-3 w-3" />
            STUDIO
          </button>
          <button
            onClick={() => navigate('/guide')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              isGuide
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            GUIDE
          </button>
        </div>
      </header>

      {showProjectSteps && (
        <div className="border-b bg-muted/30 px-6 py-2">
          <div className="flex items-center gap-1">
            {STEPS.map((label, idx) => {
              const isActive = idx <= step;
              const isCurrent = idx === step;
              return (
                <div key={label} className="flex items-center gap-1">
                  {idx > 0 && (
                    <div className={`mx-1 h-px w-6 ${isActive ? 'bg-primary' : 'bg-border'}`} />
                  )}
                  <div
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      isCurrent
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : isActive
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : isActive
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted-foreground/20 text-muted-foreground'
                    }`}>
                      {idx + 1}
                    </span>
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <main className="flex-1 p-6">
        <Outlet />
      </main>

      {/* Notifications drawer */}
      <Sheet open={notifOpen} onClose={() => setNotifOpen(false)} title="Notifications">
        <ScrollArea className="max-h-[calc(100vh-120px)]">
          <div className="space-y-3 text-sm">
            {notifications.length === 0 && (
              <p className="text-muted-foreground text-center py-8">No notifications</p>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-xl border p-4 transition-colors cursor-pointer ${n.read ? 'opacity-60' : 'bg-primary/5 border-primary/20'}`}
                onClick={() => markNotifRead(n.id)}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm">{n.title}</p>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground">{n.body}</p>
                <p className="text-[10px] text-muted-foreground mt-2">{n.timestamp}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Sheet>

      {/* Logs drawer */}
      <Sheet open={logsOpen} onClose={() => setLogsOpen(false)} title="Processing Logs">
        <ScrollArea className="max-h-[calc(100vh-120px)]">
          <div className="space-y-2 text-sm">
            {logs.map((log) => (
              <div key={log.id} className="rounded-xl border p-3 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    variant={log.level === 'error' ? 'destructive' : log.level === 'warn' ? 'warning' : 'secondary'}
                    className="text-[9px] px-1.5 py-0"
                  >
                    {log.level.toUpperCase()}
                  </Badge>
                  <span className="text-muted-foreground">{log.timestamp}</span>
                </div>
                <p>{log.message}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Sheet>

      {/* Audit trail drawer */}
      <Sheet open={auditOpen} onClose={() => setAuditOpen(false)} title="Audit Trail">
        <ScrollArea className="max-h-[calc(100vh-120px)]">
          <div className="space-y-2 text-sm">
            <p className="text-xs text-muted-foreground mb-3">
              Prompt versions, model versions, overrides, dataset lineage, exports lineage.
            </p>
            {audit.map((entry) => (
              <div key={entry.id} className="rounded-xl border p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold">{entry.action}</span>
                  <span className="text-muted-foreground">{entry.timestamp}</span>
                </div>
                <p className="text-muted-foreground">{entry.detail}</p>
                <p className="text-[10px] text-muted-foreground mt-1">by {entry.user}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Sheet>
    </div>
  );
}
