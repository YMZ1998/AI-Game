import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
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

test("server-renders all six game tickets", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /PLAYROOM/);
  assert.match(html, /黄金矿工/);
  assert.match(html, /斗地主/);
  assert.match(html, /泡泡堂/);
  assert.match(html, /夜巡追捕/);
  assert.match(html, /临界行动/);
  assert.match(html, /AI 俄罗斯方块/);
  assert.match(html, /6 款游戏在线/);
  assert.match(html, /href="\/play\/police-chase\/index\.html"/);
});

test("includes accessible game links and metadata", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /<title>PLAYROOM｜游戏大厅<\/title>/);
  assert.match(html, /aria-label="开始玩夜巡追捕"/);
  assert.match(html, /alt="夜巡追捕游戏封面"/);
  assert.match(html, /aria-label="开始玩临界行动"/);
  assert.match(html, /aria-label="开始玩AI 俄罗斯方块"/);
  assert.match(html, /href="\/play\/tetris-game\/index\.html"/);
  assert.doesNotMatch(html, /localhost:300(?:0|1|2|5|6)/);
});

test("generates a static same-origin game shell", async () => {
  const shellUrl = new URL(
    "../public/play/tetris-game/index.html",
    import.meta.url,
  );
  const html = await readFile(shellUrl, "utf8");

  assert.match(html, /返回大厅/);
  assert.match(html, /重新载入/);
  assert.match(html, /全屏游玩/);
  assert.match(html, /src="\/embedded\/tetris-game\/index\.html"/);
  assert.doesNotMatch(html, /localhost:\d+/);
});

test("ships every game as a same-origin embedded build", async () => {
  const slugs = [
    "gold-miner",
    "doudizhu",
    "bubble-battle",
    "police-chase",
    "critical-operation",
    "tetris-game",
  ];

  for (const slug of slugs) {
    const indexUrl = new URL(
      `../public/embedded/${slug}/index.html`,
      import.meta.url,
    );
    const html = await readFile(indexUrl, "utf8");

    assert.match(html, new RegExp(`/embedded/${slug}/assets/`));
    assert.doesNotMatch(html, /localhost:\d+/);
    assert.doesNotMatch(html, new RegExp(`/embedded/${slug}/embedded/`));
  }
});
