/**
 * POPUPS.JS — renders active popup/banner/bar campaigns.
 * Frequency: once(localStorage) | session(sessionStorage) | always.
 */
const EDC_POPUPS = (() => {
  function pageSlug() {
    const p = window.location.pathname.split("/").pop() || "index.html";
    return p.replace(/\.html$/, "") || "index";
  }
  function seenKey(id) { return "edc_popup_seen_" + id; }
  function shouldShow(c) {
    const f = String(c.frequency || "once").toLowerCase();
    if (f === "always") return true;
    const store = f === "session" ? sessionStorage : localStorage;
    return !store.getItem(seenKey(c.campaign_id));
  }
  function markSeen(c) {
    const f = String(c.frequency || "once").toLowerCase();
    if (f === "always") return;
    const store = f === "session" ? sessionStorage : localStorage;
    store.setItem(seenKey(c.campaign_id), "1");
  }
  async function init() {
    try {
      const res = await EDC_API.getActivePopups({ page: pageSlug() });
      if (res && res.success) (res.data || []).forEach(render);
    } catch (e) { /* non-essential */ }
  }
  function render(c) {
    if (!shouldShow(c)) return;
    if (c.type === "bar") return renderBar(c);
    if (c.type === "banner") return renderBanner(c);
    return renderModal(c);
  }
  function el(tag, cls, html) {
    const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m])); }
  function safeUrl(url) {
    const value = String(url || "").trim();
    return /^(https?:|mailto:|tel:|\/|\.\/|\.\.\/)/i.test(value) ? value : "#";
  }
  function closeBtn(target) {
    const b = el("button", "edc-popup-close", "×"); b.setAttribute("aria-label", "Close");
    b.onclick = () => target.remove(); return b;
  }
  function renderBar(c) {
    const bar = el("div", "edc-popup edc-popup-bar");
    bar.innerHTML = `<span class="edc-popup-text">${esc(c.title || c.content_html || "")}</span>`;
    if (c.cta_label && c.cta_url) {
      const a = el("a", "edc-popup-cta", esc(c.cta_label)); a.href = safeUrl(c.cta_url); bar.appendChild(a);
    }
    bar.appendChild(closeBtn(bar)); document.body.prepend(bar); markSeen(c);
  }
  function renderBanner(c) {
    const banner = el("div", "edc-popup edc-popup-banner");
    banner.innerHTML = `<div class="edc-popup-banner-inner">
      ${c.image_url ? `<img src="${esc(c.image_url)}" alt="${esc(c.title)}" class="edc-popup-banner-img">` : ""}
      <div class="edc-popup-banner-body">
        ${c.title ? `<h3>${esc(c.title)}</h3>` : ""}
        <div class="edc-popup-content">${c.content_html || ""}</div>
        ${c.cta_label && c.cta_url ? `<a class="edc-popup-cta" href="${esc(safeUrl(c.cta_url))}">${esc(c.cta_label)}</a>` : ""}
      </div></div>`;
    banner.appendChild(closeBtn(banner)); document.body.appendChild(banner); markSeen(c);
  }
  function renderModal(c) {
    const overlay = el("div", "edc-popup edc-popup-overlay");
    const box = el("div", "edc-popup-modal");
    box.innerHTML = `
      ${c.image_url ? `<img src="${esc(c.image_url)}" alt="${esc(c.title)}" class="edc-popup-modal-img">` : ""}
      ${c.title ? `<h3 class="edc-popup-modal-title">${esc(c.title)}</h3>` : ""}
      <div class="edc-popup-content">${c.content_html || ""}</div>
      <div class="edc-popup-actions">
        ${c.cta_label && c.cta_url ? `<a class="edc-popup-cta" href="${esc(safeUrl(c.cta_url))}">${esc(c.cta_label)}</a>` : ""}
        <button class="edc-popup-dismiss" type="button">Dismiss</button>
      </div>`;
    overlay.appendChild(box); box.appendChild(closeBtn(overlay));
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    box.querySelector(".edc-popup-dismiss").onclick = () => overlay.remove();
    document.body.appendChild(overlay); markSeen(c);
  }
  return { init, pageSlug };
})();
document.addEventListener("DOMContentLoaded", EDC_POPUPS.init);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) EDC_POPUPS.init();
});