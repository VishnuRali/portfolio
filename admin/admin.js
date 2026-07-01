// admin/admin.js
// All logic for the admin dashboard: auth check, loading content.json,
// rendering editable fields/lists, saving back via the API, and resume upload.

let state = null; // the full content object currently being edited

// ---------- small DOM helpers ----------
function $(id) { return document.getElementById(id); }

let toastTimer = null;
function showToast(message, type = '') {
  const toast = $('toast');
  toast.textContent = message;
  toast.className = 'show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = ''; }, 3500);
}

function setSaveStatus(text) {
  $('saveStatus').textContent = text;
}

function escAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------- auth ----------
async function checkAuth() {
  try {
    const res = await fetch('/api/login', { method: 'GET' });
    const data = await res.json();
    if (!data.authenticated) {
      window.location.href = '/admin/login.html';
      return false;
    }
    return true;
  } catch {
    window.location.href = '/admin/login.html';
    return false;
  }
}

$('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'logout' })
  });
  window.location.href = '/admin/login.html';
});

// ---------- tabs ----------
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    $('panel-' + tab.dataset.tab).classList.add('active');
  });
});

// ---------- load content ----------
async function loadContent() {
  const res = await fetch('/content.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('Could not load content.json');
  state = await res.json();

  // Ensure resumeContent exists (backwards compat if old content.json)
  if (!state.resumeContent) {
    state.resumeContent = {
      objective: '', phone: '',
      education: [], languages: [], strengths: []
    };
  }
  if (!state.resume) state.resume = { filename: '', downloadUrl: '' };
}

// ---------- render: Home tab ----------
function renderHome() {
  $('hero-name').value = state.hero.name || '';
  $('hero-title').value = state.hero.title || '';
  $('hero-location').value = state.hero.location || '';
  $('hero-bio').value = state.hero.bio || '';
  $('hero-availabilityBadge').value = state.hero.availabilityBadge || '';
  $('hero-badges').value = (state.hero.badges || []).join(', ');

  $('cta-email').value = state.ctas.email || '';
  $('cta-github').value = state.ctas.github || '';
  $('cta-linkedin').value = state.ctas.linkedin || '';

  $('availabilityBanner').value = state.availabilityBanner || '';

  $('edu-degree').value = state.education.degree || '';
  $('edu-field').value = state.education.field || '';
  $('edu-meta').value = state.education.meta || '';

  $('footer-left').value = state.footer.left || '';
  $('footer-right').value = state.footer.right || '';
}

function collectHome() {
  state.hero.name = $('hero-name').value.trim();
  state.hero.title = $('hero-title').value.trim();
  state.hero.location = $('hero-location').value.trim();
  state.hero.bio = $('hero-bio').value.trim();
  state.hero.availabilityBadge = $('hero-availabilityBadge').value.trim();
  state.hero.badges = $('hero-badges').value.split(',').map((s) => s.trim()).filter(Boolean);

  state.ctas.email = $('cta-email').value.trim();
  state.ctas.github = $('cta-github').value.trim();
  state.ctas.linkedin = $('cta-linkedin').value.trim();

  state.availabilityBanner = $('availabilityBanner').value.trim();

  state.education.degree = $('edu-degree').value.trim();
  state.education.field = $('edu-field').value.trim();
  state.education.meta = $('edu-meta').value.trim();

  state.footer.left = $('footer-left').value.trim();
  state.footer.right = $('footer-right').value.trim();
}

// ---------- render: Experience tab ----------
function renderExperience() {
  const container = $('experienceList');
  container.innerHTML = '';
  state.experience.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
      <div class="list-item-header">
        <span class="list-item-title">Entry ${idx + 1}</span>
        <div class="list-item-actions">
          <button class="btn btn-sm" data-action="move-exp-up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn btn-sm" data-action="move-exp-down" data-idx="${idx}" ${idx === state.experience.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn btn-sm btn-danger" data-action="remove-exp" data-idx="${idx}">Remove</button>
        </div>
      </div>
      <div class="two-col">
        <div class="field"><label>Role</label><input type="text" data-field="role" data-idx="${idx}" value="${escAttr(item.role)}"/></div>
        <div class="field"><label>Period</label><input type="text" data-field="period" data-idx="${idx}" value="${escAttr(item.period)}"/></div>
      </div>
      <div class="field"><label>Company / Program</label><input type="text" data-field="company" data-idx="${idx}" value="${escAttr(item.company)}"/></div>
      <div class="field"><label>Description</label><textarea data-field="description" data-idx="${idx}">${escHtml(item.description)}</textarea></div>
      <div class="field"><label>Tags (comma-separated)</label><input type="text" data-field="tags" data-idx="${idx}" value="${escAttr((item.tags||[]).join(', '))}"/></div>
    `;
    container.appendChild(div);
  });

  container.querySelectorAll('input,textarea').forEach((input) => {
    input.addEventListener('input', () => {
      const idx = parseInt(input.dataset.idx, 10);
      const field = input.dataset.field;
      if (field === 'tags') {
        state.experience[idx].tags = input.value.split(',').map((s) => s.trim()).filter(Boolean);
      } else {
        state.experience[idx][field] = input.value;
      }
    });
  });
  container.querySelectorAll('[data-action="remove-exp"]').forEach((btn) => {
    btn.addEventListener('click', () => { state.experience.splice(parseInt(btn.dataset.idx, 10), 1); renderExperience(); });
  });
  container.querySelectorAll('[data-action="move-exp-up"]').forEach((btn) => {
    btn.addEventListener('click', () => { const i=parseInt(btn.dataset.idx,10); if(i>0){[state.experience[i-1],state.experience[i]]=[state.experience[i],state.experience[i-1]]; renderExperience();} });
  });
  container.querySelectorAll('[data-action="move-exp-down"]').forEach((btn) => {
    btn.addEventListener('click', () => { const i=parseInt(btn.dataset.idx,10); if(i<state.experience.length-1){[state.experience[i],state.experience[i+1]]=[state.experience[i+1],state.experience[i]]; renderExperience();} });
  });
}

$('addExperienceBtn').addEventListener('click', () => {
  state.experience.push({ role: '', period: '', company: '', description: '', tags: [] });
  renderExperience();
});

// ---------- render: Projects tab ----------
function renderProjects() {
  const container = $('projectsList');
  container.innerHTML = '';
  state.projects.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
      <div class="list-item-header">
        <span class="list-item-title">Project ${idx + 1}</span>
        <div class="list-item-actions">
          <button class="btn btn-sm" data-action="move-proj-up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn btn-sm" data-action="move-proj-down" data-idx="${idx}" ${idx === state.projects.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn btn-sm btn-danger" data-action="remove-proj" data-idx="${idx}">Remove</button>
        </div>
      </div>
      <div class="field"><label>Name</label><input type="text" data-field="name" data-idx="${idx}" value="${escAttr(item.name)}"/></div>
      <div class="two-col">
        <div class="field"><label>Link label (e.g. "GitHub ↗")</label><input type="text" data-field="linkLabel" data-idx="${idx}" value="${escAttr(item.linkLabel)}"/></div>
        <div class="field"><label>Link URL</label><input type="text" data-field="linkUrl" data-idx="${idx}" value="${escAttr(item.linkUrl)}"/></div>
      </div>
      <div class="field"><label>Description</label><textarea data-field="description" data-idx="${idx}">${escHtml(item.description)}</textarea></div>
      <div class="field"><label>Tech tags (comma-separated)</label><input type="text" data-field="tech" data-idx="${idx}" value="${escAttr((item.tech||[]).join(', '))}"/></div>
    `;
    container.appendChild(div);
  });
  container.querySelectorAll('input,textarea').forEach((input) => {
    input.addEventListener('input', () => {
      const idx = parseInt(input.dataset.idx, 10);
      const field = input.dataset.field;
      if (field === 'tech') {
        state.projects[idx].tech = input.value.split(',').map((s) => s.trim()).filter(Boolean);
      } else {
        state.projects[idx][field] = input.value;
      }
    });
  });
  container.querySelectorAll('[data-action="remove-proj"]').forEach((btn) => {
    btn.addEventListener('click', () => { state.projects.splice(parseInt(btn.dataset.idx,10), 1); renderProjects(); });
  });
  container.querySelectorAll('[data-action="move-proj-up"]').forEach((btn) => {
    btn.addEventListener('click', () => { const i=parseInt(btn.dataset.idx,10); if(i>0){[state.projects[i-1],state.projects[i]]=[state.projects[i],state.projects[i-1]]; renderProjects();} });
  });
  container.querySelectorAll('[data-action="move-proj-down"]').forEach((btn) => {
    btn.addEventListener('click', () => { const i=parseInt(btn.dataset.idx,10); if(i<state.projects.length-1){[state.projects[i],state.projects[i+1]]=[state.projects[i+1],state.projects[i]]; renderProjects();} });
  });
}

$('addProjectBtn').addEventListener('click', () => {
  state.projects.push({ name: '', linkLabel: 'GitHub ↗', linkUrl: '', description: '', tech: [] });
  renderProjects();
});

// ---------- render: Skills tab ----------
function renderSkills() {
  const container = $('skillsList');
  container.innerHTML = '';
  Object.keys(state.skills).forEach((groupName, idx) => {
    const div = document.createElement('div');
    div.className = 'skill-group-card';
    div.innerHTML = `
      <div class="list-item-header">
        <span class="list-item-title">Group ${idx + 1}</span>
        <button class="btn btn-sm btn-danger" data-action="remove-skillgroup" data-group="${escAttr(groupName)}">Remove group</button>
      </div>
      <div class="field"><label>Group label</label><input type="text" data-action="rename-skillgroup" data-group="${escAttr(groupName)}" value="${escAttr(groupName)}"/></div>
      <div class="field"><label>Skills (comma-separated)</label><input type="text" data-action="edit-skillgroup" data-group="${escAttr(groupName)}" value="${escAttr((state.skills[groupName]||[]).join(', '))}"/></div>
    `;
    container.appendChild(div);
  });
  container.querySelectorAll('[data-action="edit-skillgroup"]').forEach((input) => {
    input.addEventListener('input', () => {
      state.skills[input.dataset.group] = input.value.split(',').map((s) => s.trim()).filter(Boolean);
    });
  });
  container.querySelectorAll('[data-action="rename-skillgroup"]').forEach((input) => {
    input.addEventListener('change', () => {
      const oldName = input.dataset.group;
      const newName = input.value.trim();
      if (!newName || newName === oldName) { input.value = oldName; return; }
      const ordered = {};
      Object.keys(state.skills).forEach((k) => { ordered[k === oldName ? newName : k] = state.skills[k]; });
      state.skills = ordered;
      renderSkills();
    });
  });
  container.querySelectorAll('[data-action="remove-skillgroup"]').forEach((btn) => {
    btn.addEventListener('click', () => { delete state.skills[btn.dataset.group]; renderSkills(); });
  });
}

$('addSkillGroupBtn').addEventListener('click', () => {
  let name = 'New Group', suffix = 1;
  while (Object.prototype.hasOwnProperty.call(state.skills, name)) { suffix++; name = `New Group ${suffix}`; }
  state.skills[name] = [];
  renderSkills();
});

// ---------- render: Certifications tab (full upgrade) ----------
function renderCertifications() {
  const container = $('certificationsList');
  container.innerHTML = '';
  state.certifications.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'list-item';
    const hasImage = item.image && item.image.trim();
    div.innerHTML = `
      <div class="list-item-header">
        <span class="list-item-title">Certificate ${idx + 1}</span>
        <div class="list-item-actions">
          <button class="btn btn-sm" data-action="move-cert-up" data-idx="${idx}" ${idx === 0 ? 'disabled' : ''}>↑</button>
          <button class="btn btn-sm" data-action="move-cert-down" data-idx="${idx}" ${idx === state.certifications.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn btn-sm btn-danger" data-action="remove-cert" data-idx="${idx}">Remove</button>
        </div>
      </div>

      <div class="two-col">
        <div class="field"><label>Certificate title</label><input type="text" data-field="title" data-idx="${idx}" value="${escAttr(item.title||item.name||'')}"/></div>
        <div class="field"><label>Organization / Issuer</label><input type="text" data-field="organization" data-idx="${idx}" value="${escAttr(item.organization||'')}"/></div>
      </div>
      <div class="field"><label>Description (1–2 sentences)</label><textarea data-field="description" data-idx="${idx}" style="min-height:52px">${escHtml(item.description||'')}</textarea></div>
      <div class="two-col">
        <div class="field"><label>Date</label><input type="text" data-field="date" data-idx="${idx}" value="${escAttr(item.date||item.year||'')}" placeholder="e.g. Feb 2025"/></div>
        <div class="field"><label>Certificate ID (optional, used in filename)</label><input type="text" data-field="id" data-idx="${idx}" value="${escAttr(item.id||'')}"/></div>
      </div>
      <div class="field"><label>Verification URL (Credly, IBM badge, etc.)</label><input type="url" data-field="verificationUrl" data-idx="${idx}" value="${escAttr(item.verificationUrl||'')}"/><div class="hint">If set, the View Certificate button opens this URL. Leave blank to open the image instead.</div></div>
      <div class="field">
        <label>Certificate image</label>
        <div class="cert-image-row">
          ${hasImage ? `<img src="${escAttr(item.image)}" class="cert-image-preview visible" data-preview-idx="${idx}" alt="preview"/>` : `<img class="cert-image-preview" data-preview-idx="${idx}" alt="preview"/>`}
          <div>
            <input type="file" accept="image/jpeg,image/png,image/webp" data-action="upload-cert-image" data-idx="${idx}"/>
            <div class="cert-image-filename" data-filename-idx="${idx}">${hasImage ? escHtml(item.image) : 'No image uploaded yet'}</div>
          </div>
        </div>
        <div class="hint">Upload a JPG/PNG/WebP. It will be committed to the repo as images/cert-{id}.jpg and the path saved here. Max 5 MB.</div>
      </div>
      <div class="field">
        <label class="cert-checkbox-row">
          <input type="checkbox" data-field="verified" data-idx="${idx}" ${item.verified !== false ? 'checked' : ''}/>
          Show "Verified" badge on card
        </label>
      </div>
    `;
    container.appendChild(div);
  });

  // Text/textarea inputs
  container.querySelectorAll('input[type="text"],input[type="url"],textarea').forEach((input) => {
    if (!input.dataset.field) return;
    input.addEventListener('input', () => {
      const idx = parseInt(input.dataset.idx, 10);
      state.certifications[idx][input.dataset.field] = input.value;
    });
  });

  // Checkbox
  container.querySelectorAll('input[type="checkbox"][data-field="verified"]').forEach((cb) => {
    cb.addEventListener('change', () => {
      state.certifications[parseInt(cb.dataset.idx, 10)].verified = cb.checked;
    });
  });

  // Remove
  container.querySelectorAll('[data-action="remove-cert"]').forEach((btn) => {
    btn.addEventListener('click', () => { state.certifications.splice(parseInt(btn.dataset.idx, 10), 1); renderCertifications(); });
  });

  // Reorder up
  container.querySelectorAll('[data-action="move-cert-up"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.idx, 10);
      if (i > 0) { [state.certifications[i-1], state.certifications[i]] = [state.certifications[i], state.certifications[i-1]]; renderCertifications(); }
    });
  });

  // Reorder down
  container.querySelectorAll('[data-action="move-cert-down"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.idx, 10);
      if (i < state.certifications.length - 1) { [state.certifications[i], state.certifications[i+1]] = [state.certifications[i+1], state.certifications[i]]; renderCertifications(); }
    });
  });

  // Image upload
  container.querySelectorAll('[data-action="upload-cert-image"]').forEach((fileInput) => {
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      const idx = parseInt(fileInput.dataset.idx, 10);
      const cert = state.certifications[idx];

      // Build a safe filename from cert id or title
      const base = (cert.id || ('cert-' + idx)).replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
      const ext = file.name.split('.').pop().toLowerCase();
      const filename = `${base}.${ext}`;

      fileInput.disabled = true;
      showToast('Uploading image…', '');

      try {
        const fileBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Could not read file.'));
          reader.readAsDataURL(file);
        });

        const res = await fetch('/api/image', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, fileBase64 })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Upload failed.');

        // Update state with the committed path
        const repoPath = 'images/' + data.filename;
        state.certifications[idx].image = repoPath;

        // Update preview
        const preview = container.querySelector(`img[data-preview-idx="${idx}"]`);
        if (preview) { preview.src = '/' + repoPath; preview.classList.add('visible'); }

        const filenameLabel = container.querySelector(`[data-filename-idx="${idx}"]`);
        if (filenameLabel) filenameLabel.textContent = repoPath;

        showToast('Image uploaded. Save changes to update the site.', 'success');
      } catch (err) {
        showToast(err.message || 'Image upload failed.', 'error');
      } finally {
        fileInput.disabled = false;
        fileInput.value = '';
      }
    });
  });
}

$('addCertBtn').addEventListener('click', () => {
  const nextId = 'cert-' + String(state.certifications.length + 1).padStart(2, '0');
  state.certifications.push({
    id: nextId, title: '', organization: '', description: '',
    year: '2025', image: '', verificationUrl: '', verified: true
  });
  renderCertifications();
});

// ---------- render: Contact tab ----------
function renderContact() {
  $('contact-email').value = state.contact.email || '';
  $('contact-linkedinHandle').value = state.contact.linkedinHandle || '';
  $('contact-linkedinUrl').value = state.contact.linkedinUrl || '';
  $('contact-githubHandle').value = state.contact.githubHandle || '';
  $('contact-githubUrl').value = state.contact.githubUrl || '';
}

function collectContact() {
  state.contact.email = $('contact-email').value.trim();
  state.contact.linkedinHandle = $('contact-linkedinHandle').value.trim();
  state.contact.linkedinUrl = $('contact-linkedinUrl').value.trim();
  state.contact.githubHandle = $('contact-githubHandle').value.trim();
  state.contact.githubUrl = $('contact-githubUrl').value.trim();
}

// ---------- render: Resume Content tab ----------
function renderResumeContent() {
  const rc = state.resumeContent || {};
  $('rc-objective').value = rc.objective || '';
  $('rc-phone').value = rc.phone || '';
  renderRcEducation();
  renderRcLanguages();
  renderRcStrengths();
}

function collectResumeContent() {
  if (!state.resumeContent) state.resumeContent = {};
  state.resumeContent.objective = $('rc-objective').value.trim();
  state.resumeContent.phone = $('rc-phone').value.trim();
  // education/languages/strengths mutate state directly
}

// Education sub-list
function renderRcEducation() {
  const container = $('rc-education-list');
  container.innerHTML = '';
  const edu = (state.resumeContent || {}).education || [];
  edu.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
      <div class="list-item-header">
        <span class="list-item-title">Entry ${idx + 1}</span>
        <div class="list-item-actions">
          <button class="btn btn-sm" data-action="move-edu-up" data-idx="${idx}" ${idx===0?'disabled':''}>↑</button>
          <button class="btn btn-sm" data-action="move-edu-down" data-idx="${idx}" ${idx===edu.length-1?'disabled':''}>↓</button>
          <button class="btn btn-sm btn-danger" data-action="remove-edu" data-idx="${idx}">Remove</button>
        </div>
      </div>
      <div class="field"><label>Degree / Qualification</label><input type="text" data-field="degree" data-idx="${idx}" value="${escAttr(item.degree)}"/></div>
      <div class="field"><label>School / Institution</label><input type="text" data-field="school" data-idx="${idx}" value="${escAttr(item.school)}"/></div>
      <div class="two-col">
        <div class="field"><label>Board / Status</label><input type="text" data-field="board" data-idx="${idx}" value="${escAttr(item.board)}"/></div>
        <div class="field"><label>Score / Grade</label><input type="text" data-field="score" data-idx="${idx}" value="${escAttr(item.score)}"/></div>
      </div>
    `;
    container.appendChild(div);
  });
  container.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      state.resumeContent.education[parseInt(input.dataset.idx, 10)][input.dataset.field] = input.value;
    });
  });
  container.querySelectorAll('[data-action="remove-edu"]').forEach((btn) => {
    btn.addEventListener('click', () => { state.resumeContent.education.splice(parseInt(btn.dataset.idx,10),1); renderRcEducation(); });
  });
  container.querySelectorAll('[data-action="move-edu-up"]').forEach((btn) => {
    btn.addEventListener('click', () => { const i=parseInt(btn.dataset.idx,10); if(i>0){[state.resumeContent.education[i-1],state.resumeContent.education[i]]=[state.resumeContent.education[i],state.resumeContent.education[i-1]]; renderRcEducation();} });
  });
  container.querySelectorAll('[data-action="move-edu-down"]').forEach((btn) => {
    btn.addEventListener('click', () => { const i=parseInt(btn.dataset.idx,10); const a=state.resumeContent.education; if(i<a.length-1){[a[i],a[i+1]]=[a[i+1],a[i]]; renderRcEducation();} });
  });
}

$('addEduBtn').addEventListener('click', () => {
  if (!state.resumeContent.education) state.resumeContent.education = [];
  state.resumeContent.education.push({ degree: '', school: '', board: '', score: '' });
  renderRcEducation();
});

// Languages sub-list
function renderRcLanguages() {
  const container = $('rc-languages-list');
  container.innerHTML = '';
  const langs = (state.resumeContent || {}).languages || [];
  langs.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
      <div class="list-item-header">
        <span class="list-item-title">Language ${idx + 1}</span>
        <button class="btn btn-sm btn-danger" data-action="remove-lang" data-idx="${idx}">Remove</button>
      </div>
      <div class="two-col">
        <div class="field"><label>Language</label><input type="text" data-field="name" data-idx="${idx}" value="${escAttr(item.name)}"/></div>
        <div class="field"><label>Level (e.g. Native, Fluent)</label><input type="text" data-field="level" data-idx="${idx}" value="${escAttr(item.level)}"/></div>
      </div>
    `;
    container.appendChild(div);
  });
  container.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      state.resumeContent.languages[parseInt(input.dataset.idx, 10)][input.dataset.field] = input.value;
    });
  });
  container.querySelectorAll('[data-action="remove-lang"]').forEach((btn) => {
    btn.addEventListener('click', () => { state.resumeContent.languages.splice(parseInt(btn.dataset.idx,10),1); renderRcLanguages(); });
  });
}

$('addLangBtn').addEventListener('click', () => {
  if (!state.resumeContent.languages) state.resumeContent.languages = [];
  state.resumeContent.languages.push({ name: '', level: '' });
  renderRcLanguages();
});

// Strengths sub-list
function renderRcStrengths() {
  const container = $('rc-strengths-list');
  container.innerHTML = '';
  const strengths = (state.resumeContent || {}).strengths || [];
  strengths.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'dynamic-list-item';
    div.innerHTML = `
      <input type="text" data-idx="${idx}" value="${escAttr(item)}"/>
      <button class="btn btn-sm btn-danger" data-action="remove-strength" data-idx="${idx}">×</button>
    `;
    container.appendChild(div);
  });
  container.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      state.resumeContent.strengths[parseInt(input.dataset.idx, 10)] = input.value;
    });
  });
  container.querySelectorAll('[data-action="remove-strength"]').forEach((btn) => {
    btn.addEventListener('click', () => { state.resumeContent.strengths.splice(parseInt(btn.dataset.idx,10),1); renderRcStrengths(); });
  });
}

$('addStrengthBtn').addEventListener('click', () => {
  if (!state.resumeContent.strengths) state.resumeContent.strengths = [];
  state.resumeContent.strengths.push('');
  renderRcStrengths();
});

// ---------- render: Resume PDF tab ----------
function renderResumePdf() {
  $('resume-downloadUrl').value = (state.resume && state.resume.downloadUrl) || '';
}

function collectResumePdf() {
  if (!state.resume) state.resume = {};
  state.resume.downloadUrl = $('resume-downloadUrl').value.trim();
}

// ---------- render all ----------
function renderAll() {
  renderHome();
  renderExperience();
  renderProjects();
  renderSkills();
  renderCertifications();
  renderContact();
  renderResumeContent();
  renderResumePdf();
}

// ---------- save ----------
async function saveAll() {
  collectHome();
  collectContact();
  collectResumeContent();
  collectResumePdf();
  // experience/projects/skills/certifications already mutate `state` directly via input listeners

  const saveBtn = $('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving…';
  setSaveStatus('Saving to GitHub…');

  try {
    const res = await fetch('/api/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Save failed.');
    setSaveStatus('Saved. Vercel is redeploying — live in under a minute.');
    showToast('Changes committed. Site will update shortly.', 'success');
  } catch (err) {
    setSaveStatus('Save failed.');
    showToast(err.message || 'Save failed.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save changes';
  }
}

$('saveBtn').addEventListener('click', saveAll);

// ---------- resume PDF upload ----------
const resumeInput = $('resumeFileInput');
const uploadResumeBtn = $('uploadResumeBtn');

resumeInput.addEventListener('change', () => {
  uploadResumeBtn.disabled = !resumeInput.files.length;
});

uploadResumeBtn.addEventListener('click', async () => {
  const file = resumeInput.files[0];
  if (!file) return;
  uploadResumeBtn.disabled = true;
  uploadResumeBtn.textContent = 'Uploading…';
  $('resumeStatus').textContent = '';
  try {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = () => reject(new Error('Could not read file.'));
      reader.readAsDataURL(file);
    });
    const res = await fetch('/api/resume', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileBase64: base64 })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Upload failed.');
    $('resumeStatus').textContent = `Replaced "${data.filename}". Vercel is redeploying — live in under a minute.`;
    showToast('Resume updated.', 'success');
    resumeInput.value = '';
  } catch (err) {
    $('resumeStatus').textContent = err.message || 'Upload failed.';
    showToast(err.message || 'Upload failed.', 'error');
  } finally {
    uploadResumeBtn.disabled = true;
    uploadResumeBtn.textContent = 'Upload & Replace';
  }
});

// ---------- boot ----------
(async function init() {
  const ok = await checkAuth();
  if (!ok) return;
  try {
    await loadContent();
    renderAll();
    $('loadingScreen').style.display = 'none';
    $('appContent').style.display = 'block';
  } catch (err) {
    $('loadingScreen').textContent = 'Failed to load content: ' + (err.message || err);
  }
})();
