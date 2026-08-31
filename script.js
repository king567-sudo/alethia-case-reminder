const caseForm = document.getElementById('caseForm');
const caseTableBody = document.getElementById('caseTableBody');
const submitBtn = document.getElementById('submitBtn');
const summaryBox = document.getElementById('summaryBox');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const filterBanner = document.getElementById('filterBanner');
const filterText = document.getElementById('filterText');
const clearFilterBtn = document.getElementById('clearFilterBtn');

let cases = [];
let editingId = null;
let activeFilter = null; // 'mine' | 'urgent' | null

function getDaysRemaining(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const caseDate = new Date(dateStr);
  caseDate.setHours(0, 0, 0, 0);
  const diffTime = caseDate - today;
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

function getCountdownLabel(days) {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day remaining';
  if (days > 1) return `${days} days remaining`;
  return 'Past due';
}

function updateSummary() {
  const urgentCount = cases.filter(c => {
    const d = getDaysRemaining(c.date);
    return d >= 0 && d <= 3 && c.status !== 'completed';
  }).length;

  if (urgentCount > 0) {
    summaryBox.textContent = `⚠️ ${urgentCount} case${urgentCount > 1 ? 's' : ''} need attention this week`;
    summaryBox.classList.add('show');
  } else {
    summaryBox.classList.remove('show');
  }
}

function applyFilter(type) {
  if (type === 'all') {
    activeFilter = null;
    filterBanner.style.display = 'none';
  } else if (type === 'mine') {
    activeFilter = 'mine';
    filterText.textContent = `Showing cases you've added`;
    filterBanner.style.display = 'flex';
  } else if (type === 'urgent') {
    activeFilter = 'urgent';
    filterText.textContent = `Showing urgent cases (next 3 days)`;
    filterBanner.style.display = 'flex';
  }
  renderCases();
}

function clearHomeFilter() {
  activeFilter = null;
  filterBanner.style.display = 'none';
  renderCases();
}

clearFilterBtn.addEventListener('click', clearHomeFilter);

function getVisibleCases() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const myEmail = auth.currentUser ? auth.currentUser.email : null;

  let filtered = cases.filter((c) => {
    if (activeFilter === 'mine' && c.updatedBy !== myEmail) return false;
    if (activeFilter === 'urgent') {
      const d = getDaysRemaining(c.date);
      if (!(d >= 0 && d <= 3)) return false;
    }
    if (!searchTerm) return true;
    return c.name.toLowerCase().includes(searchTerm) || c.staff.toLowerCase().includes(searchTerm);
  });

  const sortBy = sortSelect.value;
  if (sortBy === 'date') {
    filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
  } else if (sortBy === 'name') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'staff') {
    filtered.sort((a, b) => a.staff.localeCompare(b.staff));
  }

  return filtered;
}

function renderCases() {
  caseTableBody.innerHTML = '';
  const visible = getVisibleCases();

  if (visible.length === 0) {
    caseTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          ${cases.length === 0 ? 'No cases yet — add your first one above ⚖️' : 'No cases match your search or filter.'}
        </td>
      </tr>
    `;
    updateSummary();
    return;
  }

  visible.forEach((c) => {
    const daysRemaining = getDaysRemaining(c.date);
    const isCompleted = c.status === 'completed';
    const isUrgent = !isCompleted && daysRemaining >= 0 && daysRemaining <= 3;

    const row = document.createElement('tr');
    if (isUrgent) row.classList.add('urgent');
    if (isCompleted) row.classList.add('completed-row');
    if (editingId === c.id) row.classList.add('editing');

    const statusBadge = isCompleted
      ? '<span class="status-badge status-completed">Completed</span>'
      : '<span class="status-badge status-active">Active</span>';

    const statusActionBtn = isCompleted
      ? `<button class="action-btn reopen-btn" data-id="${c.id}">Reopen</button>`
      : `<button class="action-btn done-btn" data-id="${c.id}">Mark Done</button>`;

    row.innerHTML = `
      <td data-label="Case Name">${c.name}</td>
      <td data-label="Court Date">${c.date} ${isUrgent ? `<br><small>(${getCountdownLabel(daysRemaining)})</small>` : ''}</td>
      <td data-label="Time">${c.time}</td>
      <td data-label="Staff">${c.staff}</td>
      <td data-label="Notes">${c.notes || '-'}</td>
      <td data-label="Status">${statusBadge}</td>
      <td data-label="Action">
        ${statusActionBtn}
        <button class="action-btn edit-btn" data-id="${c.id}">Edit</button>
        <button class="action-btn delete-btn" data-id="${c.id}">Delete</button>
      </td>
    `;

    caseTableBody.appendChild(row);
  });

  updateSummary();
}

caseForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const caseData = {
    name: document.getElementById('caseName').value,
    date: document.getElementById('caseDate').value,
    time: document.getElementById('caseTime').value,
    staff: document.getElementById('staffName').value,
    notes: document.getElementById('caseNotes').value,
    updatedBy: auth.currentUser ? auth.currentUser.email : 'unknown'
  };

  if (editingId !== null) {
    db.collection('cases').doc(editingId).update(caseData)
      .then(() => {
        editingId = null;
        submitBtn.textContent = 'Add Case';
        caseForm.reset();
      });
  } else {
    caseData.status = 'active';
    db.collection('cases').add(caseData)
      .then(() => {
        caseForm.reset();
      });
  }
});

caseTableBody.addEventListener('click', (e) => {
  const id = e.target.getAttribute('data-id');
  if (id === null) return;

  if (e.target.classList.contains('delete-btn')) {
    const c = cases.find(c => c.id === id);
    const confirmed = confirm(`Delete case "${c.name}"? This cannot be undone.`);
    if (confirmed) {
      db.collection('cases').doc(id).delete();
      if (editingId === id) {
        editingId = null;
        submitBtn.textContent = 'Add Case';
        caseForm.reset();
      }
    }
  }

  if (e.target.classList.contains('edit-btn')) {
    const c = cases.find(c => c.id === id);
    document.getElementById('caseName').value = c.name;
    document.getElementById('caseDate').value = c.date;
    document.getElementById('caseTime').value = c.time;
    document.getElementById('staffName').value = c.staff;
    document.getElementById('caseNotes').value = c.notes || '';

    editingId = id;
    submitBtn.textContent = 'Update Case';
    renderCases();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (e.target.classList.contains('done-btn')) {
    db.collection('cases').doc(id).update({ status: 'completed' });
  }

  if (e.target.classList.contains('reopen-btn')) {
    db.collection('cases').doc(id).update({ status: 'active' });
  }
});

searchInput.addEventListener('input', renderCases);
sortSelect.addEventListener('change', renderCases);

function startListeningToCases() {
  db.collection('cases').onSnapshot((snapshot) => {
    cases = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderCases();
  });
}

auth.onAuthStateChanged((user) => {
  if (user) {
    startListeningToCases();
  }
});

function updateMeStats() {
  const myEmail = auth.currentUser ? auth.currentUser.email : null;

  const myCaseCount = cases.filter(c => c.updatedBy === myEmail).length;
  const totalCaseCount = cases.length;
  const urgentCaseCount = cases.filter(c => {
    const d = getDaysRemaining(c.date);
    return d >= 0 && d <= 3 && c.status !== 'completed';
  }).length;

  const myCaseEl = document.getElementById('myCaseCount');
  const totalCaseEl = document.getElementById('totalCaseCount');
  const urgentCaseEl = document.getElementById('urgentCaseCount');

  if (myCaseEl) myCaseEl.textContent = myCaseCount;
  if (totalCaseEl) totalCaseEl.textContent = totalCaseCount;
  if (urgentCaseEl) urgentCaseEl.textContent = urgentCaseCount;
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').then((registration) => {
    console.log('Service Worker registered');
    if ('periodicSync' in registration) {
      registration.periodicSync.register('check-reminders', {
        minInterval: 24 * 60 * 60 * 1000
      }).catch(() => console.log('Periodic sync not available/permitted'));
    }
  });

  navigator.serviceWorker.register('firebase-messaging-sw.js').then(() => {
    console.log('Firebase Messaging Service Worker registered');
  }).catch((err) => {
    console.log('Firebase Messaging SW registration failed:', err);
  });
}
