/* ======================================================
   منظومة خدمة المواطنين - حزب مستقبل وطن
   Admin Portal Application Logic (admin.js)
   ====================================================== */

'use strict';

const STORAGE_KEYS = {
  COMPLAINTS: 'mw_complaints',
  THEME: 'mw_theme',
  ADMIN_USERS: 'mw_admin_users',
  ACTIVE_SESSION: 'mw_admin_active_session'
};

const DEFAULT_ADMIN = {
  id: 'usr_admin_1',
  fullName: 'المسؤول الرئيسي للغرفة',
  username: 'admin',
  password: 'admin123',
  role: 'admin',
  createdAt: new Date().toISOString()
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

const ROLE_LABELS = {
  admin: { title: 'مسؤول رئيسي', class: 'role-admin' },
  supervisor: { title: 'مشرف أمانة', class: 'role-supervisor' },
  officer: { title: 'موظف متابعة', class: 'role-officer' }
};

let complaints = [];
let adminUsers = [];
let currentUser = null;
let currentComplaintId = null;
let filteredComplaints = [];

/* ============ Initialization ============ */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initUsers();
  loadComplaints();
  checkAuthSession();
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

/* ============ Users / Admin Authentication ============ */
function initUsers() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ADMIN_USERS);
    if (stored) {
      adminUsers = JSON.parse(stored);
    } else {
      adminUsers = [DEFAULT_ADMIN];
      saveUsers();
    }
  } catch (e) {
    adminUsers = [DEFAULT_ADMIN];
    saveUsers();
  }
}

function saveUsers() {
  localStorage.setItem(STORAGE_KEYS.ADMIN_USERS, JSON.stringify(adminUsers));
}

function checkAuthSession() {
  const sessionUserId = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
  if (sessionUserId) {
    const user = adminUsers.find(u => u.id === sessionUserId);
    if (user) {
      loginSuccess(user);
      return;
    }
  }
  showLoginView();
}

function handleAdminLogin(event) {
  event.preventDefault();
  initUsers();

  const userField = document.getElementById('loginUsername').value.trim();
  const passField = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');

  const matched = adminUsers.find(u => u.username.toLowerCase() === userField.toLowerCase() && u.password === passField);

  if (matched) {
    errorDiv.style.display = 'none';
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, matched.id);
    loginSuccess(matched);
    showToast('success', 'مرحباً بك', `تم تسجيل الدخول بنجاح بصفتك: ${matched.fullName}`);
  } else {
    errorDiv.style.display = 'block';
    document.getElementById('loginPassword').value = '';
  }
  return false;
}

function loginSuccess(user) {
  currentUser = user;
  document.getElementById('loginSection').classList.add('hidden');
  document.getElementById('dashboardSection').classList.remove('hidden');
  document.getElementById('headerUserSection').classList.remove('hidden');

  document.getElementById('currentUserNameDisplay').textContent = user.fullName;
  const roleInfo = ROLE_LABELS[user.role] || { title: user.role, class: 'role-officer' };
  const badge = document.getElementById('currentUserRoleBadge');
  badge.textContent = roleInfo.title;
  badge.className = `badge ${roleInfo.class}`;

  renderDashboard();
}

function handleLogout() {
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  currentUser = null;
  document.getElementById('dashboardSection').classList.add('hidden');
  document.getElementById('headerUserSection').classList.add('hidden');
  showLoginView();
  showToast('info', 'تم الخروج', 'تم تسجيل الخروج من النظام بنجاح');
}

function showLoginView() {
  document.getElementById('loginSection').classList.remove('hidden');
  document.getElementById('loginUsername').value = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').style.display = 'none';
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

/* ============ User Management (CRUD) ============ */
function openUsersModal() {
  initUsers();
  renderUsersTable();
  openModal('usersModal');
}

function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = adminUsers.map(u => {
    const roleInfo = ROLE_LABELS[u.role] || { title: u.role, class: 'role-officer' };
    const isCurrent = currentUser && currentUser.id === u.id;
    return `
      <tr>
        <td style="font-weight: 700;">${escapeHtml(u.fullName)} ${isCurrent ? '<span style="color: var(--brand-blue-light); font-size: 0.75rem;">(أنت)</span>' : ''}</td>
        <td><code>${escapeHtml(u.username)}</code></td>
        <td><span class="badge ${roleInfo.class}">${roleInfo.title}</span></td>
        <td>${formatDate(u.createdAt)}</td>
        <td>
          ${!isCurrent && adminUsers.length > 1 ? `
            <button class="btn btn-danger btn-sm" onclick="deleteUser('${u.id}')" title="حذف الحساب">
              🗑️ حذف
            </button>
          ` : '<span style="color: var(--text-tertiary); font-size: 0.8rem;">الحساب النشط</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

function handleCreateUser(event) {
  event.preventDefault();
  initUsers();

  const fullName = document.getElementById('newFullName').value.trim();
  const username = document.getElementById('newUsername').value.trim();
  const password = document.getElementById('newPassword').value;
  const role = document.getElementById('newRole').value;

  if (adminUsers.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    showToast('error', 'خطأ', 'اسم المستخدم موجود بالفعل، يرجى اختيار اسم آخر');
    return false;
  }

  const newUser = {
    id: 'usr_' + Date.now(),
    fullName,
    username,
    password,
    role,
    createdAt: new Date().toISOString()
  };

  adminUsers.push(newUser);
  saveUsers();

  document.getElementById('newFullName').value = '';
  document.getElementById('newUsername').value = '';
  document.getElementById('newPassword').value = '';

  renderUsersTable();
  showToast('success', 'تمت الإضافة', `تم إنشاء حساب ${fullName} بنجاح`);
  return false;
}

function deleteUser(userId) {
  if (!confirm('هل أنت متأكد من رغبتك في حذف هذا الحساب؟')) return;
  initUsers();
  adminUsers = adminUsers.filter(u => u.id !== userId);
  saveUsers();
  renderUsersTable();
  showToast('info', 'تم الحذف', 'تم حذف حساب المشرف بنجاح');
}

/* ============ Profile & Password Update ============ */
function openProfileModal() {
  if (!currentUser) return;
  document.getElementById('profileFullName').value = currentUser.fullName;
  document.getElementById('profileUsername').value = currentUser.username;
  document.getElementById('profileNewPassword').value = '';
  openModal('profileModal');
}

function handleUpdateProfile(event) {
  event.preventDefault();
  if (!currentUser) return;
  initUsers();

  const fullName = document.getElementById('profileFullName').value.trim();
  const username = document.getElementById('profileUsername').value.trim();
  const newPass = document.getElementById('profileNewPassword').value;

  const collision = adminUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== currentUser.id);
  if (collision) {
    showToast('error', 'خطأ', 'اسم المستخدم مستخدم بالفعل من قبل حساب آخر');
    return false;
  }

  const idx = adminUsers.findIndex(u => u.id === currentUser.id);
  if (idx !== -1) {
    adminUsers[idx].fullName = fullName;
    adminUsers[idx].username = username;
    if (newPass.trim() !== '') {
      adminUsers[idx].password = newPass;
    }
    saveUsers();
    currentUser = adminUsers[idx];

    document.getElementById('currentUserNameDisplay').textContent = currentUser.fullName;
    closeModal('profileModal');
    showToast('success', 'تم التحديث', 'تم حفظ وتحديث بيانات حسابك وكلمة المرور بنجاح');
  }
  return false;
}

/* ============ Dashboard & Complaints Logic ============ */
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

function renderDashboard() {
  loadComplaints();
  updateKPIs();
  applyFilters();
}

function updateKPIs() {
  const total = complaints.length;
  const done = complaints.filter(c => c.status === 'تم الحل والإنجاز').length;
  const inProgress = complaints.filter(c => !['تم الحل والإنجاز', 'اعتذار مع التوضيح'].includes(c.status)).length;
  const urgent = complaints.filter(c => c.priority === 'عاجل جداً' && c.status !== 'تم الحل والإنجاز').length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById('kpiTotal').textContent = total;
  document.getElementById('kpiDone').textContent = done;
  document.getElementById('kpiInProgress').textContent = inProgress;
  document.getElementById('kpiUrgent').textContent = urgent;
  document.getElementById('kpiPercent').textContent = percent + '%';
  document.getElementById('kpiPercentBar').style.width = percent + '%';
}

function applyFilters() {
  loadComplaints();

  const search = document.getElementById('filterSearch').value.trim().toLowerCase();
  const gov = document.getElementById('filterGov').value;
  const cat = document.getElementById('filterCategory').value;
  const status = document.getElementById('filterStatus').value;
  const priority = document.getElementById('filterPriority').value;

  filteredComplaints = complaints.filter(c => {
    if (gov && c.governorate !== gov) return false;
    if (cat && c.category !== cat) return false;
    if (status && c.status !== status) return false;
    if (priority && c.priority !== priority) return false;
    if (search) {
      const q = `${c.code} ${c.citizenName} ${c.nationalId} ${c.phone} ${c.subject} ${c.district}`.toLowerCase();
      if (!q.includes(search)) return false;
    }
    return true;
  });

  renderTable(filteredComplaints);
}

function renderTable(data) {
  const tbody = document.getElementById('complaintsTableBody');
  const empty = document.getElementById('tableEmpty');

  if (data.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  tbody.innerHTML = data.map(c => `
    <tr>
      <td>
        <span class="complaint-code" onclick="openComplaintDetails('${c.id}')">${escapeHtml(c.code)}</span>
      </td>
      <td style="font-weight: 700;">${escapeHtml(c.citizenName)}</td>
      <td>${escapeHtml(c.governorate)}</td>
      <td>${escapeHtml(c.category)}</td>
      <td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(c.subject)}</td>
      <td><span class="badge ${PRIORITY_BADGES[c.priority] || 'badge-normal'}">${escapeHtml(c.priority)}</span></td>
      <td><span class="badge ${STATUS_BADGES[c.status] || 'badge-normal'}">${escapeHtml(c.status)}</span></td>
      <td>${formatDate(c.createdAt)}</td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="openComplaintDetails('${c.id}')">
          ⚙️ معالجة
        </button>
      </td>
    </tr>
  `).join('');
}

/* ============ Complaint Modal Actions ============ */
function openComplaintDetails(id) {
  loadComplaints();
  const c = complaints.find(x => x.id === id);
  if (!c) return;

  currentComplaintId = id;

  document.getElementById('modalCitizenInfo').innerHTML = `
    <div class="detail-row">
      <span class="detail-label">الاسم الرباعي</span>
      <span class="detail-value">${escapeHtml(c.citizenName)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">الرقم القومي</span>
      <span class="detail-value"><code>${escapeHtml(c.nationalId)}</code></span>
    </div>
    <div class="detail-row">
      <span class="detail-label">رقم الهاتف</span>
      <span class="detail-value">${escapeHtml(c.phone)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">المحافظة والمركز</span>
      <span class="detail-value">${escapeHtml(c.governorate)} - ${escapeHtml(c.district)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">العنوان التفصيلي</span>
      <span class="detail-value">${escapeHtml(c.address)}</span>
    </div>
  `;

  document.getElementById('modalComplaintInfo').innerHTML = `
    <div class="detail-row">
      <span class="detail-label">كود البلاغ</span>
      <span class="detail-value" style="color: var(--brand-blue-light); font-weight: 800; font-family: 'Cairo', monospace;">${escapeHtml(c.code)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">التصنيف والأهمية</span>
      <span class="detail-value">${escapeHtml(c.category)} | <span class="badge ${PRIORITY_BADGES[c.priority] || 'badge-normal'}">${escapeHtml(c.priority)}</span></span>
    </div>
    <div class="detail-row">
      <span class="detail-label">موضوع الشكوى</span>
      <span class="detail-value" style="font-weight: 700;">${escapeHtml(c.subject)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">شرح الشكوى</span>
      <span class="detail-value">${escapeHtml(c.description)}</span>
    </div>
    ${c.files && c.files.length > 0 ? `
    <div class="detail-row">
      <span class="detail-label">المرفقات</span>
      <span class="detail-value">${c.files.map(f => `📄 ${escapeHtml(f)}`).join(' ، ')}</span>
    </div>
    ` : ''}
  `;

  document.getElementById('modalStatus').value = c.status;
  document.getElementById('modalDepartment').value = c.department || '';
  document.getElementById('modalResponse').value = c.officialResponse || '';
  document.getElementById('modalInternalNote').value = '';

  renderModalTimeline(c);
  openModal('complaintModal');
}

function renderModalTimeline(c) {
  const container = document.getElementById('modalTimeline');
  const allEvents = [
    ...c.timeline.map(t => ({ date: t.date, text: t.text })),
    ...c.followups.map(f => ({ date: f.date, text: `تعقيب المواطن: ${f.text}` }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  container.innerHTML = allEvents.map(e => `
    <div class="timeline-item">
      <div class="timeline-date">${formatDateTime(e.date)}</div>
      <div class="timeline-text">${escapeHtml(e.text)}</div>
    </div>
  `).join('');
}

function saveComplaintUpdate() {
  if (!currentComplaintId) return;
  loadComplaints();
  const c = complaints.find(x => x.id === currentComplaintId);
  if (!c) return;

  const newStatus = document.getElementById('modalStatus').value;
  const newDept = document.getElementById('modalDepartment').value;
  const newResponse = document.getElementById('modalResponse').value.trim();
  const internalNote = document.getElementById('modalInternalNote').value.trim();

  const now = new Date().toISOString();
  const changes = [];

  if (newStatus !== c.status) {
    changes.push(`تحديث الحالة إلى: "${newStatus}" بواسطة ${currentUser ? currentUser.fullName : 'الإدارة'}`);
    c.status = newStatus;
  }

  if (newDept !== c.department) {
    if (newDept) changes.push(`تكليف "${newDept}" بمتابعة الإجراءات`);
    c.department = newDept;
  }

  if (newResponse !== c.officialResponse) {
    if (newResponse) changes.push('اعتماد رد وقرار رسمي للمواطن');
    c.officialResponse = newResponse;
  }

  if (changes.length > 0) {
    c.timeline.push({ date: now, text: changes.join(' | ') });
  }

  if (internalNote) {
    c.timeline.push({ date: now, text: `[ملاحظة داخلية]: ${internalNote}` });
  }

  c.updatedAt = now;
  saveComplaints();

  closeModal('complaintModal');
  renderDashboard();
  showToast('success', 'تم الحفظ', `تم تحديث بلاغ (${c.code}) بنجاح`);
}

/* ============ Modal Helpers ============ */
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
  if (id === 'complaintModal') currentComplaintId = null;
}

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay') && e.target.classList.contains('open')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    document.body.style.overflow = '';
  }
});

/* ============ Report Generation (Print & New Window) ============ */
function buildReportContent() {
  loadComplaints();
  const now = new Date();
  const data = filteredComplaints.length > 0 ? filteredComplaints : complaints;

  const total = complaints.length;
  const done = complaints.filter(c => c.status === 'تم الحل والإنجاز').length;
  const inProgress = complaints.filter(c => !['تم الحل والإنجاز', 'اعتذار مع التوضيح'].includes(c.status)).length;
  const urgent = complaints.filter(c => c.priority === 'عاجل جداً' && c.status !== 'تم الحل والإنجاز').length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  document.getElementById('reportDate').innerHTML = `
    <div><strong>تاريخ الاستخراج:</strong></div>
    <div>${now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
    <div>الساعة: ${now.toLocaleTimeString('ar-EG')}</div>
  `;

  document.getElementById('reportStats').innerHTML = `
    <div class="stat-item"><div class="stat-value">${total}</div><div>إجمالي البلاغات</div></div>
    <div class="stat-item"><div class="stat-value">${done}</div><div>تم الحل والإنجاز</div></div>
    <div class="stat-item"><div class="stat-value">${inProgress}</div><div>قيد المتابعة</div></div>
    <div class="stat-item"><div class="stat-value">${urgent}</div><div>عاجل جداً</div></div>
    <div class="stat-item"><div class="stat-value">${percent}%</div><div>نسبة الإنجاز</div></div>
  `;

  document.getElementById('reportTableBody').innerHTML = data.map(c => `
    <tr>
      <td>${escapeHtml(c.code)}</td>
      <td>${escapeHtml(c.citizenName)}</td>
      <td>${escapeHtml(c.governorate)}</td>
      <td>${escapeHtml(c.category)}</td>
      <td>${escapeHtml(c.subject)}</td>
      <td>${escapeHtml(c.priority)}</td>
      <td>${escapeHtml(c.status)}</td>
      <td>${formatDate(c.createdAt)}</td>
    </tr>
  `).join('');
}

function openPrintReport() {
  buildReportContent();
  window.print();
}

function openReportInNewWindow() {
  buildReportContent();
  const reportHTML = document.getElementById('printReport').outerHTML;

  const w = window.open('', '_blank', 'width=1200,height=800');
  w.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تقرير خدمة المواطنين - حزب مستقبل وطن</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        * { margin:0; padding:0; box-sizing:border-box; font-family:'Cairo', sans-serif; }
        body { padding:30px; direction:rtl; text-align:right; color:#0f172a; }
        .print-report { display:block !important; }
        .report-header { display:flex; align-items:center; justify-content:space-between; border-bottom:3px solid #1e3a8a; padding-bottom:15px; margin-bottom:20px; }
        .report-title-area { text-align:center; flex:1; }
        .report-title-area h1 { font-size:18pt; color:#1e3a8a; }
        .report-stats { display:flex; justify-content:space-around; margin:15px 0; padding:12px; border:1px solid #cbd5e1; background:#f8fafc; border-radius:6px; }
        .stat-item { text-align:center; }
        .stat-value { font-size:18pt; font-weight:800; color:#1e3a8a; }
        table { width:100%; border-collapse:collapse; margin:15px 0; font-size:9pt; }
        th { background:#1e3a8a; color:#fff; padding:8px 10px; text-align:right; }
        td { padding:6px 10px; border-bottom:1px solid #e2e8f0; }
        tr:nth-child(even) { background:#f8fafc; }
        .report-signatures { display:flex; justify-content:space-around; margin-top:40px; padding-top:20px; border-top:1px solid #e2e8f0; }
        .sig-block { text-align:center; min-width:200px; }
        .sig-line { border-bottom:1px solid #0f172a; height:35px; margin-bottom:5px; }
        .print-bar { position:fixed; top:20px; left:20px; display:flex; gap:10px; }
        .print-bar button { padding:10px 20px; border:none; border-radius:6px; font-weight:700; cursor:pointer; font-family:'Cairo'; }
        @media print { .print-bar { display:none !important; } @page { size:A4 landscape; margin:15mm; } }
      </style>
    </head>
    <body>
      <div class="print-bar">
        <button style="background:#1d4ed8; color:#fff;" onclick="window.print()">🖨️ طباعة المستند</button>
        <button style="background:#e2e8f0; color:#0f172a;" onclick="window.close()">✖ إغلاق</button>
      </div>
      ${reportHTML}
    </body>
    </html>
  `);
  w.document.close();
}

/* ============ CSV Export ============ */
function exportCSV() {
  loadComplaints();
  const data = filteredComplaints.length > 0 ? filteredComplaints : complaints;

  if (data.length === 0) {
    showToast('warning', 'تنبيه', 'لا توجد بيانات متاحة لتصديرها');
    return;
  }

  const headers = [
    'كود المتابعة',
    'اسم المواطن',
    'الرقم القومي',
    'رقم الهاتف',
    'المحافظة',
    'المركز/القسم',
    'العنوان التفصيلي',
    'التصنيف',
    'الأهمية',
    'موضوع الشكوى',
    'تفاصيل الشكوى',
    'الحالة الحالية',
    'الأمانة المكلفة',
    'الرد الرسمي',
    'تاريخ التقديم',
    'آخر تحديث'
  ];

  const rows = data.map(c => [
    c.code,
    c.citizenName,
    c.nationalId,
    c.phone,
    c.governorate,
    c.district,
    c.address,
    c.category,
    c.priority,
    c.subject,
    c.description,
    c.status,
    c.department || '',
    c.officialResponse || '',
    formatDate(c.createdAt),
    formatDate(c.updatedAt)
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `بيانات_شكاوى_مستقبل_وطن_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('success', 'تم التصدير', 'تم تصدير ملف Excel/CSV بنجاح');
}

/* ============ Toast Notifications ============ */
function showToast(type, title, message) {
  const container = document.getElementById('toastContainer');
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
  setTimeout(() => { if (toast.parentElement) toast.remove(); }, 4500);
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
