/**
 * EDC PLATFORM — FRONTEND CONFIGURATION
 * ---------------------------------------------------------------
 * This is the ONLY file most deployments need to edit.
 * No credentials or secrets belong in this file — only the public
 * Web App URL of your deployed Apps Script backend.
 * ---------------------------------------------------------------
 */
window.EDC_CONFIG = {
  // Paste your deployed Google Apps Script Web App URL here.
  // Example: "https://script.google.com/macros/s/AKfycb.../exec"
  API_URL: "https://script.google.com/macros/s/AKfycbz9WKtpmrsCfbBjZ_9odyp_2sjWRUQw1PjG7fy5z3WrcxtDUGYc_xuneS3Cx3FnbKwT/exec",

  // DEMO_MODE = true  -> frontend runs entirely on local seed data,
  //                      no backend required. Great for previewing
  //                      the UI or presenting to stakeholders.
  // DEMO_MODE = false -> frontend calls the real Apps Script API_URL.
  DEMO_MODE: true,

  COMPANY_NAME: "English Development Consultants",
  COMPANY_SHORT: "EDC",
  DEVELOPER_NAME: "Joseph Brylle D. Egay",

  PAGINATION_SIZE: 10,
  MAX_UPLOAD_MB: 10,
  SESSION_STORAGE_KEY: "edc_session",
};
