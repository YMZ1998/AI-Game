import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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

test("server-renders the complete card-room shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /<title>斗地主｜经典三人牌局<\/title>/);
  assert.match(html, /经典三人场/);
  assert.match(html, /底分 100/);
  assert.match(html, /新牌局/);
  assert.match(html, /你的手牌/);
  assert.doesNotMatch(html, /Building your site|Your site is taking shape/);
});

test("keeps the full round loop and accessibility states in source", async () => {
  const [page, css, design] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../DESIGN.md", import.meta.url), "utf8"),
  ]);

  assert.match(page, /function applyBid/);
  assert.match(page, /chooseAiBid/);
  assert.match(page, /spring/);
  assert.match(page, /roundDelta/);
  assert.match(page, /叫分阶段/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /aria-pressed=/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /button:focus-visible/);
  assert.match(css, /selection-status\.valid/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(design, /name: Jade Table/);
});

test("ships LAN rooms, score sheets, and a same-origin realtime client", async () => {
  const lanSource = await readFile(
    new URL("../app/LanGame.tsx", import.meta.url),
    "utf8",
  );
  const pageSource = await readFile(
    new URL("../app/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(pageSource, /局域网对战/);
  assert.match(lanSource, /\/doudizhu-ws/);
  assert.match(lanSource, /\/api\/doudizhu\/room/);
  assert.match(lanSource, /\/api\/doudizhu\/network/);
  assert.match(lanSource, /setInterval/);
  assert.match(lanSource, /创建新房间/);
  assert.match(lanSource, /加入房间/);
  assert.match(lanSource, /添加人机/);
  assert.match(lanSource, /remove_bot/);
  assert.match(lanSource, /player\.isBot/);
  assert.match(lanSource, /房间积分表/);
  assert.match(lanSource, /\/api\/doudizhu\/scores\.csv/);
  assert.match(lanSource, /location\.host/);
  assert.doesNotMatch(lanSource, /localhost:\d+/);
});
