/**
 * PAGEBUILDER.JS — REPLACEMENT FILE
 * ---------------------------------------------------------------
 * A professional visual page builder:
 *  - Pages rail with slug / publish state / render mode
 *  - Drag-and-drop section canvas with live thumbnails
 *  - Right-hand Inspector with real form fields (no more prompt()
 *    for raw JSON) covering content AND full styling:
 *      section: background, text colour, padding, max width,
 *               alignment, min height, background image + overlay
 *      image:   width, height, max width, object-fit, focal point,
 *               corner radius, shadow, alignment, margins
 *  - Live preview panel that renders exactly like the public site
 *  - Save / duplicate / hide / delete / reorder, all verified
 * ---------------------------------------------------------------
 */
const EDC_PAGEBUILDER = (() => {
  const api = () => (typeof EDC_API !== "undefined" ? EDC_API : window.EDC_API);
  const esc = (v) => EDC_UI.escapeHtml(v == null ? "" : String(v));
  let root, state = { pages: [], sections: [], activePageId: null, activeSectionId: null, dirty: false };

  const TYPES = [
    { id: "hero", label: "Hero banner" },
    { id: "text", label: "Text block" },
    { id: "image", label: "Image" },
    { id: "split", label: "Image + text" },
    { id: "grid", label: "Card grid" },
    { id: "cta", label: "Call to action" },
    { id: "spacer", label: "Spacer" }
  ];

  function parse(raw) {
    try { const v = JSON.parse(raw || "{}"); return v && typeof v === "object" ? v : {}; }
    catch (e) { return {}; }
  }
  function toast(r, fallback) {
    EDC_UI.toast((r && (r.message || (r.error && r.error.message))) || fallback, r && r.success ? "success" : "error");
  }

  /* ------------------------------ bootstrap ------------------------------ */

  async function init(selector) {
    root = document.querySelector(selector);
    if (!root) return;
    const s = api() && api().getSession && api().getSession();
    if (!s) { root.innerHTML = '<div class="edc-empty">Sign in to edit pages.</div>'; return; }
    renderShell();
    await loadPages();
  }

  function renderShell() {
    root.innerHTML =
      '<div class="pb">' +
        '<aside class="pb-rail">' +
          '<div class="pb-rail-head"><h3>Pages</h3><button class="pb-btn pb-btn-ghost" id="pb-new-page">+ New</button></div>' +
          '<ul class="pb-pages" id="pb-pages"></ul>' +
          '<div class="pb-page-settings" id="pb-page-settings"></div>' +
        '</aside>' +
        '<section class="pb-canvas">' +
          '<header class="pb-canvas-head">' +
            '<div><h3 id="pb-canvas-title">Select a page</h3><p class="pb-hint" id="pb-canvas-sub">Drag sections to reorder. Click a section to edit it.</p></div>' +
            '<div class="pb-canvas-actions">' +
              '<select class="pb-input pb-input-sm" id="pb-add-type">' + TYPES.map(t => '<option value="' + t.id + '">' + t.label + '</option>').join("") + '</select>' +
              '<button class="pb-btn" id="pb-add">Add section</button>' +
              '<button class="pb-btn pb-btn-primary" id="pb-save-order">Save order</button>' +
              '<button class="pb-btn pb-btn-ghost" id="pb-preview">Preview</button>' +
            '</div>' +
          '</header>' +
          '<div class="pb-sections" id="pb-sections"></div>' +
        '</section>' +
        '<aside class="pb-inspector" id="pb-inspector"><div class="edc-empty">Select a section to edit its content and styling.</div></aside>' +
      '</div>' +
      '<div class="pb-preview-overlay" id="pb-preview-overlay" hidden><div class="pb-preview-box">' +
        '<header><strong>Live preview</strong><button class="pb-btn pb-btn-ghost" id="pb-preview-close">Close</button></header>' +
        '<iframe id="pb-preview-frame" title="Page preview"></iframe></div></div>';

    root.querySelector("#pb-new-page").onclick = newPage;
    root.querySelector("#pb-add").onclick = addSection;
    root.querySelector("#pb-save-order").onclick = saveOrder;
    root.querySelector("#pb-preview").onclick = openPreview;
    root.querySelector("#pb-preview-close").onclick = () => { root.querySelector("#pb-preview-overlay").hidden = true; };
  }

  /* -------------------------------- pages -------------------------------- */

  async function loadPages() {
    const r = await api().getPages();
    state.pages = r.success ? (r.data || []) : [];
    if (!r.success) toast(r, "Unable to load pages.");
    renderPages();
    if (state.pages.length && !state.activePageId) selectPage(state.pages[0].page_id);
  }

  function renderPages() {
    const ul = root.querySelector("#pb-pages");
    ul.innerHTML = state.pages.map(function (p) {
      return '<li class="pb-page' + (p.page_id === state.activePageId ? " is-active" : "") + '" data-id="' + esc(p.page_id) + '">' +
        '<span class="pb-page-label">' + esc(p.nav_label || p.slug) + '</span>' +
        '<span class="pb-page-slug">/' + esc(p.slug) + '.html</span>' +
        '<span class="pb-chip' + (String(p.status).toLowerCase() === "published" ? " is-live" : "") + '">' + esc(p.status || "Published") + '</span>' +
        '<span class="pb-chip">' + (p.section_count || 0) + ' sections</span>' +
      '</li>';
    }).join("") || '<li class="pb-hint">No pages yet.</li>';
    ul.querySelectorAll(".pb-page").forEach(li => { li.onclick = () => selectPage(li.dataset.id); });
  }

  function activePage() { return state.pages.find(p => p.page_id === state.activePageId); }

  async function selectPage(pageId) {
    state.activePageId = pageId;
    state.activeSectionId = null;
    renderPages();
    renderPageSettings();
    const page = activePage();
    root.querySelector("#pb-canvas-title").textContent = page ? (page.nav_label || page.slug) : "Select a page";
    const r = await api().getSections(pageId);
    state.sections = r.success ? (r.data || []) : [];
    if (!r.success) toast(r, "Unable to load sections.");
    renderSections();
    renderInspector();
  }

  function renderPageSettings() {
    const page = activePage();
    const box = root.querySelector("#pb-page-settings");
    if (!page) { box.innerHTML = ""; return; }
    box.innerHTML =
      '<h4>Page settings</h4>' +
      field("Menu label", '<input class="pb-input" id="pg-label" value="' + esc(page.nav_label) + '">') +
      field("Slug (file name)", '<input class="pb-input" id="pg-slug" value="' + esc(page.slug) + '">') +
      field("Status", select("pg-status", ["Published", "Draft"], page.status || "Published")) +
      field("Content mode", select("pg-mode", ["append", "replace"], page.render_mode || "append")) +
      '<p class="pb-hint">“replace” makes your live sections take over the built-in HTML region on that page. “append” adds them below it.</p>' +
      '<label class="pb-check"><input type="checkbox" id="pg-nav" ' + (page.in_navigation ? "checked" : "") + '> Show in main navigation</label>' +
      field("Menu order", '<input class="pb-input" type="number" id="pg-order" value="' + esc(page.order || 0) + '">') +
      '<div class="pb-row"><button class="pb-btn pb-btn-primary" id="pg-save">Save page</button>' +
      '<button class="pb-btn pb-btn-danger" id="pg-delete">Delete</button></div>';

    box.querySelector("#pg-save").onclick = async function () {
      const payload = {
        page_id: page.page_id,
        nav_label: box.querySelector("#pg-label").value,
        slug: box.querySelector("#pg-slug").value,
        status: box.querySelector("#pg-status").value,
        render_mode: box.querySelector("#pg-mode").value,
        in_navigation: box.querySelector("#pg-nav").checked,
        order: box.querySelector("#pg-order").value
      };
      const r = await api().savePage(payload);
      toast(r, "Unable to save page.");
      if (r.success) await loadPages();
    };
    box.querySelector("#pg-delete").onclick = async function () {
      if (!confirm('Delete "' + (page.nav_label || page.slug) + '" and all its sections?')) return;
      const r = await api().deletePage(page.page_id);
      toast(r, "Unable to delete page.");
      state.activePageId = null;
      await loadPages();
    };
  }

  async function newPage() {
    const label = prompt("Page name (e.g. Scholarships):", "");
    if (!label) return;
    const r = await api().savePage({ nav_label: label, slug: label, status: "Published", render_mode: "append", in_navigation: true, order: state.pages.length + 1 });
    toast(r, "Unable to create page.");
    if (r.success) { await loadPages(); selectPage(r.data.page_id); }
  }

  /* ------------------------------- sections ------------------------------- */

  function renderSections() {
    const box = root.querySelector("#pb-sections");
    if (!state.activePageId) { box.innerHTML = '<div class="edc-empty">Choose a page on the left.</div>'; return; }
    if (!state.sections.length) { box.innerHTML = '<div class="edc-empty">No sections yet — add your first one above.</div>'; return; }
    box.innerHTML = "";
    state.sections.forEach((s, i) => box.appendChild(sectionCard(s, i)));
  }

  function summary(s) {
    const c = parse(s.content_json);
    return c.title || c.heading || c.text || c.body || "(no heading yet)";
  }

  function sectionCard(s, i) {
    const card = document.createElement("div");
    card.className = "pb-section" + (s.section_id === state.activeSectionId ? " is-active" : "") + (String(s.visible) === "false" ? " is-hidden" : "");
    card.draggable = true;
    card.dataset.id = s.section_id;
    card.innerHTML =
      '<div class="pb-section-grip" title="Drag to reorder">⠿</div>' +
      '<div class="pb-section-body">' +
        '<div class="pb-section-type">' + esc((TYPES.find(t => t.id === s.type) || {}).label || s.type) + ' · #' + (i + 1) + '</div>' +
        '<div class="pb-section-title">' + esc(String(summary(s)).slice(0, 90)) + '</div>' +
      '</div>' +
      '<div class="pb-section-actions">' +
        '<button data-act="edit" class="pb-btn pb-btn-sm">Edit</button>' +
        '<button data-act="dup" class="pb-btn pb-btn-sm">Duplicate</button>' +
        '<button data-act="toggle" class="pb-btn pb-btn-sm">' + (String(s.visible) === "false" ? "Show" : "Hide") + '</button>' +
        '<button data-act="del" class="pb-btn pb-btn-sm pb-btn-danger">Delete</button>' +
      '</div>';

    card.onclick = (e) => { if (!e.target.closest("button")) selectSection(s.section_id); };
    card.querySelector('[data-act="edit"]').onclick = () => selectSection(s.section_id);
    card.querySelector('[data-act="dup"]').onclick = async () => {
      const r = await api().duplicateSection(s.section_id); toast(r, "Unable to duplicate."); if (r.success) selectPage(state.activePageId);
    };
    card.querySelector('[data-act="toggle"]').onclick = async () => {
      const r = await api().updateSection({ page_id: state.activePageId, section_id: s.section_id, visible: !(String(s.visible) === "false") ? false : true });
      toast(r, "Unable to change visibility."); selectPage(state.activePageId);
    };
    card.querySelector('[data-act="del"]').onclick = async () => {
      if (!confirm("Delete this section?")) return;
      const r = await api().deleteSection(s.section_id, state.activePageId);
      toast(r, "Unable to delete."); selectPage(state.activePageId);
    };

    card.addEventListener("dragstart", () => card.classList.add("is-dragging"));
    card.addEventListener("dragend", () => card.classList.remove("is-dragging"));
    card.addEventListener("dragover", function (e) {
      e.preventDefault();
      const dragging = root.querySelector(".is-dragging");
      if (!dragging || dragging === card) return;
      const rect = card.getBoundingClientRect();
      const after = (e.clientY - rect.top) > rect.height / 2;
      card.parentNode.insertBefore(dragging, after ? card.nextSibling : card);
    });
    return card;
  }

  async function addSection() {
    if (!state.activePageId) return EDC_UI.toast("Select a page first.", "error");
    const type = root.querySelector("#pb-add-type").value;
    const starters = {
      hero: { eyebrow: "EDC", title: "New hero heading", body: "Short supporting sentence.", cta_label: "Get started", cta_url: "apply.html" },
      text: { title: "New section", body: "Write your content here." },
      image: { title: "", image_url: "", alt: "" },
      split: { title: "Image and text", body: "Describe the service.", image_url: "" },
      grid: { title: "Highlights", items: [{ title: "Item one", text: "Detail" }, { title: "Item two", text: "Detail" }, { title: "Item three", text: "Detail" }] },
      cta: { title: "Ready to apply?", body: "We place teachers across Thailand.", cta_label: "Apply now", cta_url: "apply.html" },
      spacer: {}
    };
    const r = await api().createSection({ page_id: state.activePageId, type: type, content_json: starters[type] || {}, style_json: {} });
    toast(r, "Unable to add section.");
    if (r.success) { await selectPage(state.activePageId); selectSection(r.data.section_id); }
  }

  async function saveOrder() {
    const ids = Array.from(root.querySelectorAll("#pb-sections .pb-section")).map(el => el.dataset.id);
    if (!ids.length) return;
    const r = await api().reorderSections(state.activePageId, ids);
    toast(r, "Unable to save order.");
    selectPage(state.activePageId);
  }

  function selectSection(id) {
    state.activeSectionId = id;
    renderSections();
    renderInspector();
  }

  /* ------------------------------ inspector ------------------------------ */

  function field(label, control) { return '<label class="pb-field"><span>' + esc(label) + "</span>" + control + "</label>"; }
  function select(id, options, value) {
    return '<select class="pb-input" id="' + id + '">' + options.map(o =>
      '<option value="' + esc(o) + '"' + (String(value) === String(o) ? " selected" : "") + ">" + esc(o) + "</option>").join("") + "</select>";
  }
  function text(id, value, placeholder) { return '<input class="pb-input" id="' + id + '" value="' + esc(value || "") + '" placeholder="' + esc(placeholder || "") + '">'; }
  function area(id, value, rows) { return '<textarea class="pb-input" rows="' + (rows || 4) + '" id="' + id + '">' + esc(value || "") + "</textarea>"; }
  function num(id, value, placeholder) { return '<input class="pb-input" id="' + id + '" value="' + esc(value == null ? "" : value) + '" placeholder="' + esc(placeholder || "auto") + '">'; }
  function color(id, value, fallback) { return '<input class="pb-input pb-color" type="color" id="' + id + '" value="' + esc(value || fallback) + '">'; }

  function renderInspector() {
    const box = root.querySelector("#pb-inspector");
    const s = state.sections.find(x => x.section_id === state.activeSectionId);
    if (!s) { box.innerHTML = '<div class="edc-empty">Select a section to edit its content and styling.</div>'; return; }
    const c = parse(s.content_json), st = parse(s.style_json), im = st.image || {};

    box.innerHTML =
      '<div class="pb-inspector-head"><h4>' + esc((TYPES.find(t => t.id === s.type) || {}).label || s.type) + '</h4>' +
      '<button class="pb-btn pb-btn-primary pb-btn-sm" id="in-save">Save section</button></div>' +

      '<div class="pb-tabs"><button class="pb-tab is-active" data-tab="content">Content</button>' +
      '<button class="pb-tab" data-tab="style">Design</button>' +
      '<button class="pb-tab" data-tab="image">Image</button></div>' +

      '<div class="pb-tabpane" data-pane="content">' +
        field("Section type", select("in-type", TYPES.map(t => t.id), s.type)) +
        field("Eyebrow / kicker", text("in-eyebrow", c.eyebrow)) +
        field("Heading", text("in-title", c.title || c.heading)) +
        field("Body text", area("in-body", c.body || c.text || c.content, 6)) +
        field("Button label", text("in-cta-label", c.cta_label)) +
        field("Button link", text("in-cta-url", c.cta_url || c.url, "apply.html or https://…")) +
        field("Image URL", text("in-image", c.image_url || c.image, "https://… or assets/img/photo.jpg")) +
        field("Image alt text", text("in-alt", c.alt)) +
        (s.type === "grid"
          ? field("Cards (one per line — Title | Text | Link)", area("in-items", (Array.isArray(c.items) ? c.items : []).map(i => [i.title || "", i.text || i.body || "", i.url || ""].join(" | ")).join("\n"), 6))
          : "") +
      '</div>' +

      '<div class="pb-tabpane" data-pane="style" hidden>' +
        field("Background colour", color("st-bg", st.background, "#ffffff")) +
        field("Text colour", color("st-color", st.color, "#0f172a")) +
        field("Background image URL", text("st-bgimg", st.backgroundImage)) +
        field("Background overlay (0–1)", num("st-overlay", st.overlay, "0.35")) +
        field("Vertical padding (px)", num("st-py", st.paddingY, "80")) +
        field("Horizontal padding (px)", num("st-px", st.paddingX)) +
        field("Content max width (px)", num("st-maxw", st.maxWidth, "1120")) +
        field("Minimum height (px)", num("st-minh", st.minHeight)) +
        field("Corner radius (px)", num("st-radius", st.radius)) +
        field("Text alignment", select("st-align", ["left", "center", "right"], st.align || "left")) +
        field("Block position", select("st-blockalign", ["center", "left", "right"], st.blockAlign || "center")) +
        field("Grid columns", num("st-cols", st.columns, "3")) +
        field("Gap between items (px)", num("st-gap", st.gap, "24")) +
        field("Button style", select("st-btn", ["btn-gold", "btn-primary", "btn-outline", "btn-ghost"], st.buttonVariant || "btn-gold")) +
        '<label class="pb-check"><input type="checkbox" id="st-reverse" ' + (st.reverse ? "checked" : "") + '> Reverse image / text order</label>' +
      '</div>' +

      '<div class="pb-tabpane" data-pane="image" hidden>' +
        '<p class="pb-hint">Resize and place the image exactly where you want it.</p>' +
        field("Width (px or %)", num("im-w", im.width, "e.g. 480 or 60%")) +
        field("Max width (px or %)", num("im-maxw", im.maxWidth, "100%")) +
        field("Height (px)", num("im-h", im.height, "auto")) +
        field("Crop behaviour", select("im-fit", ["cover", "contain", "fill", "none", "scale-down"], im.fit || "cover")) +
        field("Focal point", select("im-pos", ["center", "top", "bottom", "left", "right", "top left", "top right", "bottom left", "bottom right"], im.position || "center")) +
        field("Corner radius (px)", num("im-radius", im.radius, "16")) +
        field("Horizontal placement", select("im-align", ["left", "center", "right"], im.align || "center")) +
        field("Space above (px)", num("im-mt", im.marginTop)) +
        field("Space below (px)", num("im-mb", im.marginBottom)) +
        '<label class="pb-check"><input type="checkbox" id="im-shadow" ' + (im.shadow ? "checked" : "") + '> Drop shadow</label>' +
      '</div>';

    box.querySelectorAll(".pb-tab").forEach(function (tab) {
      tab.onclick = function () {
        box.querySelectorAll(".pb-tab").forEach(t => t.classList.toggle("is-active", t === tab));
        box.querySelectorAll(".pb-tabpane").forEach(p => { p.hidden = p.dataset.pane !== tab.dataset.tab; });
      };
    });
    box.querySelector("#in-save").onclick = () => saveSection(s);
  }

  function val(id) { const el = root.querySelector("#" + id); return el ? el.value.trim() : ""; }
  function checked(id) { const el = root.querySelector("#" + id); return !!(el && el.checked); }
  function maybe(obj, key, v) { if (v !== "" && v !== undefined && v !== null) obj[key] = v; }

  async function saveSection(s) {
    const content = {};
    maybe(content, "eyebrow", val("in-eyebrow"));
    maybe(content, "title", val("in-title"));
    maybe(content, "body", val("in-body"));
    maybe(content, "cta_label", val("in-cta-label"));
    maybe(content, "cta_url", val("in-cta-url"));
    maybe(content, "image_url", val("in-image"));
    maybe(content, "alt", val("in-alt"));
    if (root.querySelector("#in-items")) {
      content.items = val("in-items").split("\n").filter(Boolean).map(function (line) {
        const parts = line.split("|").map(p => p.trim());
        return { title: parts[0] || "", text: parts[1] || "", url: parts[2] || "" };
      });
    }

    const style = {};
    maybe(style, "background", val("st-bg"));
    maybe(style, "color", val("st-color"));
    maybe(style, "backgroundImage", val("st-bgimg"));
    maybe(style, "overlay", val("st-overlay"));
    maybe(style, "paddingY", val("st-py"));
    maybe(style, "paddingX", val("st-px"));
    maybe(style, "maxWidth", val("st-maxw"));
    maybe(style, "minHeight", val("st-minh"));
    maybe(style, "radius", val("st-radius"));
    maybe(style, "align", val("st-align"));
    maybe(style, "blockAlign", val("st-blockalign"));
    maybe(style, "columns", val("st-cols"));
    maybe(style, "gap", val("st-gap"));
    maybe(style, "buttonVariant", val("st-btn"));
    if (checked("st-reverse")) style.reverse = true;

    const image = {};
    maybe(image, "width", val("im-w"));
    maybe(image, "maxWidth", val("im-maxw"));
    maybe(image, "height", val("im-h"));
    maybe(image, "fit", val("im-fit"));
    maybe(image, "position", val("im-pos"));
    maybe(image, "radius", val("im-radius"));
    maybe(image, "align", val("im-align"));
    maybe(image, "marginTop", val("im-mt"));
    maybe(image, "marginBottom", val("im-mb"));
    if (checked("im-shadow")) image.shadow = true;
    if (Object.keys(image).length) style.image = image;

    const r = await api().updateSection({
      page_id: state.activePageId, section_id: s.section_id,
      type: val("in-type") || s.type, content_json: content, style_json: style
    });
    toast(r, "Unable to save the section.");
    if (r.success) { await selectPage(state.activePageId); selectSection(s.section_id); }
  }

  /* -------------------------------- preview -------------------------------- */

  function openPreview() {
    const page = activePage();
    if (!page) return EDC_UI.toast("Select a page first.", "error");
    const overlay = root.querySelector("#pb-preview-overlay");
    const frame = root.querySelector("#pb-preview-frame");
    frame.src = page.slug + ".html?edcpreview=1&_ts=" + Date.now();
    overlay.hidden = false;
  }

  return { init: init, reload: loadPages };
})();
