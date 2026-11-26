import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const basePath = "/advent-2026/";
const mediaTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".woff2", "font/woff2"],
  [".webp", "image/webp"],
]);

createServer(async (request, response) => {
  try {
    const { pathname } = new URL(request.url, "http://localhost");
    if (!pathname.startsWith(basePath)) throw new Error("Outside the test site");
    const file = resolve(root, decodeURIComponent(pathname.slice(basePath.length)) || "index.html");
    if (relative(root, file).startsWith(`..${sep}`) || relative(root, file) === "..") {
      throw new Error("Outside the test site");
    }
    const body = await readFile(file);
    response.writeHead(200, { "Content-Type": mediaTypes.get(extname(file)) ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
}).listen(4173, "127.0.0.1");
