/**
 * PAGEBUILDER.JS — drag-and-drop section editor for admins.
 * Mount: EDC_PAGEBUILDER.init('#edc-pagebuilder').  Uses HTML5 DnD.
 */
const EDC_PAGEBUILDER = (() => {
  let state = { pages: [], activePageId: null }, root;
  async function init(selector) {
    root = document.querySelector(selector); if (!root) return;
    if (!(EDC_API.getSession && EDC_API.getSession())) { root.innerHTML = '<p class="edc-muted">Log in to edit pages.</p>'; return; }
    await loadPages(); renderShell();
  }
  async function loadPages() { const r = await EDC_API.getPages(); state.pages = r.success ? (r.data || []) : []; }
  async function loadSections(pageId) {
    state.activePageId = pageId;
    const r = await EDC_API.getSections(pageId);
    state.sections = r.success ? (r.data || []) : [];
    renderSections();
  }
  function renderShell() {
    root.innerHTML = `<div class="edc-pb-layout">
      <aside class="edc-pb-pages"><h3>Pages</h3><ul class="edc-pb-pagelist"></ul>
        <button class="edc-btn edc-btn-sm" id="edc-pb-newpage">+ New page</button></aside>
      <section class="edc-pb-canvas">
        <div class="edc-pb-canvas-head"><h3>Sections</h3><div>
          <button class="edc-btn edc-btn-sm" id="edc-pb-add">+ Add section</button>
          <button class="edc-btn edc-btn-primary edc-btn-sm" id="edc-pb-save-order">Save order</button>
        </div></div>
        <div class="edc-pb-sections"></div>
      </section></div>`;
    renderPageList();
    root.querySelector("#edc-pb-newpage").onclick = newPage;
    root.querySelector("#edc-pb-add").onclick = addSection;
    root.querySelector("#edc-pb-save-order").onclick = saveOrder;
  }
  function renderPageList() {
    const ul = root.querySelector(".edc-pb-pagelist"); ul.innerHTML = "";
    state.pages.forEach(p => {
      const li = document.createElement("li");
      li.textContent = p.nav_label || p.slug;
      li.className = p.page_id === state.activePageId ? "active" : "";
      li.onclick = () => loadSections(p.page_id);
      ul.appendChild(li);
    });
  }
  function renderSections() {
    const box = root.querySelector(".edc-pb-sections"); box.innerHTML = "";
    if (!state.sections.length) { box.innerHTML = '<p class="edc-muted">No sections yet. Add one.</p>'; return; }
    state.sections.forEach((s, i) => box.appendChild(sectionCard(s, i)));
  }
  function sectionCard(s, i) {
    const card = document.createElement("div"); card.className = "edc-pb-section"; card.draggable = true; card.dataset.id = s.section_id;
    let content; try { content = JSON.stringify(JSON.parse(s.content_json || "{}"), null, 2); } catch (e) { content = s.content_json || "{}"; }
    card.innerHTML = `<div class="edc-pb-section-head">
        <span class="edc-pb-grip" title="Drag to reorder">⠿</span>
        <strong>${esc(s.type || "section")}</strong>
        <span class="edc-pb-meta">${String(s.visible) === "false" ? "hidden" : "visible"} · #${i+1}</span>
        <div class="edc-pb-section-actions">
          <button data-act="edit" class="edc-btn edc-btn-sm">Edit</button>
          <button data-act="toggle" class="edc-btn edc-btn-sm">${String(s.visible) === "false" ? "Show" : "Hide"}</button>
          <button data-act="delete" class="edc-btn edc-btn-sm edc-btn-danger">Delete</button>
        </div></div>
      <pre class="edc-pb-content">${esc(content)}</pre>`;
    card.querySelector('[data-act="edit"]').onclick = () => editSection(s);
    card.querySelector('[data-act="toggle"]').onclick = () => toggleVisible(s);
    card.querySelector('[data-act="delete"]').onclick = () => deleteSection(s);
    card.addEventListener("dragstart", e => { card.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
    card.addEventListener("dragover", e => {
      e.preventDefault(); const d = root.querySelector(".dragging"); if (!d || d === card) return;
      const r = card.getBoundingClientRect(); const after = (e.clientY - r.top) > r.height / 2;
      card.parentNode.insertBefore(d, after ? card.nextSibling : card);
    });
    return card;
  }
  async function addSection() {
    if (!state.activePageId) return alert("Select a page first.");
    const type = prompt("Section type (text, hero, image, grid, cta):", "text"); if (!type) return;
    const r = await EDC_API.createSection({ page_id: state.activePageId, type, content_json: {} });
    EDC_UI.toast(r.message || r.error?.message || "Unable to add section.", r.success ? "success" : "error");
    if (r.success) await loadSections(state.activePageId);
  }
  async function editSection(s) {
    const raw = prompt("Edit content (JSON):", s.content_json || "{}"); if (raw === null) return;
    let json; try { json = JSON.parse(raw); } catch (e) { return alert("Invalid JSON."); }
    const r = await EDC_API.updateSection({ page_id: state.activePageId, section_id: s.section_id, content_json: json });
    EDC_UI.toast(r.message || r.error?.message || "Unable to save section.", r.success ? "success" : "error");
    if (r.success) await loadSections(state.activePageId);
  }
  async function toggleVisible(s) {
    const r = await EDC_API.updateSection({ page_id: state.activePageId, section_id: s.section_id, visible: String(s.visible) === "false" });
    EDC_UI.toast(r.message || r.error?.message || "Unable to update section visibility.", r.success ? "success" : "error");
    if (r.success) await loadSections(state.activePageId);
  }
  async function deleteSection(s) {
    if (!confirm("Delete this section?")) return;
    const r = await EDC_API.deleteSection(s.section_id, state.activePageId);
    EDC_UI.toast(r.message || r.error?.message || "Unable to delete section.", r.success ? "success" : "error");
    if (r.success) await loadSections(state.activePageId);
  }
  async function saveOrder() {
    const ids = Array.from(root.querySelectorAll(".edc-pb-section")).map(c => c.dataset.id);
    const r = await EDC_API.reorderSections(state.activePageId, ids);
    EDC_UI.toast(r.message || r.error?.message || "Unable to save order.", r.success ? "success" : "error");
    if (r.success) await loadSections(state.activePageId);
  }
  async function newPage() {
    const slug = prompt("Page slug (e.g. about):"); if (!slug) return;
    const r = await EDC_API.savePage({ slug, nav_label: slug, in_navigation: false, order: state.pages.length });
    EDC_UI.toast(r.message || r.error?.message || "Unable to save page.", r.success ? "success" : "error");
    if (r.success) { await loadPages(); renderPageList(); }
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[m])); }
  return { init };
})();