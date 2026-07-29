const baseUrl = process.env.PLAYROOM_URL ?? "http://localhost:3003";
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const hostId = `chat-host-${suffix}`;
const guestId = `chat-guest-${suffix}`;

async function request(clientId, action) {
  const response = await fetch(
    `${baseUrl}/api/anonymous-chat/room?clientId=${encodeURIComponent(clientId)}`,
    {
      method: action ? "POST" : "GET",
      headers: action ? { "content-type": "application/json" } : undefined,
      body: action ? JSON.stringify(action) : undefined,
    },
  );
  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`);
  }
  return response.json();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await request(hostId);
const created = await request(hostId, { type: "create_room" });
assert(created.type === "chat_state", "host did not enter a room");
assert(/^[A-Z0-9]{4}$/.test(created.room.code), "room code is invalid");
assert(created.self.isHost, "creator should be host");

await request(guestId);
const joined = await request(guestId, {
  type: "join_room",
  code: created.room.code,
});
assert(joined.members.length === 2, "guest did not join the private room");
assert(joined.self.alias !== created.self.alias, "aliases should be unique");

const posted = await request(hostId, {
  type: "send_message",
  text: "今晚的局域网信号很好。",
});
assert(posted.messages.length === 1, "message was not posted");
assert(
  posted.messages[0].text === "今晚的局域网信号很好。",
  "message text changed unexpectedly",
);

const reacted = await request(guestId, {
  type: "react",
  messageId: posted.messages[0].id,
  reaction: "共鸣",
});
assert(reacted.messages[0].reactions.共鸣 === 1, "reaction was not counted");

const oldTopic = reacted.room.topic;
const nextTopic = await request(hostId, { type: "next_topic" });
assert(nextTopic.room.topic !== oldTopic, "host could not advance the topic");

const cleared = await request(hostId, { type: "clear_messages" });
assert(cleared.messages.length === 0, "host could not clear the room");

console.log(
  `Anonymous chat smoke test passed: ${created.room.code}, ${joined.members.length} members.`,
);
