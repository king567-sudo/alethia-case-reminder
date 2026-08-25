const caseForm = document.getElementById('caseForm');
const caseTableBody = document.getElementById('caseTableBody');
const submitBtn = document.getElementById('submitBtn');
const summaryBox = document.getElementById('summaryBox');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');

let cases = JSON.parse(localStorage.getItem('cases')) || [];
let editingIndex = null;

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

function saveCases() {
  localStorage.setItem('cases', JSON.stringify(cases));
}

function updateSummary() {
  const urgentCount = cases.filter(c => {
    const d = getDaysRemaining(c.date);
    return d >= 0 && d <= 3;
  }).length;

  if (urgentCount > 0) {
    summaryBox.textContent = `⚠️ ${urgentCount} case${urgentCount > 1 ? 's' : ''} need attention this week`;
    summaryBox.classList.add('show');
  } else {
    summaryBox.classList.remove('show');
  }
}

function getVisibleCases() {
  const searchTerm = searchInput.value.toLowerCase().trim();

  let filtered = cases.filter((c, index) => {
    c._originalIndex = index;
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
        <td colspan="6" class="empty-state">
          ${cases.length === 0 ? 'No cases yet — add your first one above ⚖️' : 'No cases match your search.'}
        </td>
      </tr>
    `;
    updateSummary();
    return;
  }

  visible.forEach((c) => {
    const daysRemaining = getDaysRemaining(c.date);
    const isUrgent = daysRemaining >= 0 && daysRemaining <= 3;
    const index = c._originalIndex;

    const row = document.createElement('tr');
    if (isUrgent) row.classList.add('urgent');
    if (editingIndex === index) row.classList.add('editing');

    row.innerHTML = `
      <td>${c.name}</td>
      <td>${c.date} ${isUrgent ? `<br><small>(${getCountdownLabel(daysRemaining)})</small>` : ''}</td>
      <td>${c.time}</td>
      <td>${c.staff}</td>
      <td>${c.notes || '-'}</td>
      <td>
        <button class="action-btn edit-btn" data-index="${index}">Edit</button>
        <button class="action-btn delete-btn" data-index="${index}">Delete</button>
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
    notes: document.getElementById('caseNotes').value
  };

  if (editingIndex !== null) {
    cases[editingIndex] = caseData;
    editingIndex = null;
    submitBtn.textContent = 'Add Case';
  } else {
    cases.push(caseData);
  }

  saveCases();
  caseForm.reset();
  renderCases();
});

caseTableBody.addEventListener('click', (e) => {
  const index = e.target.getAttribute('data-index');
  if (index === null) return;

  if (e.target.classList.contains('delete-btn')) {
    const confirmed = confirm(`Delete case "${cases[index].name}"? This cannot be undone.`);
    if (confirmed) {
      cases.splice(index, 1);
      saveCases();
      if (editingIndex === parseInt(index)) {
        editingIndex = null;
        submitBtn.textContent = 'Add Case';
        caseForm.reset();
      }
      renderCases();
    }
  }

  if (e.target.classList.contains('edit-btn')) {
    const c = cases[index];
    document.getElementById('caseName').value = c.name;
    document.getElementById('caseDate').value = c.date;
    document.getElementById('caseTime').value = c.time;
    document.getElementById('staffName').value = c.staff;
    document.getElementById('caseNotes').value = c.notes || '';

    editingIndex = parseInt(index);
    submitBtn.textContent = 'Update Case';
    renderCases();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

searchInput.addEventListener('input', renderCases);
sortSelect.addEventListener('change', renderCases);

function checkReminders() {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    fireNotifications();
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') fireNotifications();
    });
  }
}

function fireNotifications() {
  const today = new Date().toDateString();
  const lastNotified = localStorage.getItem('lastNotifiedDate');
  if (lastNotified === today) return;

  cases.forEach(c => {
    const daysRemaining = getDaysRemaining(c.date);
    if (daysRemaining >= 0 && daysRemaining <= 3) {
      new Notification(`⚖️ Case Reminder: ${c.name}`, {
        body: `${getCountdownLabel(daysRemaining)} — Staff: ${c.staff}`,
      });
    }
  });

  localStorage.setItem('lastNotifiedDate', today);
}

renderCases();
checkReminders();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').then((registration) => {
    console.log('Service Worker registered');
    if ('periodicSync' in registration) {
      registration.periodicSync.register('check-reminders', {
        minInterval: 24 * 60 * 60 * 1000
      }).catch(() => console.log('Periodic sync not available/permitted'));
    }
  });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.type === 'GET_CASES') {
      const casesData = localStorage.getItem('cases') || '[]';
      event.source.postMessage({ type: 'CASES_DATA', cases: casesData });
    }
  });
}