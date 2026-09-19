/* ======================================================
   منظومة خدمة المواطنين - حزب مستقبل وطن
   Citizen Portal Application Logic (app.js)
   متوافق مع المعايير المصرية وسياسات الويب الحديثة
   ====================================================== */

'use strict';

const STORAGE_KEYS = {
  COMPLAINTS: 'mw_complaints',
  THEME: 'mw_theme'
};

const STATUS_STEPS = {
  'قيد الاستلام': 1,
  'قيد المراجعة': 1,
  'تم الإسناد': 2,
  'فحص ميداني': 3,
  'التنسيق مع الأجهزة التنفيذية': 4,
  'تم الحل والإنجاز': 5,
  'اعتذار مع التوضيح': 5
};

const STATUS_BADGES = {
  'قيد الاستلام': 'badge-pending',
  'قيد المراجعة': 'badge-pending',
  'تم الإسناد': 'badge-inprogress',
  'فحص ميداني': 'badge-inprogress',
  'تم الحل والإنجاز': 'badge-done',
  'اعتذار مع التوضيح': 'badge-normal'
};

const PRIORITY_BADGES = {
  'عادي': 'badge-normal',
  'هام': 'badge-pending',
  'عاجل جداً': 'badge-urgent'
};

// Valid Egyptian Governorate Codes according to Civil Status Authority
const VALID_EGYPTIAN_GOV_CODES = [
  '01', '02', '03', '04', '11', '12', '13', '14', '15', '16',
  '17', '18', '19', '21', '22', '23', '24', '25', '26', '27',
  '28', '29', '31', '32', '33', '34', '35', '88'
];

const OFFICES_DATA = [
  {
    name: 'أمانة القاهرة الرئيسية',
    address: 'شارع التحرير - وسط البلد - محافظة القاهرة',
    hours: 'من السبت إلى الخميس: 9:00 ص - 5:00 م'
  },
  {
    name: 'أمانة الجيزة',
    address: 'شارع الهرم - بالقرب من محطة المترو - محافظة الجيزة',
    hours: 'من السبت إلى الخميس: 9:00 ص - 5:00 م'
  },
  {
    name: 'أمانة الإسكندرية',
    address: 'طريق الجيش - محطة الرمل - وسط الإسكندرية',
    hours: 'من السبت إلى الخميس: 9:00 ص - 5:00 م'
  },
  {
    name: 'أمانة الدقهلية',
    address: 'شارع المشاية السفلية - المنصورة - محافظة الدقهلية',
    hours: 'من السبت إلى الخميس: 9:00 ص - 4:00 م'
  },
  {
    name: 'أمانة الشرقية',
    address: 'شارع الجلاء - الزقازيق - محافظة الشرقية',
    hours: 'من السبت إلى الخميس: 9:00 ص - 4:00 م'
  },
  {
    name: 'أمانة أسيوط',
    address: 'شارع الجمهورية - وسط مدينة أسيوط',
    hours: 'من السبت إلى الخميس: 9:00 ص - 4:00 م'
  },
  {
    name: 'أمانة الغربية',
    address: 'شارع النحاس - طنطا - محافظة الغربية',
    hours: 'من السبت إلى الخميس: 9:00 ص - 4:00 م'
  },
  {
    name: 'أمانة المنيا',
    address: 'كورنيش النيل - مدينة المنيا',
    hours: 'من السبت إلى الخميس: 9:00 ص - 4:00 م'
  },
  {
    name: 'أمانة سوهاج',
    address: 'شارع سيتي - سوهاج',
    hours: 'من الأحد إلى الخميس: 9:00 ص - 3:00 م'
  }
];

let complaints = [];
let selectedFiles = [];

/* ============ Initialization ============ */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadComplaints();
  renderOffices();
  setupDragDrop();
});

/* ============ Theme Management ============ */
function initTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'system';
  applyTheme(savedTheme);
  updateThemeButtons(savedTheme);
}

function setTheme(theme) {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
  applyTheme(theme);
  updateThemeButtons(theme);
}

function applyTheme(theme) {
  let effective = theme;
  if (theme === 'system') {
    effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', effective);
}

function updateThemeButtons(activeTheme) {
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeValue === activeTheme);
  });
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (localStorage.getItem(STORAGE_KEYS.THEME) === 'system') {
    applyTheme('system');
  }
});

/* ============ Tabs ============ */
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });

  const tabMap = {
    newRequest: 'tabNewRequest',
    tracking: 'tabTracking',
    offices: 'tabOffices'
  };

  const target = document.getElementById(tabMap[tabName]);
  if (target) target.classList.add('active');
}

/* ============ Complaint Storage ============ */
function loadComplaints() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.COMPLAINTS);
    complaints = stored ? JSON.parse(stored) : [];
  } catch (e) {
    complaints = [];
  }
}

function saveComplaints() {
  localStorage.setItem(STORAGE_KEYS.COMPLAINTS, JSON.stringify(complaints));
}

function generateTrackingCode() {
  const num = Math.floor(1000 + Math.random() * 9000);
  const code = `MW-2025-${num}`;
  if (complaints.some(c => c.code === code)) {
    return generateTrackingCode();
  }
  return code;
}

/* ============ Advanced Egyptian Validation ============ */
function validateEgyptianNationalId(id) {
  if (!/^\d{14}$/.test(id)) return false;
  
  // Century check: 2 for 1900-1999, 3 for 2000-2099
  const century = id[0];
  if (century !== '2' && century !== '3') return false;

  // Month check: 01 to 12
  const month = parseInt(id.substr(3, 2), 10);
  if (month < 1 || month > 12) return false;

  // Day check: 01 to 31
  const day = parseInt(id.substr(5, 2), 10);
  if (day < 1 || day > 31) return false;

  // Governorate check
  const govCode = id.substr(7, 2);
  if (!VALID_EGYPTIAN_GOV_CODES.includes(govCode)) return false;

  return true;
}

function validateEgyptianPhone(phone) {
  return /^01[0125]\d{8}$/.test(phone);
}

function validateArabicName(name) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 3 && name.trim().length >= 8;
}

function validateField(groupId, inputId, validator) {
  const group = document.getElementById(groupId);
  const input = document.getElementById(inputId);
  if (!group || !input) return true;
  
  const val = input.value.trim();
  const valid = validator(val);

  group.classList.toggle('has-error', !valid);
  return valid;
}

function submitComplaint(event) {
  event.preventDefault();

  let valid = true;
  valid = validateField('grpName', 'citizenName', validateArabicName) && valid;
  valid = validateField('grpNationalId', 'nationalId', validateEgyptianNationalId) && valid;
  valid = validateField('grpPhone', 'citizenPhone', validateEgyptianPhone) && valid;
  valid = validateField('grpGov', 'governorate', v => v !== '') && valid;
  valid = validateField('grpDistrict', 'district', v => v.length >= 2) && valid;
  valid = validateField('grpAddress', 'address', v => v.length >= 4) && valid;
  valid = validateField('grpCategory', 'category', v => v !== '') && valid;
  valid = validateField('grpPriority', 'priority', v => v !== '') && valid;
  valid = validateField('grpSubject', 'subject', v => v.length >= 4) && valid;
  valid = validateField('grpDescription', 'description', v => v.length >= 10) && valid;

  // Legal Consent Check
  const consentBox = document.getElementById('legalConsent');
  const consentGroup = document.getElementById('grpConsent');
  if (!consentBox.checked) {
    consentGroup.classList.add('has-error');
    valid = false;
  } else {
    consentGroup.classList.remove('has-error');
  }

  if (!valid) {
    showToast('error', 'تنبيه التحقق', 'يرجى تصحيح الحقول المطلوبة والتأكد من صحة الرقم القومي والهاتف والموافقة على الإقرار');
    return false;
  }

  loadComplaints();
  const code = generateTrackingCode();
  const now = new Date().toISOString();

  const newComplaint = {
    id: 'C_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    code: code,
    citizenName: document.getElementById('citizenName').value.trim(),
    nationalId: document.getElementById('nationalId').value.trim(),
    phone: document.getElementById('citizenPhone').value.trim(),
    governorate: document.getElementById('governorate').value,
    district: document.getElementById('district').value.trim(),
    address: document.getElementById('address').value.trim(),
    category: document.getElementById('category').value,
    priority: document.getElementById('priority').value,
    subject: document.getElementById('subject').value.trim(),
    description: document.getElementById('description').value.trim(),
    status: 'قيد الاستلام',
    department: '',
    officialResponse: '',
    files: selectedFiles.map(f => f.name),
    createdAt: now,
    updatedAt: now,
    timeline: [
      {
        date: now,
        text: 'تم استلام وتوثيق الشكوى بنجاح عبر المنصة الرسمية لأمانة العمل الجماهيري',
        type: 'system'
      }
    ],
    followups: []
  };

  complaints.unshift(newComplaint);
  saveComplaints();

  // Reset form
  document.getElementById('complaintForm').reset();
  selectedFiles = [];
  document.getElementById('filePreviewList').innerHTML = '';
  document.querySelectorAll('.form-group').forEach(g => g.classList.remove('has-error'));

  // Show success modal/toast
  showSuccessToast(code);
  return false;
}

function resetForm() {
  selectedFiles = [];
  document.getElementById('filePreviewList').innerHTML = '';
  document.querySelectorAll('.form-group').forEach(g => g.classList.remove('has-error'));
}

/* ============ File Upload ============ */
function setupDragDrop() {
  const area = document.getElementById('fileUploadArea');
  if (!area) return;

  ['dragenter', 'dragover'].forEach(evt => {
    area.addEventListener(evt, e => {
      e.preventDefault();
      area.style.borderColor = 'var(--brand-blue-light)';
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    area.addEventListener(evt, e => {
      e.preventDefault();
      area.style.borderColor = '';
    });
  });

  area.addEventListener('drop', e => {
    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  });
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  addFiles(files);
  event.target.value = '';
}

function addFiles(files) {
  const max = 5;
  files.forEach(f => {
    if (selectedFiles.length >= max) return;
    if (!selectedFiles.some(x => x.name === f.name)) {
      selectedFiles.push(f);
    }
  });
  renderFilePreview();
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderFilePreview();
}

function renderFilePreview() {
  const list = document.getElementById('filePreviewList');
  if (!list) return;
  list.innerHTML = selectedFiles.map((file, i) => `
    <div class="file-preview-item">
      <span>📄 ${escapeHtml(file.name)}</span>
      <span class="remove-file" onclick="removeFile(${i})" title="إزالة">&times;</span>
    </div>
  `).join('');
}

/* ============ Search & Tracking ============ */
function searchComplaint() {
  const inputEl = document.getElementById('trackingInput');
  const query = inputEl ? inputEl.value.trim() : '';
  const resDiv = document.getElementById('trackingResult');
  const notFound = document.getElementById('trackingNotFound');

  if (!query) {
    showToast('warning', 'تنبيه', 'يرجى إدخال كود المتابعة (مثال: MW-2025-XXXX) أو رقم الهاتف');
    return;
  }

  loadComplaints();

  let item = complaints.find(c => c.code.toLowerCase() === query.toLowerCase());
  if (!item) {
    const matchPhone = complaints.filter(c => c.phone === query);
    if (matchPhone.length > 0) item = matchPhone[0];
  }

  if (item) {
    resDiv.classList.remove('hidden');
    notFound.classList.add('hidden');
    renderTrackingDetails(item);
  } else {
    resDiv.classList.add('hidden');
    notFound.classList.remove('hidden');
  }
}

function renderTrackingDetails(c) {
  document.getElementById('trackingCode').textContent = c.code;

  const badge = document.getElementById('trackingStatusBadge');
  badge.className = `badge ${STATUS_BADGES[c.status] || 'badge-normal'}`;
  badge.textContent = c.status;

  document.getElementById('trackingInfoGrid').innerHTML = `
    <div class="tracking-info-item">
      <label>اسم المواطن</label>
      <span>${escapeHtml(c.citizenName)}</span>
    </div>
    <div class="tracking-info-item">
      <label>المحافظة والمركز</label>
      <span>${escapeHtml(c.governorate)} - ${escapeHtml(c.district)}</span>
    </div>
    <div class="tracking-info-item">
      <label>التصنيف والأهمية</label>
      <span>${escapeHtml(c.category)} (${escapeHtml(c.priority)})</span>
    </div>
    <div class="tracking-info-item">
      <label>تاريخ التقديم</label>
      <span>${formatDate(c.createdAt)}</span>
    </div>
    <div class="tracking-info-item" style="grid-column: 1 / -1;">
      <label>موضوع الشكوى</label>
      <span>${escapeHtml(c.subject)}</span>
    </div>
    <div class="tracking-info-item" style="grid-column: 1 / -1;">
      <label>الشرح والتفاصيل</label>
      <span>${escapeHtml(c.description)}</span>
    </div>
  `;

  // Stepper
  const stepNum = STATUS_STEPS[c.status] || 1;
  document.querySelectorAll('#trackingStepper .stepper-step').forEach(step => {
    const n = parseInt(step.dataset.step);
    step.classList.remove('completed', 'active');
    if (n < stepNum) step.classList.add('completed');
    else if (n === stepNum) step.classList.add('active');
  });

  // Response Box
  const respDiv = document.getElementById('officialResponse');
  if (c.officialResponse) {
    respDiv.classList.remove('hidden');
    document.getElementById('officialResponseText').textContent = c.officialResponse;
    document.getElementById('assignedDept').textContent = c.department || 'أمانة العمل الجماهيري والمتابعة';
  } else {
    respDiv.classList.add('hidden');
  }

  // Timeline
  const tlDiv = document.getElementById('trackingTimeline');
  const allEvents = [
    ...c.timeline.map(t => ({ date: t.date, text: t.text })),
    ...c.followups.map(f => ({ date: f.date, text: `تعقيب المواطن: ${f.text}` }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  tlDiv.innerHTML = allEvents.map(e => `
    <div class="timeline-item">
      <div class="timeline-date">${formatDateTime(e.date)}</div>
      <div class="timeline-text">${escapeHtml(e.text)}</div>
    </div>
  `).join('');

  document.getElementById('trackingResult').dataset.currentId = c.id;
}

function addFollowup() {
  const text = document.getElementById('followupText').value.trim();
  const cid = document.getElementById('trackingResult').dataset.currentId;

  if (!text) {
    showToast('warning', 'تنبيه', 'يرجى كتابة نص التعقيب أو الاستفسار');
    return;
  }

  loadComplaints();
  const c = complaints.find(x => x.id === cid);
  if (!c) return;

  c.followups.push({
    date: new Date().toISOString(),
    text: text
  });
  c.updatedAt = new Date().toISOString();
  saveComplaints();

  document.getElementById('followupText').value = '';
  renderTrackingDetails(c);
  showToast('success', 'تم الإرسال', 'تم إرسال تعقيبك بنجاح وسيقوم المشرف بمراجعته');
}

/* ============ Offices ============ */
function renderOffices() {
  const grid = document.getElementById('officesGrid');
  if (!grid) return;

  grid.innerHTML = OFFICES_DATA.map(o => `
    <div class="office-card">
      <h3>🏛️ ${escapeHtml(o.name)}</h3>
      <div class="office-info">
        <span>📍 ${escapeHtml(o.address)}</span>
        <span>🕐 مواعيد العمل: ${escapeHtml(o.hours)}</span>
      </div>
    </div>
  `).join('');
}

/* ============ Toast Notifications ============ */
function showToast(type, title, message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
    <div class="toast-content">
      <h4>${escapeHtml(title)}</h4>
      <p>${escapeHtml(message)}</p>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);
  setTimeout(() => { if (toast.parentElement) toast.remove(); }, 5000);
}

function showSuccessToast(code) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast-icon">🎉</div>
    <div class="toast-content">
      <h4>تم تسجيل طلبك بنجاح!</h4>
      <p>يرجى حفظ كود المتابعة التالي للاستعلام عن المراحل والردود الرسمية:</p>
      <div class="toast-code">
        <span>${code}</span>
        <button class="copy-btn" onclick="copyCode('${code}', this)" title="نسخ الكود">📋</button>
      </div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;
  container.appendChild(toast);
}

function copyCode(code, btn) {
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = '✅';
    setTimeout(() => { btn.textContent = '📋'; }, 2000);
    showToast('success', 'تم النسخ', 'تم نسخ كود المتابعة إلى الحافظة بنجاح');
  }).catch(() => {
    showToast('success', 'كود المتابعة', code);
  });
}

/* ============ Utilities ============ */
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[m]);
}

function formatDate(iso) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) { return '-'; }
}

function formatDateTime(iso) {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return '-'; }
}
