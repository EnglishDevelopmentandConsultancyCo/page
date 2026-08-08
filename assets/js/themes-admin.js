/**
 * THEMES-ADMIN.JS — manage theme presets & schedules.
 * Mount: EDC_THEMES_ADMIN.init('#edc-themes').
 */
const EDC_THEMES_ADMIN = (() => {
  let root;
  async function init(selector) {
    root = document.querySelector(selector); if (!root) return;
    if (!(EDC_API.getSession && EDC_API.getSession())) { root.innerHTML = '<p class="edc-muted">Log in to manage themes.</p>'; return; }
    await refresh();
  }
  async function refresh() {
    const [p, s] = await Promise.all([EDC_API.getThemePresets(), EDC_API.getThemeSchedules()]);
    root.innerHTML = `<div class="edc-themes-cols">
      <div class="edc-themes-col"><h3>Presets</h3><div class="edc-themes-list"></div>
        <button class="edc-btn edc-btn-sm" id="th-add-preset">+ New preset</button></div>
      <div class="edc-themes-col"><h3>Schedules</h3><div class="edc-themes-list"></div>
        <button class="edc-btn edc-btn-sm" id="th-add-sched">+ New schedule</button></div>
    </div>`;
    renderPresets(p.success ? p.data : []);
    renderSchedules(s.success ? s.data : [], p.success ? p.data : []);
    root.querySelector("#th-add-preset").onclick = () => editPreset(null);
    root.querySelector("#th-add-sched").onclick = () => editSchedule(null, p.success ? p.data : []);
  }
  function renderPresets(presets) {
    const box = root.querySelector(".edc-themes-col:nth-child(1) .edc-themes-list"); box.innerHTML = "";
    if (!presets.length) { box.innerHTML = '<p class="edc-muted">No presets.</p>'; return; }
    presets.forEach(p => {
      const row = document.createElement("div"); row.className = "edc-themes-row";
      row.innerHTML = `<strong>${esc(p.label || p.name)}</strong> <code>${esc(p.name)}</code>
        <div><button class="edc-btn edc-btn-sm" data-edit>Edit</button>
        <button class="edc-btn edc-btn-sm edc-btn-danger" data-del>Delete</button></div>`;
      row.querySelector("[data-edit]").onclick = () => editPreset(p);
       row.querySelector("[data-del]").onclick = async () => {
         if (!confirm("Delete preset?")) return;
         const result = await EDC_API.deleteThemePreset(p.preset_id);
         EDC_UI.toast(result.message || result.error?.message || "Unable to delete preset.", result.success ? "success" : "error");
         if (result.success) refresh();
       };
      box.appendChild(row);
    });
  }
  function renderSchedules(schedules, presets) {
    const box = root.querySelector(".edc-themes-col:nth-child(2) .edc-themes-list"); box.innerHTML = "";
    if (!schedules.length) { box.innerHTML = '<p class="edc-muted">No schedules.</p>'; return; }
    schedules.forEach(s => {
      const preset = presets.find(x => x.preset_id === s.preset_id);
      const row = document.createElement("div"); row.className = "edc-themes-row";
      row.innerHTML = `<strong>${esc(s.name)}</strong> <span>${esc(preset ? preset.name : "—")} · ${esc(s.start_date)}→${esc(s.end_date)} · ${String(s.enabled)==="true"?"on":"off"}</span>
        <div><button class="edc-btn edc-btn-sm" data-edit>Edit</button>
        <button class="edc-btn edc-btn-sm edc-btn-danger" data-del>Delete</button></div>`;
      row.querySelector("[data-edit]").onclick = () => editSchedule(s, presets);
       row.querySelector("[data-del]").onclick = async () => {
         if (!confirm("Delete schedule?")) return;
         const result = await EDC_API.deleteThemeSchedule(s.schedule_id);
         EDC_UI.toast(result.message || result.error?.message || "Unable to delete schedule.", result.success ? "success" : "error");
         if (result.success) refresh();
       };
      box.appendChild(row);
    });
  }
  async function editPreset(p) {
    const name = prompt("Preset name (unique key, e.g. summer):", p ? p.name : ""); if (name === null) return;
    const label = prompt("Display label:", p ? p.label : name); if (label === null) return;
    let vars = prompt('CSS variables as JSON, e.g. {"--primary":"#0e7c7b"}', p ? p.variables_json : "{}"); if (vars === null) return;
    let vj; try { vj = JSON.stringify(JSON.parse(vars)); } catch (e) { return alert("Invalid JSON."); }
    const r = await EDC_API.saveThemePreset({ preset_id: p ? p.preset_id : null, name, label, variables_json: vj });
    EDC_UI.toast(r.message || r.error?.message || "Unable to save preset.", r.success ? "success" : "error");
    if (r.success) refresh();
  }
  async function editSchedule(s, presets) {
    const name = prompt("Schedule name:", s ? s.name : ""); if (name === null) return;
    const pname = prompt("Preset name: " + presets.map(x => x.name).join(", "), s ? (presets.find(x => x.preset_id === s.preset_id) || {}).name : ""); if (pname === null) return;
    const preset = presets.find(x => x.name === pname); if (!preset) return alert("Unknown preset.");
    const start = prompt("Start date (MM-DD):", s ? s.start_date : "01-01"); if (start === null) return;
    const end = prompt("End date (MM-DD):", s ? s.end_date : "01-31"); if (end === null) return;
    const enabled = confirm("Enable this schedule?") ? "true" : "false";
    const r = await EDC_API.saveThemeSchedule({ schedule_id: s ? s.schedule_id : null, name, preset_id: preset.preset_id, start_date: start, end_date: end, priority: s ? s.priority : 5, enabled });
    EDC_UI.toast(r.message || r.error?.message || "Unable to save schedule.", r.success ? "success" : "error");
    if (r.success) refresh();
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;" }[m])); }
  return { init };
})();