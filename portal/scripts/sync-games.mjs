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
];

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
  let result = source
    .replace(/https?:\/\/localhost:\d+/g, "")
    .replaceAll("/assets/", `${prefix}/assets/`);

  for (const file of clientFiles.sort((a, b) => b.length - a.length)) {
    if (file.startsWith("assets/")) continue;
    result = result.replaceAll(`/${file}`, `${prefix}/${file}`);
  }

  return result;
}

async function patchCopiedTextAssets(destination, slug, clientFiles) {
  const copiedFiles = await listFiles(destination);

  for (const relative of copiedFiles) {
    if (!/\.(?:css|html|js|json|map|txt)$/i.test(relative)) continue;
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

function renderGameShell({ slug, number, title, english }) {
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
      .stage{position:relative;min-height:0;overflow:hidden;border:2px solid var(--acid);border-radius:17px;background:#08090d;box-shadow:0 0 0 4px var(--ink),0 0 0 5px rgba(232,255,76,.35)}
      iframe{width:100%;height:100%;display:block;border:0;background:#08090d}
      .status{position:absolute;z-index:2;top:12px;right:12px;display:flex;align-items:center;gap:8px;padding:8px 11px;border:1px solid var(--line);border-radius:999px;background:rgba(8,9,13,.82);backdrop-filter:blur(8px);font-size:9px;font-weight:900;letter-spacing:.09em;transition:opacity .18s ease,transform .18s ease}
      .status i{width:8px;height:8px;border:2px solid rgba(243,237,223,.25);border-top-color:var(--acid);border-radius:50%;animation:spin .7s linear infinite}
      .status.done{opacity:0;transform:translateY(-5px);pointer-events:none}
      @keyframes spin{to{transform:rotate(360deg)}}
      .stage:fullscreen{border:0;border-radius:0}
      @media(max-width:720px){
        body{gap:5px;padding:5px}
        header{min-height:58px;grid-template-columns:auto 1fr auto;gap:7px;padding:7px}
        a{width:42px;padding:0;justify-content:center;font-size:0}
        .identity>span,.identity small{display:none}
        .identity strong{font-size:15px}
        button{width:42px;padding:0;overflow:hidden;font-size:0}
        #reload::after{content:"↻";font-size:19px}
        #fullscreen::after{content:"⛶";font-size:19px}
        .stage{border-radius:11px}
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
        <button id="reload" type="button">重新载入</button>
        <button id="fullscreen" type="button">全屏游玩</button>
      </div>
    </header>
    <div class="stage" id="stage">
      <div class="status" id="status" aria-live="polite"><i></i>正在装载</div>
      <iframe id="game" src="/embedded/${slug}/index.html" title="${title}游戏" allow="autoplay; fullscreen; gamepad"></iframe>
    </div>
    <script>
      const frame=document.querySelector("#game");
      const stage=document.querySelector("#stage");
      const status=document.querySelector("#status");
      frame.addEventListener("load",()=>status.classList.add("done"),{once:true});
      document.querySelector("#reload").addEventListener("click",()=>{
        status.classList.remove("done");
        frame.contentWindow.location.reload();
      });
      document.querySelector("#fullscreen").addEventListener("click",()=>stage.requestFullscreen?.());
    </script>
  </body>
</html>`;
}

await mkdir(outputRoot, { recursive: true });
await mkdir(shellRoot, { recursive: true });

for (const game of gameCatalog) {
  const { slug } = game;
  const gameRoot = path.join(gamesRoot, slug);
  const destination = path.join(outputRoot, slug);
  const shellDestination = path.join(shellRoot, slug);
  const existingIndex = path.join(destination, "index.html");
  const shellIndex = path.join(shellDestination, "index.html");

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

console.log(`[games] synced ${gameCatalog.length} games into PLAYROOM`);
