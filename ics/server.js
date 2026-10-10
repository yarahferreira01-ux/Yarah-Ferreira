// Servidor Node.js sem dependências: entrega o player interativo em "/"
// e a composição HyperFrames (index.html + assets) para o iframe do player.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)));
const PORT = Number(process.env.PORT) || 3000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
};

const ROUTES = {
  "/": "player/index.html",
  "/composicao": "index.html",
};

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const rel = ROUTES[url.pathname] ?? decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const file = normalize(join(ROOT, rel));

  if (!file.startsWith(ROOT) || /(^|[\\/])(\.|node_modules)/.test(rel)) {
    res.writeHead(403).end();
    return;
  }

  try {
    if (!(await stat(file)).isFile()) throw new Error("not a file");
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": TYPES[extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(PORT, () => {
  console.log(`\n  ICS Soluções Comerciais — motion design interativo`);
  console.log(`  ➜  http://localhost:${PORT}\n`);
});
