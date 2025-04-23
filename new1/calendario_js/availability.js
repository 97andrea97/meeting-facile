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

// ✅ Patch for calendar display control
function renderUserEvents(mergedByUser) {
  calendar.getEvents().forEach(ev => {
    if (ev.title !== username && ev.title !== "Comune") ev.remove();
    if (ev.title === username && !selectedUsers.has(username)) ev.remove();
  });

  for (let user in mergedByUser) {
    const showInCalendar = selectedUsers.has(user);
    const isCurrentUser = user === username;
    const color = getUserColor(user);
    const slots = mergedByUser[user] || [];

    if (!showInCalendar && !isCurrentUser) continue;

    if (showInCalendar || isCurrentUser) {
      if (!showInCalendar && isCurrentUser) continue; // Don't add own slots if unselected

      slots.forEach(slot => {
        calendar.addEvent({
          title: user,
          start: slot.start,
          end: slot.end,
          backgroundColor: color,
          editable: isCurrentUser,
          display: isCurrentUser ? "auto" : "background"
        });
      });
    }
  }
}