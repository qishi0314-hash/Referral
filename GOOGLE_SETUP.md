# Team Shared Notes & Editing — Google Sheets (No Vercel)

**Staff need zero technical setup.** They only open the website and enter an access code.  
**One administrator** does a one-time ~15 minute setup.

---

## How it works

- The website stays on GitHub Pages (current link)
- Notes, provider edits, and new/deleted providers are stored in **Google Sheets** (cloud)
- All staff see the same data in every browser
- Administrators can also view all notes directly in the spreadsheet

---

## One-time admin setup (~15 minutes)

### Step 1: Create a Google Sheet

1. Open [Google Sheets](https://sheets.google.com) and create a blank spreadsheet
2. Name it: `CPS Referral Staff Notes`
3. Create two tabs at the bottom:
   - `Comments`
   - `Providers`

4. In **Comments**, row 1 headers:

   | created_at | provider_id | author_name | body | comment_id |
   |------------|-------------|-------------|------|------------|

5. In **Providers**, row 1 headers:

   | id | active | data | updated_at | updated_by |
   |----|--------|------|------------|------------|

   (The `data` column stores full provider JSON — the website writes this automatically.)

### Step 2: Add Apps Script

1. In the sheet, click **Extensions → Apps Script**
2. Delete the default code and paste the full contents of `scripts/google-apps-script.gs` from this repo
3. Change the two passwords at the top (share these with staff):
   ```javascript
   const STAFF_PASSWORD = "your-staff-code";
   const EDITOR_PASSWORD = "your-editor-code";
   ```
4. Click **Save** (name the project `CPS Referral API`)

### Step 3: Deploy as a web app

1. Click **Deploy → New deployment**
2. Type: **Web app**
3. Settings:
   - Description: CPS Referral API
   - Execute as: **Me**
   - Who has access: **Anyone** (the site needs to connect; staff still need access codes to write)
4. Click **Deploy** and authorize your Google account
5. **Copy the Web app URL** (looks like `https://script.google.com/macros/s/...../exec`)

> **After updating code:** You must click **Deploy → Manage deployments → Edit → Version: New version → Deploy**. Saving alone is not enough.

### Step 4: Connect to the website

**Important:** The live site is published from the **`gh-pages` branch**, not `main`.  
Edit `assets/config.js` on the **`gh-pages` branch**:

```javascript
window.APP_CONFIG = {
  googleScriptUrl: "paste-your-web-app-url-here",
  apiBase: "",
};
```

On GitHub: switch to the **`gh-pages` branch** → open `assets/config.js` → Edit → Commit.

Wait 1–2 minutes, then **hard refresh** the page (Ctrl+Shift+R or Cmd+Shift+R).

---

## Daily use for staff (zero technical)

1. Open: **https://qishi0314-hash.github.io/Referral/**
2. Click **Staff login** and enter the access code from your admin
3. Search for a provider → click the card
4. **Staff code:** add notes (visible to everyone)
5. **Editor code** can also:
   - Click **+ Add provider** to create a new entry
   - **Edit provider** to change all fields (phone, email, insurance, specialties, etc.)
   - **Delete provider** (with confirmation)
   - **Delete** staff notes

Changes sync across computers, browsers, and colleagues.

---

## Access codes

| Code | Who gets it | What they can do |
|------|-------------|------------------|
| Staff code | All CPS staff | Add staff notes |
| Editor code | Leads / few admins | Create/edit/delete providers, delete notes, add notes |

Passwords should live only in Google Apps Script (not in public website code).

---

## Viewing data in Google Sheets

- **Comments** tab: all staff notes
- **Providers** tab: providers created or edited by editors

---

## FAQ

**Q: Do staff need a Google account?**  
A: No. Only the admin who sets up the sheet needs one.

**Q: Do we still need Vercel?**  
A: No. Google Sheets is the cloud database.

**Q: I changed config.js but nothing updated?**  
A: Make sure you edited **`gh-pages` branch** `assets/config.js`. Wait 1–2 minutes and hard refresh (Ctrl+Shift+R).

**Q: I'm logged in but can't edit?**  
A: You must use the **editor code** (not the staff code). The header should show **Editor mode**. `googleScriptUrl` must be configured to save changes.

**Q: I updated Apps Script but new features don't work?**  
A: Redeploy a **new version** (see Step 3).

**Q: Delete comment does nothing?**  
A: Make sure Apps Script includes the latest `deleteComment` code and is redeployed. If you see an error in the confirm dialog, follow that message.
