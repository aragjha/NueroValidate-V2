import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bot,
  FileText,
  ListChecks,
  MessageSquare,
  Pill,
  Send,
  Sparkles,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CriterionRowData } from '@/components/vault/shared';

export type AskContext = {
  projectName: string;
  totalPatients: number;
  eligibleCount: number;
  ineligibleCount: number;
  criteria: CriterionRowData[];
  /** Which criterion IDs are currently enabled/disabled (funnel page passes this) */
  enabledCriterionIds?: Set<string>;
  /** Per-criterion drop counts (funnel only) */
  dropByCriterion?: Record<string, number>;
};

type IntentKind = 'COUNT' | 'COMPARE' | 'BREAKDOWN' | 'EXPLAIN' | 'UNKNOWN';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  intent?: IntentKind;
  sources?: { label: string; type: 'structured' | 'unstructured' | 'patient' }[];
  chart?: { kind: 'bar' | 'pie' | 'stat'; data: { label: string; value: number }[] };
  patientCount?: number;
};

const SUGGESTIONS: { label: string; prompt: string; icon: React.ReactNode }[] = [
  { label: 'How many patients are eligible?', prompt: 'How many patients are eligible?', icon: <Users className="h-3.5 w-3.5" /> },
  { label: 'Which criterion drops the most?', prompt: 'Which criterion drops the most patients?', icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { label: 'Compare structured vs unstructured', prompt: 'Compare structured vs unstructured atoms', icon: <ListChecks className="h-3.5 w-3.5" /> },
  { label: 'Show medication breakdown', prompt: 'Show medication breakdown', icon: <Pill className="h-3.5 w-3.5" /> },
];

function classifyIntent(prompt: string): IntentKind {
  const p = prompt.toLowerCase();
  if (/\/count|\bhow many|\btotal|\bcount\b|\bnumber of/.test(p)) return 'COUNT';
  if (/\bcompare|\bvs\b|\bversus|\bdifference/.test(p) || p.startsWith('/compare')) return 'COMPARE';
  if (/\bbreakdown|\bdistribution|\bby category|\bby criterion|\bby atom/.test(p) || p.startsWith('/breakdown')) return 'BREAKDOWN';
  if (/\bwhy|\bexplain|\bwhat does|\bhow does/.test(p) || p.startsWith('/explain')) return 'EXPLAIN';
  if (/\bdrops|\bdrop the most|\bwhich criterion/.test(p)) return 'COMPARE';
  return 'UNKNOWN';
}

function buildResponse(prompt: string, ctx: AskContext): Message {
  const intent = classifyIntent(prompt);
  const p = prompt.toLowerCase();
  const id = `m_${Date.now()}_a`;

  const enabled = (cId: string) => (ctx.enabledCriterionIds ? ctx.enabledCriterionIds.has(cId) : true);
  const activeCriteria = ctx.criteria.filter((c) => enabled(c.id));

  // COUNT
  if (intent === 'COUNT') {
    if (/eligible/.test(p)) {
      return {
        id,
        role: 'assistant',
        intent,
        text: `**${ctx.eligibleCount.toLocaleString()}** patients are currently eligible, out of ${ctx.totalPatients.toLocaleString()} total (${ctx.totalPatients ? Math.round((ctx.eligibleCount / ctx.totalPatients) * 100) : 0}%).`,
        patientCount: ctx.eligibleCount,
        sources: activeCriteria.slice(0, 5).map((c) => ({
          label: c.name,
          type: c.mixedness === 'all-structured' ? 'structured' : 'unstructured',
        })),
      };
    }
    if (/criteri/.test(p)) {
      return {
        id,
        role: 'assistant',
        intent,
        text: `${ctx.projectName} has **${ctx.criteria.length}** criteria total — ${ctx.criteria.filter((c) => c.type === 'inclusion').length} inclusion, ${ctx.criteria.filter((c) => c.type === 'exclusion').length} exclusion. ${ctx.criteria.reduce((s, c) => s + c.atoms.length, 0)} atoms across all criteria.`,
      };
    }
    return {
      id,
      role: 'assistant',
      intent,
      text: `Total patients in cohort: **${ctx.totalPatients.toLocaleString()}**. Eligible: ${ctx.eligibleCount.toLocaleString()}. Ineligible: ${ctx.ineligibleCount.toLocaleString()}.`,
      patientCount: ctx.totalPatients,
    };
  }

  // COMPARE — which criterion drops the most
  if (intent === 'COMPARE') {
    if (/structured.*unstructured|unstructured.*structured/.test(p)) {
      const structAtoms = ctx.criteria.reduce((s, c) => s + c.structuredAtoms.length, 0);
      const unstructAtoms = ctx.criteria.reduce((s, c) => s + c.unstructuredAtoms.length, 0);
      return {
        id,
        role: 'assistant',
        intent,
        text: `**${structAtoms} structured atoms** (auto-validated from mapped tables) vs **${unstructAtoms} unstructured atoms** (need LLM + human review). Unstructured is where reviewer time goes.`,
        chart: {
          kind: 'bar',
          data: [
            { label: 'Structured', value: structAtoms },
            { label: 'Unstructured', value: unstructAtoms },
          ],
        },
        sources: [
          { label: `${structAtoms} structured atoms`, type: 'structured' },
          { label: `${unstructAtoms} unstructured atoms`, type: 'unstructured' },
        ],
      };
    }

    // drop-the-most
    if (ctx.dropByCriterion) {
      const entries = Object.entries(ctx.dropByCriterion)
        .filter(([cId]) => enabled(cId))
        .map(([cId, drop]) => {
          const c = ctx.criteria.find((x) => x.id === cId);
          return { label: c?.name ?? cId, drop };
        })
        .sort((a, b) => b.drop - a.drop);
      const top = entries[0];
      if (top) {
        return {
          id,
          role: 'assistant',
          intent,
          text: `The criterion with the biggest cohort impact is **"${top.label}"** — it drops **${top.drop.toLocaleString()}** patients. Next largest: ${entries.slice(1, 3).map((e) => `"${e.label}" (${e.drop})`).join(', ') || '—'}.`,
          chart: { kind: 'bar', data: entries.slice(0, 5).map((e) => ({ label: e.label.slice(0, 20), value: e.drop })) },
          sources: entries.slice(0, 3).map((e) => ({ label: e.label, type: 'unstructured' })),
        };
      }
    }
    return {
      id,
      role: 'assistant',
      intent,
      text: `I don't have per-criterion funnel data for this page. Open the Funnel view to see criterion-by-criterion impact.`,
    };
  }

  // BREAKDOWN
  if (intent === 'BREAKDOWN') {
    const byCategory = new Map<string, number>();
    for (const c of activeCriteria) {
      byCategory.set(c.category, (byCategory.get(c.category) ?? 0) + c.atoms.length);
    }
    const data = Array.from(byCategory.entries()).map(([label, value]) => ({ label, value }));
    return {
      id,
      role: 'assistant',
      intent,
      text: `Atom breakdown by category across ${activeCriteria.length} active criteria:`,
      chart: { kind: 'pie', data },
      sources: data.map((d) => ({ label: `${d.label}: ${d.value} atoms`, type: 'structured' })),
    };
  }

  // EXPLAIN
  if (intent === 'EXPLAIN') {
    return {
      id,
      role: 'assistant',
      intent,
      text: `Eligibility is computed per criterion: structured atoms are auto-validated against mapped database fields; unstructured atoms use LLM extraction from clinical notes, then human reviewer sign-off. A patient is eligible only if all inclusion criteria pass and no exclusion criterion matches. You can toggle criteria on the Funnel page to see each rule's impact.`,
      sources: [
        { label: 'Structured atoms: DB-mapped', type: 'structured' },
        { label: 'Unstructured atoms: LLM + reviewer', type: 'unstructured' },
      ],
    };
  }

  // UNKNOWN fallback
  return {
    id,
    role: 'assistant',
    intent,
    text: `I can answer questions about patient counts, criterion impact, structured vs unstructured breakdown, and eligibility logic. Try one of the suggestions below, or start your prompt with /count, /compare, /breakdown, or /explain.`,
  };
}

/* ═══ Small helpers ═══ */

function IntentPill({ intent }: { intent: IntentKind }) {
  const color: Record<IntentKind, string> = {
    COUNT: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400',
    COMPARE: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
    BREAKDOWN: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    EXPLAIN: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    UNKNOWN: 'bg-muted text-muted-foreground',
  };
  return <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider', color[intent])}>{intent}</span>;
}

function MiniBars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="w-24 text-[10px] text-muted-foreground truncate">{d.label}</span>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary/70 rounded-full" style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="text-[10px] font-semibold tabular-nums w-10 text-right">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══ Main component ═══ */

interface Props {
  context: AskContext;
  /** If true, render as a compact docked panel. If false, a full-width card. */
  compact?: boolean;
  className?: string;
}

export function AskMeAnything({ context, compact = false, className }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [rightTab, setRightTab] = useState<'tasks' | 'output' | 'sources'>('tasks');
  const [thinking, setThinking] = useState(false);

  const latestAssistant = useMemo(
    () => [...messages].reverse().find((m) => m.role === 'assistant'),
    [messages],
  );

  function send(text: string) {
    const userMsg: Message = { id: `m_${Date.now()}_u`, role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);
    // Mock "thinking" delay
    setTimeout(() => {
      const reply = buildResponse(text, context);
      setMessages((prev) => [...prev, reply]);
      setThinking(false);
      setRightTab('output');
    }, 600);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = input.trim();
    if (!v || thinking) return;
    send(v);
  }

  return (
    <div
      className={cn(
        'rounded-xl border bg-card flex flex-col overflow-hidden',
        compact ? 'min-h-[400px]' : 'min-h-[500px]',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-2.5 bg-muted/20">
        <div className="rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 p-1.5">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">Ask me anything</p>
          <p className="text-[10px] text-muted-foreground">Scoped to {context.projectName} · {context.totalPatients.toLocaleString()} patients · {context.criteria.length} criteria</p>
        </div>
      </div>

      <div className={cn('flex flex-1 overflow-hidden', compact ? 'flex-col' : 'flex-row')}>
        {/* Center: conversation */}
        <div className={cn('flex-1 flex flex-col overflow-hidden', !compact && 'border-r')}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm font-medium">Ask questions about your cohort</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Counts, comparisons, breakdowns, or how eligibility works</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => send(s.prompt)}
                      className="flex items-start gap-2 rounded-lg border bg-background px-3 py-2 text-left text-xs hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer"
                    >
                      <span className="text-primary mt-0.5">{s.icon}</span>
                      <span className="flex-1">{s.label}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {m.role === 'assistant' && (
                    <div className="rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 p-1 h-6 w-6 flex items-center justify-center shrink-0">
                      <Bot className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                  <div className={cn('max-w-[85%] rounded-xl px-3 py-2', m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted/40')}>
                    {m.role === 'assistant' && m.intent && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <IntentPill intent={m.intent} />
                        {typeof m.patientCount === 'number' && (
                          <span className="text-[10px] text-muted-foreground">· {m.patientCount.toLocaleString()} patients</span>
                        )}
                      </div>
                    )}
                    <p
                      className={cn('text-xs whitespace-pre-wrap leading-relaxed', m.role === 'user' ? 'font-medium' : '')}
                      dangerouslySetInnerHTML={{
                        __html: m.text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'),
                      }}
                    />
                    {m.chart && m.chart.kind === 'bar' && (
                      <div className="mt-2 pt-2 border-t border-border/60">
                        <MiniBars data={m.chart.data} />
                      </div>
                    )}
                    {m.chart && m.chart.kind === 'pie' && (
                      <div className="mt-2 pt-2 border-t border-border/60">
                        <MiniBars data={m.chart.data} />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {thinking && (
              <div className="flex gap-2">
                <div className="rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 p-1 h-6 w-6 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="rounded-xl px-3 py-2 bg-muted/40 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <form onSubmit={handleSubmit} className="border-t bg-muted/20 p-3">
            <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/40">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your cohort… try /count /compare /breakdown"
                className="flex-1 bg-transparent text-xs outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || thinking}
                className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
              >
                <Send className="h-3 w-3" />
                Send
              </button>
            </div>
          </form>
        </div>

        {/* Right: Tasks / Output / Sources */}
        {!compact && (
          <aside className="w-[40%] min-w-[260px] flex flex-col bg-muted/10">
            <div className="flex border-b">
              {(['tasks', 'output', 'sources'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setRightTab(t)}
                  className={cn(
                    'flex-1 px-3 py-2 text-[11px] font-semibold capitalize transition-colors cursor-pointer',
                    rightTab === t
                      ? 'text-primary border-b-2 border-primary bg-background'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {rightTab === 'tasks' && (
                <div className="space-y-2">
                  {thinking ? (
                    <>
                      <TaskLine label="Classify intent" state="done" />
                      <TaskLine label="Query cohort state" state="active" />
                      <TaskLine label="Compose response" state="pending" />
                    </>
                  ) : messages.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">No query yet. Ask something to see the task pipeline.</p>
                  ) : (
                    <>
                      <TaskLine label="Classify intent" state="done" />
                      <TaskLine label="Query cohort state" state="done" />
                      <TaskLine label="Compose response" state="done" />
                    </>
                  )}
                </div>
              )}
              {rightTab === 'output' && (
                <div className="space-y-2">
                  {latestAssistant?.chart ? (
                    <div className="rounded-lg border bg-background p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Chart</p>
                      <MiniBars data={latestAssistant.chart.data} />
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">No chart for the latest response.</p>
                  )}
                </div>
              )}
              {rightTab === 'sources' && (
                <div className="space-y-1.5">
                  {latestAssistant?.sources?.length ? (
                    latestAssistant.sources.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5">
                        <FileText className={cn('h-3 w-3 shrink-0', s.type === 'structured' ? 'text-blue-600' : s.type === 'unstructured' ? 'text-amber-600' : 'text-muted-foreground')} />
                        <span className="flex-1 text-[11px] truncate">{s.label}</span>
                        <Badge
                          variant={s.type === 'structured' ? 'processing' : s.type === 'unstructured' ? 'warning' : 'secondary'}
                          className="text-[9px] px-1 py-0"
                        >
                          {s.type}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-muted-foreground">No sources yet.</p>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function TaskLine({ label, state }: { label: string; state: 'done' | 'active' | 'pending' }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'h-2 w-2 rounded-full shrink-0',
          state === 'done' ? 'bg-emerald-500' : state === 'active' ? 'bg-amber-500 animate-pulse' : 'bg-muted-foreground/30',
        )}
      />
      <span className={cn('text-[11px]', state === 'pending' ? 'text-muted-foreground' : 'font-medium')}>{label}</span>
    </div>
  );
}
