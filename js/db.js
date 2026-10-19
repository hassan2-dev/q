const MushafDb = (() => {
  const NAME = "mushaf-albait";
  const STORE = "audio";
  let dbPromise = null;

  function open() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          dbPromise = null;
          reject(req.error);
        };
      });
    }
    return dbPromise;
  }

  function run(mode, fn) {
    return open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, mode);
          const store = tx.objectStore(STORE);
          const result = fn(store);
          tx.oncomplete = () => resolve(result && result.result !== undefined ? result.result : result);
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error || new Error("aborted"));
        })
    );
  }

  function get(key) {
    return open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, "readonly");
          const req = tx.objectStore(STORE).get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        })
    );
  }

  function put(key, blob) {
    return open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, "readwrite");
          tx.objectStore(STORE).put(blob, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
          tx.onabort = () => reject(tx.error || new Error("aborted"));
        })
    );
  }

  function remove(key) {
    return open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, "readwrite");
          tx.objectStore(STORE).delete(key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        })
    );
  }

  function keys() {
    return open().then(
      (db) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, "readonly");
          const req = tx.objectStore(STORE).getAllKeys();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        })
    );
  }

  function has(key) {
    return get(key).then((value) => Boolean(value));
  }

  return { get, put, remove, keys, has };
})();
