/**
 * CPS Referral Directory — Google Sheets backend
 *
 * Sheet tabs:
 *   Comments    — created_at | provider_id | author_name | body | comment_id
 *   Providers   — id | active | data (JSON) | updated_at | updated_by
 */

const STAFF_PASSWORD = "fordham-cps-staff";
const EDITOR_PASSWORD = "fordham-cps-editor";

const COMMENTS_SHEET = "Comments";
const PROVIDERS_SHEET = "Providers";

function doGet(e) {
  try {
    const action = (e.parameter.action || "").toString();
    if (action === "comments") {
      return json_(getComments_(e.parameter.providerId));
    }
    if (action === "providers") {
      return json_(getProviders_());
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

    if (action === "deleteComment") {
      if (role !== "editor") return json_({ error: "Editor access required" });
      if (!data.comment_id && !data.comment_row) return json_({ error: "Missing comment identifier" });
      const deleted = deleteComment_(data.comment_id, data.comment_row);
      if (!deleted) return json_({ error: "Comment not found" });
      return json_({ success: true });
    }

    if (action === "saveProvider") {
      if (role !== "editor") return json_({ error: "Editor access required" });
      if (!data.provider) return json_({ error: "Missing provider" });
      saveProvider_(data.provider, data.updated_by || "");
      return json_({ success: true, provider: data.provider });
    }

    if (action === "deleteProvider") {
      if (role !== "editor") return json_({ error: "Editor access required" });
      if (!data.provider_id) return json_({ error: "Missing provider_id" });
      deleteProvider_(data.provider_id, data.updated_by || "");
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
  const sheet = getSheet_(COMMENTS_SHEET, [
    "created_at",
    "provider_id",
    "author_name",
    "body",
    "comment_id",
  ]);
  if (!sheet) return { comments: [] };

  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return { comments: [] };

  const pid = String(providerId);
  const comments = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[1] && row[1] !== 0) continue;
    if (String(row[1]) !== pid) continue;
    comments.push({
      id: row[4] || "row-" + (i + 1),
      row: i + 1,
      provider_id: Number(row[1]),
      author_name: String(row[2] || ""),
      body: String(row[3] || ""),
      created_at: formatDate_(row[0]),
    });
  }

  comments.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return { comments: comments };
}

function addComment_(providerId, authorName, body) {
  const sheet = getSheet_(COMMENTS_SHEET, [
    "created_at",
    "provider_id",
    "author_name",
    "body",
    "comment_id",
  ]);
  const commentId = Utilities.getUuid();
  sheet.appendRow([
    new Date(),
    Number(providerId),
    authorName.trim(),
    body.trim(),
    commentId,
  ]);
}

function deleteComment_(commentId, commentRow) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(COMMENTS_SHEET);
  if (!sheet) return false;

  const rows = sheet.getDataRange().getValues();

  if (commentRow) {
    const rowNum = Number(commentRow);
    if (rowNum > 1 && rowNum <= rows.length) {
      sheet.deleteRow(rowNum);
      return true;
    }
  }

  for (let i = 1; i < rows.length; i++) {
    const rowId = rows[i][4] || "row-" + (i + 1);
    const sheetRow = i + 1;
    if (
      String(rowId) === String(commentId) ||
      String(i) === String(commentId) ||
      String(sheetRow) === String(commentId)
    ) {
      sheet.deleteRow(sheetRow);
      return true;
    }
  }

  return false;
}

function getProviders_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PROVIDERS_SHEET);
  if (!sheet) return { providers: [] };

  const rows = sheet.getDataRange().getValues();
  const providers = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] && row[0] !== 0) continue;
    try {
      const provider = JSON.parse(String(row[2] || "{}"));
      provider.id = Number(row[0]);
      provider.active = row[1] !== false && row[1] !== "false" && row[1] !== 0 && row[1] !== "0";
      providers.push(provider);
    } catch (_) {}
  }

  return { providers: providers };
}

function saveProvider_(provider, updatedBy) {
  const sheet = getSheet_(PROVIDERS_SHEET, [
    "id",
    "active",
    "data",
    "updated_at",
    "updated_by",
  ]);
  const pid = Number(provider.id);
  const payload = Object.assign({}, provider);
  const active = payload.active !== false;
  delete payload.id;
  const json = JSON.stringify(payload);

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) === pid) {
      sheet.getRange(i + 1, 2, 1, 4).setValues([[active, json, new Date(), updatedBy]]);
      return;
    }
  }

  sheet.appendRow([pid, active, json, new Date(), updatedBy]);
}

function deleteProvider_(providerId, updatedBy) {
  const sheet = getSheet_(PROVIDERS_SHEET, [
    "id",
    "active",
    "data",
    "updated_at",
    "updated_by",
  ]);
  const pid = Number(providerId);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i][0]) === pid) {
      sheet.getRange(i + 1, 2).setValue(false);
      sheet.getRange(i + 1, 4, 1, 2).setValues([[new Date(), updatedBy]]);
      return;
    }
  }

  sheet.appendRow([
    pid,
    false,
    JSON.stringify({ deleted: true }),
    new Date(),
    updatedBy,
  ]);
}

function getSheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
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
