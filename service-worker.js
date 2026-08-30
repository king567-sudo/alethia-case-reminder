const CACHE_NAME = 'alethia-case-reminder-v3';
const urlsToCache = [
  'index.html',
  'style.css',
  'script.js',
  'auth.js',
  'firebase-config.js',
  'lawfirm logo.jpeg',
  'manifest.json'
];

// Install: cache the app's core files so it works offline too
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate: clean up old caches if we ever update the app
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch: serve cached files when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});

// Listen for periodic background sync (Android supports this for installed PWAs)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkCasesInBackground());
  }
});

// Check case data and fire notifications
async function checkCasesInBackground() {
  const cases = JSON.parse(await getStoredCases()) || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  cases.forEach((c) => {
    const caseDate = new Date(c.date);
    caseDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((caseDate - today) / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 3) {
      const label = diffDays === 0 ? 'Today' : diffDays === 1 ? '1 day remaining' : `${diffDays} days remaining`;
      self.registration.showNotification(`⚖️ Case Reminder: ${c.name}`, {
        body: `${label} — Staff: ${c.staff}`,
        icon: 'lawfirm logo.jpeg'
      });
    }
  });
}

// Service workers can't directly access localStorage, so we retrieve it via a client message
function getStoredCases() {
  return new Promise((resolve) => {
    self.clients.matchAll().then((clients) => {
      if (clients.length === 0) return resolve('[]');
      clients[0].postMessage({ type: 'GET_CASES' });
      self.addEventListener('message', function handler(event) {
        if (event.data.type === 'CASES_DATA') {
          self.removeEventListener('message', handler);
          resolve(event.data.cases);
        }
      });
    });
  });
}
