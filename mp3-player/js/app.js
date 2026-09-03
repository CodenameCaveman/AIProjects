/* Wavelength — a fully client-side MP3 / audio player. */

const SETTINGS_KEY = "wavelength:settings";
const SUPPORTED_TYPES = /\.(mp3|wav|ogg|m4a|flac|aac|opus|weba)$/i;

const els = {
  app: document.getElementById("app"),
  fileInput: document.getElementById("fileInput"),
  addFilesBtn: document.getElementById("addFilesBtn"),
  emptyAddBtn: document.getElementById("emptyAddBtn"),
  themeToggle: document.getElementById("themeToggle"),
  searchInput: document.getElementById("searchInput"),

  dropZone: document.getElementById("dropZone"),
  dropHint: document.getElementById("dropHint"),

  artDisc: document.getElementById("artDisc"),
  artImg: document.getElementById("artImg"),
  artPlaceholder: document.getElementById("artPlaceholder"),
  visualizer: document.getElementById("visualizer"),

  trackTitle: document.getElementById("trackTitle"),
  trackArtist: document.getElementById("trackArtist"),

  curTime: document.getElementById("curTime"),
  durTime: document.getElementById("durTime"),
  seekBar: document.getElementById("seekBar"),

  shuffleBtn: document.getElementById("shuffleBtn"),
  prevBtn: document.getElementById("prevBtn"),
  playBtn: document.getElementById("playBtn"),
  nextBtn: document.getElementById("nextBtn"),
  repeatBtn: document.getElementById("repeatBtn"),
  repeatOneDot: document.getElementById("repeatOneDot"),
  playIcon: document.getElementById("playIcon"),
  pauseIcon: document.getElementById("pauseIcon"),

  muteBtn: document.getElementById("muteBtn"),
  volIconHigh: document.getElementById("volIconHigh"),
  volIconMute: document.getElementById("volIconMute"),
  volumeBar: document.getElementById("volumeBar"),
  speedSelect: document.getElementById("speedSelect"),

  playlistEl: document.getElementById("playlist"),
  playlistPanel: document.querySelector(".playlist-panel"),
  trackCount: document.getElementById("trackCount"),
  sortBtn: document.getElementById("sortBtn"),
  clearBtn: document.getElementById("clearBtn"),

  toast: document.getElementById("toast"),
};

/* ---------------- State ---------------- */

const state = {
  tracks: [],            // { id, file, url, title, artist, album, duration, picture }
  currentIndex: -1,      // index into state.tracks
  shuffleOrder: [],       // permutation of indices, used when shuffle is on
  shuffle: false,
  repeat: "off",          // off | all | one
  volume: 0.8,
  muted: false,
  speed: 1,
  theme: "dark",
  filter: "",
  seeking: false,
};

let idCounter = 0;
const nextId = () => `t${++idCounter}`;

/* ---------------- Persisted settings ---------------- */

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (typeof s.volume === "number") state.volume = s.volume;
    if (typeof s.muted === "boolean") state.muted = s.muted;
    if (typeof s.shuffle === "boolean") state.shuffle = s.shuffle;
    if (["off", "all", "one"].includes(s.repeat)) state.repeat = s.repeat;
    if (typeof s.speed === "number") state.speed = s.speed;
    if (s.theme === "light" || s.theme === "dark") state.theme = s.theme;
  } catch (_) { /* ignore malformed settings */ }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    volume: state.volume,
    muted: state.muted,
    shuffle: state.shuffle,
    repeat: state.repeat,
    speed: state.speed,
    theme: state.theme,
  }));
}

/* ---------------- Audio engine ---------------- */

const audio = new Audio();
audio.preload = "metadata";

let audioCtx = null;
let analyser = null;
let sourceNode = null;

function ensureAudioGraph() {
  if (audioCtx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audioCtx = new Ctx();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 128;
  sourceNode = audioCtx.createMediaElementSource(audio);
  sourceNode.connect(analyser);
  analyser.connect(audioCtx.destination);
}

/* ---------------- Toast ---------------- */

let toastTimer = null;
function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2800);
}

/* ---------------- Time formatting ---------------- */

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/* ---------------- File ingestion ---------------- */

function addFiles(fileList) {
  const files = Array.from(fileList).filter((f) => {
    if (f.type && f.type.startsWith("audio/")) return true;
    return SUPPORTED_TYPES.test(f.name);
  });

  const rejected = fileList.length - files.length;
  if (rejected > 0) {
    showToast(`Skipped ${rejected} unsupported file${rejected > 1 ? "s" : ""}`);
  }
  if (files.length === 0) return;

  const wasEmpty = state.tracks.length === 0;

  for (const file of files) {
    const track = {
      id: nextId(),
      file,
      url: URL.createObjectURL(file),
      title: stripExtension(file.name),
      artist: "Unknown artist",
      album: "",
      duration: null,
      picture: null,
    };
    state.tracks.push(track);
    probeDuration(track);
    readTags(track);
  }

  applyFilenameGuess();
  renderPlaylist();

  if (wasEmpty && state.tracks.length > 0) {
    loadTrack(0, { autoplay: false });
  }

  showToast(`Added ${files.length} track${files.length > 1 ? "s" : ""}`);
}

function stripExtension(name) {
  return name.replace(/\.[^./]+$/, "");
}

function applyFilenameGuess() {
  for (const t of state.tracks) {
    if (t._guessed) continue;
    const m = /^\s*(.+?)\s*-\s*(.+?)\s*$/.exec(t.title);
    if (m && t.artist === "Unknown artist") {
      t.artist = m[1];
      t.title = m[2];
    }
    t._guessed = true;
  }
}

function probeDuration(track) {
  const probe = new Audio();
  probe.preload = "metadata";
  probe.src = track.url;
  probe.addEventListener("loadedmetadata", () => {
    track.duration = probe.duration;
    updatePlaylistItem(track);
    if (state.tracks[state.currentIndex] === track) updateDurationDisplay();
  }, { once: true });
  probe.addEventListener("error", () => {
    track.duration = 0;
    updatePlaylistItem(track);
  }, { once: true });
}

function readTags(track) {
  if (typeof window.jsmediatags === "undefined") return;
  window.jsmediatags.read(track.file, {
    onSuccess: ({ tags }) => {
      if (tags.title) track.title = tags.title;
      if (tags.artist) track.artist = tags.artist;
      if (tags.album) track.album = tags.album;
      if (tags.picture) {
        const { data, format } = tags.picture;
        let binary = "";
        for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
        track.picture = `data:${format};base64,${btoa(binary)}`;
      }
      updatePlaylistItem(track);
      if (state.tracks[state.currentIndex] === track) updateNowPlayingMeta();
    },
    onError: () => { /* keep filename-derived metadata */ },
  });
}

/* ---------------- Playback control ---------------- */

function loadTrack(index, { autoplay = true } = {}) {
  const track = state.tracks[index];
  if (!track) return;
  state.currentIndex = index;
  audio.src = track.url;
  audio.playbackRate = state.speed;
  updateNowPlayingMeta();
  updateDurationDisplay();
  syncPlaylistHighlight();
  updateMediaSession();

  if (autoplay) {
    play();
  } else {
    pauseUI();
  }
}

function play() {
  if (state.currentIndex === -1) {
    if (state.tracks.length === 0) {
      showToast("Add some music first");
      return;
    }
    loadTrack(0);
    return;
  }
  ensureAudioGraph();
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  audio.play().then(playUI).catch(() => {
    showToast("Playback was blocked — click play again");
  });
}

function pause() {
  audio.pause();
  pauseUI();
}

function togglePlay() {
  if (audio.paused) play(); else pause();
}

function playUI() {
  els.playIcon.hidden = true;
  els.pauseIcon.hidden = false;
  els.playBtn.title = "Pause";
  els.artDisc.classList.add("spinning");
  syncPlaylistHighlight();
  startVisualizer();
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
}

function pauseUI() {
  els.playIcon.hidden = false;
  els.pauseIcon.hidden = true;
  els.playBtn.title = "Play";
  els.artDisc.classList.remove("spinning");
  syncPlaylistHighlight();
  if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "paused";
}

function currentOrderedIndices() {
  return state.shuffle ? state.shuffleOrder : state.tracks.map((_, i) => i);
}

function positionInOrder(order) {
  return order.indexOf(state.currentIndex);
}

function goNext({ userInitiated = true } = {}) {
  if (state.tracks.length === 0) return;
  const order = currentOrderedIndices();
  const pos = positionInOrder(order);
  let nextPos = pos + 1;

  if (nextPos >= order.length) {
    if (state.repeat === "all") {
      nextPos = 0;
    } else {
      if (userInitiated) loadTrack(order[0] ?? 0, { autoplay: false });
      else { pause(); audio.currentTime = 0; }
      return;
    }
  }
  loadTrack(order[nextPos]);
}

function goPrev() {
  if (state.tracks.length === 0) return;
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  const order = currentOrderedIndices();
  const pos = positionInOrder(order);
  let prevPos = pos - 1;
  if (prevPos < 0) prevPos = state.repeat === "all" ? order.length - 1 : 0;
  loadTrack(order[prevPos]);
}

function buildShuffleOrder() {
  const order = state.tracks.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (state.currentIndex !== -1) {
    const pos = order.indexOf(state.currentIndex);
    if (pos > 0) { [order[0], order[pos]] = [order[pos], order[0]]; }
  }
  state.shuffleOrder = order;
}

/* ---------------- UI: now playing ---------------- */

function updateNowPlayingMeta() {
  const t = state.tracks[state.currentIndex];
  if (!t) {
    els.trackTitle.textContent = "No track loaded";
    els.trackArtist.textContent = "Add music to get started";
    setArt(null);
    return;
  }
  els.trackTitle.textContent = t.title;
  els.trackArtist.textContent = t.artist + (t.album ? ` — ${t.album}` : "");
  setArt(t.picture);
}

function setArt(url) {
  if (url) {
    els.artImg.src = url;
    els.artImg.hidden = false;
    els.artPlaceholder.hidden = true;
  } else {
    els.artImg.hidden = true;
    els.artImg.removeAttribute("src");
    els.artPlaceholder.hidden = false;
  }
}

function updateDurationDisplay() {
  const t = state.tracks[state.currentIndex];
  const dur = t?.duration ?? audio.duration;
  els.durTime.textContent = formatTime(dur || 0);
}

function updateSeekUI() {
  if (state.seeking) return;
  const dur = audio.duration || (state.tracks[state.currentIndex]?.duration) || 0;
  const pct = dur > 0 ? (audio.currentTime / dur) * 1000 : 0;
  els.seekBar.value = String(pct);
  els.seekBar.style.setProperty("--pct", String(pct / 10));
  els.curTime.textContent = formatTime(audio.currentTime);
  if (dur > 0) els.durTime.textContent = formatTime(dur);
}

function updateMediaSession() {
  if (!("mediaSession" in navigator)) return;
  const t = state.tracks[state.currentIndex];
  if (!t) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: t.title,
    artist: t.artist,
    album: t.album || "",
    artwork: t.picture ? [{ src: t.picture, sizes: "512x512", type: "image/png" }] : [],
  });
}

/* ---------------- Visualizer ---------------- */

let rafId = null;
function startVisualizer() {
  if (rafId) return;
  const ctx = els.visualizer.getContext("2d");
  const w = els.visualizer.width;
  const h = els.visualizer.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = 82;
  const bars = analyser ? analyser.frequencyBinCount : 0;
  const data = new Uint8Array(bars);

  function draw() {
    if (audio.paused) { rafId = null; ctx.clearRect(0, 0, w, h); return; }
    rafId = requestAnimationFrame(draw);
    ctx.clearRect(0, 0, w, h);
    if (!analyser) return;
    analyser.getByteFrequencyData(data);
    const barCount = 48;
    const step = Math.floor(data.length / barCount) || 1;
    const style = getComputedStyle(document.documentElement);
    const accent = style.getPropertyValue("--accent").trim() || "#9370ff";
    ctx.fillStyle = accent;
    for (let i = 0; i < barCount; i++) {
      const v = data[i * step] / 255;
      const angle = (i / barCount) * Math.PI * 2;
      const len = 6 + v * 46;
      const x1 = cx + Math.cos(angle) * radius;
      const y1 = cy + Math.sin(angle) * radius;
      const x2 = cx + Math.cos(angle) * (radius + len);
      const y2 = cy + Math.sin(angle) * (radius + len);
      ctx.globalAlpha = 0.35 + v * 0.65;
      ctx.lineWidth = 3;
      ctx.strokeStyle = accent;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  draw();
}

/* ---------------- Playlist rendering ---------------- */

function filteredTracks() {
  const q = state.filter.trim().toLowerCase();
  if (!q) return state.tracks.map((t, i) => [t, i]);
  return state.tracks
    .map((t, i) => [t, i])
    .filter(([t]) => (
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      (t.album || "").toLowerCase().includes(q)
    ));
}

function renderPlaylist() {
  els.playlistEl.innerHTML = "";
  const entries = filteredTracks();

  els.playlistPanel.classList.toggle("empty", state.tracks.length === 0);
  els.trackCount.textContent = `${state.tracks.length} track${state.tracks.length === 1 ? "" : "s"}`;

  for (const [track, index] of entries) {
    els.playlistEl.appendChild(buildPlaylistItem(track, index));
  }
}

function buildPlaylistItem(track, index) {
  const li = document.createElement("li");
  li.className = "playlist-item";
  li.dataset.index = String(index);
  li.dataset.id = track.id;
  li.draggable = true;
  li.setAttribute("role", "option");

  const handle = document.createElement("span");
  handle.className = "drag-handle";
  handle.setAttribute("aria-hidden", "true");
  handle.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M9 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm6-12a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm0 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>';

  const thumb = document.createElement("div");
  thumb.className = "thumb";
  if (track.picture) {
    const img = document.createElement("img");
    img.src = track.picture;
    img.alt = "";
    thumb.appendChild(img);
  } else {
    thumb.textContent = "♪";
  }
  const eq = document.createElement("span");
  eq.className = "eq";
  eq.innerHTML = "<span></span><span></span><span></span>";
  eq.hidden = true;
  thumb.appendChild(eq);

  const info = document.createElement("div");
  info.className = "info";
  const name = document.createElement("div");
  name.className = "name";
  name.textContent = track.title;
  const sub = document.createElement("div");
  sub.className = "sub";
  sub.textContent = track.artist;
  info.append(name, sub);

  const duration = document.createElement("span");
  duration.className = "duration";
  duration.textContent = track.duration != null ? formatTime(track.duration) : "--:--";

  const removeBtn = document.createElement("button");
  removeBtn.className = "remove-btn";
  removeBtn.title = "Remove from playlist";
  removeBtn.setAttribute("aria-label", `Remove ${track.title}`);
  removeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    removeTrack(index);
  });

  li.append(handle, thumb, info, duration, removeBtn);

  li.addEventListener("click", () => {
    if (index === state.currentIndex) { togglePlay(); return; }
    loadTrack(index);
  });

  attachDragReorder(li);

  return li;
}

function updatePlaylistItem(track) {
  const li = els.playlistEl.querySelector(`[data-id="${track.id}"]`);
  if (!li) return;
  li.querySelector(".name").textContent = track.title;
  li.querySelector(".sub").textContent = track.artist;
  li.querySelector(".duration").textContent = track.duration != null ? formatTime(track.duration) : "--:--";
  const thumb = li.querySelector(".thumb");
  let img = thumb.querySelector("img");
  if (track.picture && !img) {
    thumb.textContent = "";
    img = document.createElement("img");
    img.alt = "";
    thumb.appendChild(img);
    const eq = document.createElement("span");
    eq.className = "eq";
    eq.innerHTML = "<span></span><span></span><span></span>";
    eq.hidden = true;
    thumb.appendChild(eq);
  }
  if (img) img.src = track.picture;
}

function syncPlaylistHighlight() {
  els.playlistEl.querySelectorAll(".playlist-item").forEach((li) => {
    const isCurrent = Number(li.dataset.index) === state.currentIndex;
    li.classList.toggle("playing", isCurrent);
    const eq = li.querySelector(".eq");
    if (eq) eq.hidden = !(isCurrent && !audio.paused);
    const img = li.querySelector(".thumb img");
    if (img) img.style.opacity = isCurrent && !audio.paused ? "0.35" : "1";
  });
}

function removeTrack(index) {
  const [removed] = state.tracks.splice(index, 1);
  if (removed) URL.revokeObjectURL(removed.url);

  if (state.currentIndex === index) {
    pause();
    state.currentIndex = -1;
    audio.removeAttribute("src");
    if (state.tracks.length > 0) {
      loadTrack(Math.min(index, state.tracks.length - 1), { autoplay: false });
    } else {
      updateNowPlayingMeta();
      updateDurationDisplay();
      els.seekBar.value = "0";
    }
  } else if (state.currentIndex > index) {
    state.currentIndex -= 1;
  }

  if (state.shuffle) buildShuffleOrder();
  renderPlaylist();
  syncPlaylistHighlight();
}

function clearPlaylist() {
  if (state.tracks.length === 0) return;
  if (!confirm("Clear the entire playlist?")) return;
  pause();
  for (const t of state.tracks) URL.revokeObjectURL(t.url);
  state.tracks = [];
  state.currentIndex = -1;
  state.shuffleOrder = [];
  audio.removeAttribute("src");
  updateNowPlayingMeta();
  updateDurationDisplay();
  els.seekBar.value = "0";
  renderPlaylist();
  showToast("Playlist cleared");
}

function sortPlaylist() {
  const currentTrack = state.tracks[state.currentIndex];
  state.tracks.sort((a, b) => a.title.localeCompare(b.title));
  if (currentTrack) state.currentIndex = state.tracks.indexOf(currentTrack);
  if (state.shuffle) buildShuffleOrder();
  renderPlaylist();
  syncPlaylistHighlight();
}

/* ---------------- Drag to reorder ---------------- */

let dragSrcIndex = null;

function attachDragReorder(li) {
  li.addEventListener("dragstart", (e) => {
    dragSrcIndex = Number(li.dataset.index);
    li.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });
  li.addEventListener("dragend", () => {
    li.classList.remove("dragging");
    dragSrcIndex = null;
  });
  li.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });
  li.addEventListener("drop", (e) => {
    e.preventDefault();
    const targetIndex = Number(li.dataset.index);
    if (dragSrcIndex === null || dragSrcIndex === targetIndex) return;
    reorderTrack(dragSrcIndex, targetIndex);
  });
}

function reorderTrack(from, to) {
  const [moved] = state.tracks.splice(from, 1);
  state.tracks.splice(to, 0, moved);

  if (state.currentIndex === from) state.currentIndex = to;
  else if (from < state.currentIndex && to >= state.currentIndex) state.currentIndex -= 1;
  else if (from > state.currentIndex && to <= state.currentIndex) state.currentIndex += 1;

  if (state.shuffle) buildShuffleOrder();
  renderPlaylist();
  syncPlaylistHighlight();
}

/* ---------------- Volume / mute / speed ---------------- */

function applyVolume() {
  audio.volume = state.muted ? 0 : state.volume;
  els.volumeBar.value = String(Math.round(state.volume * 100));
  els.volumeBar.style.setProperty("--pct", String(state.volume * 100));
  const showMute = state.muted || state.volume === 0;
  els.volIconHigh.hidden = showMute;
  els.volIconMute.hidden = !showMute;
  els.muteBtn.setAttribute("aria-pressed", String(state.muted));
  saveSettings();
}

function setRepeatUI() {
  const modes = { off: "Repeat off", all: "Repeat all", one: "Repeat one" };
  els.repeatBtn.title = modes[state.repeat];
  els.repeatBtn.dataset.mode = state.repeat;
  els.repeatBtn.classList.toggle("active", state.repeat !== "off");
  els.repeatOneDot.hidden = state.repeat !== "one";
}

function setShuffleUI() {
  els.shuffleBtn.classList.toggle("active", state.shuffle);
  els.shuffleBtn.setAttribute("aria-pressed", String(state.shuffle));
}

/* ---------------- Theme ---------------- */

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);
  els.app.setAttribute("data-theme", state.theme);
}

/* ---------------- Event wiring ---------------- */

els.addFilesBtn.addEventListener("click", () => els.fileInput.click());
els.emptyAddBtn.addEventListener("click", () => els.fileInput.click());
els.fileInput.addEventListener("change", (e) => {
  if (e.target.files.length) addFiles(e.target.files);
  e.target.value = "";
});

["dragenter", "dragover"].forEach((evt) => {
  els.dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    els.dropZone.classList.add("drag-over");
  });
});
["dragleave", "drop"].forEach((evt) => {
  els.dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    if (evt === "dragleave" && e.target !== els.dropZone) return;
    els.dropZone.classList.remove("drag-over");
  });
});
els.dropZone.addEventListener("drop", (e) => {
  const files = e.dataTransfer?.files;
  if (files && files.length) addFiles(files);
});
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => { if (e.target === document.body) e.preventDefault(); });

els.playBtn.addEventListener("click", togglePlay);
els.nextBtn.addEventListener("click", () => goNext());
els.prevBtn.addEventListener("click", goPrev);

els.shuffleBtn.addEventListener("click", () => {
  state.shuffle = !state.shuffle;
  if (state.shuffle) buildShuffleOrder();
  setShuffleUI();
  saveSettings();
  showToast(state.shuffle ? "Shuffle on" : "Shuffle off");
});

els.repeatBtn.addEventListener("click", () => {
  state.repeat = state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off";
  setRepeatUI();
  saveSettings();
});

els.seekBar.addEventListener("input", () => {
  state.seeking = true;
  const dur = audio.duration || (state.tracks[state.currentIndex]?.duration) || 0;
  const pct = Number(els.seekBar.value) / 1000;
  els.curTime.textContent = formatTime(pct * dur);
  els.seekBar.style.setProperty("--pct", String(Number(els.seekBar.value) / 10));
});
els.seekBar.addEventListener("change", () => {
  const dur = audio.duration || (state.tracks[state.currentIndex]?.duration) || 0;
  audio.currentTime = (Number(els.seekBar.value) / 1000) * dur;
  state.seeking = false;
});

els.muteBtn.addEventListener("click", () => {
  state.muted = !state.muted;
  applyVolume();
});
els.volumeBar.addEventListener("input", () => {
  state.volume = Number(els.volumeBar.value) / 100;
  if (state.volume > 0) state.muted = false;
  applyVolume();
});

els.speedSelect.addEventListener("change", () => {
  state.speed = Number(els.speedSelect.value);
  audio.playbackRate = state.speed;
  saveSettings();
});

els.sortBtn.addEventListener("click", sortPlaylist);
els.clearBtn.addEventListener("click", clearPlaylist);

els.searchInput.addEventListener("input", () => {
  state.filter = els.searchInput.value;
  renderPlaylist();
  syncPlaylistHighlight();
});

els.themeToggle.addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
  saveSettings();
});

/* ---- audio element events ---- */

audio.addEventListener("timeupdate", updateSeekUI);
audio.addEventListener("loadedmetadata", () => {
  updateDurationDisplay();
  updateSeekUI();
});
audio.addEventListener("ended", () => {
  if (state.repeat === "one") {
    audio.currentTime = 0;
    audio.play().catch(() => {});
    return;
  }
  goNext({ userInitiated: false });
});
audio.addEventListener("play", playUI);
audio.addEventListener("pause", pauseUI);
audio.addEventListener("error", () => {
  if (state.tracks[state.currentIndex]) {
    showToast(`Couldn't play "${state.tracks[state.currentIndex].title}"`);
  }
});

/* ---- keyboard shortcuts ---- */

document.addEventListener("keydown", (e) => {
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

  switch (e.code) {
    case "Space":
      e.preventDefault();
      togglePlay();
      break;
    case "ArrowRight":
      e.preventDefault();
      audio.currentTime = Math.min((audio.currentTime || 0) + 5, audio.duration || Infinity);
      break;
    case "ArrowLeft":
      e.preventDefault();
      audio.currentTime = Math.max((audio.currentTime || 0) - 5, 0);
      break;
    case "ArrowUp":
      e.preventDefault();
      state.volume = Math.min(1, state.volume + 0.05);
      state.muted = false;
      applyVolume();
      break;
    case "ArrowDown":
      e.preventDefault();
      state.volume = Math.max(0, state.volume - 0.05);
      applyVolume();
      break;
    case "KeyN":
      goNext();
      break;
    case "KeyP":
      goPrev();
      break;
    case "KeyM":
      state.muted = !state.muted;
      applyVolume();
      break;
    case "KeyS":
      els.shuffleBtn.click();
      break;
    case "KeyR":
      els.repeatBtn.click();
      break;
    default:
      break;
  }
});

/* ---- MediaSession action handlers ---- */

if ("mediaSession" in navigator) {
  navigator.mediaSession.setActionHandler("play", play);
  navigator.mediaSession.setActionHandler("pause", pause);
  navigator.mediaSession.setActionHandler("previoustrack", goPrev);
  navigator.mediaSession.setActionHandler("nexttrack", () => goNext());
  navigator.mediaSession.setActionHandler("seekto", (details) => {
    if (details.seekTime != null) audio.currentTime = details.seekTime;
  });
}

/* ---------------- Init ---------------- */

function init() {
  loadSettings();
  applyTheme();
  applyVolume();
  setRepeatUI();
  setShuffleUI();
  els.speedSelect.value = String(state.speed);
  audio.playbackRate = state.speed;
  renderPlaylist();
  updateNowPlayingMeta();
}

init();
