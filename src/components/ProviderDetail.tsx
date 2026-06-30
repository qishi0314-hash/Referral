"use client";

import { useEffect, useState } from "react";

import type { ProviderWithComments } from "@/lib/types";

function LinkButton({ href, label }: { href: string; label: string }) {
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-[var(--primary)] hover:bg-slate-50"
    >
      {label} ↗
    </a>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      <div className="text-sm text-slate-700">{children}</div>
    </section>
  );
}

export function ProviderDetail({
  provider,
  canComment,
  canEdit,
  staffName,
  onClose,
  onUpdated,
}: {
  provider: ProviderWithComments;
  canComment: boolean;
  canEdit: boolean;
  staffName: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [comment, setComment] = useState("");
  const [author, setAuthor] = useState(staffName);
  const [saving, setSaving] = useState(false);
  const [editingListing, setEditingListing] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editForm, setEditForm] = useState({
    accepting_clients: provider.accepting_clients,
    active: provider.active,
    description: provider.description,
    session_format: provider.session_format,
  });

  useEffect(() => {
    setEditForm({
      accepting_clients: provider.accepting_clients,
      active: provider.active,
      description: provider.description,
      session_format: provider.session_format,
    });
  }, [provider]);

  const submitComment = async () => {
    if (!comment.trim() || !author.trim()) return;
    setSaving(true);
    await fetch(`/api/providers/${provider.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author_name: author, body: comment }),
    });
    setComment("");
    setSaving(false);
    onUpdated();
  };

  const saveEdits = async (fields: Partial<typeof editForm>) => {
    setSaving(true);
    const res = await fetch(`/api/providers/${provider.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    setSaving(false);
    if (res.ok) {
      setEditingListing(false);
      setEditingDescription(false);
      onUpdated();
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso.includes("T") ? iso : iso + "Z");
    return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between rounded-t-2xl border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">{provider.name}</h2>
            <p className="text-sm text-slate-500">{provider.type}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div className="flex flex-wrap gap-2">
            {provider.session_format !== "Unknown" && (
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800">
                {provider.session_format}
              </span>
            )}
            {!provider.active && (
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                Inactive
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {provider.phone && (
              <Section title="Phone">
                <a href={`tel:${provider.phone}`} className="text-[var(--primary)] hover:underline">
                  {provider.phone}
                </a>
              </Section>
            )}
            {provider.email && (
              <Section title="Email">
                <a href={`mailto:${provider.email}`} className="text-[var(--primary)] hover:underline">
                  {provider.email}
                </a>
              </Section>
            )}
            {provider.address && (
              <Section title="Address">
                <p>{provider.address}</p>
              </Section>
            )}
            {provider.licensed_states.length > 0 && (
              <Section title="Licensed states">
                <p>{provider.licensed_states.join(", ")}</p>
              </Section>
            )}
          </div>

          {provider.insurance.length > 0 && (
            <Section title="Insurance accepted">
              <div className="flex flex-wrap gap-1.5">
                {provider.insurance.map((ins) => (
                  <span key={ins} className="rounded-md bg-slate-100 px-2 py-1 text-xs">
                    {ins}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {(provider.specialties.length > 0 || provider.modalities.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2">
              {provider.specialties.length > 0 && (
                <Section title="Specialties">
                  <p>{provider.specialties.join(", ")}</p>
                </Section>
              )}
              {provider.modalities.length > 0 && (
                <Section title="Modalities">
                  <p>{provider.modalities.join(", ")}</p>
                </Section>
              )}
            </div>
          )}

          {Object.keys(provider.websites).length > 0 && (
            <Section title="Websites & profiles">
              <div className="flex flex-wrap gap-2">
                {provider.websites.practice && (
                  <LinkButton href={provider.websites.practice} label="Practice website" />
                )}
                {provider.websites.psychology_today && (
                  <LinkButton href={provider.websites.psychology_today} label="Psychology Today" />
                )}
                {provider.websites.alma && <LinkButton href={provider.websites.alma} label="Alma" />}
                {provider.websites.headway && (
                  <LinkButton href={provider.websites.headway} label="Headway" />
                )}
              </div>
            </Section>
          )}

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Description
              </h4>
              {canEdit && !editingDescription && (
                <button
                  type="button"
                  onClick={() => setEditingDescription(true)}
                  className="text-sm text-[var(--primary)] hover:underline"
                >
                  Edit
                </button>
              )}
            </div>
            {editingDescription ? (
              <div className="space-y-3">
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={8}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm leading-relaxed"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveEdits({ description: editForm.description })}
                    className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save description"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDescription(false);
                      setEditForm((f) => ({ ...f, description: provider.description }));
                    }}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : provider.description ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {provider.description}
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                No description yet.
                {canEdit && " Click Edit to add one."}
              </p>
            )}
          </section>

          <section className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-700">Staff notes</h4>
            {provider.comments.length === 0 ? (
              <p className="text-sm text-slate-500">No staff comments yet.</p>
            ) : (
              <ul className="space-y-3">
                {provider.comments.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <p className="text-slate-700">{c.body}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      — {c.author_name} · {formatDate(c.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {canComment && (
              <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                <input
                  type="text"
                  placeholder="Your name (e.g., Sally S.)"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <textarea
                  placeholder="Add a staff note about this provider..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={saving || !comment.trim()}
                  onClick={submitComment}
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Add comment"}
                </button>
              </div>
            )}
          </section>

          {canEdit && (
            <section className="rounded-xl border border-dashed border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700">Editor: update listing</h4>
                <button
                  type="button"
                  onClick={() => setEditingListing(!editingListing)}
                  className="text-sm text-[var(--primary)] hover:underline"
                >
                  {editingListing ? "Cancel" : "Edit status"}
                </button>
              </div>
              {editingListing && (
                <div className="mt-3 space-y-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editForm.accepting_clients}
                      onChange={(e) =>
                        setEditForm({ ...editForm, accepting_clients: e.target.checked })
                      }
                    />
                    Accepting new clients
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editForm.active}
                      onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                    />
                    Active on referral list
                  </label>
                  <select
                    value={editForm.session_format}
                    onChange={(e) => setEditForm({ ...editForm, session_format: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option>In-Person</option>
                    <option>Virtual</option>
                    <option>Both</option>
                    <option>Unknown</option>
                  </select>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      saveEdits({
                        accepting_clients: editForm.accepting_clients,
                        active: editForm.active,
                        session_format: editForm.session_format,
                      })
                    }
                    className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Save listing changes
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
