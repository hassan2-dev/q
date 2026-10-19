import { Platform } from "react-native";
import { Directory, File, Paths } from "expo-file-system";
import { surahAudioUrl } from "./reciters";

const MIN_BYTES = 8000;

export function canSaveAudio() {
  return Platform.OS === "ios" || Platform.OS === "android";
}

function reciterDir(reciterId) {
  const dir = new Directory(Paths.document, "audio", reciterId);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export function savedUri(reciterId, surahNumber) {
  if (!canSaveAudio()) return null;
  try {
    const file = new File(reciterDir(reciterId), `${surahNumber}.mp3`);
    if (file.exists && file.size > MIN_BYTES) return file.uri;
  } catch (error) {
    return null;
  }
  return null;
}

export function listSaved(reciterId) {
  if (!canSaveAudio()) return [];
  try {
    const dir = new Directory(Paths.document, "audio", reciterId);
    if (!dir.exists) return [];
    return dir
      .list()
      .filter((entry) => entry.size > MIN_BYTES)
      .map((entry) => parseInt(entry.name, 10))
      .filter((number) => number >= 1 && number <= 114);
  } catch (error) {
    return [];
  }
}

export async function downloadSurahFile(reciterId, surahNumber, onProgress, onTask) {
  const dest = new File(reciterDir(reciterId), `${surahNumber}.mp3`);
  if (dest.exists && dest.size > MIN_BYTES) return dest.uri;
  if (dest.exists) dest.delete();
  const task = File.createDownloadTask(surahAudioUrl(reciterId, surahNumber), dest, {
    sessionType: "foreground",
    onProgress(data) {
      if (!onProgress || data.totalBytes <= 0) return;
      onProgress(Math.min(1, data.bytesWritten / data.totalBytes));
    },
  });
  if (onTask) onTask(task);
  try {
    const file = await task.downloadAsync();
    if (!file || !file.exists || file.size < MIN_BYTES) {
      try {
        dest.delete();
      } catch (error) {
        /* partial file already gone */
      }
      const cancelled = new Error("cancelled");
      cancelled.cancelled = true;
      throw cancelled;
    }
    return file.uri;
  } catch (error) {
    try {
      if (dest.exists) dest.delete();
    } catch (cleanupError) {
      /* partial file already gone */
    }
    if (error?.name === "AbortError") error.cancelled = true;
    throw error;
  } finally {
    try {
      task.release();
    } catch (error) {
      /* task already released */
    }
  }
}

export function deleteSurahFile(reciterId, surahNumber) {
  if (!canSaveAudio()) return;
  try {
    const file = new File(reciterDir(reciterId), `${surahNumber}.mp3`);
    if (file.exists) file.delete();
  } catch (error) {
    /* already absent */
  }
}
