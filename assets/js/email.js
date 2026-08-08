/**
 * EMAIL.JS — admin email composer. Mount: EDC_EMAIL.init('#edc-email').
 */
const EDC_EMAIL = (() => {
  let root;
  async function init(selector) {
    root = document.querySelector(selector); if (!root) return;
    if (!(EDC_API.getSession && EDC_API.getSession())) { root.innerHTML = '<p class="edc-muted">Log in to send email.</p>'; return; }
    render();
  }
  function render() {
    root.innerHTML = `<div class="edc-email-tabs">
        <button data-tab="single" class="edc-btn edc-btn-sm edc-tab active">Single</button>
        <button data-tab="bulk" class="edc-btn edc-btn-sm edc-tab">Bulk</button>
        <button data-tab="test" class="edc-btn edc-btn-sm edc-tab">Test</button>
      </div>
      <div class="edc-email-panel" data-panel="single">
        <label>To <input id="em-to" type="email" placeholder="name@example.com"></label>
        <label>Subject <input id="em-subject" type="text"></label>
        <label>Body (plain) <textarea id="em-body" rows="6"></textarea></label>
        <button class="edc-btn edc-btn-primary" id="em-send">Send email</button>
        <p class="edc-email-result"></p></div>
      <div class="edc-email-panel" data-panel="bulk" hidden>
        <label>Recipients (one email per line) <textarea id="em-recipients" rows="5"></textarea></label>
        <label>Subject <input id="em-bulk-subject" type="text"></label>
        <label>Body (plain) <textarea id="em-bulk-body" rows="6"></textarea></label>
        <button class="edc-btn edc-btn-primary" id="em-send-bulk">Send bulk</button>
        <p class="edc-email-result"></p></div>
      <div class="edc-email-panel" data-panel="test" hidden>
        <p>Sends a test email to your own logged-in address.</p>
        <button class="edc-btn edc-btn-primary" id="em-test">Send test email</button>
        <p class="edc-email-result"></p></div>`;
    root.querySelectorAll(".edc-tab").forEach(t => t.onclick = () => switchTab(t.dataset.tab));
    root.querySelector("#em-send").onclick = sendSingle;
    root.querySelector("#em-send-bulk").onclick = sendBulk;
    root.querySelector("#em-test").onclick = sendTest;
  }
  function switchTab(tab) {
    root.querySelectorAll(".edc-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
    root.querySelectorAll(".edc-email-panel").forEach(p => p.hidden = p.dataset.panel !== tab);
  }
  async function sendSingle() {
    const to = val("em-to"), subject = val("em-subject"), body = val("em-body");
    if (!to || !subject || !body) return setResult("To, subject and body are required.");
    const r = await EDC_API.sendEmail({ to, subject, body });
    setResult(r.success ? "Email sent." : (r.error?.message || "Failed."));
  }
  async function sendBulk() {
    const recipients = val("em-recipients").split("\n").map(s => s.trim()).filter(Boolean);
    const subject = val("em-bulk-subject"), body = val("em-bulk-body");
    if (!recipients.length || !subject || !body) return setResult("Recipients, subject and body are required.");
    const r = await EDC_API.sendBulkEmail({ recipients, subject, body });
    setResult(r.success ? `Sent ${r.data.sent}${r.data.failed ? " (" + r.data.failed + " failed)" : ""}.` : (r.error?.message || "Failed."));
  }
  async function sendTest() { const r = await EDC_API.testEmail(); setResult(r.success ? "Test email sent to your address." : (r.error?.message || "Failed.")); }
  function val(id) { return (root.querySelector("#" + id)?.value || "").trim(); }
  function setResult(msg) { root.querySelector(".edc-email-panel:not([hidden]) .edc-email-result").textContent = msg; }
  return { init };
})();