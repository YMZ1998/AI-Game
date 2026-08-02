import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const sourceRoot = new URL("../../games/trigger-rally/public/", import.meta.url);
const embeddedRoot = new URL("../public/embedded/trigger-rally/", import.meta.url);

async function read(root, path) {
  return readFile(new URL(path, root), "utf8");
}

for (const [label, root] of [
  ["source", sourceRoot],
  ["embedded", embeddedRoot],
]) {
  test(`Trigger Rally ${label} build has resilient startup and mounted assets`, async () => {
    const [index, client, statusbar] = await Promise.all([
      read(root, "index.html"),
      read(root, "scripts/client/client.js"),
      read(root, "scripts/templates/statusbar.jade"),
    ]);

    assert.match(index, /id="rally-boot"/);
    assert.match(index, /id="rally-boot-retry"/);
    assert.match(index, /MutationObserver/);
    assert.match(client, /window\.BASE_PATH \+ '\/a\/sounds\/checkpoint\.ogg'/);
    assert.match(client, /KEYCODE\.W/);
    assert.match(client, /KEYCODE\.A/);
    assert.match(client, /KEYCODE\.S/);
    assert.match(client, /KEYCODE\.D/);
    assert.match(statusbar, /W<\/b> or <b>Up/);
  });
}

test("Trigger Rally continues loading when IndexedDB is unavailable", async () => {
  const code = await read(sourceRoot, "scripts/util/localDB.js");
  let exported;
  const trackData = { id: "RF87t6b6", name: "Dustline" };
  const track = {
    fetch({ success }) {
      success();
    },
    toJSON() {
      return trackData;
    },
  };
  const context = {
    console: { log() {}, warn() {}, error() {} },
    define(_dependencies, factory) {
      exported = factory({
        Track: {
          findOrCreate() {
            return track;
          },
        },
      });
    },
    window: {},
  };

  vm.runInNewContext(code, context);

  const loaded = await new Promise((resolve) => {
    exported.getTrack("RF87t6b6", resolve);
  });
  assert.deepEqual(loaded, trackData);
});
