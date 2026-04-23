import { useMemo, useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PatientRowData, CriterionRowData } from './shared';

const PAGE_SIZE = 50;

interface PatientsTabProps {
  patients: PatientRowData[];
  criteria: CriterionRowData[];
}

type PatientRecord = {
  patientId: string;
  encounterId: string;
  requestId: string;
  date: string;
  keywords: string[];
};

/* Deterministic synthetic encounter/request ID/date + keywords per (patient, criterion) */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function hexFromHash(h: number, len: number): string {
  let s = h.toString(16);
  while (s.length < len) s = s + (h * 7).toString(16);
  return s.slice(0, len);
}

/* Category-based dummy keyword pools — used when NeuroTerminal hasn't attached real keywords to the atom */
const CATEGORY_KEYWORD_POOL: Record<string, string[]> = {
  Demographics: ['age 65+', 'female', 'male', 'caregiver present', 'english speaker', 'medicare', 'geriatric'],
  Diagnosis: ['alzheimer', 'MCI', 'cognitive decline', 'dementia', 'amnestic', 'probable AD', 'early onset'],
  Labs: ['a-beta42', 'p-tau181', 'CSF', 'p-tau217', 'GFAP', 'NfL', 'plasma biomarker'],
  Imaging: ['amyloid pet', 'florbetapir', 'centiloid', 'MRI brain', 'FDG-PET', 'temporoparietal', 'WMH'],
  Medications: ['donepezil', 'memantine', 'lecanemab', 'aducanumab', 'donanemab', 'statin', 'SSRI'],
  Procedures: ['lumbar puncture', 'PET scan', 'cranial MRI', 'no cranial surgery', 'EEG', 'cognitive assessment'],
  Clinical: ['MMSE', 'MoCA', 'CDR 0.5', 'ADAS-cog', 'global CDR', 'delayed recall', 'trail making'],
  Biomarkers: ['amyloid positive', 'tau positive', 'Braak stage', 'A+T+', 'GFAP elevated', 'neurodegeneration'],
  Cognitive: ['memory loss', 'executive function', 'visuospatial', 'word finding', 'apathy', 'disorientation'],
  Medication: ['donepezil', 'memantine', 'lecanemab', 'adverse event', 'discontinued', 'infusion reaction'],
  Drug: ['steroid', 'anticoag', 'antipsychotic', 'contraindicated', 'washout'],
  General: ['clinical note', 'progress note', 'follow-up', 'stable', 'encounter'],
};

function buildRecord(patientId: string, criterion: CriterionRowData): PatientRecord {
  const seed = hash(patientId + criterion.id);
  const encounterId = patientId; // mirror screenshot — same ID
  const requestId = hexFromHash(seed, 36).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
  const year = 2025 + (seed % 2);
  const month = ((seed >> 2) % 12) + 1;
  const day = ((seed >> 4) % 28) + 1;
  const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // Build keyword pool: prefer real atom keywords, else category-based dummy pool
  const realKeywords = Array.from(new Set(criterion.atoms.flatMap((a) => a.keywords ?? [])));
  const pool = realKeywords.length > 0
    ? realKeywords
    : (CATEGORY_KEYWORD_POOL[criterion.category] ?? CATEGORY_KEYWORD_POOL.General!);

  // Pick 1-3 keywords deterministically, rotating start index per patient so rows differ
  const numKw = 1 + (seed % 3);
  const start = (seed >> 5) % pool.length;
  const keywords: string[] = [];
  for (let i = 0; i < numKw && i < pool.length; i++) {
    const kw = pool[(start + i * 2 + 1) % pool.length];
    if (!keywords.includes(kw)) keywords.push(kw);
  }

  return { patientId, encounterId, requestId, date, keywords };
}

export function PatientsTab({ patients, criteria }: PatientsTabProps) {
  const [activeCriterionId, setActiveCriterionId] = useState<string>(criteria[0]?.id ?? '');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const activeCriterion = useMemo(
    () => criteria.find((c) => c.id === activeCriterionId),
    [criteria, activeCriterionId],
  );

  const records: PatientRecord[] = useMemo(() => {
    if (!activeCriterion) return [];
    return patients.map((p) => buildRecord(p.id, activeCriterion));
  }, [patients, activeCriterion]);

  const filtered: PatientRecord[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.patientId.toLowerCase().includes(q) ||
        r.encounterId.toLowerCase().includes(q) ||
        r.requestId.toLowerCase().includes(q) ||
        r.keywords.some((k) => k.toLowerCase().includes(q)),
    );
  }, [records, search]);

  if (criteria.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <p className="text-sm font-medium text-muted-foreground">No criteria to view patients by</p>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  return (
    <div className="space-y-3">
      {/* Criterion tabs + meta */}
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {criteria.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setActiveCriterionId(c.id);
                setPage(1);
              }}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer',
                activeCriterionId === c.id
                  ? 'bg-primary text-primary-foreground'
                  : 'border bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              C{c.index}
              <span
                className={cn(
                  'ml-1.5 rounded-full px-1.5 text-[10px]',
                  activeCriterionId === c.id ? 'bg-primary-foreground/20' : 'bg-muted',
                )}
              >
                {patients.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {activeCriterion && (
        <>
          {/* Title row + search */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold">{activeCriterion.name}</p>
              <p className="text-[11px] text-muted-foreground">{filtered.length} records found</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by ID, keyword, or text…"
                  className="pl-9 h-8 w-64 text-xs"
                />
              </div>
              <Badge variant="outline" className="text-[10px]">
                criteria_id: {activeCriterion.id}
              </Badge>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border bg-card overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider w-10">#</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Patient ID</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Encounter ID</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Request ID</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Keywords</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pageRows.map((r, i) => (
                  <tr key={`${r.patientId}-${i}`} className="hover:bg-muted/20">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{startIdx + i + 1}</td>
                    <td className="px-3 py-2 text-xs font-mono font-semibold">{r.patientId}</td>
                    <td className="px-3 py-2 text-xs font-mono">{r.encounterId}</td>
                    <td className="px-3 py-2 text-[11px] font-mono text-muted-foreground truncate max-w-[200px]">
                      {r.requestId}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.date}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {r.keywords.length > 0 ? (
                          r.keywords.map((kw) => (
                            <Badge key={kw} variant="secondary" className="text-[9px] px-1.5 py-0 font-normal">
                              {kw}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground/60 italic">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-xs text-muted-foreground">
                      No records match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t pt-3">
              <p className="text-xs text-muted-foreground">
                Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filtered.length)} of {filtered.length} records
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="h-3 w-3" /> Prev
                </button>
                <span className="text-xs font-medium text-muted-foreground px-1">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
