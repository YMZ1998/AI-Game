import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import process from "node:process";
import { WebSocket } from "ws";

const portalRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(portalRoot, "..");

async function reservePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = address.port;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

async function retry(check, label) {
  let lastError;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      return await check();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(
    `${label} did not become ready: ${lastError?.message || "unknown error"}`,
  );
}

async function openWebSocket(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.terminate();
      reject(new Error("WebSocket open timed out"));
    }, 3_000);
    socket.once("open", () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
  socket.close();
}

async function runService({ name, serverFile, verify }) {
  const port = await reservePort();
  const output = [];
  const child = spawn(process.execPath, [serverFile], {
    cwd: path.dirname(serverFile),
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  child.stdout.on("data", (chunk) => output.push(chunk.toString()));
  child.stderr.on("data", (chunk) => output.push(chunk.toString()));

  try {
    await verify(port);
    assert.equal(child.exitCode, null, `${name} exited during verification`);
    return { name, port };
  } catch (error) {
    throw new Error(
      `${name} smoke test failed: ${error.message}\n${output.join("").slice(-2000)}`,
    );
  } finally {
    child.kill();
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 1_000)),
    ]);
  }
}

const microRacing = await runService({
  name: "Micro Racing",
  serverFile: path.join(
    workspaceRoot,
    "games",
    "micro-racing",
    "server",
    "server.js",
  ),
  verify: (port) =>
    retry(
      () => openWebSocket(`ws://127.0.0.1:${port}/`),
      "Micro Racing WebSocket",
    ),
});

const tosios = await runService({
  name: "TOSIOS",
  serverFile: path.join(
    workspaceRoot,
    "games",
    "tosios",
    "server",
    "tosios-server.cjs",
  ),
  verify: async (port) => {
    const origin = `http://127.0.0.1:${port}`;
    const health = await retry(async () => {
      const response = await fetch(`${origin}/health`);
      assert.equal(response.status, 200);
      return response.json();
    }, "TOSIOS health endpoint");
    assert.deepEqual(health, { ok: true, service: "tosios-local" });

    const reservation = await fetch(
      `${origin}/matchmake/joinOrCreate/game`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          playerName: "Smoke Player",
          roomName: "Smoke Room",
          roomMap: "small",
          roomMaxPlayers: 2,
          mode: "deathmatch",
        }),
      },
    );
    assert.equal(reservation.status, 200);
    const room = await reservation.json();
    assert.ok(room.room?.roomId || room.roomId);

    const roomsResponse = await fetch(`${origin}/matchmake/game`);
    assert.equal(roomsResponse.status, 200);
    const rooms = await roomsResponse.json();
    assert.ok(Array.isArray(rooms));
    assert.ok(rooms.length >= 1);
  },
});

console.log(
  JSON.stringify({
    ok: true,
    services: [microRacing.name, tosios.name],
  }),
);
