/* global EDC_API, EDC_MEDIA, EDC_BUILDER_PLUS */
/**
 * PAGE-BUILDER-PLUS.JS  —  NEW FILE  (load in admin.html after api-extras.js + media-picker.js)
 * ---------------------------------------------------------------
 * Optional helpers that wire the new Media + slug features into the existing
 * Page Builder WITHOUT rewriting it. Call from your builder UI:
 *
 *   EDC_BUILDER_PLUS.mediaLibrary()              // open the image library
 *   EDC_BUILDER_PLUS.availableSlugs()           // see which .html files are free
 *   EDC_BUILDER_PLUS.importCurrentHtml(slug)     // pull a live page into the builder
 *   EDC_BUILDER_PLUS.attachPicker(btn, onPick)   // bind any button to the image picker
 *
 * Suggested: add three buttons to your Page Builder panel:
 *   <button onclick="EDC_BUILDER_PLUS.mediaLibrary()">Media Library</button>
 *   <button onclick="EDC_BUILDER_PLUS.availableSlugs()">Available page files</button>
 *   <button onclick="EDC_BUILDER_PLUS.importCurrentHtml()">Import current page HTML</button>
 * And for every image field in a section, use:
 *   EDC_BUILDER_PLUS.attachPicker(btnEl, (picked) => { imgInput.value = picked.url; });
 * ---------------------------------------------------------------
 */
(function () {
  const api = window.EDC_API;
  if (!api) { console.error("page-builder-plus.js needs EDC_API"); return; }
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function modal(title, bodyHtml) {
    const ov = document.createElement("div");
    ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9998;display:flex;align-items:center;justify-content:center;font-family:inherit;";
    const box = document.createElement("div");
    box.style.cssText = "background:#fff;border-radius:12px;width:min(760px,94vw);max-height:90vh;overflow:auto;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.3);";
    box.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;"><h3 style="margin:0">' + esc(title) + '</h3><button data-close style="border:none;background:none;font-size:1.4rem;cursor:pointer;">×</button></div><div data-body>' + bodyHtml + '</div>';
    ov.appendChild(box); document.body.appendChild(ov);
    const close = () => ov.remove();
    box.querySelector("[data-close]").onclick = close;
    ov.addEventListener("click", e => { if (e.target === ov) close(); });
    return { box, close };
  }

  window.EDC_BUILDER_PLUS = {
    async mediaLibrary() {
      const r = await api.getMedia();
      const list = r.data || [];
      const body =
        '<div id="mpGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;"></div>' +
        '<div style="margin-top:16px;text-align:right;"><button id="mpUpload" class="btn btn-primary">+ Upload / add image</button></div>';
      const m = modal("Media Library", body);
      const grid = m.box.querySelector("#mpGrid");
      (function render() {
        grid.innerHTML = list.length ? list.map(im =>
          '<figure style="margin:0;position:relative;">' +
          '<img src="' + esc(im.url) + '" alt="' + esc(im.alt_text) + '" style="width:100%;height:120px;object-fit:cover;border-radius:8px;">' +
          '<figcaption style="font-size:.75rem;color:#666;margin-top:.3rem;">' + esc(im.alt_text || im.category || "") + '</figcaption>' +
          '<div style="display:flex;gap:6px;margin-top:.3rem;">' +
          '<button data-copy="' + esc(im.url) + '" class="btn btn-outline btn-sm">Copy URL</button>' +
          '<button data-del="' + esc(im.media_id) + '" class="btn btn-ghost btn-sm" style="color:#c00">Delete</button></div></figure>'
        ).join("") : '<p style="grid-column:1/-1;color:#888;text-align:center;">No images yet.</p>';
        grid.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => { if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Copied!"; });
        grid.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => { if (confirm("Delete this image?")) { await api.deleteMedia(b.dataset.del); m.close(); EDC_BUILDER_PLUS.mediaLibrary(); } });
      })();
      m.box.querySelector("#mpUpload").onclick = async () => { const p = await EDC_MEDIA.open(); if (p) { m.close(); EDC_BUILDER_PLUS.mediaLibrary(); } };
    },

    async availableSlugs() {
      const r = await api.getAvailableSlugs();
      const d = r.data || {};
      const rows = [...(d.staticFiles || []), ...(d.blankSlots || [])].map(f =>
        '<tr><td style="padding:6px;border-bottom:1px solid #eee;">' + esc(f.slug + (f.kind === "blank-slot" ? ".html" : ".html")) + '</td>' +
        '<td style="padding:6px;border-bottom:1px solid #eee;">' + esc(f.kind) + '</td>' +
        '<td style="padding:6px;border-bottom:1px solid #eee;">' + (f.assigned ? '<span style="color:#080">assigned</span>' : '<span style="color:#0f766e;font-weight:600">free</span>') + '</td></tr>'
      ).join("");
      modal("Available page files / slugs",
        '<p style="color:#666;font-size:.85rem;margin:0 0 12px;">When creating a page, pick a slug from the "free" rows so it maps to a real .html file (no 404).</p>' +
        '<table style="width:100%;border-collapse:collapse;"><thead><tr><th style="text-align:left;padding:6px;border-bottom:2px solid #eee">Slug / file</th><th style="text-align:left;padding:6px;border-bottom:2px solid #eee">Kind</th><th style="text-align:left;padding:6px;border-bottom:2px solid #eee">Status</th></tr></thead><tbody>' + rows + '</tbody></table>');
    },

    /**
     * Import a live page into the Page Builder as EDITABLE sections.
     *
     * slug "index" (the homepage) is a composite built by homepage-manager.js
     * from Site Settings + the Google Sheet. It is imported as fully typed
     * sections — hero, card grids, CTA — so every heading, link, card and
     * PHOTO can be edited (and swapped through the Media Library) in the
     * builder. The default site footer is imported too, onto the reserved
     * "site-footer" page, where the "Footer links" editor picks it up.
     *
     * Any other slug pulls the static .html file and converts each block into
     * typed sections (hero / text / image / split) where possible, falling
     * back to an editable "Raw HTML" section.
     */
    async importCurrentHtml(slug) {
      if (!slug) slug = prompt("Enter the page slug to import (e.g. index, about, services):", "index");
      if (!slug) return;
      slug = String(slug).trim().toLowerCase().replace(/\.html?$/, "");

      const pg = await ensurePage(slug);
      if (!pg) return;

      const made = { n: 0 };
      await clearImported(pg.page_id);

      if (slug === "index") await importHomepage(pg, made);
      else await importStaticFile(pg, slug, made);

      // Footer (default footer links) — always imported so it becomes editable.
      let footerNote = "";
      try {
        const fpg = await ensurePage("site-footer", "Site Footer");
        if (fpg) {
          await clearImported(fpg.page_id);
          const fmade = { n: 0 };
          await importFooter(fpg, fmade);
          if (fmade.n) footerNote = " Default footer imported to the \"Site Footer\" page (edit it with the \"Footer links\" section).";
        }
      } catch (e) {}

      // Make sure the imported sections actually take over the page.
      let modeNote = " Set Content mode = replace and Status = Published, then save.";
      try {
        await api.savePage({
          page_id: pg.page_id, slug: pg.slug, nav_label: pg.nav_label || pg.slug,
          render_mode: "replace", status: "Published",
          in_navigation: pg.in_navigation === true, order: pg.order || 0
        });
        modeNote = " Content mode set to replace and the page published.";
      } catch (e) {}

      if (typeof EDC_PAGEBUILDER !== "undefined" && EDC_PAGEBUILDER.reload) { try { await EDC_PAGEBUILDER.reload(); } catch (e) {} }

      alert(made.n
        ? "Imported " + made.n + " editable section(s) for \"" + slug + "\"." + footerNote + modeNote
        : "Nothing could be imported for \"" + slug + "\"." + footerNote);
    },
    attachPicker(btn, onPick) { btn.onclick = async () => { const p = await EDC_MEDIA.open(); if (p && onPick) onPick(p); }; }
  };

  /* ----------------------- import helpers (editable) ----------------------- */

  const HP = () => (typeof EDC_HOMEPAGE !== "undefined" ? EDC_HOMEPAGE : window.EDC_HOMEPAGE);

  async function ensurePage(slug, label) {
    const pages = (await api.getPages()).data || [];
    let pg = pages.find(p => String(p.slug).toLowerCase() === slug);
    if (pg) return pg;
    const r = await api.savePage({
      nav_label: label || (slug === "index" ? "Home" : slug),
      slug: slug, status: "Published", render_mode: "replace",
      in_navigation: false, order: pages.length + 1
    });
    if (!r || !r.success) { alert('Could not create the "' + slug + '" page: ' + ((r && r.error && r.error.message) || "unknown error")); return null; }
    const fresh = (await api.getPages()).data || [];
    return fresh.find(p => String(p.slug).toLowerCase() === slug) || { page_id: r.data.page_id, slug: slug };
  }

  /** Remove sections created by a previous import so re-importing never piles up. */
  async function clearImported(page_id) {
    let existing = [];
    try { existing = (await api.getSections(page_id)).data || []; } catch (e) { return; }
    for (const s of existing) {
      let st = {};
      try { st = JSON.parse(s.style_json || "{}") || {}; } catch (e) { st = {}; }
      if (st.imported) { try { await api.deleteSection(s.section_id, page_id); } catch (e) {} }
    }
  }

  async function addSection(page_id, type, content, style, made) {
    const r = await api.createSection({
      page_id: page_id, type: type,
      content_json: content,
      style_json: Object.assign({ imported: true }, style || {})
    });
    if (r && r.success && made) made.n++;
    return r;
  }

  /* ------------------------------- homepage -------------------------------- */

  async function importHomepage(pg, made) {
    const settings = (await api.getSiteSettings()).data || {};
    const hp = HP();
    const hero = hp && hp.getHero ? hp.getHero(settings) : (settings.hero || {});
    const fc = hp && hp.getFooterCta ? hp.getFooterCta(settings) : (settings.footer_cta || {});
    const order = hp && hp.getSections ? hp.getSections(settings) : [
      { id: "hero", visible: true }, { id: "services", visible: true },
      { id: "teachers", visible: true }, { id: "cta", visible: true },
      { id: "testimonials", visible: true }
    ];

    for (const sec of order) {
      if (sec.visible === false) continue;
      if (sec.id === "hero") await importHero(pg, hero, made);
      else if (sec.id === "services") await importServices(pg, made);
      else if (sec.id === "teachers") await importTeachers(pg, made);
      else if (sec.id === "cta") await importCta(pg, fc, made);
      else if (sec.id === "testimonials") await importTestimonials(pg, made);
    }
  }

  async function importHero(pg, hero, made) {
    const photos = Array.isArray(hero.photos) ? hero.photos : [];
    const ph = photos[0] || {};
    await addSection(pg.page_id, "hero", {
      eyebrow: hero.eyebrow || "",
      title: hero.title || "",
      body: hero.subtitle || "",
      cta_label: hero.cta_primary_label || "",
      cta_url: hero.cta_primary_url || "",
      cta2_label: hero.cta_secondary_label || "",
      cta2_url: hero.cta_secondary_url || "",
      image_url: ph.url || "",
      alt: ph.alt || ""
    }, {
      image: { fit: hero.crop_fit || "cover", position: hero.crop_position || "center", radius: 18, maxWidth: "100%" }
    }, made);

    // Extra slideshow photos stay editable as their own image sections.
    for (let i = 1; i < photos.length; i++) {
      await addSection(pg.page_id, "image", { title: "", image_url: photos[i].url || "", alt: photos[i].alt || "" },
        { image: { fit: hero.crop_fit || "cover", position: hero.crop_position || "center", radius: 18, align: "center" } }, made);
    }
  }

  async function importServices(pg, made) {
    let services = [];
    try { services = (await api.getServices()).data || []; } catch (e) {}
    if (!services.length) return;
    await addSection(pg.page_id, "grid", {
      eyebrow: "Why Schools & Teachers Choose EDC",
      title: "A recruitment partner that handles the details.",
      items: services.map(s => ({
        title: [s.icon, s.title].filter(Boolean).join(" ").trim() || s.title || "",
        text: s.short || s.description || "",
        url: s.url || ""
      }))
    }, { columns: 4, align: "center", gap: 24 }, made);
  }

  async function importTeachers(pg, made) {
    let teachers = [];
    try { teachers = (await api.getTeachers({ featuredOnly: true })).data || []; } catch (e) {}
    if (!teachers.length) return;
    await addSection(pg.page_id, "grid", {
      eyebrow: "Teaching Opportunities",
      title: "Featured teachers on our roster.",
      cta_label: "View All Teachers",
      cta_url: "teachers.html",
      items: teachers.map(t => ({
        title: t.name || "",
        text: [t.position || "", (Array.isArray(t.subjects) ? t.subjects.slice(0, 2).join(", ") : "")].filter(Boolean).join(" — "),
        url: t.id ? "teacher.html?id=" + t.id : "",
        cta_label: "View profile",
        image_url: t.photo || "",
        alt: t.name || ""
      }))
    }, { columns: 4, gap: 24, image: { fit: "cover", height: 200, radius: 12, align: "center" } }, made);
  }

  async function importCta(pg, fc, made) {
    await addSection(pg.page_id, "cta", {
      title: "Ready to teach in Thailand?",
      body: fc.text || "",
      cta_label: fc.button_label || "",
      cta_url: fc.button_url || ""
    }, {
      background: fc.background || "#0f172a",
      color: fc.color || "#ffffff",
      buttonVariant: "btn-gold"
    }, made);
  }

  async function importTestimonials(pg, made) {
    let list = [];
    try { list = (await api.getTestimonials()).data || []; } catch (e) {}
    if (!list.length) return;
    await addSection(pg.page_id, "grid", {
      eyebrow: "Testimonials",
      title: "What teachers and partner schools say.",
      items: list.map(t => ({
        title: [t.name, t.role].filter(Boolean).join(" — "),
        text: t.quote || ""
      }))
    }, { columns: 3, gap: 24 }, made);
  }

  /* -------------------------------- footer --------------------------------- */

  async function importFooter(pg, made) {
    const settings = (await api.getSiteSettings()).data || {};
    // Same defaults the built-in footer (ui.js renderFooter) prints.
    const groups = [
      { title: "Company", links: [
        { label: "About Us", url: "about.html" }, { label: "Services", url: "services.html" },
        { label: "Teachers", url: "teachers.html" }, { label: "Careers", url: "careers.html" }
      ]},
      { title: "Resources", links: [
        { label: "Contact", url: "contact.html" }, { label: "Apply Now", url: "apply.html" },
        { label: "Portal Login", url: "login.html" }
      ]},
      { title: "Contact", links: [
        settings.phone ? { label: settings.phone, url: "tel:" + settings.phone } : null,
        settings.email ? { label: settings.email, url: "mailto:" + settings.email } : null,
        settings.address ? { label: settings.address, url: "contact.html" } : null
      ].filter(Boolean) }
    ];
    await addSection(pg.page_id, "footer", {
      title: settings.short_name || "EDC",
      body: settings.description || "",
      groups: groups
    }, {}, made);
    await api.savePage({
      page_id: pg.page_id, slug: "site-footer", nav_label: pg.nav_label || "Site Footer",
      status: "Published", render_mode: "append", in_navigation: false, order: pg.order || 99
    });
  }

  /* ------------------------- static .html conversion ----------------------- */

  async function importStaticFile(pg, slug, made) {
    const url = "./" + slug + ".html";
    let html;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      html = await res.text();
    } catch (e) { alert("Could not fetch " + url + ": " + e.message); return; }

    const doc = new DOMParser().parseFromString(html, "text/html");
    const main = doc.querySelector("main[data-edc-region]") || doc.querySelector("main") || doc.body;
    if (!main) { alert("No content found in " + url + "."); return; }
    if (/loading/i.test(main.textContent || "") && !main.querySelector("section")) {
      alert('The page "' + slug + '" is built by JavaScript, so it has no static HTML to import.');
      return;
    }
    main.querySelectorAll("script, style").forEach(el => el.remove());

    const blocks = Array.from(main.querySelectorAll(":scope > section"));
    if (!blocks.length) blocks.push(main);
    for (const block of blocks) await convertBlock(pg, block, made);
  }

  async function convertBlock(pg, el, made) {
    const q = (sel) => el.querySelector(sel);
    const txt = (node) => (node ? node.textContent.replace(/\s+/g, " ").trim() : "");
    const eyebrow = txt(q(".eyebrow"));
    const h1 = q("h1"), h2 = q("h2");
    const title = txt(h1 || h2);
    const image = q("img");
    const link = q("a.btn, .hero-actions a, .cta-band a");
    const link2 = el.querySelectorAll("a.btn, .hero-actions a")[1];
    const paragraphs = Array.from(el.querySelectorAll("p")).map(txt).filter(Boolean);
    const cards = Array.from(el.querySelectorAll(".card, .grid > *"));

    const base = {
      eyebrow: eyebrow,
      title: title,
      body: paragraphs.join("\n\n"),
      cta_label: link ? txt(link) : "",
      cta_url: link ? link.getAttribute("href") || "" : "",
      cta2_label: link2 ? txt(link2) : "",
      cta2_url: link2 ? link2.getAttribute("href") || "" : "",
      image_url: image ? image.getAttribute("src") || "" : "",
      alt: image ? image.getAttribute("alt") || "" : ""
    };

    // Card grids become editable card sections (each card keeps its own photo).
    if (cards.length >= 2 && cards.every(c => c.querySelector("h3, h4, p"))) {
      const items = cards.map(c => {
        const ci = c.querySelector("img"), ca = c.querySelector("a[href]");
        return {
          eyebrow: txt(c.querySelector(".tag, .eyebrow, .kicker")),
          title: txt(c.querySelector("h3, h4")),
          text: txt(c.querySelector("p")),
          url: ca ? ca.getAttribute("href") || "" : "",
          image_url: ci ? ci.getAttribute("src") || "" : "",
          alt: ci ? ci.getAttribute("alt") || "" : ""
        };
      }).filter(i => i.title || i.text || i.image_url);
      if (items.length) {
        await addSection(pg.page_id, "grid", { eyebrow: eyebrow, title: title, items: items },
          { columns: items.length >= 4 ? 4 : 3, gap: 24 }, made);
        return;
      }
    }

    if (h1 && base.image_url) { await addSection(pg.page_id, "hero", base, { image: { fit: "cover", radius: 18 } }, made); return; }
    if (h1) { await addSection(pg.page_id, "hero", base, {}, made); return; }
    if (base.image_url && base.body) { await addSection(pg.page_id, "split", base, { image: { fit: "cover", radius: 16 } }, made); return; }
    if (base.image_url) { await addSection(pg.page_id, "image", base, { image: { fit: "cover", radius: 16, align: "center" } }, made); return; }
    if (title || base.body) { await addSection(pg.page_id, "text", base, {}, made); return; }

    const raw = el.innerHTML.trim();
    if (raw) await addSection(pg.page_id, "html", { html: raw }, { allowHtml: true }, made);
  }
})();
