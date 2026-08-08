/**
 * EDC API SERVICE
 * ---------------------------------------------------------------
 * Single point of contact between the frontend and the backend.
 * Every function here has the SAME signature and return shape
 * whether DEMO_MODE is on or off, so flipping the flag in
 * config.js is the only change needed to go live.
 */
const EDC_API = (() => {
  const cfg = window.EDC_CONFIG;
  const demo = window.EDC_DEMO;

  function ok(data, message = "OK") { return { success: true, data, message }; }
  function fail(code, message) { return { success: false, error: { code, message } }; }
  async function delay(ms = 220) { return new Promise((r) => setTimeout(r, ms)); }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(cfg.SESSION_STORAGE_KEY) || "null"); }
    catch { return null; }
  }
  function setSession(sess) { localStorage.setItem(cfg.SESSION_STORAGE_KEY, JSON.stringify(sess)); }
  function clearSession() { localStorage.removeItem(cfg.SESSION_STORAGE_KEY); }

  /** Real network call to the Apps Script Web App. Private calls include the current session token. */
  async function callBackend(action, params = {}, method = "GET") {
    if (!cfg.API_URL) return fail("NOT_CONFIGURED", "No API_URL is configured in assets/js/config.js.");
    try {
      const session = getSession();
      const requestParams = Object.assign({}, params);
      if (session && session.token && !requestParams.token) requestParams.token = session.token;
      Object.keys(requestParams).forEach(key => {
        if (requestParams[key] === undefined || requestParams[key] === null) delete requestParams[key];
      });
      let res;
      if (method === "GET") {
        const qs = new URLSearchParams({ action, ...requestParams, _ts: String(Date.now()) }).toString();
        res = await fetch(`${cfg.API_URL}?${qs}`, { method: "GET", cache: "no-store" });
      } else {
        res = await fetch(cfg.API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action, ...requestParams }),
        });
      }
      const result = await res.json();
      if (!res.ok && result.success !== false) return fail("HTTP_ERROR", `API request failed with HTTP ${res.status}.`);
      return result;
    } catch (err) {
      return fail("NETWORK_ERROR", err.message || "Could not reach the API.");
    }
  }

  async function getSiteSettings() { if (cfg.DEMO_MODE) { await delay(); return ok(demo.siteSettings); } return callBackend("getSiteSettings"); }
  async function verifySiteSettings(expected) {
    const fresh = await callBackend("getSiteSettings");
    if (!fresh.success) return fail("VERIFY_FAILED", `Saved, but the site settings could not be re-read: ${fresh.error?.message || "unknown error"}`);
    const mismatches = Object.keys(expected).filter(key => String(fresh.data?.[key] ?? "") !== String(expected[key] ?? ""));
    if (mismatches.length) return fail("VERIFY_FAILED", `The backend did not retain: ${mismatches.join(", ")}.`);
    return ok(fresh.data, "Settings saved and verified on the live backend.");
  }
  async function updateSiteSettings(payload) {
    if (cfg.DEMO_MODE) { await delay(); Object.assign(demo.siteSettings, payload); return ok(demo.siteSettings, "Settings saved (demo)."); }
    const saved = await callBackend("updateSiteSettings", payload, "POST");
    return saved.success ? verifySiteSettings(payload) : saved;
  }
  async function getNavigation() { if (cfg.DEMO_MODE) { await delay(); return ok(demo.navigation); } return callBackend("getNavigation"); }
  async function getServices() { if (cfg.DEMO_MODE) { await delay(); return ok(demo.services); } return callBackend("getServices"); }
  async function getTestimonials() { if (cfg.DEMO_MODE) { await delay(); return ok(demo.testimonials); } return callBackend("getTestimonials"); }
  async function getGallery() { if (cfg.DEMO_MODE) { await delay(); return ok(demo.gallery); } return callBackend("getGallery"); }
  async function getFaqs() { if (cfg.DEMO_MODE) { await delay(); return ok(demo.faqs); } return callBackend("getFaqs"); }
  async function getTeachers({ featuredOnly = false } = {}) {
    if (cfg.DEMO_MODE) { await delay(); return ok(featuredOnly ? demo.teachers.filter(t => t.featured) : demo.teachers); }
    return callBackend("getTeachers", { featuredOnly });
  }
  async function getTeacher(id) {
    if (cfg.DEMO_MODE) { await delay(); const t = demo.teachers.find(x => x.id === id); return t ? ok(t) : fail("NOT_FOUND", "Teacher not found."); }
    return callBackend("getTeacher", { id });
  }
  async function getJobs({ status = "Published" } = {}) {
    if (cfg.DEMO_MODE) { await delay(); return ok(demo.jobs.filter(j => j.status === status)); }
    return callBackend("getJobs", { status });
  }
  async function getJob(id) {
    if (cfg.DEMO_MODE) { await delay(); const j = demo.jobs.find(x => x.id === id); return j ? ok(j) : fail("NOT_FOUND", "Job not found."); }
    return callBackend("getJob", { id });
  }

  async function createApplication(payload) {
    if (cfg.DEMO_MODE) { await delay(500); return ok({ application_id: "APP-" + String(100000 + Math.floor(Math.random() * 899999)) }, "Application submitted successfully."); }
    return callBackend("createApplication", payload, "POST");
  }
  function saveDraftLocally(payload) {
    try { localStorage.setItem("edc_draft_application", JSON.stringify(payload)); return ok({ saved: true }, "Draft saved."); }
    catch { return fail("STORAGE_ERROR", "The application draft could not be saved on this device."); }
  }
  function getDraftLocally() {
    try {
      const raw = localStorage.getItem("edc_draft_application");
      return ok(raw ? JSON.parse(raw) : null);
    } catch { return fail("STORAGE_ERROR", "The application draft could not be read on this device."); }
  }
  async function saveApplicationDraft(payload) { return saveDraftLocally(payload); }
  async function getApplicationDraft() { return getDraftLocally(); }

  async function getComments({ pageType } = {}) {
    if (cfg.DEMO_MODE) { await delay(); return ok(demo.comments); }
    return callBackend("getComments", { pageType });
  }
  async function createComment(payload) {
    if (cfg.DEMO_MODE) { await delay(300); return ok({ id: "CMT-" + Date.now() }, "Thanks — your comment was submitted for review."); }
    return callBackend("createComment", payload, "POST");
  }

  async function login(email, password) {
    if (cfg.DEMO_MODE) {
      await delay(400);
      const knownUsers = {
        "admin@edc.demo": { role: "admin", name: "Somchai (Demo Admin)" },
        "developer@edc.demo": { role: "developer", name: cfg.DEVELOPER_NAME },
        "teacher@edc.demo": { role: "teacher", name: "Emily Carter", teacherId: "TCH-000001" },
      };
      const user = knownUsers[email.toLowerCase()];
      if (!user || password.length < 4) return fail("INVALID_CREDENTIALS", "Incorrect email or password.");
      const session = { email, ...user, token: "demo-" + Date.now(), issuedAt: Date.now() };
      setSession(session); return ok(session, "Logged in.");
    }
    const result = await callBackend("login", { email, password }, "POST");
    if (result.success) setSession(result.data);
    return result;
  }
  function logout() { clearSession(); return ok({ loggedOut: true }); }

  async function getDashboardStats() { if (cfg.DEMO_MODE) { await delay(); return ok(demo.dashboardStats); } return callBackend("getDashboardStats"); }
  async function getApplicants(filters = {}) {
    if (cfg.DEMO_MODE) {
      await delay();
      let list = [...demo.applicants];
      if (filters.status) list = list.filter(a => a.status === filters.status);
      if (filters.search) { const q = filters.search.toLowerCase(); list = list.filter(a => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)); }
      return ok(list);
    }
    return callBackend("getApplicants", filters);
  }
  async function updateApplicantStatus(id, status) {
    if (cfg.DEMO_MODE) { await delay(250); const a = demo.applicants.find(x => x.id === id); if (a) a.status = status; return ok({ id, status }, "Status updated."); }
    return callBackend("updateApplicant", { id, status }, "POST");
  }

  async function getActiveTheme() { if (cfg.DEMO_MODE) { await delay(); return ok({ preset: "default", label: "Default", variables: {}, scheduled: false }); } return callBackend("getActiveTheme"); }
  async function getThemePresets() { if (cfg.DEMO_MODE) { await delay(); return ok([]); } return callBackend("getThemePresets"); }
  async function saveThemePreset(p) {
    if (cfg.DEMO_MODE) { await delay(); return ok({ preset_id: p.preset_id || "THM-demo" }, "Saved (demo)."); }
    const saved = await callBackend("saveThemePreset", p, "POST");
    if (!saved.success) return saved;
    const fresh = await callBackend("getThemePresets");
    const id = saved.data?.preset_id;
    const row = (fresh.data || []).find(x => String(x.preset_id) === String(id));
    if (!fresh.success || !row || row.name !== p.name || row.variables_json !== p.variables_json) {
      return fail("VERIFY_FAILED", "The theme was saved, but the live preset could not be verified.");
    }
    return ok(row, "Theme preset saved and verified on the live backend.");
  }
  async function deleteThemePreset(preset_id) {
    if (cfg.DEMO_MODE) { await delay(); return ok({ deleted: true }); }
    const saved = await callBackend("deleteThemePreset", { preset_id }, "POST");
    if (!saved.success) return saved;
    const fresh = await callBackend("getThemePresets");
    if (!fresh.success || (fresh.data || []).some(x => String(x.preset_id) === String(preset_id))) {
      return fail("VERIFY_FAILED", "The preset deletion could not be verified.");
    }
    return ok({ deleted: true }, "Theme preset deleted and verified.");
  }
  async function getThemeSchedules() { if (cfg.DEMO_MODE) { await delay(); return ok([]); } return callBackend("getThemeSchedules"); }
  async function saveThemeSchedule(s) {
    if (cfg.DEMO_MODE) { await delay(); return ok({ schedule_id: s.schedule_id || "SCH-demo" }, "Saved (demo)."); }
    const saved = await callBackend("saveThemeSchedule", s, "POST");
    if (!saved.success) return saved;
    const fresh = await callBackend("getThemeSchedules");
    const id = saved.data?.schedule_id;
    const row = (fresh.data || []).find(x => String(x.schedule_id) === String(id));
    if (!fresh.success || !row || String(row.preset_id) !== String(s.preset_id) || row.start_date !== s.start_date || row.end_date !== s.end_date || String(row.enabled) !== String(s.enabled === true || s.enabled === "true")) {
      return fail("VERIFY_FAILED", "The theme schedule was saved, but the live schedule could not be verified.");
    }
    return ok(row, "Theme schedule saved and verified on the live backend.");
  }
  async function deleteThemeSchedule(schedule_id) {
    if (cfg.DEMO_MODE) { await delay(); return ok({ deleted: true }); }
    const saved = await callBackend("deleteThemeSchedule", { schedule_id }, "POST");
    if (!saved.success) return saved;
    const fresh = await callBackend("getThemeSchedules");
    if (!fresh.success || (fresh.data || []).some(x => String(x.schedule_id) === String(schedule_id))) {
      return fail("VERIFY_FAILED", "The schedule deletion could not be verified.");
    }
    return ok({ deleted: true }, "Theme schedule deleted and verified.");
  }

  async function getActivePopups(params = {}) { if (cfg.DEMO_MODE) { await delay(); return ok([]); } return callBackend("getActivePopups", params); }
  async function getPopupCampaigns() { if (cfg.DEMO_MODE) { await delay(); return ok([]); } return callBackend("getPopupCampaigns"); }
  async function savePopupCampaign(c) { if (cfg.DEMO_MODE) { await delay(); return ok({ campaign_id: c.campaign_id || "POP-demo" }); } return callBackend("savePopupCampaign", c, "POST"); }
  async function deletePopupCampaign(campaign_id) { if (cfg.DEMO_MODE) { await delay(); return ok({ deleted: true }); } return callBackend("deletePopupCampaign", { campaign_id }, "POST"); }

  async function getPages() { if (cfg.DEMO_MODE) { await delay(); return ok([]); } return callBackend("getPages"); }
  async function getSections(page_id) { if (cfg.DEMO_MODE) { await delay(); return ok([]); } return callBackend("getSections", { page_id }); }
  async function getPublicPage(slug) { if (cfg.DEMO_MODE) { await delay(); return ok({ page: { slug }, sections: [] }); } return callBackend("getPublicPage", { slug }); }
  async function savePage(p) {
    if (cfg.DEMO_MODE) { await delay(); return ok({ page_id: p.page_id || "PAG-demo" }); }
    const saved = await callBackend("savePage", p, "POST");
    if (!saved.success) return saved;
    const fresh = await callBackend("getPages");
    const id = saved.data?.page_id;
    const row = (fresh.data || []).find(x => String(x.page_id) === String(id));
    if (!fresh.success || !row || row.slug !== p.slug || row.nav_label !== (p.nav_label || p.slug)) {
      return fail("VERIFY_FAILED", "The page was saved, but the live page record could not be verified.");
    }
    return ok(row, "Page saved and verified on the live backend.");
  }
  async function deletePage(page_id) {
    if (cfg.DEMO_MODE) { await delay(); return ok({ deleted: true }); }
    const saved = await callBackend("deletePage", { page_id }, "POST");
    if (!saved.success) return saved;
    const fresh = await callBackend("getPages");
    if (!fresh.success || (fresh.data || []).some(x => String(x.page_id) === String(page_id))) {
      return fail("VERIFY_FAILED", "The page deletion could not be verified.");
    }
    return ok({ deleted: true }, "Page deleted and verified.");
  }
  async function createSection(s) {
    if (cfg.DEMO_MODE) { await delay(); return ok({ section_id: "SEC-demo", order: 1 }); }
    const saved = await callBackend("createSection", s, "POST");
    if (!saved.success) return saved;
    const fresh = await callBackend("getSections", { page_id: s.page_id });
    const row = (fresh.data || []).find(x => String(x.section_id) === String(saved.data?.section_id));
    return fresh.success && row ? ok(row, "Section created and verified on the live backend.") : fail("VERIFY_FAILED", "The section was created, but could not be re-read from the live backend.");
  }
  async function updateSection(s) {
    if (cfg.DEMO_MODE) { await delay(); return ok({ section_id: s.section_id }); }
    const saved = await callBackend("updateSection", s, "POST");
    if (!saved.success) return saved;
    const page = await callBackend("getSections", { page_id: s.page_id });
    const row = (page.data || []).find(x => String(x.section_id) === String(s.section_id));
    const contentMatches = s.content_json === undefined || String(row?.content_json || "") === String(typeof s.content_json === "object" ? JSON.stringify(s.content_json) : s.content_json);
    const visibleMatches = s.visible === undefined || String(row?.visible) === String(s.visible === true || s.visible === "true");
    if (!page.success || !row || !contentMatches || !visibleMatches) {
      return fail("VERIFY_FAILED", "The section was saved, but the live section could not be verified.");
    }
    return ok(row, "Section saved and verified on the live backend.");
  }
  async function deleteSection(section_id, page_id) {
    if (cfg.DEMO_MODE) { await delay(); return ok({ deleted: true }); }
    const saved = await callBackend("deleteSection", { section_id }, "POST");
    if (!saved.success) return saved;
    if (page_id) {
      const fresh = await callBackend("getSections", { page_id });
      if (!fresh.success || (fresh.data || []).some(x => String(x.section_id) === String(section_id))) {
        return fail("VERIFY_FAILED", "The section deletion could not be verified.");
      }
    }
    return ok({ deleted: true }, "Section deleted on the live backend.");
  }
  async function reorderSections(page_id, orderedIds) {
    if (cfg.DEMO_MODE) { await delay(); return ok({ reordered: true }); }
    const saved = await callBackend("reorderSections", { page_id, orderedIds }, "POST");
    if (!saved.success) return saved;
    const fresh = await callBackend("getSections", { page_id });
    const actual = (fresh.data || []).map(x => x.section_id);
    return fresh.success && orderedIds.every((id, i) => String(actual[i]) === String(id))
      ? ok({ reordered: true }, "Section order saved and verified on the live backend.")
      : fail("VERIFY_FAILED", "The section order was saved, but could not be verified.");
  }

  async function getContentVersions(params = {}) { if (cfg.DEMO_MODE) { await delay(); return ok([]); } return callBackend("getContentVersions", params); }
  async function restoreContentVersion(version_id) { if (cfg.DEMO_MODE) { await delay(); return ok({ restored: true }); } return callBackend("restoreContentVersion", { version_id }, "POST"); }
  async function sendEmail(p) { if (cfg.DEMO_MODE) { await delay(400); return ok({ sent: true }); } return callBackend("sendEmail", p, "POST"); }
  async function sendBulkEmail(p) { if (cfg.DEMO_MODE) { await delay(600); return ok({ sent: p.recipients.length, failed: 0 }); } return callBackend("sendBulkEmail", p, "POST"); }
  async function testEmail() { if (cfg.DEMO_MODE) { await delay(400); return ok({ sent: true }); } return callBackend("testEmail", {}, "POST"); }

  return {
    getSiteSettings, updateSiteSettings, getNavigation, getServices, getTestimonials, getGallery, getFaqs,
    getTeachers, getTeacher, getJobs, getJob, createApplication, saveApplicationDraft, getApplicationDraft,
    getComments, createComment, login, logout, getSession, getDashboardStats, getApplicants, updateApplicantStatus,
    getActiveTheme, getThemePresets, saveThemePreset, deleteThemePreset, getThemeSchedules, saveThemeSchedule, deleteThemeSchedule,
    getActivePopups, getPopupCampaigns, savePopupCampaign, deletePopupCampaign, getPages, getSections, getPublicPage,
    savePage, deletePage, createSection, updateSection, deleteSection, reorderSections, getContentVersions,
    restoreContentVersion, sendEmail, sendBulkEmail, testEmail,
  };
})();