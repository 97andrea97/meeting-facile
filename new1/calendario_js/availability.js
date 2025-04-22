// ✅ availability.js ottimizzato
// Dependencies: uses firebaseRefs.js, utils.js, calendar.js, summary.js

function loadUserAvailability() {
  settingsRef.once("value").then(snap => {
    const settings = snap.val();
    if (!settings) return;

    userRef.once("value").then(snapshot => {
      const userData = snapshot.val();
      if (!userData) return;

      const events = (Array.isArray(userData) ? userData : Object.values(userData))
        .map(slot => clipSlotToRange(slot, settings))
        .filter(Boolean)
        .map(slot => ({
          title: username,
          start: slot.start,
          end: slot.end,
          backgroundColor: getUserColor(username),
          editable: true,
          display: "auto"
        }));

      events.forEach(ev => calendar.addEvent(ev));
    });
  });
}

function saveAvailability() {
  return settingsRef.once("value").then(snap => {
    const settings = snap.val();
    if (!settings) return;

    const events = calendar.getEvents()
      .filter(ev => ev.title === username)
      .map(ev => clipSlotToRange({
        start: ev.start.toISOString(),
        end: ev.end.toISOString()
      }, settings))
      .filter(Boolean);

    return userRef.set(events);
  });
}
