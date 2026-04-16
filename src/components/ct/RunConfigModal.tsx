import { useState, useMemo } from 'react';
import { Dialog } from '@/components/ui/dialog';

type RunScope = 'all' | 'patients' | 'encounters';

type StartRunPayload = {
  scope: RunScope;
  ids: string[];
  sampleSize: number;
  fullRun: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onStartRun: (config: StartRunPayload) => void;
  atomLabel: string;
  keywordCount: number;
  model: string;
  allPatientIds: string[];
  totalPatientCount: number;
};

function parseIds(raw: string): string[] {
  return raw
    .split(/[\s,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function RunConfigModal({
  open,
  onClose,
  onStartRun,
  atomLabel,
  keywordCount,
  model,
  allPatientIds,
  totalPatientCount,
}: Props) {
  const [scope, setScope] = useState<RunScope>('all');
  const [patientIdsText, setPatientIdsText] = useState('');
  const [encounterIdsText, setEncounterIdsText] = useState('');
  const [fullRun, setFullRun] = useState(true);
  const [sampleSize, setSampleSize] = useState(50);

  /* ── Patient ID validation (only when scope === 'patients') ── */
  const patientValidation = useMemo(() => {
    if (scope !== 'patients') return null;
    const parsed = parseIds(patientIdsText);
    if (parsed.length === 0) return null;
    const validSet = new Set(allPatientIds);
    const valid = parsed.filter((id) => validSet.has(id));
    const invalid = parsed.filter((id) => !validSet.has(id));
    return { parsed, valid, invalid };
  }, [scope, patientIdsText, allPatientIds]);

  /* ── Derived patient count for summary strip ── */
  const patientCount = useMemo(() => {
    if (scope === 'all') {
      return fullRun ? totalPatientCount : sampleSize;
    }
    if (scope === 'patients') {
      return patientValidation ? patientValidation.valid.length : 0;
    }
    // encounters: just count the IDs supplied
    return parseIds(encounterIdsText).length;
  }, [scope, fullRun, sampleSize, totalPatientCount, patientValidation, encounterIdsText]);

  /* ── Validity check for Start Run button ── */
  const isValid = useMemo(() => {
    if (scope === 'all') {
      return fullRun || (sampleSize > 0 && sampleSize <= totalPatientCount);
    }
    if (scope === 'patients') {
      return patientValidation !== null && patientValidation.valid.length > 0;
    }
    // encounters
    return parseIds(encounterIdsText).length > 0;
  }, [scope, fullRun, sampleSize, totalPatientCount, patientValidation, encounterIdsText]);

  function handleStart() {
    if (!isValid) return;
    let ids: string[] = [];
    if (scope === 'patients' && patientValidation) {
      ids = patientValidation.valid;
    } else if (scope === 'encounters') {
      ids = parseIds(encounterIdsText);
    }
    onStartRun({ scope, ids, sampleSize: fullRun ? totalPatientCount : sampleSize, fullRun });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Configure Run"
      description={`Atom: ${atomLabel}`}
    >
      <div className="space-y-6">
        {/* ── Scope selector ── */}
        <div className="space-y-3">
          <p className="text-sm font-semibold">Scope</p>
          <div className="space-y-2">
            {[
              { value: 'all' as RunScope, label: `All patients (N = ${totalPatientCount})` },
              { value: 'patients' as RunScope, label: 'By Patient IDs' },
              { value: 'encounters' as RunScope, label: 'By Encounter IDs' },
            ].map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value={value}
                  checked={scope === value}
                  onChange={() => setScope(value)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* ── Patient ID textarea + validation ── */}
        {scope === 'patients' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Patient IDs</label>
            <textarea
              value={patientIdsText}
              onChange={(e) => setPatientIdsText(e.target.value)}
              placeholder="Enter patient IDs separated by comma, space, or newline"
              rows={4}
              className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {patientValidation && patientValidation.parsed.length > 0 && (
              <p className={`text-xs ${patientValidation.invalid.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                {patientValidation.valid.length} valid
                {patientValidation.invalid.length > 0 && ` / ${patientValidation.invalid.length} not in list`}
              </p>
            )}
          </div>
        )}

        {/* ── Encounter ID textarea ── */}
        {scope === 'encounters' && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Encounter IDs</label>
            <textarea
              value={encounterIdsText}
              onChange={(e) => setEncounterIdsText(e.target.value)}
              placeholder="Enter encounter IDs separated by comma, space, or newline"
              rows={4}
              className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {encounterIdsText.trim() && (
              <p className="text-xs text-muted-foreground">
                {parseIds(encounterIdsText).length} encounter ID{parseIds(encounterIdsText).length !== 1 ? 's' : ''} entered
              </p>
            )}
          </div>
        )}

        {/* ── Sample size (only for "all" scope) ── */}
        {scope === 'all' && (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Run size</p>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={fullRun}
                onChange={(e) => setFullRun(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm">Full run (all {totalPatientCount} patients)</span>
            </label>
            {!fullRun && (
              <div className="flex items-center gap-3">
                <label className="text-sm text-muted-foreground">Sample size:</label>
                <input
                  type="number"
                  min={1}
                  max={totalPatientCount}
                  value={sampleSize}
                  onChange={(e) => setSampleSize(Math.max(1, Math.min(totalPatientCount, Number(e.target.value))))}
                  className="w-28 rounded-lg border bg-muted/30 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <span className="text-xs text-muted-foreground">of {totalPatientCount}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Config summary strip ── */}
        <div className="rounded-xl border bg-muted/20 px-5 py-3 flex items-center gap-6 text-sm">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Keywords</p>
            <p className="font-semibold">{keywordCount}</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Model</p>
            <p className="font-semibold">{model}</p>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Patients</p>
            <p className="font-semibold">{patientCount}</p>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStart}
            disabled={!isValid}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Start Run
          </button>
        </div>
      </div>
    </Dialog>
  );
}

export default RunConfigModal;
