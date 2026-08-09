/* global EDC_API */
/**
 * DYNAMIC-PAGE.JS  —  NEW FILE  (load after api.js)
 * ---------------------------------------------------------------
 * Renders Page Builder content for two cases:
 *   1. BLANK SLOT FILES (slot-1.html .. slot-10.html):
 *      reads <meta name="edc-slug"> and renders a full page
 *      (nav from getNavigation + sections + footer) into #edc-page.
 *      Unpublished / empty slots show a friendly "Coming soon" — never a 404.
 *   2. EXISTING STATIC PAGES (about.html, services.html, …):
 *      add  <div id="edc-dynamic" data-slug="about"></div>  where you want the
 *      builder to inject content, and load this script. In "Replace" mode the
 *      builder's HTML section replaces that container's content. If no
 *      published builder content exists, your original page markup is left
 *      untouched (keep it inside the container as the default).
 * ---------------------------------------------------------------
 */
(function () {
  function getSlug() {
    const m = document.querySelector('meta[name="edc-slug"]');
    if (m && m.content) return m.content.trim();
    const dyn = document.getElementById("edc-dynamic");
    if (dyn && dyn.dataset.slug) return dyn.dataset.slug.trim();
    const p = new URLSearchParams(location.search).get("p");
    return p || "index";
  }
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const parse = (v, f) => { try { return JSON.parse(v); } catch (e) { return f || {}; } };

  function styleStr(s) {
    s = s || {}; let css = "";
    if (s.background) css += "background:" + s.background + ";";
    if (s.padding) css += "padding:" + s.padding + ";";
    if (s.maxWidth) css += "max-width:" + s.maxWidth + ";margin-left:auto;margin-right:auto;";
    if (s.color) css += "color:" + s.color + ";";
    if (s.textAlign || s.align) css += "text-align:" + (s.textAlign || s.align) + ";";
    return css;
  }

  function sectionNode(sec) {
    const c = parse(sec.content_json, {});
    const st = parse(sec.style_json, {});
    const wrap = document.createElement("section");
    wrap.className = "edc-section";
    wrap.style.cssText = styleStr(st) + "padding:" + (st.padding || "20px 16px") + ";";
    const t = String(sec.type || "html");
    if (t === "image") {
      const fig = document.createElement("figure"); fig.style.cssText = "margin:0;";
      const img = document.createElement("img");
      img.src = c.url || ""; img.alt = c.alt_text || ""; img.loading = "lazy";
      img.style.cssText = "width:100%;height:auto;border-radius:10px;" + (c.width ? "max-width:" + c.width + ";" : "") + (c.align ? "display:block;margin-left:auto;margin-right:auto;" : "");
      fig.appendChild(img);
      if (c.caption) { const fc = document.createElement("figcaption"); fc.textContent = c.caption; fc.style.cssText = "text-align:center;font-size:.9rem;color:#666;margin-top:.5rem;"; fig.appendChild(fc); }
      wrap.appendChild(fig);
    } else if (t === "hero") {
      wrap.innerHTML =
        '<div style="padding:56px 20px;text-align:center;border-radius:14px;background:' + (st.background || "#f5f5f5") + ';">' +
        (c.image_url ? '<img src="' + esc(c.image_url) + '" alt="" style="width:100%;max-height:380px;object-fit:cover;border-radius:12px;margin-bottom:20px;">' : '') +
        (c.title ? '<h1 style="font-size:2.4rem;margin:0 0 .5rem;">' + esc(c.title) + '</h1>' : '') +
        (c.subtitle ? '<p style="font-size:1.1rem;opacity:.8;max-width:720px;margin:0 auto 1rem;">' + esc(c.subtitle) + '</p>' : '') +
        (c.cta_label && c.cta_url ? '<a href="' + esc(c.cta_url) + '" style="display:inline-block;padding:12px 24px;background:#0f766e;color:#fff;border-radius:8px;text-decoration:none;">' + esc(c.cta_label) + '</a>' : '') +
        '</div>';
    } else if (t === "text") {
      wrap.innerHTML = (c.heading ? '<h2 style="margin:0 0 .75rem;">' + esc(c.heading) + '</h2>' : '') + (c.html || esc(c.text || ""));
    } else if (t === "gallery") {
      const g = document.createElement("div"); g.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;";
      (c.images || []).forEach(im => {
        const ic = document.createElement("figure"); ic.style.margin = "0";
        ic.innerHTML = '<img src="' + esc(im.url || "") + '" alt="' + esc(im.alt_text || "") + '" style="width:100%;height:200px;object-fit:cover;border-radius:8px;">' +
          (im.caption ? '<figcaption style="font-size:.85rem;text-align:center;margin-top:.4rem;">' + esc(im.caption) + '</figcaption>' : '');
        g.appendChild(ic);
      });
      wrap.appendChild(g);
    } else { // html (default)
      wrap.innerHTML = c.html || esc(c.text || "");
    }
    return wrap;
  }

  async function run() {
    const slug = getSlug();
    const embed = !!document.getElementById("edc-dynamic");
    const target = document.getElementById("edc-dynamic") || document.getElementById("edc-page") || document.body;

    let settings = { data: {} }, nav = { data: [] }, page = { data: {} };
    try { [settings, nav, page] = await Promise.all([EDC_API.getSiteSettings(), EDC_API.getNavigation(), EDC_API.getPublicPage({ slug })]); }
    catch (e) { target.innerHTML = '<p style="padding:40px;text-align:center;color:#888;">Could not load page content.</p>'; return; }

    const s = settings.data || {};
    const pg = page.data || {};

    // No builder page yet -> leave existing page untouched (embed) or show "coming soon" (slot).
    if (!pg.page) {
      if (!embed) target.innerHTML = '<div style="padding:90px 20px;text-align:center;color:#999;"><h2 style="margin:0 0 .5rem;">Coming soon</h2><p>This page has no published content yet.</p></div>';
      return;
    }

    const sections = (pg.sections || []).filter(sec => !(String(sec.visible) === "false" || sec.visible === false));

    // Replace mode only wipes the default content when there is actually something to show.
    if (embed && String(pg.page.render_mode).toLowerCase() === "replace" && sections.length) {
      target.innerHTML = "";
    }
    if (!sections.length) {
      if (!embed) target.innerHTML = '<div style="padding:90px 20px;text-align:center;color:#999;">No content yet.</div>';
      return;
    }
    sections.forEach(sec => target.appendChild(sectionNode(sec)));

    // For slot files (no embed), render a simple nav + footer so they feel like real pages.
    if (!embed) {
      const header = document.createElement("header");
      header.style.cssText = "border-bottom:1px solid #eee;";
      const navItems = (nav.data || []).filter(n => String(n.in_navigation) === "true" || n.in_navigation === true);
      header.innerHTML = '<div style="max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:16px 20px;">' +
        '<a href="index.html" style="font-weight:700;font-size:1.2rem;text-decoration:none;color:inherit;">' + esc(s.short_name || "EDC") + '</a>' +
        '<nav>' + navItems.map(n => '<a href="' + esc(n.slug) + '.html" style="margin-left:18px;text-decoration:none;color:inherit;">' + esc(n.nav_label || n.slug) + '</a>').join("") + '</nav></div>';
      target.parentNode.insertBefore(header, target);
      const footer = document.createElement("footer");
      footer.style.cssText = "padding:30px 20px;text-align:center;color:#888;border-top:1px solid #eee;margin-top:40px;";
      footer.innerHTML = '<div>' + esc(s.company_name || "") + '</div>' + (s.email ? '<div style="margin-top:4px;"><a href="mailto:' + esc(s.email) + '" style="color:#888;">' + esc(s.email) + '</a></div>' : '');
      document.body.appendChild(footer);
    }
  }

  if (document.readyState !== "loading") run(); else document.addEventListener("DOMContentLoaded", run);
})();