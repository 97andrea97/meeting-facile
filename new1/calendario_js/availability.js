// availability.js
// Dependencies: uses firebaseRefs.js, utils.js, calendar.js, summary.js

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

// ✅ aggiorna e chiama direttamente updateSummaries
function saveAvailabilityAndUpdate() {
  return settingsRef.once("value").then(snap => {
    const settings = snap.val();
    if (!settings) return;
    const events = calendar.getEvents()
      .filter(ev => ev.title === username)
      .map(ev => clipSlotToRange({ start: ev.start.toISOString(), end: ev.end.toISOString() }, settings))
      .filter(slot => slot !== null);
    return userRef.set(events).then(() => updateSummaries(settings));
  });
}

// ✅ versione Promise-friendly, senza chiamare direttamente updateSummaries
function saveAvailability() {
  return settingsRef.once("value").then(snap => {
    const settings = snap.val();
    if (!settings) return;
    const events = calendar.getEvents()
      .filter(ev => ev.title === username)
      .map(ev => clipSlotToRange({ start: ev.start.toISOString(), end: ev.end.toISOString() }, settings))
      .filter(slot => slot !== null);
    return userRef.set(events);
  });
}
