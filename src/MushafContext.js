import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { createAudioPlayer, requestNotificationPermissionsAsync, setAudioModeAsync } from "expo-audio";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as Network from "expo-network";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createNavigationContainerRef } from "@react-navigation/native";
import { HOUSE_VOICE_ID, RECITERS, reciterById, surahAudioUrl } from "./reciters";
import { getSurah } from "./quran";
import { canSaveAudio, deleteSurahFile, downloadSurahFile, listSaved, savedUri } from "./files";
import { LAYOUTS, SCALES } from "./theme";

const STORAGE_KEY = "mushaf-albait-settings";
const AWAKE = "mushaf";

export const navigationRef = createNavigationContainerRef();

const MushafContext = createContext(null);

function releasePlayer(entry) {
  if (!entry) return;
  try {
    entry.sub?.remove();
  } catch (error) {
    /* listener already gone */
  }
  try {
    entry.player?.remove();
  } catch (error) {
    /* player already released */
  }
}

export function MushafProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [reciter, setReciterState] = useState(RECITERS[0]);
  const [reciterOpen, setReciterOpen] = useState(false);
  const [night, setNight] = useState(false);
  const [scaleIndex, setScaleIndex] = useState(2);
  const [layout, setLayout] = useState("split");
  const [lastSurah, setLastSurah] = useState(null);
  const [readingSurah, setReadingSurah] = useState(null);
  const [saved, setSaved] = useState([]);
  const [downloading, setDownloading] = useState(null);
  const [batch, setBatch] = useState(null);
  const [percent, setPercent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [audio, setAudio] = useState(null);
  const [status, setStatus] = useState({
    playing: false,
    currentTime: 0,
    duration: 0,
    isBuffering: false,
    isLoaded: false,
  });
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [notice, setNotice] = useState("");
  const [fatiha, setFatiha] = useState({ visible: false, phase: "reading", fromSurah: 1 });

  const reciterRef = useRef(reciter);
  const audioRef = useRef(null);
  const playerEntry = useRef(null);
  const keepAudio = useRef(false);
  const [visibleRoute, setVisibleRoute] = useState({ name: "Home", n: null });
  const ignoreFinish = useRef(false);
  const finishLock = useRef(false);
  const onFinishRef = useRef(() => {});
  const batchCancel = useRef(false);
  const batchLock = useRef(false);
  const pendingRestart = useRef(null);
  const activeTask = useRef(null);
  const downloadSetRef = useRef(null);
  const autoSaveStarted = useRef(false);
  const hydrated = useRef(false);
  const askedNotifications = useRef(false);

  useEffect(() => {
    reciterRef.current = reciter;
  }, [reciter]);

  const refreshSaved = useCallback((reciterId) => {
    setSaved(listSaved(reciterId || reciterRef.current.id));
  }, []);

  const refreshNet = useCallback(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setOffline(state.isConnected === false || state.isInternetReachable === false);
    } catch (error) {
      setOffline(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: "doNotMix",
        });
      } catch (error) {
        /* audio mode is best-effort */
      }
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && alive) {
          const parsed = JSON.parse(stored);
          if (parsed.reciterId) setReciterState(reciterById(parsed.reciterId));
          if (Number.isInteger(parsed.scaleIndex)) setScaleIndex(Math.min(SCALES.length - 1, Math.max(0, parsed.scaleIndex)));
          if (typeof parsed.night === "boolean") setNight(parsed.night);
          if (LAYOUTS.some((item) => item.id === parsed.layout)) setLayout(parsed.layout);
          if (parsed.lastSurah) setLastSurah(parsed.lastSurah);
        }
      } catch (error) {
        /* start from defaults */
      }
      if (alive) {
        hydrated.current = true;
        setReady(true);
      }
    })();
    refreshNet();
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") refreshNet();
    });
    return () => {
      alive = false;
      sub.remove();
      releasePlayer(playerEntry.current);
      deactivateKeepAwake(AWAKE).catch(() => {});
    };
  }, [refreshNet]);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        reciterId: reciter.id,
        scaleIndex,
        night,
        layout,
        lastSurah,
      })
    ).catch(() => {});
  }, [reciter, scaleIndex, night, layout, lastSurah]);

  useEffect(() => {
    if (ready) refreshSaved(reciter.id);
  }, [ready, reciter, refreshSaved]);

  const onStatus = useCallback((next) => {
    setStatus({
      playing: Boolean(next.playing),
      currentTime: next.currentTime || 0,
      duration: next.duration || 0,
      isBuffering: Boolean(next.isBuffering),
      isLoaded: Boolean(next.isLoaded),
    });
    if (next.playing) {
      ignoreFinish.current = false;
      finishLock.current = false;
      setLoadingAudio(false);
    }
    if (!ignoreFinish.current && next.didJustFinish && !finishLock.current) {
      finishLock.current = true;
      setTimeout(() => onFinishRef.current(), 0);
    }
  }, []);

  const pause = useCallback(() => {
    playerEntry.current?.player?.pause();
    setLoadingAudio(false);
    deactivateKeepAwake(AWAKE).catch(() => {});
  }, []);

  const prepareBackground = useCallback(async () => {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    });
    if (Platform.OS !== "android" || askedNotifications.current) return;
    askedNotifications.current = true;
    const permission = await requestNotificationPermissionsAsync();
    if (!permission.granted) {
      setNotice("اسمح بإشعارات Expo Go من إعدادات الجوال، وإلا التلاوة توقف لما تقفل الشاشة.");
    }
  }, []);

  const showOnLockScreen = (player, surahNumber, kind, voice) => {
    player.setActiveForLockScreen(true, {
      title: kind === "fatiha" ? "سورة الفاتحة" : getSurah(surahNumber).name,
      artist: kind === "fatiha" ? "ميعاد كاظم وعدنان لطيف" : voice.name,
      albumTitle: "مصحف البيت",
    });
  };

  const start = useCallback(
    (surahNumber, kind) => {
      const voice = reciterRef.current;
      const local = savedUri(voice.id, surahNumber);
      if (!local && offline) {
        setNotice("هذه التلاوة غير محفوظة على الجهاز، وتحتاج اتصالاً بالإنترنت.");
        setLoadingAudio(false);
        return false;
      }
      const uri = local || surahAudioUrl(voice.id, surahNumber);
      const nextAudio = { surah: surahNumber, kind, reciterId: voice.id, local: Boolean(local) };
      audioRef.current = nextAudio;
      setAudio(nextAudio);
      setNotice("");
      setLoadingAudio(true);
      ignoreFinish.current = true;
      finishLock.current = false;

      const player = createAudioPlayer({ uri }, { updateInterval: 400 });
      player.loop = false;
      const sub = player.addListener("playbackStatusUpdate", (next) => {
        if (playerEntry.current?.player !== player) return;
        onStatus(next);
      });
      const previous = playerEntry.current;
      playerEntry.current = { player, sub };
      releasePlayer(previous);

      prepareBackground()
        .catch(() => {})
        .finally(() => {
          if (playerEntry.current?.player !== player) return;
          player.play();
          try {
            showOnLockScreen(player, surahNumber, kind, voice);
          } catch (error) {
            /* lock screen controls attach after playback starts */
          }
        });
      activateKeepAwakeAsync(AWAKE).catch(() => {});
      setTimeout(() => {
        if (playerEntry.current?.player === player && !player.playing && !player.isLoaded) {
          setLoadingAudio(false);
          setNotice(local ? "تعذّر تشغيل السورة المحفوظة." : "تعذّر التشغيل. تحقق من الإنترنت أو نزّل السورة.");
        }
      }, 15000);
      return true;
    },
    [offline, onStatus, prepareBackground]
  );

  const openFatiha = useCallback((fromSurah, autoplay) => {
    const started = autoplay ? start(1, "fatiha") : false;
    setFatiha({ visible: true, phase: started ? "listening" : "reading", fromSurah });
  }, [start]);

  useEffect(() => {
    onFinishRef.current = () => {
      const current = audioRef.current;
      deactivateKeepAwake(AWAKE).catch(() => {});
      if (!current) return;
      if (current.kind === "surah") {
        openFatiha(current.surah, current.surah !== 1);
      } else if (current.kind === "fatiha") {
        setFatiha((prev) => (prev.visible ? { ...prev, phase: "accepted" } : prev));
      }
    };
  }, [openFatiha]);

  const playSurah = useCallback(
    (surahNumber) => {
      setReadingSurah(surahNumber);
      setLastSurah(surahNumber);
      start(surahNumber, "surah");
      if (navigationRef.isReady()) navigationRef.navigate("Reader", { n: surahNumber });
    },
    [start]
  );

  const resume = useCallback((player) => {
    ignoreFinish.current = false;
    player.play();
    activateKeepAwakeAsync(AWAKE).catch(() => {});
  }, []);

  const togglePlay = useCallback(() => {
    const player = playerEntry.current?.player;
    const current = audioRef.current;
    const target = readingSurah || lastSurah || 1;
    if (player?.playing) {
      pause();
      return;
    }
    const nearEnd = status.duration > 0 && status.currentTime >= status.duration - 0.6;
    if (current?.kind === "fatiha" && player && !nearEnd) {
      resume(player);
      return;
    }
    if (current?.kind === "fatiha" && nearEnd) {
      start(1, "fatiha");
      return;
    }
    if (current && current.kind === "surah" && current.surah === target && player && !nearEnd) {
      resume(player);
      return;
    }
    playSurah(target);
  }, [pause, playSurah, readingSurah, lastSurah, resume, start, status.currentTime, status.duration]);

  const seek = useCallback((ratio) => {
    const player = playerEntry.current?.player;
    const duration = player?.duration || status.duration;
    if (!player || !duration) return;
    ignoreFinish.current = true;
    player.seekTo(Math.min(duration, Math.max(0, ratio * duration))).finally(() => {
      setTimeout(() => {
        ignoreFinish.current = false;
      }, 500);
    });
  }, [status.duration]);

  const goSurah = useCallback(
    (surahNumber) => {
      if (surahNumber < 1 || surahNumber > 114) return;
      const playing = Boolean(playerEntry.current?.player?.playing);
      setReadingSurah(surahNumber);
      setLastSurah(surahNumber);
      if (navigationRef.isReady()) navigationRef.navigate("Reader", { n: surahNumber });
      if (playing) start(surahNumber, "surah");
      else pause();
    },
    [pause, start]
  );

  const openReading = useCallback((surahNumber) => {
    setReadingSurah(surahNumber);
    setLastSurah(surahNumber);
    if (keepAudio.current) {
      keepAudio.current = false;
      return;
    }
    const current = audioRef.current;
    const player = playerEntry.current?.player;
    if (current && player?.playing && !(current.kind === "surah" && current.surah === surahNumber)) {
      pause();
    }
  }, [pause]);

  const returnToSurah = useCallback((surahNumber) => {
    if (surahNumber < 1 || surahNumber > 114) return;
    keepAudio.current = true;
    setReadingSurah(surahNumber);
    setLastSurah(surahNumber);
    if (navigationRef.isReady()) navigationRef.navigate("Reader", { n: surahNumber });
    setTimeout(() => {
      keepAudio.current = false;
    }, 800);
  }, []);

  const noteRoute = useCallback((route) => {
    setVisibleRoute({ name: route?.name || "Home", n: route?.params?.n ?? null });
  }, []);

  const showSurah = useCallback((surahNumber) => {
    if (surahNumber < 1 || surahNumber > 114) return;
    pause();
    setReadingSurah(surahNumber);
    setLastSurah(surahNumber);
    setFatiha((prev) => ({ ...prev, visible: false }));
    if (navigationRef.isReady()) navigationRef.navigate("Reader", { n: surahNumber });
  }, [pause]);

  const closeFatiha = useCallback(() => {
    setFatiha((prev) => ({ ...prev, visible: false }));
    if (audioRef.current?.kind === "fatiha") pause();
  }, [pause]);

  const listenFatiha = useCallback(() => {
    const started = start(1, "fatiha");
    if (started) setFatiha((prev) => ({ ...prev, visible: true, phase: "listening" }));
  }, [start]);

  const sealSurah = useCallback(() => {
    const surahNumber = readingSurah || lastSurah || 1;
    pause();
    setFatiha({ visible: true, phase: "reading", fromSurah: surahNumber });
  }, [lastSurah, pause, readingSurah]);

  const chooseReciter = useCallback((next) => {
    setReciterState(next);
    setReciterOpen(false);
    if (playerEntry.current?.player?.playing && audioRef.current?.kind === "surah") {
      reciterRef.current = next;
      start(audioRef.current.surah, "surah");
    }
  }, [start]);

  const downloadOne = useCallback(
    async (surahNumber, voiceId) => {
      await downloadSurahFile(voiceId, surahNumber);
      if (surahNumber !== 1) {
        try {
          await downloadSurahFile(voiceId, 1);
        } catch (error) {
          /* fatiha can be fetched later */
        }
      }
    },
    []
  );

  const downloadSurah = useCallback(async (surahNumber) => {
    if (!canSaveAudio()) {
      setNotice("حفظ السور يعمل على جوال الأب والأم داخل التطبيق.");
      return;
    }
    if (offline && !savedUri(reciter.id, surahNumber)) {
      setNotice("لا يوجد إنترنت لتنزيل السورة.");
      return;
    }
    setDownloading(surahNumber);
    setNotice("");
    try {
      await downloadOne(surahNumber, reciter.id);
      refreshSaved(reciter.id);
    } catch (error) {
      setNotice("تعذّر تنزيل السورة. أعد المحاولة عند تحسّن الاتصال.");
    } finally {
      setDownloading(null);
    }
  }, [downloadOne, offline, reciter.id, refreshSaved]);

  const removeDownload = useCallback((surahNumber) => {
    if (audioRef.current?.surah === surahNumber && audioRef.current?.reciterId === reciter.id) pause();
    deleteSurahFile(reciter.id, surahNumber);
    refreshSaved(reciter.id);
  }, [pause, reciter.id, refreshSaved]);

  const downloadSet = useCallback(async (numbers, label) => {
    if (!canSaveAudio()) {
      setNotice("حفظ الصوت يعمل على جوال الأب والأم داخل التطبيق.");
      return;
    }
    if (offline) {
      setNotice("التنزيل يحتاج اتصالًا بالإنترنت. بعد اكتماله تُسمع السور بلا نت.");
      return;
    }
    if (batchLock.current) {
      if (batchCancel.current === true) pendingRestart.current = { numbers, label };
      return;
    }
    batchLock.current = true;
    batchCancel.current = false;
    pendingRestart.current = null;
    setPaused(false);
    const voiceId = reciter.id;
    let done = numbers.filter((surahNumber) => savedUri(voiceId, surahNumber)).length;
    setPercent(Math.round((done / numbers.length) * 100));
    setBatch({ done, total: numbers.length, label });
    let stopped = false;
    for (let index = 0; index < numbers.length; index += 1) {
      if (batchCancel.current === true) {
        stopped = true;
        break;
      }
      const surahNumber = numbers[index];
      if (savedUri(voiceId, surahNumber)) continue;
      setDownloading(surahNumber);
      try {
        await downloadSurahFile(
          voiceId,
          surahNumber,
          (ratio) => {
            const value = Math.min(99, Math.round(((done + ratio) / numbers.length) * 100));
            setPercent(value);
          },
          (task) => {
            activeTask.current = task;
          }
        );
        activeTask.current = null;
      } catch (error) {
        activeTask.current = null;
        if (batchCancel.current === true || error?.cancelled || error?.name === "AbortError") {
          stopped = true;
          break;
        }
        setNotice("توقف التنزيل. اضغط استئناف ويكمل من السورة التي وقف عندها.");
        stopped = true;
        break;
      }
      done += 1;
      setPercent(Math.round((done / numbers.length) * 100));
      setBatch({ done, total: numbers.length, label });
      refreshSaved(voiceId);
    }
    const finished = done >= numbers.length && !stopped;
    setDownloading(null);
    setBatch(null);
    activeTask.current = null;
    batchCancel.current = false;
    batchLock.current = false;
    setPaused(!finished && done < numbers.length);
    if (finished) {
      setPercent(100);
      setNotice(label === "full" ? "اكتمل حفظ صوت المصحف لهذا القارئ. القراءة والسماع يعملان بلا نت." : "اكتمل حفظ صوت جزء عمّ.");
    }
    const next = pendingRestart.current;
    pendingRestart.current = null;
    if (next) downloadSetRef.current?.(next.numbers, next.label);
  }, [offline, reciter.id, refreshSaved]);

  downloadSetRef.current = downloadSet;

  const downloadJuzAmma = useCallback(() => {
    const numbers = [1, ...Array.from({ length: 37 }, (_, index) => index + 78)];
    return downloadSet(numbers, "amma");
  }, [downloadSet]);

  const downloadFull = useCallback(() => {
    const numbers = Array.from({ length: 114 }, (_, index) => index + 1);
    return downloadSet(numbers, "full");
  }, [downloadSet]);

  useEffect(() => {
    if (!ready || offline || autoSaveStarted.current) return;
    if (reciter.id !== HOUSE_VOICE_ID) return;
    if (listSaved(reciter.id).length >= 114) return;
    autoSaveStarted.current = true;
    downloadFull();
  }, [ready, offline, reciter.id, downloadFull]);

  const cancelBatch = useCallback(() => {
    pendingRestart.current = null;
    batchCancel.current = true;
    const task = activeTask.current;
    activeTask.current = null;
    try {
      task?.cancel();
    } catch (error) {
      /* already finished */
    }
    setDownloading(null);
    setBatch(null);
    setPaused(true);
  }, []);

  const bumpScale = useCallback((direction) => {
    setScaleIndex((value) => Math.min(SCALES.length - 1, Math.max(0, value + direction)));
  }, []);

  const value = useMemo(
    () => ({
      ready,
      offline,
      reciter,
      reciters: RECITERS,
      reciterOpen,
      setReciterOpen,
      chooseReciter,
      night,
      toggleNight: () => setNight((value) => !value),
      scaleIndex,
      bumpScale,
      layout,
      setLayout,
      lastSurah,
      readingSurah,
      visibleRoute,
      noteRoute,
      returnToSurah,
      saved: new Set(saved),
      downloading,
      percent,
      paused,
      batch,
      downloadSurah,
      removeDownload,
      downloadJuzAmma,
      downloadFull,
      cancelBatch,
      audio,
      status,
      loadingAudio,
      notice,
      clearNotice: () => setNotice(""),
      fatiha,
      playSurah,
      togglePlay,
      seek,
      goSurah,
      openReading,
      closeFatiha,
      showSurah,
      listenFatiha,
      sealSurah,
      pause,
    }),
    [
      ready,
      offline,
      reciter,
      reciterOpen,
      chooseReciter,
      night,
      scaleIndex,
      bumpScale,
      layout,
      lastSurah,
      readingSurah,
      visibleRoute,
      noteRoute,
      returnToSurah,
      saved,
      downloading,
      percent,
      paused,
      batch,
      downloadSurah,
      removeDownload,
      downloadJuzAmma,
      downloadFull,
      cancelBatch,
      audio,
      status,
      loadingAudio,
      notice,
      fatiha,
      playSurah,
      togglePlay,
      seek,
      goSurah,
      openReading,
      closeFatiha,
      showSurah,
      listenFatiha,
      sealSurah,
      pause,
    ]
  );

  return <MushafContext.Provider value={value}>{children}</MushafContext.Provider>;
}

export function useMushaf() {
  const value = useContext(MushafContext);
  if (!value) throw new Error("useMushaf outside provider");
  return value;
}
