importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDSqegNUBr20fkvz0aF4kf0E4GKqJPtnYA",
  authDomain: "alethia-case-reminder.firebaseapp.com",
  projectId: "alethia-case-reminder",
  storageBucket: "alethia-case-reminder.firebasestorage.app",
  messagingSenderId: "908963225668",
  appId: "1:908963225668:web:5d955898ab846d66bd1c11"
});

const messaging = firebase.messaging();

// Handle notifications received while the app is closed/in background
messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: 'lawfirm logo.jpeg'
  });
});