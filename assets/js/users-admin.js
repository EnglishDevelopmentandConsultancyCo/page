/**
 * USERS-ADMIN.JS — NEW FILE
 * Account management UI: create/edit Admin, Recruiter, Teacher, Editor and
 * Developer accounts, assign roles, reset passwords, activate/suspend.
 * Requires api.js + api-extras.js. Mount with:
 *     EDC_USERS_ADMIN.init("#users-view")
 */
const EDC_USERS_ADMIN = (() => {
  const api = () => (typeof EDC_API !== "undefined" ? EDC_API : window.EDC_API);
  const esc = (v) => EDC_UI.escapeHtml(v == null ? "" : String(v));
  let root, users = [], roles = [], catalog = [], editing = null;

  function toast(r, fallback) {
    EDC_UI.toast((r && (r.message || (r.error && r.error.message))) || fallback, r && r.success ? "success" : "error");
  }

  async function init(selector) {
    root = document.querySelector(selector);
    if (!root) return;
    root.innerHTML =
      '<div class="ua">' +
        '<header class="ua-head">' +
          '<div><h3>Accounts &amp; roles</h3><p class="pb-hint">Create administrators, recruiters, teachers and editors. Each role only sees what it needs.</p></div>' +
          '<div class="pb-row"><button class="pb-btn" id="ua-roles">Manage roles</button>' +
          '<button class="pb-btn pb-btn-primary" id="ua-new">+ New account</button></div>' +
        '</header>' +
        '<div class="ua-filters"><input class="pb-input" id="ua-search" placeholder="Search name or email…">' +
        '<select class="pb-input" id="ua-role-filter"><option value="">All roles</option></select></div>' +
        '<div id="ua-table"></div>' +
      '</div>' +
      '<div class="pb-preview-overlay" id="ua-modal" hidden><div class="ua-modal-box" id="ua-modal-body"></div></div>';

    root.querySelector("#ua-new").onclick = () => openUser(null);
    root.querySelector("#ua-roles").onclick = openRoles;
    root.querySelector("#ua-search").oninput = renderTable;
    root.querySelector("#ua-role-filter").onchange = renderTable;
    await loadAll();
  }

  async function loadAll() {
    const [ur, rr] = await Promise.all([api().getUsers(), api().getRoles()]);
    users = ur.success ? (ur.data || []) : [];
    if (!ur.success) toast(ur, "Unable to load accounts.");
    const rd = rr.success ? (rr.data || {}) : {};
    roles = rd.roles || [];
    catalog = rd.catalog || [];
    const sel = root.querySelector("#ua-role-filter");
    sel.innerHTML = '<option value="">All roles</option>' + roles.map(r => '<option value="' + esc(r.role_id) + '">' + esc(r.name) + "</option>").join("");
    renderTable();
  }

  function renderTable() {
    const q = (root.querySelector("#ua-search").value || "").toLowerCase();
    const rf = root.querySelector("#ua-role-filter").value;
    const rows = users.filter(function (u) {
      const hit = !q || (u.display_name + " " + u.email).toLowerCase().indexOf(q) > -1;
      return hit && (!rf || u.role_id === rf);
    });
    root.querySelector("#ua-table").innerHTML = rows.length
      ? '<table class="ua-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th><th></th></tr></thead><tbody>' +
        rows.map(function (u) {
          return '<tr data-id="' + esc(u.user_id) + '">' +
            "<td><strong>" + esc(u.display_name || "—") + "</strong></td>" +
            "<td>" + esc(u.email) + "</td>" +
            '<td><span class="pb-chip">' + esc(u.role_name || u.role_id) + "</span></td>" +
            '<td><span class="pb-chip' + (String(u.status).toLowerCase() === "active" ? " is-live" : "") + '">' + esc(u.status || "Active") + "</span></td>" +
            "<td>" + esc(u.last_login || "—") + "</td>" +
            '<td class="ua-actions">' +
              '<button class="pb-btn pb-btn-sm" data-act="edit">Edit</button>' +
              '<button class="pb-btn pb-btn-sm" data-act="pw">Reset password</button>' +
              '<button class="pb-btn pb-btn-sm" data-act="status">' + (String(u.status).toLowerCase() === "active" ? "Suspend" : "Activate") + "</button>" +
              '<button class="pb-btn pb-btn-sm pb-btn-danger" data-act="del">Delete</button>' +
            "</td></tr>";
        }).join("") + "</tbody></table>"
      : '<div class="edc-empty">No accounts match your search.</div>';

    root.querySelectorAll(".ua-table tbody tr").forEach(function (tr) {
      const u = users.find(x => x.user_id === tr.dataset.id);
      tr.querySelector('[data-act="edit"]').onclick = () => openUser(u);
      tr.querySelector('[data-act="pw"]').onclick = async function () {
        const pw = prompt("New password for " + u.email + " (leave blank to auto-generate):", "");
        if (pw === null) return;
        const r = await api().resetUserPassword(u.user_id, pw);
        if (r.success && r.data && r.data.password) alert("Temporary password: " + r.data.password);
        toast(r, "Unable to reset password.");
      };
      tr.querySelector('[data-act="status"]').onclick = async function () {
        const next = String(u.status).toLowerCase() === "active" ? "Suspended" : "Active";
        const r = await api().setUserStatus(u.user_id, next);
        toast(r, "Unable to update status."); loadAll();
      };
      tr.querySelector('[data-act="del"]').onclick = async function () {
        if (!confirm("Delete the account for " + u.email + "?")) return;
        const r = await api().deleteUser(u.user_id);
        toast(r, "Unable to delete account."); loadAll();
      };
    });
  }

  function field(label, control) { return '<label class="pb-field"><span>' + esc(label) + "</span>" + control + "</label>"; }

  function openUser(u) {
    editing = u;
    const box = root.querySelector("#ua-modal-body");
    box.innerHTML =
      "<header><strong>" + (u ? "Edit account" : "New account") + '</strong><button class="pb-btn pb-btn-ghost" id="ua-close">Close</button></header>' +
      '<div class="ua-modal-form">' +
        field("Full name", '<input class="pb-input" id="u-name" value="' + esc(u && u.display_name) + '">') +
        field("Email (used to sign in)", '<input class="pb-input" id="u-email" type="email" value="' + esc(u && u.email) + '">') +
        field("Role", '<select class="pb-input" id="u-role">' + roles.map(r =>
          '<option value="' + esc(r.role_id) + '"' + (u && u.role_id === r.role_id ? " selected" : "") + ">" + esc(r.name) + "</option>").join("") + "</select>") +
        field("Status", '<select class="pb-input" id="u-status">' + ["Active", "Suspended"].map(s =>
          '<option' + (u && u.status === s ? " selected" : "") + ">" + s + "</option>").join("") + "</select>") +
        field("Linked teacher ID (optional)", '<input class="pb-input" id="u-teacher" value="' + esc(u && u.teacher_id) + '">') +
        field(u ? "New password (leave blank to keep)" : "Password", '<input class="pb-input" id="u-pass" type="text" placeholder="' + (u ? "unchanged" : "at least 8 characters") + '">') +
        '<p class="pb-hint" id="u-perms"></p>' +
        '<div class="pb-row"><button class="pb-btn pb-btn-primary" id="u-save">Save account</button></div>' +
      "</div>";
    root.querySelector("#ua-modal").hidden = false;
    box.querySelector("#ua-close").onclick = () => { root.querySelector("#ua-modal").hidden = true; };

    function showPerms() {
      const r = roles.find(x => x.role_id === box.querySelector("#u-role").value);
      box.querySelector("#u-perms").textContent = r ? "Can access: " + ((r.permissions || []).join(", ") || "no modules yet") : "";
    }
    box.querySelector("#u-role").onchange = showPerms; showPerms();

    box.querySelector("#u-save").onclick = async function () {
      const payload = {
        user_id: u ? u.user_id : "",
        display_name: box.querySelector("#u-name").value.trim(),
        email: box.querySelector("#u-email").value.trim(),
        role_id: box.querySelector("#u-role").value,
        status: box.querySelector("#u-status").value,
        teacher_id: box.querySelector("#u-teacher").value.trim(),
        password: box.querySelector("#u-pass").value
      };
      if (!payload.email) return EDC_UI.toast("Email is required.", "error");
      if (!u && payload.password.length < 8) return EDC_UI.toast("Set a password of at least 8 characters.", "error");
      const r = await api().saveUser(payload);
      toast(r, "Unable to save the account.");
      if (r.success) { root.querySelector("#ua-modal").hidden = true; loadAll(); }
    };
  }

  function openRoles() {
    const box = root.querySelector("#ua-modal-body");
    box.innerHTML =
      '<header><strong>Roles &amp; permissions</strong><button class="pb-btn pb-btn-ghost" id="ua-close">Close</button></header>' +
      '<div class="ua-modal-form" id="ua-roles-body">' +
        roles.map(function (r) {
          return '<div class="ua-role" data-id="' + esc(r.role_id) + '">' +
            "<h4>" + esc(r.name) + ' <span class="pb-chip">' + esc(r.role_id) + "</span></h4>" +
            '<p class="pb-hint">' + esc(r.description || "") + "</p>" +
            '<div class="ua-perms">' + catalog.map(function (p) {
              return '<label class="pb-check"><input type="checkbox" value="' + esc(p.id || p) + '"' +
                ((r.permissions || []).indexOf(p.id || p) > -1 ? " checked" : "") +
                (r.role_id === "developer" ? " disabled" : "") + "> " + esc(p.label || p) + "</label>";
            }).join("") + "</div>" +
            (r.role_id === "developer" ? '<p class="pb-hint">The developer role always has full access.</p>'
              : '<button class="pb-btn pb-btn-sm pb-btn-primary" data-act="save-role">Save role</button>') +
          "</div>";
        }).join("") +
      "</div>";
    root.querySelector("#ua-modal").hidden = false;
    box.querySelector("#ua-close").onclick = () => { root.querySelector("#ua-modal").hidden = true; };
    box.querySelectorAll(".ua-role").forEach(function (el) {
      const btn = el.querySelector('[data-act="save-role"]');
      if (!btn) return;
      btn.onclick = async function () {
        const perms = Array.from(el.querySelectorAll('input[type="checkbox"]:checked')).map(i => i.value);
        const r = await api().saveRole({ role_id: el.dataset.id, permissions: perms });
        toast(r, "Unable to save the role.");
        if (r.success) loadAll();
      };
    });
  }

  return { init: init, reload: loadAll };
})();
