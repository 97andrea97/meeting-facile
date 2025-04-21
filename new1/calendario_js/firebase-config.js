// firebase-config.js
// Dependencies: used by calendar.js, availability.js, summary.js, legend.js, init.js

const firebaseConfig = {
    apiKey: "AIzaSyCMQojwmEfchDlP1Bv0PpIXRTK0V7NZZU",
    authDomain: "meeting-felice.firebaseapp.com",
    databaseURL: "https://meeting-felice-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "meeting-felice",
    storageBucket: "meeting-felice.appspot.com"
  };
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();
  
// firebaseRefs.js
// Dependencies: used by calendar.js, availability.js, summary.js, legend.js, init.js

const userRef = db.ref(`availability/${meetingName}/${username}`);
const meetingRef = db.ref(`availability/${meetingName}`);
const settingsRef = db.ref(`settings/${meetingName}`);

const userColors = {};
const predefinedColors = ["#f28b82", "#fbbc04", "#ccff90", "#a7ffeb", "#cbf0f8", "#aecbfa", "#d7aefb", "#fdcfe8"];