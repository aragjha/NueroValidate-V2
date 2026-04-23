import type { AgentDef, WorkflowTemplate } from '@/types';

export const AGENT_LIBRARY: AgentDef[] = [
  /* ─── Validation Agents ─── */
  { id: 'agent-correctness', name: 'Correctness Agent', shortName: 'COR', description: 'Validates factual accuracy of extracted clinical data against source evidence.', category: 'validation', defaultEnabled: true },
  { id: 'agent-evidence', name: 'Evidence Grounding Agent', shortName: 'EGR', description: 'Ensures every claim is anchored to specific source passages with citation traceability.', category: 'validation', defaultEnabled: true },
  { id: 'agent-hallucination', name: 'Hallucination Detection Agent', shortName: 'HAL', description: 'Identifies fabricated or unsupported assertions that lack source evidence.', category: 'validation', defaultEnabled: true },
  { id: 'agent-date', name: 'Date Validation Agent', shortName: 'DAT', description: 'Checks temporal data for format consistency, logical ordering, and plausibility.', category: 'validation', defaultEnabled: false },
  { id: 'agent-temporal', name: 'Temporal Context Agent', shortName: 'TMP', description: 'Validates that events, diagnoses, and treatments follow clinically plausible timelines.', category: 'validation', defaultEnabled: false },
  { id: 'agent-negation', name: 'Negation Detection Agent', shortName: 'NEG', description: 'Detects negated mentions (e.g. "no history of...") to prevent false-positive extraction.', category: 'validation', defaultEnabled: true },
  { id: 'agent-completeness', name: 'Completeness Agent', shortName: 'CMP', description: 'Checks whether all required fields and criteria have been evaluated with sufficient evidence.', category: 'validation', defaultEnabled: true },
  { id: 'agent-numerical', name: 'Numerical Validation Agent', shortName: 'NUM', description: 'Validates numeric values, ranges, and thresholds against clinical reference ranges.', category: 'validation', defaultEnabled: false },
  { id: 'agent-unit', name: 'Unit Validation Agent', shortName: 'UNT', description: 'Checks measurement units for consistency and correctness (mg vs mcg, mmol vs mg/dL).', category: 'validation', defaultEnabled: false },
  { id: 'agent-terminology', name: 'Terminology Mapping Agent', shortName: 'TRM', description: 'Maps clinical terms to standard ontologies (SNOMED CT, ICD-10, MedDRA, RxNorm).', category: 'validation', defaultEnabled: false },
  { id: 'agent-eligibility', name: 'Eligibility Logic Agent', shortName: 'ELG', description: 'Evaluates inclusion/exclusion criteria logic and resolves compound eligibility rules.', category: 'validation', defaultEnabled: true },
  { id: 'agent-conflict', name: 'Conflict Detection Agent', shortName: 'CFD', description: 'Identifies contradictory information across encounters, agents, or data sources.', category: 'validation', defaultEnabled: false },
  { id: 'agent-uncertainty', name: 'Uncertainty Detection Agent', shortName: 'UNC', description: 'Flags hedge language, speculative phrasing, and low-confidence assertions.', category: 'validation', defaultEnabled: false },

  /* ─── Operational Agents ─── */
  { id: 'agent-prompt-eval', name: 'Prompt Evaluator', shortName: 'PEV', description: 'Evaluates prompt quality on clarity, determinism, entity coverage, edge cases, and token efficiency.', category: 'operational', defaultEnabled: false },
  { id: 'agent-bias', name: 'Bias Detection Agent', shortName: 'BIA', description: 'Tests for demographic, linguistic, and clinical bias in extraction and reasoning outputs.', category: 'operational', defaultEnabled: false },
];

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'tpl-standard',
    name: 'Standard Clinical Validation',
    description: 'Core validation pipeline with correctness, evidence grounding, negation detection, and eligibility logic. Recommended for most validation projects.',
    agentIds: ['agent-correctness', 'agent-evidence', 'agent-negation', 'agent-eligibility', 'agent-completeness'],
    tags: ['recommended', 'clinical', 'validation'],
  },
  {
    id: 'tpl-evidence-audit',
    name: 'Comprehensive Evidence Audit',
    description: 'Deep evidence quality audit including hallucination detection, conflict resolution, and uncertainty flagging. Ideal for high-stakes regulatory submissions.',
    agentIds: ['agent-correctness', 'agent-evidence', 'agent-hallucination', 'agent-conflict', 'agent-uncertainty', 'agent-completeness'],
    tags: ['audit', 'regulatory', 'thorough'],
  },
  {
    id: 'tpl-data-integrity',
    name: 'Data Integrity Check',
    description: 'Focused on numerical, date, and unit validation for structured data quality assurance.',
    agentIds: ['agent-date', 'agent-numerical', 'agent-unit', 'agent-temporal'],
    tags: ['data-quality', 'structured', 'numerical'],
  },
  {
    id: 'tpl-eligibility',
    name: 'Eligibility Pipeline',
    description: 'Streamlined eligibility determination with negation handling and completeness checks.',
    agentIds: ['agent-eligibility', 'agent-negation', 'agent-completeness'],
    tags: ['eligibility', 'quick', 'screening'],
  },
  {
    id: 'tpl-blank',
    name: 'Blank Workflow',
    description: 'Start from scratch. Choose your own agents and configure a custom pipeline.',
    agentIds: [],
    tags: ['custom', 'advanced'],
  },
];

export function getAgent(id: string): AgentDef | undefined {
  return AGENT_LIBRARY.find((a) => a.id === id);
}
