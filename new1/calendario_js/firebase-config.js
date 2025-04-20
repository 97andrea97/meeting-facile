const firebaseConfig = {
    apiKey: "AIzaSyCMQojwmEfchDlP1Bv0PpIXRTK0V7NZZU",
    authDomain: "meeting-felice.firebaseapp.com",
    databaseURL: "https://meeting-felice-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "meeting-felice",
    storageBucket: "meeting-felice.appspot.com"
  };
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();
  