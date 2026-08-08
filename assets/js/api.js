/**
 * EDC API SERVICE
 * ---------------------------------------------------------------
 * Single point of contact between the frontend and the backend.
 * Every function here has the SAME signature and return shape
 * whether DEMO_MODE is on or off, so flipping the flag in
 * config.js is the only change needed to go live.
 *
 * Real backend contract (Apps Script):
 *   GET  {API_URL}?action=NAME&param=value...
 *   POST {API_URL}   body: { action: "NAME", ...payload }
 *   Response always: { success: bool, data, message } or
 *                     { success: false, error: { code, message } }
 * ---------------------------------------------------------------
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

  /** Real network call to the Apps Script Web App. */
  async function callBackend(action, params = {}, method = "GET") {
    if (!cfg.API_URL) {
      return fail("NOT_CONFIGURED", "No API_URL is configured in assets/js/config.js.");
    }
    try {
      let res;
      if (method === "GET") {
        const qs = new URLSearchParams({ action, ...params }).toString();
        res = await fetch(`${cfg.API_URL}?${qs}`, { method: "GET" });
      } else {
        res = await fetch(cfg.API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" }, // avoids CORS preflight on Apps Script
          body: JSON.stringify({ action, ...params }),
        });
      }
      return await res.json();
    } catch (err) {
      return fail("NETWORK_ERROR", err.message || "Could not reach the API.");
    }
  }

  // ---------------- PUBLIC CONTENT ----------------

  async function getSiteSettings() {
    if (cfg.DEMO_MODE) { await delay(); return ok(demo.siteSettings); }
    return callBackend("getSiteSettings");
  }

  async function getNavigation() {
    if (cfg.DEMO_MODE) { await delay(); return ok(demo.navigation); }
    return callBackend("getNavigation");
  }

  async function getServices() {
    if (cfg.DEMO_MODE) { await delay(); return ok(demo.services); }
    return callBackend("getServices");
  }

  async function getTestimonials() {
    if (cfg.DEMO_MODE) { await delay(); return ok(demo.testimonials); }
    return callBackend("getTestimonials");
  }

  async function getGallery() {
    if (cfg.DEMO_MODE) { await delay(); return ok(demo.gallery); }
    return callBackend("getGallery");
  }

  async function getFaqs() {
    if (cfg.DEMO_MODE) { await delay(); return ok(demo.faqs); }
    return callBackend("getFaqs");
  }

  async function getTeachers({ featuredOnly = false } = {}) {
    if (cfg.DEMO_MODE) {
      await delay();
      const list = featuredOnly ? demo.teachers.filter(t => t.featured) : demo.teachers;
      return ok(list);
    }
    return callBackend("getTeachers", { featuredOnly });
  }

  async function getTeacher(id) {
    if (cfg.DEMO_MODE) {
      await delay();
      const t = demo.teachers.find(x => x.id === id);
      return t ? ok(t) : fail("NOT_FOUND", "Teacher not found.");
    }
    return callBackend("getTeacher", { id });
  }

  async function getJobs({ status = "Published" } = {}) {
    if (cfg.DEMO_MODE) {
      await delay();
      return ok(demo.jobs.filter(j => j.status === status));
    }
    return callBackend("getJobs", { status });
  }

  async function getJob(id) {
    if (cfg.DEMO_MODE) {
      await delay();
      const j = demo.jobs.find(x => x.id === id);
      return j ? ok(j) : fail("NOT_FOUND", "Job not found.");
    }
    return callBackend("getJob", { id });
  }

  // ---------------- APPLICATIONS ----------------

  async function createApplication(payload) {
    if (cfg.DEMO_MODE) {
      await delay(500);
      const id = "APP-" + String(100000 + Math.floor(Math.random() * 899999));
      return ok({ application_id: id }, "Application submitted successfully.");
    }
    return callBackend("createApplication", payload, "POST");
  }

  async function saveApplicationDraft(payload) {
    if (cfg.DEMO_MODE) {
      await delay(200);
      localStorage.setItem("edc_draft_application", JSON.stringify(payload));
      return ok({ saved: true }, "Draft saved.");
    }
    return callBackend("saveApplicationDraft", payload, "POST");
  }

  async function getApplicationDraft() {
    if (cfg.DEMO_MODE) {
      const raw = localStorage.getItem("edc_draft_application");
      return ok(raw ? JSON.parse(raw) : null);
    }
    return callBackend("getApplicationDraft");
  }

  // ---------------- COMMENTS ----------------

  async function getComments({ pageType } = {}) {
    if (cfg.DEMO_MODE) { await delay(); return ok(demo.comments); }
    return callBackend("getComments", { pageType });
  }

  async function createComment(payload) {
    if (cfg.DEMO_MODE) { await delay(300); return ok({ id: "CMT-" + Date.now() }, "Thanks — your comment was submitted for review."); }
    return callBackend("createComment", payload, "POST");
  }

  // ---------------- AUTH ----------------

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
      setSession(session);
      return ok(session, "Logged in.");
    }
    const result = await callBackend("login", { email, password }, "POST");
    if (result.success) setSession(result.data);
    return result;
  }

  function logout() { clearSession(); return ok({ loggedOut: true }); }

  // ---------------- ADMIN: DASHBOARD / APPLICANTS ----------------

  async function getDashboardStats() {
    if (cfg.DEMO_MODE) { await delay(); return ok(demo.dashboardStats); }
    return callBackend("getDashboardStats");
  }

  async function getApplicants(filters = {}) {
    if (cfg.DEMO_MODE) {
      await delay();
      let list = [...demo.applicants];
      if (filters.status) list = list.filter(a => a.status === filters.status);
      if (filters.search) {
        const q = filters.search.toLowerCase();
        list = list.filter(a => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q));
      }
      return ok(list);
    }
    return callBackend("getApplicants", filters);
  }

  async function updateApplicantStatus(id, status) {
    if (cfg.DEMO_MODE) {
      await delay(250);
      const a = demo.applicants.find(x => x.id === id);
      if (a) a.status = status;
      return ok({ id, status }, "Status updated.");
    }
    return callBackend("updateApplicant", { id, status }, "POST");
  }

  return {
    getSiteSettings, getNavigation, getServices, getTestimonials, getGallery, getFaqs,
    getTeachers, getTeacher, getJobs, getJob,
    createApplication, saveApplicationDraft, getApplicationDraft,
    getComments, createComment,
    login, logout, getSession,
    getDashboardStats, getApplicants, updateApplicantStatus,
  };
})();
