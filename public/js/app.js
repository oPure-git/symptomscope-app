// ── Theme ──────────────────────────────────────────────────
function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  document.getElementById('theme-icon-moon').style.display = isDark ? 'none' : '';
  document.getElementById('theme-icon-sun').style.display  = isDark ? '' : 'none';
}

document.addEventListener('DOMContentLoaded', function () {
  const isDark = document.documentElement.classList.contains('dark');
  document.getElementById('theme-icon-moon').style.display = isDark ? 'none' : '';
  document.getElementById('theme-icon-sun').style.display  = isDark ? '' : 'none';
});

// ── Photo handling ─────────────────────────────────────────
let photos = []; // [{ dataUrl, base64, mediaType }]

function addPhoto() {
  if (photos.length >= 3) return;
  document.getElementById('photo-input').click();
}

function handlePhotoSelected(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  resizeImage(file, 1024, 0.82).then(photo => {
    photos.push(photo);
    renderPhotoRow();
  });
}

function removePhoto(idx) {
  photos.splice(idx, 1);
  renderPhotoRow();
}

function renderPhotoRow() {
  const row = document.getElementById('photo-row');
  row.innerHTML = '';

  photos.forEach((p, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'photo-thumb-wrap';
    wrap.innerHTML =
      `<img class="photo-thumb" src="${p.dataUrl}" alt="Photo ${i + 1}">` +
      `<button class="photo-remove" type="button" onclick="removePhoto(${i})" aria-label="Remove photo">&#215;</button>`;
    row.appendChild(wrap);
  });

  if (photos.length < 3) {
    const btn = document.createElement('button');
    btn.className = 'add-photo-btn';
    btn.type = 'button';
    btn.onclick = addPhoto;
    btn.innerHTML =
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
      `<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>` +
      `<circle cx="12" cy="13" r="4"/></svg>` +
      (photos.length === 0 ? 'Add Photo' : 'Add More');
    row.appendChild(btn);
  }

  document.getElementById('photo-privacy').style.display = photos.length > 0 ? 'block' : 'none';
}

function resizeImage(file, maxPx, quality) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width >= height) { height = Math.round(height * maxPx / width); width = maxPx; }
        else { width = Math.round(width * maxPx / height); height = maxPx; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result;
          resolve({ dataUrl, base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' });
        };
        reader.readAsDataURL(blob);
      }, 'image/jpeg', quality);
    };
    img.src = url;
  });
}

// ── Voice input ────────────────────────────────────────────
let recognition = null;
let isListening = false;

function toggleVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert('Voice input is not supported in this browser. Try Chrome or Edge.');
    return;
  }
  if (isListening) { recognition.stop(); return; }

  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  let base = document.getElementById('symptom-input').value;

  recognition.onresult = e => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) { base += (base ? ' ' : '') + t; }
      else { interim += t; }
    }
    document.getElementById('symptom-input').value = base + (interim ? ' ' + interim : '');
  };

  recognition.onend = () => { isListening = false; document.getElementById('mic-btn').classList.remove('active'); };
  recognition.onerror = () => { isListening = false; document.getElementById('mic-btn').classList.remove('active'); };

  recognition.start();
  isListening = true;
  document.getElementById('mic-btn').classList.add('active');
}

// ── Red flag detection ─────────────────────────────────────
// Keep in sync with src/lib/redFlags.js (server-side source of truth)
const RED_FLAGS = [
  { re: /chest\s+(pain|pressure|tightness)/i,             label: 'chest pain or pressure' },
  { re: /(can'?t|cannot|trouble|difficulty)\s+breath/i,   label: 'difficulty breathing' },
  { re: /shortness\s+of\s+breath/i,                       label: 'shortness of breath' },
  { re: /throat\s+(clos|swell)/i,                         label: 'throat closing or swelling' },
  { re: /(face|arm)\s+(droop|weak)/i,                     label: 'possible stroke symptoms' },
  { re: /sudden\s+(numbness|weakness|confusion|vision)/i, label: 'sudden neurological symptoms' },
  { re: /(unconscious|unresponsive)/i,                    label: 'loss of consciousness' },
  { re: /anaphyla/i,                                      label: 'anaphylaxis' },
  { re: /(severe\s+bleed|bleed.{0,20}won'?t stop|won'?t stop.{0,10}bleed)/i, label: 'severe bleeding' },
  { re: /overdose/i,                                      label: 'possible overdose' },
  { re: /(suicid|self.?harm)/i,                           label: 'thoughts of self-harm' },
];

function checkRedFlags(text) {
  for (const { re, label } of RED_FLAGS) {
    if (re.test(text)) return label;
  }
  return null;
}

// ── Helpers ───────────────────────────────────────────────
function fillExample(el) {
  document.getElementById('symptom-input').value = el.textContent.trim();
  document.getElementById('symptom-input').focus();
}

function setLoading(on) {
  document.getElementById('loader').style.display = on ? 'block' : 'none';
  const btn = document.getElementById('analyze-btn');
  btn.disabled = on;
  if (on) {
    btn.textContent = 'Analyzing…';
  } else {
    btn.innerHTML =
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px">` +
      `<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>` +
      ` Analyze Symptoms`;
  }
}

function showError(msg) {
  const box = document.getElementById('error-box');
  box.textContent = msg;
  box.style.display = 'block';
  setTimeout(() => { box.style.display = 'none'; }, 8000);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function urgencyLabel(u) {
  if (u === 'high') return 'High Urgency';
  if (u === 'medium') return 'Moderate';
  return 'Low Urgency';
}

function toggleCard(id) {
  document.getElementById('body-' + id).classList.toggle('open');
  document.getElementById('chevron-' + id).classList.toggle('open');
}

// ── Render results ────────────────────────────────────────
function renderConditions(conditions) {
  const container = document.getElementById('results');
  container.innerHTML = '';

  const pro = isPro();
  const FREE_LIMIT = 3;
  const visible = pro ? conditions : conditions.slice(0, FREE_LIMIT);
  const locked  = pro ? []         : conditions.slice(FREE_LIMIT);

  document.getElementById('results-meta').style.display = 'block';
  document.getElementById('results-count').textContent = pro
    ? `${conditions.length} conditions found`
    : `Showing ${visible.length} of ${conditions.length} — upgrade for all`;

  visible.forEach((c, i) => {
    const rankClass   = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : '';
    const urgencyClass = 'urgency-' + (c.urgency || 'low');

    const matchChips = (c.matchingSymptoms || [])
      .map(s => `<span class="match-chip">${escHtml(s)}</span>`).join('');

    const thumbHtml = c.imageUrl
      ? `<img class="card-thumb" src="${escHtml(c.imageUrl)}" alt="${escHtml(c.name)}" loading="lazy" onerror="this.style.display='none'">`
      : `<div class="card-thumb-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/></svg></div>`;

    const expandedImageHtml = c.imageUrl
      ? `<div class="condition-image-wrap full">
           <img src="${escHtml(c.imageUrl)}" alt="${escHtml(c.name)}" loading="lazy" onerror="this.closest('.condition-image-wrap').style.display='none'">
           <div class="condition-image-caption">
             <span>${escHtml(c.imageCaption || c.name)}</span>
             ${c.wikiUrl ? `<a class="wiki-link" href="${escHtml(c.wikiUrl)}" target="_blank" rel="noopener">Read on Wikipedia ↗</a>` : ''}
           </div>
         </div>`
      : (c.wikiUrl
        ? `<div class="detail-section full"><a class="wiki-link" href="${escHtml(c.wikiUrl)}" target="_blank" rel="noopener">Read about ${escHtml(c.name)} on Wikipedia ↗</a></div>`
        : '');

    const card = document.createElement('div');
    card.className = 'condition-card';
    card.style.animationDelay = (i * 60) + 'ms';
    card.innerHTML = `
      <div class="card-header" onclick="toggleCard(${i})">
        <div class="rank-badge ${rankClass}">#${i + 1}</div>
        <div class="card-title-group">
          <div class="card-title-row">
            <span class="condition-name">${escHtml(c.name)}</span>
            <span class="urgency-badge ${urgencyClass}">${urgencyLabel(c.urgency)}</span>
          </div>
          <div class="likelihood-row">
            <div class="likelihood-bar-wrap">
              <div class="likelihood-bar" style="width:${c.likelihood || 0}%"></div>
            </div>
            <span class="likelihood-pct">${c.likelihood || 0}%</span>
          </div>
          <p class="card-overview">${escHtml(c.overview || '')}</p>
        </div>
        ${thumbHtml}
        <svg id="chevron-${i}" class="card-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      <div class="card-body" id="body-${i}">
        <div class="card-body-inner">
          ${expandedImageHtml}
          ${matchChips ? `<div class="detail-section full"><div class="detail-label">Your Matching Symptoms</div><div class="matching-chips">${matchChips}</div></div>` : ''}
          ${c.causes && c.causes.length ? `<div class="detail-section"><div class="detail-label">Common Causes</div><ul class="detail-list">${c.causes.map(x => `<li>${escHtml(x)}</li>`).join('')}</ul></div>` : ''}
          ${c.treatments && c.treatments.length ? `<div class="detail-section"><div class="detail-label">Treatments &amp; Management</div><ul class="detail-list">${c.treatments.map(x => `<li>${escHtml(x)}</li>`).join('')}</ul></div>` : ''}
          ${c.otherSymptoms && c.otherSymptoms.length ? `<div class="detail-section full"><div class="detail-label">Other Symptoms of This Condition</div><ul class="detail-list" style="columns:2;gap:16px">${c.otherSymptoms.map(x => `<li>${escHtml(x)}</li>`).join('')}</ul></div>` : ''}
          ${c.whenToSeeDoctor ? `<div class="detail-section full"><div class="detail-label">When to See a Doctor</div><div class="doctor-box">${escHtml(c.whenToSeeDoctor)}</div></div>` : ''}
        </div>
      </div>`;
    container.appendChild(card);
  });

  if (locked.length > 0) {
    const lockedDiv = document.createElement('div');
    lockedDiv.className = 'locked-results';
    lockedDiv.style.animationDelay = (visible.length * 60) + 'ms';
    lockedDiv.innerHTML =
      `<div class="locked-header">` +
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>` +
      `${locked.length} more condition${locked.length > 1 ? 's' : ''} found — upgrade to unlock</div>` +
      `<ul class="locked-list">` +
      locked.map((c, i) => {
        const u = c.urgency || 'low';
        const label = u === 'high' ? 'High Urgency' : u === 'medium' ? 'Moderate' : 'Low';
        return `<li class="locked-item">` +
          `<span class="locked-rank">#${visible.length + i + 1}</span>` +
          `<span class="locked-name">${escHtml(c.name)}</span>` +
          `<span class="locked-urgency ${u}">${label}</span>` +
          `</li>`;
      }).join('') +
      `</ul>` +
      `<button class="locked-upgrade-btn" onclick="showUpgradeBanner()">` +
      `Upgrade to Pro to unlock all ${conditions.length} results &mdash; $7/mo` +
      `</button>`;
    container.appendChild(lockedDiv);
  }
}

// ── Pro status ──────────────────────────────────────────────
function isPro() { return true; }

// ── Usage tracking (client-side soft limit) ─────────────────
const DAILY_LIMIT = 3;
const usageKey = () => `ss_usage_${new Date().toISOString().slice(0, 10)}`;

function getUsageToday() {
  return parseInt(localStorage.getItem(usageKey()) || '0', 10);
}

function incrementUsage() {
  const k = usageKey();
  localStorage.setItem(k, (parseInt(localStorage.getItem(k) || '0', 10) + 1).toString());
}

function updateUsageDisplay() {
  const used = getUsageToday();
  const el = document.getElementById('usage-indicator');
  if (!el) return;
  if (used === 0) { el.style.display = 'none'; return; }
  const left = Math.max(0, DAILY_LIMIT - used);
  el.style.display = 'block';
  if (left === 0) {
    el.innerHTML = `<span class="usage-zero">Daily limit reached &mdash; </span><a href="#upgrade" onclick="showUpgradeBanner()">Upgrade for unlimited</a>`;
  } else {
    el.textContent = `${used} of ${DAILY_LIMIT} free analyses used today`;
  }
}

function showUpgradeBanner() {
  document.getElementById('upgrade-banner').style.display = 'block';
  document.getElementById('upgrade-banner').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function dismissUpgrade() {
  document.getElementById('upgrade-banner').style.display = 'none';
}

// ── Telehealth CTA ────────────────────────────────────────
function renderTelehealthCTA(conditions) {
  const cta = document.getElementById('telehealth-cta');
  const hasHighUrgency = conditions.some(c => c.urgency === 'high');
  cta.classList.toggle('urgent', hasHighUrgency);
  document.getElementById('telehealth-title').textContent = hasHighUrgency
    ? 'Some results are high urgency — see a doctor today'
    : 'Want a real doctor\'s opinion?';
  document.getElementById('telehealth-btn').textContent = hasHighUrgency
    ? 'See a Doctor Now →'
    : 'Talk to a Doctor →';
  cta.style.display = 'block';
}

// ── Analyze ───────────────────────────────────────────────
async function analyze() {
  const symptoms = document.getElementById('symptom-input').value.trim();

  if (!symptoms && photos.length === 0) {
    showError('Please describe your symptoms or add a photo before analyzing.');
    return;
  }
  if (symptoms && symptoms.length < 5 && photos.length === 0) {
    showError('Please provide a bit more detail about your symptoms.');
    return;
  }

  const flag = checkRedFlags(symptoms);
  if (flag) {
    document.getElementById('emergency-text').textContent =
      `Your symptoms include ${flag}, which may require immediate emergency care. ` +
      `Please do not wait — call 911 or go to your nearest emergency room now.`;
    const banner = document.getElementById('emergency-banner');
    banner.style.display = 'block';
    banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const context = {
    age:      document.getElementById('ctx-age').value || '',
    sex:      document.getElementById('ctx-sex').value || '',
    duration: document.getElementById('ctx-duration').value.trim() || '',
    severity: document.getElementById('ctx-severity').value || '',
  };

  document.getElementById('error-box').style.display = 'none';
  document.getElementById('results-meta').style.display = 'none';
  document.getElementById('results').innerHTML = '';
  setLoading(true);

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symptoms,
        context,
        images: photos.map(p => ({ data: p.base64, mediaType: p.mediaType })),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      showError(data.error || 'Something went wrong. Please try again.');
      return;
    }

    incrementUsage();
    updateUsageDisplay();
    renderConditions(data.conditions);
    renderTelehealthCTA(data.conditions);
    document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch {
    showError('Could not connect to the server. Make sure it is running.');
  } finally {
    setLoading(false);
  }
}

// Ctrl/Cmd + Enter shortcut
document.getElementById('symptom-input').addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') analyze();
});

updateUsageDisplay();
