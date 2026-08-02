import assert from "node:assert/strict";
import { access, readdir, stat } from "node:fs/promises";
import test from "node:test";

test("omits development-only archives and legacy demo assets", async () => {
  const removedAssets = [
    "../public/embedded/solitairey/ChromeWebStore_Badge_v2_206x58.png",
    "../public/embedded/hexgl/package.zip",
    "../public/embedded/hexgl/package.webapp",
    "../public/embedded/hexgl/libs/Three.r53.js",
    "../public/embedded/javascript-racer/v1.straight.html",
    "../public/embedded/javascript-racer/v2.curves.html",
    "../public/embedded/javascript-racer/v3.hills.html",
  ];

  for (const relative of removedAssets) {
    await assert.rejects(access(new URL(relative, import.meta.url)));
  }

  await access(
    new URL(
      "../public/embedded/solitairey/js/yui-unpack/yui/build/yui/yui-debug.js",
      import.meta.url,
    ),
  );
  await access(
    new URL("../public/embedded/javascript-racer/v4.final.html", import.meta.url),
  );
});

test("ships no instrumented YUI coverage bundles", async () => {
  const buildRoot = new URL(
    "../public/embedded/solitairey/js/yui-unpack/yui/build/",
    import.meta.url,
  );
  const modules = await readdir(buildRoot);
  let coverageFiles = 0;

  for (const moduleName of modules) {
    const moduleRoot = new URL(`${moduleName}/`, buildRoot);
    if (!(await stat(moduleRoot)).isDirectory()) continue;
    const files = await readdir(moduleRoot);
    coverageFiles += files.filter((file) => file.endsWith("-coverage.js")).length;
  }

  assert.equal(coverageFiles, 0);
});
