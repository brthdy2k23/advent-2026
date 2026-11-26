const calendarYear = 2026;
const daysInAdvent = 24;
const berlinDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

/** @typedef {{ today: number | null, available: number }} CalendarDate */
/** @typedef {"locked" | "ready" | "opened"} DoorState */
/** @typedef {Pick<Storage, "getItem" | "setItem">} DoorStorage */

/** @param {Date} now @returns {CalendarDate} */
export function calendarDate(now) {
  const parts = Object.fromEntries(berlinDate.formatToParts(now).map(({ type, value }) => [type, Number(value)]));
  if (parts.year < calendarYear || (parts.year === calendarYear && parts.month < 12)) {
    return { today: null, available: 0 };
  }
  if (parts.year > calendarYear || parts.day > daysInAdvent) {
    return { today: null, available: daysInAdvent };
  }
  return { today: parts.day, available: parts.day };
}

/** @param {number} day @param {CalendarDate} date @param {Set<number>} opened @returns {DoorState} */
export function doorState(day, date, opened) {
  if (day > date.available) return "locked";
  return opened.has(day) ? "opened" : "ready";
}

/** @param {DoorStorage} storage @param {string} key @returns {Set<number>} */
export function readOpened(storage, key) {
  try {
    const saved = JSON.parse(storage.getItem(key) ?? "[]");
    if (Array.isArray(saved)) {
      return new Set(saved.filter((day) => Number.isInteger(day) && day >= 1 && day <= daysInAdvent));
    }
  } catch {
    // A browser may block localStorage or contain an outdated value.
  }
  return new Set();
}

/** @param {DoorStorage} storage @param {string} key @param {Set<number>} opened @param {number} day */
export function rememberDoor(storage, key, opened, day) {
  opened.add(day);
  for (const previous of readOpened(storage, key)) opened.add(previous);
  try {
    storage.setItem(key, JSON.stringify([...opened]));
  } catch {
    // The current page can still remember which doors were opened.
  }
}
