/**
 * PAGEBUILDER.JS — ENHANCED REPLACEMENT FILE (v3)
 * ---------------------------------------------------------------
 * What's new in v3 (per-element design controls):
 *  - Every text element (eyebrow, heading, body, button, link, grid card
 *    title, grid card text) has its OWN style controls:
 *      font family, font size, font weight, text color, background color,
 *      text alignment (left / center / right / justify),
 *      bold, italic, underline, line height, letter spacing,
 *      margin top / bottom, padding top / bottom,
 *      text transform (none / uppercase / lowercase / capitalize),
 *      border radius (for background pill effect)
 *  - Images support SHAPE presets: circle, rounded, square, plus the
 *    existing crop / resize / placement controls.
 *  - Section-level style still controls the section background, padding,
 *    max width, min height, corner radius, text alignment, etc.
 *  - All new style data is stored in style_json.elements{} so the public
 *    renderer (public-page.js) can apply it. No backend changes needed.
 * ---------------------------------------------------------------
 */
const EDC_PAGEBUILDER = (() => {
  const api = () => (typeof EDC_API !== "undefined" ? EDC_API : window.EDC_API);
  const esc = (v) => EDC_UI.escapeHtml(v == null ? "" : String(v));
  let root, state = { pages: [], sections: [], activePageId: null, activeSectionId: null, dirty: false };

  const TYPES = [
    { id: "hero",   label: "Hero banner" },
    { id: "text",   label: "Text block" },
    { id: "body",   label: "Body text (multi-paragraph)" },
    { id: "image",  label: "Image" },
    { id: "split",  label: "Image + text" },
    { id: "grid",   label: "Card grid" },
    { id: "cta",    label: "Call to action" },
    { id: "footer", label: "Footer links" },
    { id: "html",   label: "Raw HTML (imported)" },
    { id: "spacer", label: "Spacer" }
  ];

  const FONT_FAMILIES = [
    "inherit", "Arial, sans-serif", "Georgia, serif", "'Times New Roman', serif",
    "'Courier New', monospace", "Inter, sans-serif", "Roboto, sans-serif",
    "Poppins, sans-serif", "Montserrat, sans-serif", "Playfair Display, serif",
    "Lora, serif", "Merriweather, serif", "Open Sans, sans-serif",
    "Raleway, sans-serif", "Nunito, sans-serif", "system-ui, sans-serif"
  ];

  const FONT_WEIGHTS = ["inherit", "300", "400", "500", "600", "700", "800", "900"];

  const TEXT_TRANSFORMS = ["inherit", "none", "uppercase", "lowercase", "capitalize"];

  const IMAGE_SHAPES = [
    { id: "default",  label: "Default (use radius)" },
    { id: "circle",   label: "Circle" },
    { id: "rounded",  label: "Rounded square" },
    { id: "square",   label: "Square (sharp edges)" }
  ];

  /* Element keys that get per-element styling */
  const ELEMENT_KEYS = [
    { id: "eyebrow",  label: "Eyebrow / Kicker" },
    { id: "heading",  label: "Heading" },
    { id: "body",     label: "Body text" },
    { id: "button",   label: "Button" },
    { id: "button2",  label: "Secondary button" },
    { id: "cardTitle",  label: "Card title" },
    { id: "cardText",   label: "Card text" },
    { id: "cardButton", label: "Card button" }
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
          '<div class="pb-rail-head"><h3>Pages</h3><div><button class="pb-btn pb-btn-ghost pb-btn-sm" id="pb-info" title="How to use the builder">?</button> <button class="pb-btn pb-btn-ghost" id="pb-new-page">+ New</button></div></div>' +
          '<div class="pb-info-panel" id="pb-info-panel" hidden>' +
            '<h4>Page Builder Guide</h4>' +
            '<p><strong>Content mode</strong> — set to <em>replace</em> to make your builder sections take over the built-in page content. Set to <em>append</em> to add sections below the existing content.</p>' +
            '<p><strong>Sections</strong> — drag to reorder, click to edit. Use the Content tab for text/images, the Design tab for section-level colours/spacing/layout, the Element Style tab for per-element text styling, and the Image tab for resize/crop/shape/placement.</p>' +
            '<p><strong>Element Style</strong> — style every text element individually: font family, size, weight, colour, background, alignment (left/center/right/justify), bold, italic, underline, line height, letter spacing, margins, padding, and text transform.</p>' +
            '<p><strong>Images</strong> — choose shape (circle, rounded, square), set width, height, crop behaviour, focal point, alignment, margins, and drop shadow. Photos can be placed anywhere and resized to any dimensions.</p>' +
            '<p><strong>Preview</strong> — click Preview to see exactly how the page will look to visitors.</p>' +
          '</div>' +
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
    root.querySelector("#pb-info").onclick = () => {
      const panel = root.querySelector("#pb-info-panel");
      panel.hidden = !panel.hidden;
    };
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
      '<p class="pb-hint">"replace" makes your live sections take over the built-in HTML region on that page. "append" adds them below it.</p>' +
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
    var head = c.title || c.heading || c.text || c.body || "";
    if (!head && s.type === "footer") head = "Footer link groups";
    if (!head && s.type === "spacer") head = "Spacer";
    if (!head && s.type === "image") head = c.alt || "Image";
    if (!head && s.type === "html") head = String(c.html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "Raw HTML block";
    return head || "(no heading yet)";
  }

  function sectionCard(s, i) {
    const card = document.createElement("div");
    card.className = "pb-section" + (s.section_id === state.activeSectionId ? " is-active" : "") + (String(s.visible) === "false" ? " is-hidden" : "");
    card.draggable = true;
    card.dataset.id = s.section_id;
    card.innerHTML =
      '<div class="pb-section-grip" title="Drag to reorder">&#x2807;</div>' +
      '<div class="pb-section-body">' +
        '<div class="pb-section-type">' + esc((TYPES.find(t => t.id === s.type) || {}).label || s.type) + ' &middot; #' + (i + 1) + '</div>' +
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
      body: { title: "", body: "First paragraph of your body text.\n\nSecond paragraph — the blank line above creates a gap between paragraphs.\n\nAdd as many paragraphs as you need." },
      image: { title: "", image_url: "", alt: "" },
      split: { title: "Image and text", body: "Describe the service.", image_url: "" },
      grid: { title: "Highlights", items: [{ title: "Item one", text: "Detail" }, { title: "Item two", text: "Detail" }, { title: "Item three", text: "Detail" }] },
      cta: { title: "Ready to apply?", body: "We place teachers across Thailand.", cta_label: "Apply now", cta_url: "apply.html" },
      footer: { groups: [
        { title: "Company", links: [{ label: "About Us", url: "about.html" }, { label: "Services", url: "services.html" }, { label: "Teachers", url: "teachers.html" }, { label: "Careers", url: "careers.html" }] },
        { title: "Resources", links: [{ label: "Contact", url: "contact.html" }, { label: "Apply Now", url: "apply.html" }, { label: "Portal Login", url: "login.html" }] }
      ]},
      html: { html: "<p>Paste or edit raw HTML here.</p>" },
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
  function selectOpts(id, options, value) {
    return '<select class="pb-input" id="' + id + '">' + options.map(function (o) {
      var val = typeof o === "object" ? (o.value || o.id) : o;
      var lbl = typeof o === "object" ? (o.label || o.id) : o;
      return '<option value="' + esc(val) + '"' + (String(value) === String(val) ? " selected" : "") + ">" + esc(lbl) + "</option>";
    }).join("") + "</select>";
  }
  function text(id, value, placeholder) { return '<input class="pb-input" id="' + id + '" value="' + esc(value || "") + '" placeholder="' + esc(placeholder || "") + '">'; }
  function area(id, value, rows) { return '<textarea class="pb-input" rows="' + (rows || 4) + '" id="' + id + '">' + esc(value || "") + "</textarea>"; }
  function num(id, value, placeholder) { return '<input class="pb-input" id="' + id + '" value="' + esc(value == null ? "" : value) + '" placeholder="' + esc(placeholder || "auto") + '">'; }
  function color(id, value, fallback) { return '<input class="pb-input pb-color" type="color" id="' + id + '" value="' + esc(value || fallback || "#000000") + '">'; }
  function checkbox(id, checked, label) { return '<label class="pb-check"><input type="checkbox" id="' + id + '"' + (checked ? " checked" : "") + "> " + esc(label) + "</label>"; }

  /* ---- per-element style controls ---- */

  /**
   * Returns the elements available for a given section type.
   * Not all elements exist in every section type.
   */
  function elementsForType(type) {
    switch (type) {
      case "hero":   return ["eyebrow", "heading", "body", "button", "button2"];
      case "text":   return ["heading", "body"];
      case "body":   return ["body"];
      case "image":  return ["heading", "body", "button"];
      case "split":  return ["heading", "body", "button"];
      case "grid":   return ["eyebrow", "heading", "body", "button", "cardTitle", "cardText", "cardButton"];
      case "cta":    return ["heading", "body", "button"];
      default:       return [];
    }
  }

  function elementStyleControls(elemKey, st) {
    const els = (st && st.elements) || {};
    const e = els[elemKey] || {};

    return '<div class="pb-elem-group" data-elem="' + elemKey + '">' +
      '<div class="pb-elem-head">' + esc((ELEMENT_KEYS.find(k => k.id === elemKey) || {}).label || elemKey) + '</div>' +
      field("Font family", selectOpts("es-font-" + elemKey, FONT_FAMILIES, e.fontFamily || "inherit")) +
      '<div class="pb-field-row">' +
        field("Font size", num("es-size-" + elemKey, e.fontSize, "e.g. 18 or 1.2rem")) +
        field("Font weight", selectOpts("es-weight-" + elemKey, FONT_WEIGHTS, e.fontWeight || "inherit")) +
      '</div>' +
      '<div class="pb-field-row">' +
        field("Text color", color("es-color-" + elemKey, e.color, "#000000")) +
        field("Background color", color("es-bg-" + elemKey, e.backgroundColor, "transparent")) +
      '</div>' +
      field("Text alignment", selectOpts("es-align-" + elemKey, ["inherit", "left", "center", "right", "justify"], e.textAlign || "inherit")) +
      field("Text transform", selectOpts("es-transform-" + elemKey, TEXT_TRANSFORMS, e.textTransform || "inherit")) +
      '<div class="pb-field-row">' +
        checkbox("es-bold-" + elemKey, e.bold, "Bold") +
        checkbox("es-italic-" + elemKey, e.italic, "Italic") +
        checkbox("es-underline-" + elemKey, e.underline, "Underline") +
      '</div>' +
      '<div class="pb-field-row">' +
        field("Line height", num("es-lh-" + elemKey, e.lineHeight, "e.g. 1.5")) +
        field("Letter spacing (px)", num("es-ls-" + elemKey, e.letterSpacing, "e.g. 0.5")) +
      '</div>' +
      '<div class="pb-field-row">' +
        field("Margin top (px)", num("es-mt-" + elemKey, e.marginTop, "0")) +
        field("Margin bottom (px)", num("es-mb-" + elemKey, e.marginBottom, "0")) +
      '</div>' +
      '<div class="pb-field-row">' +
        field("Padding top (px)", num("es-pt-" + elemKey, e.paddingTop, "0")) +
        field("Padding bottom (px)", num("es-pb-" + elemKey, e.paddingBottom, "0")) +
      '</div>' +
      '<div class="pb-field-row">' +
        field("Padding left (px)", num("es-pl-" + elemKey, e.paddingLeft, "0")) +
        field("Padding right (px)", num("es-pr-" + elemKey, e.paddingRight, "0")) +
      '</div>' +
      field("Border radius (px)", num("es-radius-" + elemKey, e.borderRadius, "0")) +
      '<button class="pb-btn pb-btn-sm pb-btn-ghost pb-elem-reset" data-elem="' + elemKey + '">Reset this element</button>' +
    '</div>';
  }

  function elementStyleTab(type, st) {
    const elems = elementsForType(type);
    if (!elems.length) return '<p class="pb-hint">No per-element styling available for this section type.</p>';
    return '<p class="pb-hint">Style each text element independently — font, size, weight, color, background, alignment, bold/italic/underline, spacing, and more.</p>' +
      elems.map(function (k) { return elementStyleControls(k, st); }).join("");
  }

  /* ---- footer editor ---- */

  function footerEditor(c) {
    const groups = Array.isArray(c.groups) ? c.groups : [];
    var html = '<p class="pb-hint">Edit the link groups shown at the bottom of every page. Add or remove groups and links.</p>';
    groups.forEach(function (g, gi) {
      html += '<div class="pb-footer-group" data-gi="' + gi + '">';
      html += field("Group " + (gi + 1) + " title", text("ft-gtitle-" + gi, g.title));
      html += field("Links (one per line — Label | URL)", area("ft-links-" + gi, (g.links || []).map(function (l) { return (l.label || "") + " | " + (l.url || ""); }).join("\n"), 5));
      html += '<button class="pb-btn pb-btn-sm pb-btn-danger" data-act="delgroup" data-gi="' + gi + '">Remove group</button>';
      html += '</div>';
    });
    html += '<button class="pb-btn pb-btn-sm" id="ft-add-group">+ Add link group</button>';
    return html;
  }

  /* ---- card grid items ---- */
  var itemSeq = 0;
  function itemRow(it, i) {
    it = it || {};
    return '<div class="pb-grid-item" data-ii="' + i + '">' +
      field("Card title", text("it-title-" + i, it.title)) +
      field("Card text", area("it-text-" + i, it.text || it.body, 3)) +
      field("Card link", text("it-url-" + i, it.url, "teacher.html?id=\u2026")) +
      field("Card button label", text("it-ctalabel-" + i, it.cta_label)) +
      field("Card photo (image URL)", text("it-image-" + i, it.image_url || it.image, "https://\u2026 or assets/img/photo.jpg")) +
      field("Card photo alt text", text("it-alt-" + i, it.alt)) +
      '<button class="pb-btn pb-btn-sm pb-btn-danger" data-act="delitem" type="button">Remove card</button>' +
    '</div>';
  }
  function itemsEditor(items) {
    items = Array.isArray(items) ? items : [];
    itemSeq = items.length;
    return '<p class="pb-hint">Every card is editable — including its own photo. Use the "Pick image" button beside a photo field to choose from the Media Library.</p>' +
      '<div id="in-items-list">' + items.map(function (it, i) { return itemRow(it, i); }).join("") + '</div>' +
      '<button class="pb-btn pb-btn-sm" id="in-add-item" type="button">+ Add card</button>';
  }
  function bindItemsEditor(box) {
    var list = box.querySelector("#in-items-list");
    if (!list) return;
    function bindDeletes() {
      list.querySelectorAll('[data-act="delitem"]').forEach(function (b) {
        b.onclick = function () { b.closest(".pb-grid-item").remove(); };
      });
    }
    bindDeletes();
    var add = box.querySelector("#in-add-item");
    if (add) add.onclick = function () {
      list.insertAdjacentHTML("beforeend", itemRow({}, itemSeq++));
      bindDeletes();
    };
  }

  function renderInspector() {
    const box = root.querySelector("#pb-inspector");
    const s = state.sections.find(x => x.section_id === state.activeSectionId);
    if (!s) { box.innerHTML = '<div class="edc-empty">Select a section to edit its content and styling.</div>'; return; }
    const c = parse(s.content_json), st = parse(s.style_json), im = st.image || {};

    var contentFields =
      field("Section type", selectOpts("in-type", TYPES.map(t => t.id), s.type)) +
      field("Eyebrow / kicker", text("in-eyebrow", c.eyebrow)) +
      field("Heading", text("in-title", c.title || c.heading)) +
      field("Body text", area("in-body", c.body || c.text || c.content, 6));

    if (s.type === "body") {
      contentFields += '<p class="pb-hint">Leave a blank line between paragraphs to create spacing. You can add as many paragraphs as you want.</p>';
    }

    contentFields +=
      field("Button label", text("in-cta-label", c.cta_label)) +
      field("Button link", text("in-cta-url", c.cta_url || c.url, "apply.html or https://\u2026")) +
      field("Secondary button label", text("in-cta2-label", c.cta2_label)) +
      field("Secondary button link", text("in-cta2-url", c.cta2_url, "about.html")) +
      field("Image URL", text("in-image", c.image_url || c.image, "https://\u2026 or assets/img/photo.jpg")) +
      field("Image alt text", text("in-alt", c.alt));

    if (s.type === "grid") {
      contentFields += itemsEditor(c.items);
    }

    if (s.type === "footer") {
      contentFields = field("Section type", selectOpts("in-type", TYPES.map(t => t.id), s.type)) + footerEditor(c);
    }

    if (s.type === "html") {
      contentFields = field("Section type", selectOpts("in-type", TYPES.map(t => t.id), s.type)) +
        '<p class="pb-hint">Raw HTML block (usually created by "Import current page HTML"). Edit the markup directly — any image src can be replaced with a Media Library URL.</p>' +
        field("HTML", area("in-html", c.html, 14));
    }

    /* Determine which tabs to show */
    var showImageTab = s.type !== "footer";
    var showElementTab = s.type !== "footer" && s.type !== "html" && s.type !== "spacer";

    box.innerHTML =
      '<div class="pb-inspector-head"><h4>' + esc((TYPES.find(t => t.id === s.type) || {}).label || s.type) + '</h4>' +
      '<button class="pb-btn pb-btn-primary pb-btn-sm" id="in-save">Save section</button></div>' +

      '<div class="pb-tabs"><button class="pb-tab is-active" data-tab="content">Content</button>' +
      '<button class="pb-tab" data-tab="style">Design</button>' +
      (showElementTab ? '<button class="pb-tab" data-tab="elements">Element Style</button>' : '') +
      (showImageTab ? '<button class="pb-tab" data-tab="image">Image</button>' : '') + '</div>' +

      '<div class="pb-tabpane" data-pane="content">' + contentFields + '</div>' +

      '<div class="pb-tabpane" data-pane="style" hidden>' +
        field("Background colour", color("st-bg", st.background, "#ffffff")) +
        field("Text colour", color("st-color", st.color, "#0f172a")) +
        field("Background image URL", text("st-bgimg", st.backgroundImage)) +
        field("Background overlay (0\u20131)", num("st-overlay", st.overlay, "0.35")) +
        field("Vertical padding (px)", num("st-py", st.paddingY, "80")) +
        field("Horizontal padding (px)", num("st-px", st.paddingX)) +
        field("Content max width (px)", num("st-maxw", st.maxWidth, "1120")) +
        field("Minimum height (px)", num("st-minh", st.minHeight)) +
        field("Corner radius (px)", num("st-radius", st.radius)) +
        field("Text alignment", selectOpts("st-align", ["left", "center", "right"], st.align || "left")) +
        field("Block position", selectOpts("st-blockalign", ["center", "left", "right"], st.blockAlign || "center")) +
        field("Grid columns", num("st-cols", st.columns, "3")) +
        field("Gap between items (px)", num("st-gap", st.gap, "24")) +
        field("Button style", selectOpts("st-btn", ["btn-gold", "btn-primary", "btn-outline", "btn-ghost"], st.buttonVariant || "btn-gold")) +
        checkbox("st-reverse", st.reverse, "Reverse image / text order") +
      '</div>' +

      (showElementTab ?
      '<div class="pb-tabpane" data-pane="elements" hidden>' +
        elementStyleTab(s.type, st) +
      '</div>' : '') +

      (showImageTab ?
      '<div class="pb-tabpane" data-pane="image" hidden>' +
        '<p class="pb-hint">Resize, shape, and place the image exactly where you want it.</p>' +
        field("Image shape", selectOpts("im-shape", IMAGE_SHAPES.map(s => ({ value: s.id, label: s.label })), im.shape || "default")) +
        field("Width (px or %)", num("im-w", im.width, "e.g. 480 or 60%")) +
        field("Max width (px or %)", num("im-maxw", im.maxWidth, "100%")) +
        field("Height (px)", num("im-h", im.height, "auto")) +
        field("Crop behaviour", selectOpts("im-fit", ["cover", "contain", "fill", "none", "scale-down"], im.fit || "cover")) +
        field("Focal point", selectOpts("im-pos", ["center", "top", "bottom", "left", "right", "top left", "top right", "bottom left", "bottom right"], im.position || "center")) +
        field("Corner radius (px)", num("im-radius", im.radius, "16")) +
        field("Horizontal placement", selectOpts("im-align", ["left", "center", "right"], im.align || "center")) +
        field("Space above (px)", num("im-mt", im.marginTop)) +
        field("Space below (px)", num("im-mb", im.marginBottom)) +
        checkbox("im-shadow", im.shadow, "Drop shadow") +
      '</div>' : '');

    box.querySelectorAll(".pb-tab").forEach(function (tab) {
      tab.onclick = function () {
        box.querySelectorAll(".pb-tab").forEach(t => t.classList.toggle("is-active", t === tab));
        box.querySelectorAll(".pb-tabpane").forEach(p => { p.hidden = p.dataset.pane !== tab.dataset.tab; });
      };
    });

    /* Element reset buttons */
    box.querySelectorAll(".pb-elem-reset").forEach(function (btn) {
      btn.onclick = function () {
        var ek = btn.dataset.elem;
        box.querySelectorAll('[data-elem="' + ek + '"] .pb-input, [data-elem="' + ek + '"] .pb-check input').forEach(function (inp) {
          if (inp.type === "checkbox") inp.checked = false;
          else if (inp.tagName === "SELECT") inp.selectedIndex = 0;
          else inp.value = "";
        });
      };
    });

    bindItemsEditor(box);

    if (s.type === "footer") {
      var addGroupBtn = box.querySelector("#ft-add-group");
      if (addGroupBtn) addGroupBtn.onclick = function () {
        var c2 = parse(s.content_json);
        if (!Array.isArray(c2.groups)) c2.groups = [];
        c2.groups.push({ title: "New Group", links: [{ label: "Link", url: "#" }] });
        api().updateSection({ page_id: state.activePageId, section_id: s.section_id, content_json: c2, style_json: st }).then(function () {
          selectPage(state.activePageId).then(function () { selectSection(s.section_id); });
        });
      };
      box.querySelectorAll('[data-act="delgroup"]').forEach(function (btn) {
        btn.onclick = function () {
          var gi = parseInt(btn.dataset.gi, 10);
          var c2 = parse(s.content_json);
          c2.groups.splice(gi, 1);
          api().updateSection({ page_id: state.activePageId, section_id: s.section_id, content_json: c2, style_json: st }).then(function () {
            selectPage(state.activePageId).then(function () { selectSection(s.section_id); });
          });
        };
      });
    }

    box.querySelector("#in-save").onclick = () => saveSection(s);
  }

  function val(id) { const el = root.querySelector("#" + id); return el ? el.value.trim() : ""; }
  function checked(id) { const el = root.querySelector("#" + id); return !!(el && el.checked); }
  function maybe(obj, key, v) { if (v !== "" && v !== undefined && v !== null) obj[key] = v; }

  /* ---- collect per-element styles from the inspector ---- */
  function collectElementStyles(type) {
    const elems = elementsForType(type);
    const result = {};
    elems.forEach(function (ek) {
      const e = {};
      const fam = val("es-font-" + ek);
      if (fam && fam !== "inherit") e.fontFamily = fam;
      const size = val("es-size-" + ek);
      if (size) e.fontSize = size;
      const w = val("es-weight-" + ek);
      if (w && w !== "inherit") e.fontWeight = w;
      const col = val("es-color-" + ek);
      if (col) e.color = col;
      const bg = val("es-bg-" + ek);
      if (bg && bg !== "transparent" && bg !== "#000000") e.backgroundColor = bg;
      const al = val("es-align-" + ek);
      if (al && al !== "inherit") e.textAlign = al;
      const tt = val("es-transform-" + ek);
      if (tt && tt !== "inherit") e.textTransform = tt;
      if (checked("es-bold-" + ek)) e.bold = true;
      if (checked("es-italic-" + ek)) e.italic = true;
      if (checked("es-underline-" + ek)) e.underline = true;
      const lh = val("es-lh-" + ek);
      if (lh) e.lineHeight = lh;
      const ls = val("es-ls-" + ek);
      if (ls) e.letterSpacing = ls;
      const mt = val("es-mt-" + ek);
      if (mt) e.marginTop = mt;
      const mb = val("es-mb-" + ek);
      if (mb) e.marginBottom = mb;
      const pt = val("es-pt-" + ek);
      if (pt) e.paddingTop = pt;
      const pb = val("es-pb-" + ek);
      if (pb) e.paddingBottom = pb;
      const pl = val("es-pl-" + ek);
      if (pl) e.paddingLeft = pl;
      const pr = val("es-pr-" + ek);
      if (pr) e.paddingRight = pr;
      const br = val("es-radius-" + ek);
      if (br) e.borderRadius = br;
      if (Object.keys(e).length) result[ek] = e;
    });
    return result;
  }

  async function saveSection(s) {
    const content = {};

    if (s.type === "footer") {
      var groups = [];
      var groupEls = root.querySelectorAll(".pb-footer-group");
      groupEls.forEach(function (gel) {
        var gi = parseInt(gel.dataset.gi, 10);
        var title = val("ft-gtitle-" + gi);
        var linksRaw = val("ft-links-" + gi);
        var links = linksRaw.split("\n").filter(Boolean).map(function (line) {
          var parts = line.split("|").map(function (p) { return p.trim(); });
          return { label: parts[0] || "", url: parts[1] || "" };
        });
        groups.push({ title: title, links: links });
      });
      content.groups = groups;
    } else {
      maybe(content, "eyebrow", val("in-eyebrow"));
      maybe(content, "title", val("in-title"));
      maybe(content, "body", val("in-body"));
      maybe(content, "cta_label", val("in-cta-label"));
      maybe(content, "cta_url", val("in-cta-url"));
      maybe(content, "image_url", val("in-image"));
      maybe(content, "alt", val("in-alt"));
      maybe(content, "cta2_label", val("in-cta2-label"));
      maybe(content, "cta2_url", val("in-cta2-url"));
      if (root.querySelector("#in-html")) content.html = root.querySelector("#in-html").value || "";
      if (root.querySelector("#in-items-list")) {
        content.items = Array.prototype.map.call(root.querySelectorAll(".pb-grid-item"), function (el) {
          var i = el.dataset.ii;
          var item = {};
          maybe(item, "title", val("it-title-" + i));
          maybe(item, "text", val("it-text-" + i));
          maybe(item, "url", val("it-url-" + i));
          maybe(item, "cta_label", val("it-ctalabel-" + i));
          maybe(item, "image_url", val("it-image-" + i));
          maybe(item, "alt", val("it-alt-" + i));
          return item;
        }).filter(function (it) { return Object.keys(it).length; });
      }
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
    if ((val("in-type") || s.type) === "html") style.allowHtml = true;
    if (parse(s.style_json).imported) style.imported = true;

    /* Per-element styles */
    const newType = val("in-type") || s.type;
    if (newType !== "footer" && newType !== "html" && newType !== "spacer") {
      const elements = collectElementStyles(newType);
      if (Object.keys(elements).length) style.elements = elements;
    }

    if (s.type !== "footer") {
      const image = {};
      maybe(image, "shape", val("im-shape"));
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
    }

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
