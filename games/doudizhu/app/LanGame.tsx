"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Suit = "♠" | "♥" | "♣" | "♦" | "joker";
type Card = {
  id: string;
  rank: number;
  label: string;
  suit: Suit;
  color: "red" | "black" | "joker-red" | "joker-black";
};
type Player = {
  seat: number;
  name: string;
  score: number;
  cardCount: number;
  isBot: boolean;
};
type LastPlay = {
  player: number;
  cards: Card[];
  combo: { label: string };
};
type Match = {
  phase: "bidding" | "playing" | "finished";
  hand: Card[];
  bottom: Card[];
  playedCards: Card[];
  landlord: number | null;
  currentTurn: number;
  lastPlay: LastPlay | null;
  winner: number | null;
  actionText: string;
  multiplier: number;
  highestBid: number;
  bidHistory: Array<{ player: number; score: number }>;
  roundDelta: number[];
  hintIds: string[];
};
type RoomState = {
  roomCode: string;
  seat: number;
  hostSeat: number;
  players: Player[];
  match: Match | null;
};
type ServerMessage =
  | ({ type: "room" } & RoomState)
  | { type: "error"; message: string }
  | { type: "connected" };

type LeaderboardEntry = {
  name: string;
  score: number;
  wins: number;
  losses: number;
  rounds: number;
  updatedAt: string;
};

const COUNTER_RANKS = [17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3];
const COUNTER_LABELS: Record<number, string> = {
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
  16: "小",
  17: "大",
};

const seatLabel = (seat: number) => `座位 ${seat + 1}`;

function LanCard({
  card,
  selected = false,
  onClick,
}: {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
}) {
  const joker = card.suit === "joker";
  return (
    <button
      type="button"
      className={`poker-card ${card.color.includes("red") ? "red" : "black"} ${
        selected ? "selected" : ""
      }`}
      onClick={onClick}
      disabled={!onClick}
      aria-pressed={selected}
      aria-label={`${card.label}${joker ? "" : card.suit}`}
    >
      {joker ? (
        <span className="joker-name">{card.rank === 17 ? "大王" : "小王"}</span>
      ) : (
        <>
          <span className="card-rank">{card.label}</span>
          <span className="card-suit">{card.suit}</span>
          <span className="card-center">{card.suit}</span>
        </>
      )}
    </button>
  );
}

function Portrait({ danger = 0, bot = false }: { danger?: number; bot?: boolean }) {
  return (
    <div className={`avatar-ring ${bot ? "bot-avatar" : ""}`}>
      <div className={`avatar portrait-face ${bot ? "bot" : ""}`} aria-hidden="true">
        <span className="portrait-hair" />
        <span className="portrait-eyes" />
      </div>
      {danger > 0 && (
        <span className="danger-callout">{danger === 1 ? "报单" : "报双"}</span>
      )}
    </div>
  );
}

function ScoreTable({
  room,
  finished = false,
}: {
  room: RoomState;
  finished?: boolean;
}) {
  return (
    <div className="score-sheet">
      <div className="score-sheet-head">
        <strong>房间积分表</strong>
        <a href="/api/doudizhu/scores.csv" download>
          下载 CSV
        </a>
      </div>
      <div className="score-table-wrap">
        <table>
          <thead>
            <tr>
              <th>玩家</th>
              <th>身份</th>
              {finished && <th>本局</th>}
              <th>累计积分</th>
            </tr>
          </thead>
          <tbody>
            {room.players.map((player) => (
              <tr key={player.seat}>
                <td>
                  {player.name}
                  {player.isBot ? "（人机）" : ""}
                  {player.seat === room.seat ? "（你）" : ""}
                </td>
                <td>
                  {room.match?.landlord === null || !room.match
                    ? "待定"
                    : room.match.landlord === player.seat
                      ? "地主"
                      : "农民"}
                </td>
                {finished && (
                  <td
                    className={
                      (room.match?.roundDelta[player.seat] ?? 0) >= 0
                        ? "score-up"
                        : "score-down"
                    }
                  >
                    {(room.match?.roundDelta[player.seat] ?? 0) > 0 ? "+" : ""}
                    {room.match?.roundDelta[player.seat] ?? 0}
                  </td>
                )}
                <td>{player.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Leaderboard({
  entries,
  loading,
  onRefresh,
}: {
  entries: LeaderboardEntry[];
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <section className="leaderboard-sheet" aria-label="局域网积分榜">
      <div className="leaderboard-head">
        <div>
          <span>LOCAL RANKING</span>
          <strong>局域网积分榜</strong>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          aria-label="刷新积分榜"
        >
          {loading ? "同步中" : "刷新"}
        </button>
      </div>
      {entries.length ? (
        <div className="leaderboard-table-wrap">
          <table>
            <thead>
              <tr>
                <th>排名</th>
                <th>玩家</th>
                <th>战绩</th>
                <th>积分</th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 5).map((entry, index) => (
                <tr key={`${entry.name}-${index}`}>
                  <td>
                    <span className={`rank-seal rank-${index + 1}`}>
                      {index + 1}
                    </span>
                  </td>
                  <td>{entry.name}</td>
                  <td>
                    {entry.wins} 胜 / {entry.rounds} 局
                  </td>
                  <td className={entry.score >= 0 ? "score-up" : "score-down"}>
                    {entry.score > 0 ? "+" : ""}
                    {entry.score}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="leaderboard-empty">
          {loading ? "正在读取主机积分…" : "完成第一局后，这里会出现牌手排名。"}
        </p>
      )}
      <small>只统计真人玩家 · 数据保存在大厅主机</small>
    </section>
  );
}

export default function LanGame({ onExit }: { onExit: () => void }) {
  const socketRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clientIdRef = useRef("");
  const lastPayloadRef = useRef("");
  const [connected, setConnected] = useState(false);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [networkOrigin, setNetworkOrigin] = useState("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("正在连接同一局域网内的牌桌…");

  const receiveMessage = useCallback((message: ServerMessage) => {
    if (message.type === "room") {
      setRoom(message);
      setSelectedIds([]);
      setNotice("");
      setConnected(true);
    } else if (message.type === "error") {
      setNotice(message.message);
    } else {
      setConnected(true);
      setNotice("已连接，可以创建或加入房间");
    }
  }, []);

  const loadLeaderboard = useCallback(() => {
    setLeaderboardLoading(true);
    void fetch("/api/doudizhu/leaderboard", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("leaderboard unavailable");
        return response.json();
      })
      .then((data: { entries?: LeaderboardEntry[] }) => {
        setLeaderboard(data.entries ?? []);
      })
      .catch(() => {
        setLeaderboard([]);
      })
      .finally(() => setLeaderboardLoading(false));
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setName(localStorage.getItem("doudizhu-lan-name") ?? "");
      setRoomCode(
        new URLSearchParams(location.search).get("room")?.toUpperCase() ?? "",
      );
      loadLeaderboard();
    });
    void fetch("/api/doudizhu/network", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { origins?: string[] }) => {
        setNetworkOrigin(data.origins?.[0] ?? location.origin);
      })
      .catch(() => setNetworkOrigin(location.origin));
    clientIdRef.current ||= `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let disposed = false;

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/doudizhu/room?clientId=${encodeURIComponent(clientIdRef.current)}`,
          { cache: "no-store" },
        );
        const payload = await response.text();
        if (!disposed && payload !== lastPayloadRef.current) {
          lastPayloadRef.current = payload;
          receiveMessage(JSON.parse(payload) as ServerMessage);
        }
      } catch {
        if (!disposed) {
          setConnected(false);
          setNotice("正在等待大厅牌桌服务恢复…");
        }
      }
    };

    const startPolling = () => {
      if (pollingRef.current) return;
      setNotice("实时通道受限，已自动切换兼容模式…");
      void poll();
      pollingRef.current = setInterval(() => void poll(), 500);
    };

    const protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${location.host}/doudizhu-ws`);
    socketRef.current = socket;
    socket.addEventListener("open", () => {
      if (socketRef.current !== socket) return;
      setConnected(true);
      setNotice("已连接，可以创建或加入房间");
    });
    socket.addEventListener("message", (event) => {
      if (socketRef.current !== socket) return;
      receiveMessage(JSON.parse(String(event.data)) as ServerMessage);
    });
    socket.addEventListener("close", () => {
      if (socketRef.current !== socket) return;
      socketRef.current = null;
      setConnected(false);
      startPolling();
    });
    return () => {
      disposed = true;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (socketRef.current === socket) socketRef.current = null;
      socket.close();
    };
  }, [loadLeaderboard, receiveMessage]);

  const send = useCallback((payload: Record<string, unknown>) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
      return;
    }
    void fetch(
      `/api/doudizhu/room?clientId=${encodeURIComponent(clientIdRef.current)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    )
      .then((response) => response.text())
      .then((text) => {
        lastPayloadRef.current = text;
        receiveMessage(JSON.parse(text) as ServerMessage);
      })
      .catch(() => {
        setConnected(false);
        setNotice("牌桌服务暂时不可用，请确认大厅仍在运行");
      });
  }, [receiveMessage]);

  const saveName = () => {
    const clean = name.trim().slice(0, 10);
    if (!clean) {
      setNotice("先给自己取一个名字");
      return null;
    }
    localStorage.setItem("doudizhu-lan-name", clean);
    return clean;
  };

  const createRoom = () => {
    const clean = saveName();
    if (clean) send({ type: "create", name: clean });
  };

  const joinRoom = () => {
    const clean = saveName();
    if (clean) send({ type: "join", name: clean, code: roomCode });
  };

  const copyInvite = async () => {
    const invite = `${networkOrigin || location.origin}/play/doudizhu/index.html?room=${room?.roomCode ?? ""}`;
    await navigator.clipboard.writeText(invite);
    setNotice("邀请地址已复制；朋友连接同一 Wi-Fi 后打开即可");
  };

  const match = room?.match;
  const isMyTurn = Boolean(match && match.currentTurn === room?.seat);
  const opponents = useMemo(
    () => room?.players.filter((player) => player.seat !== room.seat) ?? [],
    [room],
  );
  const selectedCards =
    match?.hand.filter((card) => selectedIds.includes(card.id)) ?? [];
  const remainingRankCounts = useMemo(() => {
    const counts = new Map<number, number>(
      COUNTER_RANKS.map((rank) => [rank, rank >= 16 ? 1 : 4]),
    );
    if (match) {
      [...match.hand, ...match.playedCards].forEach((card) => {
        counts.set(card.rank, Math.max(0, (counts.get(card.rank) ?? 0) - 1));
      });
    }
    return COUNTER_RANKS.map((rank) => ({
      rank,
      label: COUNTER_LABELS[rank],
      count: counts.get(rank) ?? 0,
    }));
  }, [match]);

  useEffect(() => {
    if (match?.phase !== "finished") return;
    const timer = window.setTimeout(loadLeaderboard, 500);
    return () => window.clearTimeout(timer);
  }, [loadLeaderboard, match?.phase, match?.winner]);

  const toggleCard = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const leave = () => {
    socketRef.current?.close();
    onExit();
  };

  if (!room) {
    return (
      <main className="game-shell lan-shell">
        <div className="ambient-grain" aria-hidden="true" />
        <header className="game-header lan-header">
          <div className="brand">
            <div className="brand-seal">联</div>
            <div>
              <span>LOCAL CARD ROOM</span>
              <h1>局域网斗地主</h1>
            </div>
          </div>
          <div className="room-mode-pill">
            <i className={connected ? "online" : ""} />
            {connected ? "牌桌服务已连接" : "连接中"}
          </div>
          <div className="header-actions">
            <button type="button" onClick={leave}>
              返回单机
            </button>
          </div>
        </header>

        <section className="lan-lobby">
          <div className="lan-lobby-copy">
            <span className="eyebrow">三人实时牌桌</span>
            <h2>同一个 Wi-Fi，坐到同一张桌</h2>
            <p>
              一人创建房间，把大厅地址和四位房间码发给另外两位玩家。三人到齐后由房主开局。
            </p>
            <div className="lan-notice">{notice}</div>
          </div>
          <div className="lan-lobby-side">
            <div className="lan-form-card">
              <label>
                你的称呼
                <input
                  value={name}
                  maxLength={10}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="例如：小明"
                />
              </label>
              <button
                type="button"
                className="lan-primary"
                onClick={createRoom}
                disabled={!connected}
              >
                创建新房间
              </button>
              <div className="lan-divider">
                <span>或使用房间码</span>
              </div>
              <div className="join-row">
                <input
                  value={roomCode}
                  maxLength={4}
                  onChange={(event) =>
                    setRoomCode(event.target.value.toUpperCase())
                  }
                  placeholder="ABCD"
                  aria-label="四位房间码"
                />
                <button
                  type="button"
                  onClick={joinRoom}
                  disabled={!connected || roomCode.length < 4}
                >
                  加入房间
                </button>
              </div>
              <p className="privacy-note">
                积分仅保存在这台大厅主机，不上传网络。
              </p>
            </div>
            <Leaderboard
              entries={leaderboard}
              loading={leaderboardLoading}
              onRefresh={loadLeaderboard}
            />
          </div>
        </section>
      </main>
    );
  }

  if (!match) {
    return (
      <main className="game-shell lan-shell">
        <div className="ambient-grain" aria-hidden="true" />
        <header className="game-header lan-header">
          <div className="brand">
            <div className="brand-seal">鬥</div>
            <div>
              <span>ROOM {room.roomCode}</span>
              <h1>等待牌友入座</h1>
            </div>
          </div>
          <button type="button" className="room-code" onClick={copyInvite}>
            房间码 <strong>{room.roomCode}</strong>
            <small>点击复制邀请</small>
          </button>
          <div className="header-actions">
            <button type="button" onClick={leave}>
              离开房间
            </button>
          </div>
        </header>
        <section className="room-waiting">
          <div className="seat-grid">
            {[0, 1, 2].map((seat) => {
              const player = room.players.find((item) => item.seat === seat);
              return (
                <article
                  className={`waiting-seat ${player ? "occupied" : ""} ${
                    player?.isBot ? "bot-seat" : ""
                  }`}
                  key={seat}
                >
                  {player ? (
                    <Portrait bot={player.isBot} />
                  ) : room.seat === room.hostSeat ? (
                    <button
                      type="button"
                      className="bot-seat-action"
                      onClick={() => send({ type: "add_bot", seat })}
                      aria-label={`在座位 ${seat + 1} 添加人机`}
                    >
                      <span>AI</span>
                      添加人机
                    </button>
                  ) : (
                    <span className="empty-avatar">+</span>
                  )}
                  <span>{seatLabel(seat)}</span>
                  <strong>{player?.name ?? "等待加入"}</strong>
                  {player?.isBot && <i className="bot-badge">人机</i>}
                  {seat === room.hostSeat && <em>房主</em>}
                  {player?.isBot && room.seat === room.hostSeat && (
                    <button
                      type="button"
                      className="remove-bot"
                      onClick={() => send({ type: "remove_bot", seat })}
                    >
                      移除
                    </button>
                  )}
                </article>
              );
            })}
          </div>
          <div className="waiting-actions">
            <p>
              {notice ||
                `已有 ${room.players.length}/3 个席位就绪，可用人机补齐空位`}
            </p>
            <p className="lan-address">
              朋友访问：{networkOrigin || "正在获取局域网地址…"}
            </p>
            {room.seat === room.hostSeat ? (
              <button
                type="button"
                className="lan-primary"
                disabled={room.players.length !== 3}
                onClick={() => send({ type: "start" })}
              >
                {room.players.length === 3 ? "开始对局" : "等待三人到齐"}
              </button>
            ) : (
              <span>房主将在三人到齐后开始</span>
            )}
          </div>
          <div className="waiting-ledgers">
            <ScoreTable room={room} />
            <Leaderboard
              entries={leaderboard}
              loading={leaderboardLoading}
              onRefresh={loadLeaderboard}
            />
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="game-shell lan-shell">
      <div className="ambient-grain" aria-hidden="true" />
      <header className="game-header lan-header">
        <div className="brand">
          <div className="brand-seal">鬥</div>
          <div>
            <span>ROOM {room.roomCode}</span>
            <h1>局域网牌桌</h1>
          </div>
        </div>
        <div className="match-stats">
          <div>
            <span>底分</span>
            <strong>{Math.max(1, match.highestBid) * 100}</strong>
          </div>
          <i />
          <div>
            <span>倍数</span>
            <strong>×{match.multiplier}</strong>
          </div>
        </div>
        <div className="header-actions">
          <button type="button" onClick={leave}>
            离开
          </button>
        </div>
      </header>

      <section className="card-table lan-card-table">
        <div className="table-rim" aria-hidden="true" />
        <div className="table-lines" aria-hidden="true" />

        {opponents.map((player, index) => (
          <div
            className={`player-seat lan-opponent ${index === 0 ? "player-2" : "player-1"} ${
              match.currentTurn === player.seat ? "active" : ""
            }`}
            key={player.seat}
          >
            <Portrait
              danger={player.cardCount <= 2 ? player.cardCount : 0}
              bot={player.isBot}
            />
            <div className="player-meta">
              <strong>{player.name}</strong>
              <span>
                {match.landlord === player.seat ? "地主" : "农民"}
                {player.isBot ? " · 人机" : ""}
              </span>
              <small>积分 {player.score}</small>
            </div>
            <div className="card-count">
              <span className="mini-card" />
              <b>{player.cardCount}</b>
            </div>
          </div>
        ))}

        <div className="bottom-cards">
          <span className="bottom-label">地主底牌</span>
          <div className="bottom-card-row">
            {(match.bottom.length ? match.bottom : [null, null, null]).map(
              (card, index) =>
                card ? (
                  <LanCard key={card.id} card={card} />
                ) : (
                  <span className="card-back mini" key={index} />
                ),
            )}
          </div>
          <span className="multiplier">倍数 ×{match.multiplier}</span>
        </div>

        <aside className="card-counter" aria-label="记牌器">
          <div className="counter-heading">
            <strong>记牌器</strong>
            <span>REMEMBER</span>
          </div>
          <div className="counter-ranks">
            {remainingRankCounts.map((item) => (
              <div
                className={`${item.count === 0 ? "empty" : ""} ${
                  item.rank >= 16 ? "joker" : ""
                }`}
                key={item.rank}
              >
                <span>{item.label}</span>
                <b>{item.count}</b>
              </div>
            ))}
          </div>
        </aside>

        <div className="play-zone">
          <div className="turn-message">
            <span>{match.actionText}</span>
            <strong>
              {match.phase === "finished"
                ? `${room.players.find((p) => p.seat === match.winner)?.name ?? "玩家"} 获胜`
                : isMyTurn
                  ? "轮到你了"
                  : `等待 ${room.players.find((p) => p.seat === match.currentTurn)?.name ?? "牌友"}`}
            </strong>
          </div>
          {match.lastPlay && (
            <div className="played-cards">
              {match.lastPlay.cards.map((card) => (
                <LanCard key={card.id} card={card} />
              ))}
              <small>{match.lastPlay.combo.label}</small>
            </div>
          )}
        </div>

        <div
          className={`self-player ${match.currentTurn === room.seat ? "active" : ""}`}
        >
          <Portrait />
          <div>
            <strong>
              {room.players.find((player) => player.seat === room.seat)?.name}
            </strong>
            <span>{match.landlord === room.seat ? "地主" : "农民"}</span>
            <small>
              积分{" "}
              {room.players.find((player) => player.seat === room.seat)?.score}
            </small>
          </div>
        </div>

        {match.phase === "bidding" && isMyTurn && (
          <div className="bid-panel">
            <span>你准备叫几分？</span>
            <strong>叫分越高，胜负积分越高</strong>
            <div>
              {[0, 1, 2, 3].map((score) => (
                <button
                  type="button"
                  key={score}
                  disabled={score > 0 && score <= match.highestBid}
                  onClick={() => send({ type: "bid", score })}
                >
                  {score === 0 ? "不叫" : `${score} 分`}
                </button>
              ))}
            </div>
          </div>
        )}

        {match.phase !== "finished" && (
          <>
            <div className="hand" aria-label="你的手牌">
              <span className="hand-caption">
                手牌 <b>{match.hand.length}</b>
              </span>
              {match.hand.map((card) => (
                <LanCard
                  key={card.id}
                  card={card}
                  selected={selectedIds.includes(card.id)}
                  onClick={
                    match.phase === "playing" && isMyTurn
                      ? () => toggleCard(card.id)
                      : undefined
                  }
                />
              ))}
            </div>
            {match.phase === "playing" && (
              <div className="turn-controls">
                {isMyTurn ? (
                  <>
                    <button
                      type="button"
                      className="control secondary"
                      disabled={!match.lastPlay || match.lastPlay.player === room.seat}
                      onClick={() => send({ type: "pass" })}
                    >
                      不出
                    </button>
                    <button
                      type="button"
                      className="control hint"
                      onClick={() => setSelectedIds(match.hintIds)}
                    >
                      提示
                    </button>
                    <button
                      type="button"
                      className="control primary"
                      disabled={!selectedCards.length}
                      onClick={() => send({ type: "play", cardIds: selectedIds })}
                    >
                      出牌
                    </button>
                  </>
                ) : (
                  <div className="waiting-turn">
                    <i />
                    等待牌友出牌
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {match.phase === "finished" && (
          <div className="lan-result">
            <span className="eyebrow">本局结算</span>
            <h2>
              {room.players.find((player) => player.seat === match.winner)?.name}{" "}
              获胜
            </h2>
            <ScoreTable room={room} finished />
            {room.seat === room.hostSeat && (
              <button
                type="button"
                className="lan-primary"
                onClick={() => send({ type: "start" })}
              >
                再来一局
              </button>
            )}
          </div>
        )}

        {notice && <div className="toast">{notice}</div>}
      </section>
    </main>
  );
}
