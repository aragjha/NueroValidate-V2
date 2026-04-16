import { useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import type { FilterState, TabKey, ViewMode, SortMode } from './shared';

/* ─── Types ─── */

type Counts = {
  criteria: { total: number; structured: number; unstructured: number; mixed: number };
  atoms: { total: number; structured: number; unstructured: number };
  patients: { total: number; eligible: number; ineligible: number; needsReview: number };
};

type Props = {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  counts: Counts;
  categories: string[];
};

/* ─── Per-tab pill configs ─── */

type PillOption = { label: string; value: ViewMode };

const CRITERIA_PILLS: PillOption[] = [
  { label: 'All', value: 'all' },
  { label: 'Structured', value: 'structured' },
  { label: 'Unstructured', value: 'unstructured' },
];

// 'mixed' is a ViewMode we need — but it's not in the shared ViewMode union yet.
// We cast it so the pill works and the parent can handle the value.
const CRITERIA_PILLS_WITH_MIXED = [
  ...CRITERIA_PILLS,
  { label: 'Mixed', value: 'mixed' as ViewMode },
];

const ATOM_PILLS: PillOption[] = [
  { label: 'All', value: 'all' },
  { label: 'Structured', value: 'structured' },
  { label: 'Unstructured', value: 'unstructured' },
];

const PATIENT_PILLS: PillOption[] = [
  { label: 'All', value: 'all' },
  { label: 'Eligible', value: 'eligible' },
  { label: 'Ineligible', value: 'ineligible' },
  { label: 'Needs review', value: 'needsReview' as ViewMode },
];

/* ─── Default view per tab ─── */

const TAB_DEFAULT_VIEW: Record<TabKey, ViewMode> = {
  criteria: 'unstructured',
  atoms: 'unstructured',
  patients: 'all',
};

/* ─── Status options ─── */

const STATUS_OPTIONS = [
  { label: 'Auto-validated', value: 'auto-validated' },
  { label: 'Needs config', value: 'needs-config' },
  { label: 'In progress', value: 'in-progress' },
];

/* ─── Sort options ─── */

const SORT_OPTIONS: { label: string; value: SortMode }[] = [
  { label: 'Default', value: 'default' },
  { label: 'Name (A → Z)', value: 'name' },
  { label: 'Pending desc', value: 'pending' },
  { label: 'Yes count desc', value: 'yes' },
];

/* ─── isFiltersActive: returns true when any filter deviates from default ─── */

function isFiltersActive(f: FilterState): boolean {
  return (
    f.view !== TAB_DEFAULT_VIEW[f.tab] ||
    f.cat.length > 0 ||
    f.status.length > 0 ||
    f.q !== '' ||
    f.sort !== 'default'
  );
}

/* ─── SegmentedPills ─── */

function SegmentedPills({
  options,
  value,
  onChange,
}: {
  options: PillOption[];
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1 rounded-md text-xs font-medium transition-all duration-100 whitespace-nowrap',
            value === opt.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ─── MultiSelectDropdown (native <details> — zero dep) ─── */

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { label: string; value: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (detailsRef.current && !detailsRef.current.contains(e.target as Node)) {
        detailsRef.current.removeAttribute('open');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggle(value: string) {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }

  const hasSelection = selected.length > 0;

  return (
    <details ref={detailsRef} className="relative">
      <summary
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer select-none transition-colors list-none',
          hasSelection
            ? 'border-primary/60 bg-primary/8 text-primary'
            : 'border-input bg-background text-muted-foreground hover:text-foreground hover:border-input/80',
        )}
      >
        {label}
        {hasSelection && (
          <span className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground w-4 h-4 text-[10px] font-semibold">
            {selected.length}
          </span>
        )}
        <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
      </summary>

      <div className="absolute z-50 top-full mt-1.5 left-0 min-w-[160px] rounded-xl border border-border bg-background shadow-lg p-1">
        {options.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">No options</p>
        ) : (
          options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-accent transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="accent-primary w-3.5 h-3.5"
              />
              <span>{opt.label}</span>
            </label>
          ))
        )}
      </div>
    </details>
  );
}

/* ─── SortDropdown (native <select> for simplicity) ─── */

function SortDropdown({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (v: SortMode) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortMode)}
        className={cn(
          'appearance-none pl-3 pr-7 py-1.5 rounded-xl border border-input bg-background text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
          value !== 'default' && 'border-primary/60 bg-primary/8 text-primary',
        )}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 opacity-60" />
    </div>
  );
}

/* ─── ExplorerFilterBar ─── */

export function ExplorerFilterBar({ filters, onChange, counts, categories }: Props) {
  /* Tab definitions */
  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'criteria', label: 'Criteria', count: counts.criteria.total },
    { key: 'atoms', label: 'Atoms', count: counts.atoms.total },
    { key: 'patients', label: 'Patients', count: counts.patients.total },
  ];

  /* Active pills based on current tab */
  const activePills =
    filters.tab === 'criteria'
      ? CRITERIA_PILLS_WITH_MIXED
      : filters.tab === 'atoms'
        ? ATOM_PILLS
        : PATIENT_PILLS;

  /* Category options */
  const categoryOptions = categories.map((c) => ({ label: c, value: c }));

  /* Handlers */
  function handleTabChange(tab: TabKey) {
    onChange({
      ...filters,
      tab,
      view: TAB_DEFAULT_VIEW[tab],
      expanded: null,
    });
  }

  function handleViewChange(view: ViewMode) {
    onChange({ ...filters, view });
  }

  function handleSearch(q: string) {
    onChange({ ...filters, q });
  }

  function handleCatChange(cat: string[]) {
    onChange({ ...filters, cat });
  }

  function handleStatusChange(status: string[]) {
    onChange({ ...filters, status });
  }

  function handleSortChange(sort: SortMode) {
    onChange({ ...filters, sort });
  }

  function handleClear() {
    onChange({
      ...filters,
      view: TAB_DEFAULT_VIEW[filters.tab],
      cat: [],
      status: [],
      q: '',
      sort: 'default',
    });
  }

  const filtersActive = isFiltersActive(filters);

  return (
    <div className="flex flex-col gap-2">
      {/* ── Row 1: Tabs + Segmented pills ── */}
      <div className="flex items-center justify-between gap-4">
        {/* Tab switcher */}
        <div className="flex items-center gap-0">
          {tabs.map((tab, i) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2',
                filters.tab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
                i === 0 && 'pl-0',
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'inline-flex items-center justify-center rounded-full px-1.5 min-w-[20px] h-5 text-[11px] font-semibold',
                  filters.tab === tab.key
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Segmented pills */}
        <SegmentedPills
          options={activePills}
          value={filters.view}
          onChange={handleViewChange}
        />
      </div>

      {/* ── Row 2: Search + Dropdowns ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search…"
            value={filters.q}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8 h-8 text-xs rounded-xl"
          />
        </div>

        {/* Category multi-select */}
        <MultiSelectDropdown
          label="Category"
          options={categoryOptions}
          selected={filters.cat}
          onChange={handleCatChange}
        />

        {/* Status multi-select (only relevant for criteria/atoms tabs) */}
        {filters.tab !== 'patients' && (
          <MultiSelectDropdown
            label="Status"
            options={STATUS_OPTIONS}
            selected={filters.status}
            onChange={handleStatusChange}
          />
        )}

        {/* Sort */}
        <SortDropdown value={filters.sort} onChange={handleSortChange} />

        {/* Clear filters */}
        {filtersActive && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground border border-transparent hover:border-input transition-colors"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
