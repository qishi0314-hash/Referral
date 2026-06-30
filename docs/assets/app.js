const INSURANCE_OPTIONS = [
  "1199", "Aetna", "Blue Cross Blue Shield", "Cigna", "Emblem", "GHI",
  "Healthfirst", "HIP", "Homestead", "Humana", "MagnaCare", "Medicaid",
  "Medicare", "Out of Network", "Oxford", "TriCare", "United HealthCare",
  "Sliding Scale",
];

const PROVIDER_TYPES = [
  "Psychiatrist / Medication", "Psychologist", "Therapist", "Social Work", "Group Practice",
];

const SESSION_FORMATS = ["In-Person", "Virtual", "Both"];

const SPECIALTY_OPTIONS = [
  "ADHD", "Autism/Asperger's", "Bilingual", "CBT", "DBT", "Eating Disorders",
  "Grief/Bereavement", "LGBTQ+", "Substance Abuse", "Trauma", "Veterans",
];

const MODALITY_OPTIONS = [
  "CBT", "DBT", "EMDR", "Psychodynamic", "ACT", "Mindfulness", "Family Systems",
];

const config = window.APP_CONFIG || {
  googleScriptUrl: "",
  apiBase: "",
  staffPassword: "fordham-cps-staff",
  editorPassword: "fordham-cps-editor",
};

let providers = [];
let comments = loadLocalComments();
let auth = { authenticated: false, canComment: false, canEdit: false, role: null };
let sessionPassword = "";
let selectedProvider = null;

const filters = {
  q: "",
  insurance: [],
  type: [],
  session_format: [],
  specialties: [],
};

function loadLocalComments() {
  try {
    return JSON.parse(localStorage.getItem("cps_comments") || "{}");
  } catch {
    return {};
  }
}

function saveLocalComments() {
  localStorage.setItem("cps_comments", JSON.stringify(comments));
}

function loadStaffSession() {
  try {
    return JSON.parse(sessionStorage.getItem("cps_auth") || "null");
  } catch {
    return null;
  }
}

function setStaffSession(state) {
  if (state) {
    sessionStorage.setItem("cps_auth", JSON.stringify(state));
    if (state.password) sessionPassword = state.password;
  } else {
    sessionStorage.removeItem("cps_auth");
    sessionPassword = "";
  }
}

function useGoogleSync() {
  return !!config.googleScriptUrl;
}

function useVercelSync() {
  return !!config.apiBase;
}

function hasCloudSync() {
  return useGoogleSync() || useVercelSync();
}

async function googleGet(params) {
  const q = new URLSearchParams(params);
  const res = await fetch(`${config.googleScriptUrl}?${q}`);
  if (!res.ok) throw new Error("Google sync failed");
  return res.json();
}

async function googlePost(payload) {
  const res = await fetch(config.googleScriptUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Google sync failed");
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function api(path, options = {}) {
  if (!config.apiBase) return null;
  const res = await fetch(`${config.apiBase}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function parseList(str) {
  return String(str || "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinList(arr) {
  return (arr || []).join(", ");
}

function mergeCloudProviders(base, cloudList) {
  const map = new Map(base.map((p) => [p.id, { ...p }]));
  for (const cp of cloudList || []) {
    const id = Number(cp.id);
    if (cp.active === false) {
      if (map.has(id)) map.get(id).active = false;
      else map.set(id, { id, active: false, name: cp.name || "Removed provider" });
      continue;
    }
    const existing = map.get(id);
    map.set(id, existing ? { ...existing, ...cp, id } : { ...emptyProvider(), ...cp, id, active: true });
  }
  return Array.from(map.values());
}

function emptyProvider() {
  return {
    name: "",
    type: "Therapist",
    insurance: [],
    in_person: true,
    session_format: "Both",
    address: "",
    email: "",
    phone: "",
    websites: {},
    specialties: [],
    modalities: [],
    licensed_states: [],
    description: "",
    accepting_clients: true,
    active: true,
  };
}

function nextProviderId() {
  const ids = providers.map((p) => p.id).filter((id) => typeof id === "number");
  return ids.length ? Math.max(...ids) + 1 : 1;
}

async function init() {
  const res = await fetch("data/providers.json");
  const base = await res.json();
  auth = loadStaffSession() || { authenticated: false, canComment: false, canEdit: false, role: null };
  if (auth.password) sessionPassword = auth.password;

  if (useGoogleSync()) {
    try {
      const data = await googleGet({ action: "providers" });
      providers = mergeCloudProviders(base, data?.providers || []);
    } catch (_) {
      providers = base;
    }
  } else if (useVercelSync()) {
    try {
      const data = await api("/api/auth");
      if (data?.authenticated) {
        auth = { authenticated: true, canComment: data.canComment, canEdit: data.canEdit, role: data.role };
        setStaffSession(auth);
      }
    } catch { /* static fallback */ }
    try {
      const list = await api("/api/providers");
      providers = list || base;
    } catch (_) {
      providers = base;
    }
  } else {
    providers = base;
  }

  renderStaffControls();
  renderFilters();
  renderProviders();
}

function renderStaffControls() {
  const el = document.getElementById("staff-controls");
  const nameInput = document.getElementById("staff-name");
  const addBtn = document.getElementById("add-provider-btn");

  if (auth.authenticated) {
    nameInput.classList.remove("hidden");
    if (auth.canEdit && hasCloudSync()) {
      addBtn.classList.remove("hidden");
      addBtn.onclick = () => showProviderForm(null);
    } else {
      addBtn.classList.add("hidden");
    }
    el.innerHTML = `<div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap">
      <span class="editor-badge">${auth.canEdit ? "Editor mode" : "Staff mode"}</span>
      <button class="btn btn-ghost" id="logout-btn">Sign out</button>
    </div>`;
    document.getElementById("logout-btn").onclick = async () => {
      if (useVercelSync()) await api("/api/auth", { method: "DELETE" }).catch(() => {});
      setStaffSession(null);
      auth = { authenticated: false, canComment: false, canEdit: false, role: null };
      nameInput.classList.add("hidden");
      addBtn.classList.add("hidden");
      renderStaffControls();
      if (selectedProvider) openProvider(selectedProvider.id);
    };
  } else {
    nameInput.classList.add("hidden");
    addBtn.classList.add("hidden");
    el.innerHTML = `<button class="btn btn-outline" id="login-btn">Staff login</button>`;
    document.getElementById("login-btn").onclick = showLoginModal;
  }
}

function showLoginModal() {
  const root = document.getElementById("modal-root");
  root.classList.remove("hidden");
  root.innerHTML = `<div class="modal-panel" style="max-width:24rem;margin:4rem auto">
    <div class="modal-header"><h2 style="margin:0;font-size:1.1rem">Staff access</h2></div>
    <div class="modal-body">
      <p style="font-size:0.875rem;color:#5c5c5c;margin:0 0 1rem">Staff codes add notes. Editor codes can add, edit, or remove providers and delete comments.</p>
      <input type="password" id="login-password" placeholder="Access code" />
      <p id="login-error" class="hidden" style="color:#b91c1c;font-size:0.85rem;margin:0.5rem 0 0"></p>
      <div style="display:flex;justify-content:flex-end;gap:0.5rem;margin-top:1rem">
        <button class="btn btn-ghost" id="login-cancel">Cancel</button>
        <button class="btn btn-primary" id="login-submit">Sign in</button>
      </div>
    </div>
  </div>`;
  document.getElementById("login-cancel").onclick = closeModal;
  document.getElementById("login-submit").onclick = async () => {
    const password = document.getElementById("login-password").value;
    const err = document.getElementById("login-error");
    try {
      if (useGoogleSync()) {
        const data = await googlePost({ action: "login", password });
        auth = { authenticated: true, canComment: data.canComment, canEdit: data.canEdit, role: data.role, password };
      } else if (useVercelSync()) {
        const res = await fetch(`${config.apiBase}/api/auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ password }),
        });
        if (!res.ok) throw new Error("bad password");
        const data = await res.json();
        auth = { authenticated: true, canComment: data.canComment, canEdit: data.canEdit, role: data.role };
      } else if (password === config.editorPassword) {
        auth = { authenticated: true, canComment: true, canEdit: true, role: "editor", password };
      } else if (password === config.staffPassword) {
        auth = { authenticated: true, canComment: true, canEdit: false, role: "staff", password };
      } else {
        throw new Error("bad password");
      }
      setStaffSession(auth);
      closeModal();
      renderStaffControls();
    } catch {
      err.textContent = "Invalid access code";
      err.classList.remove("hidden");
    }
  };
}

function showConfirm(message, onConfirm) {
  const root = document.getElementById("modal-root");
  root.classList.remove("hidden");
  root.innerHTML = `<div class="modal-panel confirm-panel">
    <div class="modal-header"><h2 style="margin:0;font-size:1.05rem">Please confirm</h2></div>
    <div class="modal-body">
      <p>${escapeHtml(message)}</p>
      <div class="form-actions" style="border:0;padding-top:1.25rem;margin-top:0">
        <button class="btn btn-ghost" id="confirm-cancel">Cancel</button>
        <button class="btn btn-danger" id="confirm-ok">Confirm</button>
      </div>
    </div>
  </div>`;
  document.getElementById("confirm-cancel").onclick = () => {
    if (selectedProvider) openProvider(selectedProvider.id);
    else closeModal();
  };
  document.getElementById("confirm-ok").onclick = async () => {
    await onConfirm();
  };
}

function renderFilters() {
  const allInsurance = [...new Set([...INSURANCE_OPTIONS, ...providers.flatMap((p) => p.insurance)])].sort();
  const allSpecialties = [...new Set([...SPECIALTY_OPTIONS, ...providers.flatMap((p) => p.specialties)])].sort();
  const allTypes = [...new Set([...PROVIDER_TYPES, ...providers.map((p) => p.type)])].sort();

  const el = document.getElementById("filters");
  el.innerHTML = `
    <h2>Filters</h2>
    <div class="filter-group">
      <label for="search">Search</label>
      <input type="search" id="search" placeholder="Name, specialty, address..." value="${escapeHtml(filters.q)}" />
    </div>
    ${checkboxGroup("Insurance", "insurance", allInsurance)}
    ${checkboxGroup("Provider type", "type", allTypes)}
    ${checkboxGroup("Session format", "session_format", SESSION_FORMATS)}
    ${checkboxGroup("Specialties", "specialties", allSpecialties)}
    <button class="btn btn-ghost" id="clear-filters" style="width:100%">Clear all filters</button>
  `;

  document.getElementById("search").oninput = (e) => { filters.q = e.target.value; renderProviders(); };
  document.getElementById("clear-filters").onclick = () => {
    Object.assign(filters, { q: "", insurance: [], type: [], session_format: [], specialties: [] });
    renderFilters();
    renderProviders();
  };

  el.querySelectorAll("[data-filter]").forEach((input) => {
    input.onchange = () => {
      const key = input.dataset.filter;
      const val = input.value;
      if (input.checked) filters[key].push(val);
      else filters[key] = filters[key].filter((v) => v !== val);
      renderProviders();
    };
  });
}

function checkboxGroup(label, key, options) {
  return `<fieldset class="filter-group"><legend>${label}</legend><div class="filter-scroll">
    ${options.map((opt) => `<label><input type="checkbox" data-filter="${key}" value="${escapeHtml(opt)}" ${filters[key].includes(opt) ? "checked" : ""} /> ${escapeHtml(opt)}</label>`).join("")}
  </div></fieldset>`;
}

function filterProviders() {
  return providers.filter((p) => {
    if (p.active === false) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const hay = [p.name, p.description, p.email, p.address, p.phone].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.insurance.length && !filters.insurance.some((ins) => p.insurance.some((pi) => pi.toLowerCase().includes(ins.toLowerCase())))) return false;
    if (filters.type.length && !filters.type.includes(p.type)) return false;
    if (filters.session_format.length) {
      const ok = filters.session_format.includes(p.session_format) || (p.session_format === "Both" && filters.session_format.length);
      if (!ok) return false;
    }
    if (filters.specialties.length && !filters.specialties.some((s) => p.specialties.some((ps) => ps.toLowerCase().includes(s.toLowerCase())))) return false;
    return true;
  });
}

function renderProviders() {
  const list = filterProviders();
  document.getElementById("result-count").textContent = `${list.length} provider${list.length !== 1 ? "s" : ""} found`;
  const grid = document.getElementById("provider-grid");

  if (!list.length) {
    grid.innerHTML = `<div class="empty-state"><p>No providers match your filters.</p></div>`;
    return;
  }

  grid.innerHTML = list.map((p) => `
    <article class="provider-card" data-id="${p.id}">
      <div class="card-top">
        <div>
          <h3>${escapeHtml(p.name)}</h3>
          <p class="card-type">${escapeHtml(p.type)}</p>
        </div>
        <div class="badges">
          ${p.session_format !== "Unknown" ? `<span class="badge badge-blue">${escapeHtml(p.session_format)}</span>` : ""}
        </div>
      </div>
      ${p.insurance.length ? `<div class="card-insurance">${p.insurance.slice(0, 5).map((i) => `<span class="badge">${escapeHtml(i)}</span>`).join("")}${p.insurance.length > 5 ? `<span class="badge">+${p.insurance.length - 5}</span>` : ""}</div>` : ""}
      ${p.specialties.length ? `<p class="card-specialties"><strong>Specialties:</strong> ${escapeHtml(p.specialties.join(", "))}</p>` : ""}
      ${p.address ? `<p class="card-address">${escapeHtml(p.address)}</p>` : ""}
    </article>
  `).join("");

  grid.querySelectorAll(".provider-card").forEach((card) => {
    card.onclick = () => openProvider(Number(card.dataset.id));
  });
}

async function openProvider(id) {
  let provider = providers.find((p) => p.id === id);
  if (!provider || provider.active === false) return;

  let providerComments = comments[id] || [];

  if (useVercelSync()) {
    try {
      const data = await api(`/api/providers/${id}`);
      provider = data;
      providerComments = data.comments || [];
    } catch { /* fallback */ }
  } else if (useGoogleSync()) {
    try {
      const data = await googleGet({ action: "comments", providerId: id });
      providerComments = data.comments || [];
    } catch { /* fallback */ }
  }

  selectedProvider = provider;
  const root = document.getElementById("modal-root");
  root.classList.remove("hidden");

  const websites = provider.websites || {};
  const websiteLinks = [
    websites.practice && ["Practice website", websites.practice],
    websites.psychology_today && ["Psychology Today", websites.psychology_today],
    websites.alma && ["Alma", websites.alma],
    websites.headway && ["Headway", websites.headway],
  ].filter(Boolean);

  const canEditCloud = auth.canEdit && hasCloudSync();

  root.innerHTML = `<div class="modal-panel">
    <div class="modal-header">
      <div><h2 style="margin:0">${escapeHtml(provider.name)}</h2><p style="margin:0.25rem 0 0;color:#5c5c5c;font-size:0.9rem">${escapeHtml(provider.type)}</p></div>
      <button class="close-btn" id="close-modal" aria-label="Close">✕</button>
    </div>
    <div class="modal-body">
      ${canEditCloud ? `<div class="editor-actions">
        <button class="btn btn-outline btn-sm" id="edit-provider-btn">Edit provider</button>
        <button class="btn btn-danger btn-sm" id="delete-provider-btn">Delete provider</button>
      </div>` : ""}
      <div class="badges" style="margin-bottom:1rem">
        ${provider.session_format !== "Unknown" ? `<span class="badge badge-blue">${escapeHtml(provider.session_format)}</span>` : ""}
      </div>
      <div class="modal-grid">
        ${provider.phone ? `<div class="modal-section"><h4>Phone</h4><a href="tel:${provider.phone}">${escapeHtml(provider.phone)}</a></div>` : ""}
        ${provider.email ? `<div class="modal-section"><h4>Email</h4><a href="mailto:${provider.email}">${escapeHtml(provider.email)}</a></div>` : ""}
        ${provider.address ? `<div class="modal-section"><h4>Address</h4><p>${escapeHtml(provider.address)}</p></div>` : ""}
        ${provider.licensed_states?.length ? `<div class="modal-section"><h4>Licensed states</h4><p>${escapeHtml(provider.licensed_states.join(", "))}</p></div>` : ""}
      </div>
      ${provider.insurance?.length ? `<div class="modal-section"><h4>Insurance accepted</h4><div class="tag-list">${provider.insurance.map((i) => `<span class="badge">${escapeHtml(i)}</span>`).join("")}</div></div>` : ""}
      ${provider.specialties?.length || provider.modalities?.length ? `<div class="modal-grid">
        ${provider.specialties?.length ? `<div class="modal-section"><h4>Specialties</h4><p>${escapeHtml(provider.specialties.join(", "))}</p></div>` : ""}
        ${provider.modalities?.length ? `<div class="modal-section"><h4>Modalities</h4><p>${escapeHtml(provider.modalities.join(", "))}</p></div>` : ""}
      </div>` : ""}
      ${websiteLinks.length ? `<div class="modal-section"><h4>Websites & profiles</h4>${websiteLinks.map(([label, url]) => `<a class="link-btn" href="${normalizeUrl(url)}" target="_blank" rel="noopener">${label} ↗</a> `).join("")}</div>` : ""}
      <div class="modal-section">
        <h4>Description</h4>
        ${provider.description ? `<p style="white-space:pre-wrap;margin:0">${escapeHtml(provider.description)}</p>` : `<p style="color:#888;margin:0">No description yet.</p>`}
      </div>
      <div class="comment-box">
        <h4 style="margin:0 0 0.75rem;font-size:0.9rem">Staff notes</h4>
        <div id="comments-list">${renderComments(providerComments, id)}</div>
        ${auth.canComment ? `<div style="margin-top:1rem;border-top:1px solid var(--border);padding-top:1rem">
          <input type="text" id="comment-author" placeholder="Your name (e.g., Sally S.)" style="margin-bottom:0.5rem" />
          <textarea id="comment-body" rows="3" placeholder="Add a staff note about this provider..."></textarea>
          <button class="btn btn-primary" id="add-comment" style="margin-top:0.5rem">Add comment</button>
        </div>` : ""}
        ${!hasCloudSync() ? `<p class="notice">Notes are saved in this browser only. Ask your admin to set up Google Sheets sync.</p>` : `<p class="notice notice-success">Team sync is on — changes are shared with all staff.</p>`}
      </div>
    </div>
  </div>`;

  document.getElementById("close-modal").onclick = closeModal;
  if (auth.canComment) {
    const staffName = document.getElementById("staff-name");
    if (staffName?.value) document.getElementById("comment-author").value = staffName.value;
    document.getElementById("add-comment").onclick = () => addComment(id);
  }
  if (canEditCloud) {
    document.getElementById("edit-provider-btn").onclick = () => showProviderForm(provider);
    document.getElementById("delete-provider-btn").onclick = () => confirmDeleteProvider(provider);
  }
  document.querySelectorAll("[data-delete-comment]").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      confirmDeleteComment(id, btn.dataset.deleteComment);
    };
  });
}

function showProviderForm(provider) {
  const isNew = !provider;
  const p = provider ? { ...provider } : { ...emptyProvider(), id: nextProviderId() };
  const websites = p.websites || {};

  const root = document.getElementById("modal-root");
  root.classList.remove("hidden");
  root.innerHTML = `<div class="modal-panel modal-wide">
    <div class="modal-header">
      <h2 style="margin:0;font-size:1.1rem">${isNew ? "Add new provider" : "Edit provider"}</h2>
      <button class="close-btn" id="close-form" aria-label="Close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-grid two-col">
        <div class="form-field" style="grid-column:1/-1">
          <label for="pf-name">Name *</label>
          <input type="text" id="pf-name" value="${escapeHtml(p.name)}" required />
        </div>
        <div class="form-field">
          <label for="pf-type">Provider type</label>
          <select id="pf-type">${PROVIDER_TYPES.map((t) => `<option value="${escapeHtml(t)}" ${p.type === t ? "selected" : ""}>${escapeHtml(t)}</option>`).join("")}</select>
        </div>
        <div class="form-field">
          <label for="pf-session">Session format</label>
          <select id="pf-session">${SESSION_FORMATS.map((t) => `<option value="${escapeHtml(t)}" ${p.session_format === t ? "selected" : ""}>${escapeHtml(t)}</option>`).join("")}</select>
        </div>
        <div class="form-field">
          <label for="pf-phone">Phone</label>
          <input type="text" id="pf-phone" value="${escapeHtml(p.phone || "")}" />
        </div>
        <div class="form-field">
          <label for="pf-email">Email</label>
          <input type="email" id="pf-email" value="${escapeHtml(p.email || "")}" />
        </div>
        <div class="form-field" style="grid-column:1/-1">
          <label for="pf-address">Address</label>
          <input type="text" id="pf-address" value="${escapeHtml(p.address || "")}" />
        </div>
        <div class="form-field" style="grid-column:1/-1">
          <label for="pf-states">Licensed states</label>
          <input type="text" id="pf-states" value="${escapeHtml(joinList(p.licensed_states))}" placeholder="NY, NJ, CT" />
          <p class="hint">Comma-separated state abbreviations</p>
        </div>
        <div class="form-field" style="grid-column:1/-1">
          <label for="pf-insurance">Insurance accepted</label>
          <input type="text" id="pf-insurance" value="${escapeHtml(joinList(p.insurance))}" placeholder="Aetna, Cigna, Sliding Scale" />
          <p class="hint">Comma-separated</p>
        </div>
        <div class="form-field" style="grid-column:1/-1">
          <label for="pf-specialties">Specialties</label>
          <input type="text" id="pf-specialties" value="${escapeHtml(joinList(p.specialties))}" placeholder="CBT, Trauma, LGBTQ+" />
        </div>
        <div class="form-field" style="grid-column:1/-1">
          <label for="pf-modalities">Modalities</label>
          <input type="text" id="pf-modalities" value="${escapeHtml(joinList(p.modalities))}" placeholder="CBT, DBT, EMDR" />
        </div>
        <div class="form-field" style="grid-column:1/-1">
          <label for="pf-desc">Description</label>
          <textarea id="pf-desc" rows="6">${escapeHtml(p.description || "")}</textarea>
        </div>
        <div class="form-field">
          <label for="pf-web-practice">Practice website</label>
          <input type="url" id="pf-web-practice" value="${escapeHtml(websites.practice || "")}" placeholder="https://" />
        </div>
        <div class="form-field">
          <label for="pf-web-pt">Psychology Today</label>
          <input type="url" id="pf-web-pt" value="${escapeHtml(websites.psychology_today || "")}" placeholder="https://" />
        </div>
        <div class="form-field">
          <label for="pf-web-alma">Alma</label>
          <input type="url" id="pf-web-alma" value="${escapeHtml(websites.alma || "")}" placeholder="https://" />
        </div>
        <div class="form-field">
          <label for="pf-web-headway">Headway</label>
          <input type="url" id="pf-web-headway" value="${escapeHtml(websites.headway || "")}" placeholder="https://" />
        </div>
      </div>
      <p id="form-error" class="hidden" style="color:#b91c1c;font-size:0.85rem;margin:0.75rem 0 0"></p>
      <div class="form-actions">
        <button class="btn btn-ghost" id="form-cancel">${isNew ? "Cancel" : "Back"}</button>
        <button class="btn btn-primary" id="form-save">${isNew ? "Create provider" : "Save changes"}</button>
      </div>
    </div>
  </div>`;

  document.getElementById("close-form").onclick = () => (isNew ? closeModal() : openProvider(p.id));
  document.getElementById("form-cancel").onclick = () => (isNew ? closeModal() : openProvider(p.id));
  document.getElementById("form-save").onclick = () => saveProviderForm(p.id, isNew);
}

async function saveProviderForm(id, isNew) {
  const name = document.getElementById("pf-name").value.trim();
  const err = document.getElementById("form-error");
  if (!name) {
    err.textContent = "Name is required.";
    err.classList.remove("hidden");
    return;
  }

  const sessionFormat = document.getElementById("pf-session").value;
  const provider = {
    id,
    name,
    type: document.getElementById("pf-type").value,
    phone: document.getElementById("pf-phone").value.trim() || null,
    email: document.getElementById("pf-email").value.trim() || null,
    address: document.getElementById("pf-address").value.trim() || null,
    session_format: sessionFormat,
    in_person: sessionFormat === "In-Person" || sessionFormat === "Both",
    licensed_states: parseList(document.getElementById("pf-states").value),
    insurance: parseList(document.getElementById("pf-insurance").value),
    specialties: parseList(document.getElementById("pf-specialties").value),
    modalities: parseList(document.getElementById("pf-modalities").value),
    description: document.getElementById("pf-desc").value.trim(),
    websites: {
      practice: document.getElementById("pf-web-practice").value.trim() || undefined,
      psychology_today: document.getElementById("pf-web-pt").value.trim() || undefined,
      alma: document.getElementById("pf-web-alma").value.trim() || undefined,
      headway: document.getElementById("pf-web-headway").value.trim() || undefined,
    },
    accepting_clients: true,
    active: true,
  };

  Object.keys(provider.websites).forEach((k) => {
    if (!provider.websites[k]) delete provider.websites[k];
  });

  const updatedBy = document.getElementById("staff-name")?.value || auth.role || "Editor";

  try {
    if (useGoogleSync()) {
      await googlePost({
        action: "saveProvider",
        password: sessionPassword,
        provider,
        updated_by: updatedBy,
      });
    } else if (useVercelSync()) {
      await api(isNew ? "/api/providers" : `/api/providers/${id}`, {
        method: isNew ? "POST" : "PATCH",
        body: JSON.stringify(provider),
      });
    } else {
      err.textContent = "Cloud sync required to save providers.";
      err.classList.remove("hidden");
      return;
    }

    const idx = providers.findIndex((x) => x.id === id);
    if (idx >= 0) providers[idx] = provider;
    else providers.push(provider);

    renderFilters();
    renderProviders();
    openProvider(id);
  } catch (e) {
    err.textContent = e.message || "Save failed. Try signing in again.";
    err.classList.remove("hidden");
  }
}

function confirmDeleteProvider(provider) {
  showConfirm(
    `Delete "${provider.name}" from the directory? This will hide the provider from all staff. This cannot be undone.`,
    async () => {
      const updatedBy = document.getElementById("staff-name")?.value || auth.role || "Editor";
      if (useGoogleSync()) {
        await googlePost({
          action: "deleteProvider",
          password: sessionPassword,
          provider_id: provider.id,
          updated_by: updatedBy,
        });
      }
      const idx = providers.findIndex((p) => p.id === provider.id);
      if (idx >= 0) providers[idx].active = false;
      closeModal();
      renderProviders();
    }
  );
}

function renderComments(list, providerId) {
  if (!list.length) return `<p style="font-size:0.875rem;color:#888;margin:0">No staff comments yet.</p>`;
  const canDelete = auth.canEdit && hasCloudSync();
  return list.map((c) => `<div class="comment-item">
    <div class="comment-item-header">
      <p style="margin:0;flex:1">${escapeHtml(c.body)}</p>
      ${canDelete ? `<button class="btn btn-ghost btn-sm" data-delete-comment="${escapeHtml(c.id)}" title="Delete comment">Delete</button>` : ""}
    </div>
    <p class="comment-meta">— ${escapeHtml(c.author_name)} · ${formatDate(c.created_at)}</p>
  </div>`).join("");
}

function confirmDeleteComment(providerId, commentId) {
  showConfirm("Delete this staff comment? This cannot be undone.", async () => {
    if (useGoogleSync()) {
      await googlePost({
        action: "deleteComment",
        password: sessionPassword,
        comment_id: commentId,
      });
    }
    openProvider(providerId);
  });
}

async function addComment(providerId) {
  const author = document.getElementById("comment-author").value.trim();
  const body = document.getElementById("comment-body").value.trim();
  if (!author || !body) return;

  if (useGoogleSync()) {
    await googlePost({
      action: "addComment",
      password: sessionPassword,
      provider_id: providerId,
      author_name: author,
      body,
    });
  } else if (useVercelSync()) {
    await api(`/api/providers/${providerId}/comments`, {
      method: "POST",
      body: JSON.stringify({ author_name: author, body }),
    });
  } else {
    if (!comments[providerId]) comments[providerId] = [];
    comments[providerId].unshift({
      id: `local-${Date.now()}`,
      author_name: author,
      body,
      created_at: new Date().toISOString(),
    });
    saveLocalComments();
  }

  openProvider(providerId);
}

function closeModal() {
  document.getElementById("modal-root").classList.add("hidden");
  selectedProvider = null;
}

function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function normalizeUrl(url) {
  return url.startsWith("http") ? url : `https://${url}`;
}

function formatDate(iso) {
  const d = new Date(iso.includes("T") ? iso : iso + "Z");
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

init();
