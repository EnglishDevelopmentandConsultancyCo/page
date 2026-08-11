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
    return /^(https?:\/\/|mailto:|tel:|#|\.?\/|[\w-]+\.html)/i.test(u) ? u : "";
  }

  function enumValue(value, allowed, fallback) {
    return allowed.indexOf(String(value || "")) >= 0 ? String(value) : fallback;
  }

  /* ---------------- style engine ---------------- */

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

  /* ---- element wrappers ---- */

  function eyebrowHtml(data, st) {
    if (!data.eyebrow) return "";
    const es = elementStyle(st, "eyebrow");
    return '<span class="eyebrow"' + (es ? ' style="' + esc(es) + '"' : "") + ">" + esc(data.eyebrow) + "</span>";
  }

  function headingHtml(data, st, tag) {
    const title = data.title || data.heading || "";
    if (!title) return "";
    const es = elementStyle(st, "heading");
    return '<' + tag + (es ? ' style="' + esc(es) + '"' : "") + ">" + esc(title) + "</" + tag + ">";
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
    const styleAttr = inlineStyle ? ' style="' + esc(inlineStyle) + '"' : "";
    return src.split(/\n{2,}/).map(function (para) {
      const inner = esc(para.replace(/^\n+|\n+$/g, "")).replace(/\n/g, "<br>");
      if (!inner) return "";
      return '<p class="' + cls + '"' + styleAttr + ">" + inner + "</p>";
    }).join("");
  }

  function ctaHtml(data, st) {
    const link = safeLink(data.cta_url || data.url);
    if (!link) return "";
    const es = elementStyle(st, "button");
    const variant = st.buttonVariant || "btn-gold";
    return '<a class="btn ' + variant + ' edc-live-cta"' + (es ? ' style="' + esc(es) + '"' : "") + ' href="' + esc(link) + '">' + esc(data.cta_label || "Learn more") + "</a>";
  }

  function cta2Html(data, st) {
    const link2 = safeLink(data.cta2_url);
    if (!link2) return "";
    const es = elementStyle(st, "button2");
    var styleAttr = es ? esc(es) + ";margin-left:.5rem" : "margin-left:.5rem";
    return '<a class="btn btn-outline edc-live-cta2" style="' + styleAttr + '" href="' + esc(link2) + '">' + esc(data.cta2_label || "Learn more") + "</a>";
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
        eyebrowHtml(data, st) +
        headingHtml(data, st, "h1") +
        bodyHtml(data, st) +
        (image ? '<div class="hero-photo">' + img(image, data.alt || data.title || "", st) + "</div>" : "") +
        ctaHtml(data, st) + cta2Html(data, st) + close;
    }

    if (type === "image") {
      return open +
        (data.title || data.heading ? '<div class="section-head">' + headingHtml(data, st, "h2") + "</div>" : "") +
        img(image, data.alt || data.title || "", st) +
        bodyHtml(data, st) + ctaHtml(data, st) + close;
    }

    if (type === "split") {
      const reverse = st.reverse === true || data.reverse === true;
      const text = '<div class="edc-split-text">' +
        headingHtml(data, st, "h2") +
        richText(data.body || data.text || "", elementStyle(st, "body"), "muted") +
        ctaHtml(data, st) + "</div>";
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
      return open +
        (data.eyebrow ? eyebrowHtml(data, st) : "") +
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
          const cardStyle = (equalCardHeight ? "height:100%;" : "") + (cardLayout === "horizontal" ? "flex:0 0 min(86vw,420px);" : "");
          const bodyStyle = "height:100%;" +
            (itemTextAlign ? "text-align:" + itemTextAlign + ";" : "") +
            (itemLayout === "horizontal" ? "display:flex;align-items:center;gap:16px;" : "");
          const itemImage = itemImg && mediaPosition !== "hidden" ? img(itemImg, item.alt || item.title || "", st) : "";
          const itemLabel = item.eyebrow || item.label || item.tag || "";
          const itemCopy = (itemLabel ? '<span class="tag">' + esc(itemLabel) + "</span>" : "") +
            (item.title ? "<h3" + (titleEs ? ' style="' + esc(titleEs) + '"' : "") + ">" + esc(item.title) + "</h3>" : "") +
            richText(item.text || item.body || "", textEs, "muted") +
            (safeLink(item.url) ? '<a class="btn btn-outline btn-sm mt-4"' + (btnEs ? ' style="' + esc(btnEs) + '"' : "") + ' href="' + esc(safeLink(item.url)) + '">' + esc(item.cta_label || "Read more") + "</a>" : "");
          const mediaFirst = mediaPosition !== "right";
          return '<div class="card"' + (cardStyle ? ' style="' + esc(cardStyle) + '"' : "") + '><div class="card-body"' + (bodyStyle ? ' style="' + esc(bodyStyle) + '"' : "") + ">" +
            (mediaFirst ? itemImage + itemCopy : itemCopy + itemImage) +
            "</div></div>";
        }).join("") + "</div>" + (safeLink(data.cta_url || data.url) ? '<div class="mt-6" style="margin-top:24px">' + ctaHtml(data, st) + "</div>" : "") + close;
    }

    if (type === "cta" || type === "banner") {
      return open + '<div class="cta-band"><div>' +
        headingHtml(data, st, "h2") +
        bodyHtml(data, st) + "</div>" + ctaHtml(data, st) + "</div>" + close;
    }

    if (type === "html" && st.allowHtml === true) {
      return open + (data.html || "") + close;
    }

    if (type === "spacer") {
      return '<div class="edc-live-spacer" style="height:' + cssUnit(st.height || 48) + '"></div>';
    }

    // default: text block
    return open +
      (data.title || data.heading ? '<div class="section-head">' + headingHtml(data, st, "h2") + "</div>" : "") +
      bodyHtml(data, st) +
      (image ? img(image, data.alt || data.title || "", st) : "") + ctaHtml(data, st) + close;
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
