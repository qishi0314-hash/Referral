/**
 * CPS Referral Directory — Google Sheets backend
 *
 * ONE-TIME SETUP (admin only, ~15 minutes):
 * 1. Create a new Google Sheet
 * 2. Add two tabs: "Comments" and "Descriptions"
 * 3. Comments row 1: created_at | provider_id | author_name | body
 * 4. Descriptions row 1: provider_id | description | updated_by | updated_at
 * 5. Extensions → Apps Script → paste this file → Save
 * 6. Change STAFF_PASSWORD and EDITOR_PASSWORD below
 * 7. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 8. Copy the Web app URL into docs/assets/config.js → googleScriptUrl
 */

const STAFF_PASSWORD = "fordham-cps-staff";
const EDITOR_PASSWORD = "fordham-cps-editor";

const COMMENTS_SHEET = "Comments";
const DESCRIPTIONS_SHEET = "Descriptions";

function doGet(e) {
  try {
    const action = (e.parameter.action || "").toString();
    if (action === "comments") {
      return json_(getComments_(e.parameter.providerId));
    }
    if (action === "descriptions") {
      return json_(getDescriptions_());
    }
    return json_({ error: "Unknown action" });
  } catch (err) {
    return json_({ error: String(err) });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === "login") {
      const role = checkRole_(data.password);
      if (!role) return json_({ error: "Invalid access code" });
      return json_({ role: role, canComment: true, canEdit: role === "editor" });
    }

    const role = checkRole_(data.password);
    if (!role) return json_({ error: "Unauthorized" });

    if (action === "addComment") {
      if (!data.provider_id || !data.author_name || !data.body) {
        return json_({ error: "Missing fields" });
      }
      addComment_(data.provider_id, data.author_name, data.body);
      return json_({ success: true });
    }

    if (action === "updateDescription") {
      if (role !== "editor") return json_({ error: "Editor access required" });
      if (!data.provider_id || data.description === undefined) {
        return json_({ error: "Missing fields" });
      }
      updateDescription_(data.provider_id, data.description, data.updated_by || "");
      return json_({ success: true });
    }

    return json_({ error: "Unknown action" });
  } catch (err) {
    return json_({ error: String(err) });
  }
}

function checkRole_(password) {
  if (password === EDITOR_PASSWORD) return "editor";
  if (password === STAFF_PASSWORD) return "staff";
  return null;
}

function getComments_(providerId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(COMMENTS_SHEET);
  if (!sheet) return { comments: [] };

  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return { comments: [] };

  const pid = String(providerId);
  const comments = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[1]) !== pid) continue;
    comments.push({
      id: i,
      provider_id: Number(row[1]),
      author_name: String(row[2] || ""),
      body: String(row[3] || ""),
      created_at: formatDate_(row[0]),
    });
  }

  comments.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return { comments: comments };
}

function getDescriptions_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DESCRIPTIONS_SHEET);
  if (!sheet) return { descriptions: {} };

  const rows = sheet.getDataRange().getValues();
  const descriptions = {};

  for (let i = 1; i < rows.length; i++) {
    const providerId = String(rows[i][0]);
    if (!providerId) continue;
    descriptions[providerId] = String(rows[i][1] || "");
  }

  return { descriptions: descriptions };
}

function addComment_(providerId, authorName, body) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(COMMENTS_SHEET);
  sheet.appendRow([new Date(), Number(providerId), authorName.trim(), body.trim()]);
}

function updateDescription_(providerId, description, updatedBy) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(DESCRIPTIONS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(DESCRIPTIONS_SHEET);
    sheet.appendRow(["provider_id", "description", "updated_by", "updated_at"]);
  }

  const rows = sheet.getDataRange().getValues();
  const pid = Number(providerId);

  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) === pid) {
      sheet.getRange(i + 1, 2, 1, 3).setValues([[description, updatedBy, new Date()]]);
      return;
    }
  }

  sheet.appendRow([pid, description, updatedBy, new Date()]);
}

function formatDate_(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "MM/dd/yyyy");
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
