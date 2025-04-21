const userRef = db.ref(`availability/${meetingName}/${username}`);
const meetingRef = db.ref(`availability/${meetingName}`);
const settingsRef = db.ref(`settings/${meetingName}`);
let firstSummaryUpdate = true;
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

function clipSlotToRange(slot, settings) {
    const rangeStart = new Date(settings.startDate);
    const rangeEnd = new Date(new Date(settings.endDate).getTime() + 24 * 60 * 60 * 1000);
    const slotStart = new Date(slot.start);
    const slotEnd = new Date(slot.end);
    const clippedStart = slotStart < rangeStart ? rangeStart : slotStart;
    const clippedEnd = slotEnd > rangeEnd ? rangeEnd : slotEnd;
    if (clippedStart >= clippedEnd) return null;
    return { start: clippedStart.toISOString(), end: clippedEnd.toISOString() };
  }

function createCalendar(settings) {
    const calendarEl = document.getElementById("calendar");
  
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const hiddenDays = allDays.filter(day => !settings.weekdays.includes(day));
  
    const validRange = {
      start: settings.startDate,
      end: new Date(new Date(settings.endDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // include full endDate
    };
  
    // Make sure initialDate is a valid selected weekday
    let initialDate = new Date(settings.startDate);
    while (!settings.weekdays.includes(initialDate.getDay())) {
      initialDate.setDate(initialDate.getDate() + 1);
    }
  
    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: "timeGridWeek",
      initialDate: initialDate.toISOString().split("T")[0],
      slotMinTime: settings.startHour + ":00",
      slotMaxTime: settings.endHour + ":00",
      allDaySlot: false,
      editable: true,
      selectable: true,
      eventResizableFromStart: true,
      height: "auto",
      locale: "it",
      validRange: validRange,
      hiddenDays: hiddenDays,
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
  settingsRef.once("value", snap => {
    const settings = snap.val();
    if (!settings) return;
    userRef.once("value", snapshot => {
      const userData = snapshot.val();
      if (!userData) return;
      userData.forEach(slot => {
        const clipped = clipSlotToRange(slot, settings);
        if (!clipped) return;
        calendar.addEvent({
          title: username,
          start: clipped.start,
          end: clipped.end,
          backgroundColor: getUserColor(username),
          editable: true,
          display: 'auto'
        });
      });
    });
  });
}


function saveAvailabilityAndUpdate() {
    settingsRef.once("value", snap => {
      const settings = snap.val();
      if (!settings) return;
      const events = calendar.getEvents()
        .filter(ev => ev.title === username)
        .map(ev => clipSlotToRange({ start: ev.start.toISOString(), end: ev.end.toISOString() }, settings))
        .filter(slot => slot !== null);
      userRef.set(events).then(() => updateSummaries(settings));
    });
  }
  

function saveAvailability() {
    settingsRef.once("value", snap => {
        const settings = snap.val();
        if (!settings) return;
        const events = calendar.getEvents()
        .filter(ev => ev.title === username)
        .map(ev => clipSlotToRange({ start: ev.start.toISOString(), end: ev.end.toISOString() }, settings))
        .filter(slot => slot !== null);
        userRef.set(events).then(() => updateSummaries(settings));
    });
}

function updateSummaries(settings) {
    meetingRef.once("value", snapshot => {
      const allData = snapshot.val() || {};
      const mergedByUser = {};
      for (let user in allData) {
        const clippedSlots = allData[user]
          .map(slot => clipSlotToRange(slot, settings))
          .filter(slot => slot !== null);
        mergedByUser[user] = mergeSlots(clippedSlots);
      }
      if (!(username in mergedByUser)) mergedByUser[username] = [];
      const selectedMerged = Object.entries(mergedByUser)
        .filter(([user]) => selectedUsers.has(user))
        .map(([_, slots]) => slots);
      const common = findCommonSlots(selectedMerged);
      showSummary("common-summary", common, "common-slot");
      showSummary("personal-summary", mergedByUser[username] || [], "slot");
      const commonTitle = document.querySelector("#common-summary-title");
      if (commonTitle) commonTitle.textContent = "Disponibilità comune utenti selezionati";
      showAllUserSummaries(mergedByUser, firstSummaryUpdate);
      firstSummaryUpdate = false;
      const commonButton = document.getElementById("refreshCommonBtn");
      if (commonButton) commonButton.disabled = false;
      const existingEvents = calendar.getEvents();
      const existingUserEvents = {};
      existingEvents.forEach(ev => {
        if (!existingUserEvents[ev.title]) existingUserEvents[ev.title] = [];
        existingUserEvents[ev.title].push(ev);
      });
      for (let user in existingUserEvents) {
        if (!selectedUsers.has(user)) {
          existingUserEvents[user].forEach(ev => ev.remove());
        }
      }
      for (let user in mergedByUser) {
        if (selectedUsers.has(user)) {
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
  
function showAllUserSummaries(mergedByUser, firstLoad = false) {
  const container = document.getElementById("all-users-summary");
  if (!container) return;
  container.innerHTML = "";

  const title = document.createElement("h3");
  title.textContent = "Disponibilità per utente";

  const toggleAllBtn = document.createElement("button");
  toggleAllBtn.textContent = "Seleziona/Deseleziona tutti";
  toggleAllBtn.style.marginBottom = "10px";
  toggleAllBtn.addEventListener("click", () => {
    const allChecked = Object.keys(mergedByUser).every(user => selectedUsers.has(user));
    selectedUsers.clear();
    if (!allChecked) {
      Object.keys(mergedByUser).forEach(user => selectedUsers.add(user));
    }
    updateSummaries();
  });
  container.appendChild(toggleAllBtn);
  container.appendChild(title);

  const formatterDay = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short" });
  const formatterTime = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" });

  for (let user in mergedByUser) {
    if (firstLoad && !selectedUsers.has(user)) {
      selectedUsers.add(user);
    }

    const color = getUserColor(user);
    const isSelected = selectedUsers.has(user);

    const userDiv = document.createElement("div");
    userDiv.innerHTML = `
      <label>
        <input type="checkbox" class="user-toggle" data-user="${user}" ${isSelected ? 'checked' : ''}/>
        <strong style="color:${color}">${user}</strong>
      </label>
    `;

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
  
      // Add or remove from the selectedUsers set
      if (input.checked) {
        selectedUsers.add(user);
      } else {
        selectedUsers.delete(user);
      }
  
      // Optional: If user is toggling themselves, save any new events
      if (user === username) {
        saveAvailability();
      }
  
      // Refresh calendar and summaries
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
  selectedUsers.add(username);
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