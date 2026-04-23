import { ArrowRight, ChevronLeft, Play, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  extractionPrompt: string;
  onExtractionPromptChange: (val: string) => void;
  extractionValidation: string;
  onExtractionValidationChange: (val: string) => void;
  extractionModel: string;
  onExtractionModelChange: (val: string) => void;
  skipExtraction: boolean;
  onSkipExtractionChange: (val: boolean) => void;
  reasoningPrompt: string;
  onReasoningPromptChange: (val: string) => void;
  reasoningValidation: string;
  onReasoningValidationChange: (val: string) => void;
  reasoningModel: string;
  onReasoningModelChange: (val: string) => void;
  onValidateWithStudio?: () => void;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
};

const MODELS = [
  'GPT-5.4',
  'GPT-4o',
  'Claude Sonnet 4',
  'Claude Haiku 4.5',
  'Gemini 2.5 Pro',
  'Llama 4 Maverick',
];

export function PromptConfigTab({
  extractionPrompt,
  onExtractionPromptChange,
  extractionValidation,
  onExtractionValidationChange,
  extractionModel,
  onExtractionModelChange,
  skipExtraction,
  onSkipExtractionChange,
  reasoningPrompt,
  onReasoningPromptChange,
  reasoningValidation,
  onReasoningValidationChange,
  reasoningModel,
  onReasoningModelChange,
  onValidateWithStudio,
  onBack,
  onNext,
  nextLabel = 'Next: Run Configuration',
}: Props) {

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-5 py-4">
        <h2 className="text-lg font-bold">Prompts & Model Selection</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure extraction and reasoning for this atom
        </p>
      </div>
      <div className="p-5 space-y-5">

        {/* ── Extraction ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <h3 className={`text-sm font-bold ${skipExtraction ? 'text-muted-foreground' : ''}`}>
                Extraction
              </h3>
              <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                <Checkbox
                  checked={skipExtraction}
                  onChange={(e) => onSkipExtractionChange((e.target as HTMLInputElement).checked)}
                />
                <span className={skipExtraction ? 'text-muted-foreground' : ''}>Skip extraction</span>
              </label>
            </div>
            {!skipExtraction && (
              <div className="flex items-center gap-2">
                <Select
                  value={extractionModel}
                  onChange={(e) => onExtractionModelChange(e.target.value)}
                  className="h-8 w-48 text-xs"
                >
                  {MODELS.map((m) => <option key={m}>{m}</option>)}
                </Select>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => alert('Refine with AI — mock action')}>
                  <Sparkles className="mr-1 h-3 w-3" /> Refine with AI
                </Button>
              </div>
            )}
          </div>

          <div className={`grid gap-4 md:grid-cols-2 transition-opacity ${skipExtraction ? 'opacity-30 pointer-events-none' : ''}`}>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Prompt</label>
              <Textarea
                rows={5}
                value={extractionPrompt}
                onChange={(e) => onExtractionPromptChange(e.target.value)}
                placeholder="Define extraction logic — what evidence should the model extract from notes?"
                className="font-mono text-xs"
                disabled={skipExtraction}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Validation</label>
              <Textarea
                rows={5}
                value={extractionValidation}
                onChange={(e) => onExtractionValidationChange(e.target.value)}
                placeholder="Validate extraction output — what's an acceptable answer?"
                className="font-mono text-xs"
                disabled={skipExtraction}
              />
            </div>
          </div>
          {skipExtraction && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              Extraction step will be skipped — only reasoning results will be used for validation.
            </p>
          )}
        </section>

        <Separator />

        {/* ── Reasoning ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold">Reasoning</h3>
            <div className="flex items-center gap-2">
              <Select
                value={reasoningModel}
                onChange={(e) => onReasoningModelChange(e.target.value)}
                className="h-8 w-48 text-xs"
              >
                {MODELS.map((m) => <option key={m}>{m}</option>)}
              </Select>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => alert('Refine with AI — mock action')}>
                <Sparkles className="mr-1 h-3 w-3" /> Refine with AI
              </Button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Prompt</label>
              <Textarea
                rows={5}
                value={reasoningPrompt}
                onChange={(e) => onReasoningPromptChange(e.target.value)}
                placeholder="Define reasoning chain — how should the model decide eligibility?"
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Validation</label>
              <Textarea
                rows={5}
                value={reasoningValidation}
                onChange={(e) => onReasoningValidationChange(e.target.value)}
                placeholder="Validate reasoning output — e.g. must return Eligible / Ineligible / Unknown"
                className="font-mono text-xs"
              />
            </div>
          </div>
        </section>

        {/* Studio entry (optional) */}
        {onValidateWithStudio && (
          <div className="rounded-xl border border-dashed border-primary/20 bg-primary/[0.02] p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground">
                Want to test this prompt before running?{' '}
                <span
                  className="font-semibold text-primary cursor-pointer hover:underline"
                  onClick={onValidateWithStudio}
                >
                  Validate with AI agents
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Stage nav */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button variant="ghost" onClick={onBack} disabled={!onBack}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <Button onClick={onNext} disabled={!onNext}>
            {nextLabel === 'Run Extraction' ? (
              <><Play className="mr-2 h-4 w-4" /> {nextLabel}</>
            ) : (
              <>{nextLabel}<ArrowRight className="ml-2 h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PromptConfigTab;
