const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const root = __dirname;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

function proxyAudio(req, res, reciter, number) {
  if (!/^[a-z0-9.]+$/i.test(reciter)) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("bad reciter");
    return;
  }
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1 || n > 114) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("bad surah");
    return;
  }

  const upstream = `https://cdn.islamic.network/quran/audio-surah/128/${reciter}/${n}.mp3`;

  const request = https.get(upstream, (up) => {
    if (up.statusCode >= 300 && up.statusCode < 400 && up.headers.location) {
      up.resume();
      https.get(up.headers.location, (redirected) => pipeAudio(redirected, res)).on("error", () => fail(res));
      return;
    }
    pipeAudio(up, res);
  });
  request.on("error", () => fail(res));
  req.on("close", () => request.destroy());
}

function pipeAudio(up, res) {
  if (up.statusCode !== 200) {
    up.resume();
    res.writeHead(up.statusCode || 502, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("upstream error");
    return;
  }
  const headers = {
    "Content-Type": up.headers["content-type"] || "audio/mpeg",
    "Cache-Control": "public, max-age=86400",
    "Access-Control-Allow-Origin": "*"
  };
  if (up.headers["content-length"]) headers["Content-Length"] = up.headers["content-length"];
  res.writeHead(200, headers);
  up.pipe(res);
}

function fail(res) {
  if (res.headersSent) {
    res.end();
    return;
  }
  res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("bad gateway");
}

function handler(req, res) {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  const audioMatch = urlPath.match(/^\/audio\/([^/]+)\/(\d+)\.mp3$/i);
  if (audioMatch) {
    proxyAudio(req, res, audioMatch[1], audioMatch[2]);
    return;
  }

  const file = path.normalize(path.join(root, urlPath));
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const headers = { "Content-Type": types[ext] || "application/octet-stream" };
    if (file.endsWith(`${path.sep}sw.js`) || file.endsWith(`${path.sep}index.html`)) {
      headers["Cache-Control"] = "no-cache";
    }
    res.writeHead(200, headers);
    res.end(data);
  });
}

function openBrowser(port) {
  const url = `http://127.0.0.1:${port}/`;
  exec(`cmd /c start "" "${url}"`);
  console.log("");
  console.log("  Mushaf al-Bayt");
  console.log("  " + url);
  console.log("");
  console.log("  Keep this window open while the family is reading.");
  console.log("  Close it when they are finished.");
  console.log("");
}

function listen(port) {
  const server = http.createServer(handler);
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && port < 8750) {
      listen(port + 1);
      return;
    }
    console.error(error);
    process.exit(1);
  });
  server.listen(port, "127.0.0.1", () => openBrowser(port));
}

listen(8731);
