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
      if (!slug) slug = prompt("Enter the page slug to import (e.g. about, services):", "about");
      if (!slug) return;
      const url = "./" + slug + ".html";
      let html;
      try { const res = await fetch(url); if (!res.ok) throw new Error("HTTP " + res.status); html = await res.text(); }
      catch (e) { alert("Could not fetch " + url + ": " + e.message); return; }
      const bm = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      let body = bm ? bm[1] : html;
      body = body.replace(/<script[\s\S]*?<\/script>/gi, ""); // don't double-run scripts when injected
      const pages = (await api.getPages()).data || [];
      const pg = pages.find(p => String(p.slug).toLowerCase() === slug.toLowerCase());
      if (!pg) { alert("Create a page with slug '" + slug + "' first in the Page Builder, then run Import."); return; }
      const secs = (await api.getSections({ page_id: pg.page_id })).data || [];
      const imp = secs.find(s => String(s.type) === "html" && /imported/.test(String(s.style_json || "")));
      const content = { html: body }, style = { imported: true, source_url: url };
      let r;
      if (imp) r = await api.updateSection({ section_id: imp.section_id, content_json: JSON.stringify(content), style_json: JSON.stringify(style) });
      else r = await api.createSection({ page_id: pg.page_id, type: "html", content_json: JSON.stringify(content), style_json: JSON.stringify(style) });
      alert(r.success
        ? ("Imported " + body.length + " chars. Edit the HTML section here, set the page Render mode = Replace + Status = Published, then save.")
        : ("Failed: " + (r.error && r.error.message)));
    },

    attachPicker(btn, onPick) { btn.onclick = async () => { const p = await EDC_MEDIA.open(); if (p && onPick) onPick(p); }; }
  };
})();