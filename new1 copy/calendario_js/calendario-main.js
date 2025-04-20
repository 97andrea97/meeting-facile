const userRef = db.ref(`availability/${meetingName}/${username}`);
const meetingRef = db.ref(`availability/${meetingName}`);
const settingsRef = db.ref(`settings/${meetingName}`);

let calendar;

function createCalendar(settings) {
  const calendarEl = document.getElementById("calendar");
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "timeGridWeek",
    slotMinTime: settings.startHour + ":00",
    slotMaxTime: settings.endHour + ":00",
    allDaySlot: false,
    editable: true,
    selectable: true,
    eventResizableFromStart: true, // ✅ AGGIUNTO QUI
    height: "auto",
    locale: "it",
    validRange: {
      start: new Date(),
      end: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)
    },
    select: function (info) {
      calendar.addEvent({
        id: Math.random().toString(36).substring(2),
        title: username,
        start: info.startStr,
        end: info.endStr,
        backgroundColor: "#007bff",
        editable: true,
        display: 'auto'
      });
      saveAvailability();
    },
    eventChange: saveAvailability,
    eventRemove: saveAvailability
  });

  calendar.render();
}

function saveAvailability() {
  const events = calendar.getEvents()
    .filter(ev => ev.title === username)
    .map(ev => ({
      start: ev.start.toISOString(),
      end: ev.end.toISOString()
    }));

  userRef.set(events);
}

function updateSummaries() {
  meetingRef.once("value", snapshot => {
    const allData = snapshot.val();
    const mergedByUser = {};

    for (let user in allData) {
      mergedByUser[user] = mergeSlots(allData[user]);
    }

    const allMerged = Object.values(mergedByUser);
    const common = findCommonSlots(allMerged);

    showSummary("common-summary", common, "common-slot");
    showSummary("personal-summary", mergedByUser[username] || [], "slot");

    // 🧹 Rimuovi tutti gli eventi attuali prima di riaggiungere
    calendar.getEvents().forEach(ev => ev.remove());

    // 🔁 Riaggiungi tutti gli eventi (tuo e degli altri)
    for (let user in mergedByUser) {
      const isCurrentUser = (user === username);
      mergedByUser[user].forEach(slot => {
        calendar.addEvent({
          title: user,
          start: slot.start,
          end: slot.end,
          editable: isCurrentUser,
          backgroundColor: isCurrentUser ? '#007bff' : '#fce5cd',
          display: isCurrentUser ? 'auto' : 'background'
        });
      });
    }
  });
}

function mergeSlots(slots) {
  if (!slots || slots.length === 0) return [];
  const sorted = [...slots].sort((a, b) => new Date(a.start) - new Date(b.start));
  const merged = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    if (new Date(current.start) <= new Date(last.end)) {
      last.end = new Date(Math.max(new Date(last.end), new Date(current.end))).toISOString();
    } else {
      merged.push(current);
    }
  }
  return merged;
}

function findCommonSlots(usersSlots) {
  if (usersSlots.length === 0) return [];
  let common = usersSlots[0];
  for (let i = 1; i < usersSlots.length; i++) {
    common = intersectTwo(common, usersSlots[i]);
    if (common.length === 0) break;
  }
  return common;
}

function intersectTwo(a, b) {
  const result = [];
  for (const s1 of a) {
    for (const s2 of b) {
      const start = new Date(Math.max(new Date(s1.start), new Date(s2.start)));
      const end = new Date(Math.min(new Date(s1.end), new Date(s2.end)));
      if (start < end) {
        result.push({ start: start.toISOString(), end: end.toISOString() });
      }
    }
  }
  return result;
}

function showSummary(containerId, slots, className) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  const formatterDay = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short" });
  const formatterTime = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" });

  slots.forEach(slot => {
    const div = document.createElement("div");
    div.className = className;
    const start = new Date(slot.start);
    const end = new Date(slot.end);
    const sameDay = start.toDateString() === end.toDateString();
    const text = sameDay
      ? `${formatterDay.format(start)}, ${formatterTime.format(start)} → ${formatterTime.format(end)}`
      : `${formatterDay.format(start)}, ${formatterTime.format(start)} → ${formatterDay.format(end)}, ${formatterTime.format(end)}`;
    div.textContent = text;
    container.appendChild(div);
  });
}

settingsRef.once("value", snap => {
  const settings = snap.val();
  if (!settings) {
    alert("Impostazioni mancanti per questo meeting.");
    window.location.href = "setup_meeting.html";
  } else {
    createCalendar(settings);
    updateSummaries();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const changeBtn = document.getElementById("changeBtn");
  if (changeBtn) {
    changeBtn.addEventListener("click", () => {
      localStorage.removeItem("meetingName");
      localStorage.removeItem("username");
      window.location.href = "index.html";
    });
  }
});
