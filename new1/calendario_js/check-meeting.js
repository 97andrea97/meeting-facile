// check-meeting.js
// Dependencies: firebase-config.js

function checkMeeting() {
    const meeting = document.getElementById("meetingName").value.trim();
    const username = document.getElementById("username").value.trim();
  
    if (!meeting || !username) {
      alert("Inserisci sia il nome del meeting che il tuo nickname.");
      return;
    }
  
    localStorage.setItem("meetingName", meeting);
    localStorage.setItem("username", username);
  
    db.ref(`availability/${meeting}`).once('value', snapshot => {
      if (snapshot.exists()) {
        window.location.href = "calendario.html";
      } else {
        window.location.href = "setup_meeting.html";
      }
    });
  }
  