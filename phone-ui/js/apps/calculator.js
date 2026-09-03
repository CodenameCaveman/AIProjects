import { el } from "../ui.js";

export const meta = {
  id: "calculator",
  name: "Calculator",
  glyphClass: "calculator",
  dock: true,
  icon: '<svg viewBox="0 0 24 24" width="28" height="28"><path fill="#fff" d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v4h10V4zm0 6v2h2v-2zm4 0v2h2v-2zm4 0v2h2v-2zm-8 4v2h2v-2zm4 0v2h2v-2zm4 0v2h2v-2zm-8 4v2h2v-2zm4 0v2h6v-2z"/></svg>',
};

export function mount(container) {
  let display = "0";
  let stored = null;
  let pendingOp = null;
  let overwrite = true;

  function render() {
    container.innerHTML = "";
    container.appendChild(el("div", { class: "calc-display", text: formatDisplay(display) }));

    const keys = [
      ["AC", "fn"], ["±", "fn"], ["%", "fn"], ["÷", "op"],
      ["7", ""], ["8", ""], ["9", ""], ["×", "op"],
      ["4", ""], ["5", ""], ["6", ""], ["−", "op"],
      ["1", ""], ["2", ""], ["3", ""], ["+", "op"],
      ["0", "zero"], [".", ""], ["=", "op"],
    ];

    const grid = el("div", { class: "calc-grid" });
    for (const [label, cls] of keys) {
      grid.appendChild(el("button", {
        class: `calc-key ${cls}`,
        text: label,
        onclick: () => handleKey(label),
      }));
    }
    container.appendChild(grid);
  }

  function formatDisplay(value) {
    if (value === "Error") return value;
    if (value.length > 11) {
      const n = Number(value);
      return Number.isFinite(n) ? n.toExponential(5) : "Error";
    }
    return value;
  }

  function handleKey(key) {
    if (display === "Error" && key !== "AC") { display = "0"; overwrite = true; }

    if (/[0-9]/.test(key)) {
      display = overwrite ? key : (display === "0" ? key : display + key);
      overwrite = false;
    } else if (key === ".") {
      if (overwrite) { display = "0."; overwrite = false; }
      else if (!display.includes(".")) display += ".";
    } else if (key === "AC") {
      display = "0"; stored = null; pendingOp = null; overwrite = true;
    } else if (key === "±") {
      display = String(Number(display) * -1);
    } else if (key === "%") {
      display = String(Number(display) / 100);
    } else if (["÷", "×", "−", "+"].includes(key)) {
      if (stored !== null && !overwrite) {
        display = compute(stored, Number(display), pendingOp);
      }
      stored = Number(display);
      pendingOp = key;
      overwrite = true;
    } else if (key === "=") {
      if (stored !== null && pendingOp) {
        display = compute(stored, Number(display), pendingOp);
        stored = null;
        pendingOp = null;
        overwrite = true;
      }
    }
    render();
  }

  function compute(a, b, op) {
    let result;
    switch (op) {
      case "÷": result = b === 0 ? NaN : a / b; break;
      case "×": result = a * b; break;
      case "−": result = a - b; break;
      case "+": result = a + b; break;
      default: result = b;
    }
    if (!Number.isFinite(result)) return "Error";
    return String(Math.round(result * 1e10) / 1e10);
  }

  function keyHandler(e) {
    const map = { "*": "×", "/": "÷", "-": "−", "Enter": "=", "=": "=", "Escape": "AC" };
    if (/[0-9.]/.test(e.key)) { handleKey(e.key); return; }
    if (map[e.key]) { e.preventDefault(); handleKey(map[e.key]); return; }
    if (e.key === "+") handleKey("+");
  }
  document.addEventListener("keydown", keyHandler);

  render();

  return function unmount() {
    document.removeEventListener("keydown", keyHandler);
  };
}
