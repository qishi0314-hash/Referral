"use client";

import { useCallback, useEffect, useState } from "react";

import { FilterPanel, type SearchFilters } from "@/components/FilterPanel";
import { ProviderCard } from "@/components/ProviderCard";
import { ProviderDetail } from "@/components/ProviderDetail";
import { StaffLogin } from "@/components/StaffLogin";
import type { Provider, ProviderWithComments } from "@/lib/types";

const DEFAULT_FILTERS: SearchFilters = {
  q: "",
  insurance: [],
  type: [],
  session_format: [],
  specialties: [],
  low_cost: false,
  accepting_clients: false,
};

export default function HomePage() {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filterOptions, setFilterOptions] = useState({
    insurance: [] as string[],
    specialties: [] as string[],
    types: [] as string[],
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderWithComments | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staffName, setStaffName] = useState("");

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => setIsStaff(d.authenticated));
    fetch("/api/providers?meta=true")
      .then((r) => r.json())
      .then(setFilterOptions);
  }, []);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    filters.insurance.forEach((i) => params.append("insurance", i));
    filters.type.forEach((t) => params.append("type", t));
    filters.session_format.forEach((s) => params.append("session_format", s));
    filters.specialties.forEach((s) => params.append("specialties", s));
    if (filters.low_cost) params.set("low_cost", "true");
    if (filters.accepting_clients) params.set("accepting_clients", "true");

    const res = await fetch(`/api/providers?${params}`);
    const data = await res.json();
    setProviders(data.providers);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(fetchProviders, 200);
    return () => clearTimeout(timer);
  }, [fetchProviders]);

  const openProvider = async (id: number) => {
    setSelectedId(id);
    const res = await fetch(`/api/providers/${id}`);
    const data = await res.json();
    setSelectedProvider(data);
  };

  const refreshSelected = async () => {
    if (selectedId) {
      const res = await fetch(`/api/providers/${selectedId}`);
      setSelectedProvider(await res.json());
    }
    fetchProviders();
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent)]">
              Fordham University
            </p>
            <h1 className="text-2xl font-bold text-[var(--primary)]">CPS Referral Directory</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Search off-campus mental health providers for student referrals
            </p>
          </div>
          <StaffLogin isAuthenticated={isStaff} onAuthChange={setIsStaff} />
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_1fr]">
        <FilterPanel filters={filters} onChange={setFilters} filterOptions={filterOptions} />

        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {loading ? "Searching..." : `${providers.length} provider${providers.length !== 1 ? "s" : ""} found`}
            </p>
            {isStaff && (
              <input
                type="text"
                placeholder="Your name for comments"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
              />
            )}
          </div>

          {!loading && providers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <p className="text-slate-600">No providers match your filters.</p>
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="mt-3 text-sm text-[var(--primary)] hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {providers.map((p) => (
                <ProviderCard key={p.id} provider={p} onClick={() => openProvider(p.id)} />
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-slate-400">
        Counseling & Psychological Services · For staff use when making off-campus referrals
      </footer>

      {selectedProvider && (
        <ProviderDetail
          provider={selectedProvider}
          isStaff={isStaff}
          staffName={staffName}
          onClose={() => {
            setSelectedProvider(null);
            setSelectedId(null);
          }}
          onUpdated={refreshSelected}
        />
      )}
    </div>
  );
}
