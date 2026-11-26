import { doors } from "../calendar-data.js";
import { calendarDate, doorState, localTestDate, readOpened, rememberDoor } from "./calendar.js";
import { createScratchCard } from "./scratch.js";

const testDate = localTestDate(new URL(location.href));
const storageKey = testDate ? "advent-2026:test-opened" : "advent-2026:opened";
const storage = {
  /** @param {string} key */
  getItem: (key) => localStorage.getItem(key),
  /** @param {string} key @param {string} value */
  setItem: (key, value) => localStorage.setItem(key, value),
};
const opened = readOpened(storage, storageKey);
const grid = document.querySelector("#door-grid");
const status = document.querySelector("#calendar-status");
const template = /** @type {HTMLTemplateElement} */ (document.querySelector("#door-template"));
const dialog = /** @type {HTMLDialogElement} */ (document.querySelector("#door-dialog"));
const scratchStage = /** @type {HTMLElement} */ (document.querySelector("#scratch-stage"));
const scratchSurface = /** @type {HTMLButtonElement} */ (document.querySelector("#scratch-surface"));
const scratchTitle = /** @type {HTMLElement} */ (document.querySelector("#scratch-title"));
const letterStage = /** @type {HTMLElement} */ (document.querySelector("#letter-stage"));
const letterTitle = /** @type {HTMLElement} */ (document.querySelector("#letter-title"));
const letterDate = document.querySelector("#letter-date");
const letterBody = document.querySelector("#letter-body");
const letterMedia = document.querySelector("#letter-media");
const letterPlaceholder = /** @type {HTMLElement} */ (letterMedia.querySelector(".letter__placeholder"));
const canvas = /** @type {HTMLCanvasElement} */ (document.querySelector("#scratch-canvas"));
const scratchCard = createScratchCard(canvas, revealDoor);

/** @type {import("../calendar-data.js").Door | null} */
let activeDoor = null;
/** @type {HTMLButtonElement | null} */
let trigger = null;

// Theme names and printable ornaments are shared component variants.
const themes = [
  "wine", "cream", "teal", "pink", "sand", "pine",
  "sand", "pine", "wine", "cream", "teal", "pink",
  "teal", "pink", "sand", "pine", "cream", "wine",
  "pink", "wine", "pine", "sand", "teal", "cream",
];
const ornaments = [
  "star", "bauble", "snow", "fir", "arc", "bow",
  "fir", "star", "bauble", "bow", "arc", "snow",
  "bauble", "arc", "bow", "snow", "star", "fir",
  "bow", "arc", "bauble", "star", "fir", "snow",
];

const stateLabel = { locked: "Noch geschlossen", ready: "Zum Freirubbeln", opened: "Geöffnet" };

/** @param {HTMLElement} surface @param {number} day */
function decorateDoor(surface, day) {
  const ornament = /** @type {HTMLElement} */ (surface.querySelector(".ornament"));
  surface.dataset.theme = themes[day - 1];
  ornament.dataset.ornament = ornaments[day - 1];
}

const tiles = doors.map((door) => {
  const tile = /** @type {HTMLLIElement} */ (template.content.firstElementChild.cloneNode(true));
  const button = tile.querySelector("button");
  const today = /** @type {HTMLElement} */ (tile.querySelector(".door__today"));
  decorateDoor(button, door.day);
  const description = tile.querySelector(".door__description");
  description.id = `door-description-${door.day}`;
  button.setAttribute("aria-describedby", description.id);
  tile.querySelector(".door__number").textContent = String(door.day);
  button.addEventListener("click", () => openDoor(door, button));
  grid.append(tile);
  return { door, button, today, description };
});

function currentDate() {
  return testDate ?? calendarDate(new Date());
}

let displayedDate = currentDate();

/** @param {import("./calendar.js").CalendarDate} date */
function refreshCalendar(date = currentDate()) {
  displayedDate = date;
  if (date.available === 0) {
    status.textContent = "Das erste Türchen öffnet am 1. Dezember um 8 Uhr.";
  } else if (date.today !== null && date.today > date.available) {
    status.textContent = "Das heutige Türchen öffnet um 8 Uhr.";
  } else {
    status.textContent = "";
  }

  for (const { door, button, today, description } of tiles) {
    const state = doorState(door.day, date, opened);
    const current = door.day === date.today;
    button.disabled = state === "locked";
    button.dataset.state = state;
    description.textContent = `${door.day}. Dezember. ${stateLabel[state]}`;
    button.setAttribute("aria-current", current ? "date" : "false");
    today.hidden = !current;
  }
}

/** @param {import("../calendar-data.js").Door} door @param {HTMLButtonElement} button */
function openDoor(door, button) {
  const state = doorState(door.day, currentDate(), opened);
  if (state === "locked") {
    refreshCalendar();
    return;
  }
  activeDoor = door;
  trigger = button;

  const showScratch = state === "ready";
  if (showScratch) {
    scratchTitle.textContent = `Rubble Türchen ${door.day} frei`;
    scratchCard.reset();
  } else {
    renderLetter(door);
  }
  setStage(showScratch);
  dialog.showModal();
  (showScratch ? scratchSurface : letterTitle).focus({ preventScroll: true });
}

/** @param {boolean} showScratch */
function setStage(showScratch) {
  scratchStage.hidden = !showScratch;
  letterStage.hidden = showScratch;
  dialog.setAttribute("aria-labelledby", showScratch ? "scratch-title" : "letter-title");
  dialog.scrollTop = 0;
}

function revealDoor() {
  if (!activeDoor || scratchStage.hidden) return;
  rememberDoor(storage, storageKey, opened, activeDoor.day);
  refreshCalendar();
  renderLetter(activeDoor);
  setStage(false);
  letterTitle.focus();
}

/** @param {import("../calendar-data.js").Door} door */
function renderLetter(door) {
  letterDate.textContent = `${door.day}. Dezember 2026`;
  letterTitle.textContent = door.title.trim() || `Der ${door.day}. Dezember`;
  letterBody.replaceChildren();
  const message = door.text.trim() || "Hier ist Platz für deine Nachricht.";
  for (const paragraph of message.split(/\n\s*\n/)) {
    const line = document.createElement("p");
    line.textContent = paragraph;
    letterBody.append(line);
  }

  decorateDoor(letterPlaceholder, door.day);
  letterMedia.querySelector("img")?.remove();
  const path = door.image.trim();
  if (path) {
    const image = document.createElement("img");
    image.className = "letter__image";
    image.hidden = true;
    image.alt = door.alt;
    image.addEventListener("load", () => { image.hidden = false; }, { once: true });
    image.addEventListener("error", () => image.remove(), { once: true });
    image.src = path;
    letterMedia.append(image);
  }
}

scratchSurface.addEventListener("click", (event) => {
  // Keyboard and assistive technology clicks have no pointer click count.
  if (event.detail === 0 && !scratchStage.hidden) scratchCard.rubStep();
});
document.querySelector("#dialog-close").addEventListener("click", () => dialog.close());
/** @type {number | null} */
let backdropPointer = null;
dialog.addEventListener("pointerdown", (event) => {
  backdropPointer = event.button === 0 && event.target === dialog ? event.pointerId : null;
});
dialog.addEventListener("pointerup", (event) => {
  // The final scratch can hide the canvas before the original gesture ends.
  if (event.target === dialog && backdropPointer === event.pointerId) dialog.close();
  backdropPointer = null;
});
dialog.addEventListener("close", () => {
  backdropPointer = null;
  scratchCard.stop();
  activeDoor = null;
  trigger?.focus();
  trigger = null;
});

window.addEventListener("storage", (event) => {
  if (event.key !== storageKey && event.key !== null) return;
  for (const day of readOpened(storage, storageKey)) opened.add(day);
  refreshCalendar();
});

function checkDate() {
  const date = currentDate();
  if (date.available !== displayedDate.available || date.today !== displayedDate.today) {
    refreshCalendar(date);
  }
}

function scheduleDateCheck() {
  const interval = 15000;
  // Check on a clock boundary so an open page updates at 08:00 too.
  window.setTimeout(() => {
    checkDate();
    scheduleDateCheck();
  }, interval - Date.now() % interval);
}

refreshCalendar(displayedDate);
if (!testDate) {
  scheduleDateCheck();
  document.addEventListener("visibilitychange", checkDate);
}
