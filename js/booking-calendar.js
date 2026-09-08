/**
 * Custom booking calendar
 * Timezone: Europe/Budapest
 * Availability: GET calendar-availability (FreeBusy)
 * Booking: POST calendar-book then Netlify Forms (Calendar is source of truth)
 * Mock availability only on plain local Live Server when the function is unreachable
 */
(function () {
  "use strict";

  const TZ = "Europe/Budapest";
  const WORK_START = 8;
  const WORK_END = 16; // exclusive end → last slot 15:00–16:00
  const SLOT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15];
  const AVAILABILITY_URL = "/.netlify/functions/calendar-availability";
  const BOOK_URL = "/.netlify/functions/calendar-book";

  const DOW_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

  const state = {
    view: "week", // 'month' | 'week'
    hour12: false,
    cursor: null,
    selectedKey: null, // 'YYYY-MM-DDTHH:00'
    selectedDay: null, // 'YYYY-MM-DD' for month day panel
    busySet: new Set(),
    loading: false,
    availabilityError: null,
    bookingSubmitLocked: false,
  };

  let rootEl = null;
  let shellEl = null;
  let summaryEl = null;

  function isLocalDevHost() {
    const host = window.location.hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "";
  }

  function t(key, fallback) {
    try {
      const lang = localStorage.getItem("preferred-language") || "en";
      if (typeof translations !== "undefined" && translations[lang]) {
        const parts = key.split(".");
        let cur = translations[lang];
        for (const p of parts) {
          if (cur && typeof cur === "object" && p in cur) cur = cur[p];
          else return fallback;
        }
        if (typeof cur === "string") return cur;
      }
    } catch (_) {}
    return fallback;
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function getBudapestParts(date) {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    });
    const parts = {};
    fmt.formatToParts(date).forEach((p) => {
      if (p.type !== "literal") parts[p.type] = p.value;
    });
    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      hour: Number(parts.hour),
      minute: Number(parts.minute),
      weekday: parts.weekday, // Mon, Tue, ...
    };
  }

  function budapestDateKey(date) {
    const p = getBudapestParts(date);
    return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
  }

  function slotKey(dateKey, hour) {
    return `${dateKey}T${pad2(hour)}:00`;
  }

  function parseDateKey(dateKey) {
    const [y, m, d] = dateKey.split("-").map(Number);
    return { year: y, month: m, day: d };
  }

  /** Approximate Instant for Budapest Y-M-D at local hour (handles CET/CEST via formatter offset). */
  function budapestLocalToDate(year, month, day, hour) {
    const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
    const asBudapest = getBudapestParts(utcGuess);
    const desiredAsMinutes = hour * 60;
    const actualAsMinutes = asBudapest.hour * 60 + asBudapest.minute;
    const deltaMin = desiredAsMinutes - actualAsMinutes;
    return new Date(utcGuess.getTime() + deltaMin * 60 * 1000);
  }

  function weekdayIndexMon0(dateKey) {
    const { year, month, day } = parseDateKey(dateKey);
    const dt = budapestLocalToDate(year, month, day, 12);
    const wd = getBudapestParts(dt).weekday;
    const map = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    return map[wd] ?? 0;
  }

  function isWeekendKey(dateKey) {
    const i = weekdayIndexMon0(dateKey);
    return i >= 5;
  }

  function addDaysToKey(dateKey, delta) {
    const { year, month, day } = parseDateKey(dateKey);
    const dt = new Date(Date.UTC(year, month - 1, day + delta));
    return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
  }

  function compareKeys(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  function nowBudapest() {
    return getBudapestParts(new Date());
  }

  function todayKey() {
    const n = nowBudapest();
    return `${n.year}-${pad2(n.month)}-${pad2(n.day)}`;
  }

  function formatHour(hour) {
    if (!state.hour12) return `${pad2(hour)}:00`;
    const suffix = hour < 12 ? "AM" : "PM";
    let h = hour % 12;
    if (h === 0) h = 12;
    return `${h}:00 ${suffix}`;
  }

  function formatSlotRange(hour) {
    return `${formatHour(hour)} – ${formatHour(hour + 1)}`;
  }

  function formatDisplayDate(dateKey) {
    const { year, month, day } = parseDateKey(dateKey);
    const dt = budapestLocalToDate(year, month, day, 12);
    const lang = localStorage.getItem("preferred-language") || "en";
    return new Intl.DateTimeFormat(lang === "de" ? "de-AT" : "en-GB", {
      timeZone: TZ,
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(dt);
  }

  function monthTitle(year, month) {
    const dt = budapestLocalToDate(year, month, 1, 12);
    const lang = localStorage.getItem("preferred-language") || "en";
    return new Intl.DateTimeFormat(lang === "de" ? "de-AT" : "en-GB", {
      timeZone: TZ,
      month: "long",
      year: "numeric",
    }).format(dt);
  }

  function weekTitle(mondayKey) {
    const fridayKey = addDaysToKey(mondayKey, 4);
    return `${formatDisplayDate(mondayKey)} – ${formatDisplayDate(fridayKey)}`;
  }

  function startOfWeekMonday(dateKey) {
    const idx = weekdayIndexMon0(dateKey);
    return addDaysToKey(dateKey, -idx);
  }

  function cursorKey() {
    return budapestDateKey(state.cursor);
  }

  function setCursorFromKey(dateKey) {
    const { year, month, day } = parseDateKey(dateKey);
    state.cursor = budapestLocalToDate(year, month, day, 12);
  }

  /**
   * Fetch availability.
   * Production / netlify: fail closed on error.
   * Plain local Live Server: mock fallback if function is unreachable.
   */
  async function getAvailability({ from, to }) {
    try {
      const url = `${AVAILABILITY_URL}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });

      if (!res.ok) {
        const err = new Error("Availability request failed");
        err.status = res.status;
        throw err;
      }

      const data = await res.json();
      if (!data || !Array.isArray(data.busy)) {
        throw new Error("Invalid availability payload");
      }

      // Accept only { start, end } objects — never trust extra fields
      const busy = data.busy
        .filter((item) => item && typeof item.start === "string" && typeof item.end === "string")
        .map((item) => ({ start: item.start, end: item.end }));

      return { busy, source: "api" };
    } catch (err) {
      if (isLocalDevHost()) {
        return { busy: buildMockBusyIntervals(from, to), source: "mock" };
      }
      throw err;
    }
  }

  function buildMockBusyIntervals(from, to) {
    const intervals = [];
    let key = from;
    while (compareKeys(key, to) <= 0) {
      if (!isWeekendKey(key)) {
        SLOT_HOURS.forEach((hour) => {
          const seed = key.split("-").join("") + String(hour);
          let h = 0;
          for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
          if (h % 5 === 0 || h % 7 === 0) {
            const { year, month, day } = parseDateKey(key);
            const start = budapestLocalToDate(year, month, day, hour);
            const end = budapestLocalToDate(year, month, day, hour + 1);
            intervals.push({ start: start.toISOString(), end: end.toISOString() });
          }
        });
      }
      key = addDaysToKey(key, 1);
    }
    return intervals;
  }

  function intervalsToBusySet(intervals, from, to) {
    const set = new Set();
    let key = from;
    while (compareKeys(key, to) <= 0) {
      if (!isWeekendKey(key)) {
        const { year, month, day } = parseDateKey(key);
        SLOT_HOURS.forEach((hour) => {
          const slotStart = budapestLocalToDate(year, month, day, hour).getTime();
          const slotEnd = budapestLocalToDate(year, month, day, hour + 1).getTime();
          const overlaps = intervals.some((iv) => {
            const a = Date.parse(iv.start);
            const b = Date.parse(iv.end);
            if (Number.isNaN(a) || Number.isNaN(b)) return false;
            return a < slotEnd && b > slotStart;
          });
          if (overlaps) set.add(slotKey(key, hour));
        });
      }
      key = addDaysToKey(key, 1);
    }
    return set;
  }

  function slotStatus(dateKey, hour) {
    if (state.availabilityError) return "DISABLED";

    const key = slotKey(dateKey, hour);
    if (state.selectedKey === key) return "SELECTED";

    const today = todayKey();
    const now = nowBudapest();

    if (compareKeys(dateKey, today) < 0) return "DISABLED";
    if (isWeekendKey(dateKey)) return "DISABLED";
    if (dateKey === today && hour <= now.hour) return "DISABLED";
    if (state.busySet.has(key)) return "BUSY";
    return "AVAILABLE";
  }

  async function refreshAvailability() {
    state.loading = true;
    const focus = cursorKey();
    let from;
    let to;

    if (state.view === "month") {
      const { year, month } = parseDateKey(focus);
      from = `${year}-${pad2(month)}-01`;
      const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
      to = `${year}-${pad2(month)}-${pad2(lastDay)}`;
      from = addDaysToKey(from, -7);
      to = addDaysToKey(to, 7);
    } else {
      const monday = startOfWeekMonday(focus);
      from = monday;
      to = addDaysToKey(monday, 4);
    }

    try {
      const data = await getAvailability({ from, to });
      state.busySet = intervalsToBusySet(data.busy || [], from, to);
      state.availabilityError = null;
    } catch (_) {
      state.busySet = new Set();
      // Keep selectedKey / hidden booking fields — clearing them caused Netlify Forms
      // to submit without calling calendar-book (Calendar is source of truth).
      state.availabilityError = t(
        "booking.availabilityError",
        "Availability could not be loaded. Booking is temporarily disabled."
      );
    }
    state.loading = false;
  }

  function el(tag, className, attrs) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    return node;
  }

  function renderToolbar(titleText) {
    const bar = el("div", "bc-toolbar");

    const left = el("div", "bc-toolbar-left");
    const viewGroup = el("div", "bc-seg-group", { role: "group", "aria-label": t("booking.viewLabel", "View") });

    const monthBtn = el("button", `bc-seg${state.view === "month" ? " is-active" : ""}`, {
      type: "button",
      text: t("booking.month", "Month"),
      "aria-pressed": state.view === "month" ? "true" : "false",
    });
    monthBtn.addEventListener("click", () => {
      state.view = "month";
      render();
    });

    const weekBtn = el("button", `bc-seg${state.view === "week" ? " is-active" : ""}`, {
      type: "button",
      text: t("booking.week", "Week"),
      "aria-pressed": state.view === "week" ? "true" : "false",
    });
    weekBtn.addEventListener("click", () => {
      state.view = "week";
      render();
    });

    viewGroup.append(monthBtn, weekBtn);
    left.appendChild(viewGroup);

    const nav = el("div", "bc-nav");
    const prev = el("button", "bc-icon-btn", {
      type: "button",
      "aria-label": t("booking.prev", "Previous"),
      text: "‹",
    });
    const next = el("button", "bc-icon-btn", {
      type: "button",
      "aria-label": t("booking.next", "Next"),
      text: "›",
    });
    const title = el("h3", "bc-title", { text: titleText });

    prev.addEventListener("click", () => {
      const key = cursorKey();
      if (state.view === "month") {
        const { year, month } = parseDateKey(key);
        const m = month === 1 ? 12 : month - 1;
        const y = month === 1 ? year - 1 : year;
        setCursorFromKey(`${y}-${pad2(m)}-01`);
      } else {
        setCursorFromKey(addDaysToKey(startOfWeekMonday(key), -7));
      }
      render();
    });

    next.addEventListener("click", () => {
      const key = cursorKey();
      if (state.view === "month") {
        const { year, month } = parseDateKey(key);
        const m = month === 12 ? 1 : month + 1;
        const y = month === 12 ? year + 1 : year;
        setCursorFromKey(`${y}-${pad2(m)}-01`);
      } else {
        setCursorFromKey(addDaysToKey(startOfWeekMonday(key), 7));
      }
      render();
    });

    nav.append(prev, title, next);
    left.appendChild(nav);
    bar.appendChild(left);

    const right = el("div", "bc-toolbar-right");
    const timeGroup = el("div", "bc-seg-group", { role: "group", "aria-label": t("booking.timeFormat", "Time format") });
    const btn24 = el("button", `bc-seg${!state.hour12 ? " is-active" : ""}`, {
      type: "button",
      text: t("booking.h24", "24h"),
      "aria-pressed": !state.hour12 ? "true" : "false",
    });
    const btn12 = el("button", `bc-seg${state.hour12 ? " is-active" : ""}`, {
      type: "button",
      text: t("booking.h12", "12h"),
      "aria-pressed": state.hour12 ? "true" : "false",
    });
    btn24.addEventListener("click", () => {
      state.hour12 = false;
      render();
    });
    btn12.addEventListener("click", () => {
      state.hour12 = true;
      render();
    });
    timeGroup.append(btn24, btn12);
    right.appendChild(timeGroup);
    right.appendChild(el("span", "bc-tz", { text: "Europe/Budapest" }));
    bar.appendChild(right);

    return bar;
  }

  function renderLegend() {
    const legend = el("div", "bc-legend");
    const items = [
      ["available", "bc-swatch-available", t("booking.available", "Available")],
      ["busy", "bc-swatch-busy", t("booking.busy", "Busy")],
      ["selected", "bc-swatch-selected", t("booking.selected", "Selected")],
      ["disabled", "bc-swatch-disabled", t("booking.disabled", "Unavailable")],
    ];
    items.forEach(([, swatch, label]) => {
      const item = el("span", "bc-legend-item");
      item.append(el("span", `bc-swatch ${swatch}`), document.createTextNode(label));
      legend.appendChild(item);
    });
    return legend;
  }

  function makeSlotButton(dateKey, hour) {
    const status = slotStatus(dateKey, hour);
    const btn = el("button", `bc-slot is-${status.toLowerCase()}`, {
      type: "button",
      text: formatSlotRange(hour),
    });
    btn.dataset.slot = slotKey(dateKey, hour);
    btn.dataset.status = status;

    if (status === "BUSY" || status === "DISABLED" || state.availabilityError) {
      btn.disabled = true;
      btn.setAttribute("aria-disabled", "true");
      if (status === "BUSY") btn.title = t("booking.busy", "Busy");
      else btn.title = t("booking.disabled", "Unavailable");
    } else {
      btn.setAttribute("aria-pressed", status === "SELECTED" ? "true" : "false");
      btn.addEventListener("click", () => {
        if (state.availabilityError) return;
        state.selectedKey = slotKey(dateKey, hour);
        state.selectedDay = dateKey;
        clearBookingSubmitError();
        syncBookingHiddenFields();
        render();
      });
    }
    return btn;
  }

  function renderAvailabilityError() {
    if (!state.availabilityError) return null;
    const box = el("div", "bc-error", { role: "alert" });
    box.appendChild(el("p", "bc-error-title", { text: t("booking.availabilityErrorTitle", "Availability unavailable") }));
    box.appendChild(el("p", "bc-error-text", { text: state.availabilityError }));
    const retry = el("button", "bc-error-retry", {
      type: "button",
      text: t("booking.retry", "Retry"),
    });
    retry.addEventListener("click", () => render());
    box.appendChild(retry);
    return box;
  }

  function renderMonthBody() {
    const wrap = el("div", "bc-body");
    const focus = cursorKey();
    const { year, month } = parseDateKey(focus);
    const firstKey = `${year}-${pad2(month)}-01`;
    const startOffset = weekdayIndexMon0(firstKey); // Mon=0 … include Sunday column as 6
    // Month grid shows Mon–Sun; weekends non-selectable
    const gridStart = addDaysToKey(firstKey, -startOffset);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const lastKey = `${year}-${pad2(month)}-${pad2(lastDay)}`;

    const grid = el("div", "bc-month-grid", { role: "grid", "aria-label": monthTitle(year, month) });

    DOW_KEYS.forEach((k) => {
      grid.appendChild(
        el("div", "bc-dow", {
          text: t(`booking.${k}`, k.slice(0, 3).toUpperCase()),
        })
      );
    });

    let key = gridStart;
    for (let i = 0; i < 42; i++) {
      const inMonth = key.slice(0, 7) === `${year}-${pad2(month)}`;
      const weekend = isWeekendKey(key);
      const today = key === todayKey();
      const past = compareKeys(key, todayKey()) < 0;
      const selected = state.selectedDay === key;

      const btn = el("button", "bc-day", {
        type: "button",
        text: String(parseDateKey(key).day),
      });
      if (!inMonth) btn.classList.add("is-outside");
      if (weekend) btn.classList.add("is-weekend");
      if (today) btn.classList.add("is-today");
      if (selected) btn.classList.add("is-selected");

      const disabled = !inMonth || weekend || past;
      if (disabled) {
        btn.disabled = true;
        btn.setAttribute("aria-disabled", "true");
      } else {
        const dayKey = key;
        btn.addEventListener("click", () => {
          state.selectedDay = dayKey;
          setCursorFromKey(dayKey);
          render();
        });
      }
      grid.appendChild(btn);
      key = addDaysToKey(key, 1);
      if (compareKeys(key, addDaysToKey(lastKey, 14)) > 0 && i > 34) break;
    }

    wrap.appendChild(grid);

    if (state.selectedDay && !isWeekendKey(state.selectedDay) && compareKeys(state.selectedDay, todayKey()) >= 0) {
      const panel = el("div", "bc-day-slots");
      panel.appendChild(
        el("h4", "bc-day-slots-title", {
          text: `${t("booking.slotsFor", "Available times")} · ${formatDisplayDate(state.selectedDay)}`,
        })
      );
      const list = el("div", "bc-slot-list");
      SLOT_HOURS.forEach((hour) => list.appendChild(makeSlotButton(state.selectedDay, hour)));
      panel.appendChild(list);
      wrap.appendChild(panel);
    } else {
      wrap.appendChild(
        el("p", "bc-status", {
          text: t("booking.pickDay", "Select a weekday to see available 1-hour slots (08:00–16:00)."),
        })
      );
    }

    return wrap;
  }

  function renderWeekBody() {
    const wrap = el("div", "bc-body");
    const scroll = el("div", "bc-week-scroll");
    const grid = el("div", "bc-week-grid", { role: "grid" });
    const monday = startOfWeekMonday(cursorKey());
    const days = [0, 1, 2, 3, 4].map((i) => addDaysToKey(monday, i));

    grid.appendChild(el("div", "bc-week-corner"));
    days.forEach((dateKey) => {
      const isToday = dateKey === todayKey();
      const head = el("div", `bc-week-head${isToday ? " is-today" : ""}`);
      const dow = DOW_KEYS[weekdayIndexMon0(dateKey)];
      head.appendChild(el("span", "bc-week-head-day", { text: t(`booking.${dow}`, dow) }));
      head.appendChild(el("span", "bc-week-head-date", { text: String(parseDateKey(dateKey).day) }));
      grid.appendChild(head);
    });

    SLOT_HOURS.forEach((hour) => {
      grid.appendChild(el("div", "bc-week-time", { text: formatHour(hour) }));
      days.forEach((dateKey) => {
        grid.appendChild(makeSlotButton(dateKey, hour));
      });
    });

    scroll.appendChild(grid);
    wrap.appendChild(scroll);
    return wrap;
  }

  function renderSummary() {
    const box = el("div", `bc-summary${state.selectedKey ? "" : " is-empty"}`);
    const textWrap = el("div");
    textWrap.appendChild(el("p", "bc-summary-label", { text: t("booking.selection", "Your selection") }));

    let value = t("booking.noneSelected", "No time slot selected yet");
    if (state.selectedKey) {
      const [dateKey, timePart] = state.selectedKey.split("T");
      const hour = Number(timePart.slice(0, 2));
      value = `${formatDisplayDate(dateKey)} · ${formatSlotRange(hour)} (${TZ})`;
    }
    textWrap.appendChild(el("p", "bc-summary-value", { text: value }));
    box.appendChild(textWrap);

    const continueBtn = el("button", "bc-continue", {
      type: "button",
      text: t("booking.continue", "Continue"),
    });
    continueBtn.disabled = !state.selectedKey || !!state.availabilityError;
    continueBtn.addEventListener("click", onContinue);
    box.appendChild(continueBtn);

    return box;
  }

  function onContinue() {
    if (!state.selectedKey || state.availabilityError) return;
    const [dateKey, timePart] = state.selectedKey.split("T");
    const hour = Number(timePart.slice(0, 2));
    const when = `${formatDisplayDate(dateKey)} · ${formatSlotRange(hour)} (${TZ})`;

    const form = document.querySelector('form[name="contact"]');
    const message = document.getElementById("message");
    const subject = document.getElementById("subject");

    if (subject) {
      subject.value = "project";
      subject.dispatchEvent(new Event("change", { bubbles: true }));
    }

    if (message) {
      const prefix = t(
        "booking.messagePrefill",
        "I would like to book a call for the following time slot:"
      );
      const stamp = `${prefix}\n${when}\n\n`;
      if (!message.value.includes(when)) {
        message.value = stamp + message.value.replace(/^\s+/, "");
      }
      message.focus();
    }

    syncBookingHiddenFields();
    clearBookingSubmitError();

    if (form) {
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function getSelectedSlot() {
    if (!state.selectedKey) return null;
    const [dateKey, timePart] = state.selectedKey.split("T");
    const hour = Number(timePart.slice(0, 2));
    if (!Number.isFinite(hour) || hour < WORK_START || hour >= WORK_END) return null;
    return {
      start: `${dateKey}T${pad2(hour)}:00:00`,
      end: `${dateKey}T${pad2(hour + 1)}:00:00`,
      timeZone: TZ,
      dateKey,
      hour,
    };
  }

  function readSlotFromHiddenFields() {
    const start = (document.getElementById("booking_start")?.value || "").trim();
    const end = (document.getElementById("booking_end")?.value || "").trim();
    const timeZone = (document.getElementById("booking_tz")?.value || "").trim() || TZ;
    if (!start || !end) return null;
    return { start, end, timeZone };
  }

  function syncBookingHiddenFields() {
    const slot = getSelectedSlot() || readSlotFromHiddenFields();
    const startEl = document.getElementById("booking_start");
    const endEl = document.getElementById("booking_end");
    const tzEl = document.getElementById("booking_tz");
    // Only update when we still know the slot — never wipe booking intent before submit
    if (!slot) return;
    if (startEl) startEl.value = slot.start;
    if (endEl) endEl.value = slot.end;
    if (tzEl) tzEl.value = slot.timeZone || TZ;
  }

  function clearBookingHiddenFields() {
    const startEl = document.getElementById("booking_start");
    const endEl = document.getElementById("booking_end");
    if (startEl) startEl.value = "";
    if (endEl) endEl.value = "";
  }

  function clearBookingSubmitError() {
    const box = document.getElementById("booking-submit-error");
    if (!box) return;
    box.classList.add("hidden");
    box.textContent = "";
  }

  function showBookingSubmitError(message) {
    const box = document.getElementById("booking-submit-error");
    if (!box) return;
    box.textContent = message;
    box.classList.remove("hidden");
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function errorMessageForCode(code, status) {
    if (code === "slot_busy" || status === 409) {
      return t(
        "booking.slotBusy",
        "That time slot was just taken. Please choose another available time."
      );
    }
    if (code === "validation" || status === 400) {
      return t(
        "booking.validationError",
        "Please check your details and selected time, then try again."
      );
    }
    return t(
      "booking.bookUnavailable",
      "Booking is temporarily unavailable. Your message was not sent."
    );
  }

  function setSubmitLoading(isLoading) {
    const btn = document.querySelector('form[name="contact"] button[type="submit"]');
    if (!btn) return;
    btn.disabled = isLoading;
    btn.setAttribute("aria-busy", isLoading ? "true" : "false");
  }

  async function bookSlotOnServer(slot, form) {
    const name = (form.querySelector('[name="name"]') || {}).value || "";
    const email = (form.querySelector('[name="email"]') || {}).value || "";
    const message = (form.querySelector('[name="message"]') || {}).value || "";

    const res = await fetch(BOOK_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        start: slot.start,
        end: slot.end,
        timeZone: slot.timeZone || TZ,
        name,
        email,
        message,
      }),
    });

    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = null;
    }

    return { res, data };
  }

  async function handleContactSubmit(event) {
    // Listener is on the form — always use currentTarget (target can be the submitter)
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement) || form.getAttribute("name") !== "contact") {
      return;
    }

    // After Calendar success we re-submit natively for Netlify Forms
    if (state.bookingSubmitLocked) {
      return;
    }

    // Read booking intent BEFORE any sync that might alter fields
    const slot = getSelectedSlot() || readSlotFromHiddenFields();

    // Plain contact (no slot selected / no hidden booking): allow native Netlify Forms
    if (!slot) {
      return;
    }

    // Booking intent present → Calendar is source of truth. Never fall through to Netlify.
    event.preventDefault();
    clearBookingSubmitError();

    if (state.availabilityError) {
      showBookingSubmitError(
        t(
          "booking.bookUnavailable",
          "Booking is temporarily unavailable. Your message was not sent."
        )
      );
      return;
    }

    setSubmitLoading(true);

    try {
      const { res, data } = await bookSlotOnServer(slot, form);
      const code = data && typeof data.error === "string" ? data.error : "";

      if (res.ok && data && data.ok === true) {
        // Calendar confirmed → secondary Netlify Forms notification + success redirect
        state.bookingSubmitLocked = true;
        setSubmitLoading(false);
        form.submit();
        return;
      }

      if (res.status === 409 || code === "slot_busy") {
        if (state.selectedKey) state.busySet.add(state.selectedKey);
        state.selectedKey = null;
        clearBookingHiddenFields();
        showBookingSubmitError(errorMessageForCode("slot_busy", 409));
        await render();
        return;
      }

      showBookingSubmitError(errorMessageForCode(code, res.status));
    } catch (_) {
      showBookingSubmitError(
        t(
          "booking.bookUnavailable",
          "Booking is temporarily unavailable. Your message was not sent."
        )
      );
    } finally {
      if (!state.bookingSubmitLocked) {
        setSubmitLoading(false);
      }
    }
  }

  function wireContactForm() {
    const form = document.querySelector('form[name="contact"]');
    if (!form || form.dataset.bookingWired === "1") return;
    form.dataset.bookingWired = "1";
    form.addEventListener("submit", handleContactSubmit);
  }

  async function render() {
    if (!rootEl || !shellEl || !summaryEl) return;

    await refreshAvailability();

    const focus = cursorKey();
    const titleText =
      state.view === "month"
        ? monthTitle(parseDateKey(focus).year, parseDateKey(focus).month)
        : weekTitle(startOfWeekMonday(focus));

    shellEl.innerHTML = "";
    shellEl.appendChild(renderToolbar(titleText));
    const errBox = renderAvailabilityError();
    if (errBox) shellEl.appendChild(errBox);
    shellEl.appendChild(state.view === "month" ? renderMonthBody() : renderWeekBody());
    shellEl.appendChild(renderLegend());

    summaryEl.innerHTML = "";
    summaryEl.appendChild(renderSummary());
    syncBookingHiddenFields();
  }

  function applyDateQuery() {
    const date = new URLSearchParams(window.location.search).get("date");
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setCursorFromKey(date);
      if (!isWeekendKey(date) && compareKeys(date, todayKey()) >= 0) {
        state.selectedDay = date;
        state.view = "week";
      }
      requestAnimationFrame(() => {
        const section = document.getElementById("calendar-booking");
        if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function init() {
    rootEl = document.getElementById("booking-calendar");
    if (!rootEl) return;

    state.cursor = new Date();
    applyDateQuery();

    rootEl.innerHTML = "";
    rootEl.classList.add("bc-root");

    shellEl = el("div", "bc-shell");
    summaryEl = el("div");
    rootEl.append(shellEl, summaryEl);

    render();
    wireContactForm();

    document.addEventListener("language-changed", () => render());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
