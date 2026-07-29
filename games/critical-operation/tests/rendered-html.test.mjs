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

test("server-renders the tactical FPS shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>临界行动｜第一人称反恐射击<\/title>/);
  assert.match(html, /临界行动/);
  assert.match(html, /开始突入/);
  assert.match(html, /aria-label="临界行动第一人称游戏画面"/);
  assert.doesNotMatch(html, /Counter-Strike|codex-preview|react-loading-skeleton/i);
});

test("exposes keyboard, shooting and defuse controls", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /WASD/);
  assert.match(html, /左键射击/);
  assert.match(html, /长按 E 拆弹/);
  assert.match(html, /换弹/);
  assert.match(html, /lang="zh-CN"/);
});
