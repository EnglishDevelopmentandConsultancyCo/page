/* global EDC_MEDIA */
/**
 * IMAGE-FIELD-AUTOBINDER.JS  —  NEW FILE
 * ---------------------------------------------------------------
 * Replaces the manual per-field binding in README step 6. Load it ONCE in
 * admin.html (after media-picker.js) and it does the rest:
 *
 *   It watches the Page Builder section editor and automatically inserts a
 *   "Pick image" button next to every image-URL field. Click it -> the media
 *   picker opens -> the chosen URL is written into the field and the builder's
 *   save logic is notified. If the section has alt-text / caption fields, those
 *   are filled too.
 *
 * A field is treated as an image field if ANY of these is true:
 *   - it has the attribute  data-edc-image-field   (use this to force-bind a
 *     field the auto-detect misses)
 *   - its name or id contains: image, photo, src, banner, hero, thumb,
 *     avatar, logo, cover, picture
 *   - it is <input type="url"> and its placeholder mentions an image
 * ---------------------------------------------------------------
 */
(function () {
  if (!window.EDC_MEDIA) { console.error("image-field-autobinder.js needs EDC_MEDIA (load media-picker.js first)"); return; }

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

  function bind(input) {
    if (input.dataset.edcBound === "1") return;
    input.dataset.edcBound = "1";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "🖼 Pick image";
    btn.className = "btn btn-outline btn-sm";
    btn.style.cssText = "margin-left:6px;vertical-align:middle;cursor:pointer;";
    btn.onclick = async () => {
      const picked = await EDC_MEDIA.open();
      if (!picked) return;
      input.value = picked.url || "";
      fire(input);

      const scope = input.closest("section, fieldset, .section-editor, .section-fields, .edc-section-editor, form, div");
      const alt = scope && scope.querySelector('input[name*="alt" i], textarea[name*="alt" i], input[id*="alt" i]');
      const cap = scope && scope.querySelector('input[name*="caption" i], textarea[name*="caption" i], input[id*="caption" i]');
      if (alt && picked.alt_text) { alt.value = picked.alt_text; fire(alt); }
      if (cap && picked.caption) { cap.value = picked.caption; fire(cap); }
    };

    if (input.parentNode) input.parentNode.insertBefore(btn, input.nextSibling);
  }

  function scan(root) {
    (root || document).querySelectorAll("input").forEach((input) => {
      if (looksLikeImageField(input)) bind(input);
    });
  }

  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node && node.querySelectorAll) scan(node);
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  // initial sweep + a couple of re-sweeps in case the editor renders late
  scan(document);
  setTimeout(() => scan(document), 600);
  setTimeout(() => scan(document), 2000);
})();