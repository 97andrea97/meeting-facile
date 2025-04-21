// setup-meeting.js
// Responsibilities: handle meeting settings creation and Firebase setup
// Dependencies: firebase-config.js

document.addEventListener("DOMContentLoaded", () => {
  // Read from localStorage
  const meetingName = localStorage.getItem("meetingName");
  const username = localStorage.getItem("username");

  // Print to console and update page
  console.log("Meeting:", meetingName);
  console.log("Username:", username);

  const meetingDisplay = document.getElementById("meetingDisplay");
  const usernameDisplay = document.getElementById("usernameDisplay");
  if (meetingDisplay) meetingDisplay.textContent = meetingName || "(non trovato)";
  if (usernameDisplay) usernameDisplay.textContent = username || "(non trovato)";

  // Set default calendar values
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  document.getElementById("startDate").value = today;
  document.getElementById("endDate").value = nextWeek;

  // Enable weekday button toggle
  document.querySelectorAll(".weekday").forEach(button => {
    button.addEventListener("click", () => {
      button.classList.toggle("active");
    });
  });
});

function saveSettings() {
  const meetingName = localStorage.getItem("meetingName");
  const username = localStorage.getItem("username");

  const startHour = document.getElementById("startHour").value;
  const endHour = document.getElementById("endHour").value;
  const minSlot = parseInt(document.getElementById("minSlot").value);
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const weekdays = Array.from(document.querySelectorAll(".weekday.active"))
    .map(btn => parseInt(btn.dataset.day));

  if (!meetingName || !username) {
    alert("Errore: nome meeting o utente mancante.");
    return;
  }

  if (weekdays.length === 0) {
    alert("Seleziona almeno un giorno della settimana.");
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    alert("La data di inizio deve essere precedente alla data di fine.");
    return;
  }

  const settings = { startHour, endHour, minSlot, weekdays, startDate, endDate };

  db.ref(`settings/${meetingName}`).set(settings)
    .then(() => {
      console.log("Impostazioni salvate con successo.");
      window.location.href = "calendario.html";
    })
    .catch((error) => {
      console.error("Errore durante il salvataggio:", error);
      alert("Errore durante il salvataggio delle impostazioni.");
    });
}
