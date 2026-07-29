import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
  );
}

test("server-renders the AI Tetris laboratory shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>堆叠实验室｜AI 俄罗斯方块<\/title>/);
  assert.match(html, /堆叠实验室/);
  assert.match(html, /AI DECISION TRACE/);
  assert.match(html, /PLAYFIELD \/ 10 × 20/);
  assert.match(html, /LoveDaisy\/tetris_game/);
});

test("exposes manual, AI, touch and accessible game states", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /aria-label="俄罗斯方块棋盘"/);
  assert.match(html, /aria-label="触屏控制"/);
  assert.match(html, /aria-label="顺时针旋转"/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /方向键移动与旋转，空格直接落下/);
  assert.match(html, /两步前瞻/);
});
