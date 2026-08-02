const assert = require('node:assert/strict');
const { after, before, beforeEach, test } = require('node:test');
const { io: createClient } = require('socket.io-client');
const {
  http,
  io,
  rooms,
  cleanupRooms,
  resetState,
  setTestTimings,
} = require('../server');

let baseUrl;
let clients = [];

function waitFor(socket, event, predicate = () => true, timeoutMs = 2_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    const handler = payload => {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });
}

async function connectPlayer({
  username,
  roomid = 'TESTROOM',
  type,
  reconnectToken,
}) {
  const socket = createClient(baseUrl, {
    transports: ['polling'],
    upgrade: false,
    reconnection: false,
    forceNew: true,
  });
  clients.push(socket);
  await waitFor(socket, 'connect');
  const joined = waitFor(
    socket,
    'roomUsers',
    payload => payload.users.some(user => user.username === username),
  );
  socket.emit('joinRoom', {
    username,
    roomid,
    bidamt: 100,
    type,
    reconnectToken,
  });
  await joined;
  return socket;
}

before(async () => {
  setTestTimings({
    turnTimeoutMs: 120,
    reconnectGraceMs: 300,
    roomTtlMs: 100,
  });
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${http.address().port}`;
});

beforeEach(() => {
  clients.forEach(client => client.disconnect());
  clients = [];
  resetState();
});

after(async () => {
  clients.forEach(client => client.disconnect());
  resetState();
  await new Promise(resolve => io.close(resolve));
});

test('a player can reconnect to the same seat during the grace period', async () => {
  const host = await connectPlayer({
    username: 'Host',
    type: '1',
    reconnectToken: 'host-token-1234',
  });
  const guest = await connectPlayer({
    username: 'Guest',
    type: '0',
    reconnectToken: 'guest-token-123',
  });

  const offlineRoster = waitFor(
    host,
    'roomUsers',
    payload =>
      payload.users.some(
        user => user.username === 'Guest' && user.connected === false,
      ),
  );
  guest.disconnect();
  await offlineRoster;

  const returning = createClient(baseUrl, {
    transports: ['polling'],
    upgrade: false,
    reconnection: false,
    forceNew: true,
  });
  clients.push(returning);
  await waitFor(returning, 'connect');
  const reconnected = waitFor(returning, 'reconnected');
  const onlineRoster = waitFor(
    host,
    'roomUsers',
    payload =>
      payload.users.length === 2 &&
      payload.users.every(user => user.connected),
  );
  returning.emit('joinRoom', {
    username: 'Guest',
    roomid: 'TESTROOM',
    bidamt: 100,
    type: '0',
    reconnectToken: 'guest-token-123',
  });
  const [, roomUsers] = await Promise.all([reconnected, onlineRoster]);
  assert.equal(roomUsers.users.length, 2);
});

test('an inactive turn automatically advances', async () => {
  const host = await connectPlayer({
    username: 'Host',
    type: '1',
    reconnectToken: 'host-token-5678',
  });
  await connectPlayer({
    username: 'Guest',
    type: '0',
    reconnectToken: 'guest-token-567',
  });

  const timedOut = waitFor(
    host,
    'chat message new',
    message => message.includes('操作超时'),
    3_000,
  );
  host.emit('startGame');
  const message = await timedOut;
  assert.match(message, /系统自动停牌/);
});

test('expired active rooms are cleaned up', async () => {
  const room = {
    roomid: 'OLDROOM',
    updatedAt: Date.now(),
    turnTimer: null,
  };
  rooms.set(room.roomid, room);
  cleanupRooms(room.updatedAt + 101);
  assert.equal(rooms.has(room.roomid), false);
});
