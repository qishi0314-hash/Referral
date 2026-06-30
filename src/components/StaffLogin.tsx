"use client";

import { useState } from "react";

export function StaffLogin({
  isAuthenticated,
  onAuthChange,
}: {
  isAuthenticated: boolean;
  onAuthChange: (authed: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      onAuthChange(true);
      setOpen(false);
      setPassword("");
    } else {
      setError("Invalid staff password");
    }
  };

  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    onAuthChange(false);
  };

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-emerald-700 sm:inline">Staff mode</span>
        <button
          type="button"
          onClick={logout}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-[var(--primary)] px-3 py-1.5 text-sm font-medium text-[var(--primary)] hover:bg-slate-50"
      >
        Staff login
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Staff access</h3>
            <p className="mt-1 text-sm text-slate-500">
              Sign in to add comments and update provider listings.
            </p>
            <input
              type="password"
              placeholder="Staff password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading || !password}
                onClick={login}
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
