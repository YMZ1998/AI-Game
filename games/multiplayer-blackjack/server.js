const express = require('express');
const httpModule = require('http');
const path = require('path');
const { userJoin, getCurrentUser, userLeaves, getRoomUsers } = require('./utils/users');

const app = express();
const http = httpModule.Server(app);
const io = require('socket.io')(http);
const rooms = new Map();
const suits = ['hearts', 'diams', 'clubs', 'spades'];
const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];

app.use(express.static(path.join(__dirname, 'public')));

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function createDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  for (let index = deck.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }
  return deck;
}

function addCard(hand, card) {
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

function drawCard(room) {
  const card = room.deck.pop();
  if (!card) io.to(room.roomid).emit('empty-deck');
  return card;
}

function roomUsersPayload(roomid) {
  io.to(roomid).emit('roomUsers', {
    roomid,
    users: getRoomUsers(roomid)
  });
}

function emitTurn(room) {
  const current = room.players[room.currentIndex];
  if (!current) {
    settleRoom(room);
    return;
  }

  room.players.forEach(player => {
    io.to(player.socket).emit('user-turn', player.socket === current.socket);
  });
  io.to(room.roomid).emit('turn-status', {
    name: current.name,
    socket: current.socket
  });
}

function settleRoom(room) {
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
    if (player.hand.total <= 21) {
      if (room.dealer.total > 21 || player.hand.total > room.dealer.total) {
        outcome = 'win';
      } else if (player.hand.total === room.dealer.total) {
        outcome = 'tie';
      }
    }

    const delta = outcome === 'win' ? player.bet : outcome === 'loss' ? -player.bet : 0;
    io.to(player.socket).emit('round-result', {
      outcome,
      delta,
      playerScore: player.hand.total,
      dealerScore: room.dealer.total
    });

    if (outcome === 'win' && player.hand.total > bestScore) {
      bestScore = player.hand.total;
      tableWinner = player.name;
    }
  });

  room.finished = true;
  io.to(room.roomid).emit('winner', tableWinner);
  io.to(room.roomid).emit('gameOver');
}

function advanceTurn(room) {
  const current = room.players[room.currentIndex];
  if (current) io.to(current.socket).emit('user-turn', false);
  room.currentIndex++;
  emitTurn(room);
}

function startRoom(roomid) {
  const waitingUsers = getRoomUsers(roomid);
  const room = {
    roomid,
    deck: createDeck(),
    dealer: { total: 0, aces: 0 },
    players: waitingUsers.map(user => ({
      name: user.username,
      socket: user.id,
      bet: Math.max(1, Math.min(9999, Number(user.bidamt) || 100)),
      hand: { total: 0, aces: 0 }
    })),
    currentIndex: 0,
    finished: false
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
    return;
  }
  while (
    room.players[room.currentIndex] &&
    room.players[room.currentIndex].hand.total >= 21
  ) {
    room.currentIndex++;
  }
  emitTurn(room);
}

io.on('connection', socket => {
  socket.on('joinRoom', payload => {
    if (getCurrentUser(socket.id)) return;

    const username = cleanText(payload && payload.username, 16);
    const roomid = cleanText(payload && payload.roomid, 12).toUpperCase();
    const bidamt = Math.max(1, Math.min(9999, Number(payload && payload.bidamt) || 100));
    const type = payload && payload.type === '1' ? '1' : '0';

    if (!username || !/^[A-Z0-9]+$/.test(roomid)) {
      socket.emit('room-error', '玩家名称或房间号无效。');
      return;
    }

    const waitingUsers = getRoomUsers(roomid);
    if (type !== '1' && !waitingUsers.some(user => user.type === '1')) {
      socket.emit('room-error', '房间不存在，请检查房间号。');
      return;
    }
    if (waitingUsers.length >= 6) {
      socket.emit('room-error', '房间已满，最多支持 6 位玩家。');
      return;
    }

    const user = userJoin(socket.id, username, roomid, bidamt, type);
    socket.join(roomid);
    roomUsersPayload(user.roomid);
    io.to(roomid).emit('message', username + ' 加入了房间');
  });

  socket.on('chat message', message => {
    const user = getCurrentUser(socket.id);
    if (!user) return;
    const text = cleanText(message, 160);
    if (text) io.to(user.roomid).emit('chat message new', user.username + '：' + text);
  });

  socket.on('startGame', () => {
    const user = getCurrentUser(socket.id);
    if (!user || user.type !== '1') {
      socket.emit('room-error', '只有房主可以开始游戏。');
      return;
    }

    const waitingUsers = getRoomUsers(user.roomid);
    if (waitingUsers.length < 2) {
      socket.emit('room-error', '至少需要 2 位玩家才能开始。');
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
    if (!player || player.socket !== socket.id) {
      socket.emit('room-error', '还没有轮到你。');
      return;
    }

    const card = drawCard(room);
    if (!card) return;
    addCard(player.hand, card);
    socket.emit('make-card', card);
    socket.emit('score', player.hand.total);

    if (player.hand.total >= 21) advanceTurn(room);
  });

  socket.on('stand-button', () => {
    const user = getCurrentUser(socket.id);
    const room = user && rooms.get(user.roomid);
    if (!room || room.finished) return;

    const player = room.players[room.currentIndex];
    if (!player || player.socket !== socket.id) {
      socket.emit('room-error', '还没有轮到你。');
      return;
    }

    io.to(room.roomid).emit('chat message new', player.name + ' 以 ' + player.hand.total + ' 点停牌');
    advanceTurn(room);
  });

  socket.on('disconnect', () => {
    const user = userLeaves(socket.id);
    if (!user) return;

    const room = rooms.get(user.roomid);
    if (room && !room.finished) {
      rooms.delete(user.roomid);
      io.to(user.roomid).emit('room-error', '有玩家离线，本局已结束，房主可重新开始。');
      io.to(user.roomid).emit('gameOver');
    }

    roomUsersPayload(user.roomid);
    io.to(user.roomid).emit('message', user.username + ' 离开了房间');
  });
});

const port = Number(process.env.PORT || 8080);
if (require.main === module) {
  http.listen(port, '127.0.0.1', () => {
    console.log('multiplayer blackjack listening on *:' + port);
  });
}

module.exports = { app, http, io, createDeck, addCard };
