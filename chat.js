const messagesList = document.getElementById('messagesList');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');

let currentUserIsDirector = false;

// Called from auth.js once we know the logged-in user's data
function initChat(userData) {
  currentUserIsDirector = !!userData.isDirector;
  startListeningToMessages();
}

function startListeningToMessages() {
  db.collection('messages').orderBy('createdAt', 'asc').onSnapshot((snapshot) => {
    renderMessages(snapshot.docs);
  });
}

function renderMessages(docs) {
  const myEmail = auth.currentUser ? auth.currentUser.email : null;

  if (docs.length === 0) {
    messagesList.innerHTML = '<p class="messages-empty">No messages yet — say hello 👋</p>';
    return;
  }

  messagesList.innerHTML = '';
  docs.forEach((doc) => {
    const m = doc.data();
    const isOwn = m.senderEmail === myEmail;
    const canDelete = isOwn || currentUserIsDirector;

    const time = m.createdAt && m.createdAt.toDate
      ? m.createdAt.toDate().toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
      : '';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble ' + (isOwn ? 'own' : 'other') + (m.deleted ? ' deleted' : '');

    if (m.deleted) {
      bubble.innerHTML = `
        ${!isOwn ? `<div class="message-sender">${m.senderName}</div>` : ''}
        <div><em>This message was deleted</em></div>
        <span class="message-time">${time}</span>
      `;
    } else {
      bubble.innerHTML = `
        ${!isOwn ? `<div class="message-sender">${m.senderName}</div>` : ''}
        <div>${escapeHtml(m.text)}</div>
        <span class="message-time">${time} ${canDelete ? `<button class="message-delete" data-id="${doc.id}">delete</button>` : ''}</span>
      `;
    }

    messagesList.appendChild(bubble);
  });

  messagesList.scrollTop = messagesList.scrollHeight;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  const user = auth.currentUser;
  db.collection('messages').add({
    text: text,
    senderEmail: user.email,
    senderName: window.currentUserName || user.email,
    deleted: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  messageInput.value = '';
});

messagesList.addEventListener('click', (e) => {
  if (e.target.classList.contains('message-delete')) {
    const id = e.target.getAttribute('data-id');
    const confirmed = confirm('Delete this message? This cannot be undone.');
    if (confirmed) {
      db.collection('messages').doc(id).update({
        text: 'This message was deleted',
        deleted: true
      });
    }
  }
});