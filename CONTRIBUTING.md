# Contributing & Editing the Codebase

This repo powers the **CPS Referral Directory**. The live website is published from the **`gh-pages` branch**.

---

## Branches

| Branch | Purpose |
|--------|---------|
| **`gh-pages`** | **Live website** — edit this for staff-facing changes |
| `main` | Archive + optional Next.js app + data scripts |

**Always edit `gh-pages` for website changes** unless you know you need `main`.

---

## Live site file map (`gh-pages`)

| File | What it does |
|------|----------------|
| `index.html` | Page layout, header, footer |
| `assets/app.js` | Search, filters, login, provider modals, Google sync |
| `assets/style.css` | Fordham styling |
| `assets/config.js` | Google Script URL (`googleScriptUrl`) |
| `data/providers.json` | Base provider list (seed data) |
| `scripts/google-apps-script.gs` | Backend pasted into Google Sheets |
| `GOOGLE_SETUP.md` | Admin setup for Google Sheets sync |
| `STAFF_GUIDE.md` | End-user guide for CPS staff |

The `docs/` folder mirrors the same files for reference on `main`.

---

## Making a website change

1. On GitHub, switch to branch **`gh-pages`**.
2. Edit the file (e.g. `assets/app.js` for features, `data/providers.json` for bulk data).
3. Commit → wait 1–2 minutes → hard refresh the live site.

### Update `config.js` (Google Script URL)

Path on live branch: **`assets/config.js`** (not `docs/assets/config.js` on `gh-pages`).

```javascript
window.APP_CONFIG = {
  googleScriptUrl: "https://script.google.com/macros/s/...../exec",
  apiBase: "",
};
```

### Cache busting

After JS/CSS changes, bump the version in `index.html`:

```html
<script src="assets/app.js?v=6" type="module"></script>
```

---

## Google Apps Script changes

1. Edit `scripts/google-apps-script.gs` in the repo.
2. Copy the full file into the Google Sheet → **Extensions → Apps Script**.
3. **Deploy → Manage deployments → Edit → New version → Deploy**.

See **[GOOGLE_SETUP.md](GOOGLE_SETUP.md)** for sheet tab setup.

---

## Updating provider seed data

Base providers live in `data/providers.json`. Editors can also add/edit via the website (stored in Google Sheets `Providers` tab).

To regenerate from a PDF spreadsheet (advanced):

```bash
pip install pypdf
python scripts/extract_providers.py   # on main branch
```

Then copy the output into `data/providers.json` on `gh-pages`.

---

## Access codes

Set in **Google Apps Script** (recommended), not in public `config.js`:

```javascript
const STAFF_PASSWORD = "your-staff-code";
const EDITOR_PASSWORD = "your-editor-code";
```

---

## Optional: Next.js / Vercel (`main` branch only)

The `src/` folder is an alternate full-stack app. The team uses **GitHub Pages + Google Sheets**; Vercel is optional and not required for staff.

---

## Questions?

- **Staff usage** → [STAFF_GUIDE.md](STAFF_GUIDE.md)
- **Google setup** → [GOOGLE_SETUP.md](GOOGLE_SETUP.md)
- **Overview** → [README.md](README.md)
