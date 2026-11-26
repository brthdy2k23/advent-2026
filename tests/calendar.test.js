import assert from "node:assert/strict";
import test from "node:test";
import { calendarDate, doorState, readOpened, rememberDoor } from "../scripts/calendar.js";
import { doors } from "../calendar-data.js";

test("all 24 editable doors appear once in calendar order", () => {
  assert.deepEqual(doors.map(({ day }) => day), Array.from({ length: 24 }, (_, index) => index + 1));
  for (const door of doors) {
    for (const field of ["title", "text", "image", "alt"]) {
      assert.equal(typeof door[field], "string");
    }
  }
});

test("uses the Berlin date at the December boundary", () => {
  assert.deepEqual(calendarDate(new Date("2026-11-30T22:59:59Z")), { today: null, available: 0 });
  assert.deepEqual(calendarDate(new Date("2026-11-30T23:00:00Z")), { today: 1, available: 1 });
  assert.deepEqual(calendarDate(new Date("2026-12-23T23:00:00Z")), { today: 24, available: 24 });
  assert.deepEqual(calendarDate(new Date("2026-12-24T23:00:00Z")), { today: null, available: 24 });
  assert.deepEqual(calendarDate(new Date("2027-12-10T12:00:00Z")), { today: null, available: 24 });
});

test("opens past days, highlights today, and keeps future content locked", () => {
  const date = { today: 5, available: 5 };
  const opened = new Set([4, 6]);
  assert.equal(doorState(3, date, opened), "ready");
  assert.equal(doorState(4, date, opened), "opened");
  assert.equal(doorState(5, date, opened), "ready");
  assert.equal(doorState(6, date, opened), "locked");
});

test("filters malformed storage and merges openings from another tab", () => {
  const storage = new Map([["calendar", '[2,2,4,25,"5",null]']]);
  const adapter = { getItem: storage.get.bind(storage), setItem: storage.set.bind(storage) };
  const opened = readOpened(adapter, "calendar");
  assert.deepEqual(opened, new Set([2, 4]));
  storage.set("calendar", "[2,4,7]");
  rememberDoor(adapter, "calendar", opened, 5);
  assert.deepEqual(opened, new Set([2, 4, 5, 7]));
  assert.deepEqual(readOpened(adapter, "calendar"), opened);
  storage.set("calendar", "{");
  assert.deepEqual(readOpened(adapter, "calendar"), new Set());
});

test("opens the door in memory if storage is blocked", () => {
  const blocked = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
  };
  const opened = readOpened(blocked, "calendar");
  rememberDoor(blocked, "calendar", opened, 1);
  assert.deepEqual(opened, new Set([1]));
});
