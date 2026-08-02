import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createBubbleBattleService } from "../server.mjs";

let service;
let baseUrl;

before(async () => {
  service = createBubbleBattleService();
  await new Promise((resolve) => service.server.listen(0, "127.0.0.1", resolve));
  const address = service.server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await service.close();
});

async function post(path, body = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { response, body: await response.json() };
}

test("host and guest can join a room and exchange input and state", async () => {
  const created = await post("/rooms");
  assert.equal(created.response.status, 201);
  assert.match(created.body.roomCode, /^[A-Z2-9]{5}$/);

  const joined = await post(`/rooms/${created.body.roomCode}/join`);
  assert.equal(joined.response.status, 200);
  assert.equal(joined.body.playerNumber, 2);

  await post(`/rooms/${created.body.roomCode}/sync`, {
    token: joined.body.token,
    input: { keys: ["KeyW", "Escape"], bombSequence: 3 },
  });
  const hostSync = await post(`/rooms/${created.body.roomCode}/sync`, {
    token: created.body.token,
    state: { status: "playing", timeLeft: 89 },
  });
  assert.equal(hostSync.body.opponentConnected, true);
  assert.deepEqual(hostSync.body.input, {
    keys: ["KeyW"],
    bombSequence: 3,
  });

  const guestSync = await post(`/rooms/${created.body.roomCode}/sync`, {
    token: joined.body.token,
  });
  assert.deepEqual(guestSync.body.state, {
    status: "playing",
    timeLeft: 89,
  });
});

test("rooms reject extra players and invalid tokens", async () => {
  const created = await post("/rooms");
  await post(`/rooms/${created.body.roomCode}/join`);
  const extra = await post(`/rooms/${created.body.roomCode}/join`);
  assert.equal(extra.response.status, 409);

  const invalid = await post(`/rooms/${created.body.roomCode}/sync`, {
    token: "not-a-room-token",
  });
  assert.equal(invalid.response.status, 401);
});

test("inactive rooms are cleaned up", () => {
  let time = 1_000;
  const isolated = createBubbleBattleService({
    now: () => time,
    roomTtlMs: 100,
  });
  isolated.rooms.set("ABCDE", {
    createdAt: time,
    host: { lastSeen: time },
    guest: null,
  });
  time += 101;
  isolated.cleanupRooms();
  assert.equal(isolated.rooms.size, 0);
  return isolated.close();
});
