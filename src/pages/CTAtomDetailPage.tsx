import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { buildAtomRows, buildCriterionRows } from '@/components/vault/shared';
import { AtomMetadataHeader } from '@/components/ct/AtomMetadataHeader';
import { PromptConfigTab } from '@/components/ct/PromptConfigTab';
import { RunHistoryTab } from '@/components/ct/RunHistoryTab';
import { PatientReviewTab } from '@/components/ct/PatientReviewTab';

/* ─── Tab types ─── */

type ActiveTab = 'prompt' | 'runs' | 'review';

/* ─── CTAtomDetailPage ─── */

export function CTAtomDetailPage() {
  const nav = useNavigate();
  const { projectId, atomId } = useParams<{ projectId: string; atomId: string }>();
  const { projects, cohortImports, criteria, runs, reviewItems, saveDecision } = useAppContext();

  /* ── Resolve project + cohort ── */
  const project = projects.find((p) => p.id === projectId);
  const cohort = cohortImports.find((c) => c.id === project?.cohortImportId) ?? null;

  /* ── Build all rows (memoized) ── */
  const allAtoms = useMemo(() => (cohort ? buildAtomRows(cohort) : []), [cohort]);
  const allCriteria = useMemo(() => (cohort ? buildCriterionRows(cohort) : []), [cohort]);

  /* ── Find atom + parent criterion ── */
  const atom = allAtoms.find((a) => a.id === atomId) ?? null;
  const criterion = allCriteria.find((c) => c.id === atom?.parentCriterionId) ?? null;

  /* ── Find the Criterion config (for prompt initialization) ── */
  const criterionConfig = criteria.find(
    (c) => c.id === atom?.parentCriterionId || c.name === atom?.parentCriterionName,
  ) ?? null;

  /* ── Local prompt/config state ── */
  const [activeTab, setActiveTab] = useState<ActiveTab>('prompt');
  const [keywords, setKeywords] = useState<string[]>(() => {
    if (atom?.keywords && atom.keywords.length > 0) return atom.keywords;
    return criterionConfig?.keywords ?? [];
  });
  const [extractionPrompt, setExtractionPrompt] = useState<string>(
    () => criterionConfig?.extractionPrompt ?? '',
  );
  const [reasoningPrompt, setReasoningPrompt] = useState<string>(
    () => criterionConfig?.reasoningPrompt ?? '',
  );
  const [model, setModel] = useState<string>(
    () => criterionConfig?.model ?? 'gpt-4o',
  );

  /* ── Guard: missing data ── */
  if (!project || !cohort || !atom || !criterion) {
    const errorMsg = !project
      ? 'Project not found.'
      : !cohort
      ? 'Cohort not linked to this project.'
      : !atom
      ? 'Atom not found in this cohort.'
      : 'Parent criterion not found.';

    return (
      <div className="mx-auto max-w-3xl p-8 space-y-4">
        <p className="text-destructive font-semibold">{errorMsg}</p>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => nav(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Go back
        </button>
      </div>
    );
  }

  /* ── Compute patients to review (no_unstructured + unknown) ── */
  const patientsToReview = useMemo<string[]>(() => {
    if (!cohort.criteriaResults) return [];
    for (const cr of cohort.criteriaResults) {
      const atomResult = cr.atoms.find((a) => a.atom_id === atomId);
      if (atomResult) {
        const combined = [
          ...atomResult.patient_list_no_unstructured,
          ...atomResult.patient_list_unknown,
        ];
        // Deduplicate
        return [...new Set(combined)];
      }
    }
    return [];
  }, [cohort.criteriaResults, atomId]);

  /* ── Filter review items for this project + atom's patient IDs ── */
  const atomReviewItems = useMemo(() => {
    const pidSet = new Set(patientsToReview);
    return reviewItems.filter(
      (ri) =>
        (!ri.projectId || ri.projectId === projectId) && pidSet.has(ri.patientId),
    );
  }, [reviewItems, patientsToReview, projectId]);

  /* ── Reviewed count ── */
  const reviewedCount = useMemo(
    () => atomReviewItems.filter((ri) => !!ri.decision).length,
    [atomReviewItems],
  );

  /* ── Runs filtered for this criterion ── */
  const atomRuns = useMemo(
    () => runs.filter((r) => r.criterionId === atom.parentCriterionId),
    [runs, atom.parentCriterionId],
  );

  /* ── Keyword handlers ── */
  function handleAddKeyword(kw: string) {
    setKeywords((prev) => (prev.includes(kw) ? prev : [...prev, kw]));
  }

  function handleRemoveKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  }

  /* ── onRun stub ── */
  function handleRun() {
    alert('Run started! (Run creation will be implemented in Sub-project C)');
  }

  /* ── onDecision handler ── */
  function handleDecision(encounterId: string, decision: 'True' | 'False' | 'Unclear', reason: string) {
    void saveDecision({ encounterId, decision, reason });
  }

  const isStructured = atom.dataSource === 'structured';

  /* ── Tab labels with counts ── */
  const tabDefs: { key: ActiveTab; label: string }[] = [
    { key: 'prompt', label: 'Prompt Config' },
    { key: 'runs', label: `Run History (${atomRuns.length})` },
    { key: 'review', label: `Patient Review (${patientsToReview.length})` },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* ── 1. Pinned header ── */}
      <AtomMetadataHeader
        atom={atom}
        criterion={criterion}
        allCriteria={allCriteria}
        projectId={projectId!}
        projectName={project.name}
        reviewedCount={reviewedCount}
        totalToReview={patientsToReview.length}
      />

      {/* ── 2. Structured atoms: no tabs, banner already shown in header ── */}
      {isStructured && null}

      {/* ── 3. Unstructured atoms: tabbed workspace ── */}
      {!isStructured && (
        <div className="space-y-4">
          {/* Tab bar */}
          <div className="flex items-center gap-1 rounded-lg border bg-muted/30 p-1">
            {tabDefs.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div>
            {activeTab === 'prompt' && (
              <PromptConfigTab
                keywords={keywords}
                onAddKeyword={handleAddKeyword}
                onRemoveKeyword={handleRemoveKeyword}
                extractionPrompt={extractionPrompt}
                onExtractionPromptChange={setExtractionPrompt}
                reasoningPrompt={reasoningPrompt}
                onReasoningPromptChange={setReasoningPrompt}
                model={model}
                onModelChange={setModel}
                onRun={handleRun}
                runDisabled={keywords.length === 0 && !extractionPrompt && !reasoningPrompt}
              />
            )}
            {activeTab === 'runs' && (
              <RunHistoryTab runs={atomRuns} />
            )}
            {activeTab === 'review' && (
              <PatientReviewTab
                patientIds={patientsToReview}
                reviewItems={atomReviewItems}
                onDecision={handleDecision}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CTAtomDetailPage;
