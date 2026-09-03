import { el, pad2, beep, showToast } from "../ui.js";

export const meta = {
  id: "clock",
  name: "Clock",
  glyphClass: "clock",
  dock: true,
  icon: '<svg viewBox="0 0 24 24" width="30" height="30"><path fill="#fff" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 10.41V6h-2v7.41l4.71 4.71 1.41-1.41z"/></svg>',
};

export function mount(container) {
  let tab = "clock";
  let clockTimer = null;

  let sw = { running: false, elapsed: 0, startedAt: 0, laps: [] };
  let swTimer = null;

  let timer = { totalMs: 5 * 60 * 1000, remainingMs: 5 * 60 * 1000, running: false, startedAt: 0 };
  let timerTimer = null;

  function render() {
    container.innerHTML = "";
    const tabs = el("div", { class: "tabbar" }, [
      tabBtn("clock", "Clock"),
      tabBtn("stopwatch", "Stopwatch"),
      tabBtn("timer", "Timer"),
    ]);
    container.appendChild(tabs);

    const body = el("div", { class: "tab-body" });
    if (tab === "clock") body.appendChild(renderClockTab());
    if (tab === "stopwatch") body.appendChild(renderStopwatchTab());
    if (tab === "timer") body.appendChild(renderTimerTab());
    container.appendChild(body);
  }

  function tabBtn(id, label) {
    return el("button", {
      class: tab === id ? "active" : "",
      text: label,
      onclick: () => { switchTab(id); },
    });
  }

  function switchTab(id) {
    tab = id;
    render();
  }

  function renderClockTab() {
    const now = new Date();
    const h = pad2(now.getHours());
    const m = pad2(now.getMinutes());
    const s = pad2(now.getSeconds());
    const wrap = el("div", {}, [
      el("div", { class: "big-time", text: `${h}:${m}:${s}` }),
      el("div", { class: "big-date", text: now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }) }),
      el("div", { class: "card", html: `<div class="row-between"><span class="muted">Timezone</span><strong>${Intl.DateTimeFormat().resolvedOptions().timeZone}</strong></div>` }),
    ]);
    return wrap;
  }

  function fmtStopwatch(ms) {
    const totalCs = Math.floor(ms / 10);
    const cs = pad2(totalCs % 100);
    const s = pad2(Math.floor(totalCs / 100) % 60);
    const m = pad2(Math.floor(totalCs / 6000));
    return `${m}:${s}.${cs}`;
  }

  function renderStopwatchTab() {
    const currentElapsed = sw.elapsed + (sw.running ? Date.now() - sw.startedAt : 0);
    const wrap = el("div", {}, [
      el("div", { class: "big-time", text: fmtStopwatch(currentElapsed) }),
      el("div", { class: "row", style: "justify-content:center; gap:12px; margin-bottom:18px;" }, [
        el("button", {
          class: "btn " + (sw.running ? "btn-outline" : "btn-primary"),
          text: sw.running ? "Lap" : (sw.elapsed > 0 ? "Resume" : "Start"),
          onclick: () => {
            if (sw.running) {
              sw.laps.unshift(currentElapsed);
            } else {
              sw.running = true;
              sw.startedAt = Date.now();
              startStopwatchTicker();
            }
            render();
          },
        }),
        el("button", {
          class: "btn btn-outline",
          text: sw.running ? "Stop" : "Reset",
          onclick: () => {
            if (sw.running) {
              sw.elapsed = currentElapsed;
              sw.running = false;
              stopStopwatchTicker();
            } else {
              sw.elapsed = 0;
              sw.laps = [];
            }
            render();
          },
        }),
      ]),
    ]);

    if (sw.laps.length) {
      const list = el("ul", { class: "lap-list" });
      sw.laps.forEach((lapMs, i) => {
        const n = sw.laps.length - i;
        list.appendChild(el("li", {}, [el("span", { text: `Lap ${n}` }), el("span", { text: fmtStopwatch(lapMs) })]));
      });
      wrap.appendChild(list);
    }
    return wrap;
  }

  function startStopwatchTicker() {
    stopStopwatchTicker();
    swTimer = setInterval(() => { if (tab === "stopwatch") render(); }, 100);
  }
  function stopStopwatchTicker() {
    clearInterval(swTimer);
    swTimer = null;
  }

  function fmtTimer(ms) {
    const totalS = Math.max(0, Math.ceil(ms / 1000));
    return `${pad2(Math.floor(totalS / 60))}:${pad2(totalS % 60)}`;
  }

  function renderTimerTab() {
    const remaining = timer.running ? Math.max(0, timer.remainingMs - (Date.now() - timer.startedAt)) : timer.remainingMs;
    const wrap = el("div", {});

    if (!timer.running && timer.remainingMs === timer.totalMs) {
      const mins = Math.floor(timer.totalMs / 60000);
      const secs = Math.floor((timer.totalMs % 60000) / 1000);
      wrap.appendChild(el("div", { class: "timer-set" }, [
        numberField(mins, 0, 99, (v) => { timer.totalMs = (v * 60 + secs) * 1000; timer.remainingMs = timer.totalMs; render(); }, "min"),
        numberField(secs, 0, 59, (v) => { timer.totalMs = (mins * 60 + v) * 1000; timer.remainingMs = timer.totalMs; render(); }, "sec"),
      ]));
    }

    wrap.appendChild(el("div", { class: "big-time", text: fmtTimer(remaining) }));

    wrap.appendChild(el("div", { class: "row", style: "justify-content:center; gap:12px;" }, [
      el("button", {
        class: "btn btn-primary",
        text: timer.running ? "Pause" : "Start",
        onclick: () => {
          if (timer.running) {
            timer.remainingMs = Math.max(0, timer.remainingMs - (Date.now() - timer.startedAt));
            timer.running = false;
            stopTimerTicker();
          } else {
            if (timer.remainingMs <= 0) timer.remainingMs = timer.totalMs;
            timer.startedAt = Date.now();
            timer.running = true;
            startTimerTicker();
          }
          render();
        },
      }),
      el("button", {
        class: "btn btn-outline",
        text: "Reset",
        onclick: () => {
          timer.running = false;
          stopTimerTicker();
          timer.remainingMs = timer.totalMs;
          render();
        },
      }),
    ]));

    return wrap;
  }

  function numberField(value, min, max, onChange, suffix) {
    return el("input", {
      class: "field",
      type: "number",
      min: String(min),
      max: String(max),
      value: String(value),
      oninput: (e) => {
        let v = Number(e.target.value);
        if (Number.isNaN(v)) v = min;
        v = Math.min(max, Math.max(min, v));
        onChange(v);
      },
    });
  }

  function startTimerTicker() {
    stopTimerTicker();
    timerTimer = setInterval(() => {
      const remaining = timer.remainingMs - (Date.now() - timer.startedAt);
      if (remaining <= 0) {
        timer.running = false;
        timer.remainingMs = timer.totalMs;
        stopTimerTicker();
        beep({ times: 3 });
        showToast("Timer done");
      }
      if (tab === "timer") render();
    }, 250);
  }
  function stopTimerTicker() {
    clearInterval(timerTimer);
    timerTimer = null;
  }

  clockTimer = setInterval(() => { if (tab === "clock") render(); }, 1000);
  render();

  return function unmount() {
    clearInterval(clockTimer);
    stopStopwatchTicker();
    stopTimerTicker();
  };
}
