// Servidor estático mínimo que imita GitHub Pages: sirve out/ bajo /duofinanzas/.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const ROOT = join(process.cwd(), "out");
const BASE = "/duofinanzas";
const PORT = Number(process.env.PORT || 4173);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".txt": "text/plain",
};

async function resolve(path) {
  const safe = normalize(decodeURIComponent(path)).replace(/^(\.\.[/\\])+/, "");
  const file = join(ROOT, safe);
  if (!file.startsWith(ROOT)) return null;
  try {
    const s = await stat(file);
    if (s.isDirectory()) return resolve(join(safe, "index.html"));
    return file;
  } catch {
    return null;
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (!url.pathname.startsWith(BASE)) {
    res.writeHead(302, { Location: `${BASE}/` }).end();
    return;
  }
  const file = await resolve(url.pathname.slice(BASE.length) || "/");
  const target = file ?? join(ROOT, "404.html");
  res.writeHead(file ? 200 : 404, { "Content-Type": TYPES[extname(target)] ?? "application/octet-stream" });
  res.end(await readFile(target));
}).listen(PORT, () => console.log(`E2E: http://localhost:${PORT}${BASE}/`));
