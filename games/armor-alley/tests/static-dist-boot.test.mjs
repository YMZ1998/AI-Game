import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const publicUrl = new URL("../public/", import.meta.url);
const index = readFileSync(new URL("index.html", publicUrl), "utf8");

test("PLAYROOM boots the bundled distribution instead of the absent source tree", () => {
  assert.equal(
    existsSync(new URL("dist/js/aa-boot_bundle.js", publicUrl)),
    true,
  );
  assert.equal(existsSync(new URL("src/js/aa-boot.js", publicUrl)), false);
  assert.match(index, /let isPlayroomBuild = true;/);
  assert.match(index, /playroomURL\.searchParams\.set\('prod', '1'\);/);
  assert.match(index, /window\.history\.replaceState\(null, '', playroomURL\);/);
  assert.match(
    index,
    /isProdHost \|\| forceProd \|\| window\.aaFloppy \|\| isPlayroomBuild/,
  );
});
