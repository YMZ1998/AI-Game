import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { networkInterfaces } from "node:os";
import type { Plugin, ViteDevServer } from "vite";
import { WebSocketServer } from "ws";

type SocketLike = {
  readyState: number;
  send(payload: string): void;
  on(
    event: "message" | "close",
    listener: (raw: { toString(): string }) => void,
  ): unknown;
};

type ReactionKey = "共鸣" | "好奇" | "哈哈";

type StoredImage = {
  dataUrl: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  byteLength: number;
};

type Member = {
  id: string;
  socket: SocketLike;
  alias: string;
  color: number;
  joinedAt: number;
  lastMessageAt: number;
};

type Message = {
  id: string;
  memberId: string;
  alias: string;
  color: number;
  text: string;
  image: StoredImage | null;
  sentAt: string;
  reactions: Record<ReactionKey, Set<string>>;
};

type Room = {
  code: string;
  isPublic: boolean;
  hostId: string;
  topicIndex: number;
  members: Map<string, Member>;
  messages: Message[];
  createdAt: number;
};

type Membership = {
  code: string;
  memberId: string;
};

type ClientMessage = {
  type?: string;
  code?: unknown;
  text?: unknown;
  image?: unknown;
  messageId?: unknown;
  reaction?: unknown;
};

const TOPICS = [
  "最近哪一件小事，让你觉得生活其实还不错？",
  "如果今晚不用考虑任何后果，你最想去哪里？",
  "有什么话你很少对熟人说，却愿意告诉陌生人？",
  "你最近一次改变想法，是因为什么？",
  "哪一种声音，会让你立刻感到安心？",
  "如果可以把一种情绪寄存到明天，你会留下哪一种？",
  "最近有没有一个瞬间，你希望时间慢一点？",
  "你想对一年前的自己说一句什么？",
  "什么事情看起来很小，却一直被你认真珍惜？",
  "今晚最适合用哪一首歌作为背景？为什么？",
  "如果明天醒来获得一种勇气，你希望是哪一种？",
  "你曾被陌生人的哪一种善意打动？",
];

const ALIAS_PREFIXES = [
  "迟到的",
  "安静的",
  "迷路的",
  "清醒的",
  "柔软的",
  "微亮的",
  "逆风的",
  "等雨的",
  "收藏月光的",
  "路过凌晨的",
];

const ALIAS_NOUNS = [
  "海鸥",
  "松针",
  "橘灯",
  "云朵",
  "鲸歌",
  "旅人",
  "野猫",
  "纸船",
  "萤火",
  "唱片",
  "蒲公英",
  "旧车站",
];

const REACTIONS = new Set<ReactionKey>(["共鸣", "好奇", "哈哈"]);
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const OPEN_ROOM_CODE = "OPEN";
const MAX_MESSAGES = 80;
const MAX_MEMBERS = 30;
const SEND_INTERVAL_MS = 650;
const MAX_IMAGE_BYTES = 1_500_000;
const MAX_ROOM_IMAGE_BYTES = 12_000_000;
const MAX_IMAGE_DATA_URL_LENGTH = 2_100_000;
const MAX_REQUEST_BYTES = 2_200_000;
const IMAGE_MIME_TYPES = new Set<StoredImage["mimeType"]>([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function makeAlias(existing: Set<string>) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const prefix = ALIAS_PREFIXES[Math.floor(Math.random() * ALIAS_PREFIXES.length)];
    const noun = ALIAS_NOUNS[Math.floor(Math.random() * ALIAS_NOUNS.length)];
    const number = Math.floor(10 + Math.random() * 90);
    const alias = `${prefix}${noun}${number}`;
    if (!existing.has(alias)) return alias;
  }
  return `午夜听众${Math.floor(1000 + Math.random() * 9000)}`;
}

function makeRoomCode(rooms: Map<string, Room>) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = "";
    for (let index = 0; index < 4; index += 1) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return randomUUID().replaceAll("-", "").slice(0, 4).toUpperCase();
}

function safeText(value: unknown) {
  return String(value ?? "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, 160);
}

function safeCode(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
}

function hasExpectedImageSignature(
  mimeType: StoredImage["mimeType"],
  bytes: Buffer,
) {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }
  if (mimeType === "image/gif") {
    const header = bytes.subarray(0, 6).toString("ascii");
    return header === "GIF87a" || header === "GIF89a";
  }
  return (
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function parseImage(
  value: unknown,
): { image: StoredImage | null } | { error: string } {
  if (value == null) return { image: null };
  if (typeof value !== "object") return { error: "图片数据无效" };

  const dataUrl = String(
    (value as { dataUrl?: unknown }).dataUrl ?? "",
  );
  if (!dataUrl || dataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) {
    return { error: "图片不能超过 1.5 MB" };
  }

  const match = dataUrl.match(
    /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/,
  );
  if (!match) return { error: "仅支持 JPG、PNG、WebP 或 GIF 图片" };

  const mimeType = match[1] as StoredImage["mimeType"];
  if (!IMAGE_MIME_TYPES.has(mimeType)) {
    return { error: "不支持这种图片格式" };
  }

  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES) {
    return { error: "图片不能超过 1.5 MB" };
  }
  if (!hasExpectedImageSignature(mimeType, bytes)) {
    return { error: "图片内容与格式不一致" };
  }

  return {
    image: {
      dataUrl,
      mimeType,
      byteLength: bytes.length,
    },
  };
}

function localNetworkOrigins(port: string) {
  const origins = new Set([`http://localhost:${port}`]);
  for (const records of Object.values(networkInterfaces())) {
    for (const record of records ?? []) {
      if (record.family === "IPv4" && !record.internal) {
        origins.add(`http://${record.address}:${port}`);
      }
    }
  }
  return [...origins];
}

async function readRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_REQUEST_BYTES) {
      throw new Error("request-too-large");
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

class PollingSocket implements SocketLike {
  readyState = 1;
  lastPayload = JSON.stringify({ type: "connected" });
  lastSeen = Date.now();
  private listeners: Record<"message" | "close", Array<(raw: Buffer) => void>> = {
    message: [],
    close: [],
  };

  send(payload: string) {
    this.lastPayload = payload;
  }

  on(
    event: "message" | "close",
    listener: (raw: { toString(): string }) => void,
  ) {
    this.listeners[event].push(listener);
    return this;
  }

  emitMessage(payload: string) {
    for (const listener of this.listeners.message) {
      listener(Buffer.from(payload));
    }
  }

  close() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    for (const listener of this.listeners.close) {
      listener(Buffer.from(""));
    }
  }
}

export function anonymousChatServer(): Plugin {
  const rooms = new Map<string, Room>();
  const memberships = new Map<SocketLike, Membership>();
  const pollingSockets = new Map<string, PollingSocket>();
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_REQUEST_BYTES,
  });

  const createRoom = (code: string, isPublic: boolean): Room => {
    const room: Room = {
      code,
      isPublic,
      hostId: "",
      topicIndex: Math.floor(Math.random() * TOPICS.length),
      members: new Map(),
      messages: [],
      createdAt: Date.now(),
    };
    rooms.set(code, room);
    return room;
  };

  const openRoom = createRoom(OPEN_ROOM_CODE, true);

  const payloadFor = (room: Room, member: Member) => ({
    type: "chat_state",
    room: {
      code: room.code,
      isPublic: room.isPublic,
      topic: TOPICS[room.topicIndex],
      topicNumber: room.topicIndex + 1,
    },
    self: {
      id: member.id,
      alias: member.alias,
      color: member.color,
      isHost: room.hostId === member.id,
    },
    members: [...room.members.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((entry) => ({
        id: entry.id,
        alias: entry.alias,
        color: entry.color,
        isHost: room.hostId === entry.id,
      })),
    messages: room.messages.map((message) => ({
      id: message.id,
      memberId: message.memberId,
      alias: message.alias,
      color: message.color,
      text: message.text,
      image: message.image,
      sentAt: message.sentAt,
      reactions: {
        共鸣: message.reactions.共鸣.size,
        好奇: message.reactions.好奇.size,
        哈哈: message.reactions.哈哈.size,
      },
      reactedBySelf: [...REACTIONS].filter((reaction) =>
        message.reactions[reaction].has(member.id),
      ),
    })),
  });

  const sendError = (socket: SocketLike, message: string) => {
    if (socket.readyState === 1) {
      socket.send(JSON.stringify({ type: "error", message }));
    }
  };

  const broadcast = (room: Room) => {
    for (const member of room.members.values()) {
      if (member.socket.readyState === 1) {
        member.socket.send(JSON.stringify(payloadFor(room, member)));
      }
    }
  };

  const leaveRoom = (socket: SocketLike) => {
    const membership = memberships.get(socket);
    if (!membership) return;
    memberships.delete(socket);
    const room = rooms.get(membership.code);
    if (!room) return;
    room.members.delete(membership.memberId);
    if (room.hostId === membership.memberId) {
      room.hostId = room.members.values().next().value?.id ?? "";
    }
    if (room.members.size === 0) {
      room.messages = [];
      if (!room.isPublic) rooms.delete(room.code);
    } else {
      broadcast(room);
    }
  };

  const joinRoom = (socket: SocketLike, room: Room) => {
    if (room.members.size >= MAX_MEMBERS) {
      sendError(socket, "这个频道已经坐满了");
      return;
    }
    leaveRoom(socket);
    const aliases = new Set([...room.members.values()].map((member) => member.alias));
    const member: Member = {
      id: randomUUID(),
      socket,
      alias: makeAlias(aliases),
      color: Math.floor(Math.random() * 6),
      joinedAt: Date.now(),
      lastMessageAt: 0,
    };
    room.members.set(member.id, member);
    if (!room.hostId) room.hostId = member.id;
    memberships.set(socket, { code: room.code, memberId: member.id });
    broadcast(room);
  };

  const getContext = (socket: SocketLike) => {
    const membership = memberships.get(socket);
    if (!membership) return null;
    const room = rooms.get(membership.code);
    const member = room?.members.get(membership.memberId);
    return room && member ? { room, member } : null;
  };

  const handleMessage = (socket: SocketLike, raw: string) => {
    let message: ClientMessage;
    try {
      message = JSON.parse(raw) as ClientMessage;
    } catch {
      sendError(socket, "无法识别这段信号");
      return;
    }

    if (message.type === "join_public") {
      joinRoom(socket, openRoom);
      return;
    }

    if (message.type === "create_room") {
      const room = createRoom(makeRoomCode(rooms), false);
      joinRoom(socket, room);
      return;
    }

    if (message.type === "join_room") {
      const code = safeCode(message.code);
      if (code.length !== 4) {
        sendError(socket, "房间码应为 4 位字母或数字");
        return;
      }
      const room = rooms.get(code);
      if (!room || room.isPublic) {
        sendError(socket, "没有找到这个私密频率");
        return;
      }
      joinRoom(socket, room);
      return;
    }

    if (message.type === "leave") {
      leaveRoom(socket);
      socket.send(JSON.stringify({ type: "connected" }));
      return;
    }

    const context = getContext(socket);
    if (!context) {
      sendError(socket, "请先进入一个频道");
      return;
    }
    const { room, member } = context;

    if (message.type === "send_message") {
      const text = safeText(message.text);
      const parsedImage = parseImage(message.image);
      if ("error" in parsedImage) {
        sendError(socket, parsedImage.error);
        return;
      }
      if (!text && !parsedImage.image) {
        sendError(socket, "写一句话或选择一张图片再发出信号吧");
        return;
      }
      if (Date.now() - member.lastMessageAt < SEND_INTERVAL_MS) {
        sendError(socket, "信号太密了，稍等一下再说");
        return;
      }
      member.lastMessageAt = Date.now();
      room.messages.push({
        id: randomUUID(),
        memberId: member.id,
        alias: member.alias,
        color: member.color,
        text,
        image: parsedImage.image,
        sentAt: new Date().toISOString(),
        reactions: {
          共鸣: new Set(),
          好奇: new Set(),
          哈哈: new Set(),
        },
      });
      let roomImageBytes = room.messages.reduce(
        (total, entry) => total + (entry.image?.byteLength ?? 0),
        0,
      );
      while (
        room.messages.length > MAX_MESSAGES ||
        roomImageBytes > MAX_ROOM_IMAGE_BYTES
      ) {
        const removed = room.messages.shift();
        roomImageBytes -= removed?.image?.byteLength ?? 0;
      }
      broadcast(room);
      return;
    }

    if (message.type === "react") {
      const reaction = String(message.reaction ?? "") as ReactionKey;
      if (!REACTIONS.has(reaction)) {
        sendError(socket, "不支持这种回应");
        return;
      }
      const target = room.messages.find(
        (entry) => entry.id === String(message.messageId ?? ""),
      );
      if (!target) {
        sendError(socket, "这条消息已经不在频道里了");
        return;
      }
      const people = target.reactions[reaction];
      if (people.has(member.id)) people.delete(member.id);
      else people.add(member.id);
      broadcast(room);
      return;
    }

    if (message.type === "next_topic") {
      if (room.hostId !== member.id) {
        sendError(socket, "只有房主可以切换话题");
        return;
      }
      room.topicIndex = (room.topicIndex + 1) % TOPICS.length;
      broadcast(room);
      return;
    }

    if (message.type === "clear_messages") {
      if (room.hostId !== member.id) {
        sendError(socket, "只有房主可以清空频道");
        return;
      }
      room.messages = [];
      broadcast(room);
      return;
    }

    sendError(socket, "未知的频道操作");
  };

  const attachSocket = (socket: SocketLike) => {
    socket.send(JSON.stringify({ type: "connected" }));
    socket.on("message", (raw) => handleMessage(socket, raw.toString()));
    socket.on("close", () => leaveRoom(socket));
  };

  wss.on("connection", attachSocket);

  const cleanupTimer = setInterval(() => {
    const expiry = Date.now() - 10 * 60 * 1000;
    for (const [clientId, socket] of pollingSockets) {
      if (socket.lastSeen < expiry) {
        pollingSockets.delete(clientId);
        socket.close();
      }
    }
    for (const [code, room] of rooms) {
      if (
        !room.isPublic &&
        room.members.size === 0 &&
        room.createdAt < expiry
      ) {
        rooms.delete(code);
      }
    }
  }, 60 * 1000);
  cleanupTimer.unref();

  const installUpgrade = (server: ViteDevServer) => {
    server.httpServer?.on(
      "upgrade",
      (request: IncomingMessage, socket, head) => {
        const pathname = new URL(
          request.url ?? "/",
          "http://playroom.local",
        ).pathname;
        if (pathname !== "/anonymous-chat-ws") return;
        wss.handleUpgrade(request, socket, head, (websocket) => {
          wss.emit("connection", websocket, request);
        });
      },
    );
  };

  return {
    name: "playroom-anonymous-chat-lan",
    apply: "serve",
    configureServer(server) {
      installUpgrade(server);
      server.middlewares.use(async (request, response, next) => {
        const requestUrl = new URL(
          request.url ?? "/",
          "http://playroom.local",
        );

        if (requestUrl.pathname === "/api/anonymous-chat/network") {
          const port = request.headers.host?.split(":").at(-1) ?? "3003";
          response.statusCode = 200;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.setHeader("cache-control", "no-store");
          response.end(JSON.stringify({ origins: localNetworkOrigins(port) }));
          return;
        }

        if (requestUrl.pathname !== "/api/anonymous-chat/room") {
          next();
          return;
        }

        const clientId = requestUrl.searchParams.get("clientId")?.slice(0, 80);
        if (!clientId) {
          response.statusCode = 400;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(JSON.stringify({ type: "error", message: "缺少客户端标识" }));
          return;
        }

        let pollingSocket = pollingSockets.get(clientId);
        if (!pollingSocket) {
          pollingSocket = new PollingSocket();
          pollingSockets.set(clientId, pollingSocket);
          attachSocket(pollingSocket);
        }
        pollingSocket.lastSeen = Date.now();

        if (request.method === "POST") {
          try {
            pollingSocket.emitMessage(await readRequestBody(request));
          } catch (error) {
            if (
              error instanceof Error &&
              error.message === "request-too-large"
            ) {
              response.statusCode = 413;
              response.setHeader(
                "content-type",
                "application/json; charset=utf-8",
              );
              response.end(
                JSON.stringify({ type: "error", message: "图片不能超过 1.5 MB" }),
              );
              return;
            }
            throw error;
          }
        } else if (request.method !== "GET") {
          response.statusCode = 405;
          response.setHeader("allow", "GET, POST");
          response.end();
          return;
        }

        response.statusCode = 200;
        response.setHeader("content-type", "application/json; charset=utf-8");
        response.setHeader("cache-control", "no-store");
        response.end(pollingSocket.lastPayload);
      });
    },
  };
}
