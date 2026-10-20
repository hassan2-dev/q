const RECITERS = [
  { id: "ar.alafasy", name: "مشاري راشد العفاسي", style: "مرتل" },
  { id: "ar.abdulbasitmurattal", name: "عبد الباسط عبد الصمد", style: "مرتل" },
  { id: "ar.abdulbasitmujawwad", name: "عبد الباسط عبد الصمد", style: "مجوّد" },
  { id: "ar.muhammadsiddiqalminshawimujawwad", name: "محمد صديق المنشاوي", style: "مجوّد" },
  { id: "ar.saudalshuraim", name: "سعود الشريم", style: "مرتل" },
  { id: "ar.aliabdurrahmanalhuthaify", name: "علي الحذيفي", style: "مرتل" },
  { id: "ar.muhammadayyub", name: "محمد أيوب", style: "مرتل" },
  { id: "ar.ahmedalajmi", name: "أحمد العجمي", style: "مرتل" },
  { id: "ar.yasseraldossari", name: "ياسر الدوسري", style: "مرتل" },
  { id: "ar.bandarbalila", name: "بندر بليلة", style: "مرتل" },
  { id: "ar.mahmoudalialbanna", name: "محمود علي البنا", style: "مرتل" },
  { id: "ar.mohamedtablawi", name: "محمد الطبلاوي", style: "مرتل" },
  { id: "ar.abdulbariaththubaity", name: "عبد الباري الثبيتي", style: "مرتل" },
  { id: "ar.salahalbudair", name: "صلاح البدير", style: "مرتل" },
  { id: "ar.nasseralqatami", name: "ناصر القطامي", style: "مرتل" },
  { id: "ar.faresabbad", name: "فارس عباد", style: "مرتل" },
  { id: "ar.haniarrifai", name: "هاني الرفاعي", style: "مرتل" },
  { id: "ar.aymanswed", name: "أيمن سويد", style: "مرتل" },
  { id: "ar.ibrahimalakhdar", name: "إبراهيم الأخضر", style: "مرتل" },
  { id: "ar.khaledalqahtani", name: "خالد القحطاني", style: "مرتل" }
];

const $ = (id) => document.getElementById(id);
const audio = $("audio");

const state = {
  quran: [],
  surah: 1,
  reciter: localStorage.getItem("mushaf-reciter") || "ar.alafasy",
  scale: Number(localStorage.getItem("mushaf-scale") || 1.15),
  speed: Number(localStorage.getItem("mushaf-speed") || 1),
  night: localStorage.getItem("mushaf-night") !== "0",
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

function westernDigits(value) {
  return String(value).replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
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

function reciterOf(id) {
  return RECITERS.find((item) => item.id === id) || RECITERS[0];
}

function reciterName(id) {
  return reciterOf(id).name;
}

function streamUrl(reciter, number) {
  return `https://cdn.islamic.network/quran/audio-surah/128/${reciter}/${number}.mp3`;
}

function proxyUrl(reciter, number) {
  return `${location.origin}/audio/${encodeURIComponent(reciter)}/${number}.mp3`;
}

/** Fetch audio as a Blob for IndexedDB. Prefers local proxy (CORS-safe). */
async function fetchAudioBlob(reciter, number, signal) {
  const urls = [];
  if (location.protocol.startsWith("http")) urls.push(proxyUrl(reciter, number));
  urls.push(streamUrl(reciter, number));
  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error(`http ${response.status}`);
      const blob = await response.blob();
      if (!blob || blob.size < 2000) throw new Error("empty audio");
      return blob;
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      lastError = error;
    }
  }
  throw lastError || new Error("download failed");
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

function applyMode() {
  document.body.classList.toggle("day", !state.night);
  $("toggle-mode").textContent = state.night ? "نهاري" : "ليلي";
  const theme = document.getElementById("theme-color");
  if (theme) theme.setAttribute("content", state.night ? "#071410" : "#f6f1e6");
  localStorage.setItem("mushaf-night", state.night ? "1" : "0");
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
  const raw = $("query").value.trim();
  const digits = westernDigits(raw);
  const query = norm(raw);
  return state.quran.filter((surah) => {
    if (!raw) return true;
    if (/^\d+$/.test(digits) && surah.n === Number(digits)) return true;
    return norm(surah.name).includes(query) || surah.en.toLowerCase().includes(query);
  });
}

function updateReciterCard() {
  const item = reciterOf(state.reciter);
  $("reciter-name").textContent = item.name;
  const count = savedCount();
  $("reciter-style").textContent = count >= 114
    ? "هذا الصوت محفوظ كاملًا"
    : `${item.style} · اضغط للتغيير`;
  $("download-sub").textContent = count >= 114
    ? "صوت هذا القارئ محفوظ كاملًا"
    : `${ar(count)} من ${ar(114)} سورة`;
  $("reciter").value = state.reciter;
}

function renderReciters() {
  $("reciter").innerHTML = RECITERS.map((item) =>
    `<option value="${item.id}"${item.id === state.reciter ? " selected" : ""}>${esc(item.name)}</option>`
  ).join("");
  $("reciter-list").innerHTML = RECITERS.map((item) => `
    <button type="button" class="reciter-option${item.id === state.reciter ? " on" : ""}" data-reciter="${item.id}">
      <span class="opt-name">${esc(item.name)}</span>
      <span class="voice-style">${esc(item.style)}</span>
    </button>
  `).join("");
  updateReciterCard();
}

function renderList() {
  const items = visibleSurahs();
  const progress = loadProgress();
  const current = progress?.surah || 0;
  if (!items.length) {
    $("list").innerHTML = `<p class="empty">لا توجد سورة بهذا الاسم</p>`;
    return;
  }
  $("list").innerHTML = items.map((surah) => {
    const saved = state.saved.has(keyOf(state.reciter, surah.n));
    const kind = surah.type === "Meccan" ? "مكية" : "مدنية";
    const on = surah.n === current ? " on" : "";
    return `
      <div class="row${on}">
        <button type="button" class="row-main" data-surah="${surah.n}">
          <span class="num">${ar(surah.n)}</span>
          <span class="meta">
            <span class="name">${esc(surah.name)}</span>
            <span class="meta-text">${kind} · ${ar(surah.ayahs.length)} آيات</span>
          </span>
        </button>
        <button type="button" class="row-save${saved ? " saved" : ""}" data-save="${surah.n}">
          ${saved ? "محفوظة" : "تنزيل"}
        </button>
      </div>`;
  }).join("");
}

function renderPage(number) {
  const surah = state.quran[number - 1];
  $("reader-name").textContent = surah.name;
  $("reader-meta").textContent = `${surah.type === "Meccan" ? "مكية" : "مدنية"} · ${ar(surah.ayahs.length)} آيات`;
  $("player-title").textContent = surah.name;
  const item = reciterOf(state.reciter);
  $("player-reciter").textContent = `${item.name} · ${item.style}`;
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
  const fallback = state.quran[0];
  const surah = progress && state.quran[progress.surah - 1]
    ? state.quran[progress.surah - 1]
    : fallback;
  if (!surah) return;
  $("resume-kicker").textContent = progress ? "تابع من حيث وقفت" : "ابدأ التلاوة";
  $("resume-name").textContent = surah.name;
  $("resume-meta").textContent = `${surah.type === "Meccan" ? "مكية" : "مدنية"} · ${ar(surah.ayahs.length)} آيات`;
}

function updateNet() {
  const online = navigator.onLine;
  $("offline-banner").hidden = online;
}

function showHome() {
  $("home").hidden = false;
  $("reader").hidden = true;
  if (!audio.src) {
    $("player").hidden = true;
    document.body.classList.remove("has-player");
  }
  renderList();
  updateReciterCard();
}

function showReader() {
  $("home").hidden = true;
  $("reader").hidden = false;
  $("player").hidden = false;
  document.body.classList.add("has-player");
}

function setPlaying(playing) {
  $("play").textContent = playing ? "❚❚" : "▶";
  $("play").setAttribute("aria-label", playing ? "إيقاف" : "تشغيل");
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
    setSource(streamUrl(state.reciter, number));
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

async function downloadOne(number, quiet, signal) {
  if (!navigator.onLine) {
    toast("التنزيل يحتاج إنترنت مرة واحدة.");
    return false;
  }
  const key = keyOf(state.reciter, number);
  if (state.saved.has(key)) return true;
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  const blob = await fetchAudioBlob(state.reciter, number, signal);
  await MushafDb.put(key, blob);
  state.saved.add(key);
  if (!quiet) toast("انحفظت السورة على الجهاز.");
  updateReciterCard();
  return true;
}

function downloadHint() {
  const count = savedCount();
  $("download-hint").textContent = `المحفوظ بصوت ${reciterName(state.reciter)}: ${ar(count)} من ${ar(114)}. جزء عمّ أخف، والمصحف الكامل يأخذ مساحة أكبر.`;
}

function openDownload() {
  state.clearArmed = false;
  $("dl-clear").textContent = "حذف المحفوظ لهذا القارئ";
  $("download-actions").hidden = false;
  $("download-progress").hidden = true;
  downloadHint();
  $("download").hidden = false;
}

function openReciterSheet() {
  renderReciters();
  $("reciter-sheet").hidden = false;
}

async function chooseReciter(id) {
  if (!id || id === state.reciter) {
    $("reciter-sheet").hidden = true;
    return;
  }
  state.reciter = id;
  localStorage.setItem("mushaf-reciter", state.reciter);
  $("reciter-sheet").hidden = true;
  renderReciters();
  renderList();
  updateSaveButton();
  if (!$("reader").hidden) {
    const playing = !audio.paused;
    const ready = await prepareAudio(state.surah, false);
    if (ready && playing) audio.play().catch(() => setPlaying(false));
  }
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
    $("download-sub").textContent = `ينزّل ${surah.name} · ${ar(Math.round((done / total) * 100))}٪`;
    const key = keyOf(state.reciter, number);
    if (!state.saved.has(key)) {
      try {
        await downloadOne(number, true, abort.signal);
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
  updateReciterCard();
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
  updateReciterCard();
  downloadHint();
  toast("انحذفت تلاوات هذا القارئ من الجهاز.");
}

function showFatiha() {
  const next = $("fatiha-next");
  next.textContent = state.surah >= 114 ? "العودة للفهرس" : "السورة التالية";
  $("fatiha").hidden = false;
  $("fatiha-amen").focus();
}

function fillFatiha() {
  $("fatiha-verses").innerHTML = state.quran[0].ayahs
    .map((text) => `<p>${esc(text)}</p>`)
    .join("");
  $("home-bismillah").textContent = state.quran[0].ayahs[0];
}

function bind() {
  $("toggle-mode").addEventListener("click", () => {
    state.night = !state.night;
    applyMode();
  });

  $("open-reciter").addEventListener("click", openReciterSheet);
  $("reciter-close").addEventListener("click", () => { $("reciter-sheet").hidden = true; });
  $("reciter-sheet").addEventListener("click", (event) => {
    if (event.target === $("reciter-sheet")) $("reciter-sheet").hidden = true;
  });
  $("reciter-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-reciter]");
    if (button) chooseReciter(button.dataset.reciter);
  });

  $("query").addEventListener("input", renderList);

  $("list").addEventListener("click", async (event) => {
    const save = event.target.closest("[data-save]");
    if (save) {
      const number = Number(save.dataset.save);
      if (state.saved.has(keyOf(state.reciter, number))) return;
      save.disabled = true;
      save.textContent = "ينزّل";
      try {
        await downloadOne(number);
        renderList();
      } catch {
        toast("ما نزل الملف. افتح المصحف من «ابدأ المصحف» وتأكد من النت.");
        save.disabled = false;
        save.textContent = "تنزيل";
      }
      return;
    }
    const open = event.target.closest("[data-surah]");
    if (open) openSurah(Number(open.dataset.surah));
  });

  $("resume").addEventListener("click", () => {
    const progress = loadProgress();
    if (progress) {
      if (progress.reciter && RECITERS.some((item) => item.id === progress.reciter)) {
        state.reciter = progress.reciter;
        updateReciterCard();
      }
      openSurah(progress.surah, { resume: true });
      return;
    }
    openSurah(1);
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
      toast("ما نزل الملف. افتح المصحف من «ابدأ المصحف» وتأكد من النت.");
    }
    updateSaveButton();
    updateReciterCard();
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
  $("player-info").addEventListener("click", () => {
    if ($("reader").hidden) openSurah(state.surah);
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
  $("download").addEventListener("click", (event) => {
    if (event.target === $("download")) {
      if (state.downloadAbort) state.downloadAbort.abort();
      $("download").hidden = true;
    }
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
    if (event.code !== "Space" || event.target.matches("input, select, textarea, button")) return;
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
  applyMode();
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
  updateReciterCard();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

init();
