import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const portalRoot = fileURLToPath(new URL("../", import.meta.url));
const workspaceRoot = path.resolve(portalRoot, "..");
const gamesRoot = path.join(workspaceRoot, "games");

function stripDecorations(value) {
  return value.split(/[?#]/, 1)[0];
}

function isExternal(value) {
  return /^(?:[a-z]+:|\/\/|#)/i.test(value);
}

async function assertExists(filePath, context) {
  await assert.doesNotReject(
    access(filePath),
    `${context} references missing file ${filePath}`,
  );
}

async function checkEntryReferences(entryPath, publicRoot, embeddedPrefix = "") {
  const rawHtml = await readFile(entryPath, "utf8");
  const html = rawHtml.replace(/<!--[\s\S]*?-->/g, "");
  const references = [
    ...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi),
  ].map((match) => match[1]);

  for (const reference of references) {
    const clean = stripDecorations(reference);
    if (!clean || isExternal(clean) || clean.includes("{")) continue;
    if (!path.extname(clean)) continue;

    let relative = clean;
    if (clean.startsWith("/")) {
      if (embeddedPrefix && clean.startsWith(embeddedPrefix)) {
        relative = clean.slice(embeddedPrefix.length);
      } else {
        relative = clean.slice(1);
      }
    }
    const resolved = path.resolve(path.dirname(entryPath), relative);
    const fallback = path.resolve(publicRoot, relative);
    try {
      await access(resolved);
    } catch {
      await assertExists(fallback, entryPath);
    }
  }
}

test("every static game has playable source and embedded entries", async () => {
  const slugs = await readdir(gamesRoot);
  let checked = 0;

  for (const slug of slugs) {
    const gameRoot = path.join(gamesRoot, slug);
    let manifest;
    try {
      manifest = JSON.parse(
        await readFile(path.join(gameRoot, "playroom.json"), "utf8"),
      );
    } catch {
      continue;
    }
    if (manifest.type !== "static") continue;

    const sourcePublic = path.join(gameRoot, manifest.source);
    const sourceEntry = path.join(sourcePublic, manifest.entry);
    const embeddedPublic = path.join(portalRoot, "public", "embedded", slug);
    const embeddedEntry = path.join(embeddedPublic, manifest.entry);

    await assertExists(sourceEntry, `${slug} source entry`);
    await assertExists(embeddedEntry, `${slug} embedded entry`);
    await checkEntryReferences(sourceEntry, sourcePublic);
    await checkEntryReferences(
      embeddedEntry,
      embeddedPublic,
      `/embedded/${slug}/`,
    );
    checked += 1;
  }

  assert.ok(checked >= 17, `expected at least 17 static games, checked ${checked}`);
});

test("every catalog game has a portal launch page", async () => {
  const catalog = await readFile(
    path.join(portalRoot, "app", "game-catalog.ts"),
    "utf8",
  );
  const slugs = [...catalog.matchAll(/\bslug:\s*"([^"]+)"/g)].map(
    (match) => match[1],
  );

  assert.ok(slugs.length >= 24, `expected at least 24 games, found ${slugs.length}`);
  assert.equal(new Set(slugs).size, slugs.length, "catalog slugs must be unique");
  for (const slug of slugs) {
    await assertExists(
      path.join(portalRoot, "public", "play", slug, "index.html"),
      `${slug} portal launch page`,
    );
  }
});
