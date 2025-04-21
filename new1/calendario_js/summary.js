
// summary.js
// Dependencies: uses firebaseRefs.js, utils.js, calendar.js
let firstSummaryUpdate = true;

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
  