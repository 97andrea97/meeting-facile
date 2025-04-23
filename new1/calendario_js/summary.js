// ✅ summary.js aggiornato e corretto per mantenere l'utente nella lista anche se deselezionato
let firstSummaryUpdate = true;
let cachedUserSlots = [];

if (!window.selectedUsers) {
  window.selectedUsers = new Set();
}
const selectedUsers = window.selectedUsers;

const savedUserSelection = localStorage.getItem("selectedUsers");
if (savedUserSelection) {
  try {
    const parsed = JSON.parse(savedUserSelection);
    if (Array.isArray(parsed)) parsed.forEach(u => selectedUsers.add(u));
  } catch (_) {}
}

function showSummary(containerId, slots, className) {
  const container = document.getElementById(containerId);
  if (!container) return;
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

function updateSummaries(settings) {
  if (!settings) return;

  userRef.once("value").then(snap => {
    const raw = snap.val() || [];
    const slots = (Array.isArray(raw) ? raw : Object.values(raw))
      .map(slot => clipSlotToRange(slot, settings))
      .filter(Boolean);
    cachedUserSlots = mergeSlots(slots);
    proceedWithSummaries(settings);
  });
}

function proceedWithSummaries(settings) {
  meetingRef.once("value", snapshot => {
    const allData = snapshot.val() || {};
    const mergedByUser = {};

    for (let user in allData) {
      const raw = Array.isArray(allData[user]) ? allData[user] : Object.values(allData[user]);
      mergedByUser[user] = mergeSlots(
        raw.map(slot => clipSlotToRange(slot, settings)).filter(Boolean)
      );
    }

    // ✅ Mantieni sempre lo user corrente anche se non selezionato
    mergedByUser[username] = cachedUserSlots;

    if (firstSummaryUpdate) {
      Object.keys(mergedByUser).forEach(user => selectedUsers.add(user));
      localStorage.setItem("selectedUsers", JSON.stringify([...selectedUsers]));
    }

    const selectedMerged = Object.entries(mergedByUser)
      .filter(([user]) => selectedUsers.has(user))
      .map(([_, slots]) => slots);

    const common = findCommonSlots(selectedMerged);

    const commonSummaryContainer = document.getElementById("common-summary");
    if (commonSummaryContainer) {
      if (common.length === 0) {
        commonSummaryContainer.innerHTML = "<div class='common-slot'><em>Nessuna disponibilità comune tra gli utenti selezionati.</em></div>";
      } else {
        showSummary("common-summary", common, "common-slot");
      }
    }

    showSummary("personal-summary", cachedUserSlots, "slot");
    renderUserToggles(mergedByUser, settings);

    firstSummaryUpdate = false;

    if (typeof renderUserEvents === "function") {
      calendar.getEvents().forEach(ev => {
        if (ev.title !== "Comune") ev.remove();
      });
      renderUserEvents(mergedByUser);
    }
  });
}

function renderUserToggles(mergedByUser, settings) {
  const container = document.getElementById("all-users-summary");
  if (!container) return;
  container.innerHTML = "";

  const toggleAllBtn = document.createElement("button");
  toggleAllBtn.textContent = "Seleziona/Deseleziona tutti";
  toggleAllBtn.style.marginBottom = "10px";
  toggleAllBtn.addEventListener("click", () => {
    const allSelected = Object.keys(mergedByUser).every(u => selectedUsers.has(u));
    selectedUsers.clear();
    if (!allSelected) Object.keys(mergedByUser).forEach(u => selectedUsers.add(u));
    localStorage.setItem("selectedUsers", JSON.stringify([...selectedUsers]));
    updateSummaries(settings);
  });
  container.appendChild(toggleAllBtn);

  for (let user in mergedByUser) {
    const color = getUserColor(user);
    const isSelected = selectedUsers.has(user);
    const label = document.createElement("label");
    label.innerHTML = `
      <input type="checkbox" class="user-toggle" data-user="${user}" ${isSelected ? "checked" : ""} />
      <strong style="color:${color}">${user === username ? "⭐ " : ""}${user}</strong>
    `;

    const userDiv = document.createElement("div");
    userDiv.appendChild(label);

    (mergedByUser[user] || []).forEach(slot => {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      const sameDay = start.toDateString() === end.toDateString();
      const text = sameDay
        ? `${start.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}, ${start.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} → ${end.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`
        : `${start.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}, ${start.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} → ${end.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}, ${end.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;

      const slotDiv = document.createElement("div");
      slotDiv.className = "slot";
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
      localStorage.setItem("selectedUsers", JSON.stringify([...selectedUsers]));
      updateSummaries(settings);
    });
  });
}

function findCommonSlots(slotGroups) {
  if (!slotGroups.length) return [];
  let common = slotGroups[0];
  for (let i = 1; i < slotGroups.length; i++) {
    common = intersectTwoSlotLists(common, slotGroups[i]);
    if (!common.length) break;
  }
  return mergeSlots(common);
}

function intersectTwoSlotLists(slotsA, slotsB) {
  const result = [];
  for (let a of slotsA) {
    const aStart = new Date(a.start);
    const aEnd = new Date(a.end);
    for (let b of slotsB) {
      const bStart = new Date(b.start);
      const bEnd = new Date(b.end);
      const start = new Date(Math.max(aStart, bStart));
      const end = new Date(Math.min(aEnd, bEnd));
      if (start < end) {
        result.push({ start: start.toISOString(), end: end.toISOString() });
      }
    }
  }
  return result;
}

function mergeSlots(slots) {
  if (!slots.length) return [];
  const sorted = slots.map(s => ({ start: new Date(s.start), end: new Date(s.end) }))
                      .sort((a, b) => a.start - b.start);
  const merged = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const current = sorted[i];
    if (current.start <= last.end) {
      last.end = new Date(Math.max(last.end, current.end));
    } else {
      merged.push(current);
    }
  }
  return merged.map(s => ({ start: s.start.toISOString(), end: s.end.toISOString() }));
}