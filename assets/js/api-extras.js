/**
 * API-EXTRAS.JS — NEW FILE
 * Load AFTER assets/js/api.js. Adds account/role endpoints and a few
 * page-builder helpers without touching the original api.js.
 */
(function () {
  const cfg = window.EDC_CONFIG || {};
  const api = (typeof EDC_API !== "undefined") ? EDC_API : window.EDC_API;
  if (!api) { console.error("api-extras.js must load after api.js"); return; }
  window.EDC_API = api; // expose globally (api.js only declares a const)

  function ok(data, message) { return { success: true, data: data, message: message || "OK" }; }
  function fail(code, message) { return { success: false, error: { code: code, message: message } }; }

  function session() { try { return JSON.parse(localStorage.getItem(cfg.SESSION_STORAGE_KEY) || "null"); } catch (e) { return null; } }

  async function call(action, params, method) {
    if (!cfg.API_URL) return fail("NOT_CONFIGURED", "No API_URL configured in assets/js/config.js.");
    const s = session();
    const body = Object.assign({}, params || {});
    if (s && s.token) body.token = s.token;
    try {
      let res;
      if ((method || "GET") === "GET") {
        const qs = new URLSearchParams(Object.assign({ action: action, _ts: String(Date.now()) }, body)).toString();
        res = await fetch(cfg.API_URL + "?" + qs, { method: "GET", cache: "no-store" });
      } else {
        res = await fetch(cfg.API_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(Object.assign({ action: action }, body))
        });
      }
      return await res.json();
    } catch (err) {
      return fail("NETWORK_ERROR", err.message || "Could not reach the API.");
    }
  }

  const demoUsers = [
    { user_id: "USR-1", email: "developer@edc.demo", display_name: "Joseph Brylle D. Egay", role_id: "developer", role_name: "Developer", status: "Active", last_login: "" },
    { user_id: "USR-2", email: "admin@edc.demo", display_name: "Somchai (Demo Admin)", role_id: "admin", role_name: "Administrator", status: "Active", last_login: "" },
    { user_id: "USR-3", email: "teacher@edc.demo", display_name: "Emily Carter", role_id: "teacher", role_name: "Teacher", status: "Active", teacher_id: "TCH-000001", last_login: "" }
  ];

  Object.assign(api, {
    ping: () => call("ping"),

    // ---- Accounts ----
    getUsers: (params) => cfg.DEMO_MODE ? Promise.resolve(ok(demoUsers)) : call("getUsers", params),
    saveUser: (payload) => cfg.DEMO_MODE ? Promise.resolve(ok({ user_id: "USR-demo" }, "Saved (demo).")) : call("saveUser", payload, "POST"),
    setUserStatus: (user_id, status) => cfg.DEMO_MODE ? Promise.resolve(ok({ user_id, status })) : call("setUserStatus", { user_id, status }, "POST"),
    resetUserPassword: (user_id, password) => cfg.DEMO_MODE ? Promise.resolve(ok({ password: "demo1234" })) : call("resetUserPassword", { user_id, password }, "POST"),
    deleteUser: (user_id) => cfg.DEMO_MODE ? Promise.resolve(ok({ deleted: true })) : call("deleteUser", { user_id }, "POST"),
    changeOwnPassword: (current_password, new_password) => cfg.DEMO_MODE ? Promise.resolve(ok({ changed: true })) : call("changeOwnPassword", { current_password, new_password }, "POST"),

    // ---- Roles ----
    getRoles: () => cfg.DEMO_MODE
      ? Promise.resolve(ok({ roles: [{ role_id: "admin", name: "Administrator", description: "", permissions: [] }], catalog: [] }))
      : call("getRoles"),
    saveRole: (payload) => cfg.DEMO_MODE ? Promise.resolve(ok({ role_id: payload.role_id })) : call("saveRole", payload, "POST"),
    deleteRole: (role_id) => cfg.DEMO_MODE ? Promise.resolve(ok({ deleted: true })) : call("deleteRole", { role_id }, "POST"),

    // ---- Page builder additions ----
    duplicateSection: (section_id) => cfg.DEMO_MODE ? Promise.resolve(ok({ section_id: "SEC-demo" })) : call("duplicateSection", { section_id }, "POST"),

    
    // ---- Media library (Page Builder images) --
    getMedia: (params) => cfg.DEMO_MODE ? Promise.resolve(ok([])) : call("getMedia", params),
    uploadMedia: (p) => cfg.DEMO_MODE ? Promise.resolve(ok(Object.assign({ media_id: "MED-demo" }, p))) : call("uploadMedia", p, "POST"),
    updateMedia: (p) => cfg.DEMO_MODE ? Promise.resolve(ok(p)) : call("updateMedia", p, "POST"),
    deleteMedia: (media_id) => cfg.DEMO_MODE ? Promise.resolve(ok({ deleted: true })) : call("deleteMedia", { media_id }, "POST"),

    // ---- Page Builder slug picker ----
    getAvailableSlugs: () => cfg.DEMO_MODE
      ? Promise.resolve(ok({ staticFiles: [], blankSlots: [], assigned: [] }))
      : call("getAvailableSlugs"),
      
  });
})();
