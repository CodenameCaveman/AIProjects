import { el, formatClockTime, formatDateLong } from "./ui.js";
import { loadSettings, applySettings } from "./theme.js";
import * as clockApp from "./apps/clock.js";
import * as calculatorApp from "./apps/calculator.js";
import * as notesApp from "./apps/notes.js";
import * as weatherApp from "./apps/weather.js";
import * as settingsApp from "./apps/settings.js";

const APPS = [clockApp, calculatorApp, notesApp, weatherApp, settingsApp];

const els = {
  lockScreen: document.getElementById("lockScreen"),
  homeScreen: document.getElementById("homeScreen"),
  appScreen: document.getElementById("appScreen"),
  unlockBtn: document.getElementById("unlockBtn"),
  statusTime: document.getElementById("statusTime"),
  lockTime: document.getElementById("lockTime"),
  lockDate: document.getElementById("lockDate"),
  homeTime: document.getElementById("homeTime"),
  homeDate: document.getElementById("homeDate"),
  appGrid: document.getElementById("appGrid"),
  dock: document.getElementById("dock"),
  appBack: document.getElementById("appBack"),
  appTitle: document.getElementById("appTitle"),
  appBody: document.getElementById("appBody"),
  appActions: document.getElementById("appActions"),
  batteryFill: document.getElementById("batteryFill"),
};

let activeUnmount = null;

/* ---------------- Clock ticking ---------------- */

function tickClock() {
  const now = new Date();
  const t = formatClockTime(now);
  els.statusTime.textContent = t;
  els.lockTime.textContent = t;
  els.lockDate.textContent = formatDateLong(now);
  els.homeTime.textContent = t;
  els.homeDate.textContent = formatDateLong(now);
}
tickClock();
setInterval(tickClock, 1000 * 10);
setInterval(() => {
  const t = formatClockTime(new Date());
  els.statusTime.textContent = t;
  els.lockTime.textContent = t;
  els.homeTime.textContent = t;
}, 1000);

/* ---------------- Battery (best-effort) ---------------- */

if (navigator.getBattery) {
  navigator.getBattery().then((battery) => {
    const update = () => { els.batteryFill.setAttribute("width", String(Math.max(1, 17 * battery.level))); };
    update();
    battery.addEventListener("levelchange", update);
  }).catch(() => {});
}

/* ---------------- Lock / unlock ---------------- */

function unlock() {
  els.lockScreen.classList.add("unlocking");
  setTimeout(() => {
    els.lockScreen.hidden = true;
    els.lockScreen.classList.remove("unlocking");
    els.homeScreen.hidden = false;
  }, 320);
}

els.unlockBtn.addEventListener("click", unlock);
els.lockScreen.addEventListener("click", unlock);

let touchStartY = null;
els.lockScreen.addEventListener("touchstart", (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
els.lockScreen.addEventListener("touchend", (e) => {
  if (touchStartY == null) return;
  const dy = touchStartY - e.changedTouches[0].clientY;
  if (dy > 60) unlock();
  touchStartY = null;
}, { passive: true });

/* ---------------- App grid + dock ---------------- */

function buildIcon(appMeta) {
  return el("button", { class: "app-icon", onclick: () => openApp(appMeta.id) }, [
    el("span", { class: `glyph ${appMeta.glyphClass}`, html: appMeta.icon }),
    el("span", { class: "label", text: appMeta.name }),
  ]);
}

for (const app of APPS) {
  els.appGrid.appendChild(buildIcon(app.meta));
}
for (const app of APPS.filter((a) => a.meta.dock)) {
  els.dock.appendChild(buildIcon(app.meta));
}

/* ---------------- App navigation ---------------- */

function openApp(id) {
  const app = APPS.find((a) => a.meta.id === id);
  if (!app) return;

  if (activeUnmount) { try { activeUnmount(); } catch (_) {} activeUnmount = null; }

  els.appTitle.textContent = app.meta.name;
  els.appActions.innerHTML = "";
  els.appBody.innerHTML = "";
  els.homeScreen.hidden = true;
  els.appScreen.hidden = false;

  const ctx = {
    setActions(nodes) {
      els.appActions.innerHTML = "";
      for (const n of [].concat(nodes)) els.appActions.appendChild(n);
    },
  };

  activeUnmount = app.mount(els.appBody, ctx) || null;
}

function closeApp() {
  if (activeUnmount) { try { activeUnmount(); } catch (_) {} activeUnmount = null; }
  els.appScreen.hidden = true;
  els.homeScreen.hidden = false;
}

els.appBack.addEventListener("click", closeApp);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !els.appScreen.hidden) closeApp();
});

/* ---------------- Init ---------------- */

applySettings(loadSettings());
