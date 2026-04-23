import { useNavigate } from 'react-router-dom';
import { ArrowRight, Brain, ChevronRight, Clock, Activity, Scan } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const MODEL_TYPES = [
  {
    id: 'comorbidities',
    label: 'Comorbidities',
    description: 'Compare model accuracy on patient comorbidity extraction from clinical notes.',
    icon: Activity,
    available: true,
    path: '/quantisation/comorbidities',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    id: 'scores',
    label: 'Scores',
    description: 'Clinical scoring systems — NIHSS, mRS, EDSS, and more.',
    icon: Brain,
    available: false,
    path: null,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    id: 'mri',
    label: 'MRI',
    description: 'Structured extraction from radiology reports and MRI findings.',
    icon: Scan,
    available: false,
    path: null,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10',
  },
];

export function QuantisationPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className="hover:text-foreground cursor-pointer transition-colors"
            onClick={() => navigate('/home')}
          >
            Home
          </span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">Model Quantisation</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Model Quantisation</h1>
        <p className="text-sm text-muted-foreground">
          Run head-to-head comparisons across models on patient cohorts. Select a data type to begin.
        </p>
      </div>

      <div className="space-y-3">
        {MODEL_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <div
              key={type.id}
              onClick={() => type.available && type.path && navigate(type.path)}
              className={[
                'group flex items-center gap-5 rounded-2xl border-2 bg-card p-5 transition-all',
                type.available
                  ? 'border-border hover:border-primary/40 hover:shadow-lg cursor-pointer'
                  : 'border-border/50 opacity-60 cursor-not-allowed',
              ].join(' ')}
            >
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${type.bg} ${type.color}`}>
                <Icon className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-base font-semibold">{type.label}</p>
                  {type.available ? (
                    <Badge variant="success" className="text-[10px] px-2 py-0 rounded-full">
                      Available
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px] px-2 py-0 rounded-full flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      Coming Soon
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </div>

              {type.available && (
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
