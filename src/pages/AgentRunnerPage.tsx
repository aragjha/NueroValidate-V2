import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { AGENT_LIBRARY } from '@/data/agents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import type { AgentDef, AgentFinding, AgentRunOutput, CustomAgent } from '@/types';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Columns2,
  Cpu,
  DollarSign,
  Download,
  FileText,
  Flag,
  Hash,
  Info,
  Layers,
  Loader2,
  Play,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Sparkles,
  X,
  XCircle,
  Zap,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────
   TYPES
   ──────────────────────────────────────────────────────────── */

type RunMode = 'single' | 'multi';
type RunPhase = 'config' | 'running' | 'done';
type MultiView = 'tabs' | 'split';
type FindingAction = 'approved' | 'flagged' | 'rejected' | null;

/* ────────────────────────────────────────────────────────────
   SEVERITY HELPERS
   ──────────────────────────────────────────────────────────── */

const SEVERITY_CONFIG: Record<
  AgentFinding['severity'],
  { color: string; bg: string; border: string; icon: typeof ShieldAlert }
> = {
  critical: { color: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: ShieldX },
  high: { color: 'text-orange-600', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: ShieldAlert },
  medium: { color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/30', icon: AlertTriangle },
  low: { color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Shield },
  info: { color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/30', icon: Info },
};

const FINDING_TYPE_BADGE: Record<AgentFinding['type'], 'destructive' | 'success' | 'warning' | 'processing'> = {
  issue: 'destructive',
  pass: 'success',
  warning: 'warning',
  info: 'processing',
};

/* ────────────────────────────────────────────────────────────
   MOCK FINDING GENERATOR
   ──────────────────────────────────────────────────────────── */

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function uid() {
  return `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const AGENT_FINDINGS_MAP: Record<string, Omit<AgentFinding, 'id' | 'confidence'>[]> = {
  'agent-correctness': [
    { type: 'issue', title: 'Dosage value mismatch', detail: 'Chart notes 200mg but extraction recorded 20mg for fremanezumab. This 10x discrepancy could lead to incorrect dosing conclusions.', evidence: '"Patient administered fremanezumab 225mg/1.5mL subcutaneous injection monthly" — Source: ENC-441290, Page 3', location: 'ENC-441290 / Patient P-10042', severity: 'critical' },
    { type: 'pass', title: 'Diagnosis code correctly extracted', detail: 'Patient diagnosis code ICD-10 G43.909 (Migraine, unspecified, not intractable) correctly extracted and mapped to primary condition.', evidence: '"Assessment: G43.909 - Migraine, unspecified, not intractable, without status migrainosus" — Source: ENC-441290', location: 'ENC-441290 / Patient P-10042', severity: 'info' },
    { type: 'warning', title: 'Ambiguous treatment duration', detail: 'Ambiguous treatment duration — "approximately 3 months" extracted as exactly 90 days. Consider flagging for manual review.', evidence: '"Patient has been on galcanezumab for approximately 3 months with moderate relief" — Source: ENC-557831', location: 'ENC-557831 / Patient P-10088', severity: 'medium' },
    { type: 'pass', title: 'Lab values within expected range', detail: 'All extracted lab values (CBC, CMP, hepatic panel) match source documents within acceptable rounding tolerance.', severity: 'info' },
    { type: 'issue', title: 'Medication frequency error', detail: 'Extraction records "daily" administration but source specifies "every other day" for topiramate 50mg. This misclassification affects treatment pattern analysis.', evidence: '"Topiramate 50mg PO every other day for migraine prophylaxis" — Source: ENC-339201', location: 'ENC-339201 / Patient P-10015', severity: 'high' },
    { type: 'warning', title: 'BMI calculation discrepancy', detail: 'Extracted BMI of 28.4 differs from calculated BMI of 27.9 based on extracted height/weight values. Minor but worth verification.', severity: 'low' },
  ],
  'agent-evidence': [
    { type: 'issue', title: 'Unsupported improvement claim', detail: 'Claim "patient showed significant improvement" has no supporting source passage. No quantitative or qualitative evidence of improvement found in referenced encounters.', location: 'ENC-883100 / Patient P-10055', severity: 'high' },
    { type: 'pass', title: 'CGRP inhibitor evidence properly cited', detail: 'CGRP inhibitor prescription evidence properly cited from encounter note ENC-883100. Source passage directly supports the extracted claim.', evidence: '"Started erenumab 70mg SC monthly, first dose administered in clinic on 2025-03-15" — Source: ENC-883100', location: 'ENC-883100 / Patient P-10055', severity: 'info' },
    { type: 'issue', title: 'Missing source for prior therapy claim', detail: 'Extraction states "patient failed 2 prior preventive therapies" but only one therapy (topiramate) is documented in source records. Second therapy reference cannot be grounded.', evidence: '"Prior medications: topiramate 100mg — discontinued due to cognitive side effects" — Source: ENC-771042', location: 'ENC-771042 / Patient P-10033', severity: 'high' },
    { type: 'pass', title: 'All encounter dates verified', detail: 'All 8 encounter dates referenced in the extraction match source document timestamps exactly.', severity: 'info' },
    { type: 'warning', title: 'Weak evidence link for comorbidity', detail: 'Depression comorbidity claim is linked to a screening questionnaire score (PHQ-9: 12) rather than a formal diagnosis. Evidence exists but may not meet clinical threshold.', evidence: '"PHQ-9 score: 12 (moderate depression symptoms)" — Source: ENC-883100', location: 'ENC-883100 / Patient P-10055', severity: 'medium' },
  ],
  'agent-hallucination': [
    { type: 'issue', title: 'Fabricated encounter reference', detail: 'Fabricated reference: "Dr. Smith noted improvement on 2025-06-15" — no encounter exists on this date in patient records. No provider named "Dr. Smith" found in system.', location: 'Patient P-10077', severity: 'critical' },
    { type: 'pass', title: 'All clinical claims verified', detail: 'All 12 clinical claims verified against source documents. No fabricated or unsupported assertions detected in this extraction batch.', severity: 'info' },
    { type: 'issue', title: 'Invented lab result', detail: 'Extraction contains "ESR 42 mm/hr" but no erythrocyte sedimentation rate test exists in patient records. This value appears to be fabricated.', location: 'Patient P-10091', severity: 'critical' },
    { type: 'warning', title: 'Paraphrased beyond source meaning', detail: 'Source states "headache frequency reduced" but extraction claims "migraine attacks eliminated." The paraphrasing significantly overstates the source evidence.', evidence: '"Patient reports headache frequency reduced from 12/month to 8/month" — Source: ENC-662103', location: 'ENC-662103 / Patient P-10044', severity: 'high' },
    { type: 'pass', title: 'Medication list matches formulary', detail: 'All 5 medications listed in extraction confirmed against pharmacy records and encounter notes.', severity: 'info' },
  ],
  'agent-negation': [
    { type: 'issue', title: 'Negated seizure history missed', detail: 'Negated mention missed: "patient denies history of seizures" extracted as positive seizure history. This false positive would incorrectly exclude the patient.', evidence: '"ROS: Patient denies history of seizures, syncope, or loss of consciousness" — Source: ENC-441290', location: 'ENC-441290 / Patient P-10042', severity: 'critical' },
    { type: 'warning', title: 'Double negation ambiguity', detail: 'Double negation detected: "not inconsistent with diagnosis" — verify intended meaning. Current extraction interprets as positive confirmation.', evidence: '"Imaging findings are not inconsistent with a diagnosis of chronic migraine" — Source: ENC-557831', location: 'ENC-557831 / Patient P-10088', severity: 'medium' },
    { type: 'pass', title: 'Allergy negations correctly handled', detail: 'All 4 negated allergy mentions ("no known allergies to...") correctly identified and excluded from positive allergy list.', severity: 'info' },
    { type: 'issue', title: 'Conditional negation misinterpreted', detail: '"No improvement unless dose is increased" misinterpreted as "no improvement." The conditional clause changes the clinical meaning.', evidence: '"No improvement in migraine frequency unless fremanezumab dose is increased to 675mg quarterly" — Source: ENC-339201', location: 'ENC-339201 / Patient P-10015', severity: 'high' },
    { type: 'pass', title: 'Family history negations detected', detail: 'Correctly identified "no family history of stroke" as negated mention across 6 patient records.', severity: 'info' },
    { type: 'warning', title: 'Hedged negation requires review', detail: '"Patient is unlikely to have MS" treated as definitive negative. Consider marking as uncertain rather than confirmed negative.', severity: 'medium' },
  ],
  'agent-eligibility': [
    { type: 'issue', title: 'Compound criterion conflict', detail: 'Compound criterion conflict: patient meets A (migraine >= 4/mo) but fails B (no prior CGRP use). Eligibility engine marked as "Eligible" without checking all criteria.', evidence: '"Migraine frequency: 8 episodes per month. No prior CGRP inhibitor therapy documented." — Source: ENC-883100', location: 'Patient P-10055', severity: 'high' },
    { type: 'pass', title: 'All inclusion criteria satisfied', detail: 'All 5 inclusion criteria satisfied with supporting evidence. Patient clearly meets age, diagnosis, frequency, prior therapy, and consent requirements.', severity: 'info' },
    { type: 'issue', title: 'Exclusion criterion overlooked', detail: 'Patient has documented medication overuse headache (ICD-10: G44.41) which is an exclusion criterion, but eligibility was marked as "Eligible."', evidence: '"Diagnosis: G44.41 - Drug-induced headache, not elsewhere classified" — Source: ENC-771042', location: 'Patient P-10033', severity: 'critical' },
    { type: 'warning', title: 'Age boundary edge case', detail: 'Patient age is exactly 18.0 years at enrollment date. Inclusion criterion states ">= 18 years" which is satisfied, but verify birth date precision.', location: 'Patient P-10099', severity: 'low' },
    { type: 'pass', title: 'Washout period verified', detail: 'Required 30-day washout period from prior preventive therapy confirmed. Last dose of valproate was 45 days before enrollment.', severity: 'info' },
  ],
  'agent-date': [
    { type: 'issue', title: 'Impossible date detected', detail: 'Encounter date "2025-02-30" is invalid — February has at most 28/29 days. Data entry error likely.', location: 'ENC-901234 / Patient P-10061', severity: 'critical' },
    { type: 'pass', title: 'Date format consistency verified', detail: 'All 47 dates in extraction batch use ISO 8601 format (YYYY-MM-DD) consistently.', severity: 'info' },
    { type: 'warning', title: 'Future date in historical record', detail: 'Encounter dated 2026-12-15 appears in historical records. Likely a typo — expected year 2025.', location: 'ENC-445577 / Patient P-10072', severity: 'high' },
    { type: 'issue', title: 'Chronological order violation', detail: 'Follow-up encounter (ENC-330100) dated before initial consultation (ENC-330099). Temporal sequence is logically impossible.', location: 'Patient P-10044', severity: 'high' },
    { type: 'pass', title: 'All birth dates within valid range', detail: 'All patient birth dates fall within the expected range (1940-2008) for the study population.', severity: 'info' },
  ],
  'agent-temporal': [
    { type: 'issue', title: 'Implausible treatment timeline', detail: 'Patient started and completed a 12-week treatment course within 3 calendar days according to extracted dates. Timeline is clinically implausible.', location: 'Patient P-10088', severity: 'critical' },
    { type: 'pass', title: 'Medication start/stop sequence valid', detail: 'All medication start and discontinuation dates follow logical temporal order across 14 prescriptions.', severity: 'info' },
    { type: 'warning', title: 'Gap in treatment continuity', detail: '90-day gap detected between last refill and next encounter. Patient may have been non-adherent during this period.', location: 'Patient P-10015', severity: 'medium' },
    { type: 'pass', title: 'Encounter spacing plausible', detail: 'Follow-up visit intervals (4-8 weeks) align with standard neurology follow-up protocols.', severity: 'info' },
    { type: 'warning', title: 'Diagnosis predates symptom onset', detail: 'Formal migraine diagnosis date precedes documented first symptom mention by 6 months. Verify if prior records exist.', location: 'Patient P-10033', severity: 'medium' },
  ],
  'agent-completeness': [
    { type: 'issue', title: 'Missing required field: prior therapies', detail: 'The "prior_preventive_therapies" field is empty for 3 patients who have documented treatment history in source records. Extraction is incomplete.', location: 'Patients P-10042, P-10055, P-10088', severity: 'high' },
    { type: 'pass', title: 'All demographic fields populated', detail: 'All required demographic fields (age, sex, race, ethnicity, BMI) are populated for 100% of patients in batch.', severity: 'info' },
    { type: 'warning', title: 'Low evidence density for criterion', detail: 'Criterion "prior_therapy_failure" has only 1 supporting evidence passage where protocol expects >= 2 independent sources.', location: 'Patient P-10099', severity: 'medium' },
    { type: 'pass', title: 'Encounter coverage complete', detail: 'All encounters within study window (2024-01 to 2025-12) have been processed. No gaps in coverage detected.', severity: 'info' },
    { type: 'issue', title: 'Unresolved criterion', detail: 'Inclusion criterion "documented_headache_diary" has no evidence for or against. Criterion left as "Unresolved" for 7 patients.', location: 'Multiple patients', severity: 'high' },
  ],
  'agent-numerical': [
    { type: 'issue', title: 'Out-of-range lab value', detail: 'Extracted hemoglobin value of 45 g/dL is physiologically impossible (normal range 12-17 g/dL). Likely a decimal point error — should be 14.5 g/dL.', location: 'Patient P-10061 / Lab-9987', severity: 'critical' },
    { type: 'pass', title: 'Vital signs within clinical range', detail: 'All extracted vital signs (BP, HR, RR, Temp, SpO2) fall within clinically plausible ranges for 25 patient records.', severity: 'info' },
    { type: 'warning', title: 'Migraine frequency at threshold boundary', detail: 'Extracted migraine frequency of 4.0/month is exactly at inclusion threshold (>= 4/month). Confirm precision of source data.', evidence: '"Average migraine days: approximately 4 per month" — Source: ENC-662103', location: 'Patient P-10044', severity: 'medium' },
    { type: 'pass', title: 'BMI calculations verified', detail: 'All 25 BMI values recalculated from height and weight — all match within 0.1 tolerance.', severity: 'info' },
  ],
  'agent-unit': [
    { type: 'issue', title: 'Unit mismatch: mg vs mcg', detail: 'Extraction records "fremanezumab 225 mcg" but source states "225 mg." This 1000x error would produce a clinically dangerous interpretation.', evidence: '"Fremanezumab 225mg subcutaneous injection" — Source: ENC-441290', location: 'ENC-441290 / Patient P-10042', severity: 'critical' },
    { type: 'pass', title: 'Glucose units consistent', detail: 'All glucose measurements consistently extracted in mg/dL. No mmol/L to mg/dL conversion errors detected.', severity: 'info' },
    { type: 'warning', title: 'Ambiguous weight unit', detail: 'Patient weight extracted as "150" without unit. Context suggests pounds (lbs) but system default is kilograms (kg). Verify.', location: 'Patient P-10077', severity: 'high' },
    { type: 'pass', title: 'Temperature units standardized', detail: 'All temperature values confirmed in Fahrenheit with correct conversions where Celsius source was used.', severity: 'info' },
  ],
  'agent-terminology': [
    { type: 'issue', title: 'Incorrect ICD-10 mapping', detail: 'Term "chronic migraine" mapped to G43.909 (unspecified migraine) instead of G43.709 (chronic migraine without aura). This affects study population classification.', location: 'Patient P-10042', severity: 'high' },
    { type: 'pass', title: 'SNOMED CT codes validated', detail: 'All 15 SNOMED CT codes in extraction batch are valid and current in the 2025-01 release.', severity: 'info' },
    { type: 'warning', title: 'Deprecated RxNorm code', detail: 'RxNorm code 1992104 for erenumab has been deprecated. Current code is 2173507. Extraction used the older code.', location: 'Patient P-10055', severity: 'medium' },
    { type: 'pass', title: 'MedDRA preferred terms matched', detail: 'All adverse event terms correctly mapped to MedDRA preferred terms at the PT level.', severity: 'info' },
    { type: 'issue', title: 'Unmapped clinical abbreviation', detail: 'Abbreviation "MOH" not mapped to standard term. In this context it refers to "Medication Overuse Headache" (ICD-10: G44.41), not an abbreviation for the provider.', location: 'ENC-771042', severity: 'medium' },
  ],
  'agent-conflict': [
    { type: 'issue', title: 'Contradictory diagnoses across encounters', detail: 'ENC-441290 documents "episodic migraine" while ENC-557831 documents "chronic migraine" for the same patient with overlapping date ranges. These are mutually exclusive classifications.', location: 'Patient P-10042', severity: 'high' },
    { type: 'pass', title: 'Medication list consistent', detail: 'Active medication lists are consistent across all 6 encounters for this patient. No contradictory prescriptions detected.', severity: 'info' },
    { type: 'warning', title: 'Agent disagreement on eligibility', detail: 'Correctness Agent marked patient as eligible but Eligibility Logic Agent flagged exclusion criterion. Cross-agent conflict requires resolution.', location: 'Patient P-10033', severity: 'high' },
    { type: 'pass', title: 'Demographic data consistent', detail: 'Patient demographics (DOB, sex, race) are consistent across all source documents.', severity: 'info' },
  ],
  'agent-uncertainty': [
    { type: 'warning', title: 'Hedge language in diagnosis', detail: '"Likely consistent with chronic migraine" contains hedge language. Extraction treated this as a confirmed diagnosis — consider flagging as uncertain.', evidence: '"Presentation is likely consistent with chronic migraine, though cluster headache cannot be entirely ruled out" — Source: ENC-557831', location: 'ENC-557831 / Patient P-10088', severity: 'medium' },
    { type: 'pass', title: 'Definitive assertions verified', detail: '18 of 22 clinical assertions use definitive language and are appropriately marked as high-confidence extractions.', severity: 'info' },
    { type: 'warning', title: 'Speculative treatment outcome', detail: '"Treatment appears to be working" is speculative. No objective metrics provided to support efficacy claim.', evidence: '"Based on patient self-report, treatment appears to be working, though headache diary was not reviewed" — Source: ENC-883100', location: 'ENC-883100 / Patient P-10055', severity: 'medium' },
    { type: 'issue', title: 'High-stakes assertion with low confidence', detail: 'Eligibility determination relies on an assertion ("no prior CGRP therapy") that uses uncertain language ("as far as we know"). This should not be treated as definitive.', location: 'Patient P-10055', severity: 'high' },
    { type: 'pass', title: 'Surgical history assertions definitive', detail: 'All surgical history extractions use definitive language with corroborating operative notes.', severity: 'info' },
  ],
  'agent-prompt-eval': [
    { type: 'warning', title: 'Extraction prompt lacks edge case handling', detail: 'The extraction prompt for "prior_preventive_therapies" does not specify how to handle off-label medications or supplements used for migraine prevention.', severity: 'medium' },
    { type: 'pass', title: 'Reasoning prompt well-structured', detail: 'The reasoning prompt uses clear chain-of-thought structure with explicit instruction for evidence citation. Score: 92/100.', severity: 'info' },
    { type: 'issue', title: 'Ambiguous instruction in prompt', detail: 'Prompt contains "extract relevant medications" without defining what "relevant" means in this context. This allows for inconsistent interpretation across records.', severity: 'high' },
    { type: 'warning', title: 'Token-heavy prompt', detail: 'Eligibility reasoning prompt uses 2,847 tokens — consider condensing. Similar accuracy achieved with 1,500 token prompts in benchmark tests.', severity: 'low' },
    { type: 'pass', title: 'Output format specification clear', detail: 'JSON output schema is well-defined with required fields, types, and example values.', severity: 'info' },
  ],
  'agent-bias': [
    { type: 'issue', title: 'Demographic extraction bias detected', detail: 'Extraction accuracy is 94% for English-language records but drops to 76% for records with Spanish-language clinical notes. Language bias affects 12% of the study population.', severity: 'high' },
    { type: 'pass', title: 'Gender-neutral extraction confirmed', detail: 'No statistically significant difference in extraction accuracy between male and female patient records (p = 0.82).', severity: 'info' },
    { type: 'warning', title: 'Age-related confidence disparity', detail: 'Average confidence score for patients >65 years (0.78) is significantly lower than for patients 18-45 years (0.91). May reflect documentation style differences in geriatric notes.', severity: 'medium' },
    { type: 'pass', title: 'Provider bias not detected', detail: 'Extraction accuracy is consistent across all 7 provider sites (range: 89-93%).', severity: 'info' },
    { type: 'warning', title: 'Socioeconomic proxy variable leakage', detail: 'Insurance type (used as proxy for socioeconomic status) correlates with eligibility determination (r=0.34). Investigate whether this reflects clinical reality or extraction bias.', severity: 'medium' },
  ],
};

function generateMockFindings(agentId: string): AgentFinding[] {
  const templates = AGENT_FINDINGS_MAP[agentId];
  if (!templates) {
    // Fallback for custom agents or unknown IDs
    return [
      { id: uid(), type: 'pass', title: 'General validation passed', detail: 'All records processed without critical findings. Agent completed within expected parameters.', severity: 'info', confidence: +rand(0.85, 0.99).toFixed(2) },
      { id: uid(), type: 'warning', title: 'Minor data inconsistency detected', detail: 'One or more records contain minor inconsistencies that do not affect overall data integrity. Manual review recommended for flagged entries.', severity: 'medium', confidence: +rand(0.72, 0.92).toFixed(2) },
      { id: uid(), type: 'issue', title: 'Potential extraction anomaly', detail: 'An unusual pattern was detected in the extraction output. The agent identified a value that deviates from expected norms for this data type.', severity: 'high', confidence: +rand(0.72, 0.88).toFixed(2) },
      { id: uid(), type: 'pass', title: 'Schema compliance verified', detail: 'All output fields conform to the expected schema. No missing or malformed values detected in the extraction.', severity: 'info', confidence: +rand(0.90, 0.99).toFixed(2) },
    ];
  }

  // Pick 4-8 random findings from templates
  const count = Math.floor(rand(4, Math.min(templates.length + 1, 9)));
  const shuffled = [...templates].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((t) => ({
    ...t,
    id: uid(),
    confidence: +rand(0.72, 0.99).toFixed(2),
  }));
}

function generateMockOutput(agent: AgentDef): AgentRunOutput {
  const findings = generateMockFindings(agent.id);
  const issues = findings.filter((f) => f.type === 'issue').length;
  const warnings = findings.filter((f) => f.type === 'warning').length;
  const passes = findings.filter((f) => f.type === 'pass').length;
  const avgConf = findings.reduce((s, f) => s + f.confidence, 0) / findings.length;
  const tokens = Math.floor(rand(8000, 42000));
  const costPerToken = 0.000003;

  return {
    agentId: agent.id,
    agentName: agent.name,
    status: 'Completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date(Date.now() + Math.floor(rand(1500, 3500))).toISOString(),
    findings,
    summary: `${agent.name} processed the selected records and identified ${findings.length} findings: ${issues} issue${issues !== 1 ? 's' : ''}, ${warnings} warning${warnings !== 1 ? 's' : ''}, and ${passes} pass${passes !== 1 ? 'es' : ''}. ${issues > 0 ? 'Critical and high-severity issues require immediate attention before data can be considered validated.' : 'No critical issues were detected; data quality meets validation thresholds.'} Average confidence across all findings is ${(avgConf * 100).toFixed(1)}%.`,
    confidence: +avgConf.toFixed(2),
    processingTime: `${rand(1.5, 4.2).toFixed(1)}s`,
    tokenUsage: tokens,
    cost: `$${(tokens * costPerToken).toFixed(4)}`,
  };
}

/* ────────────────────────────────────────────────────────────
   COMPONENT: AgentRunnerPage
   ──────────────────────────────────────────────────────────── */

export function AgentRunnerPage() {
  const navigate = useNavigate();
  const { projects, customAgents } = useAppContext();

  // Merge built-in and custom agents
  const allAgents = useMemo<(AgentDef | CustomAgent)[]>(
    () => [...AGENT_LIBRARY, ...customAgents],
    [customAgents],
  );

  const validationAgents = useMemo(() => allAgents.filter((a) => a.category === 'validation'), [allAgents]);
  const operationalAgents = useMemo(() => allAgents.filter((a) => a.category === 'operational'), [allAgents]);

  // Mode & phase
  const [mode, setMode] = useState<RunMode>('single');
  const [phase, setPhase] = useState<RunPhase>('config');

  // Configuration
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [sampleSize, setSampleSize] = useState<string>('25');
  const [patientIds, setPatientIds] = useState('');
  const [agentSearch, setAgentSearch] = useState('');

  // Results
  const [outputs, setOutputs] = useState<AgentRunOutput[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [overallProgress, setOverallProgress] = useState(0);

  // Multi-mode view
  const [multiView, setMultiView] = useState<MultiView>('tabs');
  const [activeAgentTab, setActiveAgentTab] = useState<string>('');
  const [splitLeft, setSplitLeft] = useState<string>('');
  const [splitRight, setSplitRight] = useState<string>('');

  // Findings state
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const [findingActions, setFindingActions] = useState<Record<string, FindingAction>>({});

  // Derived
  const selectedAgent = useMemo(() => allAgents.find((a) => a.id === selectedAgentId), [allAgents, selectedAgentId]);
  const selectedProject = useMemo(() => projects.find((p) => p.id === selectedProjectId), [projects, selectedProjectId]);

  const canRun = useMemo(() => {
    const hasAgent = mode === 'single' ? !!selectedAgentId : selectedAgentIds.size > 0;
    return hasAgent && !!selectedProjectId;
  }, [mode, selectedAgentId, selectedAgentIds, selectedProjectId]);

  const agentsToRun = useMemo(() => {
    if (mode === 'single') {
      return selectedAgent ? [selectedAgent] : [];
    }
    return allAgents.filter((a) => selectedAgentIds.has(a.id));
  }, [mode, selectedAgent, allAgents, selectedAgentIds]);

  const filteredAgents = useMemo(() => {
    if (!agentSearch) return allAgents;
    const q = agentSearch.toLowerCase();
    return allAgents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.shortName.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q),
    );
  }, [allAgents, agentSearch]);

  const filteredValidation = useMemo(() => filteredAgents.filter((a) => a.category === 'validation'), [filteredAgents]);
  const filteredOperational = useMemo(() => filteredAgents.filter((a) => a.category === 'operational'), [filteredAgents]);

  /* ── Run simulation ── */
  const handleRun = useCallback(() => {
    if (!canRun) return;
    setPhase('running');
    setOutputs([]);
    setExpandedFindings(new Set());
    setFindingActions({});

    const agents = agentsToRun;
    const totalAgents = agents.length;
    const progressMap: Record<string, number> = {};
    agents.forEach((a) => { progressMap[a.id] = 0; });
    setProgress({ ...progressMap });
    setOverallProgress(0);

    // Initialize pending outputs
    const pendingOutputs: AgentRunOutput[] = agents.map((a) => ({
      agentId: a.id,
      agentName: a.name,
      status: 'Pending',
      findings: [],
      summary: '',
      confidence: 0,
      processingTime: '0s',
      tokenUsage: 0,
      cost: '$0.00',
    }));
    setOutputs([...pendingOutputs]);

    // Simulate each agent with staggered start
    agents.forEach((agent, idx) => {
      const startDelay = idx * 400; // stagger start
      const duration = Math.floor(rand(1500, 2500));

      // Mark as running
      setTimeout(() => {
        setOutputs((prev) =>
          prev.map((o) =>
            o.agentId === agent.id
              ? { ...o, status: 'Running', startedAt: new Date().toISOString() }
              : o,
          ),
        );
      }, startDelay);

      // Progress ticks
      const ticks = 10;
      const tickInterval = duration / ticks;
      for (let t = 1; t <= ticks; t++) {
        setTimeout(() => {
          const pct = Math.min((t / ticks) * 100, 100);
          setProgress((prev) => {
            const next = { ...prev, [agent.id]: pct };
            // Overall progress
            const values = Object.values(next);
            const overall = values.reduce((s, v) => s + v, 0) / (totalAgents * 100) * 100;
            setOverallProgress(overall);
            return next;
          });
        }, startDelay + t * tickInterval);
      }

      // Complete
      setTimeout(() => {
        const mockOutput = generateMockOutput(agent);
        setOutputs((prev) =>
          prev.map((o) => (o.agentId === agent.id ? mockOutput : o)),
        );

        // Check if all done
        setTimeout(() => {
          setOutputs((prev) => {
            const allDone = prev.every((o) => o.status === 'Completed' || o.status === 'Failed');
            if (allDone) {
              setPhase('done');
              setOverallProgress(100);
              // Set default active tab for multi-mode
              if (prev.length > 0) {
                setActiveAgentTab(prev[0].agentId);
                setSplitLeft(prev[0].agentId);
                if (prev.length > 1) setSplitRight(prev[1].agentId);
              }
            }
            return prev;
          });
        }, 50);
      }, startDelay + duration);
    });
  }, [canRun, agentsToRun]);

  const handleReset = useCallback(() => {
    setPhase('config');
    setOutputs([]);
    setProgress({});
    setOverallProgress(0);
    setExpandedFindings(new Set());
    setFindingActions({});
  }, []);

  const toggleFinding = useCallback((findingId: string) => {
    setExpandedFindings((prev) => {
      const next = new Set(prev);
      if (next.has(findingId)) next.delete(findingId);
      else next.add(findingId);
      return next;
    });
  }, []);

  const setFindingAction = useCallback((findingId: string, action: FindingAction) => {
    setFindingActions((prev) => ({ ...prev, [findingId]: action }));
  }, []);

  const toggleMultiAgent = useCallback((agentId: string) => {
    setSelectedAgentIds((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  }, []);

  /* ────────────────────────────────────────────────────────────
     RENDER: Finding Card
     ──────────────────────────────────────────────────────────── */

  function renderFinding(finding: AgentFinding) {
    const sev = SEVERITY_CONFIG[finding.severity];
    const SevIcon = sev.icon;
    const expanded = expandedFindings.has(finding.id);
    const action = findingActions[finding.id] ?? null;

    return (
      <div key={finding.id} className={`rounded-xl border bg-card overflow-hidden transition-all ${expanded ? 'shadow-md' : ''}`}>
        <button
          className="flex items-start gap-3 w-full p-4 text-left cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => toggleFinding(finding.id)}
        >
          {/* Severity icon */}
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${sev.bg}`}>
            <SevIcon className={`h-4 w-4 ${sev.color}`} />
          </div>

          {/* Title + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold leading-tight">{finding.title}</span>
              <Badge
                variant={FINDING_TYPE_BADGE[finding.type]}
                className="rounded-full px-2 py-0 text-[9px] font-bold"
              >
                {finding.type}
              </Badge>
              <Badge
                variant="secondary"
                className="rounded-full px-2 py-0 text-[9px] font-bold"
              >
                {finding.severity}
              </Badge>
              {action && (
                <Badge
                  variant={action === 'approved' ? 'success' : action === 'flagged' ? 'warning' : 'destructive'}
                  className="rounded-full px-2 py-0 text-[9px] font-bold"
                >
                  {action}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{finding.detail}</p>
          </div>

          {/* Expand chevron */}
          <div className="shrink-0 pt-1">
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="border-t px-4 py-4 space-y-4">
            {/* Full detail */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Detail</p>
              <p className="text-sm leading-relaxed">{finding.detail}</p>
            </div>

            {/* Evidence */}
            {finding.evidence && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Evidence</p>
                <div className="bg-muted/30 rounded-lg p-3 border-l-4 border-primary">
                  <p className="text-sm italic leading-relaxed">{finding.evidence}</p>
                </div>
              </div>
            )}

            {/* Location */}
            {finding.location && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Location</p>
                <p className="text-sm font-mono">{finding.location}</p>
              </div>
            )}

            {/* Confidence */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Confidence: {(finding.confidence * 100).toFixed(0)}%
              </p>
              <Progress value={finding.confidence * 100} className="h-2" />
            </div>

            {/* Action buttons */}
            <Separator />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className={`rounded-full gap-1.5 cursor-pointer ${action === 'approved' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700' : 'text-emerald-600 border-emerald-300 hover:bg-emerald-50'}`}
                onClick={() => setFindingAction(finding.id, action === 'approved' ? null : 'approved')}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`rounded-full gap-1.5 cursor-pointer ${action === 'flagged' ? 'border-orange-500 bg-orange-500/10 text-orange-700' : 'text-orange-600 border-orange-300 hover:bg-orange-50'}`}
                onClick={() => setFindingAction(finding.id, action === 'flagged' ? null : 'flagged')}
              >
                <Flag className="h-3.5 w-3.5" /> Flag
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`rounded-full gap-1.5 cursor-pointer ${action === 'rejected' ? 'border-red-500 bg-red-500/10 text-red-700' : 'text-red-600 border-red-300 hover:bg-red-50'}`}
                onClick={() => setFindingAction(finding.id, action === 'rejected' ? null : 'rejected')}
              >
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────────
     RENDER: Agent Output Panel (used in single & multi modes)
     ──────────────────────────────────────────────────────────── */

  function renderAgentOutput(output: AgentRunOutput) {
    const issues = output.findings.filter((f) => f.type === 'issue').length;
    const warnings = output.findings.filter((f) => f.type === 'warning').length;
    const passes = output.findings.filter((f) => f.type === 'pass').length;

    return (
      <div className="space-y-4">
        {/* Summary card */}
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold">{output.agentName}</h3>
                  <Badge
                    variant={output.status === 'Completed' ? 'success' : output.status === 'Failed' ? 'destructive' : 'processing'}
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  >
                    {output.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Confidence: {(output.confidence * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Confidence gauge */}
            <div className="w-32">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>Confidence</span>
                <span className="font-bold text-foreground">{(output.confidence * 100).toFixed(0)}%</span>
              </div>
              <Progress value={output.confidence * 100} className="h-2.5" />
            </div>
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-4">
            {[
              { label: 'Findings', value: output.findings.length, icon: FileText },
              { label: 'Issues', value: issues, icon: ShieldAlert, highlight: issues > 0 },
              { label: 'Warnings', value: warnings, icon: AlertTriangle },
              { label: 'Passes', value: passes, icon: ShieldCheck },
              { label: 'Tokens', value: output.tokenUsage.toLocaleString(), icon: Hash },
              { label: 'Cost', value: output.cost, icon: DollarSign },
            ].map((m) => (
              <div key={m.label} className="rounded-lg bg-muted/50 p-2.5 text-center">
                <m.icon className={`h-3.5 w-3.5 mx-auto mb-1 ${m.highlight ? 'text-destructive' : 'text-muted-foreground'}`} />
                <p className={`text-sm font-bold ${m.highlight ? 'text-destructive' : ''}`}>{m.value}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Findings list */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Findings ({output.findings.length})
          </p>
          <div className="space-y-2">
            {output.findings
              .sort((a, b) => {
                const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
                return order[a.severity] - order[b.severity];
              })
              .map(renderFinding)}
          </div>
        </div>

        {/* Summary paragraph */}
        <div className="rounded-xl border bg-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Agent Summary</p>
          <p className="text-sm leading-relaxed">{output.summary}</p>
        </div>
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────────
     RENDER: Multi-Agent Comparison Table
     ──────────────────────────────────────────────────────────── */

  function renderComparisonTable() {
    if (outputs.length < 2) return null;

    const highestConf = Math.max(...outputs.map((o) => o.confidence));
    const lowestConf = Math.min(...outputs.map((o) => o.confidence));

    return (
      <div className="rounded-xl border bg-card p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Comparison Summary
        </p>
        <div className="rounded-lg border overflow-hidden overflow-x-auto">
          <div className="grid grid-cols-[1.5fr_0.7fr_0.7fr_0.8fr_0.7fr_0.7fr] gap-2 px-3 py-2 bg-muted/50 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[600px]">
            <span>Agent</span>
            <span className="text-right">Findings</span>
            <span className="text-right">Issues</span>
            <span className="text-right">Confidence</span>
            <span className="text-right">Time</span>
            <span className="text-right">Cost</span>
          </div>
          {outputs.map((o) => {
            const issues = o.findings.filter((f) => f.type === 'issue').length;
            const isHighest = o.confidence === highestConf && outputs.length > 1;
            const isLowest = o.confidence === lowestConf && lowestConf !== highestConf;

            return (
              <div
                key={o.agentId}
                className={`grid grid-cols-[1.5fr_0.7fr_0.7fr_0.8fr_0.7fr_0.7fr] gap-2 px-3 py-2.5 border-t items-center text-xs min-w-[600px] ${isHighest ? 'bg-emerald-500/5' : isLowest ? 'bg-amber-500/5' : ''}`}
              >
                <span className="font-medium truncate flex items-center gap-1.5">
                  {o.agentName}
                  {isHighest && <Badge variant="success" className="text-[8px] px-1.5 py-0 rounded-full">Highest</Badge>}
                  {isLowest && <Badge variant="warning" className="text-[8px] px-1.5 py-0 rounded-full">Lowest</Badge>}
                </span>
                <span className="text-right font-mono">{o.findings.length}</span>
                <span className={`text-right font-mono ${issues > 0 ? 'text-destructive font-semibold' : ''}`}>{issues}</span>
                <span className="text-right font-mono">{(o.confidence * 100).toFixed(1)}%</span>
                <span className="text-right text-[11px] text-muted-foreground">{o.processingTime}</span>
                <span className="text-right text-[11px] text-muted-foreground">{o.cost}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ────────────────────────────────────────────────────────────
     MAIN RENDER
     ──────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-purple-500/15 text-primary">
            <Play className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Agent Runner</h1>
            <p className="text-sm text-muted-foreground">
              Run agents individually or together — review each output transparently.
            </p>
          </div>
        </div>
        {phase !== 'config' && (
          <Button variant="outline" size="sm" className="rounded-full gap-2 cursor-pointer" onClick={handleReset}>
            <ArrowLeft className="h-3.5 w-3.5" /> New Run
          </Button>
        )}
      </div>

      {/* ── Mode Toggle ── */}
      {phase === 'config' && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => { setMode('single'); setSelectedAgentIds(new Set()); }}
            className={`flex items-start gap-4 rounded-xl border p-5 text-left transition-all cursor-pointer ${
              mode === 'single'
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'hover:bg-muted/50 hover:shadow-sm'
            }`}
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${
              mode === 'single' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold">Single Agent</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Run one agent and inspect every detail of its output.
              </p>
            </div>
          </button>

          <button
            onClick={() => { setMode('multi'); setSelectedAgentId(''); }}
            className={`flex items-start gap-4 rounded-xl border p-5 text-left transition-all cursor-pointer ${
              mode === 'multi'
                ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                : 'hover:bg-muted/50 hover:shadow-sm'
            }`}
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${
              mode === 'multi' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold">Multi-Agent</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Run multiple agents in parallel, compare results side by side.
              </p>
            </div>
          </button>
        </div>
      )}

      {/* ── Configuration Panel ── */}
      {phase === 'config' && (
        <div className="space-y-6">
          {/* Agent Selection */}
          <div className="rounded-xl border bg-card p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              {mode === 'single' ? 'Select Agent' : `Select Agents (${selectedAgentIds.size} selected)`}
            </p>

            {/* ── Single Mode: Select dropdown + selected agent card ── */}
            {mode === 'single' && (
              <div className="space-y-3">
                <Select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="cursor-pointer"
                >
                  <option value="">Choose an agent...</option>
                  <optgroup label="Validation Agents">
                    {validationAgents.map((a) => (
                      <option key={a.id} value={a.id}>{a.shortName} — {a.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Operational Agents">
                    {operationalAgents.map((a) => (
                      <option key={a.id} value={a.id}>{a.shortName} — {a.name}</option>
                    ))}
                  </optgroup>
                </Select>

                {selectedAgent && (
                  <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{selectedAgent.name}</span>
                        <span className="inline-flex items-center rounded-full bg-primary/8 px-2 py-0.5 text-[9px] font-bold text-primary border border-primary/15">
                          {selectedAgent.shortName}
                        </span>
                        <Badge
                          variant={selectedAgent.category === 'validation' ? 'processing' : 'secondary'}
                          className="rounded-full px-2 py-0 text-[9px] font-bold"
                        >
                          {selectedAgent.category}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">{selectedAgent.description}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Multi Mode: Searchable grid with checkboxes ── */}
            {mode === 'multi' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    placeholder="Search agents by name or description..."
                    className="pl-10"
                  />
                </div>

                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-4">
                    {/* Validation agents */}
                    {filteredValidation.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                          Validation Agents ({filteredValidation.length})
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {filteredValidation.map((agent) => {
                            const isSelected = selectedAgentIds.has(agent.id);
                            return (
                              <label
                                key={agent.id}
                                className={`flex items-start gap-3 rounded-xl border p-3 transition-all cursor-pointer ${
                                  isSelected
                                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                    : 'hover:bg-muted/50'
                                }`}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onChange={() => toggleMultiAgent(agent.id)}
                                  className="mt-0.5 cursor-pointer"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="inline-flex items-center rounded-full bg-primary/8 px-1.5 py-0.5 text-[8px] font-bold text-primary border border-primary/15">
                                      {agent.shortName}
                                    </span>
                                    <span className="text-xs font-semibold truncate">{agent.name}</span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{agent.description}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Operational agents */}
                    {filteredOperational.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                          Operational Agents ({filteredOperational.length})
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {filteredOperational.map((agent) => {
                            const isSelected = selectedAgentIds.has(agent.id);
                            return (
                              <label
                                key={agent.id}
                                className={`flex items-start gap-3 rounded-xl border p-3 transition-all cursor-pointer ${
                                  isSelected
                                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                    : 'hover:bg-muted/50'
                                }`}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onChange={() => toggleMultiAgent(agent.id)}
                                  className="mt-0.5 cursor-pointer"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="inline-flex items-center rounded-full bg-primary/8 px-1.5 py-0.5 text-[8px] font-bold text-primary border border-primary/15">
                                      {agent.shortName}
                                    </span>
                                    <span className="text-xs font-semibold truncate">{agent.name}</span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{agent.description}</p>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {filteredAgents.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-8">No agents match your search.</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Target Selection */}
          <div className="rounded-xl border bg-card p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
              Target Configuration
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium mb-1.5 block">Project</label>
                <Select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="cursor-pointer"
                >
                  <option value="">Select a project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.patientCount} patients)
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium mb-1.5 block">Sample Size</label>
                <Select
                  value={sampleSize}
                  onChange={(e) => setSampleSize(e.target.value)}
                  className="cursor-pointer"
                >
                  <option value="10">10 records</option>
                  <option value="25">25 records</option>
                  <option value="50">50 records</option>
                  <option value="100">100 records</option>
                  <option value="full">Full dataset</option>
                </Select>
              </div>
            </div>

            {/* Patient IDs textarea */}
            <div className="mt-4">
              <label className="text-xs font-medium mb-1.5 block">
                Patient IDs <span className="text-muted-foreground font-normal">(optional, comma-separated)</span>
              </label>
              <Textarea
                value={patientIds}
                onChange={(e) => setPatientIds(e.target.value)}
                placeholder="P-10042, P-10055, P-10088..."
                className="min-h-[60px] resize-y"
              />
            </div>

            {/* Selected project summary */}
            {selectedProject && (
              <div className="mt-4 flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold">{selectedProject.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedProject.patientCount} patients | {selectedProject.types.join(', ')} | {selectedProject.providers.join(', ')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Run Button */}
          <div className="flex items-center gap-3">
            <Button
              size="lg"
              className="rounded-full px-8 text-sm font-semibold shadow-md gap-2 cursor-pointer"
              disabled={!canRun}
              onClick={handleRun}
            >
              <Play className="h-4 w-4" />
              {mode === 'single'
                ? 'Run Agent'
                : `Run ${selectedAgentIds.size} Agent${selectedAgentIds.size !== 1 ? 's' : ''}`}
            </Button>
            {!canRun && (
              <p className="text-[11px] text-muted-foreground">
                {mode === 'single' && !selectedAgentId && 'Select an agent to continue.'}
                {mode === 'multi' && selectedAgentIds.size === 0 && 'Select at least one agent to continue.'}
                {(mode === 'single' ? !!selectedAgentId : selectedAgentIds.size > 0) && !selectedProjectId && 'Select a project to continue.'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Running State ── */}
      {phase === 'running' && (
        <div className="space-y-4">
          {/* Overall progress */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-sm font-semibold">Running {agentsToRun.length} agent{agentsToRun.length !== 1 ? 's' : ''}...</p>
              </div>
              <span className="text-xs font-mono text-muted-foreground">{overallProgress.toFixed(0)}%</span>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </div>

          {/* Per-agent progress cards */}
          <div className="space-y-2">
            {outputs.map((output) => {
              const agentProgress = progress[output.agentId] ?? 0;
              const isRunning = output.status === 'Running';
              const isDone = output.status === 'Completed';
              const isPending = output.status === 'Pending';

              return (
                <div key={output.agentId} className="flex items-center gap-4 rounded-xl border bg-card p-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : isRunning ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{output.agentName}</span>
                      <Badge
                        variant={isDone ? 'success' : isRunning ? 'processing' : 'secondary'}
                        className="rounded-full px-2 py-0 text-[9px] font-bold"
                      >
                        {isDone ? 'Completed' : isRunning ? 'Running' : 'Pending'}
                      </Badge>
                    </div>
                    <Progress value={agentProgress} className="h-1.5 mt-2" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground shrink-0">{agentProgress.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Results: Single Mode ── */}
      {phase === 'done' && mode === 'single' && outputs.length === 1 && (
        renderAgentOutput(outputs[0])
      )}

      {/* ── Results: Multi-Agent Mode ── */}
      {phase === 'done' && mode === 'multi' && outputs.length > 0 && (
        <div className="space-y-4">
          {/* View toggle + agent tabs */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Agent tabs (tab view) */}
            {multiView === 'tabs' && (
              <div className="flex items-center gap-1 rounded-full border bg-muted/40 p-1 overflow-x-auto">
                {outputs.map((o) => {
                  const issues = o.findings.filter((f) => f.type === 'issue').length;
                  const agent = allAgents.find((a) => a.id === o.agentId);
                  return (
                    <button
                      key={o.agentId}
                      onClick={() => setActiveAgentTab(o.agentId)}
                      className={`flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                        activeAgentTab === o.agentId
                          ? 'bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-xs font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted rounded-full px-4 py-1.5 text-xs font-semibold'
                      }`}
                    >
                      <span className="inline-flex items-center rounded-full bg-primary/8 px-1.5 py-0.5 text-[8px] font-bold text-primary border border-primary/15">
                        {agent?.shortName ?? '?'}
                      </span>
                      <span className="hidden sm:inline">{agent?.name ?? o.agentName}</span>
                      {issues > 0 && (
                        <span className={`inline-flex items-center justify-center rounded-full h-4 min-w-[16px] px-1 text-[9px] font-bold ${
                          activeAgentTab === o.agentId ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-destructive/15 text-destructive'
                        }`}>
                          {issues}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Split view selectors */}
            {multiView === 'split' && (
              <div className="flex items-center gap-2">
                <Select
                  value={splitLeft}
                  onChange={(e) => setSplitLeft(e.target.value)}
                  className="text-xs h-8 cursor-pointer"
                >
                  {outputs.map((o) => (
                    <option key={o.agentId} value={o.agentId}>{o.agentName}</option>
                  ))}
                </Select>
                <span className="text-xs text-muted-foreground">vs</span>
                <Select
                  value={splitRight}
                  onChange={(e) => setSplitRight(e.target.value)}
                  className="text-xs h-8 cursor-pointer"
                >
                  {outputs.map((o) => (
                    <option key={o.agentId} value={o.agentId}>{o.agentName}</option>
                  ))}
                </Select>
              </div>
            )}

            {/* View mode toggle */}
            <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
              <button
                onClick={() => setMultiView('tabs')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  multiView === 'tabs' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Layers className="h-3.5 w-3.5" /> Tabs
              </button>
              <button
                onClick={() => setMultiView('split')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  multiView === 'split' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Columns2 className="h-3.5 w-3.5" /> Split
              </button>
            </div>
          </div>

          {/* Tab view content */}
          {multiView === 'tabs' && (
            <>
              {outputs
                .filter((o) => o.agentId === activeAgentTab)
                .map((o) => (
                  <div key={o.agentId}>{renderAgentOutput(o)}</div>
                ))}
            </>
          )}

          {/* Split view content */}
          {multiView === 'split' && (
            <div className="grid grid-cols-2 gap-4">
              <ScrollArea className="max-h-[800px]">
                {outputs
                  .filter((o) => o.agentId === splitLeft)
                  .map((o) => (
                    <div key={o.agentId}>{renderAgentOutput(o)}</div>
                  ))}
              </ScrollArea>
              <ScrollArea className="max-h-[800px]">
                {outputs
                  .filter((o) => o.agentId === splitRight)
                  .map((o) => (
                    <div key={o.agentId}>{renderAgentOutput(o)}</div>
                  ))}
              </ScrollArea>
            </div>
          )}

          {/* Comparison table */}
          {renderComparisonTable()}
        </div>
      )}

      {/* ── Empty State (shouldn't normally appear, but safety) ── */}
      {phase === 'done' && outputs.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-16 text-center">
          <Play className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-sm text-muted-foreground">No results to display. Try running agents again.</p>
          <Button variant="outline" className="mt-4 rounded-full cursor-pointer" onClick={handleReset}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Configuration
          </Button>
        </div>
      )}
    </div>
  );
}
