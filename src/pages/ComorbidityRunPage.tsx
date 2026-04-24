import { Fragment, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, Play, Shuffle, Check, ArrowRight, Columns3, LayoutGrid, Crown, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/** Return Tailwind classes based on how many models detected a term out of total. */
function coverageColor(coverage: number, total: number): string {
  if (total === 0 || coverage === 0) return 'bg-muted/50 text-muted-foreground';
  if (coverage >= total) return 'bg-emerald-500/25 text-emerald-700 dark:text-emerald-300';
  if (coverage >= 2) return 'bg-amber-400/25 text-amber-700 dark:text-amber-300';
  return 'bg-red-400/25 text-red-700 dark:text-red-300';
}

/** Split a pipe/semicolon-separated model response into individual items. */
function parseItems(response: string): string[] {
  if (!response || response === '—') return [];
  return response.split(/\s*[|;]\s*/).map((s) => s.trim()).filter(Boolean);
}

/**
 * Build a phrase→cssClass map for text highlighting.
 * Each phrase is colored based on how many selected models detected it in their responses.
 */
function buildPhraseColorMap(
  phrases: string[],
  selectedModelIds: string[],
  getResponse: (modelId: string) => string,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const phrase of phrases) {
    const lower = phrase.toLowerCase();
    const coverage = selectedModelIds.filter((mid) => {
      const items = parseItems(getResponse(mid));
      return items.some((item) => item.toLowerCase().includes(lower) || lower.includes(item.toLowerCase()));
    }).length;
    map[lower] = coverageColor(coverage, selectedModelIds.length);
  }
  return map;
}


/** Wrap matched phrases in the text with a coverage-colored highlight. Case-insensitive substring match. */
function highlightText(text: string, phrases: string[], colorMap: Record<string, string>): ReactNode[] {
  if (!phrases.length) return [text];
  const sorted = [...phrases].sort((a, b) => b.length - a.length);
  const escaped = sorted.map((p) => p.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const cls = colorMap[match[0].toLowerCase()] ?? 'bg-muted/50 text-muted-foreground';
    nodes.push(
      <mark key={`m${key++}`} className={`${cls} px-0.5 rounded font-medium`}>
        {match[0]}
      </mark>,
    );
    lastIndex = match.index + match[0].length;
    if (match[0].length === 0) regex.lastIndex++;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/**
 * Render model response items. Only items that correspond to a known comorbidity
 * (via phraseColorMap) get coverage-based coloring. Everything else is plain text.
 */
function renderModelItems(items: string[], phraseColorMap: Record<string, string>): ReactNode {
  if (!items.length) return <span className="text-muted-foreground">—</span>;
  return items.map((item, i) => {
    const lower = item.toLowerCase();
    const matchedColor = Object.entries(phraseColorMap).find(
      ([phrase]) => lower.includes(phrase) || phrase.includes(lower),
    )?.[1];
    return (
      <Fragment key={i}>
        {matchedColor ? (
          <mark className={`${matchedColor} px-0.5 rounded font-medium`}>{item}</mark>
        ) : (
          <span>{item}</span>
        )}
        {i < items.length - 1 && <span className="mx-1 text-muted-foreground">·</span>}
      </Fragment>
    );
  });
}

/** Subtle count indicator shown above each cell. */
function CountBadge({ n, label }: { n: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
      <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded bg-muted px-1 font-bold text-foreground/60 tabular-nums">
        {n}
      </span>
      <span className="font-medium">{label ?? 'found'}</span>
    </span>
  );
}

const AVAILABLE_MODELS = [
  { id: 'fp16', label: 'FP16', sublabel: '4k$ · Self-hosted' },
  { id: 'gemini-flash', label: 'Gemini 2.5 Flash', sublabel: 'Google · Fast' },
  { id: 'gpt4o', label: 'GPT-4o', sublabel: 'OpenAI · General' },
  { id: 'claude-sonnet', label: 'Claude Sonnet 4', sublabel: 'Anthropic · Balanced' },
  { id: 'llama3', label: 'Llama 3.1 70B', sublabel: 'Meta · Open source' },
  { id: 'mistral', label: 'Mistral Large', sublabel: 'Mistral · EU hosted' },
];

type Encounter = {
  encounterId: string;
  patientId: string;
  date: string;
  textHighlights: string[];
  text: string;
  fp16: string;
  gemini: string;
  gpt4o: string;
};

const MOCK_ENCOUNTERS: Encounter[] = [
  {
    encounterId: 'ENC-10482',
    patientId: 'PT-0041',
    date: '2025-11-14',
    textHighlights: ['Type 2 diabetes mellitus', 'Hypertension', 'atrial fibrillation', 'Dyslipidemia'],
    text: `CHIEF COMPLAINT: Follow-up for diabetes management.

HISTORY OF PRESENT ILLNESS: 62-year-old male with a longstanding history of Type 2 diabetes mellitus (diagnosed 2011) presents for quarterly follow-up. HbA1c this morning returned at 8.2%, up from 7.4% three months ago. Patient reports intermittent adherence to metformin 1000mg BID due to GI side effects. He has noted increased thirst and nocturia over the past 6 weeks.

PAST MEDICAL HISTORY:
• Hypertension — stable on lisinopril 10mg daily; home BP log averages 128/82
• Atrial fibrillation (paroxysmal), diagnosed 2022 — on apixaban 5mg BID, rate-controlled on metoprolol succinate 50mg daily
• Dyslipidemia — on atorvastatin 40mg qhs
• No prior CVA, MI, or hospitalization for decompensation

PHYSICAL EXAM: BP 132/84, HR 76 regular, BMI 29.3. No peripheral edema. Monofilament testing intact bilaterally.

ASSESSMENT: Suboptimal glycemic control in setting of medication non-adherence. Will add empagliflozin 10mg daily, continue apixaban and lisinopril.`,
    fp16: 'Type 2 Diabetes Mellitus (uncontrolled, HbA1c 8.2%) | Hypertension (controlled) | Paroxysmal Atrial Fibrillation (on anticoagulation) | Dyslipidemia | Overweight (BMI 29.3)',
    gemini: 'Type 2 Diabetes Mellitus — suboptimally controlled (HbA1c 8.2%, up from 7.4%); Essential Hypertension — stable on ACE inhibitor; Paroxysmal Atrial Fibrillation — rate-controlled, anticoagulated with apixaban; Dyslipidemia — on high-intensity statin; Obesity class I (BMI 29.3, borderline).',
    gpt4o: 'Type 2 Diabetes Mellitus (HbA1c 8.2%, suboptimal) | Hypertension | Atrial Fibrillation (paroxysmal, anticoagulated) | Dyslipidemia',
  },
  {
    encounterId: 'ENC-10519',
    patientId: 'PT-0041',
    date: '2026-02-20',
    textHighlights: ['PAF', 'atrial fibrillation'],
    text: `ED NOTE — Patient brought in by spouse after palpitations and lightheadedness x 30 min. Known PAF on apixaban. ECG on arrival shows atrial fibrillation with RVR (rate 148). Converted spontaneously to NSR within 20 min of observation. Troponin negative x2. Potassium 3.3, repleted with 40 mEq KCl PO. Home medications confirmed. No new chest pain, no dyspnea at rest.

Endocrine: Blood glucose on arrival 214 mg/dL, nonfasting. Patient reports last HbA1c was ~8%. Continues on metformin and recently added empagliflozin. No DKA features.

DISPOSITION: Discharged home in sinus rhythm. Follow-up with cardiology in 2 weeks, PCP within 1 week for diabetes optimization.`,
    fp16: 'Atrial Fibrillation with RVR (resolved, NSR on discharge) | Type 2 DM (uncontrolled) | Hypokalemia (repleted)',
    gemini: 'Paroxysmal Atrial Fibrillation with rapid ventricular response — self-terminated; Type 2 Diabetes Mellitus — ongoing suboptimal control; Hypokalemia (mild, K 3.3) — repleted in ED.',
    gpt4o: 'Paroxysmal Atrial Fibrillation with RVR (self-terminated, back to NSR) | Type 2 Diabetes Mellitus | Hypokalemia (K 3.3, repleted)',
  },
  {
    encounterId: 'ENC-10604',
    patientId: 'PT-0042',
    date: '2026-01-08',
    textHighlights: ['Chronic kidney disease', 'Dyslipidemia', 'obesity', 'Prediabetes', 'albuminuria'],
    text: `Annual physical. 58-year-old female. Weight 94 kg, height 166 cm (BMI 34.1). Reports gradual weight gain over 18 months. No exercise routine. Diet high in processed carbohydrates per patient report.

LABS (fasting, today):
• Creatinine 1.6 mg/dL (eGFR 42) — trending down from 49 six months ago
• LDL 148, HDL 39, triglycerides 198 — on atorvastatin 40mg
• HbA1c 5.9% (prediabetic range)
• Urine albumin:creatinine ratio 68 mg/g (A2)

ASSESSMENT:
1. Chronic kidney disease stage 3b — likely hypertensive/metabolic etiology. Nephrology referral placed.
2. Dyslipidemia — inadequately controlled despite statin; will add ezetimibe.
3. Class I obesity — reviewed diet, referred to medical weight management.
4. Prediabetes — lifestyle counseling provided, will monitor.`,
    fp16: 'Chronic Kidney Disease Stage 3b (eGFR 42, declining) | Dyslipidemia (uncontrolled) | Obesity (Class I, BMI 34.1) | Prediabetes | Albuminuria (A2)',
    gemini: 'Chronic Kidney Disease Stage 3b — progressive decline in eGFR (49 → 42); Hyperlipidemia — LDL 148 despite statin therapy; Obesity (BMI 34.1) — lifestyle-related weight gain; Prediabetes (HbA1c 5.9%); Moderately increased albuminuria (A2, ACR 68 mg/g).',
    gpt4o: 'Chronic Kidney Disease Stage 3b (eGFR 42) | Dyslipidemia | Class I Obesity | Prediabetes (HbA1c 5.9%) | Albuminuria (ACR 68 mg/g)',
  },
  {
    encounterId: 'ENC-10715',
    patientId: 'PT-0042',
    date: '2026-03-11',
    textHighlights: ['Proteinuria', 'albuminuria'],
    text: `Nephrology consult. Reviewing labs and renal trajectory. Patient reports compliance with low-sodium diet and increased water intake. BP log 134/86 average. On lisinopril 20mg — discussed increasing but creatinine has been borderline elevated.

Repeat today: Creatinine 1.5, eGFR 45 (slight improvement). Proteinuria stable. Potassium 4.8.

PLAN: Continue current regimen. Add spironolactone 12.5mg daily for additional RAAS blockade given albuminuria. Recheck labs in 4 weeks.`,
    fp16: 'Chronic Kidney Disease Stage 3b | Hypertension (partially controlled) | Albuminuria',
    gemini: 'Chronic Kidney Disease Stage 3b — stable/slight improvement; Essential Hypertension — suboptimally controlled on ACE inhibitor monotherapy; Persistent albuminuria.',
    gpt4o: 'Chronic Kidney Disease Stage 3b (eGFR improving) | Hypertension | Proteinuria and albuminuria (persistent)',
  },
  {
    encounterId: 'ENC-10821',
    patientId: 'PT-0043',
    date: '2025-12-02',
    textHighlights: ['COPD', 'Peripheral vascular disease', 'mild impairment'],
    text: `Pulmonology visit. 71-year-old male, active smoker (currently 0.5 PPD, cumulative 20 pack-years). Spirometry today: FEV1 58% predicted, FEV1/FVC 0.62 — consistent with GOLD stage II COPD.

Patient reports 2 exacerbations in past year, both managed outpatient with prednisone bursts. No hospital admissions. Uses albuterol PRN (~3x/week), tiotropium daily.

VASCULAR: Reports calf claudication at 1 block. ABI 0.68 on right, 0.74 on left. Peripheral vascular disease confirmed on duplex ultrasound last month.

COGNITIVE: Per wife, mild short-term memory issues over past year. MoCA performed today: 23/30 (mild impairment noted in delayed recall and attention).

PLAN: Escalate to LABA/LAMA combination. Smoking cessation counseling (patient amenable, will start varenicline). Aspirin 81mg initiated for PVD. Memory clinic referral placed.`,
    fp16: 'COPD (GOLD Stage II) | Peripheral Vascular Disease (ABI 0.68/0.74) | Mild Cognitive Impairment (MoCA 23) | Active tobacco use (20 pack-years)',
    gemini: 'COPD GOLD Stage II — FEV1 58%, with recent exacerbations; Peripheral Arterial Disease — bilateral, confirmed on imaging; Mild Cognitive Impairment — MoCA 23/30; Current tobacco use disorder (20 pack-year history).',
    gpt4o: 'COPD (GOLD II, FEV1 58%) | Peripheral vascular disease (bilateral, ABI 0.68/0.74) | Mild Cognitive Impairment (MoCA 23/30) | Active smoking (20 pack-years)',
  },
  {
    encounterId: 'ENC-10899',
    patientId: 'PT-0043',
    date: '2026-02-04',
    textHighlights: ['MCI', 'white matter changes'],
    text: `Memory clinic evaluation. MoCA today 22/30. Detailed neuropsych testing shows executive dysfunction and mild delayed recall deficit consistent with MCI, amnestic multi-domain type. No evidence of dementia. MRI brain: mild global atrophy, periventricular white matter changes (Fazekas 2). Rules out hydrocephalus, mass, infarct.

Discussed trajectory, lifestyle interventions, safety (driving cleared at this time). Will repeat MoCA in 6 months.`,
    fp16: 'Mild Cognitive Impairment (amnestic multi-domain) | Cerebral small vessel disease (Fazekas 2)',
    gemini: 'Mild Cognitive Impairment — amnestic multi-domain subtype, confirmed on neuropsych testing; Chronic cerebral small vessel disease (Fazekas grade 2).',
    gpt4o: 'MCI (amnestic multi-domain, confirmed neuropsych) | Periventricular white matter changes (Fazekas 2) | Cerebral small vessel disease',
  },
  {
    encounterId: 'ENC-10955',
    patientId: 'PT-0044',
    date: '2026-01-22',
    textHighlights: ['depression', 'Hypothyroidism', 'Osteoporosis'],
    text: `Follow-up for depression. PHQ-9 today 14 (moderate). On sertraline 100mg daily x 4 months. Reports partial improvement in mood, sleep still disturbed. Discussed dose optimization.

Hypothyroidism stable on levothyroxine 75 mcg. TSH 1.8 (therapeutic).

Osteoporosis: DEXA T-score -2.7 at lumbar spine, -2.4 at hip. Prior L2 compression fracture (2024). On alendronate 70mg weekly, vitamin D 2000 IU, calcium citrate 1200mg daily.

Will increase sertraline to 150mg, add CBT referral.`,
    fp16: 'Major Depressive Disorder (moderate, PHQ-9 14) | Hypothyroidism (controlled) | Osteoporosis (with prior vertebral fracture)',
    gemini: 'Major Depressive Disorder — moderate severity, partial response to SSRI; Primary Hypothyroidism — adequately replaced on levothyroxine; Osteoporosis with established vertebral fragility fracture — on antiresorptive therapy.',
    gpt4o: 'Major Depressive Disorder (moderate, PHQ-9 14, partial SSRI response) | Hypothyroidism (TSH 1.8, controlled) | Osteoporosis with prior L2 vertebral fracture',
  },
  {
    encounterId: 'ENC-11032',
    patientId: 'PT-0045',
    date: '2025-10-30',
    textHighlights: ['HFrEF', 'iron deficiency anemia'],
    text: `Cardiology follow-up for HFrEF. EF 35% on most recent echo (Aug 2025). On goal-directed medical therapy: carvedilol 25mg BID, sacubitril-valsartan 97/103 BID, spironolactone 25mg daily, furosemide 40mg daily. Reports mild orthopnea but stable exercise tolerance (2 flights of stairs).

CBC today notable for Hb 10.2, MCV 74. Ferritin 18. Consistent with iron deficiency anemia. Likely contributing to dyspnea. IV iron infusion planned next week.`,
    fp16: 'Heart Failure with Reduced Ejection Fraction (EF 35%) | Iron Deficiency Anemia (microcytic)',
    gemini: 'Chronic Heart Failure with Reduced Ejection Fraction (HFrEF, LVEF 35%) — on optimized GDMT; Iron-deficiency anemia (microcytic, ferritin 18) — likely contributing to symptom burden.',
    gpt4o: 'HFrEF (LVEF 35%, on GDMT) | Iron deficiency anemia (microcytic, Hb 10.2, ferritin 18)',
  },
  {
    encounterId: 'ENC-11098',
    patientId: 'PT-0045',
    date: '2026-01-18',
    textHighlights: ['iron deficiency anemia', 'HFrEF'],
    text: `Post-IV iron infusion follow-up. Hb improved to 11.6, ferritin 112 — iron deficiency anemia resolving. Patient reports improved energy and reduced dyspnea. Cardiac status stable, no new edema. HFrEF well compensated on GDMT.`,
    fp16: 'HFrEF (stable) | Iron Deficiency Anemia (resolving)',
    gemini: 'HFrEF — clinically stable on optimized GDMT; Iron-deficiency anemia — corrected following IV iron repletion.',
    gpt4o: 'HFrEF (stable, well-compensated on GDMT) | Iron deficiency anemia (resolving post-infusion, Hb 11.6)',
  },
  {
    encounterId: 'ENC-11145',
    patientId: 'PT-0046',
    date: '2026-03-02',
    textHighlights: ['RA', 'OA'],
    text: `Rheumatology. Seropositive RA (RF and anti-CCP positive, diagnosed 2019). On methotrexate 20mg weekly + folate. DAS28 today 2.4 (low disease activity).

Bilateral knee pain on flexion, crepitus on exam. X-rays show tricompartmental OA with joint space narrowing. Consistent with secondary OA. Symptomatic management with topical diclofenac; avoiding systemic NSAIDs due to MTX.

No cardiac history, normal lipids, no DM, no HTN.`,
    fp16: 'Rheumatoid Arthritis (seropositive, low disease activity) | Bilateral Knee Osteoarthritis',
    gemini: 'Seropositive Rheumatoid Arthritis — low disease activity on methotrexate monotherapy; Secondary Osteoarthritis — bilateral knees, tricompartmental involvement.',
    gpt4o: 'Seropositive RA (RF+, anti-CCP+, DAS28 2.4 low activity) | Bilateral knee OA (tricompartmental, secondary)',
  },
  {
    encounterId: 'ENC-11211',
    patientId: 'PT-0047',
    date: '2026-02-14',
    textHighlights: ['Epilepsy', 'Diabetes'],
    text: `Neurology follow-up. Epilepsy (focal with impaired awareness, likely temporal origin) on levetiracetam 1000mg BID. Last seizure 8 months ago. EEG today unremarkable. Adherent, no side effects.

Diabetes: HbA1c 6.4%, on metformin 500mg BID. Controlled. BP today 138/86, on amlodipine 5mg — will uptitrate.`,
    fp16: 'Focal Epilepsy (8 months seizure-free) | Type 2 DM (well-controlled) | Hypertension (mild)',
    gemini: 'Focal epilepsy with impaired awareness — currently in good seizure control on levetiracetam; Type 2 Diabetes Mellitus — well-controlled on metformin; Essential Hypertension — mild, suboptimally controlled.',
    gpt4o: 'Focal Epilepsy (temporal, impaired awareness, 8 months seizure-free) | Diabetes Mellitus type 2 (HbA1c 6.4%, well-controlled) | Hypertension (suboptimally controlled)',
  },
  {
    encounterId: 'ENC-11287',
    patientId: 'PT-0048',
    date: '2026-03-19',
    textHighlights: ['Parkinson disease', 'Chronic constipation', 'Urinary urgency', 'REM sleep behavior disorder'],
    text: `Movement disorders clinic. Parkinson disease, diagnosed 2022, Hoehn & Yahr stage 2. On carbidopa-levodopa 25-100 TID with good motor response. Mild wearing-off in late afternoon — will add extended-release dose.

Non-motor symptoms:
• Chronic constipation — on PEG 17g daily
• Urinary urgency and nocturia 2-3x/night
• REM sleep behavior disorder — confirmed on PSG (2023), on melatonin 6mg qhs with good effect
• No orthostatic hypotension, no cognitive complaints

Overall functional status excellent.`,
    fp16: "Parkinson's Disease (Hoehn & Yahr 2) | REM Sleep Behavior Disorder | Chronic Constipation | Urinary Urgency",
    gemini: "Idiopathic Parkinson's Disease — Hoehn & Yahr stage 2, with mild motor fluctuations; REM Sleep Behavior Disorder — confirmed polysomnographically; Chronic constipation (PD-associated); Neurogenic urinary urgency.",
    gpt4o: "Parkinson disease (Hoehn & Yahr 2, mild wearing-off) | REM sleep behavior disorder (PSG-confirmed) | Chronic constipation | Urinary urgency (neurogenic)",
  },
];

type BestPick = string | null; // model id, or 'tie', or null

function modelResponse(enc: Encounter, modelId: string): string {
  if (modelId === 'fp16') return enc.fp16;
  if (modelId === 'gemini-flash') return enc.gemini;
  if (modelId === 'gpt4o') return enc.gpt4o;
  return '—';
}

export function ComorbidityRunPage() {
  const navigate = useNavigate();
  const [patientCount, setPatientCount] = useState(50);
  const [selectedModels, setSelectedModels] = useState<string[]>(['fp16', 'gemini-flash', 'gpt4o']);
  const [hasRun, setHasRun] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [bestPicks, setBestPicks] = useState<Record<string, BestPick>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'classic' | 'modern'>('classic');
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    caret: 36,
    patientId: 100,
    encounterId: 130,
    date: 110,
    text: 320,
    'model-fp16': 240,
    'model-gemini-flash': 240,
    'model-gpt4o': 240,
    'model-claude-sonnet': 240,
    'model-llama3': 240,
    'model-mistral': 240,
  });

  function startResize(colId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[colId] ?? 200;
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(80, startWidth + (ev.clientX - startX));
      setColWidths((prev) => ({ ...prev, [colId]: next }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function toggleModel(id: string) {
    setSelectedModels((prev) => {
      if (prev.includes(id)) return prev.filter((m) => m !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  }

  function handleRun() {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setHasRun(true);
    }, 1400);
  }

  function setBest(encId: string, model: BestPick) {
    setBestPicks((prev) => ({ ...prev, [encId]: model }));
  }

  function toggleRow(id: string) {
    setExpandedId((cur) => (cur === id ? null : id));
  }

  function gotoNextUnreviewed(currentId: string) {
    const idx = MOCK_ENCOUNTERS.findIndex((e) => e.encounterId === currentId);
    for (let i = 1; i <= MOCK_ENCOUNTERS.length; i++) {
      const next = MOCK_ENCOUNTERS[(idx + i) % MOCK_ENCOUNTERS.length];
      if (!bestPicks[next.encounterId]) {
        setExpandedId(next.encounterId);
        return;
      }
    }
    setExpandedId(null);
  }

  const activeColumns = AVAILABLE_MODELS.filter((m) => selectedModels.includes(m.id));
  const totalColumns = 4 + activeColumns.length + 1; // caret + PT + ENC + date + models + best

  const reviewedCount = Object.values(bestPicks).filter((v) => v !== null && v !== undefined).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="hover:text-foreground cursor-pointer transition-colors" onClick={() => navigate('/home')}>
          Home
        </span>
        <ChevronRight className="h-3 w-3" />
        <span className="hover:text-foreground cursor-pointer transition-colors" onClick={() => navigate('/quantisation')}>
          Model Quantisation
        </span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">Comorbidities</span>
      </div>

      {/* Top control section */}
      <div className="rounded-2xl border-2 border-border bg-card p-5 space-y-5">
        <div className="flex flex-wrap items-end gap-6">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Run Random Sample
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border bg-muted/30 px-3 py-2">
                <Shuffle className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={patientCount}
                  onChange={(e) => setPatientCount(Number(e.target.value))}
                  className="w-16 bg-transparent text-sm font-bold outline-none"
                />
                <span className="text-xs text-muted-foreground">patients</span>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-1.5 min-w-0">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Select Models{' '}
              <span className="normal-case font-normal text-muted-foreground/70">
                ({selectedModels.length}/5 selected)
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_MODELS.map((model) => {
                const active = selectedModels.includes(model.id);
                return (
                  <button
                    key={model.id}
                    onClick={() => toggleModel(model.id)}
                    className={[
                      'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                      !active && selectedModels.length >= 5 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                    ].join(' ')}
                  >
                    {active && <Check className="h-3 w-3" />}
                    {model.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            onClick={handleRun}
            disabled={isRunning || selectedModels.length === 0}
            className="shrink-0 gap-2 px-6"
          >
            {isRunning ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Running…
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                Run
              </>
            )}
          </Button>
        </div>

        {hasRun && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Ran {patientCount} random patients ({MOCK_ENCOUNTERS.length} encounters) across {selectedModels.length} model{selectedModels.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Results header with inline legend + view toggle */}
      {hasRun && (
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground shrink-0">Results</h3>

          {/* Legend */}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground/60">Comorbidity coverage:</span>
            <span className="flex items-center gap-1">
              <mark className="bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 px-1.5 py-0 rounded text-[10px] font-semibold">■</mark>
              All {selectedModels.length} models
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1">
              <mark className="bg-amber-400/25 text-amber-700 dark:text-amber-300 px-1.5 py-0 rounded text-[10px] font-semibold">■</mark>
              2 of {selectedModels.length}
            </span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1">
              <mark className="bg-red-400/25 text-red-700 dark:text-red-300 px-1.5 py-0 rounded text-[10px] font-semibold">■</mark>
              1 only
            </span>
          </div>

          <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1 shrink-0">
            <button
              onClick={() => setViewMode('classic')}
              className={[
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer',
                viewMode === 'classic' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              <Columns3 className="h-3.5 w-3.5" />
              Classic
            </button>
            <button
              onClick={() => setViewMode('modern')}
              className={[
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer',
                viewMode === 'modern' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Modern
            </button>
          </div>
        </div>
      )}

      {/* Classic view */}
      {hasRun && viewMode === 'classic' && (
        <div className="rounded-2xl border-2 border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="w-10 px-2 py-3"></th>
                  <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Patient ID
                  </th>
                  <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Encounter ID
                  </th>
                  <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground min-w-[240px]">
                    Clinical Text
                  </th>
                  {activeColumns.map((col) => (
                    <th key={col.id} className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground min-w-[200px]">
                      <div>{col.label}</div>
                      <div className="text-[10px] font-normal normal-case text-muted-foreground/60">{col.sublabel}</div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                    Best
                  </th>
                </tr>
              </thead>
              <tbody>
                {MOCK_ENCOUNTERS.map((enc, idx) => {
                  const best = bestPicks[enc.encounterId] ?? null;
                  const isExpanded = expandedId === enc.encounterId;
                  const prevPatient = idx > 0 ? MOCK_ENCOUNTERS[idx - 1].patientId : null;
                  const newPatientGroup = enc.patientId !== prevPatient;
                  const getResp = (mid: string) => modelResponse(enc, mid);
                  const phraseColorMap = buildPhraseColorMap(enc.textHighlights, selectedModels, getResp);

                  return (
                    <Fragment key={enc.encounterId}>
                      {/* Summary row */}
                      <tr
                        onClick={() => toggleRow(enc.encounterId)}
                        className={[
                          'cursor-pointer transition-colors',
                          newPatientGroup ? 'border-t-2 border-border' : 'border-t border-border/40',
                          isExpanded ? 'bg-primary/5' : 'hover:bg-muted/30',
                        ].join(' ')}
                      >
                        <td className="px-2 py-3 align-top">
                          <ChevronDown
                            className={[
                              'h-4 w-4 text-muted-foreground transition-transform',
                              isExpanded ? 'rotate-0' : '-rotate-90',
                            ].join(' ')}
                          />
                        </td>
                        <td className="px-3 py-3 font-mono text-xs font-semibold text-primary align-top whitespace-nowrap">
                          {enc.patientId}
                        </td>
                        <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground align-top whitespace-nowrap">
                          {enc.encounterId}
                        </td>
                        <td className="px-3 py-3 text-[11px] text-muted-foreground align-top whitespace-nowrap">
                          {enc.date}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="space-y-1">
                            <CountBadge n={enc.textHighlights.length} />
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                              {highlightText(
                                enc.text.replace(/\n/g, ' ').replace(/\s+/g, ' '),
                                enc.textHighlights,
                                phraseColorMap,
                              )}
                            </p>
                          </div>
                        </td>
                        {activeColumns.map((col) => {
                          const isChosen = best === col.id;
                          const isTie = best === 'tie';
                          const items = parseItems(modelResponse(enc, col.id));
                          return (
                            <td key={col.id} className={[
                              'px-3 py-3 text-xs leading-relaxed align-top',
                              isChosen ? 'bg-emerald-500/5' : isTie ? 'bg-amber-500/5' : '',
                            ].join(' ')}>
                              <div className="space-y-1">
                                <CountBadge n={items.length} />
                                <p className="line-clamp-2">{renderModelItems(items, phraseColorMap)}</p>
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 align-top whitespace-nowrap">
                          {best === null ? (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          ) : best === 'tie' ? (
                            <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-0">
                              Tie
                            </Badge>
                          ) : (
                            <Badge variant="success" className="text-[10px]">
                              {AVAILABLE_MODELS.find((m) => m.id === best)?.label ?? best}
                            </Badge>
                          )}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr className="bg-muted/10">
                          <td colSpan={totalColumns} className="p-0">
                            <div className="px-6 py-5 space-y-5 border-t border-b-2 border-primary/20">
                              {/* Meta header */}
                              <div className="flex items-center gap-3 flex-wrap">
                                <Badge variant="secondary" className="font-mono text-[10px]">{enc.patientId}</Badge>
                                <Badge variant="secondary" className="font-mono text-[10px]">{enc.encounterId}</Badge>
                                <span className="text-[11px] text-muted-foreground">{enc.date}</span>
                              </div>

                              {/* Clinical text */}
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Clinical Text</p>
                                  <CountBadge n={enc.textHighlights.length} label="comorbidities found" />
                                </div>
                                <div className="rounded-xl border bg-card p-4">
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {highlightText(enc.text, enc.textHighlights, phraseColorMap)}
                                  </p>
                                </div>
                              </div>

                              {/* Model responses side-by-side */}
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Model Evidence</p>
                                <div className={`grid gap-3 ${activeColumns.length === 1 ? 'grid-cols-1' : activeColumns.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                                  {activeColumns.map((col) => {
                                    const isChosen = best === col.id;
                                    const isTie = best === 'tie';
                                    const items = parseItems(modelResponse(enc, col.id));
                                              return (
                                      <div
                                        key={col.id}
                                        className={[
                                          'rounded-xl border-2 p-4 transition-colors',
                                          isChosen ? 'border-emerald-500/50 bg-emerald-500/5' :
                                          isTie ? 'border-amber-500/40 bg-amber-500/5' :
                                          'border-border bg-card',
                                        ].join(' ')}
                                      >
                                        <div className="flex items-center justify-between mb-2 gap-2">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <div className="min-w-0">
                                              <p className="text-sm font-semibold truncate">{col.label}</p>
                                              <p className="text-[10px] text-muted-foreground">{col.sublabel}</p>
                                            </div>
                                            <CountBadge n={items.length} />
                                          </div>
                                          {isChosen && <Badge variant="success" className="text-[9px] shrink-0">Best</Badge>}
                                          {isTie && <Badge variant="secondary" className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-0 shrink-0">Tie</Badge>}
                                        </div>
                                        <p className="text-sm leading-relaxed">{renderModelItems(items, phraseColorMap)}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Best response picker */}
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Best Response</p>
                                <div className="flex flex-wrap items-center gap-2">
                                  {activeColumns.map((col) => {
                                    const active = best === col.id;
                                    return (
                                      <button
                                        key={col.id}
                                        onClick={(e) => { e.stopPropagation(); setBest(enc.encounterId, col.id); }}
                                        className={[
                                          'flex items-center gap-1.5 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all cursor-pointer',
                                          active
                                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                            : 'border-border bg-card hover:border-primary/40',
                                        ].join(' ')}
                                      >
                                        {active && <Check className="h-3.5 w-3.5" />}
                                        {col.label}
                                      </button>
                                    );
                                  })}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setBest(enc.encounterId, 'tie'); }}
                                    className={[
                                      'flex items-center gap-1.5 rounded-lg border-2 px-4 py-2 text-sm font-medium transition-all cursor-pointer',
                                      best === 'tie'
                                        ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                        : 'border-border bg-card hover:border-amber-500/40',
                                    ].join(' ')}
                                  >
                                    {best === 'tie' && <Check className="h-3.5 w-3.5" />}
                                    Tie (both similar)
                                  </button>
                                  {best !== null && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setBest(enc.encounterId, null); }}
                                      className="text-[11px] text-muted-foreground hover:text-foreground underline ml-1"
                                    >
                                      clear
                                    </button>
                                  )}

                                  <div className="ml-auto flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setExpandedId(null); }}>
                                      Close
                                    </Button>
                                    <Button size="sm" className="gap-1.5" onClick={(e) => { e.stopPropagation(); gotoNextUnreviewed(enc.encounterId); }}>
                                      Next Unreviewed
                                      <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer summary */}
          <div className="border-t bg-muted/20 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {MOCK_ENCOUNTERS.length} encounters · {new Set(MOCK_ENCOUNTERS.map((e) => e.patientId)).size} patients · Mock data
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {activeColumns.map((col) => {
                const count = Object.values(bestPicks).filter((v) => v === col.id).length;
                if (!count) return null;
                return (
                  <Badge key={col.id} variant="secondary" className="text-[10px] px-2 gap-1">
                    {col.label}: <span className="font-bold">{count}</span>
                  </Badge>
                );
              })}
              {Object.values(bestPicks).filter((v) => v === 'tie').length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-2 gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-0">
                  Tie: <span className="font-bold">{Object.values(bestPicks).filter((v) => v === 'tie').length}</span>
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {reviewedCount}/{MOCK_ENCOUNTERS.length} reviewed
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modern view */}
      {hasRun && viewMode === 'modern' && (
        <div className="rounded-2xl border-2 border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table
              className="text-sm"
              style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}
            >
              <colgroup>
                <col style={{ width: colWidths.caret }} />
                <col style={{ width: colWidths.patientId }} />
                <col style={{ width: colWidths.encounterId }} />
                <col style={{ width: colWidths.date }} />
                <col style={{ width: colWidths.text }} />
                {activeColumns.map((col) => (
                  <col key={col.id} style={{ width: colWidths[`model-${col.id}`] ?? 240 }} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-2 py-3"></th>
                  {[
                    { key: 'patientId', label: 'Patient ID', sublabel: null },
                    { key: 'encounterId', label: 'Encounter ID', sublabel: null },
                    { key: 'date', label: 'Date', sublabel: null },
                    { key: 'text', label: 'Clinical Text', sublabel: null },
                  ].map((h) => (
                    <th key={h.key} className="relative px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <div className="truncate pr-2">{h.label}</div>
                      <div
                        onMouseDown={(e) => startResize(h.key, e)}
                        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize group hover:bg-primary/40 active:bg-primary flex items-center justify-center"
                        title="Drag to resize"
                      >
                        <GripVertical className="h-3 w-3 text-transparent group-hover:text-primary/60 absolute" />
                      </div>
                    </th>
                  ))}
                  {activeColumns.map((col) => (
                    <th key={col.id} className="relative px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <div className="truncate pr-2">
                        <div>{col.label}</div>
                        <div className="text-[10px] font-normal normal-case text-muted-foreground/60">{col.sublabel}</div>
                      </div>
                      <div
                        onMouseDown={(e) => startResize(`model-${col.id}`, e)}
                        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize group hover:bg-primary/40 active:bg-primary flex items-center justify-center"
                        title="Drag to resize"
                      >
                        <GripVertical className="h-3 w-3 text-transparent group-hover:text-primary/60 absolute" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_ENCOUNTERS.map((enc, idx) => {
                  const best = bestPicks[enc.encounterId] ?? null;
                  const isExpanded = expandedId === enc.encounterId;
                  const prevPatient = idx > 0 ? MOCK_ENCOUNTERS[idx - 1].patientId : null;
                  const newPatientGroup = enc.patientId !== prevPatient;
                  const isTie = best === 'tie';
                  const getResp = (mid: string) => modelResponse(enc, mid);
                  const phraseColorMap = buildPhraseColorMap(enc.textHighlights, selectedModels, getResp);

                  return (
                    <Fragment key={enc.encounterId}>
                      {/* Summary row */}
                      <tr
                        onClick={() => toggleRow(enc.encounterId)}
                        className={[
                          'cursor-pointer transition-colors',
                          newPatientGroup ? 'border-t-2 border-border' : 'border-t border-border/40',
                          isExpanded ? 'bg-primary/5' : 'hover:bg-muted/30',
                        ].join(' ')}
                      >
                        <td className="px-2 py-3 align-top">
                          <ChevronDown
                            className={[
                              'h-4 w-4 text-muted-foreground transition-transform',
                              isExpanded ? 'rotate-0' : '-rotate-90',
                            ].join(' ')}
                          />
                        </td>
                        <td className="px-3 py-3 align-top overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold text-primary truncate">{enc.patientId}</span>
                            {best !== null && (
                              isTie ? (
                                <span className="inline-flex items-center rounded-full bg-amber-500/15 px-1.5 py-0 text-[9px] font-bold text-amber-700 dark:text-amber-300 shrink-0">TIE</span>
                              ) : (
                                <Crown className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0 fill-emerald-500/20" />
                              )
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground align-top truncate">
                          {enc.encounterId}
                        </td>
                        <td className="px-3 py-3 text-[11px] text-muted-foreground align-top truncate">
                          {enc.date}
                        </td>
                        <td className="px-3 py-3 align-top overflow-hidden">
                          {isExpanded ? (
                            <div className="space-y-3">
                              <div>
                                <CountBadge n={enc.textHighlights.length} label="comorbidities found" />
                              </div>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {highlightText(enc.text, enc.textHighlights, phraseColorMap)}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setBest(enc.encounterId, isTie ? null : 'tie'); }}
                                  className={[
                                    'flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-all cursor-pointer',
                                    isTie
                                      ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                      : 'border-border hover:border-amber-500/40 text-muted-foreground',
                                  ].join(' ')}
                                >
                                  {isTie && <Check className="h-3 w-3" />}
                                  Tie
                                </button>
                                {best !== null && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setBest(enc.encounterId, null); }}
                                    className="text-[11px] text-muted-foreground hover:text-foreground underline"
                                  >
                                    clear
                                  </button>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); gotoNextUnreviewed(enc.encounterId); }}
                                  className="ml-auto flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                                >
                                  Next <ArrowRight className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <CountBadge n={enc.textHighlights.length} />
                              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                {highlightText(
                                  enc.text.replace(/\n/g, ' ').replace(/\s+/g, ' '),
                                  enc.textHighlights,
                                  phraseColorMap,
                                )}
                              </p>
                            </div>
                          )}
                        </td>
                        {activeColumns.map((col) => {
                          const isChosen = best === col.id;
                          const items = parseItems(modelResponse(enc, col.id));
                          return (
                            <td
                              key={col.id}
                              className={[
                                'relative px-3 py-3 leading-relaxed align-top overflow-hidden group/cell',
                                isChosen ? 'bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/40' :
                                isTie ? 'bg-amber-500/5' : '',
                              ].join(' ')}
                            >
                              <div className="flex items-start gap-1.5">
                                <div className="flex-1 space-y-1 min-w-0">
                                  <CountBadge n={items.length} />
                                  <p className={[
                                    isExpanded ? 'text-sm' : 'text-xs line-clamp-2',
                                  ].join(' ')}>
                                    {renderModelItems(items, phraseColorMap)}
                                  </p>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBest(enc.encounterId, isChosen ? null : col.id);
                                  }}
                                  title={isChosen ? 'Unpick as best' : 'Mark as best response'}
                                  className={[
                                    'shrink-0 flex h-5 w-5 items-center justify-center rounded transition-all sticky top-3',
                                    isChosen
                                      ? 'text-emerald-600 dark:text-emerald-400 opacity-100'
                                      : isExpanded
                                        ? 'text-muted-foreground opacity-60 hover:opacity-100 hover:text-emerald-600'
                                        : 'text-muted-foreground opacity-0 group-hover/cell:opacity-60 hover:!opacity-100 hover:text-emerald-600',
                                  ].join(' ')}
                                >
                                  <Crown className={['h-3.5 w-3.5', isChosen ? 'fill-emerald-500/30' : ''].join(' ')} />
                                </button>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer summary */}
          <div className="border-t bg-muted/20 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {MOCK_ENCOUNTERS.length} encounters · {new Set(MOCK_ENCOUNTERS.map((e) => e.patientId)).size} patients · Drag column edges to resize
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {activeColumns.map((col) => {
                const count = Object.values(bestPicks).filter((v) => v === col.id).length;
                if (!count) return null;
                return (
                  <Badge key={col.id} variant="secondary" className="text-[10px] px-2 gap-1">
                    {col.label}: <span className="font-bold">{count}</span>
                  </Badge>
                );
              })}
              {Object.values(bestPicks).filter((v) => v === 'tie').length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-2 gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-0">
                  Tie: <span className="font-bold">{Object.values(bestPicks).filter((v) => v === 'tie').length}</span>
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {reviewedCount}/{MOCK_ENCOUNTERS.length} reviewed
              </span>
            </div>
          </div>
        </div>
      )}

      {!hasRun && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Play className="h-5 w-5" />
          </div>
          <p className="text-sm font-medium">Configure your run and hit Run to compare models</p>
          <p className="text-xs text-muted-foreground">Results will appear here with FP16 and Gemini side-by-side</p>
        </div>
      )}
    </div>
  );
}
