const INSURANCE_OPTIONS = [
  "1199", "Aetna", "Blue Cross Blue Shield", "Cigna", "Emblem", "GHI",
  "Healthfirst", "HIP", "Homestead", "Humana", "MagnaCare", "Medicaid",
  "Medicare", "Out of Network", "Oxford", "TriCare", "United HealthCare",
];

const PROVIDER_TYPES = [
  "Psychiatrist / Medication", "Psychologist", "Therapist", "Social Work", "Group Practice",
];

const SESSION_FORMATS = ["In-Person", "Virtual", "Both"];

const SPECIALTY_OPTIONS = [
  "ADHD", "Autism/Asperger's", "Bilingual", "CBT", "DBT", "Eating Disorders",
  "Grief/Bereavement", "LGBTQ+", "Substance Abuse", "Trauma", "Veterans",
];

const config = window.APP_CONFIG || { apiBase: "", staffPassword: "fordham-cps-staff" };

let providers = [];
let comments = loadLocalComments();
let isStaff = false;
let selectedProvider = null;

const filters = {
  q: "",
  insurance: [],
  type: [],
  session_format: [],
  specialties: [],
  low_cost: false,
  accepting_clients: false,
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
  return sessionStorage.getItem("cps_staff") === "1";
}

function setStaffSession(on) {
  if (on) sessionStorage.setItem("cps_staff", "1");
  else sessionStorage.removeItem("cps_staff");
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
  isStaff = loadStaffSession();
  if (config.apiBase) {
    try {
      const auth = await api("/api/auth");
      isStaff = auth?.authenticated;
    } catch { /* static fallback */ }
  }
  renderStaffControls();
  renderFilters();
  renderProviders();
}

function renderStaffControls() {
  const el = document.getElementById("staff-controls");
  const nameInput = document.getElementById("staff-name");
  if (isStaff) {
    nameInput.classList.remove("hidden");
    el.innerHTML = `<div style="display:flex;align-items:center;gap:0.75rem">
      <span style="font-size:0.85rem;color:#065f46">Staff mode</span>
      <button class="btn btn-ghost" id="logout-btn">Sign out</button>
    </div>`;
    document.getElementById("logout-btn").onclick = async () => {
      if (config.apiBase) await api("/api/auth", { method: "DELETE" }).catch(() => {});
      setStaffSession(false);
      isStaff = false;
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
      <p style="font-size:0.875rem;color:#64748b;margin:0 0 1rem">Sign in to add comments and update listings.</p>
      <input type="password" id="login-password" placeholder="Staff password" />
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
      if (config.apiBase) {
        const res = await fetch(`${config.apiBase}/api/auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ password }),
        });
        if (!res.ok) throw new Error("bad password");
      } else if (password !== config.staffPassword) {
        throw new Error("bad password");
      }
      setStaffSession(true);
      isStaff = true;
      closeModal();
      renderStaffControls();
    } catch {
      err.textContent = "Invalid staff password";
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
    <div class="filter-group">
      <label><input type="checkbox" id="f-accepting" ${filters.accepting_clients ? "checked" : ""} /> Accepting new clients only</label>
    </div>
    <div class="filter-group">
      <label><input type="checkbox" id="f-lowcost" ${filters.low_cost ? "checked" : ""} /> Low-cost / sliding scale</label>
    </div>
    ${checkboxGroup("Insurance", "insurance", allInsurance)}
    ${checkboxGroup("Provider type", "type", allTypes)}
    ${checkboxGroup("Session format", "session_format", SESSION_FORMATS)}
    ${checkboxGroup("Specialties", "specialties", allSpecialties)}
    <button class="btn btn-ghost" id="clear-filters" style="width:100%">Clear all filters</button>
  `;

  document.getElementById("search").oninput = (e) => { filters.q = e.target.value; renderProviders(); };
  document.getElementById("f-accepting").onchange = (e) => { filters.accepting_clients = e.target.checked; renderProviders(); };
  document.getElementById("f-lowcost").onchange = (e) => { filters.low_cost = e.target.checked; renderProviders(); };
  document.getElementById("clear-filters").onclick = () => {
    Object.assign(filters, { q: "", insurance: [], type: [], session_format: [], specialties: [], low_cost: false, accepting_clients: false });
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
    if (filters.accepting_clients && !p.accepting_clients) return false;
    if (filters.low_cost && !p.low_cost) return false;
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
          ${p.accepting_clients ? '<span class="badge badge-green">Accepting</span>' : ""}
          ${p.low_cost ? '<span class="badge badge-amber">Low-cost</span>' : ""}
          ${p.session_format !== "Unknown" ? `<span class="badge badge-blue">${escapeHtml(p.session_format)}</span>` : ""}
        </div>
      </div>
      ${p.insurance.length ? `<div class="card-insurance">${p.insurance.slice(0, 5).map((i) => `<span class="badge">${escapeHtml(i)}</span>`).join(" ")}${p.insurance.length > 5 ? `<span class="badge">+${p.insurance.length - 5}</span>` : ""}</div>` : ""}
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

  if (config.apiBase) {
    try {
      const data = await api(`/api/providers/${id}`);
      provider = data;
      providerComments = data.comments || [];
    } catch { /* fallback to local */ }
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
        <span class="badge ${provider.accepting_clients ? "badge-green" : ""}">${provider.accepting_clients ? "Accepting clients" : "Status unknown / waitlist"}</span>
        ${provider.low_cost ? '<span class="badge badge-amber">Low-cost option</span>' : ""}
        <span class="badge badge-blue">${escapeHtml(provider.session_format)}</span>
      </div>
      <div class="modal-grid">
        ${provider.phone ? `<div class="modal-section"><h4>Phone</h4><a href="tel:${provider.phone}">${escapeHtml(provider.phone)}</a></div>` : ""}
        ${provider.email ? `<div class="modal-section"><h4>Email</h4><a href="mailto:${provider.email}">${escapeHtml(provider.email)}</a></div>` : ""}
        ${provider.address ? `<div class="modal-section"><h4>Address</h4><p>${escapeHtml(provider.address)}</p></div>` : ""}
        ${provider.licensed_states?.length ? `<div class="modal-section"><h4>Licensed states</h4><p>${escapeHtml(provider.licensed_states.join(", "))}</p></div>` : ""}
      </div>
      ${provider.insurance?.length ? `<div class="modal-section"><h4>Insurance accepted</h4><div class="badges">${provider.insurance.map((i) => `<span class="badge">${escapeHtml(i)}</span>`).join("")}</div></div>` : ""}
      ${provider.specialties?.length || provider.modalities?.length ? `<div class="modal-grid">
        ${provider.specialties?.length ? `<div class="modal-section"><h4>Specialties</h4><p>${escapeHtml(provider.specialties.join(", "))}</p></div>` : ""}
        ${provider.modalities?.length ? `<div class="modal-section"><h4>Modalities</h4><p>${escapeHtml(provider.modalities.join(", "))}</p></div>` : ""}
      </div>` : ""}
      ${websiteLinks.length ? `<div class="modal-section"><h4>Websites & profiles</h4>${websiteLinks.map(([label, url]) => `<a class="link-btn" href="${normalizeUrl(url)}" target="_blank" rel="noopener">${label} ↗</a> `).join("")}</div>` : ""}
      ${provider.description ? `<div class="modal-section"><h4>Description</h4><p style="white-space:pre-wrap">${escapeHtml(provider.description)}</p></div>` : ""}
      <div class="comment-box">
        <h4 style="margin:0 0 0.75rem;font-size:0.9rem">Staff notes</h4>
        <div id="comments-list">${renderComments(providerComments)}</div>
        ${isStaff ? `<div style="margin-top:1rem;border-top:1px solid #e2e8f0;padding-top:1rem">
          <input type="text" id="comment-author" placeholder="Your name (e.g., Sally S.)" style="margin-bottom:0.5rem" />
          <textarea id="comment-body" rows="3" placeholder="Add a staff note about this provider..."></textarea>
          <button class="btn btn-primary" id="add-comment" style="margin-top:0.5rem">Add comment</button>
        </div>` : ""}
        ${!config.apiBase ? `<p class="notice">Comments on this page are saved in your browser only. For shared team notes across all staff, deploy the full web app to Vercel.</p>` : ""}
      </div>
    </div>
  </div>`;

  document.getElementById("close-modal").onclick = closeModal;
  if (isStaff) {
    const staffName = document.getElementById("staff-name");
    if (staffName?.value) document.getElementById("comment-author").value = staffName.value;
    document.getElementById("add-comment").onclick = () => addComment(id);
  }
}

function renderComments(list) {
  if (!list.length) return `<p style="font-size:0.875rem;color:#64748b;margin:0">No staff comments yet.</p>`;
  return list.map((c) => `<div class="comment-item"><p style="margin:0">${escapeHtml(c.body)}</p><p class="comment-meta">— ${escapeHtml(c.author_name)} · ${formatDate(c.created_at)}</p></div>`).join("");
}

async function addComment(providerId) {
  const author = document.getElementById("comment-author").value.trim();
  const body = document.getElementById("comment-body").value.trim();
  if (!author || !body) return;

  if (config.apiBase) {
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
