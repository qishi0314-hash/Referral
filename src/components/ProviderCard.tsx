"use client";

import type { Provider } from "@/lib/types";

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "green" | "amber" | "blue" }) {
  const colors = {
    default: "bg-slate-100 text-slate-700",
    green: "bg-emerald-50 text-emerald-800",
    amber: "bg-amber-50 text-amber-800",
    blue: "bg-sky-50 text-sky-800",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[variant]}`}>
      {children}
    </span>
  );
}

export function ProviderCard({
  provider,
  onClick,
}: {
  provider: Provider;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{provider.name}</h3>
          <p className="mt-0.5 text-sm text-[var(--muted)]">{provider.type}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          {provider.session_format !== "Unknown" && (
            <Badge variant="blue">{provider.session_format}</Badge>
          )}
        </div>
      </div>

      {provider.insurance.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {provider.insurance.slice(0, 5).map((ins) => (
            <Badge key={ins}>{ins}</Badge>
          ))}
          {provider.insurance.length > 5 && (
            <Badge>+{provider.insurance.length - 5} more</Badge>
          )}
        </div>
      )}

      {provider.specialties.length > 0 && (
        <p className="mt-3 text-sm text-slate-600">
          <span className="font-medium">Specialties:</span> {provider.specialties.join(", ")}
        </p>
      )}

      {provider.address && (
        <p className="mt-2 text-sm text-slate-500">{provider.address}</p>
      )}
    </button>
  );
}
