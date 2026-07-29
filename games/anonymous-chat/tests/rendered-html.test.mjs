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

test("server-renders the anonymous midnight lounge", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>匿名夜话｜局域网匿名聊天室<\/title>/);
  assert.match(html, /匿名夜话/);
  assert.match(html, /公共频道/);
  assert.match(html, /创建私密房间/);
  assert.match(html, /消息仅保存在大厅主机内存/);
});

test("exposes accessible room entry and privacy states", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /aria-label="匿名聊天室入口"/);
  assert.match(html, /aria-label="四位房间码"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /无需账号/);
  assert.doesNotMatch(html, /localStorage/);
});
