// check-meeting.js
// Dependencies: firebase-config.js

function getInputs() {
  const meetingName = document.getElementById("meetingName").value.trim();
  const username = document.getElementById("username").value.trim();
  return { meetingName, username };
}

function showMessage(msg, color) {
  const statusMessage = document.getElementById("statusMessage");
  statusMessage.textContent = msg;
  statusMessage.style.color = color;
}

function handleCrea() {
  const { meetingName, username } = getInputs();
  if (!meetingName || !username) {
    showMessage("Inserisci sia il nome del meeting che il tuo nome.", "red");
    return;
  }

  db.ref(`settings/${meetingName}`).once("value").then(snapshot => {
    if (snapshot.exists()) {
      showMessage("⚠️ Esiste già un meeting con questo nome. Scegli 'Unisciti' se vuoi partecipare.", "orange");
    } else {
      // Save and go to meeting setup
      localStorage.setItem("meetingName", meetingName);
      localStorage.setItem("username", username);
      window.location.href = "setup_meeting.html";
    }
  });
}

function handleUnisciti() {
  const { meetingName, username } = getInputs();
  if (!meetingName || !username) {
    showMessage("Inserisci sia il nome del meeting che il tuo nome.", "red");
    return;
  }

  db.ref(`settings/${meetingName}`).once("value").then(snapshot => {
    if (!snapshot.exists()) {
      showMessage("❌ Questo meeting non esiste ancora. Clicca 'Crea' per iniziare.", "red");
    } else {
      // Check if username already exists inside this meeting
      db.ref(`availability/${meetingName}/${username}`).once("value").then(userSnap => {
        if (userSnap.exists()) {
          const proceed = confirm("⚠️ Un utente sta già usando questo nome. Continuare?");
          if (!proceed) {
            showMessage("Inserisci un nome diverso per unirti.", "red");
            return;
          }
        }

        // Save and go to calendar
        localStorage.setItem("meetingName", meetingName);
        localStorage.setItem("username", username);
        window.location.href = "calendario.html";
      });
    }
  });
}


document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("createBtn").addEventListener("click", handleCrea);
  document.getElementById("joinBtn").addEventListener("click", handleUnisciti);
});
