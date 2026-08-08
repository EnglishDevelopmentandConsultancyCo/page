/**
 * PUBLIC-PAGE.JS — renders published Page Builder sections.
 *
 * The existing static page content remains the safe fallback. When a matching
 * Pages row has visible Sections, those sections are fetched from Apps Script
 * and rendered into a live content region so admin edits are visible without
 * editing or redeploying HTML.
 */
const EDC_PUBLIC_PAGE = (() => {
  function slug() {
    const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    return file === "index.html" ? "index" : file.replace(/\.html$/, "");
  }

  function esc(value) {
    return EDC_UI.escapeHtml(value == null ? "" : value);
  }

  function contentOf(section) {
    try {
      const parsed = JSON.parse(section.content_json || "{}");
      return parsed && typeof parsed === "object" ? parsed : { text: String(parsed) };
    } catch (e) {
      return { text: section.content_json || "" };
    }
  }

  function safeImage(url) {
    return /^https?:\/\//i.test(String(url || "")) ? String(url) : "";
  }

  function renderSection(section) {
    const data = contentOf(section);
    const type = String(section.type || "text").toLowerCase();
    const title = data.title || data.heading || "";
    const body = data.body || data.text || data.content || "";
    const image = safeImage(data.image_url || data.image || data.src);
    const link = /^https?:\/\//i.test(String(data.cta_url || data.url || "")) || /^(?:[\w-]+\.html|#)/i.test(String(data.cta_url || data.url || ""))
      ? String(data.cta_url || data.url) : "";

    if (type === "hero") {
      return `<section class="section hero edc-live-section"><div class="container">
        <span class="eyebrow">${esc(data.eyebrow || "EDC")}</span>
        ${title ? `<h1>${esc(title)}</h1>` : ""}
        ${body ? `<p class="lead">${esc(body)}</p>` : ""}
        ${image ? `<div class="hero-photo edc-live-image"><img src="${esc(image)}" alt="${esc(data.alt || title)}"></div>` : ""}
        ${link ? `<a class="btn btn-gold" href="${esc(link)}">${esc(data.cta_label || "Learn more")}</a>` : ""}
      </div></section>`;
    }
    if (type === "image") {
      return `<section class="section edc-live-section"><div class="container">
        ${title ? `<div class="section-head"><h2>${esc(title)}</h2></div>` : ""}
        ${image ? `<img class="edc-live-image" src="${esc(image)}" alt="${esc(data.alt || title)}">` : ""}
        ${body ? `<p class="mt-4">${esc(body)}</p>` : ""}
      </div></section>`;
    }
    if (type === "grid") {
      const items = Array.isArray(data.items) ? data.items : [];
      return `<section class="section edc-live-section"><div class="container">
        ${title ? `<div class="section-head"><h2>${esc(title)}</h2></div>` : ""}
        <div class="grid grid-${items.length >= 3 ? "3" : "2"}">${items.map(item => `
          <div class="card"><div class="card-body">
            ${item.title ? `<h3>${esc(item.title)}</h3>` : ""}
            ${item.text || item.body ? `<p class="muted">${esc(item.text || item.body)}</p>` : ""}
          </div></div>`).join("")}</div>
      </div></section>`;
    }
    if (type === "cta") {
      return `<section class="section edc-live-section"><div class="container"><div class="cta-band">
        <div>${title ? `<h2>${esc(title)}</h2>` : ""}${body ? `<p>${esc(body)}</p>` : ""}</div>
        ${link ? `<a class="btn btn-gold" href="${esc(link)}">${esc(data.cta_label || "Learn more")}</a>` : ""}
      </div></div></section>`;
    }
    return `<section class="section edc-live-section"><div class="container">
      ${title ? `<div class="section-head"><h2>${esc(title)}</h2></div>` : ""}
      ${body ? `<p>${esc(body)}</p>` : ""}
      ${image ? `<img class="edc-live-image mt-4" src="${esc(image)}" alt="${esc(data.alt || title)}">` : ""}
      ${link ? `<a class="btn btn-primary mt-4" href="${esc(link)}">${esc(data.cta_label || "Learn more")}</a>` : ""}
    </div></section>`;
  }

  async function render() {
    if (!window.EDC_API || !window.EDC_CONFIG || EDC_CONFIG.DEMO_MODE) return;
    const result = await EDC_API.getPublicPage(slug());
    if (!result.success || !result.data || !result.data.sections?.length) return;
    const sections = result.data.sections.filter(section => String(section.visible).toLowerCase() !== "false");
    if (!sections.length) return;
    const mount = document.createElement("div");
    mount.id = "edc-live-page-sections";
    mount.innerHTML = sections.map(renderSection).join("");
    const footer = document.getElementById("site-footer");
    if (footer) footer.parentNode.insertBefore(mount, footer);
    else document.body.appendChild(mount);
  }

  document.addEventListener("DOMContentLoaded", render);
  return { render };
})();