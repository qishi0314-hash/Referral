# CPS Referral Directory

Off-campus mental health provider search for Fordham CPS staff referrals — **use directly in the browser, no local install.**

## Live site

### **https://qishi0314-hash.github.io/Referral/**

Staff only need this URL and an access code.

### Features

- Search by insurance, specialty, in-person/virtual, and more
- One deduplicated record per provider
- Contact info, websites, address, modalities
- Staff login to add shared notes (with Google Sheets sync)
- Editor login to create, edit, or delete providers and delete notes

---

## Team sync (recommended: Google Sheets)

For **shared notes and edits across all staff**, see **[GOOGLE_SETUP.md](GOOGLE_SETUP.md)**.

One admin sets up Google Sheets once (~15 min). Staff never touch Vercel or code.

---

## GitHub Pages setup

If Pages is not enabled yet:

1. Open **[Repo Settings → Pages](https://github.com/qishi0314-hash/Referral/settings/pages)**
2. **Source:** Deploy from a branch
3. **Branch:** `gh-pages`, folder `/ (root)` → **Save**

---

## Project structure

| Path | Purpose |
|------|---------|
| `index.html`, `assets/`, `data/` | Live static site (GitHub Pages `gh-pages` branch) |
| `GOOGLE_SETUP.md` | Google Sheets sync setup guide |
| `scripts/google-apps-script.gs` | Google Apps Script backend |
| `docs/` | Mirror of static site for `main` branch |
| `src/` | Optional Next.js app (Vercel deploy) |

---

## Staff quick guide

1. Open the site and use filters to search by student needs
2. Click a provider card for full details and links
3. **Staff login** with staff code to add notes
4. **Editor code** (leads only): edit providers, add new ones, delete entries or comments

---

Created by Sally Shi (2025–26 Postgraduate Fellow, Lincoln Center)
