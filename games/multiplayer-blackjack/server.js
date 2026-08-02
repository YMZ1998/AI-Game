const express = require('express');
const httpModule = require('http');
const path = require('path');
const {
  userJoin,
  getCurrentUser,
  getUserByToken,
  markUserDisconnected,
  removeUser,
  getRoomUsers,
  clearUsers,
} = require('./utils/users');

const app = express();
const http = httpModule.Server(app);
const io = require('socket.io')(http);
const rooms = new Map();
const lobbyActivity = new Map();
const disconnectTimers = new Map();
const suits = ['hearts', 'diams', 'clubs', 'spades'];
const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
let turnTimeoutMs = Number(process.env.TURN_TIMEOUT_MS || 20_000);
let reconnectGraceMs = Number(process.env.RECONNECT_GRACE_MS || 20_000);
let roomTtlMs = Number(process.env.ROOM_TTL_MS || 15 * 60_000);

app.use(express.static(path.join(__dirname, 'public')));

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function createDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) deck.push({ suit, rank });
  }
  for (let index = deck.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  return deck;
}

function addCard(hand, card) {
  if (Array.isArray(hand.cards)) hand.cards.push(card);
  if (card.rank === 'A') {
    hand.total += 11;
    hand.aces++;
  } else if (['J', 'Q', 'K'].includes(card.rank)) {
    hand.total += 10;
  } else {
    hand.total += Number(card.rank);
  }
  while (hand.total > 21 && hand.aces > 0) {
    hand.total -= 10;
    hand.aces--;
  }
}

function touchRoom(room) {
  room.updatedAt = Date.now();
  lobbyActivity.set(room.roomid, room.updatedAt);
}

function touchLobby(roomid) {
  lobbyActivity.set(roomid, Date.now());
}

function drawCard(room) {
  const card = room.deck.pop();
  if (!card) io.to(room.roomid).emit('empty-deck');
  else touchRoom(room);
  return card;
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    roomid: user.roomid,
    bidamt: user.bidamt,
    type: user.type,
    connected: user.connected,
  };
}

function roomUsersPayload(roomid) {
  io.to(roomid).emit('roomUsers', {
    roomid,
    users: getRoomUsers(roomid).map(publicUser),
  });
}

function clearTurnTimer(room) {
  if (room.turnTimer) clearTimeout(room.turnTimer);
  room.turnTimer = null;
  room.turnDeadline = null;
}

function settleRoom(room) {
  if (room.finished) return;
  clearTurnTimer(room);
  io.to(room.roomid).emit('user-turn', false);
  io.to(room.roomid).emit('show-dealer-hand');

  while (room.dealer.total < 17) {
    const card = drawCard(room);
    if (!card) break;
    addCard(room.dealer, card);
    io.to(room.roomid).emit('make-dealer-card', card);
  }
  io.to(room.roomid).emit('d_score', room.dealer.total);

  let tableWinner = 'dealer';
  let bestScore = room.dealer.total <= 21 ? room.dealer.total : 0;
  room.players.forEach(player => {
    let outcome = 'loss';
    if (!player.forfeited && player.hand.total <= 21) {
      if (room.dealer.total > 21 || player.hand.total > room.dealer.total) {
        outcome = 'win';
      } else if (player.hand.total === room.dealer.total) {
        outcome = 'tie';
      }
    }
    const delta =
      outcome === 'win' ? player.bet : outcome === 'loss' ? -player.bet : 0;
    player.result = {
      outcome,
      delta,
      playerScore: player.hand.total,
      dealerScore: room.dealer.total,
    };
    if (player.connected) io.to(player.socket).emit('round-result', player.result);
    if (outcome === 'win' && player.hand.total > bestScore) {
      bestScore = player.hand.total;
      tableWinner = player.name;
    }
  });

  room.finished = true;
  room.tableWinner = tableWinner;
  touchRoom(room);
  io.to(room.roomid).emit('winner', tableWinner);
  io.to(room.roomid).emit('gameOver');
}

function advanceTurn(room) {
  clearTurnTimer(room);
  const current = room.players[room.currentIndex];
  if (current?.connected) io.to(current.socket).emit('user-turn', false);
  room.currentIndex++;
  emitTurn(room);
}

function emitTurn(room) {
  clearTurnTimer(room);
  while (room.players[room.currentIndex]?.forfeited) room.currentIndex++;
  const current = room.players[room.currentIndex];
  if (!current) {
    settleRoom(room);
    return;
  }

  room.players.forEach(player => {
    if (player.connected) {
      io.to(player.socket).emit(
        'user-turn',
        player.token === current.token,
      );
    }
  });
  room.turnDeadline = Date.now() + turnTimeoutMs;
  io.to(room.roomid).emit('turn-status', {
    name: current.name,
    socket: current.socket,
    playerToken: current.token,
    deadline: room.turnDeadline,
  });
  room.turnTimer = setTimeout(() => {
    if (room.finished || room.players[room.currentIndex]?.token !== current.token) {
      return;
    }
    io.to(room.roomid).emit(
      'chat message new',
      `${current.name} 操作超时，系统自动停牌`,
    );
    advanceTurn(room);
  }, turnTimeoutMs);
  room.turnTimer.unref?.();
  touchRoom(room);
}

function startRoom(roomid) {
  const waitingUsers = getRoomUsers(roomid).filter(user => user.connected);
  const previous = rooms.get(roomid);
  if (previous) clearTurnTimer(previous);
  const room = {
    roomid,
    deck: createDeck(),
    dealer: { total: 0, aces: 0, cards: [] },
    players: waitingUsers.map(user => ({
      name: user.username,
      socket: user.id,
      token: user.reconnectToken,
      connected: true,
      forfeited: false,
      bet: Math.max(1, Math.min(9999, Number(user.bidamt) || 100)),
      hand: { total: 0, aces: 0, cards: [] },
      result: null,
    })),
    currentIndex: 0,
    finished: false,
    tableWinner: null,
    turnTimer: null,
    turnDeadline: null,
    updatedAt: Date.now(),
  };
  rooms.set(roomid, room);

  io.to(roomid).emit('gameStarted');
  io.to(roomid).emit('list-of-users', room.players);
  for (let index = 0; index < 2; index++) {
    const dealerCard = drawCard(room);
    if (dealerCard) {
      addCard(room.dealer, dealerCard);
      io.to(roomid).emit('make-dealer-card', dealerCard);
    }
  }
  room.players.forEach(player => {
    for (let index = 0; index < 2; index++) {
      const card = drawCard(room);
      if (card) {
        addCard(player.hand, card);
        io.to(player.socket).emit('make-card', card);
      }
    }
    io.to(player.socket).emit('score', player.hand.total);
  });
  io.to(roomid).emit('d_score', room.dealer.total);
  io.to(roomid).emit('hide-dealer-hand');

  if (room.dealer.total === 21) {
    settleRoom(room);
    return room;
  }
  while (
    room.players[room.currentIndex] &&
    room.players[room.currentIndex].hand.total >= 21
  ) {
    room.currentIndex++;
  }
  emitTurn(room);
  return room;
}

function syncPlayerState(socket, room, player) {
  socket.emit('gameStarted');
  socket.emit('list-of-users', room.players);
  room.dealer.cards.forEach(card => socket.emit('make-dealer-card', card));
  player.hand.cards.forEach(card => socket.emit('make-card', card));
  socket.emit('score', player.hand.total);
  socket.emit('d_score', room.dealer.total);

  if (room.finished) {
    socket.emit('show-dealer-hand');
    if (player.result) socket.emit('round-result', player.result);
    socket.emit('winner', room.tableWinner);
    socket.emit('user-turn', false);
    socket.emit('gameOver');
    return;
  }

  socket.emit('hide-dealer-hand');
  const current = room.players[room.currentIndex];
  socket.emit('user-turn', current?.token === player.token);
  if (current) {
    socket.emit('turn-status', {
      name: current.name,
      socket: current.socket,
      playerToken: current.token,
      deadline: room.turnDeadline,
    });
  }
}

function promoteHost(roomid) {
  const users = getRoomUsers(roomid);
  if (users.some(user => user.type === '1' && user.connected)) return;
  const nextHost = users.find(user => user.connected);
  if (!nextHost) return;
  users.forEach(user => {
    user.type = user === nextHost ? '1' : '0';
  });
  io.to(roomid).emit('host-changed', {
    socket: nextHost.id,
    playerToken: nextHost.reconnectToken,
    name: nextHost.username,
  });
}

function finishDisconnect(user) {
  disconnectTimers.delete(user.reconnectToken);
  if (user.connected) return;
  const room = rooms.get(user.roomid);
  if (room && !room.finished) {
    const player = room.players.find(entry => entry.token === user.reconnectToken);
    if (player) {
      player.connected = false;
      player.forfeited = true;
      io.to(user.roomid).emit(
        'message',
        `${user.username} 未能重连，本局按停牌处理`,
      );
      if (room.players[room.currentIndex]?.token === player.token) advanceTurn(room);
      touchRoom(room);
    }
  }

  const wasHost = user.type === '1';
  removeUser(user);
  if (wasHost) promoteHost(user.roomid);
  roomUsersPayload(user.roomid);
  io.to(user.roomid).emit('message', `${user.username} 离开了房间`);

  if (!getRoomUsers(user.roomid).length) {
    const emptyRoom = rooms.get(user.roomid);
    if (emptyRoom) clearTurnTimer(emptyRoom);
    rooms.delete(user.roomid);
    lobbyActivity.delete(user.roomid);
  } else {
    touchLobby(user.roomid);
  }
}

function cleanupRooms(now = Date.now()) {
  const candidates = new Map(lobbyActivity);
  for (const [roomid, room] of rooms) {
    if (!candidates.has(roomid)) candidates.set(roomid, room.updatedAt);
  }
  for (const [roomid, updatedAt] of candidates) {
    if (now - updatedAt <= roomTtlMs) continue;
    const room = rooms.get(roomid);
    if (room) clearTurnTimer(room);
    rooms.delete(roomid);
    for (const user of getRoomUsers(roomid)) {
      io.sockets.sockets.get(user.id)?.disconnect(true);
      removeUser(user);
    }
    lobbyActivity.delete(roomid);
  }
}

const cleanupInterval = setInterval(cleanupRooms, 30_000);
cleanupInterval.unref?.();

io.on('connection', socket => {
  socket.on('joinRoom', payload => {
    if (getCurrentUser(socket.id)) return;
    const username = cleanText(payload?.username, 16);
    const roomid = cleanText(payload?.roomid, 12).toUpperCase();
    const bidamt = Math.max(1, Math.min(9999, Number(payload?.bidamt) || 100));
    const type = payload?.type === '1' ? '1' : '0';
    const reconnectToken = cleanText(payload?.reconnectToken, 64);

    if (
      !username ||
      !/^[A-Z0-9]+$/.test(roomid) ||
      !/^[A-Za-z0-9_-]{12,64}$/.test(reconnectToken)
    ) {
      socket.emit('room-error', '玩家名称、房间号或重连凭证无效。');
      return;
    }

    const reconnectingUser = getUserByToken(reconnectToken);
    if (
      reconnectingUser &&
      (reconnectingUser.roomid !== roomid ||
        reconnectingUser.username !== username)
    ) {
      socket.emit('room-error', '重连凭证与玩家信息不匹配。');
      return;
    }

    const waitingUsers = getRoomUsers(roomid);
    const activeRoom = rooms.get(roomid);
    if (!reconnectingUser) {
      if (type !== '1' && !waitingUsers.some(user => user.type === '1')) {
        socket.emit('room-error', '房间不存在，请检查房间号。');
        return;
      }
      if (type === '1' && waitingUsers.length) {
        socket.emit('room-error', '房间号已被使用。');
        return;
      }
      if (activeRoom && !activeRoom.finished) {
        socket.emit('room-error', '本局已经开始，请等待下一局。');
        return;
      }
      if (waitingUsers.length >= 6) {
        socket.emit('room-error', '房间已满，最多支持 6 位玩家。');
        return;
      }
    }

    const { user, reconnected } = userJoin(
      socket.id,
      username,
      roomid,
      bidamt,
      type,
      reconnectToken,
    );
    socket.join(roomid);
    touchLobby(roomid);
    const pendingTimer = disconnectTimers.get(reconnectToken);
    if (pendingTimer) clearTimeout(pendingTimer);
    disconnectTimers.delete(reconnectToken);

    if (activeRoom) {
      const player = activeRoom.players.find(entry => entry.token === reconnectToken);
      if (player) {
        player.socket = socket.id;
        player.connected = true;
        player.forfeited = false;
        touchRoom(activeRoom);
        syncPlayerState(socket, activeRoom, player);
      }
    }
    roomUsersPayload(roomid);
    if (reconnected) {
      io.to(roomid).emit('message', `${username} 已重新连接`);
      socket.emit('reconnected');
    } else {
      io.to(roomid).emit('message', `${username} 加入了房间`);
    }
  });

  socket.on('chat message', message => {
    const user = getCurrentUser(socket.id);
    if (!user) return;
    const text = cleanText(message, 160);
    if (text) {
      touchLobby(user.roomid);
      io.to(user.roomid).emit('chat message new', `${user.username}：${text}`);
    }
  });

  socket.on('startGame', () => {
    const user = getCurrentUser(socket.id);
    if (!user || user.type !== '1') {
      socket.emit('room-error', '只有房主可以开始游戏。');
      return;
    }
    const waitingUsers = getRoomUsers(user.roomid).filter(entry => entry.connected);
    if (waitingUsers.length < 2) {
      socket.emit('room-error', '至少需要 2 位在线玩家才能开始。');
      return;
    }
    const existingRoom = rooms.get(user.roomid);
    if (existingRoom && !existingRoom.finished) {
      socket.emit('room-error', '本局已经开始。');
      return;
    }
    startRoom(user.roomid);
  });

  socket.on('hit', () => {
    const user = getCurrentUser(socket.id);
    const room = user && rooms.get(user.roomid);
    if (!room || room.finished) return;
    const player = room.players[room.currentIndex];
    if (!player || player.token !== user.reconnectToken) {
      socket.emit('room-error', '还没有轮到你。');
      return;
    }
    const card = drawCard(room);
    if (!card) return;
    addCard(player.hand, card);
    socket.emit('make-card', card);
    socket.emit('score', player.hand.total);
    if (player.hand.total >= 21) advanceTurn(room);
    else emitTurn(room);
  });

  socket.on('stand-button', () => {
    const user = getCurrentUser(socket.id);
    const room = user && rooms.get(user.roomid);
    if (!room || room.finished) return;
    const player = room.players[room.currentIndex];
    if (!player || player.token !== user.reconnectToken) {
      socket.emit('room-error', '还没有轮到你。');
      return;
    }
    io.to(room.roomid).emit(
      'chat message new',
      `${player.name} 以 ${player.hand.total} 点停牌`,
    );
    advanceTurn(room);
  });

  socket.on('disconnect', () => {
    const user = markUserDisconnected(socket.id);
    if (!user) return;
    const room = rooms.get(user.roomid);
    const player = room?.players.find(entry => entry.token === user.reconnectToken);
    if (player) player.connected = false;
    roomUsersPayload(user.roomid);
    io.to(user.roomid).emit(
      'message',
      `${user.username} 连接中断，保留座位 ${Math.ceil(reconnectGraceMs / 1000)} 秒`,
    );
    const timer = setTimeout(() => finishDisconnect(user), reconnectGraceMs);
    timer.unref?.();
    disconnectTimers.set(user.reconnectToken, timer);
  });
});

function setTestTimings(values = {}) {
  if (values.turnTimeoutMs) turnTimeoutMs = values.turnTimeoutMs;
  if (values.reconnectGraceMs) reconnectGraceMs = values.reconnectGraceMs;
  if (values.roomTtlMs) roomTtlMs = values.roomTtlMs;
}

function resetState() {
  for (const timer of disconnectTimers.values()) clearTimeout(timer);
  disconnectTimers.clear();
  for (const room of rooms.values()) clearTurnTimer(room);
  rooms.clear();
  lobbyActivity.clear();
  clearUsers();
}

const port = Number(process.env.PORT || 8080);
if (require.main === module) {
  http.listen(port, '127.0.0.1', () => {
    console.log(`multiplayer blackjack listening on *:${port}`);
  });
}

module.exports = {
  app,
  http,
  io,
  rooms,
  createDeck,
  addCard,
  cleanupRooms,
  resetState,
  setTestTimings,
};
