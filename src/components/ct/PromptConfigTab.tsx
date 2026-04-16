import { useState } from 'react';
import { Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

type Props = {
  keywords: string[];
  onAddKeyword: (kw: string) => void;
  onRemoveKeyword: (kw: string) => void;
  extractionPrompt: string;
  onExtractionPromptChange: (val: string) => void;
  reasoningPrompt: string;
  onReasoningPromptChange: (val: string) => void;
  model: string;
  onModelChange: (val: string) => void;
  onRun: () => void;
  runDisabled: boolean;
};

const MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
];

export function PromptConfigTab({
  keywords,
  onAddKeyword,
  onRemoveKeyword,
  extractionPrompt,
  onExtractionPromptChange,
  reasoningPrompt,
  onReasoningPromptChange,
  model,
  onModelChange,
  onRun,
  runDisabled,
}: Props) {
  const [kwInput, setKwInput] = useState('');

  function handleKwSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = kwInput.trim().toLowerCase();
    if (!trimmed) return;
    onAddKeyword(trimmed);
    setKwInput('');
  }

  return (
    <div className="space-y-6 p-1">
      {/* Keywords */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Keywords</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Used to filter unstructured notes before extraction
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {keywords.map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium"
            >
              {kw}
              <button
                type="button"
                onClick={() => onRemoveKeyword(kw)}
                className="ml-0.5 hover:text-destructive transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <form onSubmit={handleKwSubmit} className="inline-flex">
            <Input
              className="h-7 w-32 text-xs"
              placeholder="+ add keyword"
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
            />
          </form>
        </div>
        {keywords.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No keywords added. Add keywords to focus extraction on relevant notes.
          </p>
        )}
      </section>

      {/* Extraction Prompt */}
      <section className="space-y-2">
        <div>
          <h3 className="text-sm font-semibold">Extraction Prompt</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Instructs the model on what evidence to extract from clinical notes
          </p>
        </div>
        <Textarea
          value={extractionPrompt}
          onChange={(e) => onExtractionPromptChange(e.target.value)}
          placeholder="e.g. Extract all mentions of the patient's diagnosis, date of onset, and any related symptoms from the clinical note."
          className="min-h-[100px] font-mono text-xs"
        />
      </section>

      {/* Reasoning Prompt */}
      <section className="space-y-2">
        <div>
          <h3 className="text-sm font-semibold">Reasoning Prompt</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Instructs the model on how to reason about eligibility based on extracted evidence
          </p>
        </div>
        <Textarea
          value={reasoningPrompt}
          onChange={(e) => onReasoningPromptChange(e.target.value)}
          placeholder="e.g. Based on the extracted evidence, determine if the patient meets the criterion. Return Eligible if the evidence clearly supports it, Ineligible if it contradicts, or Unknown if insufficient."
          className="min-h-[100px] font-mono text-xs"
        />
      </section>

      {/* Model + Run */}
      <section className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2 flex-1 max-w-xs">
          <label className="text-sm font-semibold">Model</label>
          <Select
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            className="text-sm"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>
        <Button
          onClick={onRun}
          disabled={runDisabled}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          Run Extraction
        </Button>
      </section>
    </div>
  );
}

export default PromptConfigTab;
