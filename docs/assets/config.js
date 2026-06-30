// Cloud sync via Google Sheets (recommended — see docs/GOOGLE_SETUP.md)
// Leave googleScriptUrl empty until admin completes one-time Google setup.
window.APP_CONFIG = {
  googleScriptUrl: "",
  apiBase: "",
  // Only used for local/offline mode when googleScriptUrl is empty:
  staffPassword: "fordham-cps-staff",
  editorPassword: "fordham-cps-editor",
};
