import { copyFile, mkdir, writeFile } from "node:fs/promises";

await mkdir("dist", { recursive: true });
await copyFile("index.html", "dist/index.html");
await writeFile("dist/.nojekyll", "");
console.log("built dist/index.html");
