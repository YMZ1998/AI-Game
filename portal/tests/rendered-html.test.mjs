import assert from "node:assert/strict";
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
  assert.match(html, /night-patrol-police-chase\.ymz1998\.chatgpt\.site/);
});

test("includes accessible game links and metadata", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /<title>PLAYROOM｜游戏大厅<\/title>/);
  assert.match(html, /aria-label="开始玩夜巡追捕"/);
  assert.match(html, /alt="夜巡追捕游戏封面"/);
  assert.match(html, /aria-label="开始玩临界行动"/);
  assert.match(html, /aria-label="开始玩AI 俄罗斯方块"/);
  assert.match(html, /localhost:3006/);
  assert.match(html, /rel="noreferrer"/);
});
