// user-session.js

const meetingName = localStorage.getItem("meetingName");
const username = localStorage.getItem("username");

if (!meetingName || !username) {
  alert("Dati mancanti. Torna alla home.");
  window.location.href = "index.html";
}

// ✅ Show values on the page
document.getElementById("meetingNameDisplay").textContent = meetingName;
document.getElementById("usernameDisplay").textContent = username;
