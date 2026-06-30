"use client";

import { INSURANCE_OPTIONS, PROVIDER_TYPES, SESSION_FORMATS, SPECIALTY_OPTIONS } from "@/lib/types";

export interface SearchFilters {
  q: string;
  insurance: string[];
  type: string[];
  session_format: string[];
  specialties: string[];
}

interface FilterPanelProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  filterOptions: {
    insurance: string[];
    specialties: string[];
    types: string[];
  };
}

function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly string[] | string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-slate-700">{label}</legend>
      <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
        {options.map((opt) => (
          <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={selected.includes(opt)}
              onChange={() => onToggle(opt)}
              className="rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            {opt}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function FilterPanel({ filters, onChange, filterOptions }: FilterPanelProps) {
  const toggle = (key: keyof SearchFilters, value: string) => {
    const arr = filters[key] as string[];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    onChange({ ...filters, [key]: next });
  };

  const insuranceOpts = [...new Set([...INSURANCE_OPTIONS, ...filterOptions.insurance])].sort();
  const specialtyOpts = [...new Set([...SPECIALTY_OPTIONS, ...filterOptions.specialties])].sort();
  const typeOpts = [...new Set([...PROVIDER_TYPES, ...filterOptions.types])].sort();

  return (
    <aside className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <div>
        <label htmlFor="search" className="mb-2 block text-sm font-medium text-slate-700">
          Search
        </label>
        <input
          id="search"
          type="search"
          placeholder="Name, specialty, address..."
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
      </div>

      <CheckboxGroup
        label="Insurance"
        options={insuranceOpts}
        selected={filters.insurance}
        onToggle={(v) => toggle("insurance", v)}
      />

      <CheckboxGroup
        label="Provider type"
        options={typeOpts}
        selected={filters.type}
        onToggle={(v) => toggle("type", v)}
      />

      <CheckboxGroup
        label="Session format"
        options={SESSION_FORMATS.filter((s) => s !== "Unknown")}
        selected={filters.session_format}
        onToggle={(v) => toggle("session_format", v)}
      />

      <CheckboxGroup
        label="Specialties"
        options={specialtyOpts}
        selected={filters.specialties}
        onToggle={(v) => toggle("specialties", v)}
      />

      <button
        type="button"
        onClick={() =>
          onChange({
            q: "",
            insurance: [],
            type: [],
            session_format: [],
            specialties: [],
          })
        }
        className="w-full rounded-lg border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50"
      >
        Clear all filters
      </button>
    </aside>
  );
}
