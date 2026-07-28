import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the gold miner game", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>黄金矿工｜Deep Cave Co\.<\/title>/i);
  assert.match(html, /<main class="game-shell">/);
  assert.match(html, /<canvas[^>]*width="1280"[^>]*height="720"/);
  assert.match(html, /黄金矿工/);
  assert.match(html, /开始淘金/);
  assert.match(html, /本关目标/);
});

test("contains game-specific project metadata without starter artifacts", async () => {
  const [packageJson, readme] = await Promise.all([
    readFile(new URL("package.json", projectRoot), "utf8"),
    readFile(new URL("README.md", projectRoot), "utf8"),
  ]);

  assert.match(packageJson, /"name": "gold-miner-game"/);
  assert.match(readme, /^# 黄金矿工/m);
  assert.doesNotMatch(packageJson, /site-creator-vinext-starter/);
  await assert.rejects(access(new URL("app/_sites-preview", projectRoot)));
});
