/**
 * PUBLIC-PAGE.JS — REPLACEMENT FILE
 * ---------------------------------------------------------------
 * Renders Page Builder content on the public website.
 *
 * WHY EDITS WERE NOT SHOWING BEFORE
 *  1. The old slug reader broke on GitHub Pages "pretty" URLs
 *     (/page, /page/about/) and returned a slug the backend had no
 *     row for, so nothing rendered.
 *  2. Sections were only ever APPENDED before the footer, so editing
 *     text that lives in the static HTML changed nothing visible.
 *     This version supports render_mode = "replace": the live
 *     sections take over the region marked with
 *     <main data-edc-region> (or #edc-live-content), hiding the
 *     hard-coded fallback.
 *  3. Every failure was silent. Now add ?edcdebug=1 to any URL and
 *     an on-page panel explains exactly what happened.
 *  4. GitHub Pages / browsers cached the API response. Requests are
 *     now cache-busted and sent with no-store.
 * ---------------------------------------------------------------
 */
const EDC_PUBLIC_PAGE = (() => {
  const DEBUG = /(?:\?|&)edcdebug=1/.test(location.search);
  const notes = [];

  function log(msg) { notes.push(msg); if (DEBUG) console.info("[EDC page builder]", msg); }

  /** Robust slug: works for /index.html, /page/, /page, /page/about/ and /about.html */
  function slug() {
    const override = document.body && document.body.dataset ? document.body.dataset.edcSlug : "";
    if (override) return normalize(override);
    const parts = location.pathname.split("/").filter(Boolean);
    const last = parts.length ? parts[parts.length - 1] : "";
    if (!last || !/\.html?$/i.test(last)) {
      // Directory-style URL: only treat the last segment as a page when it is
      // not the repository/base folder. Safest default is the home page.
      const known = ["about", "services", "teachers", "careers", "contact", "apply", "job", "teacher"];
      return known.indexOf(normalize(last)) >= 0 ? normalize(last) : "index";
    }
    return normalize(last);
  }

  function normalize(v) {
    return String(v || "").trim().toLowerCase()
      .replace(/^\/+|\/+$/g, "").replace(/\.html?$/, "")
      .replace(/[^a-z0-9\-_]/g, "-").replace(/-+/g, "-") || "index";
  }

  function esc(value) { return EDC_UI.escapeHtml(value == null ? "" : value); }

  function parse(raw, fallback) {
    try {
      const parsed = JSON.parse(raw || "{}");
      return parsed && typeof parsed === "object" ? parsed : (fallback || {});
    } catch (e) { return raw ? { text: String(raw) } : (fallback || {}); }
  }

  function safeImage(url) {
    const u = String(url || "").trim();
    return /^(https?:\/\/|\.?\/|assets\/|data:image\/)/i.test(u) ? u : "";
  }

  function safeLink(url) {
    const u = String(url || "").trim();
    return /^(https?:\/\/|mailto:|tel:|#|\.?\/|[\w-]+\.html)/i.test(u) ? u : "";
  }

  /* ---------------- style engine: everything is customisable ---------------- */

  function cssUnit(v) {
    if (v === undefined || v === null || v === "") return "";
    return /^-?\d+(\.\d+)?$/.test(String(v)) ? v + "px" : String(v);
  }

  function sectionStyle(st) {
    const s = [];
    if (st.background) s.push("background:" + st.background);
    if (st.color) s.push("color:" + st.color);
    if (st.paddingY) s.push("padding-top:" + cssUnit(st.paddingY) + ";padding-bottom:" + cssUnit(st.paddingY));
    if (st.paddingX) s.push("padding-left:" + cssUnit(st.paddingX) + ";padding-right:" + cssUnit(st.paddingX));
    if (st.minHeight) s.push("min-height:" + cssUnit(st.minHeight));
    if (st.radius) s.push("border-radius:" + cssUnit(st.radius));
    if (st.align) s.push("text-align:" + st.align);
    if (st.backgroundImage) {
      s.push("background-image:linear-gradient(rgba(0,0,0," + (st.overlay || 0.35) + "),rgba(0,0,0," + (st.overlay || 0.35) + ")),url('" + safeImage(st.backgroundImage) + "')");
      s.push("background-size:cover;background-position:" + (st.backgroundPosition || "center"));
    }
    return s.join(";");
  }

  function innerStyle(st) {
    const s = [];
    if (st.maxWidth) s.push("max-width:" + cssUnit(st.maxWidth));
    s.push("margin-left:" + (st.blockAlign === "left" ? "0" : "auto"));
    s.push("margin-right:" + (st.blockAlign === "right" ? "0" : "auto"));
    return s.join(";");
  }

  function imageStyle(st) {
    const i = st.image || {};
    const s = ["display:block", "max-width:100%", "height:auto"];
    if (i.width) s.push("width:" + cssUnit(i.width));
    if (i.maxWidth) s.push("max-width:" + cssUnit(i.maxWidth));
    if (i.height) s.push("height:" + cssUnit(i.height));
    if (i.fit) s.push("object-fit:" + i.fit);
    if (i.position) s.push("object-position:" + i.position);
    if (i.radius) s.push("border-radius:" + cssUnit(i.radius));
    if (i.shadow) s.push("box-shadow:0 18px 40px rgba(15,23,42,.18)");
    if (i.align === "center") s.push("margin-left:auto;margin-right:auto");
    else if (i.align === "right") s.push("margin-left:auto;margin-right:0");
    else s.push("margin-left:0;margin-right:auto");
    if (i.marginTop) s.push("margin-top:" + cssUnit(i.marginTop));
    if (i.marginBottom) s.push("margin-bottom:" + cssUnit(i.marginBottom));
    return s.join(";");
  }

  function img(src, alt, st) {
    if (!src) return "";
    return '<img class="edc-live-image" loading="lazy" src="' + esc(src) + '" alt="' + esc(alt || "") + '" style="' + esc(imageStyle(st)) + '">';
  }

  /* ------------------------------- renderers ------------------------------- */

  function renderSection(section) {
    const data = parse(section.content_json, {});
    const st = parse(section.style_json, {});
    const type = String(section.type || "text").toLowerCase();
    const title = data.title || data.heading || "";
    const body = data.body || data.text || data.content || "";
    const image = safeImage(data.image_url || data.image || data.src);
    const link = safeLink(data.cta_url || data.url);
    const link2 = safeLink(data.cta2_url);
    const cta2 = link2 ? '<a class="btn btn-outline edc-live-cta2" style="margin-left:.5rem" href="' + esc(link2) + '">' + esc(data.cta2_label || "Learn more") + "</a>" : "";
    const cta = link ? '<a class="btn ' + (st.buttonVariant || "btn-gold") + ' edc-live-cta" href="' + esc(link) + '">' + esc(data.cta_label || "Learn more") + "</a>" : "";
    const open = '<section class="section edc-live-section edc-live-' + esc(type) + '" data-section-id="' + esc(section.section_id) + '" style="' + esc(sectionStyle(st)) + '"><div class="container" style="' + esc(innerStyle(st)) + '">';
    const close = "</div></section>";

    if (type === "hero") {
      return open +
        (data.eyebrow ? '<span class="eyebrow">' + esc(data.eyebrow) + "</span>" : "") +
        (title ? "<h1>" + esc(title) + "</h1>" : "") +
        (body ? '<p class="lead">' + esc(body) + "</p>" : "") +
        (image ? '<div class="hero-photo">' + img(image, data.alt || title, st) + "</div>" : "") +
        cta + cta2 + close;
    }

    if (type === "image") {
      return open +
        (title ? '<div class="section-head"><h2>' + esc(title) + "</h2></div>" : "") +
        img(image, data.alt || title, st) +
        (body ? '<p class="mt-4">' + esc(body) + "</p>" : "") + cta + close;
    }

    if (type === "split") {
      const reverse = st.reverse === true || data.reverse === true;
      const text = '<div class="edc-split-text">' +
        (title ? "<h2>" + esc(title) + "</h2>" : "") +
        (body ? '<p class="muted">' + esc(body) + "</p>" : "") + cta + "</div>";
      const media = '<div class="edc-split-media">' + img(image, data.alt || title, st) + "</div>";
      return open + '<div class="edc-split" style="gap:' + cssUnit(st.gap || 40) + '">' +
        (reverse ? media + text : text + media) + "</div>" + close;
    }

    if (type === "grid" || type === "cards") {
      const items = Array.isArray(data.items) ? data.items : [];
      const cols = Number(st.columns) || (items.length >= 3 ? 3 : 2);
      return open +
        (title ? '<div class="section-head"><h2>' + esc(title) + "</h2></div>" : "") +
        '<div class="edc-live-grid" style="display:grid;gap:' + cssUnit(st.gap || 24) + ';grid-template-columns:repeat(auto-fit,minmax(' + cssUnit(st.minCard || 260) + ',1fr));--cols:' + cols + '">' +
        items.map(function (item) {
          const itemImg = safeImage(item.image_url || item.image);
          return '<div class="card"><div class="card-body">' +
            (itemImg ? img(itemImg, item.title, st) : "") +
            (item.title ? "<h3>" + esc(item.title) + "</h3>" : "") +
            (item.text || item.body ? '<p class="muted">' + esc(item.text || item.body) + "</p>" : "") +
            (safeLink(item.url) ? '<a class="btn btn-outline btn-sm mt-4" href="' + esc(safeLink(item.url)) + '">' + esc(item.cta_label || "Read more") + "</a>" : "") +
            "</div></div>";
        }).join("") + "</div>" + (cta ? '<div class="mt-6" style="margin-top:24px">' + cta + "</div>" : "") + close;
    }

    if (type === "cta" || type === "banner") {
      return open + '<div class="cta-band"><div>' +
        (title ? "<h2>" + esc(title) + "</h2>" : "") +
        (body ? "<p>" + esc(body) + "</p>" : "") + "</div>" + cta + "</div>" + close;
    }

    if (type === "html" && st.allowHtml === true) {
      // Only rendered when a developer explicitly ticks "allow raw HTML".
      return open + (data.html || "") + close;
    }

    if (type === "spacer") {
      return '<div class="edc-live-spacer" style="height:' + cssUnit(st.height || 48) + '"></div>';
    }

    return open +
      (title ? '<div class="section-head"><h2>' + esc(title) + "</h2></div>" : "") +
      (body ? "<p>" + esc(body).replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>") + "</p>" : "") +
      (image ? img(image, data.alt || title, st) : "") + cta + close;
  }

  /* -------------------------------- mounting ------------------------------- */

  function mountTarget() {
    return document.getElementById("edc-live-content")
      || document.querySelector("[data-edc-region]")
      || null;
  }

  function debugPanel(pageSlug, result) {
    if (!DEBUG) return;
    const box = document.createElement("div");
    box.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:99999;max-width:380px;background:#0f172a;color:#e2e8f0;font:12px/1.5 ui-monospace,monospace;padding:14px 16px;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.35)";
    box.innerHTML = "<strong>EDC Page Builder diagnostics</strong><br>slug: " + esc(pageSlug) +
      "<br>api: " + esc(String((window.EDC_CONFIG || {}).API_URL || "").slice(0, 48) + "…") +
      "<br>demo mode: " + String((window.EDC_CONFIG || {}).DEMO_MODE) +
      "<br>ok: " + String(result && result.success) +
      "<br>" + notes.map(esc).join("<br>");
    document.body.appendChild(box);
  }

  async function render() {
    const pageSlug = slug();
    // ROOT CAUSE #1 (fixed): api.js declares `const EDC_API`, which in a classic
    // <script> is script-scoped and NEVER attached to window. The old code tested
    // `window.EDC_API` and returned early on every single public page, so builder
    // edits could never appear. Use the lexical binding instead.
    const api = (typeof EDC_API !== "undefined") ? EDC_API : window.EDC_API;
    if (!api || typeof EDC_CONFIG === "undefined") { log("api.js/config.js not loaded before public-page.js — check script order."); return debugPanel(pageSlug, null); }
    window.EDC_API = api; // make it reachable for other modules too
    if (EDC_CONFIG.DEMO_MODE) { log("DEMO_MODE is ON — the live backend is not being read. Set DEMO_MODE:false in assets/js/config.js."); return debugPanel(pageSlug, null); }

    const result = await api.getPublicPage(pageSlug);
    if (!result || !result.success) {
      log("API error: " + ((result && result.error && result.error.message) || "unknown"));
      return debugPanel(pageSlug, result);
    }
    const payload = result.data || {};
    if (payload.reason) log(payload.reason);

    const sections = (payload.sections || []).filter(s => String(s.visible).toLowerCase() !== "false");
    if (!sections.length) { log("Nothing to render for this page."); return debugPanel(pageSlug, result); }

    const mode = String((payload.page && payload.page.render_mode) || "append").toLowerCase();
    const html = sections.map(renderSection).join("");
    const target = mountTarget();

    if (mode === "replace" && target) {
      target.innerHTML = html;
      target.setAttribute("data-edc-live", "replaced");
      log("Replaced the static content region with " + sections.length + " live section(s).");
    } else {
      const mount = document.getElementById("edc-live-page-sections") || document.createElement("div");
      mount.id = "edc-live-page-sections";
      mount.innerHTML = html;
      if (!mount.parentNode) {
        if (target) target.appendChild(mount);
        else {
          const footer = document.getElementById("site-footer");
          if (footer && footer.parentNode) footer.parentNode.insertBefore(mount, footer);
          else document.body.appendChild(mount);
        }
      }
      log("Appended " + sections.length + " live section(s)." + (mode === "replace" ? " (render_mode=replace but this page has no <main data-edc-region> marker.)" : ""));
    }

    document.dispatchEvent(new CustomEvent("edc:page-rendered", { detail: { slug: pageSlug, count: sections.length } }));
    debugPanel(pageSlug, result);
  }

  /* ------------------------- editable site footer ------------------------- */
  /**
   * Renders Page Builder "footer" sections stored on the page with slug
   * "site-footer". ui.js calls this on every page; when it returns markup the
   * built-in hardcoded footer links are replaced by the editable ones.
   */
  async function renderFooterSections() {
    const api = (typeof EDC_API !== "undefined") ? EDC_API : window.EDC_API;
    if (!api || (typeof EDC_CONFIG !== "undefined" && EDC_CONFIG.DEMO_MODE)) return "";
    let payload;
    try {
      const r = await api.getPublicPage("site-footer");
      if (!r || !r.success) return "";
      payload = r.data || {};
    } catch (e) { return ""; }

    const sections = (payload.sections || [])
      .filter(s => String(s.visible).toLowerCase() !== "false")
      .filter(s => String(s.type || "").toLowerCase() === "footer");
    if (!sections.length) return "";

    const cols = [];
    sections.forEach(function (section) {
      const data = parse(section.content_json, {});
      if (data.title || data.body) {
        cols.push("<div><h4>" + esc(data.title || "") + "</h4>" +
          (data.body ? '<p style="max-width:280px;font-size:.85rem;">' + esc(data.body) + "</p>" : "") + "</div>");
      }
      (Array.isArray(data.groups) ? data.groups : []).forEach(function (g) {
        cols.push("<div><h4>" + esc(g.title || "") + "</h4>" +
          (Array.isArray(g.links) ? g.links : []).map(function (l) {
            const u = safeLink(l.url) || "#";
            return '<a href="' + esc(u) + '">' + esc(l.label || "") + "</a>";
          }).join("") + "</div>");
      });
    });
    if (!cols.length) return "";
    return '<div class="container footer-grid">' + cols.join("") + "</div>";
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();

  return { render: render, slug: slug, renderSection: renderSection, renderFooterSections: renderFooterSections };
})();
