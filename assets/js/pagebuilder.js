/**
 * PAGEBUILDER.JS — v4
 * ---------------------------------------------------------------
 * Major changes from v3:
 *  1. Design tab now contains BOTH section-level layout AND per-element
 *     text styling, clearly labeled by element (Eyebrow/Kicker, Heading,
 *     Body Text, Button, etc.) with collapsible groups.
 *  2. Section type selector shows descriptions of what each type is for.
 *  3. Live side preview — a real-time preview panel on the left side
 *     that updates as you edit, even before saving. The existing full-page
 *     Preview button is preserved.
 * ---------------------------------------------------------------
 */
const EDC_PAGEBUILDER = (() => {
  const api = () => (typeof EDC_API !== "undefined" ? EDC_API : window.EDC_API);
  const esc = (v) => EDC_UI.escapeHtml(v == null ? "" : String(v));
  let root, state = { pages: [], sections: [], activePageId: null, activeSectionId: null, dirty: false };
  let livePreviewTimer = null;

  const TYPES = [
    { id: "hero",   label: "Hero banner",          desc: "Large top-of-page banner with a heading, short text, optional photo, and action buttons. Used at the very top of a landing page to make a strong first impression." },
    { id: "text",   label: "Text block",           desc: "A heading with body text. Good for simple informational sections like descriptions, introductions, or short announcements." },
    { id: "body",   label: "Body text (multi-paragraph)", desc: "Long-form text with multiple paragraphs separated by blank lines. Ideal for policy pages, articles, detailed descriptions, or any content that needs several paragraphs." },
    { id: "image",  label: "Image",                desc: "A standalone photo with optional heading and caption. Use for showcasing a single important image, a banner, or a decorative photo between text sections." },
    { id: "split",  label: "Image + text",         desc: "A two-column layout with an image on one side and text on the other. Great for feature highlights, service descriptions, or 'about us' style content." },
    { id: "grid",   label: "Card grid",            desc: "A row of cards, each with its own title, text, optional photo, and link. Perfect for showing multiple items like services, team members, features, or program highlights." },
    { id: "gridx",  label: "Card grid — customizable", desc: "Same as the card grid, but every single card is independent: its own shape (circle, diamond, hexagon, star…), its own size and column/row span, its own edges, corner radius, spacing, alignment, order and its own background photo with blur." },
    { id: "cta",    label: "Call to action",       desc: "A centered banner with a heading, short text, and a button. Used to prompt visitors to take action — apply now, contact us, book a consultation, etc." },
    { id: "footer", label: "Footer links",         desc: "Link groups shown at the bottom of every page. Typically contains navigation links organized by category (Company, Resources, etc.)." },
    { id: "html",   label: "Raw HTML (imported)",  desc: "A block of raw HTML code, usually imported from an existing page. For advanced users who want to paste custom code. Any image URLs inside can be replaced with Media Library URLs." },
    { id: "spacer", label: "Spacer",               desc: "An empty vertical gap between sections. Use to add breathing room or visual separation between content blocks." }
  ];

  const FONT_FAMILIES = [
    { value: "inherit", label: "Theme default" },
    { value: "Arial, sans-serif", label: "Arial" },
    { value: "Georgia, serif", label: "Georgia" },
    { value: "'Times New Roman', serif", label: "Times New Roman" },
    { value: "'Courier New', monospace", label: "Courier New" },
    { value: "Inter, sans-serif", label: "Inter" },
    { value: "Roboto, sans-serif", label: "Roboto" },
    { value: "Poppins, sans-serif", label: "Poppins" },
    { value: "Montserrat, sans-serif", label: "Montserrat" },
    { value: "'Playfair Display', serif", label: "Playfair Display" },
    { value: "Lora, serif", label: "Lora" },
    { value: "Merriweather, serif", label: "Merriweather" },
    { value: "'Open Sans', sans-serif", label: "Open Sans" },
    { value: "Raleway, sans-serif", label: "Raleway" },
    { value: "Nunito, sans-serif", label: "Nunito" },
    { value: "system-ui, sans-serif", label: "System UI" }
  ];

  const FONT_WEIGHTS = [
    { value: "inherit", label: "Theme default" },
    { value: "300", label: "Light (300)" },
    { value: "400", label: "Regular (400)" },
    { value: "500", label: "Medium (500)" },
    { value: "600", label: "Semi-bold (600)" },
    { value: "700", label: "Bold (700)" },
    { value: "800", label: "Extra bold (800)" },
    { value: "900", label: "Black (900)" }
  ];

  const TEXT_TRANSFORMS = [
    { value: "inherit", label: "Theme default" },
    { value: "none", label: "Normal" },
    { value: "uppercase", label: "UPPERCASE" },
    { value: "lowercase", label: "lowercase" },
    { value: "capitalize", label: "Capitalize Each Word" }
  ];

  const IMAGE_SHAPES = [
    { value: "default", label: "Default (use corner radius)" },
    { value: "circle", label: "Circle" },
    { value: "rounded", label: "Rounded square" },
    { value: "square", label: "Square (sharp edges)" }
  ];

  /* ---- decorative photo / icon slots (Icons & Photos tab) ---- */
  const DECO_SLOTS = [
    { id: "aboveEyebrow", label: "1. Above the Eyebrow / Kicker",
      desc: "Sits at the very top of the section, above the small label. Best for a small logo, badge or icon." },
    { id: "aboveHeading", label: "2. Above the Main Heading",
      desc: "Sits between the eyebrow and the main title. Best for an icon or a medium picture that introduces the heading." },
    { id: "belowBody",    label: "3. Below the Body Text",
      desc: "Sits under the paragraphs and above the buttons. Best for an illustration, signature or a supporting photo." },
    { id: "belowButtons", label: "4. Below the Primary / Secondary Buttons",
      desc: "Sits at the very bottom of the section, under the buttons. Best for trust badges, partner logos or a decorative shape." }
  ];

  const CARD_DECO_SLOTS = [
    { id: "cardAboveTitle", label: "Cards — Above every Card Title",
      desc: "Shown inside each card, above the card title. Great for a small round icon or avatar-style photo." },
    { id: "cardBelowText",  label: "Cards — Below every Card Text",
      desc: "Shown inside each card, under the card text and above the card button." }
  ];

  const INLINE_ICON_KEYS = [
    { id: "eyebrow",   label: "Small icon before the Eyebrow / Kicker" },
    { id: "heading",   label: "Small icon before the Main Heading" },
    { id: "cardTitle", label: "Small icon before every Card Title" }
  ];

  const DECO_MODES = [
    { value: "", label: "None (nothing shown)" },
    { value: "image", label: "Photo / picture (image URL)" },
    { value: "icon", label: "Icon or symbol (emoji / character)" }
  ];

  const DECO_FITS = [
    { value: "", label: "Automatic (recommended)" },
    { value: "contain", label: "Fit whole image (best for transparent PNG / logos)" },
    { value: "cover", label: "Fill & crop the frame" },
    { value: "fill", label: "Stretch to fill" },
    { value: "none", label: "Original size" },
    { value: "scale-down", label: "Scale down only" }
  ];

  const DECO_ALIGNS = [
    { value: "left", label: "Left" },
    { value: "center", label: "Center" },
    { value: "right", label: "Right" }
  ];

  const ELEMENT_KEYS = [
    { id: "eyebrow",     label: "Eyebrow / Kicker (small label above heading)" },
    { id: "heading",     label: "Heading (main title)" },
    { id: "body",        label: "Body Text (paragraphs)" },
    { id: "button",      label: "Primary Button" },
    { id: "button2",     label: "Secondary Button" },
    { id: "cardTitle",   label: "Card Title (in card grid)" },
    { id: "cardText",    label: "Card Text (in card grid)" },
    { id: "cardButton",  label: "Card Button (in card grid)" }
  ];

  /* both card-grid family types share the same editors */
  function isGridType(type) { return type === "grid" || type === "gridx" || type === "cards"; }
  function isCustomGrid(type) { return type === "gridx"; }

  const CARD_SHAPE_OPTIONS = [
    { value: "default", label: "Default (use corner radius)" },
    { value: "rounded", label: "Rounded corners" },
    { value: "square", label: "Square (sharp corners)" },
    { value: "pill", label: "Pill / capsule" },
    { value: "circle", label: "Circle" },
    { value: "oval", label: "Oval / ellipse" },
    { value: "diamond", label: "Diamond" },
    { value: "hexagon", label: "Hexagon" },
    { value: "octagon", label: "Octagon" },
    { value: "triangle", label: "Triangle" },
    { value: "arch", label: "Arch (rounded top)" },
    { value: "blob", label: "Blob (organic)" },
    { value: "star", label: "Star" }
  ];

  const BG_FITS = [
    { value: "cover", label: "Fill the whole card (crop if needed)" },
    { value: "contain", label: "Fit the whole photo inside the card" },
    { value: "fill", label: "Stretch to the card size" },
    { value: "none", label: "Original size" }
  ];

  const BG_POSITIONS = [
    { value: "center", label: "Center" },
    { value: "top", label: "Top" },
    { value: "bottom", label: "Bottom" },
    { value: "left", label: "Left" },
    { value: "right", label: "Right" },
    { value: "top left", label: "Top left" },
    { value: "top right", label: "Top right" },
    { value: "bottom left", label: "Bottom left" },
    { value: "bottom right", label: "Bottom right" }
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
      '<div class="pb pb-v4">' +
        '<aside class="pb-rail">' +
          '<div class="pb-rail-head"><h3>Pages</h3><div><button class="pb-btn pb-btn-ghost pb-btn-sm" id="pb-info" title="How to use the builder">?</button> <button class="pb-btn pb-btn-ghost" id="pb-new-page">+ New</button></div></div>' +
          '<div class="pb-info-panel" id="pb-info-panel" hidden>' +
            '<h4>Page Builder Guide</h4>' +
            '<p><strong>Content mode</strong> — set to <em>replace</em> to make your builder sections take over the built-in page content. Set to <em>append</em> to add sections below the existing content.</p>' +
            '<p><strong>Sections</strong> — drag to reorder, click to edit. Use the Content tab for text/images, the Design tab for all styling (section layout + per-element text styling), and the Image tab for resize/crop/shape/placement.</p>' +
            '<p><strong>Live preview</strong> — the preview panel on the right updates in real time as you edit. You see changes immediately without saving. Click the Preview button for a full-page view.</p>' +
            '<p><strong>Images</strong> — choose shape (circle, rounded, square), set width, height, crop behaviour, focal point, alignment, margins, and drop shadow.</p>' +
          '</div>' +
          '<ul class="pb-pages" id="pb-pages"></ul>' +
          '<div class="pb-page-settings" id="pb-page-settings"></div>' +
        '</aside>' +

        '<section class="pb-canvas">' +
          '<header class="pb-canvas-head">' +
            '<div><h3 id="pb-canvas-title">Select a page</h3><p class="pb-hint" id="pb-canvas-sub">Drag sections to reorder. Click a section to edit it.</p></div>' +
            '<div class="pb-canvas-actions">' +
              '<button class="pb-btn pb-btn-ghost pb-btn-sm" id="pb-live-toggle" title="Toggle live preview panel">Live View: On</button>' +
              '<button class="pb-btn pb-btn-ghost" id="pb-preview">Full Preview</button>' +
            '</div>' +
          '</header>' +
          '<div class="pb-canvas-body">' +
            '<div class="pb-sections-col">' +
              '<div class="pb-add-bar">' +
                '<select class="pb-input pb-input-sm" id="pb-add-type">' + TYPES.map(t => '<option value="' + t.id + '">' + t.label + '</option>').join("") + '</select>' +
                '<button class="pb-btn" id="pb-add">Add section</button>' +
                '<button class="pb-btn pb-btn-primary" id="pb-save-order">Save order</button>' +
              '</div>' +
              '<div class="pb-type-desc" id="pb-type-desc"></div>' +
              '<div class="pb-sections" id="pb-sections"></div>' +
            '</div>' +
            '<aside class="pb-live-preview" id="pb-live-preview">' +
              '<div class="pb-live-head"><span>Live View</span><small>Updates as you edit</small></div>' +
              '<div class="pb-live-frame" id="pb-live-frame"></div>' +
            '</aside>' +
          '</div>' +
        '</section>' +

        '<aside class="pb-inspector" id="pb-inspector"><div class="edc-empty">Select a section to edit its content and styling.</div></aside>' +
      '</div>' +
      '<div class="pb-preview-overlay" id="pb-preview-overlay" hidden><div class="pb-preview-box">' +
        '<header><strong>Full page preview</strong><button class="pb-btn pb-btn-ghost" id="pb-preview-close">Close</button></header>' +
        '<iframe id="pb-preview-frame" title="Page preview"></iframe></div></div>';

    root.querySelector("#pb-new-page").onclick = newPage;
    root.querySelector("#pb-add").onclick = addSection;
    root.querySelector("#pb-save-order").onclick = saveOrder;
    root.querySelector("#pb-preview").onclick = openPreview;
    root.querySelector("#pb-preview-close").onclick = () => { root.querySelector("#pb-preview-overlay").hidden = true; };
    root.querySelector("#pb-info").onclick = () => { const p = root.querySelector("#pb-info-panel"); p.hidden = !p.hidden; };
    root.querySelector("#pb-live-toggle").onclick = toggleLivePreview;

    const sel = root.querySelector("#pb-add-type");
    sel.onchange = () => updateTypeDesc(sel.value);
    updateTypeDesc(sel.value);
  }

  function updateTypeDesc(typeId) {
    const t = TYPES.find(x => x.id === typeId);
    const box = root.querySelector("#pb-type-desc");
    if (!box) return;
    if (!t) { box.innerHTML = ""; return; }
    box.innerHTML = '<strong>' + esc(t.label) + '</strong> — ' + esc(t.desc);
  }

  function toggleLivePreview() {
    const panel = root.querySelector("#pb-live-preview");
    const btn = root.querySelector("#pb-live-toggle");
    const isOn = !panel.hidden;
    panel.hidden = isOn;
    btn.textContent = "Live View: " + (isOn ? "Off" : "On");
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
    updateLivePreview();
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
    const typeInfo = TYPES.find(t => t.id === s.type) || {};
    card.innerHTML =
      '<div class="pb-section-grip" title="Drag to reorder">&#x2807;</div>' +
      '<div class="pb-section-body">' +
        '<div class="pb-section-type">' + esc(typeInfo.label || s.type) + ' &middot; #' + (i + 1) + '</div>' +
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
    card.addEventListener("dragend", () => { card.classList.remove("is-dragging"); updateLivePreview(); });
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
      gridx: { title: "Highlights", items: [
        { title: "Item one", text: "Detail", shape: "circle" },
        { title: "Item two", text: "Detail", shape: "diamond" },
        { title: "Item three", text: "Detail", shape: "rounded" }
      ] },
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
    updateLivePreview();
  }

  /* ------------------------------ inspector ------------------------------ */

  function field(label, control) { return '<label class="pb-field"><span>' + esc(label) + "</span>" + control + "</label>"; }
  function select(id, options, value) {
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

  /* ---- per-element style controls (collapsible, with clear labels) ---- */

  function elementsForType(type) {
    switch (type) {
      case "hero":   return ["eyebrow", "heading", "body", "button", "button2"];
      case "text":   return ["heading", "body"];
      case "body":   return ["body"];
      case "image":  return ["heading", "body", "button"];
      case "split":  return ["heading", "body", "button"];
      case "grid":
      case "cards":
      case "gridx": return ["eyebrow", "heading", "body", "button", "cardTitle", "cardText", "cardButton"];
      case "cta":    return ["heading", "body", "button"];
      default:       return [];
    }
  }

  function elementStyleControls(elemKey, st) {
    const els = (st && st.elements) || {};
    const e = els[elemKey] || {};
    const labelInfo = ELEMENT_KEYS.find(k => k.id === elemKey) || {};
    const label = labelInfo.label || elemKey;
    const hasValues = Object.keys(e).length > 0;

    return '<details class="pb-elem-group' + (hasValues ? " is-customized" : "") + '" data-elem="' + elemKey + '">' +
      '<summary class="pb-elem-head">' +
        '<span class="pb-elem-name">' + esc(label) + '</span>' +
        (hasValues ? '<span class="pb-elem-badge">Customized</span>' : '') +
      '</summary>' +
      '<div class="pb-elem-body">' +
        field("Font family", select("es-font-" + elemKey, FONT_FAMILIES, e.fontFamily || "inherit")) +
        '<div class="pb-field-row">' +
          field("Font size", num("es-size-" + elemKey, e.fontSize, "e.g. 18 or 1.2rem")) +
          field("Font weight", select("es-weight-" + elemKey, FONT_WEIGHTS, e.fontWeight || "inherit")) +
        '</div>' +
        '<div class="pb-field-row">' +
          field("Text color", color("es-color-" + elemKey, e.color, "#000000")) +
          field("Background color", color("es-bg-" + elemKey, e.backgroundColor, "#ffffff")) +
        '</div>' +
        field("Text alignment", select("es-align-" + elemKey, [
          { value: "inherit", label: "Theme default" },
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
          { value: "right", label: "Right" },
          { value: "justify", label: "Justify (full width)" }
        ], e.textAlign || "inherit")) +
        field("Text transform", select("es-transform-" + elemKey, TEXT_TRANSFORMS, e.textTransform || "inherit")) +
        '<div class="pb-field-row">' +
          '<label class="pb-check"><input type="checkbox" id="es-bold-' + elemKey + '"' + (e.bold ? " checked" : "") + '> <span>Bold</span></label>' +
          '<label class="pb-check"><input type="checkbox" id="es-italic-' + elemKey + '"' + (e.italic ? " checked" : "") + '> <span>Italic</span></label>' +
          '<label class="pb-check"><input type="checkbox" id="es-underline-' + elemKey + '"' + (e.underline ? " checked" : "") + '> <span>Underline</span></label>' +
        '</div>' +
        '<div class="pb-field-row">' +
          field("Line height", num("es-lh-" + elemKey, e.lineHeight, "e.g. 1.5")) +
          field("Letter spacing (px)", num("es-ls-" + elemKey, e.letterSpacing, "e.g. 0.5")) +
        '</div>' +
        '<div class="pb-field-row">' +
          field("Margin above (px)", num("es-mt-" + elemKey, e.marginTop, "0")) +
          field("Margin below (px)", num("es-mb-" + elemKey, e.marginBottom, "0")) +
        '</div>' +
        '<div class="pb-field-row">' +
          field("Padding top/bottom (px)", num("es-pv-" + elemKey, e.paddingTop, "0")) +
          field("Padding left/right (px)", num("es-ph-" + elemKey, e.paddingLeft, "0")) +
        '</div>' +
        field("Border radius (px)", num("es-radius-" + elemKey, e.borderRadius, "0")) +
        '<button class="pb-btn pb-btn-sm pb-btn-ghost pb-elem-reset" data-elem="' + elemKey + '">Reset this element</button>' +
      '</div>' +
    '</details>';
  }

  function elementStyleSection(type, st) {
    const elems = elementsForType(type);
    if (!elems.length) return '<p class="pb-hint">No per-element styling available for this section type.</p>';
    return elems.map(function (k) { return elementStyleControls(k, st); }).join("");
  }

  /* ---- decorative photo / icon controls (detailed, labelled) ---- */

  function decoControls(slot, st, isCard) {
    const all = (st && st.decorations) || {};
    const d = all[slot.id] || {};
    const on = !!d.mode;
    const defW = isCard ? "72" : "120";
    const defSize = isCard ? "26" : "32";
    return '<details class="pb-elem-group pb-deco-group' + (on ? " is-customized" : "") + '" data-deco="' + slot.id + '"' + (on ? " open" : "") + '>' +
      '<summary class="pb-elem-head"><span class="pb-elem-name">' + esc(slot.label) + '</span>' +
        (on ? '<span class="pb-elem-badge">In use</span>' : '') + '</summary>' +
      '<div class="pb-elem-body">' +
        '<p class="pb-hint">' + esc(slot.desc) + '</p>' +
        field("What to show here", select("dc-" + slot.id + "-mode", DECO_MODES, d.mode || "")) +
        '<div class="pb-deco-image-fields">' +
          field("Photo / picture URL (PNG with transparency works best)", text("dc-" + slot.id + "-url", d.url, "https://\u2026 or assets/img/logo.png")) +
          field("Photo description (alt text, for accessibility)", text("dc-" + slot.id + "-alt", d.alt, "e.g. EDC logo")) +
          '<div class="pb-field-row">' +
            field("Width (px or %)", num("dc-" + slot.id + "-width", d.width, "default " + defW + "px")) +
            field("Height (px, leave empty to keep proportions)", num("dc-" + slot.id + "-height", d.height, "auto")) +
          '</div>' +
          '<div class="pb-field-row">' +
            field("Shape", select("dc-" + slot.id + "-shape", IMAGE_SHAPES, d.shape || "default")) +
            field("Corner radius (px, for custom shapes)", num("dc-" + slot.id + "-radius", d.radius, "16")) +
          '</div>' +
          field("How the photo fills its frame", select("dc-" + slot.id + "-fit", DECO_FITS, d.fit || "")) +
          checkbox("dc-" + slot.id + "-transparent", d.transparent, "Transparent background (keep PNG / logo transparency \u2014 no cropping, no fill colour)") +
          checkbox("dc-" + slot.id + "-shadow", d.shadow, "Drop shadow behind the photo") +
        '</div>' +
        '<div class="pb-deco-icon-fields">' +
          field("Icon or symbol (paste an emoji or character)", text("dc-" + slot.id + "-icon", d.icon, "\u2b50 \u2714 \u2192 \u2665 \u25cf")) +
          '<div class="pb-field-row">' +
            field("Icon size (px)", num("dc-" + slot.id + "-size", d.size, "default " + defSize)) +
            field("Icon colour", color("dc-" + slot.id + "-color", d.color, "#c9a227")) +
          '</div>' +
        '</div>' +
        '<div class="pb-field-row">' +
          field("Placement (left / center / right)", select("dc-" + slot.id + "-align", DECO_ALIGNS, d.align || "left")) +
          field("Opacity (0.1 \u2013 1)", num("dc-" + slot.id + "-opacity", d.opacity, "1")) +
        '</div>' +
        '<div class="pb-field-row">' +
          field("Blur (px, 0 = sharp)", num("dc-" + slot.id + "-blur", d.blur, "0")) +
          field("Black & white (0 \u2013 100%)", num("dc-" + slot.id + "-grayscale", d.grayscale, "0")) +
        '</div>' +
        '<div class="pb-field-row">' +
          field("Rotate (degrees)", num("dc-" + slot.id + "-rotate", d.rotate, "0")) +
          field("Space above (px)", num("dc-" + slot.id + "-mt", d.marginTop, "0")) +
        '</div>' +
        field("Space below (px)", num("dc-" + slot.id + "-mb", d.marginBottom, isCard ? "10" : "14")) +
        '<button type="button" class="pb-btn pb-btn-sm pb-btn-ghost pb-deco-reset" data-deco="' + slot.id + '">Remove this photo / icon</button>' +
      '</div>' +
    '</details>';
  }

  function inlineIconControls(key, st) {
    const all = (st && st.inlineIcons) || {};
    const d = all[key.id] || {};
    const on = !!d.mode;
    return '<details class="pb-elem-group pb-deco-group' + (on ? " is-customized" : "") + '" data-icon="' + key.id + '"' + (on ? " open" : "") + '>' +
      '<summary class="pb-elem-head"><span class="pb-elem-name">' + esc(key.label) + '</span>' +
        (on ? '<span class="pb-elem-badge">In use</span>' : '') + '</summary>' +
      '<div class="pb-elem-body">' +
        '<p class="pb-hint">Optional. The icon sits on the same line, right before the text. By default it is exactly the same size as the text (1em) \u2014 type a bigger value below to enlarge it.</p>' +
        field("What to show", select("ic-" + key.id + "-mode", [
          { value: "", label: "None" },
          { value: "icon", label: "Icon or symbol (emoji / character)" },
          { value: "image", label: "Small picture (image URL)" }
        ], d.mode || "")) +
        field("Icon or symbol", text("ic-" + key.id + "-icon", d.icon, "\u2b50 \u2714 \u2192 \u25b8")) +
        field("Small picture URL (transparent PNG recommended)", text("ic-" + key.id + "-url", d.url, "assets/img/icon.png")) +
        '<div class="pb-field-row">' +
          field("Size (empty = same as text, or e.g. 24)", num("ic-" + key.id + "-size", d.size, "1em")) +
          field("Gap before the text (px)", num("ic-" + key.id + "-gap", d.gap, "8")) +
        '</div>' +
        '<div class="pb-field-row">' +
          field("Icon colour", color("ic-" + key.id + "-color", d.color, "#c9a227")) +
          field("Opacity (0.1 \u2013 1)", num("ic-" + key.id + "-opacity", d.opacity, "1")) +
        '</div>' +
        '<div class="pb-field-row">' +
          field("Blur (px)", num("ic-" + key.id + "-blur", d.blur, "0")) +
          field("Rotate (degrees)", num("ic-" + key.id + "-rotate", d.rotate, "0")) +
        '</div>' +
        '<button type="button" class="pb-btn pb-btn-sm pb-btn-ghost pb-icon-reset" data-icon="' + key.id + '">Remove this icon</button>' +
      '</div>' +
    '</details>';
  }

  function decoTabFields(type, st) {
    var html = '<p class="pb-hint">Add a photo, logo or icon <strong>above the eyebrow</strong>, <strong>above the main heading</strong>, <strong>below the body text</strong> or <strong>below the buttons</strong>. Every slot can be resized, reshaped, faded, blurred, rotated, kept transparent, and placed left, center or right. Leave a size empty to use the recommended default that matches the design.</p>';
    html += '<div class="pb-design-sep"><span>Section photos &amp; icons</span><small>Four placement slots</small></div>';
    html += DECO_SLOTS.map(function (slot) { return decoControls(slot, st, false); }).join("");
    if (isGridType(type)) {
      html += '<div class="pb-design-sep"><span>Card photos &amp; icons</span><small>Applied inside every card of this grid</small></div>';
      html += CARD_DECO_SLOTS.map(function (slot) { return decoControls(slot, st, true); }).join("");
    }
    html += '<div class="pb-design-sep"><span>Small inline icons before titles</span><small>Optional \u2014 matches the text size by default</small></div>';
    html += INLINE_ICON_KEYS.filter(function (k) { return k.id !== "cardTitle" || isGridType(type); })
      .map(function (k) { return inlineIconControls(k, st); }).join("");
    return html;
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
  var itemsCustom = false;   /* true while editing a "Card grid — customizable" section */

  /* Background photo controls for ONE card (both grid types) */
  function cardBgFields(it, i) {
    return '<details class="pb-elem-group pb-card-bg' + (it.bg_url ? " is-customized" : "") + '">' +
      '<summary class="pb-elem-head"><span class="pb-elem-name">Background photo for this card</span>' +
      (it.bg_url ? '<span class="pb-elem-badge">Customized</span>' : '') + '</summary>' +
      '<div class="pb-elem-body">' +
        '<p class="pb-hint">Leave empty to use the grid-wide background photo (Design tab). The photo sits behind the card text and always fits fully inside the card.</p>' +
        field("Background photo URL", text("it-bgurl-" + i, it.bg_url, "https://\u2026 or assets/img/photo.jpg")) +
        '<div class="pb-field-row">' +
          field("How the photo fits", select("it-bgfit-" + i, [{ value: "", label: "Use grid default" }].concat(BG_FITS), it.bg_fit || "")) +
          field("Photo focus point", select("it-bgpos-" + i, [{ value: "", label: "Use grid default" }].concat(BG_POSITIONS), it.bg_position || "")) +
        '</div>' +
        '<div class="pb-field-row">' +
          field("Blur the photo (px, 0 = sharp)", num("it-bgblur-" + i, it.bg_blur, "grid default")) +
          field("Photo fade / opacity (0.1 \u2013 1)", num("it-bgop-" + i, it.bg_opacity, "grid default")) +
        '</div>' +
        '<div class="pb-field-row">' +
          field("Black &amp; white (0 \u2013 100%)", num("it-bggray-" + i, it.bg_grayscale, "grid default")) +
          field("Dark overlay for readable text (0 \u2013 1)", num("it-bgov-" + i, it.bg_overlay, "grid default")) +
        '</div>' +
        field("Overlay colour", color("it-bgovc-" + i, it.bg_overlay_color, "#000000")) +
        checkbox("it-bgoff-" + i, it.bg_off === true || it.bg_off === "true", "No background photo on this card (ignore the grid-wide photo)") +
      '</div>' +
    '</details>';
  }

  /* Shape / size / spacing controls for ONE card (customizable grid only) */
  function cardShapeFields(it, i) {
    return '<details class="pb-elem-group pb-card-shape' + (it.shape && it.shape !== "default" ? " is-customized" : "") + '">' +
      '<summary class="pb-elem-head"><span class="pb-elem-name">Shape, size, edges &amp; spacing of this card</span>' +
      (it.shape && it.shape !== "default" ? '<span class="pb-elem-badge">' + esc(it.shape) + '</span>' : '') + '</summary>' +
      '<div class="pb-elem-body">' +
        '<p class="pb-hint">These settings apply to <strong>this card only</strong>. Every card can have a different shape, size, edge and spacing.</p>' +
        field("Card shape", select("it-shape-" + i, CARD_SHAPE_OPTIONS, it.shape || "default")) +
        '<div class="pb-design-sep pb-design-sep-sm"><span>Size</span><small>Columns it spans, rows it spans, height</small></div>' +
        '<div class="pb-field-row">' +
          field("Columns this card spans", num("it-colspan-" + i, it.col_span, "1")) +
          field("Rows this card spans", num("it-rowspan-" + i, it.row_span, "1")) +
        '</div>' +
        '<div class="pb-field-row">' +
          field("Card width (px or %, empty = full cell)", num("it-width-" + i, it.width, "auto")) +
          field("Minimum height (px)", num("it-minh-" + i, it.min_height, "auto")) +
        '</div>' +
        '<div class="pb-field-row">' +
          field("Shape ratio (e.g. 1/1, 4/3)", text("it-aspect-" + i, it.aspect, "auto")) +
          field("Zoom this card (1 = normal)", num("it-scale-" + i, it.scale, "1")) +
        '</div>' +
        checkbox("it-stretch-" + i, it.stretch === true || it.stretch === "true", "Stretch this card to the full row height") +
        '<div class="pb-design-sep pb-design-sep-sm"><span>Edges</span><small>This card\u2019s own border and corners</small></div>' +
        '<div class="pb-field-row">' +
          field("Edge thickness (px, 0 = no line)", num("it-bw-" + i, it.border_width, "grid default")) +
          field("Edge style", select("it-bs-" + i, [
            { value: "", label: "Use grid default" },
            { value: "solid", label: "Solid line" },
            { value: "dashed", label: "Dashed line" },
            { value: "dotted", label: "Dotted line" },
            { value: "double", label: "Double line" },
            { value: "none", label: "No edge at all" }
          ], it.border_style || "")) +
        '</div>' +
        '<div class="pb-field-row">' +
          field("Edge colour", color("it-bc-" + i, it.border_color, "#e5e7eb")) +
          field("Corner radius (px)", num("it-radius-" + i, it.radius, "grid default")) +
        '</div>' +
        '<div class="pb-design-sep pb-design-sep-sm"><span>Spacing &amp; placement</span><small>This card\u2019s own gaps and position</small></div>' +
        '<div class="pb-field-row">' +
          field("Extra side gap (px)", num("it-gapx-" + i, it.gap_x, "0")) +
          field("Extra top / bottom gap (px)", num("it-gapy-" + i, it.gap_y, "0")) +
        '</div>' +
        '<div class="pb-field-row">' +
          field("Vertical placement in its cell", select("it-selfalign-" + i, [
            { value: "", label: "Grid default" },
            { value: "start", label: "Top" },
            { value: "center", label: "Middle" },
            { value: "end", label: "Bottom" },
            { value: "stretch", label: "Stretch" }
          ], it.self_align || "")) +
          field("Horizontal placement in its cell", select("it-selfjustify-" + i, [
            { value: "", label: "Grid default" },
            { value: "start", label: "Left" },
            { value: "center", label: "Center" },
            { value: "end", label: "Right" },
            { value: "stretch", label: "Stretch" }
          ], it.self_justify || "")) +
        '</div>' +
        '<div class="pb-field-row">' +
          field("Card order (lower shows first)", num("it-order-" + i, it.order, "auto")) +
          field("Inner padding (px)", num("it-padding-" + i, it.padding, "auto")) +
        '</div>' +
        '<div class="pb-field-row">' +
          field("Card background colour", color("it-cardbg-" + i, it.background, "#ffffff")) +
          field("Card text colour", color("it-textcolor-" + i, it.text_color, "#0f172a")) +
        '</div>' +
      '</div>' +
    '</details>';
  }

  function itemRow(it, i, custom) {
    it = it || {};
    return '<div class="pb-grid-item" data-ii="' + i + '">' +
      field("Card label / kicker", text("it-eyebrow-" + i, it.eyebrow || it.label || it.tag)) +
      field("Card title", text("it-title-" + i, it.title)) +
      field("Card text", area("it-text-" + i, it.text || it.body, 3)) +
      field("Card content alignment", select("it-align-" + i, [
        { value: "", label: "Use grid default" },
        { value: "left", label: "Left" },
        { value: "center", label: "Center" },
        { value: "right", label: "Right" },
        { value: "justify", label: "Justify" }
      ], it.align || it.text_align || "")) +
      field("Card layout", select("it-layout-" + i, [
        { value: "stacked", label: "Stacked (photo above text)" },
        { value: "horizontal", label: "Horizontal (photo beside text)" }
      ], it.layout || "stacked")) +
      field("Photo position", select("it-image-position-" + i, [
        { value: "top", label: "Top" },
        { value: "left", label: "Left" },
        { value: "right", label: "Right" },
        { value: "hidden", label: "Hide photo in this card" }
      ], it.image_position || "top")) +
      field("Card link", text("it-url-" + i, it.url, "teacher.html?id=\u2026")) +
      field("Card button label", text("it-ctalabel-" + i, it.cta_label)) +
      field("Card photo (image URL)", text("it-image-" + i, it.image_url || it.image, "https://\u2026 or assets/img/photo.jpg")) +
      field("Card photo alt text", text("it-alt-" + i, it.alt)) +
      cardBgFields(it, i) +
      (custom ? cardShapeFields(it, i) : "") +
      '<button class="pb-btn pb-btn-sm pb-btn-danger" data-act="delitem" type="button">Remove card</button>' +
    '</div>';
  }

  function itemsEditor(items, custom) {
    items = Array.isArray(items) ? items : [];
    itemSeq = items.length;
    itemsCustom = !!custom;
    return '<p class="pb-hint">Every card is editable — including its label, alignment, layout, photo and its own background photo.' +
      (custom ? ' In this customizable grid each card also has its own shape, size, edges, spacing and order.' : ' Cards use equal spaces by default, and each card can override those defaults.') + '</p>' +
      '<div id="in-items-list">' + items.map(function (it, i) { return itemRow(it, i, custom); }).join("") + '</div>' +
      '<button class="pb-btn pb-btn-sm" id="in-add-item" type="button">+ Add card</button>';
  }

  function bindItemsEditor(box) {
    var list = box.querySelector("#in-items-list");
    if (!list) return;
    function bindDeletes() {
      list.querySelectorAll('[data-act="delitem"]').forEach(function (b) {
        b.onclick = function () { b.closest(".pb-grid-item").remove(); scheduleLivePreview(); };
      });
    }
    bindDeletes();
    var add = box.querySelector("#in-add-item");
    if (add) add.onclick = function () {
      list.insertAdjacentHTML("beforeend", itemRow({}, itemSeq++, itemsCustom));
      bindDeletes();
      /* the new card's inputs must also drive the live preview */
      const fresh = list.lastElementChild;
      if (fresh) fresh.querySelectorAll(".pb-input, .pb-check input").forEach(function (inp) {
        inp.addEventListener(inp.type === "checkbox" ? "change" : "input", scheduleLivePreview);
      });
      scheduleLivePreview();
    };
  }

  /* ---- the inspector ---- */

  /* ---- advanced image editor / slideshow (assets/js/image-editor.js) ----
   * Additive: the fields above keep working exactly as before. This bar only
   * adds an OPTIONAL editor for drag/zoom cropping and multi-image slideshows.
   * The result is stored in style_json.image.adv.
   * ---------------------------------------------------------------------- */
  function advImageSummary(adv) {
    if (!adv || !adv.slides || !adv.slides.length) return "No advanced settings — the image is shown as-is.";
    const n = adv.slides.length;
    return adv.mode === "slideshow" && n > 1
      ? "Slideshow \u2022 " + n + " images \u2022 " + adv.duration + "s \u2022 " + adv.transition
      : "Custom crop \u2022 1 image \u2022 zoom " + Math.round((adv.slides[0].zoom || 1) * 100) + "%";
  }

  function advImageBar(adv) {
    return '<div class="pb-adv-image-bar">' +
      '<button type="button" class="pb-btn pb-btn-sm" id="im-adv-open">Edit / adjust image\u2026</button>' +
      '<span class="pb-adv-image-status" id="im-adv-status">' + esc(advImageSummary(adv)) + '</span>' +
    '</div>';
  }

  function bindAdvImage(box, s, im) {
    const btns = box.querySelectorAll("#im-adv-open");
    if (!btns.length) return;
    state.advImage = im && im.adv ? im.adv : null;
    btns.forEach(function (btn) {
      btn.onclick = async function () {
        if (typeof EDC_IMAGE_EDITOR === "undefined") {
          return EDC_UI.toast("Image editor not loaded (assets/js/image-editor.js).", "error");
        }
        const inputImg = val("in-image") || "";
        const seed = state.advImage
          ? state.advImage
          : { slides: [{ url: inputImg, alt: val("in-alt") || "" }].filter(function (x) { return x.url; }) };
        const result = await EDC_IMAGE_EDITOR.open(seed);
        if (result === null) return;                 /* cancelled — change nothing */
        state.advImage = result === false ? null : result;  /* false = remove advanced settings */
        box.querySelectorAll("#im-adv-status").forEach(function (stEl) {
          stEl.textContent = advImageSummary(state.advImage);
        });
        if (state.advImage && state.advImage.slides && state.advImage.slides.length) {
          const first = box.querySelector("#in-image");
          if (first && !first.value.trim()) first.value = state.advImage.slides[0].url;
        }
        scheduleLivePreview();
      };
    });
  }

  /* ---- grid-wide card background photo (applies to every card) ---- */
  function cardBackgroundFields(st) {
    const bg = st.cardBg || {};
    return '<div class="pb-design-sep pb-design-sep-sm"><span>Card background photo</span><small>One photo behind every card \u2014 fits fully inside, can be blurred</small></div>' +
      field("Background photo URL", text("st-cardbg-url", bg.url, "https://\u2026 or assets/img/photo.jpg")) +
      checkbox("st-cardbg-all", bg.url ? bg.applyAll !== false && bg.applyAll !== "false" : true,
        "Apply this photo to ALL cards (uncheck to set the photo card by card in the Content tab)") +
      '<div class="pb-field-row">' +
        field("How the photo fits", select("st-cardbg-fit", BG_FITS, bg.fit || "cover")) +
        field("Photo focus point", select("st-cardbg-pos", BG_POSITIONS, bg.position || "center")) +
      '</div>' +
      '<div class="pb-field-row">' +
        field("Blur the photo (px, 0 = sharp)", num("st-cardbg-blur", bg.blur, "0")) +
        field("Photo fade / opacity (0.1 \u2013 1)", num("st-cardbg-opacity", bg.opacity, "1")) +
      '</div>' +
      '<div class="pb-field-row">' +
        field("Black &amp; white (0 \u2013 100%)", num("st-cardbg-gray", bg.grayscale, "0")) +
        field("Dark overlay for readable text (0 \u2013 1)", num("st-cardbg-overlay", bg.overlay, "0.35")) +
      '</div>' +
      field("Overlay colour", color("st-cardbg-overlay-color", bg.overlayColor, "#000000"));
  }

  function renderInspector() {
    const box = root.querySelector("#pb-inspector");
    const s = state.sections.find(x => x.section_id === state.activeSectionId);
    if (!s) { box.innerHTML = '<div class="edc-empty">Select a section to edit its content and styling.</div>'; return; }
    const c = parse(s.content_json), st = parse(s.style_json), im = st.image || {};

    var contentFields =
      field("Section type", select("in-type", TYPES.map(t => ({ value: t.id, label: t.label })), s.type)) +
      '<div class="pb-type-desc pb-type-desc-inline" id="in-type-desc"></div>' +
      field("Eyebrow / kicker (small label above heading)", text("in-eyebrow", c.eyebrow)) +
      field("Heading (main title)", text("in-title", c.title || c.heading)) +
      field("Body text (paragraphs)", area("in-body", c.body || c.text || c.content, 6));

    if (s.type === "body") {
      contentFields += '<p class="pb-hint">Leave a blank line between paragraphs to create spacing. You can add as many paragraphs as you want.</p>';
    }

    contentFields +=
      field("Button label", text("in-cta-label", c.cta_label)) +
      field("Button link", text("in-cta-url", c.cta_url || c.url, "apply.html or https://\u2026")) +
      field("Secondary button label", text("in-cta2-label", c.cta2_label)) +
      field("Secondary button link", text("in-cta2-url", c.cta2_url, "about.html")) +
      field("Image URL", text("in-image", c.image_url || c.image, "https://\u2026 or assets/img/photo.jpg")) +
      advImageBar(im.adv) +
      field("Image alt text", text("in-alt", c.alt));

    if (isGridType(s.type)) {
      contentFields += itemsEditor(c.items, isCustomGrid(s.type));
    }

    if (s.type === "footer") {
      contentFields = field("Section type", select("in-type", TYPES.map(t => ({ value: t.id, label: t.label })), s.type)) + footerEditor(c);
    }

    if (s.type === "html") {
      contentFields = field("Section type", select("in-type", TYPES.map(t => ({ value: t.id, label: t.label })), s.type)) +
        '<p class="pb-hint">Raw HTML block (usually created by "Import current page HTML"). Edit the markup directly — any image src can be replaced with a Media Library URL.</p>' +
        field("HTML", area("in-html", c.html, 14));
    }

    /* Determine which tabs to show */
    var showImageTab = s.type !== "footer";
    var showDesignTab = s.type !== "html" && s.type !== "spacer";
    var showDecoTab = s.type !== "html" && s.type !== "spacer" && s.type !== "footer";

    /* Design tab: section-level layout + per-element styling */
    var designFields = "";
    if (showDesignTab) {
      designFields =
        '<details class="pb-elem-group pb-section-layout" open>' +
          '<summary class="pb-elem-head"><span class="pb-elem-name">Section Layout & Background</span></summary>' +
          '<div class="pb-elem-body">' +
            field("Background colour", color("st-bg", st.background, "#ffffff")) +
            field("Text colour", color("st-color", st.color, "#0f172a")) +
            field("Background image URL", text("st-bgimg", st.backgroundImage)) +
            field("Background overlay (0\u20131, darkens image)", num("st-overlay", st.overlay, "0.35")) +
            '<div class="pb-field-row">' +
              field("Vertical padding (px)", num("st-py", st.paddingY, "80")) +
              field("Horizontal padding (px)", num("st-px", st.paddingX)) +
            '</div>' +
            '<div class="pb-field-row">' +
              field("Content max width (px)", num("st-maxw", st.maxWidth, "1120")) +
              field("Minimum height (px)", num("st-minh", st.minHeight)) +
            '</div>' +
            '<div class="pb-field-row">' +
              field("Corner radius (px)", num("st-radius", st.radius)) +
              field("Section text alignment", select("st-align", [
                { value: "left", label: "Left" },
                { value: "center", label: "Center" },
                { value: "right", label: "Right" }
              ], st.align || "left")) +
            '</div>' +
            field("Block position on page", select("st-blockalign", [
              { value: "center", label: "Centered" },
              { value: "left", label: "Left-aligned" },
              { value: "right", label: "Right-aligned" }
            ], st.blockAlign || "center")) +
            (isGridType(s.type) ?
              '<div class="pb-field-row">' +
                field("Grid columns", num("st-cols", st.columns, "3")) +
                field("Gap between cards (px)", num("st-gap", st.gap, "24")) +
              '</div>' +
              '<div class="pb-field-row">' +
                field("Card arrangement", select("st-card-layout", [
                  { value: "grid", label: "Equal card grid (default)" },
                  { value: "horizontal", label: "Horizontal scrolling row" }
                ], st.cardLayout || "grid")) +
                field("Default card alignment", select("st-card-align", [
                  { value: "", label: "Theme default" },
                  { value: "left", label: "Left" },
                  { value: "center", label: "Center" },
                  { value: "right", label: "Right" },
                  { value: "justify", label: "Justify" }
                ], st.cardAlign || "")) +
              '</div>' +
              checkbox("st-card-height", st.equalCardHeight !== false, "Keep cards the same height") +
              '<div class="pb-design-sep pb-design-sep-sm"><span>Card edges (border)</span><small>Thickness, style and colour of the card outline</small></div>' +
              '<div class="pb-field-row">' +
                field("Edge thickness (px, 0 = no line)", num("st-card-bw", st.cardBorderWidth, "1")) +
                field("Edge style", select("st-card-bs", [
                  { value: "", label: "Solid (default)" },
                  { value: "solid", label: "Solid line" },
                  { value: "dashed", label: "Dashed line" },
                  { value: "dotted", label: "Dotted line" },
                  { value: "double", label: "Double line" },
                  { value: "none", label: "No edge at all" }
                ], st.cardBorderStyle || "")) +
              '</div>' +
              '<div class="pb-field-row">' +
                field("Edge colour", color("st-card-bc", st.cardBorderColor, "#e5e7eb")) +
                field("Card corner radius (px)", num("st-card-radius", st.cardRadius, "12")) +
              '</div>' +
              cardBackgroundFields(st) +
              (isCustomGrid(s.type) ?
                '<div class="pb-design-sep pb-design-sep-sm"><span>Customizable grid</span><small>Row spacing and how cards fill the grid</small></div>' +
                '<div class="pb-field-row">' +
                  field("Gap between rows (px)", num("st-rowgap", st.rowGap, "same as card gap")) +
                  field("Row height (px, empty = automatic)", num("st-autorows", st.autoRows, "auto")) +
                '</div>' +
                checkbox("st-dense", st.denseFill === true || st.denseFill === "true", "Let smaller cards fill the gaps left by bigger cards")
                : '') : '') +
            field("Button style", select("st-btn", [
              { value: "btn-gold", label: "Gold button" },
              { value: "btn-primary", label: "Navy button" },
              { value: "btn-outline", label: "Outline button" },
              { value: "btn-ghost", label: "Ghost (text only)" }
            ], st.buttonVariant || "btn-gold")) +
            (s.type === "split" ? checkbox("st-reverse", st.reverse, "Reverse image / text order") : '') +
          '</div>' +
        '</details>' +
        '<div class="pb-design-sep"><span>Text Element Styling</span><small>Click each element to expand and customize</small></div>' +
        elementStyleSection(s.type, st);
    }

    box.innerHTML =
      '<div class="pb-inspector-head"><h4>' + esc((TYPES.find(t => t.id === s.type) || {}).label || s.type) + '</h4>' +
      '<button class="pb-btn pb-btn-primary pb-btn-sm" id="in-save">Save section</button></div>' +

      '<div class="pb-tabs"><button class="pb-tab is-active" data-tab="content">Content</button>' +
      (showDesignTab ? '<button class="pb-tab" data-tab="design">Design</button>' : '') +
      (showImageTab ? '<button class="pb-tab" data-tab="image">Image</button>' : '') +
      (showDecoTab ? '<button class="pb-tab" data-tab="deco">Icons &amp; Photos</button>' : '') + '</div>' +

      '<div class="pb-tabpane" data-pane="content">' + contentFields + '</div>' +
      (showDecoTab ? '<div class="pb-tabpane" data-pane="deco" hidden>' + decoTabFields(s.type, st) + '</div>' : '') +
      (showDesignTab ? '<div class="pb-tabpane" data-pane="design" hidden>' + designFields + '</div>' : '') +
      (showImageTab ?
      '<div class="pb-tabpane" data-pane="image" hidden>' +
        '<p class="pb-hint">Resize, shape, and place the image exactly where you want it. Use zoom (object-fit) to control how the photo fills its frame.</p>' +
        advImageBar(im.adv) +
        '<div class="pb-field-row">' +
          field("Image shape", select("im-shape", IMAGE_SHAPES, im.shape || "default")) +
          field("Zoom / crop mode", select("im-fit", [
            { value: "cover", label: "Fill & crop (cover)" },
            { value: "contain", label: "Fit entire image (contain)" },
            { value: "fill", label: "Stretch to fill" },
            { value: "none", label: "Original size" },
            { value: "scale-down", label: "Scale down only" }
          ], im.fit || "cover")) +
        '</div>' +
        '<div class="pb-field-row">' +
          field("Width (px or %)", num("im-w", im.width, "e.g. 480 or 60%")) +
          field("Height (px)", num("im-h", im.height, "auto")) +
        '</div>' +
        '<div class="pb-field-row">' +
          field("Max width (px or %)", num("im-maxw", im.maxWidth, "100%")) +
          field("Corner radius (px)", num("im-radius", im.radius, "16")) +
        '</div>' +
        field("Focal point (where to crop from)", select("im-pos", [
          { value: "center", label: "Center" },
          { value: "top", label: "Top" },
          { value: "bottom", label: "Bottom" },
          { value: "left", label: "Left" },
          { value: "right", label: "Right" },
          { value: "top left", label: "Top left" },
          { value: "top right", label: "Top right" },
          { value: "bottom left", label: "Bottom left" },
          { value: "bottom right", label: "Bottom right" }
        ], im.position || "center")) +
        '<div class="pb-field-row">' +
          field("Horizontal placement", select("im-align", [
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" }
          ], im.align || "center")) +
          field("Space above (px)", num("im-mt", im.marginTop, "0")) +
        '</div>' +
        '<div class="pb-field-row">' +
          field("Space below (px)", num("im-mb", im.marginBottom, "0")) +
          checkbox("im-shadow", im.shadow, "Drop shadow") +
        '</div>' +
        '<div class="pb-design-sep pb-design-sep-sm"><span>Photo effects</span><small>Blur, fade, black &amp; white, transparency</small></div>' +
        '<div class="pb-field-row">' +
          field("Blur (px, 0 = sharp)", num("im-blur", im.blur, "0")) +
          field("Opacity / fade (0.1 \u2013 1)", num("im-opacity", im.opacity, "1")) +
        '</div>' +
        field("Black &amp; white (0 \u2013 100%)", num("im-grayscale", im.grayscale, "0")) +
        checkbox("im-transparent", im.transparent, "Transparent background (keep PNG transparency \u2014 no fill colour behind the photo)") +
      '</div>' : '');

    /* Show section type description in content tab */
    const inTypeSel = box.querySelector("#in-type");
    const inTypeDesc = box.querySelector("#in-type-desc");
    function refreshInTypeDesc() {
      const t = TYPES.find(x => x.id === inTypeSel.value);
      if (inTypeDesc && t) inTypeDesc.innerHTML = '<strong>' + esc(t.label) + '</strong> — ' + esc(t.desc);
    }
    refreshInTypeDesc();
    inTypeSel.onchange = refreshInTypeDesc;

    /* Tab switching */
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
        scheduleLivePreview();
      };
    });

    /* Icons & Photos: reset buttons and show/hide the irrelevant field groups */
    box.querySelectorAll(".pb-deco-reset, .pb-icon-reset").forEach(function (btn) {
      btn.onclick = function () {
        var wrap = btn.closest("details");
        if (!wrap) return;
        wrap.querySelectorAll("input, select").forEach(function (inp) {
          if (inp.type === "checkbox") inp.checked = false;
          else if (inp.tagName === "SELECT") inp.selectedIndex = 0;
          else if (inp.type !== "color") inp.value = "";
        });
        refreshDecoVisibility(box);
        scheduleLivePreview();
      };
    });
    box.querySelectorAll('[id^="dc-"][id$="-mode"], [id^="ic-"][id$="-mode"]').forEach(function (sel) {
      sel.addEventListener("change", function () { refreshDecoVisibility(box); });
    });
    refreshDecoVisibility(box);

    bindItemsEditor(box);
    bindAdvImage(box, s, im);

    /* Live preview on input changes */
    box.querySelectorAll(".pb-input, .pb-check input").forEach(function (inp) {
      var evt = inp.type === "checkbox" ? "change" : "input";
      inp.addEventListener(evt, scheduleLivePreview);
    });

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

  /* ---- show only the fields that matter for the chosen mode ---- */
  function refreshDecoVisibility(box) {
    box.querySelectorAll("details[data-deco]").forEach(function (d) {
      var mode = (d.querySelector('[id$="-mode"]') || {}).value || "";
      var imgFields = d.querySelector(".pb-deco-image-fields");
      var iconFields = d.querySelector(".pb-deco-icon-fields");
      if (imgFields) imgFields.hidden = mode !== "image";
      if (iconFields) iconFields.hidden = mode !== "icon";
      d.classList.toggle("is-customized", !!mode);
    });
    box.querySelectorAll("details[data-icon]").forEach(function (d) {
      var mode = (d.querySelector('[id$="-mode"]') || {}).value || "";
      d.querySelectorAll(".pb-field").forEach(function (f) {
        var label = (f.querySelector("span") || {}).textContent || "";
        if (/Icon or symbol|Icon colour/.test(label)) f.hidden = mode !== "icon";
        if (/Small picture URL/.test(label)) f.hidden = mode !== "image";
      });
      d.classList.toggle("is-customized", !!mode);
    });
  }

  /* ---- schedule live preview update (debounced) ---- */
  function scheduleLivePreview() {
    if (livePreviewTimer) clearTimeout(livePreviewTimer);
    livePreviewTimer = setTimeout(updateLivePreview, 200);
  }

  /* ---- build a "live" section object from the current inspector state ---- */
  function buildLiveSection() {
    const s = state.sections.find(x => x.section_id === state.activeSectionId);
    if (!s) return null;
    const box = root.querySelector("#pb-inspector");
    if (!box) return s;

    const originalContent = parse(s.content_json);
    const content = Object.assign({}, originalContent);
    function putContent(key, id, keepWhitespace) {
      const input = root.querySelector("#" + id);
      /* Body text keeps the author's paragraph and line breaks exactly as typed. */
      if (input) content[key] = keepWhitespace ? String(input.value).replace(/\r\n?/g, "\n") : input.value.trim();
    }
    if (s.type === "footer") {
      var groups = [];
      box.querySelectorAll(".pb-footer-group").forEach(function (gel) {
        var gi = parseInt(gel.dataset.gi, 10);
        groups.push({
          title: val("ft-gtitle-" + gi) || "",
          links: (val("ft-links-" + gi) || "").split("\n").filter(Boolean).map(function (line) {
            var parts = line.split("|").map(function (p) { return p.trim(); });
            return { label: parts[0] || "", url: parts[1] || "" };
          })
        });
      });
      content.groups = groups;
    } else {
      putContent("eyebrow", "in-eyebrow");
      putContent("title", "in-title");
      putContent("body", "in-body", true);
      putContent("cta_label", "in-cta-label");
      putContent("cta_url", "in-cta-url");
      putContent("image_url", "in-image");
      putContent("alt", "in-alt");
      putContent("cta2_label", "in-cta2-label");
      putContent("cta2_url", "in-cta2-url");
      if (box.querySelector("#in-html")) content.html = box.querySelector("#in-html").value || "";
      if (box.querySelector("#in-items-list")) {
        const originalItems = Array.isArray(originalContent.items) ? originalContent.items : [];
        content.items = Array.prototype.map.call(box.querySelectorAll(".pb-grid-item"), function (el) {
          var i = el.dataset.ii;
          var item = Object.assign({}, originalItems[Number(i)] || {});
          /* card text keeps the author's paragraph and line breaks */
          const textInput = root.querySelector("#it-text-" + i);
          if (textInput) item.text = String(textInput.value).replace(/\r\n?/g, "\n");
          [
            ["eyebrow", "it-eyebrow-" + i],
            ["title", "it-title-" + i],
            ["align", "it-align-" + i],
            ["layout", "it-layout-" + i],
            ["image_position", "it-image-position-" + i],
            ["url", "it-url-" + i],
            ["cta_label", "it-ctalabel-" + i],
            ["image_url", "it-image-" + i],
            ["alt", "it-alt-" + i],
            /* per-card background photo */
            ["bg_url", "it-bgurl-" + i],
            ["bg_fit", "it-bgfit-" + i],
            ["bg_position", "it-bgpos-" + i],
            ["bg_blur", "it-bgblur-" + i],
            ["bg_opacity", "it-bgop-" + i],
            ["bg_grayscale", "it-bggray-" + i],
            ["bg_overlay", "it-bgov-" + i],
            ["bg_overlay_color", "it-bgovc-" + i],
            /* per-card shape / size / edges / spacing (customizable grid) */
            ["shape", "it-shape-" + i],
            ["col_span", "it-colspan-" + i],
            ["row_span", "it-rowspan-" + i],
            ["width", "it-width-" + i],
            ["min_height", "it-minh-" + i],
            ["aspect", "it-aspect-" + i],
            ["scale", "it-scale-" + i],
            ["border_width", "it-bw-" + i],
            ["border_style", "it-bs-" + i],
            ["border_color", "it-bc-" + i],
            ["radius", "it-radius-" + i],
            ["gap_x", "it-gapx-" + i],
            ["gap_y", "it-gapy-" + i],
            ["self_align", "it-selfalign-" + i],
            ["self_justify", "it-selfjustify-" + i],
            ["order", "it-order-" + i],
            ["padding", "it-padding-" + i],
            ["background", "it-cardbg-" + i],
            ["text_color", "it-textcolor-" + i]
          ].forEach(function (pair) {
            const input = root.querySelector("#" + pair[1]);
            if (input) item[pair[0]] = input.value.trim();
          });
          /* colour inputs always report a value — only keep them when the
           * author actually opened the customizable controls for this card */
          if (!root.querySelector("#it-shape-" + i)) {
            ["shape","col_span","row_span","width","min_height","aspect","scale","border_width",
             "border_style","border_color","radius","gap_x","gap_y","self_align","self_justify",
             "order","padding","background","text_color","stretch"].forEach(function (k) { delete item[k]; });
          } else {
            item.stretch = checked("it-stretch-" + i);
          }
          if (root.querySelector("#it-bgoff-" + i)) item.bg_off = checked("it-bgoff-" + i);
          /* drop empty values so the card falls back to the grid defaults */
          Object.keys(item).forEach(function (k) { if (item[k] === "") delete item[k]; });
          return item;
        }).filter(function (it) { return Object.keys(it).length; });
      }
    }

    const style = Object.assign({}, parse(s.style_json));
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
    maybe(style, "cardLayout", val("st-card-layout"));
    maybe(style, "cardAlign", val("st-card-align"));
    style.equalCardHeight = checked("st-card-height");
    maybe(style, "buttonVariant", val("st-btn"));
    if (checked("st-reverse")) style.reverse = true;
    if ((val("in-type") || s.type) === "html") style.allowHtml = true;

    maybe(style, "rowGap", val("st-rowgap"));
    maybe(style, "autoRows", val("st-autorows"));
    if (root.querySelector("#st-dense")) style.denseFill = checked("st-dense");

    /* grid-wide card background photo */
    if (root.querySelector("#st-cardbg-url")) {
      const cardBgUrl = val("st-cardbg-url");
      if (cardBgUrl) {
        const cbg = { url: cardBgUrl, applyAll: checked("st-cardbg-all") };
        maybe(cbg, "fit", val("st-cardbg-fit"));
        maybe(cbg, "position", val("st-cardbg-pos"));
        maybe(cbg, "blur", val("st-cardbg-blur"));
        maybe(cbg, "opacity", val("st-cardbg-opacity"));
        maybe(cbg, "grayscale", val("st-cardbg-gray"));
        maybe(cbg, "overlay", val("st-cardbg-overlay"));
        maybe(cbg, "overlayColor", val("st-cardbg-overlay-color"));
        style.cardBg = cbg;
      } else if (style.cardBg) delete style.cardBg;
    }

    maybe(style, "cardBorderWidth", val("st-card-bw"));
    maybe(style, "cardBorderStyle", val("st-card-bs"));
    maybe(style, "cardBorderColor", val("st-card-bc"));
    maybe(style, "cardRadius", val("st-card-radius"));

    const newType = val("in-type") || s.type;
    if (newType !== "footer" && newType !== "html" && newType !== "spacer") {
      const elements = collectElementStyles(newType);
      if (Object.keys(elements).length) style.elements = elements;
      /* photos / icons in the four placement slots + inline title icons */
      if (root.querySelector('[id^="dc-"]')) {
        const decorations = collectDecorations(newType);
        if (Object.keys(decorations).length) style.decorations = decorations;
        else delete style.decorations;
        const inlineIcons = collectInlineIcons(newType);
        if (Object.keys(inlineIcons).length) style.inlineIcons = inlineIcons;
        else delete style.inlineIcons;
      }
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
      maybe(image, "blur", val("im-blur"));
      maybe(image, "opacity", val("im-opacity"));
      maybe(image, "grayscale", val("im-grayscale"));
      if (checked("im-shadow")) image.shadow = true;
      if (checked("im-transparent")) image.transparent = true;
      /* advanced crop / slideshow settings (optional, additive) */
      if (state.advImage && state.advImage.slides && state.advImage.slides.length) {
        image.adv = state.advImage;
      }
      if (Object.keys(image).length) style.image = image;
      else if (style.image) delete style.image;      /* everything cleared → drop it */
      if (style.image && !state.advImage && style.image.adv) delete style.image.adv;
    }

    return {
      section_id: s.section_id,
      type: val("in-type") || s.type,
      visible: s.visible,
      content_json: content,
      style_json: style
    };
  }

  /* ---- render all sections in the live preview panel ---- */
  function updateLivePreview() {
    const frame = root.querySelector("#pb-live-frame");
    if (!frame) return;
    const livePanel = root.querySelector("#pb-live-preview");
    if (livePanel && livePanel.hidden) return;

    const sections = state.sections.filter(s => String(s.visible).toLowerCase() !== "false");
    if (!sections.length) { frame.innerHTML = '<div class="pb-live-empty">No sections to preview. Add a section to get started.</div>'; return; }

    /* Replace the active section with the live (unsaved) version */
    const liveSections = sections.map(function (s) {
      if (s.section_id === state.activeSectionId) return buildLiveSection() || s;
      return s;
    });

    const renderer = (typeof EDC_PUBLIC_PAGE !== "undefined" && EDC_PUBLIC_PAGE.renderSection) ? EDC_PUBLIC_PAGE.renderSection : null;
    if (!renderer) { frame.innerHTML = '<div class="pb-live-empty">Preview loading\u2026</div>'; return; }

    const html = liveSections.map(function (s) {
      try { return renderer(s); } catch (e) { return '<div class="pb-live-error">Error rendering section</div>'; }
    }).join("");

    frame.innerHTML = html;
    /* Start any slideshows inside the preview so timing/transitions are visible. */
    if (typeof EDC_SLIDESHOW !== "undefined") EDC_SLIDESHOW.init(frame);
  }

  function val(id) { const el = root.querySelector("#" + id); return el ? el.value.trim() : ""; }
  function checked(id) { const el = root.querySelector("#" + id); return !!(el && el.checked); }
  function maybe(obj, key, v) { if (v !== "" && v !== undefined && v !== null) obj[key] = v; }

  /* ---- collect the Icons & Photos tab into style_json ---- */
  function collectDecorations(type) {
    const slots = DECO_SLOTS.concat(isGridType(type) ? CARD_DECO_SLOTS : []);
    const out = {};
    slots.forEach(function (slot) {
      const id = slot.id;
      const mode = val("dc-" + id + "-mode");
      if (mode !== "image" && mode !== "icon") return;
      const d = { mode: mode };
      if (mode === "image") {
        const url = val("dc-" + id + "-url");
        if (!url) return;
        d.url = url;
        maybe(d, "alt", val("dc-" + id + "-alt"));
        maybe(d, "width", val("dc-" + id + "-width"));
        maybe(d, "height", val("dc-" + id + "-height"));
        const shape = val("dc-" + id + "-shape");
        if (shape && shape !== "default") d.shape = shape;
        maybe(d, "radius", val("dc-" + id + "-radius"));
        maybe(d, "fit", val("dc-" + id + "-fit"));
        if (checked("dc-" + id + "-transparent")) d.transparent = true;
        if (checked("dc-" + id + "-shadow")) d.shadow = true;
      } else {
        const glyph = val("dc-" + id + "-icon");
        if (!glyph) return;
        d.icon = glyph;
        maybe(d, "size", val("dc-" + id + "-size"));
        maybe(d, "color", val("dc-" + id + "-color"));
      }
      maybe(d, "align", val("dc-" + id + "-align"));
      maybe(d, "opacity", val("dc-" + id + "-opacity"));
      maybe(d, "blur", val("dc-" + id + "-blur"));
      maybe(d, "grayscale", val("dc-" + id + "-grayscale"));
      maybe(d, "rotate", val("dc-" + id + "-rotate"));
      maybe(d, "marginTop", val("dc-" + id + "-mt"));
      maybe(d, "marginBottom", val("dc-" + id + "-mb"));
      out[id] = d;
    });
    return out;
  }

  function collectInlineIcons(type) {
    const out = {};
    INLINE_ICON_KEYS.forEach(function (key) {
      const id = key.id;
      if (id === "cardTitle" && !isGridType(type)) return;
      const mode = val("ic-" + id + "-mode");
      if (mode !== "icon" && mode !== "image") return;
      const d = { mode: mode };
      if (mode === "icon") {
        const glyph = val("ic-" + id + "-icon");
        if (!glyph) return;
        d.icon = glyph;
        maybe(d, "color", val("ic-" + id + "-color"));
      } else {
        const url = val("ic-" + id + "-url");
        if (!url) return;
        d.url = url;
      }
      maybe(d, "size", val("ic-" + id + "-size"));
      maybe(d, "gap", val("ic-" + id + "-gap"));
      maybe(d, "opacity", val("ic-" + id + "-opacity"));
      maybe(d, "blur", val("ic-" + id + "-blur"));
      maybe(d, "rotate", val("ic-" + id + "-rotate"));
      out[id] = d;
    });
    return out;
  }

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
      if (bg && bg !== "transparent" && bg !== "#ffffff" && bg !== "#000000") e.backgroundColor = bg;
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
      const pv = val("es-pv-" + ek);
      if (pv) { e.paddingTop = pv; e.paddingBottom = pv; }
      const ph = val("es-ph-" + ek);
      if (ph) { e.paddingLeft = ph; e.paddingRight = ph; }
      const br = val("es-radius-" + ek);
      if (br) e.borderRadius = br;
      if (Object.keys(e).length) result[ek] = e;
    });
    return result;
  }

  async function saveSection(s) {
    const live = buildLiveSection();
    if (!live) return;
    const content = live.content_json;
    const style = live.style_json;
    if (parse(s.style_json).imported) style.imported = true;

    const r = await api().updateSection({
      page_id: state.activePageId, section_id: s.section_id,
      type: live.type, content_json: content, style_json: style
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
