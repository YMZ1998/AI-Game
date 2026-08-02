const users = [];

function userJoin(id, username, roomid, bidamt, type, reconnectToken) {
  const existing = users.find(
    user =>
      user.reconnectToken === reconnectToken &&
      user.roomid === roomid &&
      user.username === username,
  );
  if (existing) {
    existing.id = id;
    existing.bidamt = bidamt;
    existing.connected = true;
    existing.disconnectedAt = null;
    return { user: existing, reconnected: true };
  }

  const user = {
    id,
    username,
    roomid,
    bidamt,
    type,
    reconnectToken,
    connected: true,
    disconnectedAt: null,
  };
  users.push(user);
  return { user, reconnected: false };
}

function getCurrentUser(id) {
  return users.find(user => user.id === id);
}

function getUserByToken(reconnectToken) {
  return users.find(user => user.reconnectToken === reconnectToken);
}

function markUserDisconnected(id, disconnectedAt = Date.now()) {
  const user = getCurrentUser(id);
  if (!user) return undefined;
  user.connected = false;
  user.disconnectedAt = disconnectedAt;
  return user;
}

function userLeaves(id) {
  const index = users.findIndex(user => user.id === id);
  if (index === -1) return undefined;
  return users.splice(index, 1)[0];
}

function removeUser(user) {
  const index = users.indexOf(user);
  if (index === -1) return undefined;
  return users.splice(index, 1)[0];
}

function getRoomUsers(roomid) {
  return users.filter(user => user.roomid === roomid);
}

function clearUsers() {
  users.splice(0, users.length);
}

module.exports = {
  userJoin,
  getCurrentUser,
  getUserByToken,
  markUserDisconnected,
  userLeaves,
  removeUser,
  getRoomUsers,
  clearUsers,
};
