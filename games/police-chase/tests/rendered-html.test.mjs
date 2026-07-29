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

test("server-renders the police chase game shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>夜巡追捕｜警察抓小偷<\/title>/i);
  assert.match(html, /夜巡追捕/);
  assert.match(html, /放下手铐钩/);
  assert.match(html, /玩法和淘金者一样/);
  assert.match(html, /aria-label="夜巡追捕游戏区域"/);
  assert.match(html, /追回赃物/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("exposes mission controls and social metadata", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /空格键/);
  assert.match(html, /<kbd>M<\/kbd> 音效/);
  assert.match(html, /og:image/);
  assert.match(html, /og\.png/);
  assert.match(html, /lang="zh-CN"/);
});
