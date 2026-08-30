const firebaseConfig = {
  apiKey: "AIzaSyDSqegNUBr20fkvz0aF4kf0E4GKqJPtnYA",
  authDomain: "alethia-case-reminder.firebaseapp.com",
  projectId: "alethia-case-reminder",
  storageBucket: "alethia-case-reminder.firebasestorage.app",
  messagingSenderId: "908963225668",
  appId: "1:908963225668:web:5d955898ab846d66bd1c11"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Create references we'll use throughout the app
const db = firebase.firestore();
const auth = firebase.auth();