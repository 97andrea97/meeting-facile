const meetingName = localStorage.getItem("meetingName");
const username = localStorage.getItem("username");

if (!meetingName || !username) {
  alert("Dati mancanti. Torna alla home.");
  window.location.href = "index.html";
}
