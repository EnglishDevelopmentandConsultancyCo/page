/* global EDC_MEDIA */
/**
 * IMAGE-EDITOR.JS  —  NEW FILE (additive; nothing else is replaced)
 * ---------------------------------------------------------------
 * Advanced image editing + slideshow configuration for the Page Builder.
 *
 *   EDC_IMAGE_EDITOR.open(config)  ->  Promise<config|null>
 *
 * The config object is stored under  style_json.image.adv  so the existing
 * Image tab (shape / fit / size / focal point) keeps working untouched.
 *
 *   {
 *     enabled: true,
 *     mode: "single" | "slideshow",
 *     duration: 5,                    // seconds per slide
 *     transition: "fade"|"slide"|"none",
 *     frameWidth: "" | 640 | "80%",   // "" = full width of its column
 *     frameHeight: 360,               // px (frame stays fixed, image moves)
 *     slides: [ { url, alt, zoom, posX, posY } ]
 *   }
 *
 * posX / posY are 0..1 pan positions (0.5 = centred). Zoom is >= 1.
 * The exact same maths is used by public-page.js and slideshow.js so the
 * published page matches the builder pixel for pixel.
 * ---------------------------------------------------------------
 */
const EDC_IMAGE_EDITOR = (function () {
  const MIN_ZOOM = 1, MAX_ZOOM = 5;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function num(v, d) { const n = parseFloat(v); return isFinite(n) ? n : d; }

  /* -------- shared geometry (also used by public-page.js / slideshow.js) ---- */

  function normalizeSlide(sl) {
    sl = sl || {};
    return {
      url: String(sl.url || sl.image_url || "").trim(),
      alt: String(sl.alt || ""),
      zoom: clamp(num(sl.zoom, 1), MIN_ZOOM, MAX_ZOOM),
      posX: clamp(num(sl.posX, 0.5), 0, 1),
      posY: clamp(num(sl.posY, 0.5), 0, 1)
    };
  }

  function normalize(cfg) {
    cfg = cfg || {};
    const slides = (Array.isArray(cfg.slides) ? cfg.slides : []).map(normalizeSlide).filter(function (s) { return s.url; });
    return {
      enabled: true,
      mode: cfg.mode === "slideshow" ? "slideshow" : "single",
      duration: clamp(num(cfg.duration, 5), 0.5, 120),
      transition: ["fade", "slide", "none"].indexOf(cfg.transition) >= 0 ? cfg.transition : "fade",
      frameWidth: cfg.frameWidth === undefined || cfg.frameWidth === null ? "" : String(cfg.frameWidth),
      frameHeight: cfg.frameHeight === undefined || cfg.frameHeight === null || cfg.frameHeight === "" ? 360 : num(cfg.frameHeight, 360),
      slides: slides
    };
  }

  /* inline style for the moving layer inside a fixed frame */
  function layerStyle(slide) {
    const s = normalizeSlide(slide);
    const size = s.zoom * 100;
    const left = -(s.zoom - 1) * s.posX * 100;
    const top = -(s.zoom - 1) * s.posY * 100;
    return "position:absolute;left:" + left.toFixed(4) + "%;top:" + top.toFixed(4) + "%;" +
      "width:" + size.toFixed(4) + "%;height:" + size.toFixed(4) + "%;" +
      "background-image:url('" + String(s.url).replace(/'/g, "%27") + "');" +
      "background-size:cover;background-position:center;background-repeat:no-repeat;";
  }

  /* -------------------------------- modal --------------------------------- */

  function open(initial) {
    return new Promise(function (resolve) {
      const cfg = normalize(initial);
      if (!cfg.slides.length) cfg.slides = [];
      let active = 0;

      const ov = document.createElement("div");
      ov.className = "edc-ie-overlay";
      ov.innerHTML =
        '<div class="edc-ie" role="dialog" aria-label="Adjust image">' +
          '<div class="edc-ie-head">' +
            '<h3>Adjust image &amp; slideshow</h3>' +
            '<button type="button" class="edc-ie-x" data-act="cancel" aria-label="Close">&times;</button>' +
          '</div>' +
          '<div class="edc-ie-body">' +
            '<div class="edc-ie-left">' +
              '<div class="edc-ie-stagewrap">' +
                '<div class="edc-ie-stage" data-stage>' +
                  '<div class="edc-ie-ghost" data-ghost></div>' +
                  '<div class="edc-ie-frame" data-frame>' +
                    '<div class="edc-ie-layer" data-layer></div>' +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<p class="edc-ie-note" data-dims>Frame: —</p>' +
              '<div class="edc-ie-controls">' +
                '<div class="edc-ie-row">' +
                  '<button type="button" class="edc-ie-btn" data-act="zoom-out">&minus;</button>' +
                  '<input type="range" data-zoom min="' + MIN_ZOOM + '" max="' + MAX_ZOOM + '" step="0.01" value="1">' +
                  '<button type="button" class="edc-ie-btn" data-act="zoom-in">+</button>' +
                  '<span class="edc-ie-zoomval" data-zoomval>100%</span>' +
                '</div>' +
                '<div class="edc-ie-row">' +
                  '<label>Horizontal <input type="range" data-px min="0" max="1" step="0.001" value="0.5"></label>' +
                  '<label>Vertical <input type="range" data-py min="0" max="1" step="0.001" value="0.5"></label>' +
                '</div>' +
                '<div class="edc-ie-row edc-ie-row-end">' +
                  '<button type="button" class="edc-ie-btn" data-act="reset">Reset position</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="edc-ie-right">' +
              '<div class="edc-ie-group">' +
                '<h4>Frame (container)</h4>' +
                '<label>Width (px, % or blank for full width)<input type="text" data-fw placeholder="e.g. 640 or 80%"></label>' +
                '<label>Height (px)<input type="number" data-fh min="40" step="1" placeholder="360"></label>' +
              '</div>' +
              '<div class="edc-ie-group">' +
                '<h4>Images</h4>' +
                '<div class="edc-ie-slides" data-slides></div>' +
                '<div class="edc-ie-row">' +
                  '<input type="text" data-newurl placeholder="Image URL (https://… or assets/img/photo.jpg)">' +
                '</div>' +
                '<div class="edc-ie-row edc-ie-row-end">' +
                  '<button type="button" class="edc-ie-btn" data-act="add">+ Add image</button>' +
                  '<button type="button" class="edc-ie-btn" data-act="library">Media library…</button>' +
                '</div>' +
              '</div>' +
              '<div class="edc-ie-group">' +
                '<h4>Display mode</h4>' +
                '<label><select data-mode>' +
                  '<option value="single">Single image</option>' +
                  '<option value="slideshow">Slideshow</option>' +
                '</select></label>' +
                '<div data-showopts hidden>' +
                  '<label>Slide duration' +
                    '<select data-durpick>' +
                      '<option value="1">1 second</option>' +
                      '<option value="3">3 seconds</option>' +
                      '<option value="5">5 seconds</option>' +
                      '<option value="10">10 seconds</option>' +
                      '<option value="custom">Custom…</option>' +
                    '</select>' +
                  '</label>' +
                  '<label data-durcustom hidden>Custom duration (seconds)<input type="number" data-dur min="0.5" step="0.5"></label>' +
                  '<label>Transition' +
                    '<select data-transition>' +
                      '<option value="fade">Fade</option>' +
                      '<option value="slide">Slide</option>' +
                      '<option value="none">None</option>' +
                    '</select>' +
                  '</label>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="edc-ie-foot">' +
            '<button type="button" class="edc-ie-btn" data-act="disable">Remove advanced settings</button>' +
            '<span class="edc-ie-spacer"></span>' +
            '<button type="button" class="edc-ie-btn" data-act="cancel">Cancel</button>' +
            '<button type="button" class="edc-ie-btn edc-ie-btn-primary" data-act="save">Save image settings</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(ov);

      const q = function (sel) { return ov.querySelector(sel); };
      const stage = q("[data-stage]"), frame = q("[data-frame]"), layer = q("[data-layer]"),
        ghost = q("[data-ghost]"), zoomEl = q("[data-zoom]"), pxEl = q("[data-px]"), pyEl = q("[data-py]"),
        slidesEl = q("[data-slides]"), dimsEl = q("[data-dims]");

      function current() { return cfg.slides[active] || null; }

      function paintFrame() {
        const fh = num(cfg.frameHeight, 360);
        const fwRaw = String(cfg.frameWidth || "").trim();
        /* the stage keeps a fixed pixel box; the frame is scaled to fit inside it */
        const boxW = 520, boxH = 340;
        let fw;
        if (!fwRaw) fw = boxW;
        else if (/%$/.test(fwRaw)) fw = boxW * (num(fwRaw, 100) / 100);
        else fw = num(fwRaw, boxW);
        const scale = Math.min(1, boxW / fw, boxH / fh);
        frame.style.width = Math.round(fw * scale) + "px";
        frame.style.height = Math.round(fh * scale) + "px";
        const ratio = fh ? (fw / fh) : 1;
        dimsEl.textContent = "Frame: " + (fwRaw || "full width") + " \u00d7 " + Math.round(fh) + "px" +
          "  \u2022  aspect ratio " + ratio.toFixed(2) + ":1" +
          (scale < 1 ? "  \u2022  shown at " + Math.round(scale * 100) + "%" : "");
      }

      function paint() {
        paintFrame();
        const s = current();
        if (!s) {
          layer.style.cssText = "";
          ghost.style.cssText = "";
          layer.classList.add("is-empty");
          return;
        }
        layer.classList.remove("is-empty");
        layer.style.cssText = layerStyle(s);
        /* ghost = the same layer geometry, unclipped, so the whole editing area is visible */
        const fr = frame.getBoundingClientRect(), st = stage.getBoundingClientRect();
        ghost.style.cssText = layerStyle(s) +
          "opacity:.22;pointer-events:none;" +
          "left:" + ((fr.left - st.left) + (parseFloat(layer.style.left) / 100) * fr.width) + "px;" +
          "top:" + ((fr.top - st.top) + (parseFloat(layer.style.top) / 100) * fr.height) + "px;" +
          "width:" + (s.zoom * fr.width) + "px;height:" + (s.zoom * fr.height) + "px;";
        zoomEl.value = String(s.zoom);
        pxEl.value = String(s.posX);
        pyEl.value = String(s.posY);
        q("[data-zoomval]").textContent = Math.round(s.zoom * 100) + "%";
        pxEl.disabled = pyEl.disabled = s.zoom <= 1.0001;
      }

      function paintSlides() {
        if (!cfg.slides.length) {
          slidesEl.innerHTML = '<p class="edc-ie-empty">No images yet — add one below.</p>';
          return;
        }
        slidesEl.innerHTML = cfg.slides.map(function (s, i) {
          return '<div class="edc-ie-slide' + (i === active ? " is-active" : "") + '" data-i="' + i + '">' +
            '<span class="edc-ie-thumb" style="background-image:url(\'' + esc(s.url).replace(/'/g, "%27") + '\')"></span>' +
            '<span class="edc-ie-slide-name">' + esc(s.url.split("/").pop() || s.url) + '</span>' +
            '<span class="edc-ie-slide-acts">' +
              '<button type="button" data-sact="up" title="Move up">\u2191</button>' +
              '<button type="button" data-sact="down" title="Move down">\u2193</button>' +
              '<button type="button" data-sact="edit" title="Edit this image">Edit</button>' +
              '<button type="button" data-sact="del" title="Remove">\u00d7</button>' +
            '</span>' +
          '</div>';
        }).join("");
        slidesEl.querySelectorAll(".edc-ie-slide").forEach(function (row) {
          const i = Number(row.dataset.i);
          row.onclick = function (e) {
            const act = e.target && e.target.dataset ? e.target.dataset.sact : "";
            if (act === "up" && i > 0) { const t = cfg.slides[i - 1]; cfg.slides[i - 1] = cfg.slides[i]; cfg.slides[i] = t; active = i - 1; }
            else if (act === "down" && i < cfg.slides.length - 1) { const t = cfg.slides[i + 1]; cfg.slides[i + 1] = cfg.slides[i]; cfg.slides[i] = t; active = i + 1; }
            else if (act === "del") { cfg.slides.splice(i, 1); if (active >= cfg.slides.length) active = Math.max(0, cfg.slides.length - 1); }
            else { active = i; }
            paintSlides(); paint();
          };
        });
      }

      /* ---- interactions ---- */

      let drag = null;
      frame.addEventListener("pointerdown", function (e) {
        const s = current();
        if (!s || s.zoom <= 1.0001) return;
        frame.setPointerCapture(e.pointerId);
        drag = { x: e.clientX, y: e.clientY, posX: s.posX, posY: s.posY, w: frame.clientWidth, h: frame.clientHeight, z: s.zoom };
      });
      frame.addEventListener("pointermove", function (e) {
        if (!drag) return;
        const s = current(); if (!s) return;
        const panW = (drag.z - 1) * drag.w, panH = (drag.z - 1) * drag.h;
        if (panW > 0) s.posX = clamp(drag.posX - (e.clientX - drag.x) / panW, 0, 1);
        if (panH > 0) s.posY = clamp(drag.posY - (e.clientY - drag.y) / panH, 0, 1);
        paint();
      });
      function endDrag() { drag = null; }
      frame.addEventListener("pointerup", endDrag);
      frame.addEventListener("pointercancel", endDrag);

      /* wheel + trackpad pinch — non-passive so the page never scrolls behind */
      frame.addEventListener("wheel", function (e) {
        const s = current(); if (!s) return;
        e.preventDefault();
        const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
        zoomAt(clamp(s.zoom * Math.exp(-dy * 0.0015), MIN_ZOOM, MAX_ZOOM), e.clientX, e.clientY);
      }, { passive: false });

      /* two-finger pinch on touch screens */
      const pointers = new Map(); let pinchStart = null;
      frame.addEventListener("pointerdown", function (e) { pointers.set(e.pointerId, e); });
      frame.addEventListener("pointermove", function (e) {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, e);
        if (pointers.size !== 2) return;
        drag = null;
        const pts = Array.from(pointers.values());
        const dist = Math.hypot(pts[0].clientX - pts[1].clientX, pts[0].clientY - pts[1].clientY);
        const cx = (pts[0].clientX + pts[1].clientX) / 2, cy = (pts[0].clientY + pts[1].clientY) / 2;
        const s = current(); if (!s) return;
        if (!pinchStart) { pinchStart = { dist: dist, zoom: s.zoom }; return; }
        zoomAt(clamp(pinchStart.zoom * (dist / pinchStart.dist), MIN_ZOOM, MAX_ZOOM), cx, cy);
      });
      function clearPointer(e) { pointers.delete(e.pointerId); if (pointers.size < 2) pinchStart = null; }
      frame.addEventListener("pointerup", clearPointer);
      frame.addEventListener("pointercancel", clearPointer);
      frame.addEventListener("pointerleave", clearPointer);

      /* keep the point under the cursor fixed while zooming */
      function zoomAt(nextZoom, clientX, clientY) {
        const s = current(); if (!s) return;
        const r = frame.getBoundingClientRect();
        const fx = clientX == null ? r.width / 2 : clientX - r.left;
        const fy = clientY == null ? r.height / 2 : clientY - r.top;
        const oldLeft = -(s.zoom - 1) * s.posX * r.width;
        const oldTop = -(s.zoom - 1) * s.posY * r.height;
        const u = (fx - oldLeft) / (s.zoom * r.width);
        const v = (fy - oldTop) / (s.zoom * r.height);
        const panW = (nextZoom - 1) * r.width, panH = (nextZoom - 1) * r.height;
        s.zoom = nextZoom;
        s.posX = panW > 0 ? clamp(-(fx - u * nextZoom * r.width) / panW, 0, 1) : 0.5;
        s.posY = panH > 0 ? clamp(-(fy - v * nextZoom * r.height) / panH, 0, 1) : 0.5;
        paint();
      }

      zoomEl.oninput = function () { zoomAt(clamp(num(zoomEl.value, 1), MIN_ZOOM, MAX_ZOOM), null, null); };
      pxEl.oninput = function () { const s = current(); if (s) { s.posX = clamp(num(pxEl.value, .5), 0, 1); paint(); } };
      pyEl.oninput = function () { const s = current(); if (s) { s.posY = clamp(num(pyEl.value, .5), 0, 1); paint(); } };

      q("[data-fw]").value = cfg.frameWidth;
      q("[data-fh]").value = cfg.frameHeight;
      q("[data-fw]").oninput = function () { cfg.frameWidth = this.value.trim(); paint(); };
      q("[data-fh]").oninput = function () { cfg.frameHeight = num(this.value, 360); paint(); };

      const modeEl = q("[data-mode]"), showOpts = q("[data-showopts]"),
        durPick = q("[data-durpick]"), durCustom = q("[data-durcustom]"), durEl = q("[data-dur]"),
        transEl = q("[data-transition]");
      modeEl.value = cfg.mode;
      transEl.value = cfg.transition;
      durEl.value = cfg.duration;
      durPick.value = ["1", "3", "5", "10"].indexOf(String(cfg.duration)) >= 0 ? String(cfg.duration) : "custom";
      function syncMode() {
        showOpts.hidden = modeEl.value !== "slideshow";
        durCustom.hidden = durPick.value !== "custom";
      }
      modeEl.onchange = function () { cfg.mode = modeEl.value; syncMode(); };
      durPick.onchange = function () {
        if (durPick.value !== "custom") { cfg.duration = num(durPick.value, 5); durEl.value = cfg.duration; }
        syncMode();
      };
      durEl.oninput = function () { cfg.duration = clamp(num(durEl.value, 5), 0.5, 120); };
      transEl.onchange = function () { cfg.transition = transEl.value; };
      syncMode();

      ov.addEventListener("click", async function (e) {
        const act = e.target && e.target.dataset ? e.target.dataset.act : "";
        if (!act) { if (e.target === ov) close(null); return; }
        if (act === "cancel") return close(null);
        if (act === "save") { cfg.slides = cfg.slides.map(normalizeSlide).filter(function (s) { return s.url; }); return close(cfg.slides.length ? normalize(cfg) : null); }
        if (act === "disable") return close(false); /* false = clear advanced settings */
        if (act === "reset") { const s = current(); if (s) { s.zoom = 1; s.posX = .5; s.posY = .5; paint(); } return; }
        if (act === "zoom-in") return zoomAt(clamp((current() || {}).zoom * 1.2, MIN_ZOOM, MAX_ZOOM), null, null);
        if (act === "zoom-out") return zoomAt(clamp((current() || {}).zoom / 1.2, MIN_ZOOM, MAX_ZOOM), null, null);
        if (act === "add") {
          const url = q("[data-newurl]").value.trim();
          if (!url) return;
          cfg.slides.push(normalizeSlide({ url: url }));
          active = cfg.slides.length - 1;
          q("[data-newurl]").value = "";
          paintSlides(); paint();
          return;
        }
        if (act === "library") {
          if (typeof EDC_MEDIA === "undefined" || !EDC_MEDIA.open) { alert("Media library is not available on this page."); return; }
          const picked = await EDC_MEDIA.open();
          if (picked && picked.url) {
            cfg.slides.push(normalizeSlide({ url: picked.url, alt: picked.alt_text || "" }));
            active = cfg.slides.length - 1;
            paintSlides(); paint();
          }
        }
      });

      function onKey(e) { if (e.key === "Escape") close(null); }
      document.addEventListener("keydown", onKey);

      function close(result) {
        document.removeEventListener("keydown", onKey);
        ov.remove();
        resolve(result);
      }

      paintSlides();
      paint();
      requestAnimationFrame(paint);
    });
  }

  return { open: open, normalize: normalize, normalizeSlide: normalizeSlide, layerStyle: layerStyle, MIN_ZOOM: MIN_ZOOM, MAX_ZOOM: MAX_ZOOM };
})();
if (typeof window !== "undefined") window.EDC_IMAGE_EDITOR = EDC_IMAGE_EDITOR;
