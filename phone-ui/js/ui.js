/* Small shared helpers used across the shell and the individual apps. */

const toastEl = document.getElementById("toast");
let toastTimer = null;

export function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
}

export function pad2(n) {
  return String(Math.trunc(n)).padStart(2, "0");
}

export function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

export function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function formatClockTime(date) {
  let h = date.getHours();
  const m = pad2(date.getMinutes());
  return `${h}:${m}`;
}

export function formatDateLong(date) {
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

/* Short beep using the Web Audio API — no audio asset needed. */
let beepCtx = null;
export function beep({ freq = 880, duration = 0.15, times = 1 } = {}) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  if (!beepCtx) beepCtx = new Ctx();
  if (beepCtx.state === "suspended") beepCtx.resume();
  for (let i = 0; i < times; i++) {
    const start = beepCtx.currentTime + i * (duration + 0.12);
    const osc = beepCtx.createOscillator();
    const gain = beepCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.3, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(beepCtx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
}
