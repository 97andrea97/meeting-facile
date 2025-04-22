// summary.js
// Dependencies: uses firebaseRefs.js, utils.js, calendar.js
let firstSummaryUpdate = true;
let cachedUserSlots = []; // ✅ cache personale per username

// 🔁 Ripristina selezione utenti dal localStorage
const savedUserSelection = localStorage.getItem("selectedUsers");
if (savedUserSelection) {
  try {
    const parsed = JSON.parse(savedUserSelection);
    selectedUsers = new Set(parsed);
  } catch (_) {}
}

function updateSummaries(settings, forceReincludeCurrentUser = false) {
  if (cachedUserSlots.length === 0) {
    userRef.once("value").then(snap => {
      const raw = snap.val() || [];
      const settingsCopy = settings;
      const slots = (Array.isArray(raw) ? raw : Object.values(raw))
        .map(slot => clipSlotToRange(slot, settingsCopy))
        .filter(slot => slot !== null);
      cachedUserSlots = mergeSlots(slots);
      proceedWithSummaries(settings, forceReincludeCurrentUser);
    });
  } else {
    proceedWithSummaries(settings, forceReincludeCurrentUser);
  }
}

function proceedWithSummaries(settings, forceReincludeCurrentUser = false) {
  meetingRef.once("value", snapshot => {
    const allData = snapshot.val() || {};
    const mergedByUser = {};

    for (let user in allData) {
      const raw = allData[user];
      const asArray = Array.isArray(raw) ? raw : Object.values(raw);

      const clippedSlots = asArray
        .map(slot => clipSlotToRange(slot, settings))
        .filter(slot => slot !== null);

      mergedByUser[user] = mergeSlots(clippedSlots);
    }

    if (!(username in mergedByUser)) {
      mergedByUser[username] = cachedUserSlots;
    }

    showSummary("personal-summary", cachedUserSlots, "slot");

    const selectedMerged = Object.entries(mergedByUser)
      .filter(([user]) => selectedUsers.has(user) || (forceReincludeCurrentUser && user === username))
      .map(([_, slots]) => slots);

    const common = findCommonSlots(selectedMerged);
    showSummary("common-summary", common, "common-slot");

    const commonTitle = document.querySelector("#common-summary-title");
    if (commonTitle) commonTitle.textContent = "Disponibilità comune utenti selezionati";

    const container = document.getElementById("all-users-summary");
    if (container) {
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
        localStorage.setItem("selectedUsers", JSON.stringify(Array.from(selectedUsers)));
        updateSummaries(settings);
      });
      container.appendChild(toggleAllBtn);
      container.appendChild(title);

      const formatterDay = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short" });
      const formatterTime = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" });

      for (let user in mergedByUser) {
        if (firstSummaryUpdate && !selectedUsers.has(user)) {
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

        const slotsToRender = user === username ? cachedUserSlots : mergedByUser[user];
        (slotsToRender || []).forEach(slot => {
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
          localStorage.setItem("selectedUsers", JSON.stringify(Array.from(selectedUsers)));
          if (user === username) {
            saveAvailability().then(slots => {
              cachedUserSlots = slots;
              updateSummaries(settings, true);
            });
          } else {
            updateSummaries(settings);
          }
        });
      });
    }

    firstSummaryUpdate = false;

    calendar.getEvents().forEach(ev => {
      if (!selectedUsers.has(ev.title)) ev.remove();
    });

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

const refreshCommonBtn = document.getElementById("refreshCommonBtn");
if (refreshCommonBtn) {
  refreshCommonBtn.addEventListener("click", () => {
    settingsRef.once("value", snap => {
      const settings = snap.val();
      if (settings) updateSummaries(settings, true);
    });
  });
}

// 👇 Auto-trigger update on page load
window.addEventListener("DOMContentLoaded", () => {
  settingsRef.once("value", snap => {
    const settings = snap.val();
    if (settings) updateSummaries(settings, true);
  });
});

// 👇 Auto-update on calendar changes
calendar.on("eventAdd", () => {
  settingsRef.once("value", snap => {
    const settings = snap.val();
    if (settings) saveAvailability().then(slots => {
      cachedUserSlots = slots;
      updateSummaries(settings, true);
    });
  });
});

calendar.on("eventChange", () => {
  settingsRef.once("value", snap => {
    const settings = snap.val();
    if (settings) saveAvailability().then(slots => {
      cachedUserSlots = slots;
      updateSummaries(settings, true);
    });
  });
});

calendar.on("eventRemove", () => {
  settingsRef.once("value", snap => {
    const settings = snap.val();
    if (settings) saveAvailability().then(slots => {
      cachedUserSlots = slots;
      updateSummaries(settings, true);
    });
  });
});