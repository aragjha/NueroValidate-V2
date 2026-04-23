/**
 * Use-case-first data model for the Agentic Studio.
 *
 * Key concepts:
 *   UseCase   – a user-facing goal written in plain action language
 *   StudioStep – a user-facing pipeline stage that groups 1+ agents
 *   The recommendation engine maps goals → steps → agents
 */

/* ─── Use Cases (goal-first) ─── */

export type UseCase = {
  id: string;
  label: string;
  description: string;
  whenToUse: string;
  whatItCatches: string;
  outputType: string;
  icon: string;            // Lucide icon name
  recommendedStepIds: string[];
};

export const USE_CASES: UseCase[] = [
  {
    id: 'uc-test-prompt',
    label: 'Test my prompt',
    description: 'Evaluate your extraction or reasoning prompt before running it on real data. Get scored feedback on clarity, determinism, coverage, and efficiency.',
    whenToUse: 'Before your first run, or after editing a prompt.',
    whatItCatches: 'Ambiguous instructions, missing edge cases, token waste, unclear output contracts.',
    outputType: 'Prompt quality scorecard with improvement suggestions',
    icon: 'FileSearch',
    recommendedStepIds: ['step-evaluate-prompt'],
  },
  {
    id: 'uc-note-styles',
    label: 'Test across note styles',
    description: 'Validate that your extraction works consistently across different documentation patterns — short notes, long progress notes, templated vs free-text.',
    whenToUse: 'When data comes from multiple EHR providers with different charting styles.',
    whatItCatches: 'Style-dependent failures, inconsistent extraction, provider bias.',
    outputType: 'Per-style accuracy breakdown + bias report',
    icon: 'FileStack',
    recommendedStepIds: ['step-evaluate-prompt', 'step-check-extraction', 'step-detect-bias'],
  },
  {
    id: 'uc-extraction-accuracy',
    label: 'Check extraction accuracy',
    description: 'Verify that extracted fields (diagnoses, medications, labs) match what the source notes actually say. Catch hallucinations and missed data.',
    whenToUse: 'After any extraction run, especially the first time.',
    whatItCatches: 'Incorrect extractions, hallucinated values, negated conditions treated as positive.',
    outputType: 'Per-field accuracy report with evidence links',
    icon: 'ClipboardCheck',
    recommendedStepIds: ['step-check-extraction', 'step-check-evidence', 'step-check-clinical-context'],
  },
  {
    id: 'uc-evidence',
    label: 'Check supporting evidence',
    description: 'Ensure every extracted claim is anchored to a specific passage in the source note. Critical for regulatory-grade traceability.',
    whenToUse: 'For regulatory submissions, audits, or when reviewer trust is paramount.',
    whatItCatches: 'Unsupported claims, fabricated citations, weak evidence links.',
    outputType: 'Evidence traceability matrix with confidence scores',
    icon: 'BookOpen',
    recommendedStepIds: ['step-check-evidence'],
  },
  {
    id: 'uc-clinical-context',
    label: 'Check clinical context',
    description: 'Validate temporal relationships, negation handling, and uncertainty markers. Make sure "history of migraine" is not confused with "active migraine".',
    whenToUse: 'When criteria depend on timing, active vs historical status, or family history.',
    whatItCatches: 'Temporal misattribution, negation misses, uncertain findings treated as confirmed.',
    outputType: 'Context validation report with flagged records',
    icon: 'Stethoscope',
    recommendedStepIds: ['step-check-clinical-context'],
  },
  {
    id: 'uc-dates-values',
    label: 'Validate dates & clinical values',
    description: 'Check that dates are plausible, numeric values fall within reference ranges, and measurement units are consistent.',
    whenToUse: 'For studies with lab values, vital signs, dosages, or temporal windows.',
    whatItCatches: 'Impossible dates, out-of-range values, unit mismatches (mg vs mcg).',
    outputType: 'Data integrity report with flagged outliers',
    icon: 'Calculator',
    recommendedStepIds: ['step-validate-data-integrity'],
  },
  {
    id: 'uc-eligibility',
    label: 'Check patient eligibility',
    description: 'Evaluate whether extracted data correctly satisfies trial inclusion/exclusion criteria. Handles compound logic and edge cases.',
    whenToUse: 'Before final eligibility determination, especially for complex multi-criteria protocols.',
    whatItCatches: 'Misapplied logic, missing criteria evaluations, edge case failures.',
    outputType: 'Per-patient eligibility verdict with reasoning chain',
    icon: 'UserCheck',
    recommendedStepIds: ['step-check-extraction', 'step-check-evidence', 'step-check-clinical-context', 'step-validate-data-integrity', 'step-check-eligibility'],
  },
  {
    id: 'uc-scale',
    label: 'Run at scale',
    description: 'Apply a validated workflow to your full patient cohort with cost and latency estimates. Includes batch scheduling and progress tracking.',
    whenToUse: 'After validating on a sample, ready to process the full dataset.',
    whatItCatches: 'Performance regressions, cost overruns, timeout failures.',
    outputType: 'Batch run dashboard with per-patient status',
    icon: 'Layers',
    recommendedStepIds: ['step-check-extraction', 'step-check-evidence', 'step-check-eligibility', 'step-completeness'],
  },
  {
    id: 'uc-reusable-workflow',
    label: 'Build a reusable workflow',
    description: 'Assemble a custom multi-step validation pipeline, save it with metadata, and reuse it across projects and disease areas.',
    whenToUse: 'When you want to standardize validation across your team or multiple studies.',
    whatItCatches: 'Inconsistent validation approaches, missed steps, undocumented processes.',
    outputType: 'Saved workflow template with version control',
    icon: 'Workflow',
    recommendedStepIds: [],
  },
];

/* ─── Workflow Steps (user-facing stages that group agents) ─── */

export type StudioStep = {
  id: string;
  label: string;
  plainAction: string;
  description: string;
  whenToUse: string;
  bestFor: string;
  whatItCatches: string;
  agentIds: string[];
  icon: string;
  estimatedTime: string;       // per 100 patients
  estimatedCost: string;       // per 100 patients
};

export const STUDIO_STEPS: StudioStep[] = [
  {
    id: 'step-evaluate-prompt',
    label: 'Evaluate Prompt',
    plainAction: 'Score and improve your prompt',
    description: 'Analyzes your extraction or reasoning prompt for clarity, determinism, entity coverage, edge case handling, and token efficiency. Provides a scorecard and actionable suggestions.',
    whenToUse: 'Before your first run, after editing a prompt, or when extraction results are inconsistent.',
    bestFor: 'New prompts, prompt iteration, pre-run quality gates.',
    whatItCatches: 'Vague instructions, missing output contracts, unhandled edge cases, token waste.',
    agentIds: ['agent-prompt-eval'],
    icon: 'FileSearch',
    estimatedTime: '~30s',
    estimatedCost: '$0.05',
  },
  {
    id: 'step-check-extraction',
    label: 'Check Extraction',
    plainAction: 'Verify extracted data is accurate',
    description: 'Validates that every extracted field (diagnosis, medication, lab value) accurately reflects what the source clinical note says. Catches fabrications and misreads.',
    whenToUse: 'After any extraction run. Essential first validation step.',
    bestFor: 'All extraction-based workflows. Start here.',
    whatItCatches: 'Incorrect extractions, hallucinated values, misread clinical notes.',
    agentIds: ['agent-correctness', 'agent-hallucination'],
    icon: 'ClipboardCheck',
    estimatedTime: '~3m',
    estimatedCost: '$0.40',
  },
  {
    id: 'step-check-evidence',
    label: 'Check Evidence',
    plainAction: 'Ensure claims are backed by source text',
    description: 'Verifies that every extracted claim is anchored to a specific passage in the source note. Produces a traceability matrix showing claim → evidence links.',
    whenToUse: 'For regulatory submissions, audits, high-stakes decisions, or when reviewer trust matters.',
    bestFor: 'Complex prompts, long progress notes, regulatory-grade validation.',
    whatItCatches: 'Unsupported claims, fabricated citations, weak evidence anchoring.',
    agentIds: ['agent-evidence'],
    icon: 'BookOpen',
    estimatedTime: '~4m',
    estimatedCost: '$0.55',
  },
  {
    id: 'step-check-clinical-context',
    label: 'Check Clinical Context',
    plainAction: 'Validate timing, negation, and certainty',
    description: 'Analyzes whether conditions are current/historical/family, detects negated mentions, and flags uncertain or hedged language. Prevents "no history of X" from being extracted as "has X".',
    whenToUse: 'When criteria depend on temporal relationships, active vs past status, or diagnostic certainty.',
    bestFor: 'Neurology studies (disease staging), eligibility with temporal windows, chart notes with complex clinical narratives.',
    whatItCatches: 'Temporal misattribution, negation misses, "possible migraine" treated as confirmed, family history confused with patient history.',
    agentIds: ['agent-temporal', 'agent-negation', 'agent-uncertainty'],
    icon: 'Stethoscope',
    estimatedTime: '~5m',
    estimatedCost: '$0.65',
  },
  {
    id: 'step-validate-data-integrity',
    label: 'Validate Dates & Values',
    plainAction: 'Check dates, numbers, and units',
    description: 'Validates that extracted dates are plausible and ordered, numeric values fall within clinical reference ranges, and measurement units are correct and consistent.',
    whenToUse: 'For studies with lab values, vital signs, medication dosages, or temporal window criteria.',
    bestFor: 'Data with numeric fields, longitudinal studies, dose-finding trials.',
    whatItCatches: 'Impossible dates, out-of-range lab values, mg vs mcg unit confusion, illogical timelines.',
    agentIds: ['agent-date', 'agent-numerical', 'agent-unit'],
    icon: 'Calculator',
    estimatedTime: '~3m',
    estimatedCost: '$0.35',
  },
  {
    id: 'step-check-terminology',
    label: 'Map Terminology',
    plainAction: 'Standardize clinical codes',
    description: 'Maps extracted clinical terms to standard ontologies (SNOMED CT, ICD-10, MedDRA, RxNorm). Ensures consistent coding across sources.',
    whenToUse: 'When outputs must conform to regulatory coding standards or when merging multi-source data.',
    bestFor: 'Regulatory submissions, multi-site studies, data harmonization.',
    whatItCatches: 'Non-standard terminology, inconsistent coding, unmapped terms.',
    agentIds: ['agent-terminology'],
    icon: 'Languages',
    estimatedTime: '~2m',
    estimatedCost: '$0.25',
  },
  {
    id: 'step-check-eligibility',
    label: 'Check Eligibility',
    plainAction: 'Evaluate inclusion/exclusion criteria',
    description: 'Evaluates whether extracted patient data satisfies trial inclusion and exclusion criteria. Handles compound boolean logic, conditional rules, and edge cases.',
    whenToUse: 'Before final eligibility determination, especially for complex multi-criteria protocols.',
    bestFor: 'Clinical trial screening, complex eligibility logic, protocols with many criteria.',
    whatItCatches: 'Misapplied inclusion/exclusion logic, missed criteria, compound rule failures.',
    agentIds: ['agent-eligibility'],
    icon: 'UserCheck',
    estimatedTime: '~2m',
    estimatedCost: '$0.30',
  },
  {
    id: 'step-detect-conflicts',
    label: 'Detect Conflicts',
    plainAction: 'Find contradictory information',
    description: 'Identifies contradictory data points across encounters, agents, or data sources. Flags records where different parts of the note say opposing things.',
    whenToUse: 'For multi-source data, longitudinal records, or when multiple agents produce overlapping outputs.',
    bestFor: 'Multi-provider studies, reconciliation workflows, records with amendments.',
    whatItCatches: 'Conflicting diagnoses, contradictory medication records, inconsistent lab trends.',
    agentIds: ['agent-conflict'],
    icon: 'GitCompare',
    estimatedTime: '~2m',
    estimatedCost: '$0.30',
  },
  {
    id: 'step-completeness',
    label: 'Check Completeness',
    plainAction: 'Ensure nothing is missing',
    description: 'Verifies that all required fields and criteria have been evaluated with sufficient evidence. Catches gaps before downstream analysis.',
    whenToUse: 'As the final step before results review or at-scale execution.',
    bestFor: 'Any workflow — good hygiene step to ensure nothing was skipped.',
    whatItCatches: 'Missing criteria evaluations, empty required fields, incomplete assessments.',
    agentIds: ['agent-completeness'],
    icon: 'ListChecks',
    estimatedTime: '~1m',
    estimatedCost: '$0.15',
  },
  {
    id: 'step-detect-bias',
    label: 'Detect Bias',
    plainAction: 'Test for extraction bias',
    description: 'Evaluates whether extraction quality varies by demographic, linguistic, or clinical factors. Tests robustness across different patient populations.',
    whenToUse: 'Before scaling a validated workflow, for regulatory submissions, or equity-focused studies.',
    bestFor: 'Multi-site studies, diverse patient populations, regulatory scrutiny.',
    whatItCatches: 'Demographic bias, provider-style bias, language-dependent accuracy drops.',
    agentIds: ['agent-bias'],
    icon: 'Scale',
    estimatedTime: '~6m',
    estimatedCost: '$0.80',
  },
];

export function getStep(id: string): StudioStep | undefined {
  return STUDIO_STEPS.find((s) => s.id === id);
}

/* ─── Recommendation Engine ─── */

/**
 * Given selected use-case IDs, return recommended steps in execution order.
 * Deduplicates and sorts by canonical order.
 */
export function recommendSteps(useCaseIds: string[]): StudioStep[] {
  const stepOrder = STUDIO_STEPS.map((s) => s.id);
  const selectedCases = USE_CASES.filter((uc) => useCaseIds.includes(uc.id));
  const stepIdSet = new Set<string>();

  for (const uc of selectedCases) {
    for (const sid of uc.recommendedStepIds) {
      stepIdSet.add(sid);
    }
  }

  // "Build reusable workflow" doesn't pre-select steps — user picks manually
  // But if no steps ended up selected, default to check-extraction + check-evidence
  if (stepIdSet.size === 0 && useCaseIds.length > 0) {
    stepIdSet.add('step-check-extraction');
    stepIdSet.add('step-check-evidence');
  }

  const steps = STUDIO_STEPS.filter((s) => stepIdSet.has(s.id));
  steps.sort((a, b) => stepOrder.indexOf(a.id) - stepOrder.indexOf(b.id));
  return steps;
}

/**
 * Enhanced recommendations based on context signals.
 * Adds extra steps when criteria/data characteristics suggest them.
 */
export function recommendWithContext(
  useCaseIds: string[],
  signals: {
    hasTemporal?: boolean;
    hasNumeric?: boolean;
    hasMultiSource?: boolean;
    isFirstRun?: boolean;
    isRegulatory?: boolean;
    criteriaCount?: number;
  },
): StudioStep[] {
  const base = recommendSteps(useCaseIds);
  const baseIds = new Set(base.map((s) => s.id));
  const extras: StudioStep[] = [];

  if (signals.hasTemporal && !baseIds.has('step-validate-data-integrity')) {
    const s = getStep('step-validate-data-integrity');
    if (s) extras.push(s);
  }
  if (signals.hasNumeric && !baseIds.has('step-validate-data-integrity')) {
    const s = getStep('step-validate-data-integrity');
    if (s && !extras.find((e) => e.id === s.id)) extras.push(s);
  }
  if (signals.hasMultiSource && !baseIds.has('step-detect-conflicts')) {
    const s = getStep('step-detect-conflicts');
    if (s) extras.push(s);
  }
  if (signals.isFirstRun && !baseIds.has('step-evaluate-prompt')) {
    const s = getStep('step-evaluate-prompt');
    if (s) extras.unshift(s); // prompt eval goes first
  }
  if (signals.isRegulatory && !baseIds.has('step-check-evidence')) {
    const s = getStep('step-check-evidence');
    if (s) extras.push(s);
  }
  if ((signals.criteriaCount ?? 0) > 3 && !baseIds.has('step-completeness')) {
    const s = getStep('step-completeness');
    if (s) extras.push(s);
  }

  // Merge and re-sort
  const all = [...base, ...extras];
  const order = STUDIO_STEPS.map((s) => s.id);
  all.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return all;
}
