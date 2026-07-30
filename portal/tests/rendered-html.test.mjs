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

test("server-renders all fifteen game cards", async () => {
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
  assert.match(html, /匿名夜话/);
  assert.match(html, /吃豆人/);
  assert.match(html, /四子棋/);
  assert.match(html, /2048/);
  assert.match(html, /小行星/);
  assert.match(html, /极速光轨/);
  assert.match(html, /六角拼图/);
  assert.match(html, /地牢枪手/);
  assert.match(html, /装甲峡谷/);
  assert.match(html, /15(?:<!-- -->)? 款游戏在线/);
  assert.match(html, /href="\/play\/police-chase\/index\.html"/);
  assert.match(html, /href="\/play\/anonymous-chat\/index\.html"/);
  assert.match(html, /href="\/play\/armor-alley\/index\.html"/);
  assert.match(html, /placeholder="搜索游戏、玩法或标签"/);
  assert.match(html, /aria-label="按类型筛选游戏"/);
  assert.match(html, /class="game-card gold-game"/);
});

test("includes accessible game links and metadata", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /<title>PLAYROOM｜游戏大厅<\/title>/);
  assert.match(html, /aria-label="开始玩夜巡追捕"/);
  assert.match(html, /alt="夜巡追捕游戏封面"/);
  assert.match(html, /aria-label="开始玩临界行动"/);
  assert.match(html, /aria-label="开始玩AI 俄罗斯方块"/);
  assert.match(html, /aria-label="开始玩匿名夜话"/);
  assert.match(html, /href="\/play\/tetris-game\/index\.html"/);
  assert.match(html, /href="\/play\/anonymous-chat\/index\.html"/);
  assert.match(html, /href="\/play\/tosios\/index\.html"/);
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
    "anonymous-chat",
    "pacman",
    "connect-four",
    "2048",
    "asteroids",
    "hexgl",
    "hextris",
    "tosios",
    "armor-alley",
  ];

  for (const slug of slugs) {
    const indexUrl = new URL(
      `../public/embedded/${slug}/index.html`,
      import.meta.url,
    );
    const html = await readFile(indexUrl, "utf8");

    assert.match(html, new RegExp(`playroom-embedded[^>]+${slug}`));
    assert.doesNotMatch(
      html,
      /(?:src|href)=["']https?:\/\/localhost:\d+/,
    );
    assert.doesNotMatch(html, new RegExp(`/embedded/${slug}/embedded/`));
    assert.doesNotMatch(html, new RegExp(`\\./embedded/${slug}/`));
  }
});

test("provides a local TOSIOS room process behind the portal proxy", async () => {
  const serverSource = await readFile(
    new URL("../lan/tosios-server.ts", import.meta.url),
    "utf8",
  );
  const viteSource = await readFile(
    new URL("../vite.config.ts", import.meta.url),
    "utf8",
  );

  assert.match(serverSource, /tosios-server\.cjs/);
  assert.match(serverSource, /TOSIOS_INTERNAL_PORT/);
  assert.match(viteSource, /tosiosLanServer/);
  assert.match(viteSource, /"\/tosios"/);
  assert.match(viteSource, /ws: true/);
});

test("provides an in-memory anonymous LAN chat server", async () => {
  const serverSource = await readFile(
    new URL("../lan/anonymous-chat-server.ts", import.meta.url),
    "utf8",
  );

  assert.match(serverSource, /WebSocketServer/);
  assert.match(serverSource, /anonymous-chat-ws/);
  assert.match(serverSource, /\/api\/anonymous-chat\/room/);
  assert.match(serverSource, /\/api\/anonymous-chat\/network/);
  assert.match(serverSource, /PollingSocket/);
  assert.match(serverSource, /message\.type === "join_public"/);
  assert.match(serverSource, /message\.type === "create_room"/);
  assert.match(serverSource, /message\.type === "send_message"/);
  assert.match(serverSource, /message\.type === "react"/);
  assert.match(serverSource, /message\.type === "clear_messages"/);
  assert.match(serverSource, /MAX_IMAGE_BYTES = 1_500_000/);
  assert.match(serverSource, /MAX_ROOM_IMAGE_BYTES = 12_000_000/);
  assert.match(serverSource, /hasExpectedImageSignature/);
  assert.match(serverSource, /jpeg\|png\|webp\|gif/);
  assert.match(serverSource, /maxPayload: MAX_REQUEST_BYTES/);
  assert.doesNotMatch(serverSource, /writeFile|appendFile|localStorage/);
});

test("provides a local-only Doudizhu room server and CSV score ledger", async () => {
  const serverSource = await readFile(
    new URL("../lan/doudizhu-server.ts", import.meta.url),
    "utf8",
  );

  assert.match(serverSource, /WebSocketServer/);
  assert.match(serverSource, /doudizhu-ws/);
  assert.match(serverSource, /\/api\/doudizhu\/room/);
  assert.match(serverSource, /\/api\/doudizhu\/network/);
  assert.match(serverSource, /\/api\/doudizhu\/leaderboard/);
  assert.match(serverSource, /PollingSocket/);
  assert.match(serverSource, /doudizhu-scores\.csv/);
  assert.match(serverSource, /doudizhu-leaderboard\.json/);
  assert.match(serverSource, /leaderboardSnapshot/);
  assert.match(serverSource, /playedCards/);
  assert.match(serverSource, /时间,房间,玩家,座位,身份,结果,倍数,本局积分,累计积分/);
  assert.match(serverSource, /message\.type === "create"/);
  assert.match(serverSource, /message\.type === "join"/);
  assert.match(serverSource, /message\.type === "add_bot"/);
  assert.match(serverSource, /message\.type === "remove_bot"/);
  assert.match(serverSource, /chooseBotBid/);
  assert.match(serverSource, /scheduleBots/);
  assert.match(serverSource, /message\.type === "play"/);
});
