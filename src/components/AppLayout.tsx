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
  Moon,
  Search,
  ShieldCheck,
  Sun,
} from 'lucide-react';

const STEPS = ['Project', 'Criteria', 'Run', 'Review'] as const;

function activeStep(pathname: string) {
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
    theme, role, currentUser, users, notifications, logs, audit,
    setTheme, setRole, setCurrentUser, markNotifRead,
  } = useAppContext();

  const step = activeStep(location.pathname);
  const isProjectsPage = location.pathname === '/projects';
  const unreadCount = notifications.filter((n) => !n.read).length;

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
            onClick={() => navigate('/projects')}
            className="flex items-center gap-2 cursor-pointer shrink-0"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold tracking-tight">NEUROVALIDATE</span>
          </button>
          <nav className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <button
              onClick={() => navigate('/projects')}
              className="rounded px-1.5 py-0.5 text-primary hover:bg-primary/10 transition-colors cursor-pointer"
            >
              HOME
            </button>
            {!isProjectsPage && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground">CURRENT PROJECT</span>
              </>
            )}
          </nav>
        </div>

        <div className="flex-1 flex justify-center px-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search patients, protocols, neurology criteria..."
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
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              isProjectsPage
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            PROJECTS
          </button>
          <button className="rounded-full px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
            DISCOVERY
          </button>
        </div>
      </header>

      {!isProjectsPage && (
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
