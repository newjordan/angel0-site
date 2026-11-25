import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

function linear(channel) {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const rgb = Number.parseInt(hex.slice(1), 16);
  const red = linear((rgb >> 16) & 255);
  const green = linear((rgb >> 8) & 255);
  const blue = linear(rgb & 255);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function variable(name) {
  const match = html.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(match, `missing --${name}`);
  return match[1].toLowerCase();
}

test("html-validate reports no errors", () => {
  const result = execFileSync("node_modules/.bin/html-validate", ["index.html"], {
    encoding: "utf8",
  });
  assert.equal(result.trim(), "");
});

test("document landmarks, skip link, and a single h1", () => {
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<main id="content">/);
  assert.match(html, /<nav aria-label="Primary">/);
  assert.match(html, /<footer>/);
  assert.match(html, /<a class="skip" href="#content">Skip to content<\/a>/);
  assert.equal([...html.matchAll(/<h1[\s>]/g)].length, 1);
  assert.match(html, /<caption>/);
  assert.match(html, /scope="col"/);
  assert.match(html, /scope="row"/);
});

test("in-page links point at real ids and ids are unique", () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, `duplicate id: ${ids}`);
  const known = new Set(ids);
  for (const match of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(known.has(match[1]), `missing target for #${match[1]}`);
  }
});

test("keyboard, motion, and narrow-layout safeguards are present", () => {
  assert.match(html, /:focus-visible/);
  assert.match(html, /prefers-reduced-motion:\s*reduce/);
  assert.match(html, /forced-colors:\s*active/);
  assert.match(html, /<pre class="code"/);
  assert.doesNotMatch(html, /\.nav-links\s*\{[^}]*display\s*:\s*none/);
  assert.doesNotMatch(html, /nth-child\(3\)[\s\S]{0,80}display\s*:\s*none/);
});

test("run instructions match the launcher and task-runner contract", () => {
  assert.match(html, /ANGEL_VIDEO=0 bin\/angel0\n/);
  assert.match(html, /ANGEL_PRACTICE=1 bin\/angel0 --task-json/);
  assert.match(html, /--driver practice/);
  assert.match(html, /--workspace "\$smoke_workspace"/);
  assert.doesNotMatch(html, /--workspace "\$PWD"/);
  assert.doesNotMatch(html, /438k|440k|388/);
  assert.doesNotMatch(html, /github\.com\/newjordan\/angel0(?!-site)/);
});

test("text colors in the palette clear WCAG AA contrast", () => {
  const pairs = [
    ["text", "bg"],
    ["muted", "bg"],
    ["dim", "bg"],
    ["dim", "term"],
    ["gold", "bg"],
    ["green", "term"],
    ["red", "term"],
    ["cyan", "term"],
    ["violet", "bg"],
  ];
  for (const [foreground, background] of pairs) {
    const ratio = contrast(variable(foreground), variable(background));
    assert.ok(ratio >= 4.5, `${foreground} on ${background} is ${ratio.toFixed(2)}`);
  }
  const goldOnBlack = contrast(variable("gold"), "#000000");
  assert.ok(goldOnBlack >= 4.5, `gold button text is ${goldOnBlack.toFixed(2)}`);
});

test("public links respond", async () => {
  const urls = new Set([
    ...[...html.matchAll(/href="(https:\/\/[^"]+)"/g)].map((match) => match[1]),
    ...[...html.matchAll(/content="(https:\/\/[^"]+)"/g)].map((match) => match[1]),
  ]);
  assert.ok(urls.size >= 2, `expected canonical and repository links, got ${[...urls].join(", ")}`);
  for (const url of urls) {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "angel0-site-link-check" },
    });
    assert.ok(response.status >= 200 && response.status < 400, `${url} returned ${response.status}`);
    await response.body?.cancel();
  }
});

test("build copies the page into dist", () => {
  execFileSync(process.execPath, ["scripts/build.mjs"], { encoding: "utf8" });
  const built = readFileSync(new URL("../dist/index.html", import.meta.url), "utf8");
  const marker = readFileSync(new URL("../dist/.nojekyll", import.meta.url), "utf8");
  assert.equal(built, html);
  assert.equal(marker, "");
});

test("static server serves the page and rejects missing paths", async () => {
  const child = spawn(process.execPath, ["scripts/serve.mjs"], {
    env: { ...process.env, PORT: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("server did not print a port")), 5000);
      let buffer = "";
      child.stdout.on("data", (chunk) => {
        buffer += chunk.toString();
        const match = buffer.match(/127\.0\.0\.1:(\d+)/);
        if (match) {
          clearTimeout(timer);
          resolve(match[1]);
        }
      });
      child.once("exit", (code) => {
        clearTimeout(timer);
        reject(new Error(`server exited ${code} before listening`));
      });
    });
    const page = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get("content-type") ?? "", /text\/html/);
    assert.match(await page.text(), /<main id="content">/);
    const missing = await fetch(`http://127.0.0.1:${port}/missing-page`);
    assert.equal(missing.status, 404);
    await missing.body?.cancel();
  } finally {
    child.kill("SIGTERM");
  }
});
