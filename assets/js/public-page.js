/**
 * PUBLIC-PAGE.JS — ENHANCED REPLACEMENT FILE (v3)
 * ---------------------------------------------------------------
 * Renders Page Builder content on the public website.
 *
 * What's new in v3:
 *  - Per-element style rendering: every text element (eyebrow, heading,
 *    body, buttons, card titles, card text, card buttons) gets its own
 *    inline style from style_json.elements{} — font family, size, weight,
 *    color, background, alignment, bold/italic/underline, line height,
 *    letter spacing, margins, padding, text transform, border radius.
 *  - Image shapes: circle, rounded, square, or custom radius.
 *  - Full backward compatibility: sections without element styles render
 *    exactly as before.
 * ---------------------------------------------------------------
 */
const EDC_PUBLIC_PAGE = (() => {
  const DEBUG = /(?:\?|&)edcdebug=1/.test(location.search);
  const notes = [];

  function log(msg) { notes.push(msg); if (DEBUG) console.info("[EDC page builder]", msg); }

  function slug() {
    const override = document.body && document.body.dataset ? document.body.dataset.edcSlug : "";
    if (override) return normalize(override);
    const parts = location.pathname.split("/").filter(Boolean);
    const last = parts.length ? parts[parts.length - 1] : "";
    if (!last || !/\.html?$/i.test(last)) {
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
    if (!u) return "";
    if (/^javascript:/i.test(u)) return "#";
    return u;
  }

  function enumValue(value, allowed, fallback) {
    return allowed.indexOf(String(value || "")) >= 0 ? String(value) : fallback;
  }

  /* ---------------- style engine ---------------- */

  function numOr(v, d) {
    const n = parseFloat(v);
    return isFinite(n) ? n : d;
  }

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

  /* ---- per-element style builder ---- */

  function elementStyle(st, key) {
    const els = (st && st.elements) || {};
    const e = els[key];
    if (!e) return "";
    const s = [];
    if (e.fontFamily && e.fontFamily !== "inherit") s.push("font-family:" + e.fontFamily);
    if (e.fontSize) s.push("font-size:" + cssUnit(e.fontSize));
    if (e.fontWeight && e.fontWeight !== "inherit") s.push("font-weight:" + e.fontWeight);
    if (e.color) s.push("color:" + e.color);
    if (e.backgroundColor && e.backgroundColor !== "transparent") s.push("background:" + e.backgroundColor);
    if (e.textAlign && e.textAlign !== "inherit") s.push("text-align:" + e.textAlign);
    if (e.textTransform && e.textTransform !== "inherit") s.push("text-transform:" + e.textTransform);
    if (e.bold) s.push("font-weight:" + (e.fontWeight && e.fontWeight !== "inherit" ? e.fontWeight : "700"));
    if (e.italic) s.push("font-style:italic");
    if (e.underline) s.push("text-decoration:underline");
    if (e.lineHeight) s.push("line-height:" + e.lineHeight);
    if (e.letterSpacing) s.push("letter-spacing:" + cssUnit(e.letterSpacing));
    if (e.marginTop) s.push("margin-top:" + cssUnit(e.marginTop));
    if (e.marginBottom) s.push("margin-bottom:" + cssUnit(e.marginBottom));
    if (e.paddingTop) s.push("padding-top:" + cssUnit(e.paddingTop));
    if (e.paddingBottom) s.push("padding-bottom:" + cssUnit(e.paddingBottom));
    if (e.paddingLeft) s.push("padding-left:" + cssUnit(e.paddingLeft));
    if (e.paddingRight) s.push("padding-right:" + cssUnit(e.paddingRight));
    if (e.borderRadius) s.push("border-radius:" + cssUnit(e.borderRadius));
    /* display:inline-block is needed for background/padding to work on inline text */
    if (e.backgroundColor && e.backgroundColor !== "transparent" || e.paddingTop || e.paddingBottom || e.paddingLeft || e.paddingRight) {
      s.push("display:inline-block");
    }
    return s.join(";");
  }

  /* ---- image style with shape support ---- */

  function imageStyle(st) {
    const i = st.image || {};
    const s = ["display:block", "max-width:100%", "height:auto"];
    var shape = i.shape || "default";
    if (shape === "circle") {
      s.push("border-radius:50%");
      s.push("object-fit:cover");
    } else if (shape === "rounded") {
      s.push("border-radius:16px");
    } else if (shape === "square") {
      s.push("border-radius:0");
    } else if (i.radius) {
      s.push("border-radius:" + cssUnit(i.radius));
    }
    if (i.width) s.push("width:" + cssUnit(i.width));
    if (i.maxWidth) s.push("max-width:" + cssUnit(i.maxWidth));
    if (i.height) {
      s.push("height:" + cssUnit(i.height));
      if (shape === "circle" || i.fit === "cover") s.push("object-fit:cover");
    }
    if (i.fit && shape !== "circle") s.push("object-fit:" + i.fit);
    if (i.position) s.push("object-position:" + i.position);
    if (i.shadow) s.push("box-shadow:0 18px 40px rgba(15,23,42,.18)");
    /* photo effects: blur, fade and transparency */
    const ifilter = [];
    if (numOr(i.blur, 0) > 0) ifilter.push("blur(" + numOr(i.blur, 0) + "px)");
    if (numOr(i.grayscale, 0) > 0) ifilter.push("grayscale(" + Math.min(100, numOr(i.grayscale, 0)) + "%)");
    if (ifilter.length) { s.push("filter:" + ifilter.join(" ")); s.push("-webkit-filter:" + ifilter.join(" ")); }
    if (numOr(i.opacity, 1) >= 0 && numOr(i.opacity, 1) < 1) s.push("opacity:" + numOr(i.opacity, 1));
    if (i.transparent) s.push("background:transparent");
    if (i.align === "center") s.push("margin-left:auto;margin-right:auto");
    else if (i.align === "right") s.push("margin-left:auto;margin-right:0");
    else s.push("margin-left:0;margin-right:auto");
    if (i.marginTop) s.push("margin-top:" + cssUnit(i.marginTop));
    if (i.marginBottom) s.push("margin-bottom:" + cssUnit(i.marginBottom));
    return s.join(";");
  }

  function img(src, alt, st) {
    if (!src) return "";
    /* Advanced image settings (crop / zoom / slideshow) take over when present */
    const adv = advImage(st, alt);
    if (adv) return adv;
    return '<img class="edc-live-image" loading="lazy" src="' + esc(src) + '" alt="' + esc(alt || "") + '" style="' + esc(imageStyle(st)) + '">';
  }

  /* ---- advanced image frame + slideshow ----------------------------------
   * Reads style_json.image.adv written by the Page Builder image editor.
   * The frame is fixed; each slide keeps its own pan (posX/posY) and zoom,
   * using exactly the same maths as assets/js/image-editor.js so the
   * published page matches the builder.
   * ---------------------------------------------------------------------- */

  function clampNum(v, lo, hi, d) {
    const n = parseFloat(v);
    if (!isFinite(n)) return d;
    return n < lo ? lo : (n > hi ? hi : n);
  }

  function slideLayerStyle(slide) {
    const zoom = clampNum(slide.zoom, 1, 5, 1);
    const posX = clampNum(slide.posX, 0, 1, 0.5);
    const posY = clampNum(slide.posY, 0, 1, 0.5);
    const size = zoom * 100;
    return "left:" + (-(zoom - 1) * posX * 100).toFixed(4) + "%;" +
      "top:" + (-(zoom - 1) * posY * 100).toFixed(4) + "%;" +
      "width:" + size.toFixed(4) + "%;height:" + size.toFixed(4) + "%;" +
      "background-image:url('" + safeImage(slide.url).replace(/'/g, "%27") + "')";
  }

  function advImage(st, alt) {
    const i = (st && st.image) || {};
    const adv = i.adv;
    if (!adv || adv.enabled === false) return "";
    const slides = (Array.isArray(adv.slides) ? adv.slides : [])
      .filter(function (s) { return s && safeImage(s.url); });
    if (!slides.length) return "";

    const isShow = adv.mode === "slideshow" && slides.length > 1;
    const shown = isShow ? slides : [slides[0]];

    const box = ["position:relative", "overflow:hidden"];
    box.push("width:" + (i.adv.frameWidth ? cssUnit(i.adv.frameWidth) : "100%"));
    box.push("height:" + cssUnit(adv.frameHeight || 360));
    box.push("max-width:100%");
    if (i.maxWidth) box.push("max-width:" + cssUnit(i.maxWidth));
    const shape = i.shape || "default";
    if (shape === "circle") box.push("border-radius:50%");
    else if (shape === "rounded") box.push("border-radius:16px");
    else if (shape === "square") box.push("border-radius:0");
    else if (i.radius) box.push("border-radius:" + cssUnit(i.radius));
    if (i.shadow) box.push("box-shadow:0 18px 40px rgba(15,23,42,.18)");
    const bfilter = [];
    if (numOr(i.blur, 0) > 0) bfilter.push("blur(" + numOr(i.blur, 0) + "px)");
    if (numOr(i.grayscale, 0) > 0) bfilter.push("grayscale(" + Math.min(100, numOr(i.grayscale, 0)) + "%)");
    if (bfilter.length) { box.push("filter:" + bfilter.join(" ")); box.push("-webkit-filter:" + bfilter.join(" ")); }
    if (numOr(i.opacity, 1) >= 0 && numOr(i.opacity, 1) < 1) box.push("opacity:" + numOr(i.opacity, 1));
    if (i.align === "center") box.push("margin-left:auto;margin-right:auto");
    else if (i.align === "right") box.push("margin-left:auto;margin-right:0");
    else box.push("margin-left:0;margin-right:auto");
    if (i.marginTop) box.push("margin-top:" + cssUnit(i.marginTop));
    if (i.marginBottom) box.push("margin-bottom:" + cssUnit(i.marginBottom));

    const inner = shown.map(function (s, idx) {
      return '<div class="edc-imgframe-slide' + (idx === 0 ? " is-active" : "") + '"' +
        ' role="img" aria-label="' + esc(s.alt || alt || "") + '"' +
        ' style="' + esc(slideLayerStyle(s)) + '"></div>';
    }).join("");

    return '<div class="edc-imgframe edc-live-image"' +
      (isShow ? ' data-edc-slideshow data-duration="' + esc(clampNum(adv.duration, 0.5, 120, 5)) +
        '" data-transition="' + esc(["fade", "slide", "none"].indexOf(adv.transition) >= 0 ? adv.transition : "fade") + '"' : "") +
      ' style="' + esc(box.join(";")) + '">' + inner + "</div>";
  }

  /* ---- decorative photos / icons (Page Builder "Icons & Photos" tab) -------
   * style_json.decorations = {
   *   aboveEyebrow | aboveHeading | belowBody | belowButtons |
   *   cardAboveTitle | cardBelowText : {
   *     mode: "image" | "icon",
   *     url, alt,                        (image mode)
   *     icon,                            (icon mode - emoji / symbol / letter)
   *     width, height, size, shape, radius, fit,
   *     transparent, opacity, blur, grayscale, rotate,
   *     align, marginTop, marginBottom, shadow, color
   *   }
   * }
   * Sections saved before this feature have no `decorations` key and render
   * exactly as they always did.
   * ---------------------------------------------------------------------- */

  const DECO_FALLBACK = {
    section: { imageWidth: 120, iconSize: 32, marginBottom: 14 },
    card:    { imageWidth: 72,  iconSize: 26, marginBottom: 10 }
  };

  function decoFilter(d) {
    const f = [];
    const blur = numOr(d.blur, 0);
    if (blur > 0) f.push("blur(" + blur + "px)");
    const gray = numOr(d.grayscale, 0);
    if (gray > 0) f.push("grayscale(" + Math.min(100, gray) + "%)");
    return f.length ? "filter:" + f.join(" ") + ";-webkit-filter:" + f.join(" ") + ";" : "";
  }

  function decoOpacity(d) {
    const o = numOr(d.opacity, 1);
    return o >= 0 && o < 1 ? "opacity:" + o + ";" : "";
  }

  function decoRotate(d) {
    const r = numOr(d.rotate, 0);
    return r ? "transform:rotate(" + r + "deg);" : "";
  }

  function decoShape(d) {
    const shape = enumValue(d.shape, ["default", "circle", "rounded", "square"], "default");
    if (shape === "circle") return "border-radius:50%;";
    if (shape === "rounded") return "border-radius:" + cssUnit(d.radius || 16) + ";";
    if (shape === "square") return "border-radius:0;";
    return d.radius ? "border-radius:" + cssUnit(d.radius) + ";" : "";
  }

  function decoHtml(st, slot, isCard) {
    const all = (st && st.decorations) || {};
    const d = all[slot];
    if (!d) return "";
    const mode = enumValue(d.mode, ["image", "icon"], "");
    if (!mode || d.enabled === false) return "";
    const def = isCard ? DECO_FALLBACK.card : DECO_FALLBACK.section;

    const align = enumValue(d.align, ["left", "center", "right"], "left");
    const wrap = [
      "display:block",
      "text-align:" + align,
      "margin-top:" + cssUnit(numOr(d.marginTop, 0)),
      "margin-bottom:" + cssUnit(d.marginBottom === "" || d.marginBottom == null ? def.marginBottom : numOr(d.marginBottom, def.marginBottom)),
      "line-height:1"
    ].join(";");

    let inner = "";
    if (mode === "icon") {
      const glyph = String(d.icon || "").slice(0, 8);
      if (!glyph.trim()) return "";
      const s = [
        "display:inline-block",
        "font-size:" + cssUnit(d.size || def.iconSize),
        "line-height:1"
      ];
      if (d.color) s.push("color:" + d.color);
      inner = '<span class="edc-deco-icon" aria-hidden="true" style="' +
        esc(s.join(";") + ";" + decoOpacity(d) + decoRotate(d) + decoFilter(d)) + '">' + esc(glyph) + "</span>";
    } else {
      const url = safeImage(d.url);
      if (!url) return "";
      const s = [
        "display:inline-block",
        "max-width:100%",
        "width:" + cssUnit(d.width || def.imageWidth)
      ];
      if (d.height) s.push("height:" + cssUnit(d.height));
      else if (enumValue(d.shape, ["default", "circle", "rounded", "square"], "default") === "circle") {
        /* a circle needs a square frame, so match the height to the width */
        s.push("height:" + cssUnit(d.width || def.imageWidth));
      } else s.push("height:auto");
      s.push("object-fit:" + enumValue(d.fit, ["cover", "contain", "fill", "none", "scale-down"], d.transparent ? "contain" : "cover"));
      if (d.transparent) s.push("background:transparent");
      if (d.shadow) s.push("box-shadow:0 12px 30px rgba(15,23,42,.18)");
      inner = '<img class="edc-deco-img" loading="lazy" src="' + esc(url) + '" alt="' + esc(d.alt || "") +
        '" style="' + esc(s.join(";") + ";" + decoShape(d) + decoOpacity(d) + decoRotate(d) + decoFilter(d)) + '">';
    }
    return '<div class="edc-deco edc-deco-' + esc(slot) + '" style="' + esc(wrap) + '">' + inner + "</div>";
  }

  /* ---- small inline icon placed BEFORE a heading / title ------------------
   * style_json.inlineIcons = {
   *   eyebrow | heading | cardTitle : {
   *     mode:"icon"|"image", icon, url, size ("1em" by default), color, gap,
   *     opacity, blur, rotate, shape, radius
   *   }
   * }
   * Default size is 1em so the icon matches the text size exactly; set a value
   * to make it bigger or smaller.
   * ---------------------------------------------------------------------- */

  function inlineIconHtml(st, key) {
    const all = (st && st.inlineIcons) || {};
    const d = all[key];
    if (!d) return "";
    const mode = enumValue(d.mode, ["icon", "image"], "");
    if (!mode || d.enabled === false) return "";
    const size = d.size ? cssUnit(d.size) : "1em";
    const gap = cssUnit(d.gap === "" || d.gap == null ? 8 : numOr(d.gap, 8));

    if (mode === "icon") {
      const glyph = String(d.icon || "").slice(0, 8);
      if (!glyph.trim()) return "";
      const s = ["display:inline-block", "font-size:" + size, "line-height:1",
        "margin-right:" + gap, "vertical-align:baseline"];
      if (d.color) s.push("color:" + d.color);
      return '<span class="edc-inline-icon" aria-hidden="true" style="' +
        esc(s.join(";") + ";" + decoOpacity(d) + decoRotate(d) + decoFilter(d)) + '">' + esc(glyph) + "</span>";
    }
    const url = safeImage(d.url);
    if (!url) return "";
    const s = ["display:inline-block", "width:" + size, "height:" + size,
      "object-fit:contain", "background:transparent",
      "margin-right:" + gap, "vertical-align:-0.12em"];
    return '<img class="edc-inline-icon" loading="lazy" src="' + esc(url) + '" alt="" style="' +
      esc(s.join(";") + ";" + decoShape(d) + decoOpacity(d) + decoRotate(d) + decoFilter(d)) + '">';
  }

  /* ---- element wrappers ---- */

  function eyebrowHtml(data, st) {
    if (!data.eyebrow) return "";
    const es = elementStyle(st, "eyebrow");
    return '<span class="eyebrow"' + (es ? ' style="' + esc(es) + '"' : "") + ">" +
      inlineIconHtml(st, "eyebrow") + esc(data.eyebrow) + "</span>";
  }

  function headingHtml(data, st, tag) {
    const title = data.title || data.heading || "";
    if (!title) return "";
    const es = elementStyle(st, "heading");
    return '<' + tag + (es ? ' style="' + esc(es) + '"' : "") + ">" +
      inlineIconHtml(st, "heading") + esc(title) + "</" + tag + ">";
  }

  function bodyHtml(data, st) {
    const body = data.body || data.text || data.content || "";
    if (!body) return "";
    const es = elementStyle(st, "body");
    return richText(body, es, "");
  }

  /* ---- shared rich-text renderer ------------------------------------------
   * Keeps what the editor typed: a blank line starts a new paragraph
   * (its own <p> with consistent spacing) and a single Enter becomes <br>.
   * ---------------------------------------------------------------------- */
  function richText(value, inlineStyle, extraClass) {
    const src = String(value == null ? "" : value).replace(/\r\n?/g, "\n");
    if (!src.trim()) return "";
    const cls = "edc-rich" + (extraClass ? " " + extraClass : "");
    /* Each blank line starts a new <p> (one stanza). Inside a stanza every
     * single Enter is kept as a line break and every leading space the author
     * typed is preserved, because the paragraph renders with pre-wrap. */
    const preserve = "white-space:pre-wrap;";
    const styleAttrPre = ' style="' + esc(preserve + (inlineStyle || "")) + '"';
    return src.split(/\n{2,}/).map(function (para) {
      const stanza = para.replace(/^\n+|\n+$/g, "");
      if (!stanza.trim()) return "";
      return '<p class="' + cls + '"' + styleAttrPre + ">" + esc(stanza) + "</p>";
    }).join("");
  }

  function ctaHtml(data, st) {
    const link = safeLink(data.cta_url || data.cta_primary_url || data.url);
    const label = data.cta_label || data.cta_primary_label;
    if (!link && !label) return "";
    const href = link || "#";
    const es = elementStyle(st, "button");
    const variant = st.buttonVariant || "btn-gold";
    return '<a class="btn ' + variant + ' edc-live-cta"' + (es ? ' style="' + esc(es) + '"' : "") + ' href="' + esc(href) + '">' + esc(label || "Learn more") + "</a>";
  }

  function cta2Html(data, st) {
    const link2 = safeLink(data.cta2_url || data.cta_secondary_url);
    const label2 = data.cta2_label || data.cta_secondary_label;
    if (!link2 && !label2) return "";
    const href = link2 || "#";
    const es = elementStyle(st, "button2");
    var styleAttr = es ? esc(es) : "";
    return '<a class="btn btn-outline edc-live-cta2"' + (styleAttr ? ' style="' + esc(styleAttr) + '"' : "") + ' href="' + esc(href) + '">' + esc(label2 || "Learn more") + "</a>";
  }

  function buttonsHtml(data, st) {
    const b1 = ctaHtml(data, st);
    const b2 = cta2Html(data, st);
    if (!b1 && !b2) return "";
    return '<div class="edc-live-btns" style="display:inline-flex;gap:12px;flex-wrap:wrap;align-items:center;margin-top:16px;">' + b1 + b2 + '</div>';
  }

  /* ------------------------------- renderers ------------------------------- */

  function renderSection(section) {
    const data = parse(section.content_json, {});
    const st = parse(section.style_json, {});
    const type = String(section.type || "text").toLowerCase();
    let image = safeImage(data.image_url || data.image || data.src);
    /* an advanced image / slideshow can supply the picture on its own */
    if (!image) {
      const advCfg = (st.image || {}).adv;
      const first = advCfg && Array.isArray(advCfg.slides) ? advCfg.slides[0] : null;
      if (first) image = safeImage(first.url);
    }

    const open = '<section class="section edc-live-section edc-live-' + esc(type) + '" data-section-id="' + esc(section.section_id) + '" style="' + esc(sectionStyle(st)) + '"><div class="container" style="' + esc(innerStyle(st)) + '">';
    const close = "</div></section>";

    if (type === "hero") {
      return open +
        decoHtml(st, "aboveEyebrow") +
        eyebrowHtml(data, st) +
        decoHtml(st, "aboveHeading") +
        headingHtml(data, st, "h1") +
        bodyHtml(data, st) +
        decoHtml(st, "belowBody") +
        (image ? '<div class="hero-photo">' + img(image, data.alt || data.title || "", st) + "</div>" : "") +
        buttonsHtml(data, st) + decoHtml(st, "belowButtons") + close;
    }

    if (type === "image") {
      return open +
        decoHtml(st, "aboveEyebrow") +
        eyebrowHtml(data, st) +
        decoHtml(st, "aboveHeading") +
        (data.title || data.heading ? '<div class="section-head">' + headingHtml(data, st, "h2") + "</div>" : "") +
        img(image, data.alt || data.title || "", st) +
        bodyHtml(data, st) +
        decoHtml(st, "belowBody") +
        buttonsHtml(data, st) + decoHtml(st, "belowButtons") + close;
    }

    if (type === "split") {
      const reverse = st.reverse === true || data.reverse === true;
      const text = '<div class="edc-split-text">' +
        decoHtml(st, "aboveEyebrow") +
        eyebrowHtml(data, st) +
        decoHtml(st, "aboveHeading") +
        headingHtml(data, st, "h2") +
        richText(data.body || data.text || "", elementStyle(st, "body"), "muted") +
        decoHtml(st, "belowBody") +
        buttonsHtml(data, st) + decoHtml(st, "belowButtons") + "</div>";
      const media = '<div class="edc-split-media">' + img(image, data.alt || data.title || "", st) + "</div>";
      return open + '<div class="edc-split" style="gap:' + cssUnit(st.gap || 40) + '">' +
        (reverse ? media + text : text + media) + "</div>" + close;
    }

    if (type === "grid" || type === "cards") {
      const items = Array.isArray(data.items) ? data.items : [];
      const cols = Number(st.columns) || (items.length >= 3 ? 3 : 2);
      const cardLayout = enumValue(st.cardLayout, ["grid", "horizontal"], "grid");
      const cardAlign = enumValue(st.cardAlign, ["left", "center", "right", "justify"], "");
      const equalCardHeight = st.equalCardHeight !== false;
      const gridClass = cardLayout === "horizontal" ? " pb-card-layout-horizontal" : "";
      const gridStyle = cardLayout === "horizontal"
        ? "display:flex;flex-wrap:nowrap;overflow-x:auto;align-items:stretch;gap:" + cssUnit(st.gap || 24)
        : "display:grid;align-items:stretch;gap:" + cssUnit(st.gap || 24) + ";grid-template-columns:repeat(" + Math.max(1, cols) + ",minmax(0,1fr))";
      /* card edge (border) controls — thickness, style and colour */
      const cardBorder = (function () {
        const w = st.cardBorderWidth;
        const col = st.cardBorderColor;
        const style = enumValue(st.cardBorderStyle, ["solid", "dashed", "dotted", "double", "none"], "");
        const out = [];
        if (w !== undefined && w !== null && w !== "") out.push("border-width:" + cssUnit(w) + ";border-style:" + (style || "solid") + ";");
        else if (style) out.push("border-style:" + style + ";");
        if (col) out.push("border-color:" + col + ";");
        if (st.cardRadius !== undefined && st.cardRadius !== null && st.cardRadius !== "") out.push("border-radius:" + cssUnit(st.cardRadius) + ";");
        return out.join("");
      })();
      return open +
        decoHtml(st, "aboveEyebrow") +
        (data.eyebrow ? eyebrowHtml(data, st) : "") +
        decoHtml(st, "aboveHeading") +
        (data.title || data.heading ? '<div class="section-head">' + headingHtml(data, st, "h2") + "</div>" : "") +
        (data.body ? bodyHtml(data, st) : "") +
        '<div class="edc-live-grid' + gridClass + '" style="' + gridStyle + '">' +
        items.map(function (item) {
          const itemImg = safeImage(item.image_url || item.image);
          const titleEs = elementStyle(st, "cardTitle");
          const textEs = elementStyle(st, "cardText");
          const btnEs = elementStyle(st, "cardButton");
          const itemLayout = enumValue(item.layout, ["stacked", "horizontal"], "stacked");
          const mediaPosition = enumValue(item.image_position || item.media_position, ["top", "left", "right", "hidden"], itemLayout === "horizontal" ? "left" : "top");
          const itemTextAlign = enumValue(item.align || item.text_align, ["left", "center", "right", "justify"], cardAlign);
          const cardStyle = (equalCardHeight ? "height:100%;" : "") + (cardLayout === "horizontal" ? "flex:0 0 min(86vw,420px);" : "") + cardBorder;
          const bodyStyle = "height:100%;" +
            (itemTextAlign ? "text-align:" + itemTextAlign + ";" : "") +
            (itemLayout === "horizontal" ? "display:flex;align-items:center;gap:16px;" : "");
          const itemImage = itemImg && mediaPosition !== "hidden" ? img(itemImg, item.alt || item.title || "", st) : "";
          const itemLabel = item.eyebrow || item.label || item.tag || "";
          const itemCopy = (itemLabel ? '<span class="tag">' + esc(itemLabel) + "</span>" : "") +
            decoHtml(st, "cardAboveTitle", true) +
            (item.title ? "<h3" + (titleEs ? ' style="' + esc(titleEs) + '"' : "") + ">" +
              inlineIconHtml(st, "cardTitle") + esc(item.title) + "</h3>" : "") +
            richText(item.text || item.body || "", textEs, "muted") +
            decoHtml(st, "cardBelowText", true) +
            (safeLink(item.url) ? '<a class="btn btn-outline btn-sm mt-4"' + (btnEs ? ' style="' + esc(btnEs) + '"' : "") + ' href="' + esc(safeLink(item.url)) + '">' + esc(item.cta_label || "Read more") + "</a>" : "");
          const mediaFirst = mediaPosition !== "right";
          return '<div class="card"' + (cardStyle ? ' style="' + esc(cardStyle) + '"' : "") + '><div class="card-body"' + (bodyStyle ? ' style="' + esc(bodyStyle) + '"' : "") + ">" +
            (mediaFirst ? itemImage + itemCopy : itemCopy + itemImage) +
            "</div></div>";
        }).join("") + "</div>" + (buttonsHtml(data, st) ? '<div class="mt-6" style="margin-top:24px">' + buttonsHtml(data, st) + "</div>" : "") + close;
    }

    if (type === "cta" || type === "banner") {
      return open + '<div class="cta-band"><div>' +
        decoHtml(st, "aboveEyebrow") +
        eyebrowHtml(data, st) +
        decoHtml(st, "aboveHeading") +
        headingHtml(data, st, "h2") +
        bodyHtml(data, st) +
        decoHtml(st, "belowBody") + "</div>" +
        buttonsHtml(data, st) + decoHtml(st, "belowButtons") + "</div>" + close;
    }

    if (type === "html" && st.allowHtml === true) {
      return open + (data.html || "") + close;
    }

    if (type === "spacer") {
      return '<div class="edc-live-spacer" style="height:' + cssUnit(st.height || 48) + '"></div>';
    }

    // default: text block
    return open +
      decoHtml(st, "aboveEyebrow") +
      eyebrowHtml(data, st) +
      decoHtml(st, "aboveHeading") +
      (data.title || data.heading ? '<div class="section-head">' + headingHtml(data, st, "h2") + "</div>" : "") +
      bodyHtml(data, st) +
      decoHtml(st, "belowBody") +
      (image ? img(image, data.alt || data.title || "", st) : "") +
      buttonsHtml(data, st) + decoHtml(st, "belowButtons") + close;
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
      "<br>api: " + esc(String((window.EDC_CONFIG || {}).API_URL || "").slice(0, 48) + "\u2026") +
      "<br>demo mode: " + String((window.EDC_CONFIG || {}).DEMO_MODE) +
      "<br>ok: " + String(result && result.success) +
      "<br>" + notes.map(esc).join("<br>");
    document.body.appendChild(box);
  }

  async function render() {
    if (document.body && document.body.dataset && document.body.dataset.edcAdmin === "true") {
      return;
    }
    const pageSlug = slug();
    const api = (typeof EDC_API !== "undefined") ? EDC_API : window.EDC_API;
    if (!api || typeof EDC_CONFIG === "undefined") { log("api.js/config.js not loaded before public-page.js — check script order."); return debugPanel(pageSlug, null); }
    window.EDC_API = api;
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
          richText(data.body, "max-width:280px;font-size:.85rem;", "") + "</div>");
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
