import WebSocket from "ws";
import assert from "node:assert/strict";

const address = process.argv[2] ?? "ws://127.0.0.1:3003/doudizhu-ws";
const inboxes = new WeakMap();

function connect() {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(address);
    const inbox = { messages: [], waiters: [] };
    inboxes.set(socket, inbox);
    socket.on("message", (data) => {
      const message = JSON.parse(data.toString());
      const waiter = inbox.waiters.shift();
      if (waiter) waiter(message);
      else inbox.messages.push(message);
    });
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

function next(socket) {
  const inbox = inboxes.get(socket);
  const existing = inbox.messages.shift();
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve) => {
    inbox.waiters.push(resolve);
  });
}

function send(socket, payload) {
  socket.send(JSON.stringify(payload));
}

const sockets = await Promise.all([connect(), connect(), connect()]);
await Promise.all(sockets.map(next));

send(sockets[0], { type: "create", name: "甲" });
const created = await next(sockets[0]);
const code = created.roomCode;

send(sockets[1], { type: "join", name: "乙", code });
await Promise.all([next(sockets[0]), next(sockets[1])]);

send(sockets[2], { type: "join", name: "丙", code });
await Promise.all(sockets.map(next));

send(sockets[0], { type: "start" });
const states = await Promise.all(sockets.map(next));

console.log(
  JSON.stringify({
    code,
    playerCounts: states.map((state) => state.players.length),
    phases: states.map((state) => state.match?.phase),
    handCounts: states.map((state) => state.match?.hand.length),
  }),
);

for (const socket of sockets) socket.close();

const botHost = await connect();
await next(botHost);
send(botHost, { type: "create", name: "房主" });
const botRoom = await next(botHost);

send(botHost, { type: "add_bot", seat: 1 });
await next(botHost);
send(botHost, { type: "add_bot", seat: 2 });
const filledWithBots = await next(botHost);

assert.equal(filledWithBots.players.length, 3);
assert.equal(
  filledWithBots.players.filter((player) => player.isBot).length,
  2,
);

send(botHost, { type: "start" });
const botMatch = await next(botHost);
assert.equal(botMatch.match?.phase, "bidding");

console.log(
  JSON.stringify({
    code: botRoom.roomCode,
    bots: botMatch.players.filter((player) => player.isBot).map((player) => player.name),
    phase: botMatch.match?.phase,
  }),
);

botHost.close();
