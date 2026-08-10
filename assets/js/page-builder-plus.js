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

    async importCurrentHtml(slug) {
      if (!slug) slug = prompt("Enter the page slug to import (e.g. about, services, index):", "about");
      if (!slug) return;

      const pages = (await api.getPages()).data || [];
      const pg = pages.find(p => String(p.slug).toLowerCase() === String(slug).toLowerCase());
      if (!pg) { alert("Create a page with slug '" + slug + "' in the Page Builder first, then run Import."); return; }

      // Remove previously imported sections so re-imports don't pile up.
      const existing = (await api.getSections({ page_id: pg.page_id })).data || [];
      if (typeof api.deleteSection === "function") {
        for (const s of existing) {
          try { if (/imported/.test(String(s.style_json || ""))) await api.deleteSection({ section_id: s.section_id }); } catch (e) {}
        }
      }

      const imp = { imported: true };
      let made = 0;
      const add = async (type, content, style) => {
        const r = await api.createSection({ page_id: pg.page_id, type: type, content_json: JSON.stringify(content), style_json: JSON.stringify(Object.assign({}, imp, style || {})) });
        if (r && r.success) made++;
      };

      if (String(slug).toLowerCase() === "index") {
        // The homepage is a composite (Homepage Layout hero + sheet-based blocks).
        // Import them as editable sections. The public renderer only knows image/hero/
        // text/gallery/html, so the blocks become "html" sections that reuse the site's
        // own CSS classes (so they look identical to the live homepage) and the hero
        // becomes a typed "hero" section so its photo is editable via the image picker.
        const settings = (await api.getSiteSettings()).data || {};
        const hero = settings.hero || {};
        const photos = Array.isArray(hero.photos) ? hero.photos : [];
        const ph = photos[0] || {};

        // Hero — typed; photo editable via the image picker (image_url field).
        await add("hero", {
          title: hero.title || "",
          subtitle: hero.subtitle || "",
          image_url: ph.url || "",
          cta_label: hero.cta_primary_label || "",
          cta_url: hero.cta_primary_url || ""
        }, { allowHtml: false });

        // Services cards
        const services = (await api.getServices()).data || [];
        if (services.length) {
          const cards = services.map(s =>
            '<div class="card"><div class="card-body">' +
            (s.icon ? '<div style="font-size:1.8rem;margin-bottom:.75rem;">' + esc(s.icon) + '</div>' : '') +
            '<h3>' + esc(s.title || "") + '</h3>' +
            (s.short ? '<p class="muted" style="font-size:.9rem;">' + esc(s.short) + '</p>' : '') +
            '</div></div>'
          ).join("");
          await add("html", { html: '<section class="section"><div class="container"><div class="section-head center"><span class="eyebrow">Why Schools &amp; Teachers Choose EDC</span><h2>A recruitment partner that handles the details.</h2></div><div class="grid grid-4">' + cards + '</div></div></section>' }, { allowHtml: true, padding: "0" });
        }

        // Teacher cards
        const teachers = (await api.getTeachers({ featuredOnly: true })).data || [];
        if (teachers.length) {
          const cards = teachers.map(t => {
            const subs = (Array.isArray(t.subjects) ? t.subjects : []).slice(0, 2).map(s => '<span class="pill">' + esc(s) + '</span>').join("");
            return '<a href="teacher.html?id=' + esc(t.id) + '" class="card teacher-card">' +
              '<div class="card-media"><img src="' + esc(t.photo || "") + '" alt="' + esc(t.name || "") + '"></div>' +
              '<div class="card-body"><h3>' + esc(t.name || "") + '</h3>' +
              (t.position ? '<div class="role">' + esc(t.position) + '</div>' : '') +
              (subs ? '<div class="subjects">' + subs + '</div>' : '') +
              '</div></a>';
          }).join("");
          await add("html", { html: '<section class="section"><div class="container"><div class="grid grid-3">' + cards + '</div></div></section>' }, { allowHtml: true, padding: "0" });
        }

        // CTA band (footer_cta)
        const fcta = settings.footer_cta || {};
        await add("html", { html:
          '<section class="section"><div class="container"><div style="background:' + esc(fcta.background || "#0f172a") + ';color:' + esc(fcta.color || "#ffffff") + ';padding:48px 24px;border-radius:14px;text-align:center;' + (fcta.font ? 'font-family:' + esc(fcta.font) + ';' : '') + (fcta.font_size ? 'font-size:' + esc(fcta.font_size) + 'px;' : '') + '">' +
          (fcta.text ? '<p style="font-size:1.2rem;margin:0 0 1rem;">' + esc(fcta.text) + '</p>' : '') +
          (fcta.button_label ? '<a href="' + esc(fcta.button_url || "#") + '" class="btn btn-gold">' + esc(fcta.button_label) + '</a>' : '') +
          '</div></div></section>' }, { allowHtml: true, padding: "0" });

        // Testimonials
        try {
          const tm = (await api.getTestimonials()).data || [];
          if (tm.length) {
            const cards = tm.map(x =>
              '<div class="card"><div class="card-body">' +
              (x.quote ? '<p class="muted">' + esc(x.quote) + '</p>' : '') +
              (x.name ? '<div style="margin-top:.75rem;font-weight:600;">' + esc(x.name) + '</div>' : '') +
              (x.role ? '<div class="role">' + esc(x.role) + '</div>' : '') +
              '</div></div>'
            ).join("");
            await add("html", { html: '<section class="section"><div class="container"><div class="section-head center"><span class="eyebrow">Testimonials</span><h2>What schools and teachers say.</h2></div><div class="grid grid-3">' + cards + '</div></div></section>' }, { allowHtml: true, padding: "0" });
          }
        } catch (e) {}
      } else {
        const url = "./" + slug + ".html";
        let html;
        try { const res = await fetch(url, { cache: "no-store" }); if (!res.ok) throw new Error("HTTP " + res.status); html = await res.text(); }
        catch (e) { alert("Could not fetch " + url + ": " + e.message); return; }
        const doc = new DOMParser().parseFromString(html, "text/html");
        let main = doc.querySelector("main[data-edc-region]") || doc.querySelector("main");
        if (main && /loading/i.test(main.textContent || "") && !main.querySelector("section")) {
          alert("The page '" + slug + "' is built by JavaScript, so it has no static HTML to import.");
          return;
        }
        const blocks = [];
        if (main) {
          const secs = main.querySelectorAll(":scope > section");
          if (secs.length) secs.forEach(s => blocks.push(s.outerHTML));
          else if (main.innerHTML.trim()) blocks.push(main.innerHTML);
        }
        if (!blocks.length) {
          const b = doc.body || doc;
          b.querySelectorAll("script, header, footer").forEach(el => el.remove());
          if (b.innerHTML.trim()) blocks.push(b.innerHTML);
        }
        if (!blocks.length) { alert("No editable content found in " + url + "."); return; }
        for (const blockHtml of blocks) await add("html", { html: blockHtml }, { source_url: url, allowHtml: true });
      }

      let modeNote = " Set the page Render mode = Replace and Status = Published, then save.";
      if (typeof api.savePage === "function") {
        try { await api.savePage({ page_id: pg.page_id, slug: pg.slug, nav_label: pg.nav_label, render_mode: "replace", status: "Published" }); modeNote = " Render mode set to Replace and published."; } catch (e) {}
      }
      const idxNote = (String(slug).toLowerCase() === "index")
        ? " The homepage now shows Page Builder content. Delete all 'index' sections to restore the original Homepage Layout."
        : "";
      alert(made ? ("Imported " + made + " section(s) for '" + slug + "'." + idxNote + modeNote) : "Import failed.");
    },

    attachPicker(btn, onPick) { btn.onclick = async () => { const p = await EDC_MEDIA.open(); if (p && onPick) onPick(p); }; }
  };
})();