chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { action, startDate, endDate } = request;
  if (!startDate || !endDate) {
    alert("Please select valid start and end dates lol");
    sendResponse();
    return;
  }

  const mode = action.includes("fall") ? "fall" : "winter";
  extractEvents(mode, parseLocalDate(startDate), parseLocalDate(endDate));
  

  sendResponse();  
});

function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}


function extractEvents(mode, rangeStart, rangeEnd) {
  const allTables = document.querySelectorAll('table.table-bordered');
  const table = (mode === 'fall') ? allTables[0] : allTables[1];
  if (!table) return alert(`Was not able to find the ${mode} schedule`);

  const events = parseTable(table, mode, rangeStart, rangeEnd);
  if (!events.length) return alert("Empty Schedule? No events were found.");

  const ics = makeICS(events, `-//DraftMySchedule ${mode}//`);
  downloadICS(ics, `${mode}_schedule.ics`);
}

function parseTable(table, sessionName, rangeStart, rangeEnd) {
  const events = [];
  const boxes = table.querySelectorAll('[class^="class_box_o_"]');

  boxes.forEach(box => {
    const html = box.getAttribute('data-content');
    if (!html) return;

    const title = (html.match(/<h5>(.*?)<\/h5>/) || [])[1]?.trim();
    const [startTimeStr, endTimeStr] = (html.match(/Time:.*?(\d{1,2}:\d{2} [AP]M) - (\d{1,2}:\d{2} [AP]M)/) || []).slice(1);
    const dayStr = (html.match(/Day:.*?>(\w+)</) || [])[1]?.trim();
    
    // FIX: add '\s' to avoid picking up spaces after <\b> before </span>
    const location = (html.match(/Location:.*?>([^<\s]*)</) || [])[1]?.trim() || "TBD";
    const prof = (html.match(/Instructor:.*?>([^<\s]*)</) || [])[1]?.trim() || "Unknown";
    const type = (html.match(/Type:.*?>([^<\s]*)</) || [])[1]?.trim() || "Session";

    if (!title || !startTimeStr || !endTimeStr || !dayStr) return;

    const dayNum = getDayNumber(dayStr);
    if (dayNum === -1) return;

    const startTime = parseTime(startTimeStr);
    const endTime = parseTime(endTimeStr);

    const firstDate = getNextWeekday(new Date(rangeStart), dayNum);
    const startDate = new Date(firstDate);
    startDate.setHours(startTime.hours, startTime.minutes, 0, 0);

    const endDate = new Date(firstDate);
    endDate.setHours(endTime.hours, endTime.minutes, 0, 0);

    events.push(makeEvent({
      title,
      location,
      start: startDate,
      end: endDate,
      until: new Date(rangeEnd.setHours(23, 59, 59)),
      description: `${type} with ${prof} in ${location}`
    }));
  });

  return events;
}

function parseTime(timeStr) {
  const [time, meridian] = timeStr.trim().split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (meridian === 'PM' && hours !== 12) hours += 12;
  if (meridian === 'AM' && hours === 12) hours = 0;
  return { hours, minutes };
}
function getDayNumber(dayStr) {
  const normalized = dayStr.slice(0, 3);
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[normalized] ?? -1;
}

function getNextWeekday(fromDate, weekday) {
  const date = new Date(fromDate);
  const diff = (weekday + 7 - date.getDay()) % 7;
  date.setDate(date.getDate() + diff);
  return date;
}

function toICALDateString(date) {
  const pad = n => (n < 10 ? '0' + n : n);
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) + 'T' +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}
function makeEvent({ title, location, start, end, until, description }) {
  const uid = `${start.getTime()}-${title.replace(/\s+/g, '_')}@classmycalendar`;
  const dtstamp = toICALDateString(new Date());
  const untilStr = toICALDateString(until);

  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `SUMMARY:${title || "Untitled Class"}`,
    `DTSTART;TZID=America/Toronto:${toICALDateString(start)}`,
    `DTEND;TZID=America/Toronto:${toICALDateString(end)}`,
    `RRULE:FREQ=WEEKLY;UNTIL=${untilStr}`,
    `SEQUENCE:0`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT"
  ].join("\r\n");
}


function makeICS(events, prodid) {
  const timezoneBlock = [
    "BEGIN:VTIMEZONE",
    "TZID:America/Toronto",
    "BEGIN:STANDARD",
    "DTSTART:20241103T020000",
    "TZOFFSETFROM:-0400",
    "TZOFFSETTO:-0500",
    "TZNAME:EST",
    "END:STANDARD",
    "BEGIN:DAYLIGHT",
    "DTSTART:20250309T020000",
    "TZOFFSETFROM:-0500",
    "TZOFFSETTO:-0400",
    "TZNAME:EDT",
    "END:DAYLIGHT",
    "END:VTIMEZONE"
  ];

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    `PRODID:${prodid}`,
    ...timezoneBlock,
    ...events,
    "END:VCALENDAR"
  ].join("\r\n");
}

function downloadICS(content, filename) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}
