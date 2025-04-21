// calendar.js
// Dependencies: uses utils.js, firebaseRefs.js
let calendar;

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
  