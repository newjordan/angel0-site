import { createServer } from "node:http";
import { writeSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";

const root = resolve(process.cwd());
const port = Number(process.env.PORT ?? 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

function localPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const relative = decoded.replace(/^\/+/, "");
  const path = normalize(join(root, relative));
  if (path !== root && !path.startsWith(root + sep)) return null;
  return path;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    let pathname = url.pathname;
    if (pathname.endsWith("/")) pathname += "index.html";
    const path = localPath(pathname);
    if (!path) {
      response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      response.end("Forbidden");
      return;
    }
    const body = await readFile(path);
    const type = types[extname(path)] ?? "application/octet-stream";
    response.writeHead(200, { "content-type": type, "cache-control": "no-cache" });
    response.end(body);
  } catch (error) {
    const code = error && error.code;
    const missing = code === "ENOENT" || code === "EISDIR";
    response.writeHead(missing ? 404 : 500, { "content-type": "text/plain; charset=utf-8" });
    response.end(missing ? "Not found" : "Error");
  }
});

server.listen(port, "127.0.0.1", () => {
  const address = server.address();
  const actual = typeof address === "object" && address ? address.port : port;
  writeSync(1, `http://127.0.0.1:${actual}\n`);
});
