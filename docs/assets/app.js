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

async function init() {
  const res = await fetch("data/providers.json");
  providers = await res.json();
  auth = loadStaffSession() || { authenticated: false, canComment: false, canEdit: false, role: null };

  if (useGoogleSync()) {
    try {
      const data = await googleGet({ action: "descriptions" });
      const overrides = data?.descriptions || {};
      for (const [id, text] of Object.entries(overrides)) {
        const p = providers.find((x) => String(x.id) === String(id));
        if (p && text) p.description = text;
      }
    } catch (_) {}
  } else if (useVercelSync()) {
    try {
      const data = await api("/api/auth");
      if (data?.authenticated) {
        auth = {
          authenticated: true,
          canComment: data.canComment,
          canEdit: data.canEdit,
          role: data.role,
        };
        setStaffSession(auth);
      }
    } catch { /* static fallback */ }
    try {
      const list = await api("/api/providers");
      if (list) providers = list;
    } catch (_) {}
  }

  renderStaffControls();
  renderFilters();
  renderProviders();
}

function renderStaffControls() {
  const el = document.getElementById("staff-controls");
  const nameInput = document.getElementById("staff-name");
  if (auth.authenticated) {
    nameInput.classList.remove("hidden");
    el.innerHTML = `<div style="display:flex;align-items:center;gap:0.75rem">
      <span style="font-size:0.85rem;color:#065f46">${auth.canEdit ? "Editor mode" : "Staff mode"}</span>
      <button class="btn btn-ghost" id="logout-btn">Sign out</button>
    </div>`;
    document.getElementById("logout-btn").onclick = async () => {
      if (useVercelSync()) await api("/api/auth", { method: "DELETE" }).catch(() => {});
      setStaffSession(null);
      auth = { authenticated: false, canComment: false, canEdit: false, role: null };
      nameInput.classList.add("hidden");
      renderStaffControls();
      if (selectedProvider) openProvider(selectedProvider.id);
    };
  } else {
    nameInput.classList.add("hidden");
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
      <p style="font-size:0.875rem;color:#64748b;margin:0 0 1rem">Enter your access code. Staff codes add notes; editor codes can edit descriptions. All changes sync for the whole team.</p>
      <input type="password" id="login-password" placeholder="Access code" />
      <p id="login-error" class="hidden" style="color:#dc2626;font-size:0.85rem;margin:0.5rem 0 0"></p>
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
        auth = {
          authenticated: true,
          canComment: data.canComment,
          canEdit: data.canEdit,
          role: data.role,
          password,
        };
      } else if (useVercelSync()) {
        const res = await fetch(`${config.apiBase}/api/auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ password }),
        });
        if (!res.ok) throw new Error("bad password");
        const data = await res.json();
        auth = {
          authenticated: true,
          canComment: data.canComment,
          canEdit: data.canEdit,
          role: data.role,
        };
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

  root.innerHTML = `<div class="modal-panel">
    <div class="modal-header">
      <div><h2 style="margin:0">${escapeHtml(provider.name)}</h2><p style="margin:0.25rem 0 0;color:#64748b;font-size:0.9rem">${escapeHtml(provider.type)}</p></div>
      <button class="close-btn" id="close-modal" aria-label="Close">✕</button>
    </div>
    <div class="modal-body">
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
      <div class="modal-section" id="description-section">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.35rem">
          <h4 style="margin:0">Description</h4>
          ${auth.canEdit && hasCloudSync() ? `<button class="btn btn-ghost" id="edit-desc-btn" style="padding:0.25rem 0.5rem;font-size:0.8rem">Edit</button>` : ""}
        </div>
        <div id="description-content">
          ${provider.description ? `<p style="white-space:pre-wrap;margin:0">${escapeHtml(provider.description)}</p>` : `<p style="color:#64748b;margin:0">No description yet.</p>`}
        </div>
      </div>
      <div class="comment-box">
        <h4 style="margin:0 0 0.75rem;font-size:0.9rem">Staff notes</h4>
        <div id="comments-list">${renderComments(providerComments)}</div>
        ${auth.canComment ? `<div style="margin-top:1rem;border-top:1px solid #e2e8f0;padding-top:1rem">
          <input type="text" id="comment-author" placeholder="Your name (e.g., Sally S.)" style="margin-bottom:0.5rem" />
          <textarea id="comment-body" rows="3" placeholder="Add a staff note about this provider..."></textarea>
          <button class="btn btn-primary" id="add-comment" style="margin-top:0.5rem">Add comment</button>
        </div>` : ""}
        ${!hasCloudSync() ? `<p class="notice">Notes are saved in this browser only. Ask your admin to set up Google Sheets sync (see GOOGLE_SETUP.md) so all staff see the same notes.</p>` : `<p class="notice" style="background:#ecfdf5;color:#065f46">Team sync is on — notes and edits are shared with all staff.</p>`}
      </div>
    </div>
  </div>`;

  document.getElementById("close-modal").onclick = closeModal;
  if (auth.canComment) {
    const staffName = document.getElementById("staff-name");
    if (staffName?.value) document.getElementById("comment-author").value = staffName.value;
    document.getElementById("add-comment").onclick = () => addComment(id);
  }
  if (auth.canEdit && hasCloudSync()) {
    document.getElementById("edit-desc-btn").onclick = () => showDescriptionEditor(id, provider.description || "");
  }
}

function showDescriptionEditor(providerId, current) {
  const container = document.getElementById("description-content");
  const editBtn = document.getElementById("edit-desc-btn");
  if (editBtn) editBtn.style.display = "none";
  container.innerHTML = `
    <textarea id="desc-editor" rows="8" style="width:100%">${escapeHtml(current)}</textarea>
    <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
      <button class="btn btn-accent" id="save-desc-btn">Save description</button>
      <button class="btn btn-ghost" id="cancel-desc-btn">Cancel</button>
    </div>`;
  document.getElementById("cancel-desc-btn").onclick = () => openProvider(providerId);
  document.getElementById("save-desc-btn").onclick = async () => {
    const description = document.getElementById("desc-editor").value;
    const updatedBy = document.getElementById("staff-name")?.value || auth.role || "Editor";
    if (useGoogleSync()) {
      await googlePost({
        action: "updateDescription",
        password: sessionPassword,
        provider_id: providerId,
        description,
        updated_by: updatedBy,
      });
    } else if (useVercelSync()) {
      await api(`/api/providers/${providerId}`, {
        method: "PATCH",
        body: JSON.stringify({ description }),
      });
    }
    const idx = providers.findIndex((p) => p.id === providerId);
    if (idx >= 0) providers[idx].description = description;
    openProvider(providerId);
  };
}

function renderComments(list) {
  if (!list.length) return `<p style="font-size:0.875rem;color:#64748b;margin:0">No staff comments yet.</p>`;
  return list.map((c) => `<div class="comment-item"><p style="margin:0">${escapeHtml(c.body)}</p><p class="comment-meta">— ${escapeHtml(c.author_name)} · ${formatDate(c.created_at)}</p></div>`).join("");
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
