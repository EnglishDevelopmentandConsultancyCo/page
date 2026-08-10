/* global EDC_MEDIA */
/**
 * IMAGE-FIELD-AUTOBINDER.JS — load once in admin.html (after media-picker.js
 * preferred, but works even if loaded BEFORE it — the picker is opened on click).
 * ---------------------------------------------------------------
 * Auto-adds a "🖼 Pick image" button next to any image-URL <input> anywhere in
 * the admin — including Page Builder section editors AND the Homepage Layout
 * hero-photo fields. Also wires any element marked data-edc-image-field.
 *
 * An <input> is treated as an image field if ANY is true:
 *   - it has the attribute  data-edc-image-field
 *   - its name or id contains: image, photo, src, banner, hero, thumb,
 *     avatar, logo, cover, picture
 *   - it is <input type="url"> and its placeholder mentions an image
 *
 * If the Homepage Layout hero photo control is a button/thumbnail (not an
 * <input>), add  data-edc-image-field  to it (and optionally
 * data-edc-image-target="#heroPhotoInput" to point at the URL field).
 * ---------------------------------------------------------------
 */
(function () {
  const NAME_RE = /image|photo|\bsrc\b|banner|hero|thumb|avatar|logo|cover|picture/i;

  function looksLikeImageField(input) {
    if (!input || input.tagName !== "INPUT") return false;
    if (input.hasAttribute("data-edc-image-field")) return true;
    const id = (input.name || "") + " " + (input.id || "");
    if (NAME_RE.test(id)) return true;
    if (input.type === "url" && NAME_RE.test(input.placeholder || "")) return true;
    return false;
  }

  function fire(input) {
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function openPicker(onPick) {
    if (!window.EDC_MEDIA || !EDC_MEDIA.open) {
      alert('Media picker not loaded. Add <script src="assets/js/media-picker.js"></script> before this script in admin.html.');
      return;
    }
    EDC_MEDIA.open().then(function (p) { if (p && onPick) onPick(p); });
  }

  function bindInput(input) {
    if (input.dataset.edcBound === "1") return;
    input.dataset.edcBound = "1";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "🖼 Pick image";
    btn.className = "btn btn-outline btn-sm";
    btn.style.cssText = "margin-left:6px;vertical-align:middle;cursor:pointer;";
    btn.onclick = function () {
      openPicker(function (picked) {
        input.value = picked.url || "";
        fire(input);
        const scope = input.closest("section, fieldset, .section-editor, .section-fields, .edc-section-editor, form, .field-row, .field, div");
        const alt = scope && scope.querySelector('input[name*="alt" i], textarea[name*="alt" i], input[id*="alt" i]');
        const cap = scope && scope.querySelector('input[name*="caption" i], textarea[name*="caption" i], input[id*="caption" i]');
        if (alt && picked.alt_text) { alt.value = picked.alt_text; fire(alt); }
        if (cap && picked.caption) { cap.value = picked.caption; fire(cap); }
      });
    };
    if (input.parentNode) input.parentNode.insertBefore(btn, input.nextSibling);
  }

  function bindMarker(el) {
    if (el.dataset.edcBound === "1") return;
    el.dataset.edcBound = "1";
    el.style.cursor = "pointer";
    el.onclick = function () {
      openPicker(function (picked) {
        const targetSel = el.getAttribute("data-edc-image-target");
        const scope = el.closest("div, fieldset, .field, .field-row") || document;
        const target = targetSel ? document.querySelector(targetSel) : scope.querySelector("input");
        if (target) { target.value = picked.url || ""; fire(target); }
        const img = scope.querySelector("img");
        if (img) img.src = picked.url || "";
      });
    };
  }

  function scan(root) {
    (root || document).querySelectorAll("input").forEach(function (input) { if (looksLikeImageField(input)) bindInput(input); });
    (root || document).querySelectorAll("[data-edc-image-field]").forEach(function (el) { if (el.tagName !== "INPUT") bindMarker(el); });
  }

  const mo = new MutationObserver(function (mutations) {
    for (let i = 0; i < mutations.length; i++) {
      const added = mutations[i].addedNodes;
      for (let j = 0; j < added.length; j++) {
        const node = added[j];
        if (node && node.querySelectorAll) scan(node);
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  scan(document);
  setTimeout(function () { scan(document); }, 600);
  setTimeout(function () { scan(document); }, 2000);
})();