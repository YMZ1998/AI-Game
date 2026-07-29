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
const skipBuild = process.env.PLAYROOM_SKIP_GAME_BUILD === "1";

const gameSlugs = [
  "gold-miner",
  "doudizhu",
  "bubble-battle",
  "police-chase",
  "critical-operation",
  "tetris-game",
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

await mkdir(outputRoot, { recursive: true });

for (const slug of gameSlugs) {
  const gameRoot = path.join(gamesRoot, slug);
  const destination = path.join(outputRoot, slug);
  const existingIndex = path.join(destination, "index.html");

  if (!(await exists(path.join(gameRoot, "package.json")))) {
    if (await exists(existingIndex)) {
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
  console.log(`[games] ${slug}: embedded`);
}

console.log(`[games] synced ${gameSlugs.length} games into PLAYROOM`);
