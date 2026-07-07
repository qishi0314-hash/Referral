# CPS Referral Directory

Off-campus mental health provider search for **Fordham CPS** staff making student referrals.

**Live site:** https://qishi0314-hash.github.io/Referral/

---

## Documentation (all in English)

| Guide | Audience |
|-------|----------|
| **[STAFF_GUIDE.md](STAFF_GUIDE.md)** | CPS staff — how to search, log in, and add notes |
| **[GOOGLE_SETUP.md](GOOGLE_SETUP.md)** | Admin — one-time Google Sheets + Apps Script setup |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | Anyone editing the website code or data |

---

## Quick start for staff

1. Open the [live site](https://qishi0314-hash.github.io/Referral/)
2. Filter by insurance, licensed state, specialty, session format
3. **Staff login** → enter staff code → add shared notes on providers
4. **Editor code** (leads only) → add, edit, or delete providers

No install, no Google account needed for staff.

---

## Features

- Search and filter ~56+ providers (insurance, licensed state, type, format, specialties)
- Provider details: phone, email, address, insurance, modalities, websites
- **Staff notes** synced across all browsers (Google Sheets backend)
- **Editor tools**: create/edit/delete providers, delete comments
- Fordham CPS branding

---

## For administrators

### Enable the live site (one time)

1. [Repo Settings → Pages](https://github.com/qishi0314-hash/Referral/settings/pages)
2. Source: **Deploy from a branch**
3. Branch: **`gh-pages`**, folder **`/ (root)`** → Save

### Enable team sync (one time, ~15 min)

Follow **[GOOGLE_SETUP.md](GOOGLE_SETUP.md)** — Google Sheets replaces the need for Vercel.

---

## Repository layout

| Path | Description |
|------|-------------|
| `index.html`, `assets/`, `data/` | **Live static site** (`gh-pages` branch) |
| `scripts/google-apps-script.gs` | Google Sheets backend code |
| `docs/` | Mirror of static files (for `main` branch) |
| `src/` | Optional Next.js app on `main` (Vercel) — not used by most staff |

**The live website is on the `gh-pages` branch.** Edit that branch for staff-facing changes.

---

## Editing the live site

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for step-by-step instructions.

Typical edits:
- **Feature / UI** → `assets/app.js`, `assets/style.css`
- **Google Script URL** → `assets/config.js` on `gh-pages`
- **Base provider list** → `data/providers.json`

---

Created by Sally Shi (2025–26 Postgraduate Fellow, Lincoln Center)
