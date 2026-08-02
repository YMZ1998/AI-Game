import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const portalRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(portalRoot, "..");
const gamesRoot = path.join(workspaceRoot, "games");
const outputRoot = path.join(portalRoot, "public", "embedded");
const shellRoot = path.join(portalRoot, "public", "play");
const skipBuild = process.env.PLAYROOM_SKIP_GAME_BUILD === "1";
const requestedGames = new Set(
  (process.env.PLAYROOM_GAME ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean),
);

const gameCatalog = [
  { slug: "gold-miner", number: "01", title: "黄金矿工", english: "GOLD RUSH" },
  { slug: "doudizhu", number: "02", title: "斗地主", english: "LANDLORD" },
  {
    slug: "bubble-battle",
    number: "03",
    title: "泡泡堂",
    english: "BUBBLE BATTLE",
  },
  {
    slug: "police-chase",
    number: "04",
    title: "夜巡追捕",
    english: "NIGHT PATROL",
  },
  {
    slug: "critical-operation",
    number: "05",
    title: "临界行动",
    english: "CRITICAL OPERATION",
  },
  {
    slug: "tetris-game",
    number: "06",
    title: "AI 俄罗斯方块",
    english: "STACK LAB",
  },
  {
    slug: "anonymous-chat",
    number: "07",
    title: "匿名夜话",
    english: "MIDNIGHT FREQUENCY",
  },
  { slug: "pacman", number: "08", title: "吃豆人", english: "PAC-MAN" },
  {
    slug: "connect-four",
    number: "09",
    title: "四子棋",
    english: "CONNECT FOUR",
  },
  { slug: "2048", number: "10", title: "2048", english: "NUMBER MERGE" },
  {
    slug: "asteroids",
    number: "11",
    title: "小行星",
    english: "ASTEROIDS",
  },
  { slug: "hexgl", number: "12", title: "极速光轨", english: "HEXGL" },
  { slug: "hextris", number: "13", title: "六角拼图", english: "HEXTRIS" },
  {
    slug: "tosios",
    number: "14",
    title: "地牢枪手",
    english: "TOSIOS",
  },
  {
    slug: "armor-alley",
    number: "15",
    title: "装甲峡谷",
    english: "ARMOR ALLEY",
  },
  {
    slug: "trigger-rally",
    number: "16",
    title: "尘土拉力",
    english: "TRIGGER RALLY",
    launchQuery: "autostart=1",
  },
  {
    slug: "micro-racing",
    number: "17",
    title: "微型赛车",
    english: "MICRO RACING",
  },
  {
    slug: "racez",
    number: "18",
    title: "霓虹赛车",
    english: "RACEZ.IO",
  },
  {
    slug: "javascript-racer",
    number: "19",
    title: "公路追风",
    english: "JAVASCRIPT RACER",
  },
  {
    slug: "solitairey",
    number: "20",
    title: "百变接龙",
    english: "SOLITAIREY",
  },
  {
    slug: "js-solitaire",
    number: "21",
    title: "经典纸牌",
    english: "KLONDIKE",
  },
  {
    slug: "blackjack",
    number: "22",
    title: "经典二十一点",
    english: "BLACKJACK",
  },
  {
    slug: "multiplayer-blackjack",
    number: "23",
    title: "联机二十一点",
    english: "BLACKJACK ROOMS",
  },
];

const gameHints = {
  "gold-miner": "看准摆动方向，按 ↓ 或空格放下抓钩。",
  doudizhu: "点击手牌完成选牌，再用出牌、提示或不出推进回合。",
  "bubble-battle": "移动躲开水花，放置泡泡炸开障碍并制造连锁。",
  "police-chase": "移动准星锁定目标，及时发射手铐完成追捕。",
  "critical-operation": "WASD 移动，鼠标瞄准与射击，按提示完成拆弹。",
  "tetris-game": "方向键移动和加速，↑ 旋转；也可以切换 AI 自动模式。",
  "anonymous-chat": "输入昵称进入频道；发送文字或图片与局域网玩家交流。",
  pacman: "使用方向键穿过迷宫，吃下能量豆后可以反击幽灵。",
  "connect-four": "点击一列落子，率先横、竖或斜向连成四子。",
  "2048": "使用方向键或滑动合并同数方块，尽量留出活动空间。",
  asteroids: "方向键旋转与推进，空格射击；持续移动更容易避开碎石。",
  hexgl: "使用方向键或 WASD 驾驶，平稳过弯比频繁撞墙更快。",
  hextris: "左右旋转六角核心，让同色方块连续相接并消除。",
  tosios: "先创建或加入房间，再用键鼠移动、瞄准和射击。",
  "armor-alley": "驾驶直升机掩护车队，购买单位并逐步推进战线。",
  "trigger-rally": "方向键或 WASD 驾驶，空格手刹，R 重新开始，C 切换视角。",
  "micro-racing": "创建房间并按需加入电脑车手，再用方向键驾驶。",
  racez: "选择车辆与赛道后，用 WASD 驾驶并依次通过检查点。",
  "javascript-racer": "使用方向键驾驶，提前减速可以更稳定地通过弯道。",
  solitairey: "先选择一种接龙玩法，再按规则点击或拖动牌组完成布局。",
  "js-solitaire": "点击可自动移动到首个合法位置；也可以按住牌面拖动整列。",
  blackjack: "选择要牌或停牌，让你的点数尽量接近 21 且不要爆牌。",
  "multiplayer-blackjack": "创建并分享房间号；房主等玩家加入后开始，轮到你时选择要牌或停牌。",
};

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, absolute)));
    } else {
      files.push(path.relative(root, absolute).replaceAll(path.sep, "/"));
    }
  }

  return files;
}

function rewriteResourcePaths(source, slug, clientFiles) {
  const prefix = `/embedded/${slug}`;
  let result = source.replace(/https?:\/\/localhost:\d+/g, "");
  result = result.replace(
    /(^|["'=(\s])\/assets\//g,
    `$1${prefix}/assets/`,
  );

  for (const file of clientFiles.sort((a, b) => b.length - a.length)) {
    if (file.startsWith("assets/")) continue;
    const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(
      new RegExp(`(^|["'=(\\s])/${escaped}`, "g"),
      `$1${prefix}/${file}`,
    );
  }

  return result;
}

async function patchCopiedTextAssets(destination, slug, clientFiles) {
  const copiedFiles = await listFiles(destination);

  for (const relative of copiedFiles) {
    const isKnownTextAsset = /\.(?:css|html|js|json|map|txt)$/i.test(relative);
    const isTriggerRallyApiFixture =
      slug === "trigger-rally" &&
      relative.startsWith("v1/") &&
      path.extname(relative) === "";
    if (!isKnownTextAsset && !isTriggerRallyApiFixture) continue;
    const absolute = path.join(destination, ...relative.split("/"));
    const source = await readFile(absolute, "utf8");
    const rewritten = rewriteResourcePaths(source, slug, clientFiles);
    if (rewritten !== source) {
      await writeFile(absolute, rewritten);
    }
  }
}

async function renderGame(gameRoot, slug) {
  const workerPath = path.join(gameRoot, "dist", "server", "index.js");
  const rendererPath = path.join(import.meta.dirname, "render-game.mjs");
  const rendered = spawnSync(process.execPath, [rendererPath, workerPath], {
    cwd: gameRoot,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });

  if (rendered.status !== 0) {
    throw new Error(
      `${slug} render failed: ${rendered.stderr || rendered.error?.message || "unknown error"}`,
    );
  }

  return rendered.stdout;
}

function renderGameShell({ slug, number, title, english, launchQuery }) {
  const hint = gameHints[slug] ?? "开始游戏后可随时打开操作提示。";
  const launchSearch = launchQuery ? `?${launchQuery}` : "";
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <title>${title}｜PLAYROOM</title>
    <style>
      :root{--ink:#101118;--paper:#f3eddf;--acid:#e8ff4c;--blue:#6c79ff;--line:rgba(243,237,223,.18)}
      *{box-sizing:border-box}
      html,body{width:100%;height:100%;margin:0;overflow:hidden;background:var(--ink);color:var(--paper);font-family:Arial,"Microsoft YaHei",sans-serif}
      body{display:grid;grid-template-rows:auto minmax(0,1fr);gap:8px;padding:8px;background:radial-gradient(circle at 90% 0%,rgba(108,121,255,.2),transparent 28%),var(--ink)}
      header{min-height:68px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:18px;padding:9px 13px;border:1px solid var(--line);border-radius:13px;background:rgba(16,17,24,.94)}
      a,button{min-height:42px;border:1px solid rgba(243,237,223,.28);border-radius:999px;color:var(--paper);background:transparent;font:inherit;font-size:12px;font-weight:900;letter-spacing:.04em;cursor:pointer;text-decoration:none}
      a{width:max-content;display:inline-flex;align-items:center;gap:9px;padding:0 17px}
      a b{font-size:18px}
      a:hover,button:hover{border-color:var(--acid);color:var(--ink);background:var(--acid)}
      a:focus-visible,button:focus-visible{outline:3px solid var(--blue);outline-offset:3px}
      .identity{display:flex;align-items:center;gap:12px}
      .identity>span{padding:7px 9px;border-radius:4px;color:var(--ink);background:var(--acid);font-size:9px;font-weight:1000;letter-spacing:.09em}
      .identity div{display:grid;gap:2px}
      .identity strong{font-size:18px;line-height:1}
      .identity small{color:#85868f;font-size:9px;font-weight:900;letter-spacing:.14em}
      .actions{display:flex;justify-content:flex-end;gap:8px}
      button{padding:0 15px}
      .stage{position:relative;min-height:0;overflow:hidden;contain:strict;border:2px solid var(--acid);border-radius:17px;background:#08090d;box-shadow:0 0 0 4px var(--ink),0 0 0 5px rgba(232,255,76,.35)}
      iframe{width:100%;height:100%;display:block;border:0;background:#08090d;touch-action:none}
      .status{position:absolute;z-index:4;top:12px;right:12px;display:flex;align-items:center;gap:8px;padding:8px 11px;border:1px solid var(--line);border-radius:999px;background:rgba(8,9,13,.86);backdrop-filter:blur(8px);font-size:9px;font-weight:900;letter-spacing:.09em;transition:opacity .18s ease,transform .18s ease}
      .status i{width:8px;height:8px;border:2px solid rgba(243,237,223,.25);border-top-color:var(--acid);border-radius:50%;animation:spin .7s linear infinite}
      .status.done{opacity:0;transform:translateY(-5px);pointer-events:none}
      .status.slow{border-color:rgba(232,255,76,.55)}
      .status button{min-height:28px;padding:0 9px;border-color:rgba(243,237,223,.24);font-size:9px}
      .status button[hidden]{display:none}
      .tip{position:absolute;z-index:3;left:14px;bottom:14px;max-width:min(460px,calc(100% - 28px));display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;padding:11px 12px;border:1px solid rgba(232,255,76,.5);border-radius:13px;background:rgba(8,9,13,.9);box-shadow:0 14px 40px rgba(0,0,0,.35);backdrop-filter:blur(12px);font-size:11px;line-height:1.5}
      .tip[hidden]{display:none}
      .tip>span{display:grid;width:30px;height:30px;place-items:center;border-radius:8px;color:var(--ink);background:var(--acid);font-size:15px;font-weight:1000}
      .tip strong{display:block;margin-bottom:1px;font-size:10px;letter-spacing:.08em}
      .tip p{margin:0;color:#c9c5bb}
      .tip button{min-height:30px;padding:0 9px;border:0;font-size:18px}
      dialog{width:min(520px,calc(100% - 28px));padding:0;border:1px solid rgba(232,255,76,.45);border-radius:20px;color:var(--paper);background:#14151c;box-shadow:0 30px 90px rgba(0,0,0,.65)}
      dialog::backdrop{background:rgba(4,5,8,.76);backdrop-filter:blur(6px)}
      .help{padding:25px}
      .help-kicker{color:var(--acid);font-size:9px;font-weight:1000;letter-spacing:.18em}
      .help h2{margin:8px 0 10px;font-size:28px;letter-spacing:-.04em}
      .help p{margin:0;color:#c9c5bb;line-height:1.7}
      .help dl{display:grid;grid-template-columns:auto 1fr;gap:9px 14px;margin:22px 0;color:#aaa8a2;font-size:11px}
      .help dt{color:var(--paper);font-weight:900}
      .help dd{margin:0}
      .help-actions{display:flex;justify-content:flex-end}
      @keyframes spin{to{transform:rotate(360deg)}}
      .stage:fullscreen{border:0;border-radius:0}
      @media(max-width:720px){
        body{gap:5px;padding:5px}
        header{min-height:58px;grid-template-columns:auto 1fr auto;gap:7px;padding:7px}
        a{width:42px;padding:0;justify-content:center;font-size:0}
        .identity>span,.identity small{display:none}
        .identity strong{font-size:15px}
        .actions button{width:42px;padding:0;overflow:hidden;font-size:0}
        .actions button::after{content:attr(data-icon);font-size:18px}
        .stage{border-radius:11px}
        .tip{left:9px;bottom:9px;max-width:calc(100% - 18px)}
        .tip button{width:30px}
        .status button{width:auto;font-size:9px}
      }
      @media(prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important}}
    </style>
  </head>
  <body>
    <header>
      <a href="/" aria-label="返回游戏大厅"><b aria-hidden="true">←</b>返回大厅</a>
      <div class="identity">
        <span>${number} / NOW PLAYING</span>
        <div><strong>${title}</strong><small>${english}</small></div>
      </div>
      <div class="actions">
        <button id="help" type="button" data-icon="?">操作提示</button>
        <button id="reload" type="button" data-icon="↻">重新载入</button>
        <button id="fullscreen" type="button" data-icon="⛶">全屏游玩</button>
      </div>
    </header>
    <div class="stage" id="stage" aria-busy="true">
      <div class="status" id="status" aria-live="polite">
        <i></i><span id="status-text">正在装载</span>
        <button id="retry" type="button" hidden>重试</button>
      </div>
      <div class="tip" id="tip" hidden>
        <span aria-hidden="true">!</span>
        <div><strong>快速上手</strong><p>${hint}</p></div>
        <button id="tip-close" type="button" aria-label="关闭操作提示">×</button>
      </div>
      <iframe id="game" data-src="/embedded/${slug}/index.html${launchSearch}" title="${title}游戏" allow="autoplay; fullscreen; gamepad" loading="eager" fetchpriority="high"></iframe>
    </div>
    <dialog id="help-dialog">
      <div class="help">
        <span class="help-kicker">HOW TO PLAY</span>
        <h2>${title}操作提示</h2>
        <p>${hint}</p>
        <dl>
          <dt>Alt + H</dt><dd>随时打开或关闭本提示</dd>
          <dt>Alt + R</dt><dd>重新载入当前游戏</dd>
          <dt>Alt + Enter</dt><dd>进入或退出全屏</dd>
        </dl>
        <div class="help-actions"><button id="help-close" type="button">继续游戏</button></div>
      </div>
    </dialog>
    <script>
      const frame=document.querySelector("#game");
      const stage=document.querySelector("#stage");
      const status=document.querySelector("#status");
      const statusText=document.querySelector("#status-text");
      const retry=document.querySelector("#retry");
      const tip=document.querySelector("#tip");
      const helpDialog=document.querySelector("#help-dialog");
      let slowTimer;
      const gameUrl=new URL(frame.dataset.src,location.origin);
      const room=new URLSearchParams(location.search).get("room");
      if(room) gameUrl.searchParams.set("room",room);
      const beginLoad=()=>{
        clearTimeout(slowTimer);
        stage.setAttribute("aria-busy","true");
        status.classList.remove("done","slow");
        statusText.textContent="正在装载";
        retry.hidden=true;
        slowTimer=setTimeout(()=>{
          status.classList.add("slow");
          statusText.textContent="加载时间较长";
          retry.hidden=false;
        },10000);
      };
      const showHelp=()=>helpDialog.open?helpDialog.close():helpDialog.showModal();
      const toggleFullscreen=()=>document.fullscreenElement?document.exitFullscreen?.():stage.requestFullscreen?.();
      const reloadGame=()=>{
        beginLoad();
        try{frame.contentWindow.location.reload()}catch{frame.src=frame.src}
      };
      const shortcuts=(event)=>{
        if(!event.altKey)return;
        if(event.key.toLowerCase()==="h"){event.preventDefault();showHelp()}
        if(event.key.toLowerCase()==="r"){event.preventDefault();reloadGame()}
        if(event.key==="Enter"){event.preventDefault();toggleFullscreen()}
      };
      beginLoad();
      frame.addEventListener("load",()=>{
        clearTimeout(slowTimer);
        stage.setAttribute("aria-busy","false");
        status.classList.add("done");
        frame.focus();
        try{frame.contentWindow.addEventListener("keydown",shortcuts)}catch{}
        const seenKey="playroom-tip-seen:${slug}";
        if(!localStorage.getItem(seenKey)){
          tip.hidden=false;
          localStorage.setItem(seenKey,"1");
          setTimeout(()=>{tip.hidden=true},8000);
        }
      });
      frame.src=gameUrl.pathname+gameUrl.search;
      retry.addEventListener("click",reloadGame);
      document.querySelector("#reload").addEventListener("click",reloadGame);
      document.querySelector("#fullscreen").addEventListener("click",toggleFullscreen);
      document.querySelector("#help").addEventListener("click",showHelp);
      document.querySelector("#help-close").addEventListener("click",()=>helpDialog.close());
      document.querySelector("#tip-close").addEventListener("click",()=>{tip.hidden=true});
      document.addEventListener("keydown",shortcuts);
      helpDialog.addEventListener("click",(event)=>{
        if(event.target===helpDialog)helpDialog.close();
      });
      if("serviceWorker" in navigator){
        addEventListener("load",()=>navigator.serviceWorker.register("/game-cache-sw.js").catch(()=>{}),{once:true});
      }
    </script>
  </body>
</html>`;
}

await mkdir(outputRoot, { recursive: true });
await mkdir(shellRoot, { recursive: true });

const selectedGames = requestedGames.size
  ? gameCatalog.filter((game) => requestedGames.has(game.slug))
  : gameCatalog;

for (const game of selectedGames) {
  const { slug } = game;
  const gameRoot = path.join(gamesRoot, slug);
  const destination = path.join(outputRoot, slug);
  const shellDestination = path.join(shellRoot, slug);
  const existingIndex = path.join(destination, "index.html");
  const shellIndex = path.join(shellDestination, "index.html");
  const manifestPath = path.join(gameRoot, "playroom.json");

  if (await exists(manifestPath)) {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    if (manifest.type !== "static") {
      throw new Error(`${slug} has unsupported playroom type: ${manifest.type}`);
    }

    const sourceRoot = path.join(gameRoot, manifest.source ?? "public");
    const entry = manifest.entry ?? "index.html";
    if (!(await exists(path.join(sourceRoot, entry)))) {
      throw new Error(`${slug} static entry is missing: ${entry}`);
    }

    console.log(`[games] ${slug}: copying static source`);
    const clientFiles = await listFiles(sourceRoot);
    await rm(destination, { recursive: true, force: true });
    await mkdir(destination, { recursive: true });
    await cp(sourceRoot, destination, { recursive: true, force: true });
    await patchCopiedTextAssets(destination, slug, clientFiles);

    if (entry !== "index.html") {
      await cp(path.join(destination, entry), existingIndex, { force: true });
    }
    const sourceHtml = await readFile(existingIndex, "utf8");
    const html = sourceHtml.includes('name="playroom-embedded"')
      ? sourceHtml
      : sourceHtml.replace(
          /<head(\s[^>]*)?>/i,
          (head) =>
            `${head}<meta name="playroom-embedded" content="${slug}">`,
        );
    await writeFile(existingIndex, html);

    await rm(shellDestination, { recursive: true, force: true });
    await mkdir(shellDestination, { recursive: true });
    await writeFile(shellIndex, renderGameShell(game));
    console.log(`[games] ${slug}: embedded static source`);
    continue;
  }

  if (!(await exists(path.join(gameRoot, "package.json")))) {
    if ((await exists(existingIndex)) && (await exists(shellIndex))) {
      console.log(`[games] ${slug}: using committed embedded build`);
      continue;
    }
    throw new Error(`Missing source and embedded build for ${slug}`);
  }

  if (!skipBuild) {
    console.log(`[games] ${slug}: building`);
    const build =
      process.platform === "win32"
        ? spawnSync(
            process.env.ComSpec ?? "cmd.exe",
            ["/d", "/s", "/c", "npx --no-install vinext build"],
            {
              cwd: gameRoot,
              env: {
                ...process.env,
                WRANGLER_LOG_PATH: ".wrangler/wrangler.log",
              },
              stdio: "inherit",
            },
          )
        : spawnSync("npx", ["--no-install", "vinext", "build"], {
            cwd: gameRoot,
            env: {
              ...process.env,
              WRANGLER_LOG_PATH: ".wrangler/wrangler.log",
            },
            stdio: "inherit",
          });
    if (build.status !== 0) {
      throw new Error(
        `${slug} build failed${build.error ? `: ${build.error.message}` : ""}`,
      );
    }
  } else {
    console.log(`[games] ${slug}: reusing current build`);
  }

  const clientRoot = path.join(gameRoot, "dist", "client");
  const clientFiles = await listFiles(clientRoot);
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  await cp(clientRoot, destination, { recursive: true, force: true });
  await patchCopiedTextAssets(destination, slug, clientFiles);

  let html = await renderGame(gameRoot, slug);
  html = rewriteResourcePaths(html, slug, clientFiles);
  html = html.replace(
    "<head>",
    `<head><base href="/embedded/${slug}/"><meta name="playroom-embedded" content="${slug}">`,
  );
  await writeFile(existingIndex, html);
  await rm(shellDestination, { recursive: true, force: true });
  await mkdir(shellDestination, { recursive: true });
  await writeFile(shellIndex, renderGameShell(game));
  console.log(`[games] ${slug}: embedded`);
}

console.log(`[games] synced ${selectedGames.length} games into PLAYROOM`);
