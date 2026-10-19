const http = require("http");
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

function handler(req, res) {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
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
