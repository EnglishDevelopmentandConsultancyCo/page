/**
 * THEME.JS — applies the active scheduled theme to the page.
 * Writes CSS custom properties from getActiveTheme onto :root.
 * Cosmetic only — never blocks page render on failure.
 */
const EDC_THEME = (() => {
  async function apply() {
    try {
      const res = await EDC_API.getActiveTheme();
      if (!res || !res.success) return;
      const v = res.data.variables || {};
      const root = document.documentElement;
      Object.keys(v).forEach(k => { if (v[k]) root.style.setProperty(k, v[k]); });
      root.setAttribute("data-edc-theme", res.data.preset || "default");
    } catch (e) { /* cosmetic — ignore */ }
  }
  return { apply };
})();
document.addEventListener("DOMContentLoaded", EDC_THEME.apply);
document.addEventListener("visibilitychange", () => { if (!document.hidden) EDC_THEME.apply(); });