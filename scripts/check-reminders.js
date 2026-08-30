const admin = require('firebase-admin');

// Load the service account key from an environment variable (set via GitHub Secrets)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const messaging = admin.messaging();

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
  return `${days} days remaining`;
}

async function checkAndNotify() {
  console.log('Checking for urgent cases...');

  const casesSnapshot = await db.collection('cases').get();
  const urgentCases = [];

  casesSnapshot.forEach((doc) => {
    const c = doc.data();
    const days = getDaysRemaining(c.date);
    if (days >= 0 && days <= 3) {
      urgentCases.push({ ...c, days });
    }
  });

  console.log(`Found ${urgentCases.length} urgent case(s).`);

  if (urgentCases.length === 0) {
    console.log('No urgent cases today. Done.');
    return;
  }

  // Get all approved users and their device tokens
  const usersSnapshot = await db.collection('users').where('approved', '==', true).get();
  let allTokens = [];

  usersSnapshot.forEach((doc) => {
    const u = doc.data();
    if (u.fcmTokens && Array.isArray(u.fcmTokens)) {
      allTokens = allTokens.concat(u.fcmTokens);
    }
  });

  console.log(`Sending to ${allTokens.length} device(s).`);

  if (allTokens.length === 0) {
    console.log('No device tokens found. Done.');
    return;
  }

  // Send one notification per urgent case, to all devices
  for (const c of urgentCases) {
    const message = {
      notification: {
        title: `⚖️ Case Reminder: ${c.name}`,
        body: `${getCountdownLabel(c.days)} — Staff: ${c.staff}`
      },
      tokens: allTokens
    };

    try {
      const response = await messaging.sendEachForMulticast(message);
      console.log(`Sent for "${c.name}": ${response.successCount} succeeded, ${response.failureCount} failed.`);
    } catch (err) {
      console.error(`Error sending for "${c.name}":`, err);
    }
  }

  console.log('Done.');
}

checkAndNotify().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
