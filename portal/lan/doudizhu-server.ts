import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { networkInterfaces } from "node:os";
import type { IncomingMessage } from "node:http";
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

type Suit = "♠" | "♥" | "♣" | "♦" | "joker";
type Card = {
  id: string;
  rank: number;
  label: string;
  suit: Suit;
  color: "red" | "black" | "joker-red" | "joker-black";
};
type ComboKind =
  | "single"
  | "pair"
  | "triple"
  | "tripleSingle"
  | "triplePair"
  | "straight"
  | "pairStraight"
  | "airplane"
  | "airplaneSingle"
  | "airplanePair"
  | "fourTwoSingles"
  | "fourTwoPairs"
  | "bomb"
  | "rocket";
type Combo = {
  kind: ComboKind;
  mainRank: number;
  length: number;
  label: string;
};
type BidRecord = { player: number; score: number };
type MatchState = {
  phase: "bidding" | "playing" | "finished";
  hands: Card[][];
  bottom: Card[];
  playedCards: Card[];
  landlord: number | null;
  currentTurn: number;
  lastPlay: { player: number; cards: Card[]; combo: Combo } | null;
  passes: number;
  winner: number | null;
  actionText: string;
  multiplier: number;
  highestBid: number;
  highestBidder: number | null;
  bidTurns: number;
  bidHistory: BidRecord[];
  plays: number[];
  roundDelta: number[];
};
type RoomPlayer = {
  seat: number;
  name: string;
  socket: SocketLike | null;
  score: number;
  isBot: boolean;
};
type Room = {
  code: string;
  hostSeat: number;
  players: Map<number, RoomPlayer>;
  match: MatchState | null;
  botTimer?: ReturnType<typeof setTimeout>;
};
type LeaderboardEntry = {
  name: string;
  score: number;
  wins: number;
  losses: number;
  rounds: number;
  updatedAt: string;
};

const PLAYER_LABELS = ["玩家一", "玩家二", "玩家三"];
const BOT_NAMES = ["小智", "阿福", "牌小灵"];
const RANK_LABELS: Record<number, string> = {
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
  15: "2",
  16: "小王",
  17: "大王",
};
const COMBO_LABELS: Record<ComboKind, string> = {
  single: "单张",
  pair: "对子",
  triple: "三张",
  tripleSingle: "三带一",
  triplePair: "三带二",
  straight: "顺子",
  pairStraight: "连对",
  airplane: "飞机",
  airplaneSingle: "飞机带翅膀",
  airplanePair: "飞机带双翼",
  fourTwoSingles: "四带二",
  fourTwoPairs: "四带两对",
  bomb: "炸弹",
  rocket: "王炸",
};

function createDeck() {
  const cards: Card[] = [];
  const suits: Suit[] = ["♠", "♥", "♣", "♦"];
  let serial = 0;
  for (let rank = 3; rank <= 15; rank += 1) {
    for (const suit of suits) {
      cards.push({
        id: `lan-${Date.now()}-${serial++}`,
        rank,
        label: RANK_LABELS[rank],
        suit,
        color: suit === "♥" || suit === "♦" ? "red" : "black",
      });
    }
  }
  cards.push({
    id: `lan-${Date.now()}-${serial++}`,
    rank: 16,
    label: "JOKER",
    suit: "joker",
    color: "joker-black",
  });
  cards.push({
    id: `lan-${Date.now()}-${serial}`,
    rank: 17,
    label: "JOKER",
    suit: "joker",
    color: "joker-red",
  });
  return cards;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function sortCards(cards: Card[]) {
  const suitOrder: Record<Suit, number> = {
    "♠": 4,
    "♥": 3,
    "♣": 2,
    "♦": 1,
    joker: 5,
  };
  return [...cards].sort(
    (a, b) => b.rank - a.rank || suitOrder[b.suit] - suitOrder[a.suit],
  );
}

function rankGroups(cards: Card[]) {
  const groups = new Map<number, Card[]>();
  for (const card of cards) {
    groups.set(card.rank, [...(groups.get(card.rank) ?? []), card]);
  }
  return groups;
}

function consecutive(ranks: number[]) {
  return ranks.every(
    (rank, index) => index === 0 || rank === ranks[index - 1] + 1,
  );
}

function findTripleCores(groups: Map<number, Card[]>, needed: number) {
  const tripleRanks = [...groups.entries()]
    .filter(([rank, cards]) => rank < 15 && cards.length >= 3)
    .map(([rank]) => rank)
    .sort((a, b) => a - b);
  const cores: number[][] = [];
  for (let start = 0; start <= tripleRanks.length - needed; start += 1) {
    const window = tripleRanks.slice(start, start + needed);
    if (consecutive(window)) cores.push(window);
  }
  return cores;
}

function analyzeCombo(cards: Card[]): Combo | null {
  if (!cards.length) return null;
  const groups = rankGroups(cards);
  const entries = [...groups.entries()].sort(([a], [b]) => a - b);
  const ranks = entries.map(([rank]) => rank);
  const counts = entries.map(([, group]) => group.length);
  const count = cards.length;
  const make = (
    kind: ComboKind,
    mainRank: number,
    length = count,
  ): Combo => ({
    kind,
    mainRank,
    length,
    label: COMBO_LABELS[kind],
  });

  if (count === 2 && ranks[0] === 16 && ranks[1] === 17) {
    return make("rocket", 17, 1);
  }
  if (count === 4 && entries.length === 1) return make("bomb", ranks[0], 1);
  if (count === 1) return make("single", ranks[0], 1);
  if (count === 2 && entries.length === 1) return make("pair", ranks[0], 1);
  if (count === 3 && entries.length === 1) return make("triple", ranks[0], 1);
  if (count === 4 && counts.includes(3)) {
    return make(
      "tripleSingle",
      entries.find(([, group]) => group.length === 3)![0],
      1,
    );
  }
  if (count === 5 && counts.includes(3) && counts.includes(2)) {
    return make(
      "triplePair",
      entries.find(([, group]) => group.length === 3)![0],
      1,
    );
  }
  if (
    count >= 5 &&
    entries.length === count &&
    ranks.at(-1)! < 15 &&
    consecutive(ranks)
  ) {
    return make("straight", ranks.at(-1)!, count);
  }
  if (
    count >= 6 &&
    count % 2 === 0 &&
    counts.every((value) => value === 2) &&
    ranks.at(-1)! < 15 &&
    consecutive(ranks)
  ) {
    return make("pairStraight", ranks.at(-1)!, count / 2);
  }
  if (
    count >= 6 &&
    count % 3 === 0 &&
    counts.every((value) => value === 3) &&
    ranks.at(-1)! < 15 &&
    consecutive(ranks)
  ) {
    return make("airplane", ranks.at(-1)!, count / 3);
  }
  if (count === 6 && counts.includes(4)) {
    return make(
      "fourTwoSingles",
      entries.find(([, group]) => group.length === 4)![0],
      1,
    );
  }
  if (
    count === 8 &&
    counts.includes(4) &&
    entries.filter(([, group]) => group.length === 2).length === 2
  ) {
    return make(
      "fourTwoPairs",
      entries.find(([, group]) => group.length === 4)![0],
      1,
    );
  }
  if (count >= 8 && count % 4 === 0) {
    const coreLength = count / 4;
    for (const core of findTripleCores(groups, coreLength)) {
      const remaining = new Map(groups);
      core.forEach((rank) => {
        remaining.set(rank, remaining.get(rank)!.slice(3));
      });
      if (core.some((rank) => remaining.get(rank)!.length > 0)) continue;
      const wingCount = [...remaining.values()].reduce(
        (sum, group) => sum + group.length,
        0,
      );
      if (wingCount === coreLength) {
        return make("airplaneSingle", core.at(-1)!, coreLength);
      }
    }
  }
  if (count >= 10 && count % 5 === 0) {
    const coreLength = count / 5;
    for (const core of findTripleCores(groups, coreLength)) {
      const remaining = new Map(groups);
      core.forEach((rank) => {
        remaining.set(rank, remaining.get(rank)!.slice(3));
      });
      if (core.some((rank) => remaining.get(rank)!.length > 0)) continue;
      const wings = [...remaining.values()].filter((group) => group.length);
      if (
        wings.length === coreLength &&
        wings.every((group) => group.length === 2)
      ) {
        return make("airplanePair", core.at(-1)!, coreLength);
      }
    }
  }
  return null;
}

function beats(challenger: Combo, current: Combo) {
  if (challenger.kind === "rocket") return current.kind !== "rocket";
  if (current.kind === "rocket") return false;
  if (challenger.kind === "bomb" && current.kind !== "bomb") return true;
  if (current.kind === "bomb" && challenger.kind !== "bomb") return false;
  return (
    challenger.kind === current.kind &&
    challenger.length === current.length &&
    challenger.mainRank > current.mainRank
  );
}

function dealMatch(): MatchState {
  const deck = shuffle(createDeck());
  const starter = Math.floor(Math.random() * 3);
  return {
    phase: "bidding",
    hands: [
      sortCards(deck.slice(0, 17)),
      sortCards(deck.slice(17, 34)),
      sortCards(deck.slice(34, 51)),
    ],
    bottom: deck.slice(51),
    playedCards: [],
    landlord: null,
    currentTurn: starter,
    lastPlay: null,
    passes: 0,
    winner: null,
    actionText: `${PLAYER_LABELS[starter]}先叫地主`,
    multiplier: 1,
    highestBid: 0,
    highestBidder: null,
    bidTurns: 0,
    bidHistory: [],
    plays: [0, 0, 0],
    roundDelta: [0, 0, 0],
  };
}

function finalizeLandlord(match: MatchState, seat: number, score: number) {
  match.landlord = seat;
  match.hands[seat] = sortCards([
    ...match.hands[seat],
    ...match.bottom,
  ]);
  match.phase = "playing";
  match.currentTurn = seat;
  match.multiplier = Math.max(1, score);
  match.actionText = `${PLAYER_LABELS[seat]}以 ${score} 分成为地主`;
}

function lowestHint(match: MatchState, seat: number) {
  const hand = match.hands[seat];
  const groups = [...rankGroups(hand).entries()].sort(([a], [b]) => a - b);
  const current =
    match.lastPlay && match.lastPlay.player !== seat
      ? match.lastPlay.combo
      : null;
  if (!current) {
    const pair = groups.find(([, cards]) => cards.length === 2);
    return pair ? pair[1] : [sortCards(hand).at(-1)!];
  }
  const copies =
    current.kind === "single"
      ? 1
      : current.kind === "pair"
        ? 2
        : current.kind === "triple"
          ? 3
          : 0;
  if (copies) {
    const group = groups.find(
      ([rank, cards]) => rank > current.mainRank && cards.length >= copies,
    );
    if (group) return group[1].slice(0, copies);
  }
  const bomb = groups.find(([, cards]) => cards.length === 4);
  if (bomb && current.kind !== "rocket") return bomb[1];
  const smallJoker = hand.find((card) => card.rank === 16);
  const bigJoker = hand.find((card) => card.rank === 17);
  return smallJoker && bigJoker ? [smallJoker, bigJoker] : [];
}

function safeSend(socket: SocketLike, payload: unknown) {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(payload));
  }
}

async function readRequestBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
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
    this.readyState = 3;
    for (const listener of this.listeners.close) {
      listener(Buffer.alloc(0));
    }
  }
}

function roomCode(rooms: Map<string, Room>) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (;;) {
    const code = Array.from(
      { length: 4 },
      () => alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join("");
    if (!rooms.has(code)) return code;
  }
}

function localNetworkOrigins(port: string) {
  const addresses = Object.values(networkInterfaces())
    .flatMap((items) => items ?? [])
    .filter(
      (item) =>
        item.family === "IPv4" &&
        !item.internal &&
        /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(item.address),
    )
    .map((item) => item.address)
    .sort((a, b) => {
      const priority = (address: string) =>
        address.startsWith("192.168.") ? 0 : address.startsWith("10.") ? 1 : 2;
      return priority(a) - priority(b) || a.localeCompare(b);
    });
  return addresses.map((address) => `http://${address}:${port}`);
}

function playerName(value: unknown) {
  const name = String(value ?? "").trim().slice(0, 12);
  return name || "牌友";
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function doudizhuLanServer(): Plugin {
  const rooms = new Map<string, Room>();
  const memberships = new Map<SocketLike, { code: string; seat: number }>();
  const pollingSockets = new Map<string, PollingSocket>();
  const cleanupTimer = setInterval(() => {
    const expiry = Date.now() - 10 * 60 * 1000;
    for (const [clientId, socket] of pollingSockets) {
      if (socket.lastSeen < expiry) {
        pollingSockets.delete(clientId);
        socket.close();
      }
    }
  }, 60 * 1000);
  cleanupTimer.unref();
  const wss = new WebSocketServer({ noServer: true });
  const dataDir = path.resolve(import.meta.dirname, "../data");
  const scoreFile = path.join(dataDir, "doudizhu-scores.csv");
  const leaderboardFile = path.join(dataDir, "doudizhu-leaderboard.json");
  const leaderboard = new Map<string, LeaderboardEntry>();
  let scheduleBots: (room: Room) => void = () => {};
  let leaderboardWriteQueue = Promise.resolve();
  const csvHeader =
    "\uFEFF时间,房间,玩家,座位,身份,结果,倍数,本局积分,累计积分\r\n";

  const ensureScoreFile = async () => {
    await mkdir(dataDir, { recursive: true });
    try {
      await readFile(scoreFile);
    } catch {
      await writeFile(scoreFile, csvHeader, "utf8");
    }
  };

  const leaderboardKey = (name: string) => name.trim().toLocaleLowerCase("zh-CN");

  const loadLeaderboard = async () => {
    await mkdir(dataDir, { recursive: true });
    try {
      const raw = await readFile(leaderboardFile, "utf8");
      const parsed = JSON.parse(raw) as { entries?: LeaderboardEntry[] };
      for (const entry of parsed.entries ?? []) {
        if (!entry?.name || !Number.isFinite(entry.score)) continue;
        leaderboard.set(leaderboardKey(entry.name), {
          name: String(entry.name).slice(0, 12),
          score: Number(entry.score) || 0,
          wins: Number(entry.wins) || 0,
          losses: Number(entry.losses) || 0,
          rounds: Number(entry.rounds) || 0,
          updatedAt: String(entry.updatedAt || ""),
        });
      }
    } catch {
      await writeFile(
        leaderboardFile,
        JSON.stringify({ version: 1, entries: [] }, null, 2),
        "utf8",
      );
    }
  };

  const leaderboardReady = loadLeaderboard();

  const leaderboardSnapshot = () =>
    [...leaderboard.values()]
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.wins - a.wins ||
          a.rounds - b.rounds ||
          a.name.localeCompare(b.name, "zh-CN"),
      );

  const persistLeaderboard = () => {
    const payload = JSON.stringify(
      { version: 1, entries: leaderboardSnapshot() },
      null,
      2,
    );
    leaderboardWriteQueue = leaderboardWriteQueue.then(() =>
      writeFile(leaderboardFile, payload, "utf8"),
    );
    return leaderboardWriteQueue;
  };

  const broadcast = (room: Room) => {
    for (const player of room.players.values()) {
      if (!player.socket) continue;
      const match = room.match;
      safeSend(player.socket, {
        type: "room",
        roomCode: room.code,
        seat: player.seat,
        hostSeat: room.hostSeat,
        players: [...room.players.values()]
          .sort((a, b) => a.seat - b.seat)
          .map((item) => ({
            seat: item.seat,
            name: item.name,
            score: item.score,
            isBot: item.isBot,
            cardCount: match?.hands[item.seat]?.length ?? 0,
          })),
        match: match
          ? {
              phase: match.phase,
              hand: match.hands[player.seat],
              bottom: match.landlord === null ? [] : match.bottom,
              playedCards: match.playedCards,
              landlord: match.landlord,
              currentTurn: match.currentTurn,
              lastPlay: match.lastPlay,
              winner: match.winner,
              actionText: match.actionText,
              multiplier: match.multiplier,
              highestBid: match.highestBid,
              bidHistory: match.bidHistory,
              roundDelta: match.roundDelta,
              hintIds:
                match.phase === "playing" &&
                match.currentTurn === player.seat
                  ? lowestHint(match, player.seat).map((card) => card.id)
                  : [],
            }
          : null,
      });
    }
    scheduleBots(room);
  };

  const recordRound = async (room: Room) => {
    const match = room.match;
    if (!match || match.winner === null || match.landlord === null) return;
    const timestamp = new Date().toISOString();
    const landlordWon = match.winner === match.landlord;
    const players = [...room.players.values()].map((player) => ({
      seat: player.seat,
      name: player.name,
      score: player.score,
      isBot: player.isBot,
    }));
    const rows = players.map((player) => {
      const won =
        player.seat === match.landlord
          ? landlordWon
          : !landlordWon;
      return [
        timestamp,
        room.code,
        player.isBot ? `${player.name}（人机）` : player.name,
        player.seat + 1,
        player.seat === match.landlord ? "地主" : "农民",
        won ? "胜" : "负",
        match.multiplier,
        match.roundDelta[player.seat],
        player.score,
      ]
        .map(csvCell)
        .join(",");
    });
    await ensureScoreFile();
    await appendFile(scoreFile, `${rows.join("\r\n")}\r\n`, "utf8");
    await leaderboardReady;
    for (const player of players) {
      if (player.isBot) continue;
      const key = leaderboardKey(player.name);
      const current = leaderboard.get(key) ?? {
        name: player.name,
        score: 0,
        wins: 0,
        losses: 0,
        rounds: 0,
        updatedAt: "",
      };
      const won =
        player.seat === match.landlord ? landlordWon : !landlordWon;
      leaderboard.set(key, {
        ...current,
        name: player.name,
        score: current.score + match.roundDelta[player.seat],
        wins: current.wins + (won ? 1 : 0),
        losses: current.losses + (won ? 0 : 1),
        rounds: current.rounds + 1,
        updatedAt: timestamp,
      });
    }
    await persistLeaderboard();
  };

  const startMatch = (room: Room, socket: SocketLike) => {
    const membership = memberships.get(socket);
    if (
      !membership ||
      membership.seat !== room.hostSeat ||
      room.players.size !== 3
    ) {
      safeSend(socket, { type: "error", message: "需要三位玩家到齐，并由房主开始" });
      return;
    }
    if (room.botTimer) {
      clearTimeout(room.botTimer);
      room.botTimer = undefined;
    }
    room.match = dealMatch();
    broadcast(room);
  };

  const playCards = (room: Room, seat: number, ids: string[]) => {
    const match = room.match;
    if (
      !match ||
      match.phase !== "playing" ||
      match.currentTurn !== seat
    ) {
      return "还没轮到你出牌";
    }
    const idSet = new Set(ids);
    const cards = match.hands[seat].filter((card) => idSet.has(card.id));
    if (!cards.length || cards.length !== idSet.size) return "请选择有效手牌";
    const combo = analyzeCombo(cards);
    if (!combo) return "所选手牌不是有效牌型";
    if (
      match.lastPlay &&
      match.lastPlay.player !== seat &&
      !beats(combo, match.lastPlay.combo)
    ) {
      return `需要压过${match.lastPlay.combo.label}`;
    }

    match.hands[seat] = match.hands[seat].filter(
      (card) => !idSet.has(card.id),
    );
    match.playedCards.push(...cards);
    match.plays[seat] += 1;
    match.lastPlay = { player: seat, cards: sortCards(cards), combo };
    match.passes = 0;
    match.multiplier *=
      combo.kind === "bomb" || combo.kind === "rocket" ? 2 : 1;
    match.actionText = `${room.players.get(seat)?.name ?? PLAYER_LABELS[seat]}出了${combo.label}`;

    if (match.hands[seat].length === 0) {
      match.phase = "finished";
      match.winner = seat;
      const landlordWon = seat === match.landlord;
      const base = 100 * match.multiplier;
      match.roundDelta = [0, 0, 0].map((_, playerSeat) => {
        if (playerSeat === match.landlord) {
          return landlordWon ? base * 2 : -base * 2;
        }
        return landlordWon ? -base : base;
      });
      for (const player of room.players.values()) {
        player.score += match.roundDelta[player.seat];
      }
      match.actionText = `${room.players.get(seat)?.name ?? PLAYER_LABELS[seat]}率先出完手牌`;
      void recordRound(room);
    } else {
      match.currentTurn = (seat + 1) % 3;
    }
    return null;
  };

  const applyBid = (room: Room, seat: number, score: number) => {
    const match = room.match;
    if (
      !match ||
      match.phase !== "bidding" ||
      match.currentTurn !== seat ||
      !Number.isInteger(score) ||
      score < 0 ||
      score > 3 ||
      (score > 0 && score <= match.highestBid)
    ) {
      return "当前不能这样叫分";
    }
    match.bidHistory.push({ player: seat, score });
    match.bidTurns += 1;
    if (score > match.highestBid) {
      match.highestBid = score;
      match.highestBidder = seat;
    }
    const playerName = room.players.get(seat)?.name ?? PLAYER_LABELS[seat];
    match.actionText =
      score === 0 ? `${playerName}不叫` : `${playerName}叫 ${score} 分`;
    if (score === 3) {
      finalizeLandlord(match, seat, 3);
    } else if (match.bidTurns >= 3) {
      if (match.highestBidder === null) {
        room.match = dealMatch();
        room.match.actionText = "无人叫分，已经重新发牌";
      } else {
        finalizeLandlord(match, match.highestBidder, match.highestBid);
      }
    } else {
      match.currentTurn = (seat + 1) % 3;
    }
    return null;
  };

  const passTurn = (room: Room, seat: number) => {
    const match = room.match;
    if (
      !match ||
      match.phase !== "playing" ||
      match.currentTurn !== seat ||
      !match.lastPlay ||
      match.lastPlay.player === seat
    ) {
      return "本轮先手不能不出";
    }
    match.passes += 1;
    match.actionText = `${room.players.get(seat)?.name ?? PLAYER_LABELS[seat]}选择不出`;
    if (match.passes >= 2) {
      match.passes = 0;
      match.lastPlay = null;
      match.actionText = "新一轮，重新领牌";
    }
    match.currentTurn = (seat + 1) % 3;
    return null;
  };

  const chooseBotBid = (hand: Card[], highestBid: number) => {
    const groups = [...rankGroups(hand).values()];
    const strength =
      hand.filter((card) => card.rank >= 15).length +
      hand.filter((card) => card.rank === 17).length +
      groups.filter((cards) => cards.length === 4).length * 2;
    const target = strength >= 7 ? 3 : strength >= 4 ? 2 : strength >= 2 ? 1 : 0;
    return target > highestBid ? target : 0;
  };

  scheduleBots = (room: Room) => {
    const match = room.match;
    if (!match || match.phase === "finished" || room.botTimer) return;
    const bot = room.players.get(match.currentTurn);
    if (!bot?.isBot) return;

    match.actionText = `${bot.name}正在思考…`;
    room.botTimer = setTimeout(() => {
      room.botTimer = undefined;
      if (room.match !== match || match.currentTurn !== bot.seat) return;

      if (match.phase === "bidding") {
        applyBid(room, bot.seat, chooseBotBid(match.hands[bot.seat], match.highestBid));
      } else if (match.phase === "playing") {
        const cards = lowestHint(match, bot.seat);
        if (cards.length) {
          playCards(
            room,
            bot.seat,
            cards.map((card) => card.id),
          );
        } else {
          passTurn(room, bot.seat);
        }
      }
      broadcast(room);
    }, 650);
  };

  const attachSocket = (socket: SocketLike) => {
    safeSend(socket, { type: "connected" });

    socket.on("message", (raw) => {
      let message: Record<string, unknown>;
      try {
        message = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        safeSend(socket, { type: "error", message: "消息格式错误" });
        return;
      }

      if (message.type === "create") {
        if (memberships.has(socket)) return;
        const code = roomCode(rooms);
        const player: RoomPlayer = {
          seat: 0,
          name: playerName(message.name),
          socket,
          score: 0,
          isBot: false,
        };
        const room: Room = {
          code,
          hostSeat: 0,
          players: new Map([[0, player]]),
          match: null,
        };
        rooms.set(code, room);
        memberships.set(socket, { code, seat: 0 });
        broadcast(room);
        return;
      }

      if (message.type === "join") {
        if (memberships.has(socket)) return;
        const code = String(message.code ?? "").trim().toUpperCase();
        const room = rooms.get(code);
        if (!room) {
          safeSend(socket, { type: "error", message: "没有找到这个房间" });
          return;
        }
        if (room.match) {
          safeSend(socket, { type: "error", message: "房间已经开始" });
          return;
        }
        let seat = [0, 1, 2].find((item) => !room.players.has(item));
        if (seat === undefined) {
          const replaceableBot = [...room.players.values()]
            .filter((player) => player.isBot)
            .sort((a, b) => b.seat - a.seat)[0];
          if (replaceableBot) {
            seat = replaceableBot.seat;
            room.players.delete(seat);
          }
        }
        if (seat === undefined) {
          safeSend(socket, { type: "error", message: "房间人数已满" });
          return;
        }
        room.players.set(seat, {
          seat,
          name: playerName(message.name),
          socket,
          score: 0,
          isBot: false,
        });
        memberships.set(socket, { code, seat });
        broadcast(room);
        return;
      }

      const membership = memberships.get(socket);
      const room = membership ? rooms.get(membership.code) : null;
      if (!membership || !room) {
        safeSend(socket, { type: "error", message: "请先创建或加入房间" });
        return;
      }

      if (message.type === "add_bot") {
        const seat = Number(message.seat);
        if (
          membership.seat !== room.hostSeat ||
          room.match ||
          !Number.isInteger(seat) ||
          seat < 0 ||
          seat > 2 ||
          room.players.has(seat)
        ) {
          safeSend(socket, { type: "error", message: "当前不能在这个位置添加人机" });
          return;
        }
        room.players.set(seat, {
          seat,
          name: BOT_NAMES[seat] ?? `人机 ${seat + 1}`,
          socket: null,
          score: 0,
          isBot: true,
        });
        broadcast(room);
      } else if (message.type === "remove_bot") {
        const seat = Number(message.seat);
        const player = room.players.get(seat);
        if (
          membership.seat !== room.hostSeat ||
          room.match ||
          !player?.isBot
        ) {
          safeSend(socket, { type: "error", message: "当前不能移除这个人机" });
          return;
        }
        room.players.delete(seat);
        broadcast(room);
      } else if (message.type === "start") {
        startMatch(room, socket);
      } else if (message.type === "bid") {
        const score = Number(message.score);
        const error = applyBid(room, membership.seat, score);
        if (error) safeSend(socket, { type: "error", message: error });
        else broadcast(room);
      } else if (message.type === "play") {
        const ids = Array.isArray(message.cardIds)
          ? message.cardIds.map(String)
          : [];
        const error = playCards(room, membership.seat, ids);
        if (error) {
          safeSend(socket, { type: "error", message: error });
        } else {
          broadcast(room);
        }
      } else if (message.type === "pass") {
        const error = passTurn(room, membership.seat);
        if (error) safeSend(socket, { type: "error", message: error });
        else broadcast(room);
      }
    });

    socket.on("close", () => {
      const membership = memberships.get(socket);
      memberships.delete(socket);
      if (!membership) return;
      const room = rooms.get(membership.code);
      if (!room) return;
      room.players.delete(membership.seat);
      const remainingHumans = [...room.players.values()].filter(
        (player) => !player.isBot,
      );
      if (remainingHumans.length === 0) {
        if (room.botTimer) clearTimeout(room.botTimer);
        rooms.delete(room.code);
        return;
      }
      if (room.hostSeat === membership.seat) {
        room.hostSeat = Math.min(...remainingHumans.map((player) => player.seat));
      }
      if (room.botTimer) {
        clearTimeout(room.botTimer);
        room.botTimer = undefined;
      }
      room.match = null;
      broadcast(room);
    });
  };

  wss.on("connection", attachSocket);

  const installUpgrade = (server: ViteDevServer) => {
    server.httpServer?.on(
      "upgrade",
      (request: IncomingMessage, socket, head) => {
        const pathname = new URL(
          request.url ?? "/",
          "http://playroom.local",
        ).pathname;
        if (pathname !== "/doudizhu-ws") return;
        wss.handleUpgrade(request, socket, head, (websocket) => {
          wss.emit("connection", websocket, request);
        });
      },
    );
  };

  return {
    name: "playroom-doudizhu-lan",
    apply: "serve",
    configureServer(server) {
      void ensureScoreFile();
      installUpgrade(server);
      server.middlewares.use(async (request, response, next) => {
        const requestUrl = new URL(
          request.url ?? "/",
          "http://playroom.local",
        );
        if (requestUrl.pathname === "/api/doudizhu/network") {
          const port = request.headers.host?.split(":").at(-1) ?? "3003";
          response.statusCode = 200;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.setHeader("cache-control", "no-store");
          response.end(JSON.stringify({ origins: localNetworkOrigins(port) }));
          return;
        }
        if (requestUrl.pathname === "/api/doudizhu/leaderboard") {
          await leaderboardReady;
          const entries = leaderboardSnapshot().slice(0, 20);
          response.statusCode = 200;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.setHeader("cache-control", "no-store");
          response.end(
            JSON.stringify({
              entries,
              updatedAt: entries[0]?.updatedAt ?? new Date(0).toISOString(),
            }),
          );
          return;
        }
        if (requestUrl.pathname === "/api/doudizhu/room") {
          const clientId = requestUrl.searchParams.get("clientId")?.slice(0, 80);
          if (!clientId) {
            response.statusCode = 400;
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
            pollingSocket.emitMessage(await readRequestBody(request));
          }
          response.statusCode = 200;
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.setHeader("cache-control", "no-store");
          response.end(pollingSocket.lastPayload);
          return;
        }
        if (
          !request.url?.startsWith("/api/doudizhu/scores.csv")
        ) {
          next();
          return;
        }
        await ensureScoreFile();
        const content = await readFile(scoreFile);
        response.statusCode = 200;
        response.setHeader("content-type", "text/csv; charset=utf-8");
        response.setHeader(
          "content-disposition",
          'attachment; filename="doudizhu-scores.csv"',
        );
        response.end(content);
      });
      server.httpServer?.once("close", () => {
        clearInterval(cleanupTimer);
        for (const socket of pollingSockets.values()) socket.close();
        pollingSockets.clear();
        wss.close();
      });
    },
  };
}
