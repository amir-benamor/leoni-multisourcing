import type { BreakdownOption } from "../../types/explore";

interface BreakdownSelectProps {
  value: BreakdownOption;
  options: BreakdownOption[];
  onChange: (value: BreakdownOption) => void;
}

export function BreakdownSelect({ value, options, onChange }: BreakdownSelectProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <label htmlFor="breakdown-select" className="text-sm font-medium text-text">
        Breakdown by
      </label>
      <select
        id="breakdown-select"
        value={value}
        onChange={(event) => onChange(event.target.value as BreakdownOption)}
        className="mt-2 h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text transition-colors hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
