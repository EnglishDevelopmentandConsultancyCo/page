/**
 * SHARED UI HELPERS (v2)
 * Renders header/footer from CMS data, provides toasts, guards
 * admin/teacher pages by role, and shows the optional announcement
 * banner + popup (spec §148-168, simplified single-announcement version).
 *
 * Change from v1: renderFooter() now checks for Page Builder "footer"
 * sections on the "site-footer" page slug. If found, those editable
 * link groups replace the hardcoded footer links. Falls back to the
 * built-in footer if no builder footer sections exist.
 */
const EDC_UI = (() => {

  function escapeHtml(str = "") {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function currentPage() {
    return (location.pathname.split("/").pop() || "index.html");
  }

  async function renderHeader(navActive = "") {
    const mount = document.getElementById("site-header");
    if (!mount) return;
    const [settingsRes, navRes] = await Promise.all([EDC_API.getSiteSettings(), EDC_API.getNavigation()]);
    const settings = settingsRes.data || {};
    const nav = navRes.data || [];
    const session = EDC_API.getSession();

    if (window.EDC_CONFIG.DEMO_MODE) {
      document.body.classList.add("has-demo-flag");
      const flag = document.createElement("div");
      flag.className = "demo-flag";
      flag.textContent = "DEMO MODE — running on local seed data, no backend connected";
      document.body.prepend(flag);
    }

    if (settings.theme && settings.theme !== "default") {
      document.documentElement.setAttribute("data-theme", settings.theme);
    }

    const navHtml = nav.map(n => `<li><a href="${n.url}" class="${currentPage() === n.url ? "active" : ""}">${escapeHtml(n.label)}</a></li>`).join("");

    const authHtml = session
      ? `<a href="${session.role === "teacher" ? "teacher-portal.html" : "admin.html"}" class="btn btn-outline btn-sm" style="color:#fff;border-color:rgba(255,255,255,.4)">My Account</a>`
      : `<a href="login.html" class="btn btn-outline btn-sm" style="color:#fff;border-color:rgba(255,255,255,.4)">Log In</a>`;

    mount.innerHTML = `
      <div class="container header-inner">
        <a href="index.html" class="brand">
          <span class="brand-mark">${escapeHtml(settings.short_name || "EDC").slice(0,3)}</span>
          <span class="brand-text"><strong>${escapeHtml(settings.short_name || "EDC")}</strong><span>${escapeHtml(settings.company_name || "")}</span></span>
        </a>
        <nav class="main-nav">
          <ul>${navHtml}</ul>
        </nav>
        <div class="header-actions">
          ${authHtml}
          <a href="apply.html" class="btn btn-gold btn-sm"><span class="long">Apply&nbsp;</span>Now</a>
          <button class="nav-toggle" id="navToggle" aria-label="Menu">☰</button>
        </div>
      </div>
      ${settings.announcement_banner && settings.announcement_banner.enabled ? `
      <div style="background:var(--color-accent);color:var(--edc-near-black);font-size:.8rem;text-align:center;padding:.5rem;">
        <span>${escapeHtml(settings.announcement_banner.message)}</span>
        ${settings.announcement_banner.link_url ? ` — <a href="${settings.announcement_banner.link_url}" style="text-decoration:underline;color:inherit;font-weight:600">${escapeHtml(settings.announcement_banner.link_label || "Learn more")}</a>` : ""}
      </div>` : ""}
    `;

    const toggle = document.getElementById("navToggle");
    if (toggle) {
      toggle.addEventListener("click", () => {
        const ul = mount.querySelector(".main-nav ul");
        ul.style.display = ul.style.display === "flex" ? "none" : "flex";
        ul.style.cssText += "position:absolute;top:64px;left:0;right:0;background:var(--edc-near-black);flex-direction:column;padding:1rem 1.5rem;gap:.5rem;";
      });
    }
  }

  async function renderFooter() {
    const mount = document.getElementById("site-footer");
    if (!mount) return;
    const res = await EDC_API.getSiteSettings();
    const s = res.data || {};

    let footerLinkGroups = "";
    try {
      if (typeof EDC_PUBLIC_PAGE !== "undefined" && EDC_PUBLIC_PAGE.renderFooterSections) {
        footerLinkGroups = await EDC_PUBLIC_PAGE.renderFooterSections();
      }
    } catch (e) { footerLinkGroups = ""; }

    if (footerLinkGroups) {
      mount.innerHTML = footerLinkGroups +
        '<div class="container footer-bottom">' +
          '<span>© ' + new Date().getFullYear() + ' ' + escapeHtml(s.company_name || "EDC") + '. All rights reserved.</span>' +
          '<span>Platform by ' + escapeHtml(window.EDC_CONFIG.DEVELOPER_NAME) + '</span>' +
        '</div>';
      return;
    }

    mount.innerHTML = `
      <div class="container footer-grid">
        <div>
          <h4>${escapeHtml(s.short_name || "EDC")}</h4>
          <p style="max-width:280px;font-size:.85rem;">${escapeHtml(s.description || "")}</p>
        </div>
        <div>
          <h4>Company</h4>
          <a href="about.html">About Us</a>
          <a href="services.html">Services</a>
          <a href="teachers.html">Teachers</a>
          <a href="careers.html">Careers</a>
        </div>
        <div>
          <h4>Resources</h4>
          <a href="contact.html">Contact</a>
          <a href="apply.html">Apply Now</a>
          <a href="login.html">Portal Login</a>
        </div>
        <div>
          <h4>Contact</h4>
          <a href="tel:${escapeHtml(s.phone || "")}">${escapeHtml(s.phone || "")}</a>
          <a href="mailto:${escapeHtml(s.email || "")}">${escapeHtml(s.email || "")}</a>
          <span style="display:block;padding:.3rem 0;color:rgba(255,255,255,.68);font-size:.85rem;">${escapeHtml(s.address || "")}</span>
        </div>
      </div>
      <div class="container footer-bottom">
        <span>© ${new Date().getFullYear()} ${escapeHtml(s.company_name || "EDC")}. All rights reserved.</span>
        <span>Platform by ${escapeHtml(window.EDC_CONFIG.DEVELOPER_NAME)}</span>
      </div>
    `;
  }

  function toast(message, type = "info") {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  }

  /** Require the visitor be logged in with one of the given roles, else redirect to login. */
  function requireRole(roles = []) {
    const session = EDC_API.getSession();
    if (!session || !roles.includes(session.role)) {
      window.location.href = "login.html";
      return null;
    }
    return session;
  }

  function statusBadgeClass(status = "") {
    const map = {
      "Draft": "badge-draft", "Submitted": "badge-submitted", "Under Review": "badge-review",
      "Shortlisted": "badge-shortlisted", "Interview Requested": "badge-interview", "Interview Scheduled": "badge-interview",
      "Offer Pending": "badge-offer", "Offer Sent": "badge-offer", "Hired": "badge-hired",
      "Rejected": "badge-rejected", "Withdrawn": "badge-withdrawn",
    };
    return map[status] || "badge-submitted";
  }

  return { renderHeader, renderFooter, toast, requireRole, statusBadgeClass, escapeHtml };
})();
