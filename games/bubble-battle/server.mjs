import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

const DEFAULT_PORT = 3012;
const ROOM_TTL_MS = 2 * 60 * 1000;
const CONNECTION_GRACE_MS = 10 * 1000;
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createToken() {
  return randomBytes(18).toString("base64url");
}

function createRoomCode(rooms) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = "";
    for (let index = 0; index < 5; index += 1) {
      code += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
  throw new Error("Unable to allocate room code");
}

function normalizeRoomCode(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z2-9]/g, "")
    .slice(0, 5);
}

function json(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 2_000_000) throw new Error("Request body is too large");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function safeInput(value) {
  const allowedKeys = new Set([
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
  ]);
  return {
    keys: Array.isArray(value?.keys)
      ? value.keys.filter((key) => allowedKeys.has(key)).slice(0, 4)
      : [],
    bombSequence:
      Number.isSafeInteger(value?.bombSequence) && value.bombSequence >= 0
        ? value.bombSequence
        : 0,
  };
}

function playerForToken(room, token) {
  if (token === room.host.token) return room.host;
  if (token === room.guest?.token) return room.guest;
  return null;
}

export function createBubbleBattleService({
  now = () => Date.now(),
  roomTtlMs = ROOM_TTL_MS,
  connectionGraceMs = CONNECTION_GRACE_MS,
} = {}) {
  const rooms = new Map();

  function cleanupRooms() {
    const currentTime = now();
    for (const [code, room] of rooms) {
      const lastSeen = Math.max(
        room.host.lastSeen,
        room.guest?.lastSeen ?? room.createdAt,
      );
      if (currentTime - lastSeen > roomTtlMs) rooms.delete(code);
    }
  }

  const cleanupTimer = setInterval(cleanupRooms, 15_000);
  cleanupTimer.unref?.();

  const server = createServer(async (request, response) => {
    if (!request.url) return json(response, 404, { error: "Not found" });
    if (request.method === "OPTIONS") {
      response.writeHead(204, {
        "access-control-allow-headers": "content-type",
        "access-control-allow-methods": "POST,DELETE,OPTIONS",
      });
      return response.end();
    }

    const url = new URL(request.url, "http://localhost");
    const parts = url.pathname.split("/").filter(Boolean);

    try {
      if (
        request.method === "POST" &&
        parts.length === 1 &&
        parts[0] === "rooms"
      ) {
        cleanupRooms();
        const code = createRoomCode(rooms);
        const token = createToken();
        rooms.set(code, {
          code,
          createdAt: now(),
          host: { role: "host", token, lastSeen: now() },
          guest: null,
          state: null,
          guestInput: safeInput(),
        });
        return json(response, 201, {
          roomCode: code,
          token,
          role: "host",
          playerNumber: 1,
        });
      }

      const code = normalizeRoomCode(parts[1]);
      const room = rooms.get(code);
      if (!room) return json(response, 404, { error: "房间不存在或已过期" });

      if (
        request.method === "POST" &&
        parts[0] === "rooms" &&
        parts[2] === "join"
      ) {
        if (room.guest) {
          return json(response, 409, { error: "房间已经满员" });
        }
        const token = createToken();
        room.guest = { role: "guest", token, lastSeen: now() };
        return json(response, 200, {
          roomCode: code,
          token,
          role: "guest",
          playerNumber: 2,
        });
      }

      if (
        request.method === "POST" &&
        parts[0] === "rooms" &&
        parts[2] === "sync"
      ) {
        const body = await readJson(request);
        const player = playerForToken(room, body.token);
        if (!player) return json(response, 401, { error: "房间凭证无效" });
        player.lastSeen = now();

        if (player.role === "host" && body.state) {
          room.state = body.state;
        } else if (player.role === "guest") {
          room.guestInput = safeInput(body.input);
        }

        const opponent = player.role === "host" ? room.guest : room.host;
        const opponentConnected = Boolean(
          opponent && now() - opponent.lastSeen <= connectionGraceMs,
        );
        return json(response, 200, {
          roomCode: code,
          role: player.role,
          opponentJoined: Boolean(opponent),
          opponentConnected,
          state: player.role === "guest" ? room.state : undefined,
          input: player.role === "host" ? room.guestInput : undefined,
        });
      }

      if (
        request.method === "DELETE" &&
        parts[0] === "rooms" &&
        parts.length === 2
      ) {
        const body = await readJson(request);
        const player = playerForToken(room, body.token);
        if (!player) return json(response, 401, { error: "房间凭证无效" });
        if (player.role === "host") {
          rooms.delete(code);
        } else {
          room.guest = null;
          room.state = null;
          room.guestInput = safeInput();
        }
        return json(response, 200, { ok: true });
      }

      return json(response, 404, { error: "Not found" });
    } catch (error) {
      return json(response, 400, {
        error: error instanceof Error ? error.message : "Bad request",
      });
    }
  });

  return {
    server,
    rooms,
    cleanupRooms,
    close: () =>
      new Promise((resolve, reject) => {
        clearInterval(cleanupTimer);
        if (!server.listening) return resolve();
        server.closeAllConnections?.();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

export function startBubbleBattleServer({
  port = Number(process.env.PORT || DEFAULT_PORT),
  host = process.env.HOST || "127.0.0.1",
} = {}) {
  const service = createBubbleBattleService();
  service.server.listen(port, host, () => {
    console.log(`[bubble-battle] room service listening on http://${host}:${port}`);
  });
  return service;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const service = startBubbleBattleServer();
  const stop = async () => {
    await service.close();
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}
