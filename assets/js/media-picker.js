/**
 * MEDIA-PICKER.JS  —  NEW FILE  (load after api.js + api-extras.js)
 * ---------------------------------------------------------------
 * A reusable image picker for the Page Builder:
 *   - Upload a file with client-side CROP (aspect presets + zoom) and RESIZE.
 *   - Paste a Google Drive share link (auto-converted to a direct image URL).
 *   - Pick from the existing Media Library.
 *
 * Usage:
 *   const picked = await EDC_MEDIA.open();   // { url, alt_text, caption, width, source } | null
 *   EDC_MEDIA.normalizeDriveUrl("https://drive.google.com/file/d/XXX/view")
 *
 * It is self-contained (styles inline) and does not touch any other script.
 * ---------------------------------------------------------------
 */
(function () {
  const api = window.EDC_API;
  if (!api) { console.error("media-picker.js needs EDC_API (load api.js + api-extras.js first)"); return; }

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function normalizeDriveUrl(input) {
    const s = String(input || "").trim();
    if (!s) return "";
    let id = "";
    const m1 = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const m2 = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const m3 = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m1) id = m1[1]; else if (m2) id = m2[1]; else if (m3) id = m3[1];
    if (id) return "https://drive.google.com/thumbnail?id=" + id + "&sz=w1600";
    return s;
  }

  function el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function fileToDataUrl(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); }); }
  function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("Could not load image")); i.src = src; }); }

  const ASPECTS = { "free": null, "1:1": 1, "4:3": 4 / 3, "16:9": 16 / 9, "3:2": 3 / 2 };

  function modalShell() {
    const ov = el("div"); ov.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:inherit;";
    const box = el("div"); box.style.cssText = "background:#fff;border-radius:14px;width:min(720px,94vw);max-height:92vh;overflow:auto;padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.35);";
    box.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">' +
      '<h3 style="margin:0;font-size:1.15rem;">Choose an image</h3>' +
      '<button data-close style="border:none;background:none;font-size:1.5rem;cursor:pointer;line-height:1;">×</button></div>' +
      '<div data-tabs style="display:flex;gap:8px;margin-bottom:16px;border-bottom:1px solid #eee;"></div>' +
      '<div data-body></div>';
    ov.appendChild(box); document.body.appendChild(ov);
    const close = () => ov.remove();
    box.querySelector("[data-close]").onclick = close;
    ov.addEventListener("click", e => { if (e.target === ov) close(); });
    return { ov, box, close };
  }

  function tabs(box, names, onSwitch) {
    const wrap = box.querySelector("[data-tabs]");
    wrap.innerHTML = "";
    const btns = names.map((n, i) => {
      const b = el("button"); b.textContent = n;
      b.dataset.i = i;
      b.style.cssText = "padding:8px 14px;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;font:inherit;color:#555;";
      return b;
    });
    wrap.append(...btns);
    btns.forEach(b => b.onclick = () => { btns.forEach(x => { x.style.borderBottomColor = "transparent"; x.style.color = "#555"; }); b.style.borderBottomColor = "#0f766e"; b.style.color = "#0f766e"; onSwitch(Number(b.dataset.i)); });
    btns[0].click();
  }

  // ---------- Upload + crop ----------
  function uploadPane(box, resolve, close) {
    const body = box.querySelector("[data-body]");
    body.innerHTML =
      '<input type="file" accept="image/*" id="mpFile" style="margin-bottom:12px;">' +
      '<div style="display:flex;gap:16px;flex-wrap:wrap;">' +
        '<div><canvas id="mpCanvas" width="360" height="240" style="border:1px solid #eee;border-radius:8px;background:#fafafa;display:block;"></canvas></div>' +
        '<div style="flex:1;min-width:220px;">' +
          '<label style="font-size:.8rem;color:#666;">Aspect ratio</label><br>' +
          '<select id="mpAspect" class="input" style="margin:6px 0 14px;">' + Object.keys(ASPECTS).map(a => `<option value="${a}">${a}</option>`).join("") + '</select><br>' +
          '<label style="font-size:.8rem;color:#666;">Zoom / crop tighter</label>' +
          '<input type="range" id="mpZoom" min="1" max="4" step="0.05" value="1" style="width:100%;margin:6px 0 14px;">' +
          '<label style="font-size:.8rem;color:#666;">Output max width (px)</label>' +
          '<input type="number" id="mpMaxW" value="1200" min="100" max="4000" class="input" style="margin:6px 0 14px;width:140px;">' +
          '<label style="font-size:.8rem;color:#666;">Alt text</label>' +
          '<input type="text" id="mpAlt" class="input" style="margin:6px 0;width:100%;" placeholder="Describe the image">' +
          '<label style="font-size:.8rem;color:#666;">Caption</label>' +
          '<input type="text" id="mpCap" class="input" style="margin:6px 0;width:100%;" placeholder="Optional caption">' +
        '</div>' +
      '</div>' +
      '<div style="text-align:right;margin-top:14px;"><button id="mpSave" class="btn btn-primary">Save image</button></div>';

    const fileIn = body.querySelector("#mpFile");
    const canvas = body.querySelector("#mpCanvas");
    const ctx = canvas.getContext("2d");
    let img = null;

    function aspectOf() { return ASPECTS[body.querySelector("#mpAspect").value]; }

    function draw() {
      if (!img) return;
      const ratio = aspectOf();
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const zoom = Number(body.querySelector("#mpZoom").value);
      let cw = iw / zoom;
      let ch = ratio ? cw / ratio : ih / (iw / cw);
      if (ratio) { if (ch > ih) { ch = ih; cw = ch * ratio; } if (cw > iw) cw = iw; }
      const x = (iw - cw) / 2, y = (ih - ch) / 2;
      // preview
      const PW = 360;
      const pr = ratio ? ratio : cw / ch;
      const ph = Math.round(PW / pr);
      canvas.width = PW; canvas.height = Math.min(ph, 360);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, x, y, cw, ch, 0, 0, canvas.width, canvas.height);
      canvas._crop = { x, y, cw, ch };
    }

    fileIn.onchange = async () => {
      const f = fileIn.files[0]; if (!f) return;
      try { const url = await fileToDataUrl(f); img = await loadImg(url); draw(); }
      catch (e) { alert(e.message); }
    };
    body.querySelector("#mpAspect").onchange = draw;
    body.querySelector("#mpZoom").oninput = draw;

    body.querySelector("#mpSave").onclick = async () => {
      if (!img || !canvas._crop) { alert("Choose an image file first."); return; }
      const { x, y, cw, ch } = canvas._crop;
      const maxW = Math.min(4000, Math.max(100, Number(body.querySelector("#mpMaxW").value) || 1200));
      const outW = Math.round(maxW);
      const outH = Math.round(maxW * (ch / cw));
      const out = document.createElement("canvas");
      out.width = outW; out.height = outH;
      out.getContext("2d").drawImage(img, x, y, cw, ch, 0, 0, outW, outH);
      const dataUrl = out.toDataURL("image/jpeg", 0.9);
      const base64 = dataUrl.split(",")[1];
      const saveBtn = body.querySelector("#mpSave"); saveBtn.disabled = true; saveBtn.textContent = "Saving…";
      const r = await api.uploadMedia({
        base64Data: base64, mimeType: "image/jpeg", fileName: "upload-" + Date.now() + ".jpg",
        alt_text: body.querySelector("#mpAlt").value, caption: body.querySelector("#mpCap").value,
        category: "PageBuilder", width: outW, height: outH
      });
      saveBtn.disabled = false; saveBtn.textContent = "Save image";
      if (!r.success) { alert((r.error && r.error.message) || "Upload failed."); return; }
      close(); resolve(r.data);
    };
  }

  // ---------- Drive link ----------
  function linkPane(box, resolve, close) {
    const body = box.querySelector("[data-body]");
    body.innerHTML =
      '<p style="color:#666;font-size:.9rem;">Paste a Google Drive share link (or any image URL). Drive links are converted to a direct, embeddable image URL.</p>' +
      '<input type="text" id="mpLink" class="input" style="margin:10px 0;width:100%;" placeholder="https://drive.google.com/file/d/XXXX/view?usp=sharing">' +
      '<img id="mpPreview" style="max-width:100%;max-height:260px;border-radius:8px;display:none;margin:10px 0;border:1px solid #eee;">' +
      '<label style="font-size:.8rem;color:#666;">Alt text</label>' +
      '<input type="text" id="mpAlt2" class="input" style="margin:6px 0;width:100%;">' +
      '<label style="font-size:.8rem;color:#666;">Caption</label>' +
      '<input type="text" id="mpCap2" class="input" style="margin:6px 0;width:100%;">' +
      '<div style="text-align:right;margin-top:10px;"><button id="mpSave2" class="btn btn-primary">Save image</button></div>';
    const link = body.querySelector("#mpLink");
    const preview = body.querySelector("#mpPreview");
    let norm = "";
    link.oninput = () => { norm = normalizeDriveUrl(link.value); if (norm) { preview.src = norm; preview.style.display = "block"; preview.onerror = () => { preview.style.display = "none"; }; } else preview.style.display = "none"; };
    body.querySelector("#mpSave2").onclick = async () => {
      if (!norm) { alert("Paste a valid link first."); return; }
      const btn = body.querySelector("#mpSave2"); btn.disabled = true; btn.textContent = "Saving…";
      const r = await api.uploadMedia({
        source_url: norm, alt_text: body.querySelector("#mpAlt2").value,
        caption: body.querySelector("#mpCap2").value, category: "PageBuilder"
      });
      btn.disabled = false; btn.textContent = "Save image";
      if (!r.success) { alert((r.error && r.error.message) || "Save failed."); return; }
      close(); resolve(r.data);
    };
  }

  // ---------- Library ----------
  async function libraryPane(box, resolve, close) {
    const body = box.querySelector("[data-body]");
    body.innerHTML = '<div id="mpGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;"></div>';
    const grid = body.querySelector("#mpGrid");
    grid.innerHTML = '<p style="grid-column:1/-1;color:#888;">Loading…</p>';
    const r = await api.getMedia();
    const list = (r.data) || [];
    if (!list.length) { grid.innerHTML = '<p style="grid-column:1/-1;color:#888;text-align:center;">No images in the library yet — use Upload or Drive link.</p>'; return; }
    grid.innerHTML = list.map(im =>
      '<figure style="margin:0;cursor:pointer;text-align:center;" data-id="' + esc(im.media_id) + '" data-url="' + esc(im.url) + '" data-alt="' + esc(im.alt_text || "") + '" data-cap="' + esc(im.caption || "") + '">' +
      '<img src="' + esc(im.url) + '" alt="' + esc(im.alt_text) + '" style="width:100%;height:120px;object-fit:cover;border-radius:8px;border:2px solid transparent;">' +
      '<figcaption style="font-size:.72rem;color:#666;margin-top:.3rem;">' + esc(im.alt_text || im.category || "image") + '</figcaption></figure>'
    ).join("");
    grid.querySelectorAll("figure").forEach(f => f.onclick = () => {
      grid.querySelectorAll("img").forEach(i => i.style.borderColor = "transparent");
      f.querySelector("img").style.borderColor = "#0f766e";
      grid._pick = { url: f.dataset.url, alt_text: f.dataset.alt, caption: f.dataset.cap, source: "library", media_id: f.dataset.id };
    });
    const bar = el("div"); bar.style.cssText = "text-align:right;margin-top:14px;";
    bar.innerHTML = '<button id="mpPick" class="btn btn-primary">Use selected</button>';
    body.appendChild(bar);
    bar.querySelector("#mpPick").onclick = () => { if (!grid._pick) { alert("Select an image first."); return; } close(); resolve(grid._pick); };
  }

  window.EDC_MEDIA = {
    normalizeDriveUrl: normalizeDriveUrl,
    open: function (opts) {
      opts = opts || {};
      return new Promise((resolve) => {
        const { box, close } = modalShell();
        tabs(box, ["Upload & crop", "Drive link", "Library"], (i) => {
          if (i === 0) uploadPane(box, resolve, close);
          else if (i === 1) linkPane(box, resolve, close);
          else libraryPane(box, resolve, close);
        });
      });
    }
  };
})();