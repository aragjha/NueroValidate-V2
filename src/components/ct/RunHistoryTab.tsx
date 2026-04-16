import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { RunConfig } from '@/types';

type Props = {
  runs: RunConfig[];
};

function statusVariant(status: RunConfig['status']): 'success' | 'destructive' | 'processing' | 'warning' {
  switch (status) {
    case 'Done': return 'success';
    case 'Failed': return 'destructive';
    case 'Processing': return 'processing';
    case 'Queued': return 'warning';
  }
}

function formatCost(profile: RunConfig['costProfile']): string {
  if (!profile) return '—';
  return `$${profile.totalCost.toFixed(4)}`;
}

export function RunHistoryTab({ runs }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(runId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(runId)) next.delete(runId);
      else next.add(runId);
      return next;
    });
  }

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <FileText className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">No runs yet.</p>
        <p className="text-xs">Configure prompts and run extraction to see history here.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
            <th className="w-8 px-3 py-2.5" />
            <th className="px-3 py-2.5">Run ID</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5">Processed / Total</th>
            <th className="px-3 py-2.5">Sample Size</th>
            <th className="px-3 py-2.5">Cost</th>
            <th className="px-3 py-2.5">File</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const isOpen = expanded.has(run.runId);
            const profile = run.costProfile;
            return (
              <>
                <tr
                  key={run.runId}
                  className="border-t hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => toggle(run.runId)}
                >
                  {/* Chevron */}
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {isOpen
                      ? <ChevronDown className="h-3.5 w-3.5" />
                      : <ChevronRight className="h-3.5 w-3.5" />}
                  </td>
                  {/* Run ID */}
                  <td className="px-3 py-2.5 font-mono text-xs">{run.runId}</td>
                  {/* Status */}
                  <td className="px-3 py-2.5">
                    <Badge variant={statusVariant(run.status)} className="text-[10px] px-2 py-0">
                      {run.status}
                    </Badge>
                  </td>
                  {/* Processed / Total */}
                  <td className="px-3 py-2.5 tabular-nums text-xs">
                    {run.extractionCount.toLocaleString()} / {run.totalCount.toLocaleString()}
                  </td>
                  {/* Sample Size */}
                  <td className="px-3 py-2.5 tabular-nums text-xs">
                    {run.fullRun ? (
                      <span className="text-muted-foreground italic">Full run</span>
                    ) : (
                      run.sampleSize.toLocaleString()
                    )}
                  </td>
                  {/* Cost */}
                  <td className="px-3 py-2.5 tabular-nums text-xs font-medium">
                    {formatCost(profile)}
                  </td>
                  {/* File */}
                  <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[180px] truncate">
                    {run.fileName || '—'}
                  </td>
                </tr>

                {/* Expanded detail row */}
                {isOpen && (
                  <tr key={`${run.runId}-detail`} className="border-t bg-muted/20">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs sm:grid-cols-3 lg:grid-cols-4">
                        <div>
                          <p className="text-muted-foreground font-medium mb-0.5">Run ID (internal)</p>
                          <p className="font-mono">{run.id}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-medium mb-0.5">Criterion ID</p>
                          <p className="font-mono">{run.criterionId}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-medium mb-0.5">Full Run</p>
                          <p>{run.fullRun ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-medium mb-0.5">Reuse Sample</p>
                          <p>{run.reuseSample ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-medium mb-0.5">Override Prompts</p>
                          <p>{run.overridePrompts ? 'Yes' : 'Inherited'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-medium mb-0.5">Override Model</p>
                          <p>{run.overrideModels ? 'Yes' : 'Inherited'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-medium mb-0.5">Override Keywords</p>
                          <p>{run.overrideKeywords ? 'Yes' : 'Inherited'}</p>
                        </div>
                        {profile && (
                          <>
                            <div>
                              <p className="text-muted-foreground font-medium mb-0.5">Model Used</p>
                              <p className="font-mono">{profile.modelUsed}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground font-medium mb-0.5">Extraction Cost</p>
                              <p className="tabular-nums">${profile.extractionCost.toFixed(4)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground font-medium mb-0.5">Reasoning Cost</p>
                              <p className="tabular-nums">${profile.reasoningCost.toFixed(4)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground font-medium mb-0.5">Cost / Patient (median)</p>
                              <p className="tabular-nums">${profile.costPerPatient.median.toFixed(6)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground font-medium mb-0.5">Timestamp</p>
                              <p>{new Date(profile.timestamp).toLocaleString()}</p>
                            </div>
                          </>
                        )}
                        {run.patientIds && (
                          <div className="col-span-2 lg:col-span-4">
                            <p className="text-muted-foreground font-medium mb-0.5">Patient IDs</p>
                            <p className="font-mono break-all line-clamp-3">{run.patientIds}</p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default RunHistoryTab;
