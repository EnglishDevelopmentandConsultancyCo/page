/**
 * HOMEPAGE-MANAGER.JS
 * ---------------------------------------------------------------
 * Manages the homepage section ordering, visibility, text editing,
 * hero photo/slideshow, and footer CTA styling — all configurable
 * from Site Settings without touching code.
 *
 * Sections are stored in siteSettings.homepage_sections as an array:
 *   [{ id, label, visible, order }]
 *
 * Hero text/slideshow stored in siteSettings.hero:
 *   { eyebrow, title, subtitle, cta_primary_label, cta_primary_url,
 *     cta_secondary_label, cta_secondary_url,
 *     photos: [{ url, alt }], slideshow_enabled, slideshow_interval,
 *     crop_fit, crop_position }
 *
 * Footer CTA stored in siteSettings.footer_cta:
 *   { text, button_label, button_url, background, color, font, font_size }
 *
 * Public render: EDC_HOMEPAGE.render() reads settings and renders
 *   sections in the configured order, skipping hidden ones.
 * Admin render: EDC_HOMEPAGE.renderAdmin(container) shows the UI.
 * ---------------------------------------------------------------
 */
const EDC_HOMEPAGE = (() => {
  const esc = (v) => EDC_UI.escapeHtml(v == null ? "" : String(v));

  const DEFAULT_SECTIONS = [
    { id: "hero", label: "Hero Banner", visible: true },
    { id: "pagebuilder", label: "Page Builder Content", visible: true },
    { id: "services", label: "Why Schools & Teachers Choose EDC", visible: true },
    { id: "teachers", label: "Teaching Opportunities", visible: true },
    { id: "cta", label: "Ready to Teach in Thailand?", visible: true },
    { id: "testimonials", label: "Testimonials", visible: true },
  ];

  const DEFAULT_HERO = {
    eyebrow: "English Development Consultants",
    title: "Placing exceptional English teachers across Thailand.",
    subtitle: "EDC partners with schools throughout Thailand to recruit, screen, and place qualified English teachers — and helps educators build lasting careers here.",
    cta_primary_label: "View Open Positions",
    cta_primary_url: "careers.html",
    cta_secondary_label: "About EDC",
    cta_secondary_url: "about.html",
    photos: [{ url: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=900&q=80", alt: "Teacher leading a classroom in Thailand" }],
    slideshow_enabled: false,
    slideshow_interval: 5,
    crop_fit: "cover",
    crop_position: "center",
  };

  const DEFAULT_FOOTER_CTA = {
    text: "EDC partners with schools across Thailand to recruit, screen, and place qualified English teachers.",
    button_label: "Start Your Application",
    button_url: "apply.html",
    background: "#0f172a",
    color: "#ffffff",
    font: "inherit",
    font_size: "16",
  };

  const FONTS = [
    { value: "inherit", label: "Default (site font)" },
    { value: "'Inter', sans-serif", label: "Inter" },
    { value: "Georgia, serif", label: "Georgia" },
    { value: "'Courier New', monospace", label: "Courier New" },
    { value: "Arial, sans-serif", label: "Arial" },
    { value: "'Times New Roman', serif", label: "Times New Roman" },
  ];

  function getSections(settings) {
    const stored = settings && Array.isArray(settings.homepage_sections) ? settings.homepage_sections : [];
    const merged = DEFAULT_SECTIONS.map(d => {
      const found = stored.find(s => s.id === d.id);
      return found ? { ...d, visible: found.visible !== false, label: found.label || d.label } : { ...d };
    });
    stored.forEach(s => {
      if (!DEFAULT_SECTIONS.find(d => d.id === s.id)) {
        merged.push({ id: s.id, label: s.label || s.id, visible: s.visible !== false });
      }
    });
    merged.sort((a, b) => {
      const ai = stored.findIndex(x => x.id === a.id);
      const bi = stored.findIndex(x => x.id === b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return merged;
  }

  function getHero(settings) {
    return { ...DEFAULT_HERO, ...((settings && settings.hero) || {}) };
  }

  function getFooterCta(settings) {
    return { ...DEFAULT_FOOTER_CTA, ...((settings && settings.footer_cta) || {}) };
  }

  /* ===================== PUBLIC RENDER ===================== */

  async function render() {
  const result = await EDC_API.getSiteSettings();
  const settings = result.data || {};
  const target = document.querySelector("[data-edc-region]") || document.getElementById("edc-live-content") || document.querySelector("main");
  if (!target) return;

  // If the Page Builder owns the homepage (published "index" sections), render those and skip the composite.
  let pbSections = [];
  try {
    const pbResult = await EDC_API.getPublicPage("index");
    if (pbResult && pbResult.success) {
      pbSections = (pbResult.data.sections || []).filter(function (s) { return String(s.visible).toLowerCase() !== "false"; });
    }
  } catch (e) {}

  if (pbSections.length) {
    const renderSection = (typeof EDC_PUBLIC_PAGE !== "undefined" && EDC_PUBLIC_PAGE.renderSection)
      ? EDC_PUBLIC_PAGE.renderSection
      : (typeof EDC_PAGEBUILDER !== "undefined" && EDC_PAGEBUILDER.renderSection ? EDC_PAGEBUILDER.renderSection : null);
    target.innerHTML = pbSections.map(function (s) { return renderSection ? renderSection(s) : ""; }).join("\n");
    target.setAttribute("data-edc-region", "");
    return;
  }

  // No Page Builder content yet — render the Homepage Layout composite as before.
  const sections = getSections(settings);
  const hero = getHero(settings);
  const htmlParts = [];
  for (const section of sections) {
    if (!section.visible) continue;
    switch (section.id) {
      case "hero": htmlParts.push(renderHero(hero)); break;
      case "pagebuilder": htmlParts.push('<div id="pagebuilder-slot"></div>'); break;
      case "services": htmlParts.push(await renderServices()); break;
      case "teachers": htmlParts.push(await renderTeachers()); break;
      case "cta": htmlParts.push(await renderCTA(settings)); break;
      case "testimonials": htmlParts.push(await renderTestimonials()); break;
    }
  }

  target.innerHTML = htmlParts.join("\n");
  target.setAttribute("data-edc-region", "");

  if (hero.slideshow_enabled && hero.photos.length > 1) {
    initSlideshow(hero);
  }
}

  function renderHero(hero) {
    const photos = Array.isArray(hero.photos) && hero.photos.length ? hero.photos : [{ url: "", alt: "" }];
    const primaryPhoto = photos[0];
    const slideshowAttr = hero.slideshow_enabled && photos.length > 1
      ? 'data-slideshow="1" data-interval="' + esc(hero.slideshow_interval || 5) + '"'
      : "";
    const slidesData = hero.slideshow_enabled && photos.length > 1
      ? 'data-slides=\'' + JSON.stringify(photos.map(p => ({ url: p.url, alt: p.alt }))) + '\''
      : "";

    return '<section class="hero">' +
      '<div class="container hero-grid">' +
        '<div>' +
          (hero.eyebrow ? '<span class="eyebrow">' + esc(hero.eyebrow) + '</span>' : '') +
          (hero.title ? '<h1>' + esc(hero.title) + '</h1>' : '') +
          (hero.subtitle ? '<p class="lead">' + esc(hero.subtitle) + '</p>' : '') +
          '<div class="hero-actions">' +
            (hero.cta_primary_label ? '<a href="' + esc(hero.cta_primary_url || "#") + '" class="btn btn-gold">' + esc(hero.cta_primary_label) + '</a>' : '') +
            (hero.cta_secondary_label ? '<a href="' + esc(hero.cta_secondary_url || "#") + '" class="btn btn-outline" style="color:#fff;border-color:rgba(255,255,255,.5)">' + esc(hero.cta_secondary_label) + '</a>' : '') +
          '</div>' +
        '</div>' +
        '<div class="hero-figure">' +
          '<div class="hero-photo">' +
            (primaryPhoto.url ? '<img id="heroSlideshowImg" src="' + esc(primaryPhoto.url) + '" alt="' + esc(primaryPhoto.alt) + '" style="object-fit:' + esc(hero.crop_fit || "cover") + ';object-position:' + esc(hero.crop_position || "center") + '" ' + slideshowAttr + ' ' + slidesData + '>' : '') +
          '</div>' +
          '<div class="stamp stamp-gold" style="position:absolute;bottom:-16px;left:-16px;background:#fff;box-shadow:var(--shadow-md)">EST. Thailand</div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  function initSlideshow(hero) {
    const img = document.getElementById("heroSlideshowImg");
    if (!img) return;
    const slides = hero.photos;
    if (!slides || slides.length < 2) return;
    let idx = 0;
    const interval = Math.max(2, parseInt(hero.slideshow_interval, 10) || 5) * 1000;
    setInterval(() => {
      idx = (idx + 1) % slides.length;
      img.style.opacity = "0";
      setTimeout(() => {
        img.src = slides[idx].url;
        img.alt = slides[idx].alt || "";
        img.style.opacity = "1";
      }, 400);
    }, interval);
    img.style.transition = "opacity 0.4s ease";
  }

  async function renderServices() {
    const services = (await EDC_API.getServices()).data || [];
    const cards = services.map(s =>
      '<div class="card"><div class="card-body">' +
        '<div style="font-size:1.8rem;margin-bottom:.75rem;">' + esc(s.icon || "•") + '</div>' +
        '<h3>' + esc(s.title) + '</h3>' +
        '<p class="muted" style="font-size:.9rem;">' + esc(s.short) + '</p>' +
      '</div></div>'
    ).join("");
    return '<section class="section"><div class="container">' +
      '<div class="section-head center"><span class="eyebrow">Why Schools &amp; Teachers Choose EDC</span>' +
      '<h2>A recruitment partner that handles the details.</h2></div>' +
      '<div class="grid grid-4">' + cards + '</div></div></section>';
  }

  async function renderTeachers() {
    const teachers = (await EDC_API.getTeachers({ featuredOnly: true })).data || [];
    const cards = teachers.map(t =>
      '<a href="teacher.html?id=' + esc(t.id) + '" class="card teacher-card">' +
        '<div class="card-media"><img src="' + esc(t.photo) + '" alt="' + esc(t.name) + '"></div>' +
        '<div class="card-body"><h3>' + esc(t.name) + '</h3>' +
        '<div class="role">' + esc(t.position) + '</div>' +
        '<div class="subjects">' + (t.subjects || []).slice(0, 2).map(s => '<span class="pill">' + esc(s) + '</span>').join("") + '</div>' +
        '</div></a>'
    ).join("");
    return '<section class="section section-alt"><div class="container">' +
      '<div class="flex-between" style="margin-bottom:var(--sp-7);flex-wrap:wrap;gap:1rem;">' +
        '<div class="section-head" style="margin-bottom:0;"><span class="eyebrow">Teaching Opportunities</span>' +
        '<h2>Featured teachers on our roster.</h2></div>' +
        '<a href="teachers.html" class="btn btn-outline">View All Teachers</a>' +
      '</div>' +
      '<div class="grid grid-4">' + cards + '</div></div></section>';
  }

  async function renderCTA(settings) {
    const fc = getFooterCta(settings);
    return '<section class="section"><div class="container">' +
      '<div class="cta-band" style="background:' + esc(fc.background) + ';color:' + esc(fc.color) + ';font-family:' + esc(fc.font) + ';font-size:' + esc(fc.font_size) + 'px;">' +
        '<div><h2 style="color:' + esc(fc.color) + '">Ready to teach in Thailand?</h2>' +
        '<p>' + esc(fc.text) + '</p></div>' +
        '<a href="' + esc(fc.button_url) + '" class="btn btn-gold">' + esc(fc.button_label) + '</a>' +
      '</div></div></section>';
  }

  async function renderTestimonials() {
    const testimonials = (await EDC_API.getTestimonials()).data || [];
    const cards = testimonials.map(t =>
      '<blockquote class="testimonial"><p>"' + esc(t.quote) + '"</p>' +
      '<footer><strong>' + esc(t.name) + '</strong><br>' + esc(t.role) + '</footer></blockquote>'
    ).join("");
    return '<section class="section section-alt"><div class="container">' +
      '<div class="section-head center"><span class="eyebrow">Testimonials</span>' +
      '<h2>What teachers and partner schools say.</h2></div>' +
      '<div class="grid grid-3">' + cards + '</div></div></section>';
  }

  /* ===================== ADMIN RENDER ===================== */

  async function renderAdmin(container) {
    const result = await EDC_API.getSiteSettings();
    const settings = result.data || {};
    const sections = getSections(settings);
    const hero = getHero(settings);
    const fc = getFooterCta(settings);

    container.innerHTML =
      '<div class="hp-admin">' +

        '<div class="hp-admin-card">' +
          '<h3>Homepage Section Order</h3>' +
          '<p class="hp-hint">Drag to reorder, toggle the switch to show/hide each section. Click "Edit text" to change headings and labels.</p>' +
          '<div class="hp-sections-list" id="hp-sections-list"></div>' +
          '<button class="btn btn-primary mt-4" id="hp-save-sections">Save Section Order</button>' +
        '</div>' +

        '<div class="hp-admin-card">' +
          '<h3>Hero Banner</h3>' +
          '<p class="hp-hint">Edit the main heading, subtitle, buttons, and hero photo(s). Enable slideshow to rotate multiple photos.</p>' +
          '<div class="field"><label>Eyebrow / kicker text</label><input class="input" id="hp-hero-eyebrow" value="' + esc(hero.eyebrow) + '"></div>' +
          '<div class="field"><label>Main heading</label><input class="input" id="hp-hero-title" value="' + esc(hero.title) + '"></div>' +
          '<div class="field"><label>Subtitle / description</label><textarea class="input" rows="3" id="hp-hero-subtitle">' + esc(hero.subtitle) + '</textarea></div>' +
          '<div class="field-row">' +
            '<div class="field"><label>Primary button label</label><input class="input" id="hp-hero-cta1-label" value="' + esc(hero.cta_primary_label) + '"></div>' +
            '<div class="field"><label>Primary button link</label><input class="input" id="hp-hero-cta1-url" value="' + esc(hero.cta_primary_url) + '"></div>' +
          '</div>' +
          '<div class="field-row">' +
            '<div class="field"><label>Secondary button label</label><input class="input" id="hp-hero-cta2-label" value="' + esc(hero.cta_secondary_label) + '"></div>' +
            '<div class="field"><label>Secondary button link</label><input class="input" id="hp-hero-cta2-url" value="' + esc(hero.cta_secondary_url) + '"></div>' +
          '</div>' +

          '<h4 class="mt-6 mb-2">Hero Photo(s)</h4>' +
          '<div id="hp-photos-list"></div>' +
          '<button class="btn btn-outline btn-sm mt-2" id="hp-add-photo">+ Add Photo</button>' +

          '<div class="field-row mt-4">' +
            '<div class="field"><label>Crop behaviour</label><select class="input" id="hp-crop-fit">' +
              ["cover", "contain", "fill", "none", "scale-down"].map(o => '<option value="' + o + '"' + (hero.crop_fit === o ? " selected" : "") + '>' + o + '</option>').join("") +
            '</select></div>' +
            '<div class="field"><label>Focal point</label><select class="input" id="hp-crop-pos">' +
              ["center", "top", "bottom", "left", "right", "top left", "top right", "bottom left", "bottom right"].map(o => '<option value="' + o + '"' + (hero.crop_position === o ? " selected" : "") + '>' + o + '</option>').join("") +
            '</select></div>' +
          '</div>' +

          '<div class="field-row mt-4">' +
            '<div class="field"><label>Slideshow</label><label class="hp-switch"><input type="checkbox" id="hp-slideshow" ' + (hero.slideshow_enabled ? "checked" : "") + '><span class="hp-slider"></span></label>' +
            '<span class="hp-hint">Enable to rotate through all photos automatically</span></div>' +
            '<div class="field"><label>Change interval (seconds)</label><input class="input" type="number" min="2" id="hp-slideshow-interval" value="' + esc(hero.slideshow_interval) + '"></div>' +
          '</div>' +

          '<button class="btn btn-primary mt-4" id="hp-save-hero">Save Hero Settings</button>' +
        '</div>' +

        '<div class="hp-admin-card">' +
          '<h3>"Ready to Teach" CTA Section</h3>' +
          '<p class="hp-hint">Edit the text and styling of the call-to-action band near the footer. You can change the background colour, text colour, and font.</p>' +
          '<div class="field"><label>Body text</label><textarea class="input" rows="3" id="hp-fc-text">' + esc(fc.text) + '</textarea></div>' +
          '<div class="field-row">' +
            '<div class="field"><label>Button label</label><input class="input" id="hp-fc-btn-label" value="' + esc(fc.button_label) + '"></div>' +
            '<div class="field"><label>Button link</label><input class="input" id="hp-fc-btn-url" value="' + esc(fc.button_url) + '"></div>' +
          '</div>' +
          '<div class="field-row">' +
            '<div class="field"><label>Background colour</label><input class="input" type="color" id="hp-fc-bg" value="' + esc(fc.background) + '"></div>' +
            '<div class="field"><label>Text colour</label><input class="input" type="color" id="hp-fc-color" value="' + esc(fc.color) + '"></div>' +
          '</div>' +
          '<div class="field-row">' +
            '<div class="field"><label>Font family</label><select class="input" id="hp-fc-font">' +
              FONTS.map(f => '<option value="' + esc(f.value) + '"' + (fc.font === f.value ? " selected" : "") + '>' + esc(f.label) + '</option>').join("") +
            '</select></div>' +
            '<div class="field"><label>Font size (px)</label><input class="input" type="number" min="10" max="32" id="hp-fc-fontsize" value="' + esc(fc.font_size) + '"></div>' +
          '</div>' +
          '<div class="hp-preview" id="hp-fc-preview"></div>' +
          '<button class="btn btn-primary mt-4" id="hp-save-fc">Save CTA Settings</button>' +
        '</div>' +

      '</div>';

    renderSectionList(sections);
    renderPhotosList(hero.photos || []);
    updateFcPreview();
    bindAdminEvents(hero, fc, settings);
  }

  function renderSectionList(sections) {
    const list = document.getElementById("hp-sections-list");
    if (!list) return;
    list.innerHTML = sections.map((s, i) =>
      '<div class="hp-section-row" draggable="true" data-id="' + esc(s.id) + '" data-index="' + i + '">' +
        '<span class="hp-grip">⠿</span>' +
        '<span class="hp-section-order">' + (i + 1) + '</span>' +
        '<span class="hp-section-label">' + esc(s.label) + '</span>' +
        '<label class="hp-switch"><input type="checkbox" class="hp-visible-toggle" data-id="' + esc(s.id) + '"' + (s.visible ? " checked" : "") + '><span class="hp-slider"></span></label>' +
      '</div>'
    ).join("");
    bindDrag(list);
  }

  function renderPhotosList(photos) {
    const list = document.getElementById("hp-photos-list");
    if (!list) return;
    list.innerHTML = (photos || []).map((p, i) =>
      '<div class="hp-photo-row" data-index="' + i + '">' +
        '<div class="hp-photo-preview">' + (p.url ? '<img src="' + esc(p.url) + '" alt="' + esc(p.alt) + '">' : '<span class="hp-hint">No image</span>') + '</div>' +
        '<div class="hp-photo-fields">' +
          '<input class="input hp-photo-url" data-edc-image-field data-index="' + i + '" placeholder="Image URL" value="' + esc(p.url) + '">' +
          '<input class="input hp-photo-alt" data-index="' + i + '" placeholder="Alt text" value="' + esc(p.alt) + '">' +
        '</div>' +
        '<button class="btn btn-outline btn-sm hp-photo-up" data-index="' + i + '">↑</button>' +
        '<button class="btn btn-outline btn-sm hp-photo-down" data-index="' + i + '">↓</button>' +
        '<button class="btn btn-danger btn-sm hp-photo-del" data-index="' + i + '">Delete</button>' +
      '</div>'
    ).join("");
    bindPhotoEvents();
  }

  function bindDrag(list) {
    let dragRow = null;
    list.querySelectorAll(".hp-section-row").forEach(row => {
      row.addEventListener("dragstart", () => { dragRow = row; row.classList.add("is-dragging"); });
      row.addEventListener("dragend", () => { row.classList.remove("is-dragging"); renumberRows(list); });
      row.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (!dragRow || dragRow === row) return;
        const rect = row.getBoundingClientRect();
        const after = (e.clientY - rect.top) > rect.height / 2;
        list.insertBefore(dragRow, after ? row.nextSibling : row);
      });
    });
  }

  function renumberRows(list) {
    list.querySelectorAll(".hp-section-row").forEach((row, i) => {
      row.dataset.index = i;
      row.querySelector(".hp-section-order").textContent = i + 1;
    });
  }

  function bindPhotoEvents() {
    document.querySelectorAll(".hp-photo-del").forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index, 10);
        const hero = getCurrentHero();
        hero.photos.splice(idx, 1);
        renderPhotosList(hero.photos);
      };
    });
    document.querySelectorAll(".hp-photo-up").forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index, 10);
        if (idx === 0) return;
        const hero = getCurrentHero();
        [hero.photos[idx - 1], hero.photos[idx]] = [hero.photos[idx], hero.photos[idx - 1]];
        renderPhotosList(hero.photos);
      };
    });
    document.querySelectorAll(".hp-photo-down").forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.index, 10);
        const hero = getCurrentHero();
        if (idx >= hero.photos.length - 1) return;
        [hero.photos[idx + 1], hero.photos[idx]] = [hero.photos[idx], hero.photos[idx + 1]];
        renderPhotosList(hero.photos);
      };
    });
    document.querySelectorAll(".hp-photo-url").forEach(inp => {
      inp.oninput = () => { const hero = getCurrentHero(); hero.photos[parseInt(inp.dataset.index, 10)].url = inp.value; renderPhotosList(hero.photos); };
    });
    document.querySelectorAll(".hp-photo-alt").forEach(inp => {
      inp.oninput = () => { const hero = getCurrentHero(); hero.photos[parseInt(inp.dataset.index, 10)].alt = inp.value; };
    });
  }

  function getCurrentHero() {
    return {
      eyebrow: val("hp-hero-eyebrow"),
      title: val("hp-hero-title"),
      subtitle: val("hp-hero-subtitle"),
      cta_primary_label: val("hp-hero-cta1-label"),
      cta_primary_url: val("hp-hero-cta1-url"),
      cta_secondary_label: val("hp-hero-cta2-label"),
      cta_secondary_url: val("hp-hero-cta2-url"),
      photos: collectPhotos(),
      slideshow_enabled: checked("hp-slideshow"),
      slideshow_interval: parseInt(val("hp-slideshow-interval") || "5", 10),
      crop_fit: val("hp-crop-fit"),
      crop_position: val("hp-crop-pos"),
    };
  }

  function collectPhotos() {
    const photos = [];
    document.querySelectorAll(".hp-photo-row").forEach((row) => {
      const url = row.querySelector(".hp-photo-url").value.trim();
      const alt = row.querySelector(".hp-photo-alt").value.trim();
      if (url) photos.push({ url, alt });
    });
    return photos;
  }

  function getCurrentFooterCta() {
    return {
      text: val("hp-fc-text"),
      button_label: val("hp-fc-btn-label"),
      button_url: val("hp-fc-btn-url"),
      background: val("hp-fc-bg"),
      color: val("hp-fc-color"),
      font: val("hp-fc-font"),
      font_size: val("hp-fc-fontsize"),
    };
  }

  function updateFcPreview() {
    const preview = document.getElementById("hp-fc-preview");
    if (!preview) return;
    const fc = getCurrentFooterCta();
    preview.innerHTML =
      '<div class="cta-band" style="background:' + esc(fc.background) + ';color:' + esc(fc.color) + ';font-family:' + esc(fc.font) + ';font-size:' + esc(fc.font_size) + 'px;margin-top:1rem;">' +
        '<div><h2 style="color:' + esc(fc.color) + '">Ready to teach in Thailand?</h2>' +
        '<p>' + esc(fc.text || "Preview text will appear here.") + '</p></div>' +
        '<a href="' + esc(fc.button_url || "#") + '" class="btn btn-gold">' + esc(fc.button_label || "Button") + '</a>' +
      '</div>';
  }

  function bindAdminEvents(hero, fc, settings) {
    document.getElementById("hp-add-photo").onclick = () => {
      const h = getCurrentHero();
      h.photos.push({ url: "", alt: "" });
      renderPhotosList(h.photos);
    };

    ["hp-fc-text", "hp-fc-btn-label", "hp-fc-btn-url", "hp-fc-bg", "hp-fc-color", "hp-fc-font", "hp-fc-fontsize"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", updateFcPreview);
    });

    document.getElementById("hp-save-sections").onclick = async () => {
      const rows = document.querySelectorAll(".hp-section-row");
      const orderedSections = [];
      rows.forEach((row, i) => {
        const id = row.dataset.id;
        const label = row.querySelector(".hp-section-label").textContent;
        const visible = row.querySelector(".hp-visible-toggle").checked;
        orderedSections.push({ id, label, visible, order: i });
      });
      const r = await EDC_API.updateSiteSettings({ homepage_sections: orderedSections });
      EDC_UI.toast(r.message || r.error?.message || "Unable to save section order.", r.success ? "success" : "error");
    };

    document.getElementById("hp-save-hero").onclick = async () => {
      const heroData = getCurrentHero();
      const r = await EDC_API.updateSiteSettings({ hero: heroData });
      EDC_UI.toast(r.message || r.error?.message || "Unable to save hero settings.", r.success ? "success" : "error");
    };

    document.getElementById("hp-save-fc").onclick = async () => {
      const fcData = getCurrentFooterCta();
      const r = await EDC_API.updateSiteSettings({ footer_cta: fcData });
      EDC_UI.toast(r.message || r.error?.message || "Unable to save CTA settings.", r.success ? "success" : "error");
    };
  }

  function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ""; }
  function checked(id) { const el = document.getElementById(id); return !!(el && el.checked); }

  return { render, renderAdmin, getSections, getHero, getFooterCta, DEFAULT_SECTIONS, DEFAULT_HERO, DEFAULT_FOOTER_CTA };
})();
