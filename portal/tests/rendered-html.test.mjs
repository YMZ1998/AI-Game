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

test("server-renders all twenty-four game cards", async () => {
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
  assert.match(html, /尘土拉力/);
  assert.match(html, /微型赛车/);
  assert.match(html, /霓虹赛车/);
  assert.match(html, /公路追风/);
  assert.match(html, /百变接龙/);
  assert.match(html, /经典纸牌/);
  assert.match(html, /经典二十一点/);
  assert.match(html, /联机二十一点/);
  assert.match(html, /星港拾荒局/);
  assert.match(html, /24(?:<!-- -->)? 款游戏在线/);
  assert.match(html, /href="\/play\/police-chase\/index\.html"/);
  assert.match(html, /href="\/play\/anonymous-chat\/index\.html"/);
  assert.match(html, /href="\/play\/armor-alley\/index\.html"/);
  assert.match(html, /href="\/play\/trigger-rally\/index\.html"/);
  assert.match(html, /href="\/play\/micro-racing\/index\.html"/);
  assert.match(html, /href="\/play\/racez\/index\.html"/);
  assert.match(html, /href="\/play\/javascript-racer\/index\.html"/);
  assert.match(html, /href="\/play\/solitairey\/index\.html"/);
  assert.match(html, /href="\/play\/js-solitaire\/index\.html"/);
  assert.match(html, /href="\/play\/blackjack\/index\.html"/);
  assert.match(html, /href="\/play\/multiplayer-blackjack\/index\.html"/);
  assert.match(html, /href="\/play\/starport-salvage-idle\/index\.html"/);
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
  assert.match(html, /操作提示/);
  assert.match(html, /快速上手/);
  assert.match(html, /加载时间较长/);
  assert.match(html, /serviceWorker\.register\("\/game-cache-sw\.js"\)/);
  assert.match(html, /loading="eager" fetchpriority="high"/);
  assert.match(html, /data-src="\/embedded\/tetris-game\/index\.html"/);
  assert.doesNotMatch(html, /localhost:\d+/);
});

test("ships a shared cache and recovery layer for all games", async () => {
  const serviceWorker = await readFile(
    new URL("../public/game-cache-sw.js", import.meta.url),
    "utf8",
  );
  const syncSource = await readFile(
    new URL("../scripts/sync-games.mjs", import.meta.url),
    "utf8",
  );

  assert.match(serviceWorker, /playroom-game-assets-/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/embedded\/"\)/);
  assert.match(serviceWorker, /staleWhileRevalidate/);
  assert.match(serviceWorker, /networkFirst/);
  assert.match(syncSource, /const gameHints = \{/);
  assert.match(syncSource, /"javascript-racer": "使用方向键驾驶/);
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
    "trigger-rally",
    "micro-racing",
    "racez",
    "javascript-racer",
    "solitairey",
    "js-solitaire",
    "blackjack",
    "multiplayer-blackjack",
    "starport-salvage-idle",
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

test("ships Solitairey's local YUI runtime and self-hosts multiplayer assets", async () => {
  const yuiModule = await readFile(
    new URL(
      "../public/embedded/solitairey/js/yui-unpack/yui/build/node-core/node-core-min.js",
      import.meta.url,
    ),
    "utf8",
  );
  const multiplayerIndex = await readFile(
    new URL(
      "../public/embedded/multiplayer-blackjack/index.html",
      import.meta.url,
    ),
    "utf8",
  );
  const multiplayerGame = await readFile(
    new URL(
      "../public/embedded/multiplayer-blackjack/game.html",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(yuiModule, /YUI\.add\("node-core"/);
  assert.doesNotMatch(multiplayerIndex, /(?:src|href)=["']https?:\/\//);
  assert.doesNotMatch(multiplayerGame, /(?:src|href)=["']https?:\/\//);
});

test("rewrites Trigger Rally's extensionless API fixture asset paths", async () => {
  const fixtureUrl = new URL(
    "../public/embedded/trigger-rally/v1/cars/Icarus",
    import.meta.url,
  );
  const fixture = await readFile(fixtureUrl, "utf8");

  assert.match(
    fixture,
    /"scene":"\/embedded\/trigger-rally\/a\/meshes\/icarus-body\.json"/,
  );
  assert.match(
    fixture,
    /"engine":"\/embedded\/trigger-rally\/a\/sounds\/engine1\.ogg"/,
  );
  assert.doesNotMatch(fixture, /"\/a\//);
});

test("launches Trigger Rally directly into its playable rally stage", async () => {
  const shell = await readFile(
    new URL("../public/play/trigger-rally/index.html", import.meta.url),
    "utf8",
  );
  const gameIndex = await readFile(
    new URL("../public/embedded/trigger-rally/index.html", import.meta.url),
    "utf8",
  );
  const terrainSource = await readFile(
    new URL(
      "../public/embedded/trigger-rally/scripts/game/terrain.js",
      import.meta.url,
    ),
    "utf8",
  );
  const terrainRenderer = await readFile(
    new URL(
      "../public/embedded/trigger-rally/scripts/client/terrain.js",
      import.meta.url,
    ),
    "utf8",
  );
  const carRenderer = await readFile(
    new URL(
      "../public/embedded/trigger-rally/scripts/client/car.js",
      import.meta.url,
    ),
    "utf8",
  );
  const routerSource = await readFile(
    new URL(
      "../public/embedded/trigger-rally/scripts/router.js",
      import.meta.url,
    ),
    "utf8",
  );
  const localDatabase = await readFile(
    new URL(
      "../public/embedded/trigger-rally/scripts/util/localDB.js",
      import.meta.url,
    ),
    "utf8",
  );
  const appSource = await readFile(
    new URL(
      "../public/embedded/trigger-rally/scripts/app.js",
      import.meta.url,
    ),
    "utf8",
  );
  const clientSource = await readFile(
    new URL(
      "../public/embedded/trigger-rally/scripts/client/client.js",
      import.meta.url,
    ),
    "utf8",
  );
  const driveSource = await readFile(
    new URL(
      "../public/embedded/trigger-rally/scripts/views/drive.js",
      import.meta.url,
    ),
    "utf8",
  );
  const vehicleSource = await readFile(
    new URL(
      "../public/embedded/trigger-rally/scripts/game/vehicle.js",
      import.meta.url,
    ),
    "utf8",
  );
  const statusbarTemplate = await readFile(
    new URL(
      "../public/embedded/trigger-rally/scripts/templates/statusbar.jade",
      import.meta.url,
    ),
    "utf8",
  );
  const statusbarSource = await readFile(
    new URL(
      "../public/embedded/trigger-rally/scripts/views/statusbar.js",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    shell,
    /data-src="\/embedded\/trigger-rally\/index\.html\?autostart=1"/,
  );
  assert.match(gameIndex, /launchParams\.get\("autostart"\) === "1"/);
  assert.match(gameIndex, /track\/RF87t6b6\/drive/);
  assert.match(gameIndex, /urlArgs: "v=20260730-grip20"/);
  assert.match(terrainSource, /url\.startsWith\(basePath \+ '\/'\)/);
  assert.doesNotMatch(
    terrainRenderer,
    /GL_OES_standard_derivatives/,
  );
  assert.match(
    terrainRenderer,
    /max\(gl_FragColor\.rgb, terrainAlbedo \* 0\.55\)/,
  );
  assert.match(terrainRenderer, /vec3\(0\.24, 0\.16, 0\.08\)/);
  assert.match(carRenderer, /resolveAssetUrl\(meshes\.body\)/);
  assert.match(carRenderer, /resolveAssetUrl\(meshes\.wheel\)/);
  assert.match(routerSource, /track\.env\.fetch/);
  assert.match(routerSource, /Backbone\.trigger\('app:settrack', track\)/);
  assert.match(localDatabase, /readyCallbacks\.push\(callback\)/);
  assert.match(appSource, /shadows: false/);
  assert.match(appSource, /this\.root\.prefs\.shadows = false/);
  assert.match(clientSource, /parkingBrake = this\.idleSeconds >= 0\.45/);
  assert.doesNotMatch(driveSource, /rolloverSeconds/);
  assert.doesNotMatch(driveSource, /Vehicle recovered/);
  assert.match(vehicleSource, /setGripMultiplier = function\(multiplier\)/);
  assert.match(driveSource, /enhanced: 1\.28/);
  assert.match(driveSource, /racing: 1\.5/);
  assert.match(driveSource, /change:prefs\.grip/);
  assert.match(appSource, /grip: 'enhanced'/);
  assert.match(statusbarTemplate, /select#pref-grip/);
  assert.match(statusbarSource, /prefs\.grip = \$prefGrip\.val\(\)/);
});

test("provides Micro Racing behind the shared portal port", async () => {
  const serverSource = await readFile(
    new URL("../lan/micro-racing-server.ts", import.meta.url),
    "utf8",
  );
  const viteSource = await readFile(
    new URL("../vite.config.ts", import.meta.url),
    "utf8",
  );
  assert.match(serverSource, /"micro-racing"/);
  assert.match(serverSource, /"server\.js"/);
  assert.match(serverSource, /MICRO_RACING_INTERNAL_PORT/);
  assert.match(viteSource, /microRacingLanServer/);
  assert.match(viteSource, /"\/micro-racing-service"/);
  assert.match(viteSource, /ws: true/);
});

test("provides Bubble Battle rooms behind the shared portal port", async () => {
  const serverSource = await readFile(
    new URL("../lan/bubble-battle-server.ts", import.meta.url),
    "utf8",
  );
  const viteSource = await readFile(
    new URL("../vite.config.ts", import.meta.url),
    "utf8",
  );
  const embeddedSource = await readFile(
    new URL("../public/embedded/bubble-battle/index.html", import.meta.url),
    "utf8",
  );

  assert.match(serverSource, /bubble-battle/);
  assert.match(serverSource, /server\.mjs/);
  assert.match(serverSource, /BUBBLE_BATTLE_INTERNAL_PORT/);
  assert.match(viteSource, /bubbleBattleServer/);
  assert.match(viteSource, /"\/bubble-battle-service"/);
  assert.match(embeddedSource, /在线房间/);
});

test("provides Multiplayer Blackjack behind the shared portal port", async () => {
  const serverSource = await readFile(
    new URL("../lan/multiplayer-blackjack-server.ts", import.meta.url),
    "utf8",
  );
  const viteSource = await readFile(
    new URL("../vite.config.ts", import.meta.url),
    "utf8",
  );
  const gameServerSource = await readFile(
    new URL(
      "../../games/multiplayer-blackjack/server.js",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(serverSource, /multiplayer-blackjack/);
  assert.match(serverSource, /server\.js/);
  assert.match(serverSource, /MULTIPLAYER_BLACKJACK_INTERNAL_PORT/);
  assert.match(viteSource, /multiplayerBlackjackServer/);
  assert.match(viteSource, /"\/multiplayer-blackjack-service"/);
  assert.match(viteSource, /ws: false/);

  const clientSource = await readFile(
    new URL(
      "../public/embedded/multiplayer-blackjack/js/game.js",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(clientSource, /transports:\s*\['polling'\]/);
  assert.match(clientSource, /upgrade:\s*false/);
  assert.match(clientSource, /reconnectToken/);
  assert.match(clientSource, /updateTurnCountdown/);
  assert.match(gameServerSource, /RECONNECT_GRACE_MS/);
  assert.match(gameServerSource, /操作超时/);
  assert.match(gameServerSource, /cleanupRooms/);
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

test("embeds Starport Salvage with its complete idle loop", async () => {
  const indexSource = await readFile(
    new URL("../public/embedded/starport-salvage-idle/index.html", import.meta.url),
    "utf8",
  );
  const gameSource = await readFile(
    new URL("../public/embedded/starport-salvage-idle/game.js", import.meta.url),
    "utf8",
  );
  const styleSource = await readFile(
    new URL("../public/embedded/starport-salvage-idle/style.css", import.meta.url),
    "utf8",
  );

  assert.match(indexSource, /星港拾荒局/);
  assert.match(indexSource, /data-batch="max"/);
  assert.match(gameSource, /starport-salvage-idle:v1/);
  assert.match(gameSource, /MAX_OFFLINE_SECONDS = 4 \* 60 \* 60/);
  assert.match(gameSource, /window\.setInterval\(saveState, 10_000\)/);
  assert.match(gameSource, /function deliverOrder/);
  assert.match(styleSource, /prefers-reduced-motion/);
});
