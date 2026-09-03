import { el, showToast } from "../ui.js";

export const meta = {
  id: "weather",
  name: "Weather",
  glyphClass: "weather",
  dock: false,
  icon: '<svg viewBox="0 0 24 24" width="28" height="28"><path fill="#fff" d="M6.5 20q-2.28 0-3.89-1.57Q1 16.85 1 14.58q0-1.95 1.17-3.48 1.17-1.52 3.08-1.95.63-2.3 2.5-3.72Q9.63 4 12 4q2.93 0 4.96 2.04Q19 8.07 19 11q1.73.2 2.86 1.5 1.14 1.28 1.14 3 0 1.88-1.31 3.19T18.5 20h-12z"/></svg>',
};

const FALLBACK = { name: "London, UK", lat: 51.5074, lon: -0.1278 };

const CODE_MAP = {
  0: ["Clear sky", "☀️"], 1: ["Mostly clear", "🌤️"], 2: ["Partly cloudy", "⛅"], 3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"], 48: ["Fog", "🌫️"],
  51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Heavy drizzle", "🌧️"],
  61: ["Light rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
  71: ["Light snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy snow", "❄️"],
  80: ["Rain showers", "🌦️"], 81: ["Rain showers", "🌧️"], 82: ["Violent showers", "⛈️"],
  95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm w/ hail", "⛈️"], 99: ["Thunderstorm w/ hail", "⛈️"],
};

export function mount(container, ctx) {
  let cancelled = false;
  container.innerHTML = "";
  container.appendChild(el("div", { class: "empty-state" }, [el("div", { text: "Loading weather…" })]));

  ctx.setActions([]);

  getLocation()
    .then(({ lat, lon, name }) => fetchWeather(lat, lon, name))
    .then((data) => { if (!cancelled) renderWeather(data); })
    .catch((err) => { if (!cancelled) renderError(err); });

  function getLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(FALLBACK); return; }
      const timeout = setTimeout(() => resolve(FALLBACK), 6000);
      navigator.geolocation.getCurrentPosition(
        (pos) => { clearTimeout(timeout); resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: "Your location" }); },
        () => { clearTimeout(timeout); resolve(FALLBACK); },
        { timeout: 5000, maximumAge: 10 * 60 * 1000 }
      );
    });
  }

  async function fetchWeather(lat, lon, name) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code` +
      `&daily=temperature_2m_max,temperature_2m_min&timezone=auto&temperature_unit=celsius&wind_speed_unit=kmh`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather service unavailable");
    const json = await res.json();
    return { name, current: json.current, daily: json.daily };
  }

  function renderWeather({ name, current, daily }) {
    container.innerHTML = "";
    const [desc, icon] = CODE_MAP[current.weather_code] || ["Unknown", "🌡️"];

    container.appendChild(el("div", { class: "weather-hero" }, [
      el("div", { text: icon, style: "font-size:52px;" }),
      el("div", { class: "weather-temp", text: `${Math.round(current.temperature_2m)}°` }),
      el("div", { class: "weather-desc", text: desc }),
      el("div", { class: "weather-place", text: name }),
    ]));

    const grid = el("div", { class: "weather-grid" });
    const stats = [
      ["Feels like", `${Math.round(current.apparent_temperature)}°`],
      ["Humidity", `${Math.round(current.relative_humidity_2m)}%`],
      ["Wind", `${Math.round(current.wind_speed_10m)} km/h`],
      ["High / Low", daily ? `${Math.round(daily.temperature_2m_max[0])}° / ${Math.round(daily.temperature_2m_min[0])}°` : "—"],
    ];
    for (const [k, v] of stats) {
      grid.appendChild(el("div", { class: "card weather-stat" }, [el("div", { class: "k", text: k }), el("div", { class: "v", text: v })]));
    }
    container.appendChild(grid);
  }

  function renderError(err) {
    container.innerHTML = "";
    container.appendChild(el("div", { class: "empty-state" }, [
      el("div", { text: "Couldn't load weather." }),
      el("div", { class: "muted", text: String(err.message || err) }),
      el("button", { class: "btn btn-primary", text: "Retry", onclick: () => mount(container, ctx) }),
    ]));
    showToast("Weather request failed");
  }

  return function unmount() { cancelled = true; };
}
