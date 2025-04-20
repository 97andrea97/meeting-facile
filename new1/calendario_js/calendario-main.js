const userRef = db.ref(`availability/${meetingName}/${username}`);
const meetingRef = db.ref(`availability/${meetingName}`);
const settingsRef = db.ref(`settings/${meetingName}`);

let calendar;
let selectedUsers = new Set();
const userColors = {};
const predefinedColors = ["#f28b82", "#fbbc04", "#ccff90", "#a7ffeb", "#cbf0f8", "#aecbfa", "#d7aefb", "#fdcfe8"];

function getUserColor(user) {
  if (user === username) return '#007bff';
  if (!userColors[user]) {
    userColors[user] = predefinedColors[Object.keys(userColors).length % predefinedColors.length];
  }
  return userColors[user];
}

function createCalendar(settings) {
  const calendarEl = document.getElementById("calendar");
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "timeGridWeek",
    slotMinTime: settings.startHour + ":00",
    slotMaxTime: settings.endHour + ":00",
    allDaySlot: false,
    editable: true,
    selectable: true,
    eventResizableFromStart: true,
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
        backgroundColor: getUserColor(username),
        editable: true,
        display: 'auto'
      });
      saveAvailability();
    },
    eventChange: saveAvailabilityAndUpdate,
    eventRemove: saveAvailabilityAndUpdate
  });

  calendar.render();
}

function loadUserAvailability() {
  userRef.once("value", snapshot => {
    const userData = snapshot.val();
    if (!userData) return;
    userData.forEach(slot => {
      calendar.addEvent({
        title: username,
        start: slot.start,
        end: slot.end,
        backgroundColor: getUserColor(username),
        editable: true,
        display: 'auto'
      });
    });
  });
}

function saveAvailabilityAndUpdate() {
  const events = calendar.getEvents()
    .filter(ev => ev.title === username)
    .map(ev => ({
      start: ev.start.toISOString(),
      end: ev.end.toISOString()
    }));

  userRef.set(events);

  const merged = mergeSlots(events);
  showSummary("personal-summary", merged, "slot");

  setTimeout(() => {
    updateSummaries();
  }, 300);
}

function saveAvailability() {
  const events = calendar.getEvents()
    .filter(ev => ev.title === username)
    .map(ev => ({
      start: ev.start.toISOString(),
      end: ev.end.toISOString()
    }));

  userRef.set(events);

  const merged = mergeSlots(events);
  showSummary("personal-summary", merged, "slot");
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
    showAllUserSummaries(mergedByUser);
    showLegend(Object.keys(mergedByUser));

    const commonButton = document.getElementById("refreshCommonBtn");
    if (commonButton) commonButton.disabled = false;

    // Rimuove solo gli eventi degli utenti non più selezionati
    const existingEvents = calendar.getEvents();
    const existingUserEvents = {};
    existingEvents.forEach(ev => {
      if (ev.title !== username) {
        if (!existingUserEvents[ev.title]) existingUserEvents[ev.title] = [];
        existingUserEvents[ev.title].push(ev);
      }
    });

    // Rimuovi eventi non selezionati
    for (let user in existingUserEvents) {
      if (!selectedUsers.has(user)) {
        existingUserEvents[user].forEach(ev => ev.remove());
      }
    }

    for (let user in mergedByUser) {
      if (user === username || selectedUsers.has(user)) {
        const alreadyExists = calendar.getEvents().some(ev => ev.title === user);
        if (alreadyExists) continue;
        const color = getUserColor(user);
        mergedByUser[user].forEach(slot => {
          calendar.addEvent({
            title: user,
            start: slot.start,
            end: slot.end,
            editable: user === username,
            backgroundColor: color,
            display: user === username ? 'auto' : 'background'
          });
        });
      }
    }
  });
}

function showAllUserSummaries(mergedByUser) {
  const container = document.getElementById("all-users-summary");
  if (!container) return;
  container.innerHTML = "";
  const title = document.createElement("h3");
  title.textContent = "Disponibilità per utente";

  const toggleAllBtn = document.createElement("button");
  toggleAllBtn.textContent = "Seleziona/Deseleziona tutti";
  toggleAllBtn.style.marginBottom = "10px";
  toggleAllBtn.addEventListener("click", () => {
    const allChecked = Object.keys(mergedByUser).every(user => selectedUsers.has(user) || user === username);
    selectedUsers.clear();
    if (!allChecked) {
      Object.keys(mergedByUser).forEach(user => {
        if (user !== username) selectedUsers.add(user);
      });
    }
    updateSummaries();
  });
  container.appendChild(toggleAllBtn);
  container.appendChild(title);

  const formatterDay = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short" });
  const formatterTime = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" });

  for (let user in mergedByUser) {
    if (user !== username) selectedUsers.add(user);
    const color = getUserColor(user);
    const isSelected = selectedUsers.has(user) || user === username;
    const userDiv = document.createElement("div");
    userDiv.innerHTML = `<label><input type="checkbox" class="user-toggle" data-user="${user}" ${isSelected ? 'checked' : ''}/> <strong style="color:${color}">${user}</strong></label>`;

    mergedByUser[user].forEach(slot => {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      const sameDay = start.toDateString() === end.toDateString();
      const text = sameDay
        ? `${formatterDay.format(start)}, ${formatterTime.format(start)} → ${formatterTime.format(end)}`
        : `${formatterDay.format(start)}, ${formatterTime.format(start)} → ${formatterDay.format(end)}, ${formatterTime.format(end)}`;

      const slotDiv = document.createElement("div");
      slotDiv.style.fontSize = "13px";
      slotDiv.textContent = text;
      userDiv.appendChild(slotDiv);
    });

    container.appendChild(userDiv);
    container.appendChild(document.createElement("hr"));
  }

  document.querySelectorAll(".user-toggle").forEach(input => {
    input.addEventListener("change", () => {
      const user = input.dataset.user;
      if (input.checked) {
        selectedUsers.add(user);
      } else {
        selectedUsers.delete(user);
      }
      updateSummaries();
    });
  });
}

function showLegend(userList) {
  const legendContainer = document.getElementById("user-legend");
  if (!legendContainer) return;
  legendContainer.innerHTML = "<h3>Legenda utenti</h3>";
  userList.forEach(user => {
    const color = getUserColor(user);
    const div = document.createElement("div");
    div.style.marginBottom = "5px";
    div.innerHTML = `<span style="display:inline-block;width:12px;height:12px;background:${color};margin-right:8px;border-radius:2px"></span> ${user}`;
    legendContainer.appendChild(div);
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
  selectedUsers.clear();
  const settings = snap.val();
  if (!settings) {
    alert("Impostazioni mancanti per questo meeting.");
    window.location.href = "setup_meeting.html";
  } else {
    createCalendar(settings);
    loadUserAvailability();
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

  const syncBtn = document.getElementById("syncBtn");
  if (syncBtn) {
    syncBtn.addEventListener("click", () => {
      updateSummaries();
    });
  }
});
