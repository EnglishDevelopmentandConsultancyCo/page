/**
 * THEME.JS — applies the active scheduled theme to the page.
 * Supports the short preset variable names used by existing sheets
 * and maps them to the semantic variables used by tokens.css.
 */
const EDC_THEME = (() => {
  const aliases = {
    "--primary": "--color-primary",
    "--accent": "--color-accent",
    "--bg": "--color-bg",
    "--link": "--color-link",
  };
  async function apply() {
    try {
      const res = await EDC_API.getActiveTheme();
      if (!res || !res.success) return;
      const variables = res.data.variables || {};
      const root = document.documentElement;
      Object.keys(variables).forEach(key => {
        if (!variables[key]) return;
        root.style.setProperty(key, variables[key]);
        if (aliases[key]) root.style.setProperty(aliases[key], variables[key]);
      });
      root.setAttribute("data-theme", res.data.preset || "default");
      root.setAttribute("data-edc-theme", res.data.preset || "default");
    } catch (e) { /* cosmetic — ignore */ }
  }
  return { apply };
})();
document.addEventListener("DOMContentLoaded", EDC_THEME.apply);
document.addEventListener("visibilitychange", () => { if (!document.hidden) EDC_THEME.apply(); });