/**
 * APPLICATION WIZARD (spec §20-42)
 * A 13-step flow with autosave-to-draft, per-step validation, a
 * repeatable-record UI for education/certifications/experience/
 * references, and a review-before-submit summary.
 */
const EDCWizard = (() => {
  let current = 0;
  let data = {
    applicant: {}, immigration: {}, professional: {},
    education: [], certifications: [], experience: [],
    skills: [], thailand: {}, references: [], documents: {},
    coverLetter: {}, declaration: {},
  };

  const esc = (s="") => EDC_UI.escapeHtml(s);
  const field = (label, id, path, opts = {}) => {
    const val = getVal(path) || "";
    const type = opts.type || "text";
    if (type === "textarea") {
      return `<div class="field"><label>${label}${opts.required?' *':''}</label><textarea class="input" data-path="${path}" ${opts.required?'required':''}>${esc(val)}</textarea>${opts.hint?`<div class="hint">${opts.hint}</div>`:''}</div>`;
    }
    if (type === "select") {
      return `<div class="field"><label>${label}${opts.required?' *':''}</label><select class="input" data-path="${path}" ${opts.required?'required':''}>
        <option value="">Select…</option>
        ${(opts.options||[]).map(o=>`<option value="${esc(o)}" ${val===o?'selected':''}>${esc(o)}</option>`).join("")}
      </select></div>`;
    }
    return `<div class="field"><label>${label}${opts.required?' *':''}</label><input class="input" type="${type}" data-path="${path}" value="${esc(val)}" ${opts.required?'required':''} placeholder="${opts.placeholder||''}"></div>`;
  };

  function getVal(path) {
    const parts = path.split(".");
    let o = data;
    for (const p of parts) { if (o == null) return undefined; o = o[p]; }
    return o;
  }
  function setVal(path, value) {
    const parts = path.split(".");
    let o = data;
    for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
    o[parts[parts.length - 1]] = value;
  }

  const STEPS = [
    { key: "applicant", label: "Applicant", render: renderApplicant, validate: () => requireFields(["applicant.full_name","applicant.email","applicant.nationality"]) },
    { key: "immigration", label: "Immigration", render: renderImmigration, validate: () => true },
    { key: "professional", label: "Professional", render: renderProfessional, validate: () => requireFields(["professional.summary"]) },
    { key: "education", label: "Education", render: renderRepeater("education", eduFields, "Add education record"), validate: () => true },
    { key: "certifications", label: "Certifications", render: renderRepeater("certifications", certFields, "Add certification"), validate: () => true },
    { key: "experience", label: "Experience", render: renderRepeater("experience", expFields, "Add experience"), validate: () => true },
    { key: "skills", label: "Skills", render: renderSkills, validate: () => true },
    { key: "thailand", label: "Thailand Experience", render: renderThailand, validate: () => true },
    { key: "references", label: "References", render: renderRepeater("references", refFields, "Add reference"), validate: (d) => data.references.length >= 2 || "At least two references are required." },
    { key: "documents", label: "Documents", render: renderDocuments, validate: () => true },
    { key: "coverLetter", label: "Cover Letter", render: renderCoverLetter, validate: () => true },
    { key: "declaration", label: "Declaration", render: renderDeclaration, validate: () => data.declaration.agreed || "You must accept the declaration to continue." },
    { key: "review", label: "Review & Submit", render: renderReview, validate: () => true },
  ];

  function requireFields(paths) {
    for (const p of paths) { if (!getVal(p)) return `Please complete all required fields.`; }
    return true;
  }

  // ---- Step renderers ----
  function renderApplicant() {
    return `<h2>Applicant Information</h2><p class="muted mt-2 mb-4">Basic details we'll use throughout your application.</p>
    <div class="field-row">${field("Full legal name","","applicant.full_name",{required:true})}${field("Preferred name","","applicant.preferred_name",{})}</div>
    <div class="field-row">${field("Email","","applicant.email",{type:"email",required:true})}${field("Phone (Thailand or current)","","applicant.phone",{})}</div>
    <div class="field-row">${field("Nationality","","applicant.nationality",{required:true})}${field("Date of birth","","applicant.dob",{type:"date"})}</div>
    <div class="field-row">${field("Position applying for","","applicant.position",{type:"select",options:["General English Teacher","IELTS Instructor","Primary Homeroom English Teacher","Other"]})}${field("Employment type","","applicant.employment_type",{type:"select",options:["Full-Time","Part-Time"]})}</div>
    <div class="field-row">${field("Preferred campus/location","","applicant.campus",{})}${field("Expected starting date","","applicant.start_date",{type:"date"})}</div>
    ${field("Current address in Thailand (if any)","","applicant.address",{type:"textarea"})}`;
  }

  function renderImmigration() {
    return `<h2>Immigration / Visa</h2><p class="muted mt-2 mb-4">Helps us understand your current status — this does not affect eligibility to apply.</p>
    <div class="field-row">${field("Current immigration status","","immigration.status",{type:"select",options:["None / Not in Thailand","Tourist Visa","Education Visa","Non-Immigrant B","Other"]})}${field("Visa expiration date","","immigration.visa_expiry",{type:"date"})}</div>
    <div class="field-row">${field("Work permit status","","immigration.work_permit",{type:"select",options:["None","Active","Expired"]})}${field("Work permit expiration","","immigration.wp_expiry",{type:"date"})}</div>
    <div class="checkbox-line mt-2"><input type="checkbox" id="currEmp" ${getVal("immigration.currently_employed")?'checked':''}><label for="currEmp">I am currently employed by another employer in Thailand</label></div>`;
  }

  function renderProfessional() {
    return `<h2>Professional Profile</h2>
    ${field("Professional summary","","professional.summary",{type:"textarea",required:true,hint:"2–4 sentences on your teaching background."})}
    <div class="field-row">${field("Years teaching (total)","","professional.years_total",{type:"number"})}${field("Years teaching in Thailand","","professional.years_thailand",{type:"number"})}</div>
    ${field("Teaching levels (comma-separated)","","professional.levels",{placeholder:"Primary, Lower Secondary, Adult"})}`;
  }

  function eduFields(row, idx) {
    return `<div class="field-row">${repeaterField("Qualification","education",idx,"qualification",row,{type:"select",options:["Bachelor's Degree","Master's Degree","Doctorate","Other"]})}${repeaterField("Institution","education",idx,"institution",row)}</div>
    <div class="field-row">${repeaterField("Major / Field","education",idx,"major",row)}${repeaterField("Year graduated","education",idx,"year",row,{type:"number"})}</div>`;
  }
  function certFields(row, idx) {
    return `<div class="field-row">${repeaterField("Certification","certifications",idx,"name",row,{type:"select",options:["TEFL","TESOL","CELTA","DELTA","TKT","Trinity CertTESOL","Other"]})}${repeaterField("Provider","certifications",idx,"provider",row)}</div>
    <div class="field-row">${repeaterField("Date obtained","certifications",idx,"date",row,{type:"date"})}${repeaterField("Hours","certifications",idx,"hours",row,{type:"number"})}</div>`;
  }
  function expFields(row, idx) {
    return `<div class="field-row">${repeaterField("School / Company","experience",idx,"employer",row)}${repeaterField("Country","experience",idx,"country",row)}</div>
    <div class="field-row">${repeaterField("Position","experience",idx,"position",row)}${repeaterField("Student level","experience",idx,"level",row)}</div>
    <div class="field-row">${repeaterField("Start date","experience",idx,"start",row,{type:"date"})}${repeaterField("End date","experience",idx,"end",row,{type:"date"})}</div>`;
  }
  function refFields(row, idx) {
    return `<div class="field-row">${repeaterField("Name","references",idx,"name",row)}${repeaterField("Position","references",idx,"position",row)}</div>
    <div class="field-row">${repeaterField("Institution","references",idx,"institution",row)}${repeaterField("Relationship","references",idx,"relationship",row)}</div>
    <div class="field-row">${repeaterField("Phone","references",idx,"phone",row)}${repeaterField("Email","references",idx,"email",row,{type:"email"})}</div>`;
  }

  function repeaterField(label, group, idx, key, row, opts = {}) {
    const path = `${group}.${idx}.${key}`;
    const val = row[key] || "";
    if (opts.type === "select") {
      return `<div class="field"><label>${label}</label><select class="input" data-repeater="${path}"><option value="">Select…</option>${(opts.options||[]).map(o=>`<option ${val===o?'selected':''}>${esc(o)}</option>`).join("")}</select></div>`;
    }
    return `<div class="field"><label>${label}</label><input class="input" type="${opts.type||'text'}" data-repeater="${path}" value="${esc(val)}"></div>`;
  }

  function renderRepeater(group, rowRenderer, addLabel) {
    return function () {
      const rows = data[group];
      const rowsHtml = rows.map((row, idx) => `
        <div class="repeater-item">
          <button type="button" class="remove-row" data-remove="${group}:${idx}">Remove</button>
          ${rowRenderer(row, idx)}
        </div>`).join("");
      return `<h2>${STEPS.find(s=>s.key===group).label}</h2>
      <div id="repeaterList">${rowsHtml || `<p class="muted mb-4">No records added yet.</p>`}</div>
      <button type="button" class="btn btn-outline btn-sm" id="addRepeaterRow" data-group="${group}">+ ${addLabel}</button>`;
    };
  }

  function renderSkills() {
    const subjects = ["General English","Conversation English","Grammar","Academic English","Business English","IELTS","TOEIC","TOEFL","Pronunciation","Writing","Speaking"];
    const selected = new Set(data.skills);
    return `<h2>Subjects & Skills</h2><p class="muted mt-2 mb-4">Select all that apply.</p>
    <div class="subjects">${subjects.map(s=>`<label class="pill" style="cursor:pointer;display:inline-flex;gap:.4rem;align-items:center;">
      <input type="checkbox" value="${esc(s)}" data-skill ${selected.has(s)?'checked':''}> ${esc(s)}
    </label>`).join(" ")}</div>`;
  }

  function renderThailand() {
    return `<h2>Thailand Teaching Experience</h2>
    <div class="checkbox-line mb-4"><input type="checkbox" id="taughtTH" ${getVal("thailand.taught_before")?'checked':''}><label for="taughtTH">I have taught in Thailand before</label></div>
    <div class="field-row">${field("School / institution","","thailand.school",{})}${field("Province","","thailand.province",{})}</div>
    <div class="field-row">${field("Curriculum experience","","thailand.curriculum",{type:"select",options:["Government school","Private school","International school","Other","N/A"]})}${field("Thai co-teacher experience","","thailand.coteacher",{type:"select",options:["Yes","No"]})}</div>`;
  }

  function renderDocuments() {
    const docs = ["CV / Resume","Cover Letter","Passport Copy","Visa Copy","Degree Certificate","TEFL/TESOL Certificate"];
    return `<h2>Document Checklist</h2><p class="muted mt-2 mb-4">This is a demo uploader — files stay in your browser and are not uploaded anywhere in demo mode.</p>
    ${docs.map(d => `
      <div class="upload-zone" data-doc="${esc(d)}">
        <strong>${esc(d)}</strong>
        <div class="muted" style="font-size:.8rem;margin-top:.3rem;">Click or drag a file here (max ${window.EDC_CONFIG.MAX_UPLOAD_MB} MB)</div>
        <input type="file" style="display:none" data-doc-input="${esc(d)}">
      </div>
      <div id="upload-status-${esc(d).replace(/\s/g,'')}"></div>
    `).join("")}
    <div class="field mt-6"><label>Professional photograph (optional)</label>
      <div class="upload-zone" data-doc="Photo"><strong>Upload photo</strong><input type="file" style="display:none" data-doc-input="Photo"></div>
    </div>`;
  }

  function renderCoverLetter() {
    return `<h2>Cover Letter</h2>
    ${field("Write your cover letter","","coverLetter.text",{type:"textarea",hint:"Or attach a PDF from the Documents step instead."})}`;
  }

  function renderDeclaration() {
    return `<h2>Applicant Declaration</h2>
    <ul style="list-style:disc;padding-left:1.4rem;margin-bottom:1.5rem;color:var(--color-text-muted);font-size:.9rem;">
      <li>The information provided is accurate and complete.</li>
      <li>My qualifications and documents are genuine.</li>
      <li>EDC may verify my qualifications and employment history.</li>
      <li>I understand Thai immigration and work-permit requirements apply to me.</li>
      <li>False information may result in rejection or termination.</li>
    </ul>
    <div class="checkbox-line"><input type="checkbox" id="declAgree" ${data.declaration.agreed?'checked':''}><label for="declAgree">I agree to the declaration above.</label></div>`;
  }

  function sectionStatus(key) {
    const v = STEPS.find(s => s.key === key).validate();
    return v === true ? "✓ Complete" : `⚠ ${v}`;
  }

  function renderReview() {
    const keys = ["applicant","immigration","professional","education","certifications","experience","references","documents","declaration"];
    return `<h2>Review Your Application</h2><p class="muted mt-2 mb-4">Click any section to jump back and edit it.</p>
    <div class="table-wrap"><table class="data-table"><tbody>
      ${keys.map((k,i) => `<tr style="cursor:pointer" data-jump="${STEPS.findIndex(s=>s.key===k)}">
        <td>${STEPS.find(s=>s.key===k).label}</td>
        <td>${sectionStatus(k)}</td>
      </tr>`).join("")}
    </tbody></table></div>`;
  }

  // ---- Chrome: steps list, progress, navigation ----
  function renderStepsList() {
    document.getElementById("stepsList").innerHTML = STEPS.map((s, i) => `
      <li class="${i === current ? 'active' : i < current ? 'done' : ''}"><span class="num">${String(i+1).padStart(2,'0')}</span> ${s.label}</li>
    `).join("");
    document.getElementById("progressFill").style.width = `${Math.round((current/(STEPS.length-1))*100)}%`;
  }

  function bindStepInputs() {
    document.querySelectorAll("#stepContent [data-path]").forEach(el => {
      el.addEventListener("input", () => setVal(el.dataset.path, el.value));
      el.addEventListener("change", () => setVal(el.dataset.path, el.value));
    });
    document.querySelectorAll("#stepContent [data-repeater]").forEach(el => {
      el.addEventListener("input", () => {
        const [group, idx, key] = el.dataset.repeater.split(".");
        data[group][idx][key] = el.value;
      });
    });
    document.querySelectorAll("#stepContent [data-skill]").forEach(el => {
      el.addEventListener("change", () => {
        const set = new Set(data.skills);
        el.checked ? set.add(el.value) : set.delete(el.value);
        data.skills = [...set];
      });
    });
    const addBtn = document.getElementById("addRepeaterRow");
    if (addBtn) addBtn.addEventListener("click", () => {
      data[addBtn.dataset.group].push({});
      renderStep();
    });
    document.querySelectorAll("[data-remove]").forEach(btn => {
      btn.addEventListener("click", () => {
        const [group, idx] = btn.dataset.remove.split(":");
        data[group].splice(idx, 1);
        renderStep();
      });
    });
    document.querySelectorAll("[data-jump]").forEach(row => {
      row.addEventListener("click", () => { current = parseInt(row.dataset.jump, 10); renderStep(); });
    });
    document.querySelectorAll("[data-doc], [data-doc-input]").forEach(zone => {
      if (zone.dataset.doc) {
        zone.addEventListener("click", () => zone.querySelector("[data-doc-input]").click());
      }
    });
    document.querySelectorAll("[data-doc-input]").forEach(input => {
      input.addEventListener("change", () => {
        const key = input.dataset.docInput;
        const file = input.files[0];
        if (!file) return;
        if (file.size > window.EDC_CONFIG.MAX_UPLOAD_MB * 1024 * 1024) {
          EDC_UI.toast(`${file.name} exceeds ${window.EDC_CONFIG.MAX_UPLOAD_MB} MB.`, "error");
          return;
        }
        data.documents[key] = { name: file.name, size: file.size };
        const target = document.getElementById(`upload-status-${key.replace(/\s/g,'')}`);
        if (target) target.innerHTML = `<div class="upload-item"><span>${esc(file.name)} — ${(file.size/1024/1024).toFixed(2)} MB</span><span class="badge badge-shortlisted">Uploaded</span></div>`;
      });
    });
    const declCheck = document.getElementById("declAgree");
    if (declCheck) declCheck.addEventListener("change", () => data.declaration.agreed = declCheck.checked);
    const currEmp = document.getElementById("currEmp");
    if (currEmp) currEmp.addEventListener("change", () => setVal("immigration.currently_employed", currEmp.checked));
    const taughtTH = document.getElementById("taughtTH");
    if (taughtTH) taughtTH.addEventListener("change", () => setVal("thailand.taught_before", taughtTH.checked));
  }

  function renderStep() {
    document.getElementById("stepContent").innerHTML = STEPS[current].render();
    renderStepsList();
    bindStepInputs();
    document.getElementById("btnPrev").disabled = current === 0;
    document.getElementById("btnNext").textContent = current === STEPS.length - 1 ? "Submit Application →" : "Next →";
    window.scrollTo({ top: document.querySelector(".wizard").offsetTop - 100, behavior: "smooth" });
  }

  async function handleNext() {
    const valid = STEPS[current].validate();
    if (valid !== true) { EDC_UI.toast(valid, "error"); return; }
    if (current === STEPS.length - 1) {
      const res = await EDC_API.createApplication(data);
      if (res.success) {
        document.querySelector(".wizard").outerHTML = `
          <div class="card" style="max-width:600px;margin:0 auto;text-align:center;">
            <div class="card-body">
              <h2>Application Submitted Successfully</h2>
              <p class="mt-4">Application ID</p>
              <p class="stamp stamp-gold mt-2" style="font-size:1rem;">${res.data.application_id}</p>
              <p class="mt-6 muted">Thank you for applying to EDC. We have received your application and will review it soon.</p>
              <a href="index.html" class="btn btn-primary mt-6">Back to Home</a>
            </div>
          </div>`;
      } else {
        EDC_UI.toast(res.error?.message || "Submission failed.", "error");
      }
      return;
    }
    current++;
    renderStep();
  }

  async function init() {
    const jobId = new URLSearchParams(location.search).get("job");
    if (jobId) {
      const j = (await EDC_API.getJob(jobId)).data;
      if (j) { data.applicant.position = j.title; data.applicant.campus = j.campus; }
    }
    const draft = (await EDC_API.getApplicationDraft()).data;
    if (draft) data = Object.assign(data, draft);

    document.getElementById("btnPrev").addEventListener("click", () => { if (current > 0) { current--; renderStep(); } });
    document.getElementById("btnNext").addEventListener("click", handleNext);
    document.getElementById("btnSaveDraft").addEventListener("click", async () => {
      const r = await EDC_API.saveApplicationDraft(data);
      EDC_UI.toast(r.message || "Draft saved.", "success");
    });

    renderStep();
  }

  return { init };
})();
