// init.js
// Dependencies: uses firebaseRefs.js, calendar.js, availability.js, summary.js

(() => {
  if (!window.selectedUsers) {
    window.selectedUsers = new Set();
  }
  const selectedUsers = window.selectedUsers;

  settingsRef.once("value", snap => {
    selectedUsers.clear();
    selectedUsers.add(username);
    const settings = snap.val();
    console.log("📦 Settings fetched from Firebase:", settings);

    if (!settings) {
      alert("Impostazioni mancanti per questo meeting.");
      window.location.href = "setup_meeting.html";
    } else {
      createCalendar(settings);
      loadUserAvailability();
      updateSummaries(settings);
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    const meetingNameDisplay = document.getElementById("meetingNameDisplay");
    const usernameDisplay = document.getElementById("usernameDisplay");
    if (meetingNameDisplay) meetingNameDisplay.textContent = meetingName;
    if (usernameDisplay) usernameDisplay.textContent = username;

    const changeBtn = document.getElementById("changeBtn");
    if (changeBtn) {
      changeBtn.addEventListener("click", () => {
        localStorage.removeItem("meetingName");
        localStorage.removeItem("username");
        window.location.href = "index.html";
      });
    }

    const syncBtn = document.getElementById("syncBtn");
    if (syncBtn) {
      syncBtn.addEventListener("click", () => {
        updateSummaries();
      });
    }
  });
})();
