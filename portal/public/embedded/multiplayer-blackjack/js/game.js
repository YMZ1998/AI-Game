const query = Qs.parse(location.search, { ignoreQueryPrefix: true });
const username = String(query.username || '').trim().slice(0, 16);
const roomid = String(query.roomid || '').trim().toUpperCase().slice(0, 12);
const bidamt = Math.max(1, Math.min(9999, Number(query.bidamt) || 100));
const type = query.type === '1' ? '1' : '0';
const isHost = type === '1';
const socketPath = location.pathname.startsWith('/embedded/')
  ? '/multiplayer-blackjack-service/socket.io'
  : '/socket.io';

const socket = io({
  path: socketPath,
  transports: ['polling'],
  upgrade: false,
  reconnectionAttempts: 8
});

let dealerCardCount = 0;
let gameHasStarted = false;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[character]);
}

function setConnection(message, state) {
  $('#connection-status')
    .text(message)
    .removeClass('is-online is-offline')
    .addClass(state || '');
}

function setTurnStatus(message) {
  $('#turn-status').text(message);
}

function appendMessage(message) {
  const list = $('#messages');
  list.append($('<li>').text(message));
  list.scrollTop(list.prop('scrollHeight'));
}

function outputRoomName(value) {
  $('#roomid').html('房间号：<span style="color:#f4bd50;">' + escapeHtml(value) + '</span>');
}

function outputUsers(users) {
  let content = '<li class="list-group-item active">玩家（' + users.length + '/6）</li>';
  content += users.map(user =>
    '<li class="list-group-item d-flex justify-content-between align-items-center">' +
    escapeHtml(user.username) +
    '<span class="badge badge-primary badge-pill">' + escapeHtml(user.bidamt) + ' 分</span></li>'
  ).join('');
  $('.list-group').html(content);

  if (isHost && !gameHasStarted) {
    const ready = users.length >= 2;
    $('#startBtnContainer')
      .removeClass('d-none')
      .prop('disabled', !ready)
      .text(ready ? '开始游戏' : '等待玩家');
    $('#waiting-tip').text(ready ? '玩家已就绪，可以开始。' : '至少需要 2 位玩家才能开始。');
  }
}

function startGame() {
  $('#startBtnContainer').prop('disabled', true).text('正在发牌…');
  socket.emit('startGame');
}

socket.on('connect', function () {
  setConnection('已连接', 'is-online');
  socket.emit('joinRoom', { username, roomid, bidamt, type });
});

socket.on('disconnect', function () {
  setConnection('连接中断，正在重连…', 'is-offline');
  $('#hit, #stand').prop('disabled', true);
});

socket.io.on('reconnect_attempt', function () {
  setConnection('正在重新连接…', 'is-offline');
});

socket.on('roomUsers', function ({ roomid: currentRoom, users }) {
  outputRoomName(currentRoom);
  outputUsers(users);
});

socket.on('room-error', function (message) {
  if (!gameHasStarted) {
    setConnection(message, 'is-offline');
    $('#waiting-tip').text(message);
  } else {
    appendMessage(message);
  }
  setTurnStatus(message);
  $('#startBtnContainer').prop('disabled', false).text('重试开始');
});

socket.on('message', appendMessage);
socket.on('chat message', appendMessage);
socket.on('chat message new', appendMessage);

$('#startBtnContainer').on('click', startGame);
$('#new-round').on('click', startGame);

$('#copy-room-button').on('click', async function () {
  try {
    await navigator.clipboard.writeText(roomid);
    $(this).text('已复制');
  } catch {
    appendMessage('房间号：' + roomid);
    $(this).text('请手动复制');
  }
  setTimeout(() => $(this).text('复制房间号'), 1400);
});

$('.right form').on('submit', function () {
  const message = $('#m').val().trim();
  if (message) socket.emit('chat message', message);
  $('#m').val('');
  return false;
});

socket.on('gameStarted', function () {
  gameHasStarted = true;
  dealerCardCount = 0;
  $('#dealerCard, #player').empty();
  $('#winner, #user, #score, #d_score').empty();
  $('#new-round').addClass('d-none');
  $('.waiting').hide();
  $('.the-reveal').show();
  $('body').css('background-image', 'linear-gradient(145deg, #0d2c20, #176347)');
  $('#bj').css('color', 'white');
  setTurnStatus('正在发牌…');
});

socket.on('list-of-users', function (data) {
  $('#players').html(data.map(player => '<b>' + escapeHtml(player.name) + '</b>').join('、'));
});

socket.on('turn-status', function (data) {
  setTurnStatus(data.socket === socket.id ? '轮到你了：请选择要牌或停牌' : '等待 ' + data.name + ' 操作');
});

socket.on('user-turn', function (turn) {
  $('#hit, #stand').prop('disabled', !turn);
  if (turn) setTurnStatus('轮到你了：请选择要牌或停牌');
});

socket.on('score', function (score) {
  let label = '你的点数：' + score;
  if (score > 21) label += ' · 爆牌';
  if (score === 21) label += ' · 二十一点！';
  $('#score').text(label);
});

socket.on('d_score', function (score) {
  let label = '庄家点数：' + score;
  if (score > 21) label += ' · 爆牌';
  $('#d_score').text(label);
});

socket.on('make-dealer-card', function (data) {
  let suit = data.suit === 'diams' ? 'diamonds' : data.suit;
  const image = document.createElement('img');
  image.id = 'dealer-card-' + dealerCardCount++;
  image.className = 'small';
  image.alt = '庄家纸牌';
  image.src = 'images/Playing-Cards/' + data.rank + '_of_' + suit + '.png';
  document.getElementById('dealerCard').appendChild(image);
});

socket.on('hide-dealer-hand', function () {
  for (let index = 1; index < dealerCardCount; index++) {
    $('#dealer-card-' + index).hide();
  }
  $('#d_score').hide();
});

socket.on('show-dealer-hand', function () {
  for (let index = 0; index < dealerCardCount; index++) {
    $('#dealer-card-' + index).show();
  }
  $('#d_score').show();
});

socket.on('make-card', function (data) {
  let suit = data.suit === 'diams' ? 'diamonds' : data.suit;
  const image = document.createElement('img');
  image.className = 'small';
  image.alt = '你的纸牌';
  image.src = 'images/Playing-Cards/' + data.rank + '_of_' + suit + '.png';
  document.getElementById('player').appendChild(image);
});

socket.on('round-result', function (data) {
  const messages = {
    win: '你赢了',
    loss: '庄家获胜',
    tie: '本局平局'
  };
  const delta = data.delta > 0 ? '+' + data.delta : String(data.delta);
  $('#user').text(messages[data.outcome] + ' · 积分 ' + delta);
});

socket.on('winner', function (data) {
  $('#winner').text(data === 'dealer' ? '庄家守住了牌桌' : data + ' 拿到了本桌最佳手牌');
});

socket.on('empty-deck', function () {
  $('#winner').text('牌堆已经用完，请由房主重新开局。');
});

socket.on('gameOver', function () {
  $('#hit, #stand').prop('disabled', true);
  setTurnStatus('本局结束');
  if (isHost) $('#new-round').removeClass('d-none');
});

$('#stand').on('click', function () {
  socket.emit('stand-button');
});

$('#hit').on('click', function () {
  socket.emit('hit');
});
