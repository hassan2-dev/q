/** Offline audio via Cache API (works without CORS). Same key format: "reciter:number" */
const MushafDb = (() => {
  const AUDIO_CACHE = "mushaf-audio-v1";
  const IDB_NAME = "mushaf-albait";
  const IDB_STORE = "audio";

  function streamUrl(reciter, number) {
    return `https://cdn.islamic.network/quran/audio-surah/128/${encodeURIComponent(reciter)}/${number}.mp3`;
  }

  function parts(key) {
    const i = String(key).lastIndexOf(":");
    if (i < 0) return null;
    return { reciter: key.slice(0, i), number: Number(key.slice(i + 1)) };
  }

  function urlOf(key) {
    const p = parts(key);
    if (!p || !p.number) return null;
    return streamUrl(p.reciter, p.number);
  }

  function openCache() {
    if (!("caches" in globalThis)) return Promise.reject(new Error("no caches"));
    return caches.open(AUDIO_CACHE);
  }

  function openIdb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function cacheHas(key) {
    const url = urlOf(key);
    if (!url) return false;
    try {
      const cache = await openCache();
      const hit = await cache.match(url);
      return Boolean(hit);
    } catch {
      return false;
    }
  }

  async function idbGet(key) {
    try {
      const db = await openIdb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readonly");
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  async function get(key) {
    const blob = await idbGet(key);
    if (blob && blob.size > 2000) return blob;
    return null;
  }

  async function has(key) {
    if (await cacheHas(key)) return true;
    const blob = await idbGet(key);
    return Boolean(blob && blob.size > 2000);
  }

  /** Download and store for offline. Uses no-cors cache (no CORS needed). */
  async function download(key, signal) {
    const url = urlOf(key);
    if (!url) throw new Error("bad key");
    if (await cacheHas(key)) return true;

    const cache = await openCache();
    const response = await fetch(url, { mode: "no-cors", signal, credentials: "omit" });
    // opaque responses have type "opaque" and status 0 — still cacheable
    await cache.put(url, response);

    // Best-effort: also try readable blob via same-origin proxy for IDB (optional)
    try {
      if (location.protocol.startsWith("http") && location.hostname === "127.0.0.1") {
        const p = parts(key);
        const proxy = `${location.origin}/audio/${encodeURIComponent(p.reciter)}/${p.number}.mp3`;
        const readable = await fetch(proxy, { signal });
        if (readable.ok) {
          const blob = await readable.blob();
          if (blob.size > 2000) {
            const db = await openIdb();
            await new Promise((resolve, reject) => {
              const tx = db.transaction(IDB_STORE, "readwrite");
              tx.objectStore(IDB_STORE).put(blob, key);
              tx.oncomplete = () => resolve();
              tx.onerror = () => reject(tx.error);
            });
          }
        }
      }
    } catch {
      /* cache entry is enough for offline play via service worker */
    }
    return true;
  }

  async function put(key, blob) {
    if (blob && blob.size > 2000) {
      const db = await openIdb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(blob, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
    const url = urlOf(key);
    if (!url || !blob) return;
    const cache = await openCache();
    await cache.put(url, new Response(blob, { headers: { "Content-Type": "audio/mpeg" } }));
  }

  async function remove(key) {
    const url = urlOf(key);
    try {
      if (url) {
        const cache = await openCache();
        await cache.delete(url);
      }
    } catch {
      /* ignore */
    }
    try {
      const db = await openIdb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      /* ignore */
    }
  }

  async function keys() {
    const found = new Set();
    try {
      const cache = await openCache();
      const reqs = await cache.keys();
      for (const req of reqs) {
        const m = req.url.match(/\/([^/]+)\/(\d+)\.mp3(?:\?|$)/i);
        if (m) found.add(`${decodeURIComponent(m[1])}:${Number(m[2])}`);
      }
    } catch {
      /* ignore */
    }
    try {
      const db = await openIdb();
      const idbKeys = await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, "readonly");
        const req = tx.objectStore(IDB_STORE).getAllKeys();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
      for (const key of idbKeys) found.add(String(key));
    } catch {
      /* ignore */
    }
    return [...found];
  }

  return { get, put, remove, keys, has, download, streamUrl, AUDIO_CACHE };
})();
