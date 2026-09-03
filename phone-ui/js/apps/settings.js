import { el, showToast } from "../ui.js";
import { WALLPAPERS, loadSettings, saveSettings, applySettings } from "../theme.js";

export const meta = {
  id: "settings",
  name: "Settings",
  glyphClass: "settings",
  dock: true,
  icon: '<svg viewBox="0 0 24 24" width="26" height="26"><path fill="#fff" d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.61l-1.92-3.32a.5.5 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.5.5 0 0 0-.59.22L2.78 8.87a.5.5 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.5.5 0 0 0-.12.61l1.92 3.32c.14.24.44.32.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.28.27.42.5.42h3.84c.24 0 .46-.14.5-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.24.1.5.02.59-.22l1.92-3.32a.5.5 0 0 0-.12-.61zM12 15.6A3.6 3.6 0 1 1 15.6 12 3.6 3.6 0 0 1 12 15.6z"/></svg>',
};

export function mount(container, ctx) {
  let settings = loadSettings();

  function render() {
    container.innerHTML = "";
    ctx.setActions([]);

    container.appendChild(section("Appearance", [
      row("Dark mode", toggle(settings.theme === "dark", (on) => {
        settings.theme = on ? "dark" : "light";
        applySettings(settings);
        saveSettings(settings);
      })),
    ]));

    const swatches = el("div", { class: "wallpaper-swatches" },
      WALLPAPERS.map((wp) => el("button", {
        class: "wallpaper-swatch" + (settings.wallpaper === wp.id ? " selected" : ""),
        style: `background:${wp.value}`,
        "aria-label": wp.id,
        onclick: () => { settings.wallpaper = wp.id; applySettings(settings); saveSettings(settings); render(); },
      }))
    );
    container.appendChild(el("div", { class: "settings-section" }, [
      el("h2", { text: "Wallpaper" }),
      el("div", { class: "settings-list" }, [el("div", { class: "settings-row" }, [swatches])]),
    ]));

    container.appendChild(section("Data", [
      row("Clear all app data", el("button", {
        class: "btn btn-danger",
        text: "Clear",
        onclick: () => {
          if (!confirm("This clears notes, timer settings, and preferences stored in this browser. Continue?")) return;
          localStorage.clear();
          settings = loadSettings();
          applySettings(settings);
          showToast("All data cleared");
          render();
        },
      })),
    ]));

    container.appendChild(section("About", [
      row("Pocket", el("span", { class: "muted", text: "v1.0" })),
      row("Built with", el("span", { class: "muted", text: "HTML, CSS, JavaScript" })),
    ]));
  }

  function section(title, rows) {
    return el("div", { class: "settings-section" }, [
      el("h2", { text: title }),
      el("div", { class: "settings-list" }, rows.map((r) => el("div", { class: "settings-row" }, r))),
    ]);
  }

  function row(label, control) {
    return [el("span", { text: label }), control];
  }

  function toggle(on, onChange) {
    const btn = el("button", { class: "switch" + (on ? " on" : ""), role: "switch", "aria-checked": String(on) });
    btn.addEventListener("click", () => {
      const next = !btn.classList.contains("on");
      btn.classList.toggle("on", next);
      btn.setAttribute("aria-checked", String(next));
      onChange(next);
    });
    return btn;
  }

  render();

  return function unmount() {};
}
