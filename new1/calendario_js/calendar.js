// ✅ calendar.js aggiornato riutilizzando il bottone esistente "#saveBtn"
let calendar;
let cachedSettings = null;
let pendingChanges = false;

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function markAsChanged() {
  pendingChanges = true;
  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) saveBtn.style.display = "inline-block";
}

function createCalendar(settings) {
  cachedSettings = settings;

  const calendarEl = document.getElementById("calendar");
  const allDays = [0, 1, 2, 3, 4, 5, 6];
  const hiddenDays = allDays.filter(day => !settings.weekdays.includes(day));

  const validRange = {
    start: settings.startDate,
    end: new Date(new Date(settings.endDate).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  };

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
      markAsChanged();
    },

    eventAdd: markAsChanged,
    eventChange: markAsChanged,
    eventRemove: markAsChanged
  });

  calendar.render();

  // Salva modifiche con il bottone esistente #saveBtn
  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      if (!pendingChanges) return;

      saveBtn.textContent = "⏳ Salvando...";
      saveBtn.disabled = true;

      const commonBox = document.getElementById("common-summary");
      if (commonBox) {
        commonBox.innerHTML = "<div class='common-slot'><em>Caricamento disponibilità comune...</em></div>";
      }

      try {
        await saveAvailability();
        updateSummaries(cachedSettings, true);
        saveBtn.textContent = "💾 Salva disponibilità";
        saveBtn.style.display = "none";
        pendingChanges = false;
      } catch (err) {
        console.error("Errore nel salvataggio:", err);
        saveBtn.textContent = "❌ Errore";
        if (commonBox) {
          commonBox.innerHTML = "<div class='common-slot'><em>Errore nel salvataggio. Riprova.</em></div>";
        }
      }

      saveBtn.disabled = false;
    });
  }
}

function renderUserEvents(mergedByUser) {
  // Rimuovi eventi esistenti che non sono dell’utente corrente
  calendar.getEvents().forEach(ev => {
    if (ev.title !== username && ev.title !== "Comune") ev.remove();
  });

  for (let user in mergedByUser) {
    if (user !== username && selectedUsers.has(user)) {
      const color = getUserColor(user);
      mergedByUser[user].forEach(slot => {
        calendar.addEvent({
          title: user,
          start: slot.start,
          end: slot.end,
          backgroundColor: color,
          editable: false,
          display: 'background'
        });
      });
    }
  }
}
