import assert from "node:assert/strict";

const address = process.argv[2] ?? "ws://127.0.0.1:3003/doudizhu-ws";
const httpOrigin = address
  .replace(/^ws:/, "http:")
  .replace(/^wss:/, "https:")
  .replace(/\/doudizhu-ws$/, "");
async function pollingRequest(clientId, payload) {
  const response = await fetch(
    `${httpOrigin}/api/doudizhu/room?clientId=${encodeURIComponent(clientId)}`,
    payload
      ? {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      : undefined,
  );
  assert.equal(response.status, 200);
  return response.json();
}

const pollingStates = (clientIds) =>
  Promise.all(clientIds.map((clientId) => pollingRequest(clientId)));

const pollingClientIds = [0, 1, 2].map(
  (seat) => `score-${Date.now()}-${seat}-${Math.random().toString(36).slice(2)}`,
);
await pollingStates(pollingClientIds);
const scoreRoom = await pollingRequest(pollingClientIds[0], {
  type: "create",
  name: "榜甲",
});
await pollingRequest(pollingClientIds[1], {
  type: "join",
  name: "榜乙",
  code: scoreRoom.roomCode,
});
await pollingRequest(pollingClientIds[2], {
  type: "join",
  name: "榜丙",
  code: scoreRoom.roomCode,
});
await pollingRequest(pollingClientIds[0], { type: "start" });
let states = await pollingStates(pollingClientIds);

console.log(
  JSON.stringify({
    code: scoreRoom.roomCode,
    playerCounts: states.map((state) => state.players.length),
    phases: states.map((state) => state.match?.phase),
    handCounts: states.map((state) => state.match?.hand.length),
  }),
);

for (let turn = 0; turn < 200 && states[0].match?.phase !== "finished"; turn += 1) {
  const currentSeat = states[0].match?.currentTurn;
  assert.ok(Number.isInteger(currentSeat));
  const currentState = states[currentSeat];
  if (currentState.match.phase === "bidding") {
    await pollingRequest(pollingClientIds[currentSeat], {
      type: "bid",
      score: 3,
    });
  } else if (currentState.match.hintIds.length) {
    await pollingRequest(pollingClientIds[currentSeat], {
      type: "play",
      cardIds: currentState.match.hintIds,
    });
  } else {
    await pollingRequest(pollingClientIds[currentSeat], { type: "pass" });
  }
  states = await pollingStates(pollingClientIds);
}

assert.equal(states[0].match?.phase, "finished");
assert.ok(states[0].match.playedCards.length > 0);

const botClientId = `bot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
await pollingRequest(botClientId);
const botRoom = await pollingRequest(botClientId, {
  type: "create",
  name: "房主",
});
await pollingRequest(botClientId, { type: "add_bot", seat: 1 });
const filledWithBots = await pollingRequest(botClientId, {
  type: "add_bot",
  seat: 2,
});

assert.equal(filledWithBots.players.length, 3);
assert.equal(
  filledWithBots.players.filter((player) => player.isBot).length,
  2,
);

const botMatch = await pollingRequest(botClientId, { type: "start" });
assert.equal(botMatch.match?.phase, "bidding");
assert.deepEqual(botMatch.match?.playedCards, []);

let leaderboardResponse;
let leaderboard;
for (let attempt = 0; attempt < 20; attempt += 1) {
  leaderboardResponse = await fetch(`${httpOrigin}/api/doudizhu/leaderboard`);
  assert.equal(leaderboardResponse.status, 200);
  leaderboard = await leaderboardResponse.json();
  if (leaderboard.entries.length >= 3) break;
  await new Promise((resolve) => setTimeout(resolve, 50));
}
assert.equal(leaderboardResponse.status, 200);
assert.ok(Array.isArray(leaderboard.entries));
assert.ok(leaderboard.entries.length >= 3);

console.log(
  JSON.stringify({
    code: botRoom.roomCode,
    bots: botMatch.players.filter((player) => player.isBot).map((player) => player.name),
    phase: botMatch.match?.phase,
    leaderboardEntries: leaderboard.entries.length,
  }),
);
