// utils.js
// Dependencies: used by calendar.js, availability.js, summary.js, legend.js

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