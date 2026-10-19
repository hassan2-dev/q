const RECITERS = [
  { id: "ar.alafasy", name: "مشاري راشد العفاسي" },
  { id: "ar.abdulbasitmurattal", name: "عبد الباسط عبد الصمد" },
  { id: "ar.abdulbasitmujawwad", name: "عبد الباسط عبد الصمد · مجوّد" },
  { id: "ar.muhammadsiddiqalminshawimujawwad", name: "محمد صديق المنشاوي" },
  { id: "ar.saudalshuraim", name: "سعود الشريم" },
  { id: "ar.aliabdurrahmanalhuthaify", name: "علي الحذيفي" },
  { id: "ar.muhammadayyub", name: "محمد أيوب" },
  { id: "ar.ahmedalajmi", name: "أحمد العجمي" },
  { id: "ar.yasseraldossari", name: "ياسر الدوسري" },
  { id: "ar.bandarbalila", name: "بندر بليلة" },
  { id: "ar.mahmoudalialbanna", name: "محمود علي البنا" },
  { id: "ar.mohamedtablawi", name: "محمد الطبلاوي" },
  { id: "ar.abdulbariaththubaity", name: "عبد الباري الثبيتي" },
  { id: "ar.salahalbudair", name: "صلاح البدير" },
  { id: "ar.nasseralqatami", name: "ناصر القطامي" },
  { id: "ar.faresabbad", name: "فارس عباد" },
  { id: "ar.haniarrifai", name: "هاني الرفاعي" },
  { id: "ar.aymanswed", name: "أيمن سويد" },
  { id: "ar.ibrahimalakhdar", name: "إبراهيم الأخضر" },
  { id: "ar.khaledalqahtani", name: "خالد القحطاني" }
];

const $ = (id) => document.getElementById(id);
const audio = $("audio");

const state = {
  quran: [],
  surah: 1,
  reciter: localStorage.getItem("mushaf-reciter") || "ar.alafasy",
  filter: "all",
  scale: Number(localStorage.getItem("mushaf-scale") || 1.15),
  speed: Number(localStorage.getItem("mushaf-speed") || 1),
  repeat: false,
  saved: new Set(),
  resumeTime: 0,
  seeking: false,
  downloadAbort: null,
  clearArmed: false,
  blobUrl: null
};

function ar(value) {
  return String(value).replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[digit]);
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function norm(value) {
  return String(value)
    .replace(/[\u064B-\u065F\u0670\u0640\u06D6-\u06ED]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/سورة/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function reciterName(id) {
  return RECITERS.find((item) => item.id === id)?.name || "";
}

function audioUrl(reciter, number) {
  return `https://cdn.islamic.network/quran/audio-surah/128/${reciter}/${number}.mp3`;
}

function keyOf(reciter, number) {
  return `${reciter}:${number}`;
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return ar("0:00");
  const whole = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(whole / 60);
  const secs = String(whole % 60).padStart(2, "0");
  return ar(`${mins}:${secs}`);
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    el.hidden = true;
  }, 4200);
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem("mushaf-progress") || "null");
  } catch {
    return null;
  }
}

function saveProgress() {
  if (!audio.currentTime || audio.currentTime < 1) return;
  localStorage.setItem("mushaf-progress", JSON.stringify({
    surah: state.surah,
    time: audio.currentTime,
    reciter: state.reciter
  }));
  updateResume();
}

function applyScale() {
  document.documentElement.style.setProperty("--scale", String(state.scale));
}

function setSource(url) {
  audio.pause();
  if (state.blobUrl) {
    URL.revokeObjectURL(state.blobUrl);
    state.blobUrl = null;
  }
  if (url.startsWith("blob:")) state.blobUrl = url;
  audio.src = url;
  audio.playbackRate = state.speed;
}

function savedCount() {
  let count = 0;
  for (let n = 1; n <= 114; n += 1) {
    if (state.saved.has(keyOf(state.reciter, n))) count += 1;
  }
  return count;
}

function visibleSurahs() {
  const query = norm($("query").value.trim());
  return state.quran.filter((surah) => {
    if (state.filter === "amma" && surah.n < 78) return false;
    if (state.filter === "meccan" && surah.type !== "Meccan") return false;
    if (state.filter === "medinan" && surah.type !== "Medinan") return false;
    if (!query) return true;
    return norm(surah.name).includes(query) || surah.en.toLowerCase().includes(query);
  });
}

function renderReciters() {
  $("reciter").innerHTML = RECITERS.map((item) =>
    `<option value="${item.id}"${item.id === state.reciter ? " selected" : ""}>${esc(item.name)}</option>`
  ).join("");
}

function renderList() {
  const items = visibleSurahs();
  if (!items.length) {
    $("list").innerHTML = `<p class="empty">ما لقينا سورة بهذا الاسم.</p>`;
    return;
  }
  $("list").innerHTML = items.map((surah) => {
    const saved = state.saved.has(keyOf(state.reciter, surah.n));
    const kind = surah.type === "Meccan" ? "مكية" : "مدنية";
    return `
      <article class="card">
        <button type="button" class="card-open" data-surah="${surah.n}">
          <span class="seal">${ar(surah.n)}</span>
          <span>
            <h2>${esc(surah.name)}</h2>
            <p class="meta">${kind} · ${ar(surah.ayahs.length)} ${surah.ayahs.length === 1 ? "آية" : "آيات"}</p>
          </span>
        </button>
        <button type="button" class="save-btn${saved ? " saved" : ""}" data-save="${surah.n}">${saved ? "محفوظة" : "تنزيل"}</button>
      </article>`;
  }).join("");
}

function renderPage(number) {
  const surah = state.quran[number - 1];
  $("reader-name").textContent = surah.name;
  $("reader-meta").textContent = `${surah.type === "Meccan" ? "مكية" : "مدنية"} · ${ar(surah.ayahs.length)} آيات`;
  $("player-title").textContent = surah.name;
  $("player-reciter").textContent = reciterName(state.reciter);
  const bism = number !== 1 && number !== 9
    ? `<p class="bismillah">${esc(state.quran[0].ayahs[0])}</p>`
    : "";
  $("page").innerHTML = bism + surah.ayahs.map((text, index) => `
    <p class="ayah">
      <span class="ayah-text">${esc(text)}</span>
      <span class="ayah-no">${ar(index + 1)}</span>
    </p>
  `).join("");
  updateSaveButton();
  $("prev").disabled = number <= 1;
  $("next").disabled = number >= 114;
  window.scrollTo(0, 0);
}

function updateSaveButton() {
  const button = $("save-one");
  const saved = state.saved.has(keyOf(state.reciter, state.surah));
  button.textContent = saved ? "محفوظة" : "تنزيل";
  button.classList.toggle("saved", saved);
  button.disabled = false;
}

function updateResume() {
  const progress = loadProgress();
  const button = $("resume");
  if (!progress || !state.quran.length) {
    button.hidden = true;
    return;
  }
  const surah = state.quran[progress.surah - 1];
  if (!surah) {
    button.hidden = true;
    return;
  }
  button.hidden = false;
  button.textContent = `كمّل: ${surah.name}`;
}

function updateNet() {
  const online = navigator.onLine;
  $("net").textContent = online ? "متصل" : "بدون نت";
  $("net").classList.toggle("off", !online);
}

function showHome() {
  $("home").hidden = false;
  $("reader").hidden = true;
  if (!audio.src) {
    $("player").hidden = true;
    document.body.classList.remove("has-player");
  }
  renderList();
}

function showReader() {
  $("home").hidden = true;
  $("reader").hidden = false;
  $("player").hidden = false;
  document.body.classList.add("has-player");
}

function setPlaying(playing) {
  $("play").textContent = playing ? "إيقاف" : "تشغيل";
}

async function prepareAudio(number, resume) {
  const key = keyOf(state.reciter, number);
  const blob = await MushafDb.get(key);
  if (blob) {
    setSource(URL.createObjectURL(blob));
  } else if (!navigator.onLine) {
    audio.removeAttribute("src");
    toast("هذي السورة مو محفوظة. نزّلها وأنت متصل.");
    return false;
  } else {
    setSource(audioUrl(state.reciter, number));
  }
  state.resumeTime = resume ? Number(loadProgress()?.time || 0) : 0;
  return true;
}

async function openSurah(number, options = {}) {
  state.surah = number;
  $("fatiha").hidden = true;
  showReader();
  renderPage(number);
  const ready = await prepareAudio(number, Boolean(options.resume));
  if (!ready) return;
  try {
    await audio.play();
  } catch {
    setPlaying(false);
  }
}

async function downloadOne(number, quiet) {
  if (!navigator.onLine) {
    toast("التنزيل يحتاج إنترنت مرة واحدة.");
    return false;
  }
  const key = keyOf(state.reciter, number);
  if (state.saved.has(key)) return true;
  if (navigator.storage?.persist) navigator.storage.persist();
  const response = await fetch(audioUrl(state.reciter, number));
  if (!response.ok) throw new Error(String(number));
  const blob = await response.blob();
  await MushafDb.put(key, blob);
  state.saved.add(key);
  if (!quiet) toast("انحفظت السورة على الجهاز.");
  return true;
}

function downloadHint() {
  const count = savedCount();
  $("download-hint").textContent = `المحفوظ بصوت ${reciterName(state.reciter)}: ${ar(count)} من ${ar(114)}. جزء عمّ أخف، والمصحف الكامل يأخذ مساحة أكبر. التنزيل يبقى في هذا المتصفح.`;
}

function openDownload() {
  state.clearArmed = false;
  $("dl-clear").textContent = "حذف المحفوظ لهذا القارئ";
  $("download-actions").hidden = false;
  $("download-progress").hidden = true;
  downloadHint();
  $("download").hidden = false;
}

async function downloadRange(from, to) {
  if (!navigator.onLine) {
    toast("التنزيل يحتاج إنترنت مرة واحدة.");
    return;
  }
  if (navigator.storage?.persist) navigator.storage.persist();
  const abort = new AbortController();
  state.downloadAbort = abort;
  $("download-actions").hidden = true;
  $("download-progress").hidden = false;
  const total = to - from + 1;
  let done = 0;
  const failed = [];
  for (let number = from; number <= to; number += 1) {
    if (abort.signal.aborted) break;
    const surah = state.quran[number - 1];
    $("download-status").textContent = `جاري تنزيل ${surah.name} · ${ar(done)} من ${ar(total)}`;
    $("download-bar").style.width = `${(done / total) * 100}%`;
    const key = keyOf(state.reciter, number);
    if (!state.saved.has(key)) {
      try {
        const response = await fetch(audioUrl(state.reciter, number), { signal: abort.signal });
        if (!response.ok) throw new Error(String(number));
        const blob = await response.blob();
        await MushafDb.put(key, blob);
        state.saved.add(key);
      } catch (error) {
        if (error.name === "AbortError") break;
        failed.push(number);
      }
    }
    done += 1;
    $("download-bar").style.width = `${(done / total) * 100}%`;
  }
  state.downloadAbort = null;
  $("download-progress").hidden = true;
  $("download-actions").hidden = false;
  downloadHint();
  renderList();
  updateSaveButton();
  if (abort.signal.aborted) toast("توقف التنزيل. تقدر تكمّله لاحقًا.");
  else if (failed.length) toast(`خلصت، وفي ${ar(failed.length)} سور ما نزلت. أعد المحاولة.`);
  else toast("صار الاستماع يشتغل بدون نت.");
}

async function clearReciter() {
  const keys = [...state.saved].filter((key) => key.startsWith(`${state.reciter}:`));
  for (const key of keys) {
    await MushafDb.remove(key);
    state.saved.delete(key);
  }
  renderList();
  updateSaveButton();
  downloadHint();
  toast("انحذفت تلاوات هذا القارئ من الجهاز.");
}

function showFatiha() {
  const next = $("fatiha-next");
  if (state.surah >= 114) {
    next.textContent = "العودة للفهرس";
  } else {
    next.textContent = "السورة التالية";
  }
  $("fatiha").hidden = false;
  $("fatiha-amen").focus();
}

function fillFatiha() {
  $("fatiha-verses").innerHTML = state.quran[0].ayahs
    .map((text) => `<p>${esc(text)}</p>`)
    .join("");
}

function bind() {
  $("reciter").addEventListener("change", async () => {
    state.reciter = $("reciter").value;
    localStorage.setItem("mushaf-reciter", state.reciter);
    renderList();
    updateSaveButton();
    if (!$("reader").hidden) {
      const playing = !audio.paused;
      const ready = await prepareAudio(state.surah, false);
      if (ready && playing) audio.play().catch(() => setPlaying(false));
    }
  });

  $("query").addEventListener("input", renderList);
  $("filters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    state.filter = button.dataset.filter;
    for (const chip of $("filters").querySelectorAll(".chip")) {
      chip.classList.toggle("on", chip === button);
    }
    renderList();
  });

  $("list").addEventListener("click", async (event) => {
    const save = event.target.closest("[data-save]");
    if (save) {
      const number = Number(save.dataset.save);
      save.disabled = true;
      save.textContent = "ينزّل";
      try {
        await downloadOne(number);
      } catch {
        toast("ما نزل التنزيل. تأكد من النت وحاول مرة ثانية.");
        save.disabled = false;
        save.textContent = "تنزيل";
        return;
      }
      renderList();
      return;
    }
    const open = event.target.closest("[data-surah]");
    if (open) openSurah(Number(open.dataset.surah));
  });

  $("resume").addEventListener("click", () => {
    const progress = loadProgress();
    if (!progress) return;
    if (progress.reciter && RECITERS.some((item) => item.id === progress.reciter)) {
      state.reciter = progress.reciter;
      $("reciter").value = state.reciter;
    }
    openSurah(progress.surah, { resume: true });
  });

  $("back").addEventListener("click", showHome);
  $("smaller").addEventListener("click", () => {
    state.scale = Math.max(0.9, Math.round((state.scale - 0.1) * 10) / 10);
    localStorage.setItem("mushaf-scale", String(state.scale));
    applyScale();
  });
  $("larger").addEventListener("click", () => {
    state.scale = Math.min(1.8, Math.round((state.scale + 0.1) * 10) / 10);
    localStorage.setItem("mushaf-scale", String(state.scale));
    applyScale();
  });
  $("save-one").addEventListener("click", async () => {
    const button = $("save-one");
    if (state.saved.has(keyOf(state.reciter, state.surah))) return;
    button.disabled = true;
    button.textContent = "ينزّل";
    try {
      await downloadOne(state.surah);
    } catch {
      toast("ما نزل التنزيل. تأكد من النت وحاول مرة ثانية.");
    }
    updateSaveButton();
    renderList();
  });

  $("play").addEventListener("click", async () => {
    if (!audio.src) {
      await openSurah(state.surah);
      return;
    }
    if (audio.paused) audio.play().catch(() => toast("اضغط تشغيل مرة ثانية."));
    else audio.pause();
  });
  $("prev").addEventListener("click", () => {
    if (state.surah > 1) openSurah(state.surah - 1);
  });
  $("next").addEventListener("click", () => {
    if (state.surah < 114) openSurah(state.surah + 1);
  });
  $("repeat").addEventListener("click", () => {
    state.repeat = !state.repeat;
    $("repeat").setAttribute("aria-pressed", String(state.repeat));
    $("repeat").classList.toggle("on", state.repeat);
  });
  $("speeds").addEventListener("click", (event) => {
    const button = event.target.closest("[data-speed]");
    if (!button) return;
    state.speed = Number(button.dataset.speed);
    localStorage.setItem("mushaf-speed", String(state.speed));
    audio.playbackRate = state.speed;
    for (const item of $("speeds").querySelectorAll("button")) {
      item.classList.toggle("on", item === button);
    }
  });

  $("seek").addEventListener("pointerdown", () => { state.seeking = true; });
  $("seek").addEventListener("pointerup", () => { state.seeking = false; });
  $("seek").addEventListener("change", () => { state.seeking = false; });
  $("seek").addEventListener("input", () => {
    if (!audio.duration) return;
    audio.currentTime = (Number($("seek").value) / 1000) * audio.duration;
  });

  audio.addEventListener("play", () => {
    audio.playbackRate = state.speed;
    setPlaying(true);
  });
  audio.addEventListener("pause", () => {
    setPlaying(false);
    saveProgress();
  });
  audio.addEventListener("loadedmetadata", () => {
    $("time-all").textContent = formatTime(audio.duration);
    if (state.resumeTime > 1 && state.resumeTime < audio.duration - 1) {
      audio.currentTime = state.resumeTime;
    }
    state.resumeTime = 0;
  });
  audio.addEventListener("timeupdate", () => {
    $("time-now").textContent = formatTime(audio.currentTime);
    $("time-all").textContent = formatTime(audio.duration);
    if (!state.seeking && audio.duration) {
      $("seek").value = String(Math.round((audio.currentTime / audio.duration) * 1000));
    }
    if (audio.currentTime > 1 && Math.floor(audio.currentTime) % 5 === 0) saveProgress();
  });
  audio.addEventListener("ended", () => {
    setPlaying(false);
    saveProgress();
    if (state.repeat) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }
    showFatiha();
  });
  audio.addEventListener("error", () => {
    if (!audio.src) return;
    toast("تعذّر تشغيل التلاوة. جرّب قارئًا ثانيًا أو تنزيل السورة.");
  });

  $("fatiha-amen").addEventListener("click", () => { $("fatiha").hidden = true; });
  $("fatiha").addEventListener("click", (event) => {
    if (event.target === $("fatiha")) $("fatiha").hidden = true;
  });
  $("fatiha-next").addEventListener("click", () => {
    $("fatiha").hidden = true;
    if (state.surah >= 114) showHome();
    else openSurah(state.surah + 1);
  });

  $("open-download").addEventListener("click", openDownload);
  $("dl-close").addEventListener("click", () => {
    if (state.downloadAbort) state.downloadAbort.abort();
    $("download").hidden = true;
  });
  $("dl-amma").addEventListener("click", () => downloadRange(78, 114));
  $("dl-all").addEventListener("click", () => downloadRange(1, 114));
  $("download-cancel").addEventListener("click", () => {
    if (state.downloadAbort) state.downloadAbort.abort();
  });
  $("dl-clear").addEventListener("click", async () => {
    if (!state.clearArmed) {
      state.clearArmed = true;
      $("dl-clear").textContent = "تأكيد الحذف";
      return;
    }
    state.clearArmed = false;
    $("dl-clear").textContent = "حذف المحفوظ لهذا القارئ";
    await clearReciter();
  });

  window.addEventListener("online", updateNet);
  window.addEventListener("offline", updateNet);
  document.addEventListener("keydown", (event) => {
    if (event.code !== "Space" || event.target.matches("input, select, textarea")) return;
    event.preventDefault();
    $("play").click();
  });
}

async function init() {
  if (location.protocol === "file:") {
    document.body.innerHTML = `<div class="file-wall"><div><h1>مصحف البيت</h1><p>افتح ملف «ابدأ المصحف» حتى يشتغل المصحف.</p></div></div>`;
    return;
  }
  applyScale();
  bind();
  updateNet();
  renderReciters();
  const speedButton = document.querySelector(`[data-speed="${state.speed}"]`);
  if (speedButton) {
    for (const item of $("speeds").querySelectorAll("button")) item.classList.remove("on");
    speedButton.classList.add("on");
  }
  try {
    state.quran = await fetch("data/quran.json").then((response) => response.json());
    state.saved = new Set(await MushafDb.keys());
  } catch {
    $("list").innerHTML = `<p class="empty">تعذّر فتح المصحف. أعد تشغيل ملف «ابدأ المصحف».</p>`;
    return;
  }
  fillFatiha();
  renderList();
  updateResume();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

init();
