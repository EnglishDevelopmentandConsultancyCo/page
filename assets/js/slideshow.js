/**
 * SLIDESHOW.JS — NEW FILE (additive)
 * ---------------------------------------------------------------
 * Plays the image slideshows configured in the Page Builder.
 * Markup is produced by public-page.js:
 *
 *   <div class="edc-imgframe" data-edc-slideshow data-duration="5" data-transition="fade">
 *     <div class="edc-imgframe-slide is-active" style="…"></div>
 *     <div class="edc-imgframe-slide" style="…"></div>
 *   </div>
 *
 * Each slide keeps its own crop/zoom, the frame never changes size, and the
 * loop restarts after the last image.
 * ---------------------------------------------------------------
 */
const EDC_SLIDESHOW = (function () {
  const timers = new WeakMap();

  function stop(el) {
    const t = timers.get(el);
    if (t) { clearInterval(t); timers.delete(el); }
  }

  function start(el) {
    stop(el);
    const slides = Array.prototype.slice.call(el.querySelectorAll(".edc-imgframe-slide"));
    if (slides.length < 2) return;
    const duration = Math.max(500, (parseFloat(el.dataset.duration) || 5) * 1000);
    const transition = el.dataset.transition || "fade";
    el.setAttribute("data-transition", transition);
    let i = slides.findIndex(function (s) { return s.classList.contains("is-active"); });
    if (i < 0) { i = 0; slides[0].classList.add("is-active"); }

    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) el.setAttribute("data-transition", "none");

    const id = setInterval(function () {
      if (document.hidden) return;                    /* pause in background tabs */
      const prev = slides[i];
      i = (i + 1) % slides.length;                    /* loop forever */
      const next = slides[i];
      prev.classList.remove("is-active");
      prev.classList.add("is-leaving");
      next.classList.add("is-active");
      setTimeout(function () { prev.classList.remove("is-leaving"); }, 700);
    }, duration);
    timers.set(el, id);
  }

  function init(scope) {
    const root = scope || document;
    root.querySelectorAll("[data-edc-slideshow]").forEach(start);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { init(); });
  else init();
  document.addEventListener("edc:page-rendered", function () { init(); });
  document.addEventListener("edc:homepage-rendered", function () { init(); });

  return { init: init, start: start, stop: stop };
})();
if (typeof window !== "undefined") window.EDC_SLIDESHOW = EDC_SLIDESHOW;
