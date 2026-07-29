"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type Connection = "connecting" | "websocket" | "polling" | "offline";
type ReactionKey = "共鸣" | "好奇" | "哈哈";

type Member = {
  id: string;
  alias: string;
  color: number;
  isHost: boolean;
};

type ChatMessage = {
  id: string;
  memberId: string;
  alias: string;
  color: number;
  text: string;
  sentAt: string;
  reactions: Record<ReactionKey, number>;
  reactedBySelf: ReactionKey[];
};

type RoomState = {
  type: "chat_state";
  room: {
    code: string;
    isPublic: boolean;
    topic: string;
    topicNumber: number;
  };
  self: Member;
  members: Member[];
  messages: ChatMessage[];
};

type ServerPayload =
  | RoomState
  | { type: "connected" }
  | { type: "error"; message: string };

type ClientAction =
  | { type: "join_public" }
  | { type: "create_room" }
  | { type: "join_room"; code: string }
  | { type: "send_message"; text: string }
  | { type: "react"; messageId: string; reaction: ReactionKey }
  | { type: "next_topic" }
  | { type: "clear_messages" }
  | { type: "leave" };

const REACTIONS: ReactionKey[] = ["共鸣", "好奇", "哈哈"];

function makeClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export default function AnonymousChat() {
  const [connection, setConnection] = useState<Connection>("connecting");
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("正在寻找大厅信号…");
  const [joining, setJoining] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clientIdRef = useRef(makeClientId());
  const desiredJoinRef = useRef<ClientAction | null>(null);
  const roomStateRef = useRef<RoomState | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const acceptPayload = useCallback((payload: ServerPayload) => {
    if (payload.type === "chat_state") {
      roomStateRef.current = payload;
      setRoomState(payload);
      setNotice(
        payload.room.isPublic
          ? "已接入公共频道"
          : `已接入私密频率 ${payload.room.code}`,
      );
      setJoining(false);
      return;
    }
    if (payload.type === "error") {
      setNotice(payload.message);
      setJoining(false);
    }
  }, []);

  const pollingRequest = useCallback(
    async (action?: ClientAction) => {
      const endpoint = `/api/anonymous-chat/room?clientId=${encodeURIComponent(clientIdRef.current)}`;
      const response = await fetch(endpoint, {
        method: action ? "POST" : "GET",
        headers: action ? { "content-type": "application/json" } : undefined,
        body: action ? JSON.stringify(action) : undefined,
        cache: "no-store",
      });
      const payload = (await response.json()) as ServerPayload;
      acceptPayload(payload);
      return payload;
    },
    [acceptPayload],
  );

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  const startPolling = useCallback(async () => {
    stopPolling();
    setConnection("connecting");
    try {
      await pollingRequest();
      setConnection("polling");
      if (desiredJoinRef.current) {
        await pollingRequest(desiredJoinRef.current);
      }
      pollingTimerRef.current = setInterval(() => {
        void pollingRequest().catch(() => {
          setConnection("offline");
          setNotice("大厅信号暂时中断，正在等待恢复");
        });
      }, 900);
    } catch {
      setConnection("offline");
      setNotice("无法连接大厅，请确认游戏大厅正在运行");
    }
  }, [pollingRequest, stopPolling]);

  useEffect(() => {
    let disposed = false;
    let fallbackStarted = false;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const websocket = new WebSocket(
      `${protocol}//${window.location.host}/anonymous-chat-ws`,
    );
    socketRef.current = websocket;

    websocket.addEventListener("open", () => {
      if (disposed) return;
      setConnection("websocket");
      setNotice("大厅信号清晰，可以进入频道");
    });
    websocket.addEventListener("message", (event) => {
      if (disposed) return;
      try {
        acceptPayload(JSON.parse(String(event.data)) as ServerPayload);
      } catch {
        setNotice("收到了一段无法识别的信号");
      }
    });
    const fallback = () => {
      if (disposed || fallbackStarted) return;
      fallbackStarted = true;
      socketRef.current = null;
      void startPolling();
    };
    websocket.addEventListener("error", fallback, { once: true });
    websocket.addEventListener("close", fallback, { once: true });

    const timeout = window.setTimeout(() => {
      if (websocket.readyState !== WebSocket.OPEN) {
        websocket.close();
        fallback();
      }
    }, 1500);

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      stopPolling();
      websocket.close();
    };
  }, [acceptPayload, startPolling, stopPolling]);

  useEffect(() => {
    roomStateRef.current = roomState;
  }, [roomState]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [roomState?.messages.length]);

  const sendAction = useCallback(
    async (action: ClientAction) => {
      if (
        action.type === "join_public" ||
        action.type === "join_room" ||
        action.type === "create_room"
      ) {
        desiredJoinRef.current = action;
        setJoining(true);
      }

      const socket = socketRef.current;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(action));
        return;
      }
      try {
        await pollingRequest(action);
      } catch {
        setConnection("offline");
        setNotice("发送失败，请等待大厅信号恢复");
        setJoining(false);
      }
    },
    [pollingRequest],
  );

  const joinPrivateRoom = (event: FormEvent) => {
    event.preventDefault();
    const normalized = roomCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(normalized)) {
      setNotice("请输入 4 位字母或数字房间码");
      return;
    }
    void sendAction({ type: "join_room", code: normalized });
  };

  const submitMessage = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !roomState) return;
    void sendAction({ type: "send_message", text });
    setDraft("");
  };

  const leaveRoom = () => {
    desiredJoinRef.current = null;
    void sendAction({ type: "leave" });
    roomStateRef.current = null;
    setRoomState(null);
    setRoomCode("");
    setNotice("已离开频道，匿名代号随本次连接保留");
  };

  const connectionLabel = {
    connecting: "调频中",
    websocket: "实时在线",
    polling: "兼容在线",
    offline: "信号中断",
  }[connection];

  return (
    <main className="radio-page">
      <header className="radio-header">
        <div className="brand-lockup">
          <span className="brand-frequency">FM 00:07</span>
          <h1>匿名夜话</h1>
          <p>MIDNIGHT FREQUENCY</p>
        </div>
        <div className={`connection-pill ${connection}`}>
          <i aria-hidden="true" />
          <span>{connectionLabel}</span>
        </div>
        <div className="privacy-note">
          <span>MEMORY ONLY</span>
          <strong>重启大厅即清空</strong>
        </div>
      </header>

      <div className="frequency-strip" aria-hidden="true">
        <span>87</span>
        <i />
        <i />
        <i className="active" />
        <i />
        <i />
        <strong>{roomState?.room.code ?? "PLAYROOM"}</strong>
        <i />
        <i />
        <i />
        <span>108</span>
      </div>

      {!roomState ? (
        <section className="lobby-stage" aria-label="匿名聊天室入口">
          <div className="lobby-intro">
            <span className="eyebrow">NO ACCOUNT · NO HISTORY</span>
            <h2>
              今晚，
              <br />
              换个名字说话。
            </h2>
            <p>
              无需账号，系统会分配随机匿名代号。和同一局域网里的朋友回答话题、
              交换共鸣，离开后不留下个人资料。
            </p>
            <div className="signal-orbit" aria-hidden="true">
              <i />
              <i />
              <div>匿</div>
              <span>LIVE</span>
            </div>
          </div>

          <div className="entry-console">
            <div className="console-heading">
              <span>CHOOSE A FREQUENCY</span>
              <strong>选择频道</strong>
            </div>
            <button
              type="button"
              className="primary-entry"
              onClick={() => void sendAction({ type: "join_public" })}
              disabled={joining || connection === "offline"}
            >
              <span>
                <b>公共频道</b>
                <small>遇见大厅里的匿名玩家</small>
              </span>
              <i>↗</i>
            </button>
            <button
              type="button"
              className="secondary-entry"
              onClick={() => void sendAction({ type: "create_room" })}
              disabled={joining || connection === "offline"}
            >
              <span>
                <b>创建私密房间</b>
                <small>生成 4 位码，邀请朋友加入</small>
              </span>
              <i>＋</i>
            </button>
            <div className="entry-divider">
              <span>OR TUNE BY CODE</span>
            </div>
            <form onSubmit={joinPrivateRoom} className="code-form">
              <label htmlFor="room-code">加入私密频率</label>
              <div>
                <input
                  id="room-code"
                  value={roomCode}
                  onChange={(event) =>
                    setRoomCode(
                      event.target.value
                        .toUpperCase()
                        .replace(/[^A-Z0-9]/g, "")
                        .slice(0, 4),
                    )
                  }
                  inputMode="text"
                  autoComplete="off"
                  placeholder="AB12"
                  aria-label="四位房间码"
                  maxLength={4}
                />
                <button type="submit" disabled={joining || roomCode.length !== 4}>
                  接入
                </button>
              </div>
            </form>
            <p className="console-notice" aria-live="polite">
              <i aria-hidden="true" />
              {notice}
            </p>
            <div className="privacy-card">
              <span>临时空间</span>
              <p>
                消息仅保存在大厅主机内存，不写入浏览器或文件；主机停止后全部清空。
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="room-stage">
          <aside className="room-rail">
            <div className="room-stamp">
              <span>{roomState.room.isPublic ? "公开" : "私密"}</span>
              <strong>{roomState.room.code}</strong>
              <small>ROOM FREQUENCY</small>
            </div>
            <div className="self-card">
              <span>你的匿名代号</span>
              <div>
                <i className={`alias-seal color-${roomState.self.color}`}>
                  {roomState.self.alias.slice(0, 1)}
                </i>
                <strong>{roomState.self.alias}</strong>
              </div>
              {roomState.self.isHost && <b>本频道房主</b>}
            </div>
            <button type="button" className="leave-button" onClick={leaveRoom}>
              ← 离开频道
            </button>
            <div className="memory-note">
              <span>MEMORY ONLY</span>
              <p>消息只存在于当前大厅进程。刷新可重连，关闭大厅即清空。</p>
            </div>
          </aside>

          <section className="conversation-panel">
            <header className="conversation-header">
              <div>
                <span>LIVE CONVERSATION</span>
                <strong>{roomState.members.length} 人正在收听</strong>
              </div>
              <p aria-live="polite">
                <i aria-hidden="true" />
                {notice}
              </p>
            </header>

            <div className="message-list" aria-live="polite">
              {roomState.messages.length === 0 ? (
                <div className="empty-air">
                  <span>00:00</span>
                  <strong>空气很安静，等你先开口。</strong>
                  <p>回答右侧的今晚话题，或分享此刻最想说的一句话。</p>
                </div>
              ) : (
                roomState.messages.map((message) => (
                  <article
                    className={`message-card ${
                      message.memberId === roomState.self.id ? "mine" : ""
                    }`}
                    key={message.id}
                  >
                    <i className={`alias-seal color-${message.color}`}>
                      {message.alias.slice(0, 1)}
                    </i>
                    <div className="message-content">
                      <header>
                        <strong>{message.alias}</strong>
                        <time dateTime={message.sentAt}>
                          {formatTime(message.sentAt)}
                        </time>
                      </header>
                      <p>{message.text}</p>
                      <div className="reaction-row" aria-label="回应这条消息">
                        {REACTIONS.map((reaction) => (
                          <button
                            type="button"
                            key={reaction}
                            className={
                              message.reactedBySelf.includes(reaction)
                                ? "reacted"
                                : ""
                            }
                            onClick={() =>
                              void sendAction({
                                type: "react",
                                messageId: message.id,
                                reaction,
                              })
                            }
                            aria-pressed={message.reactedBySelf.includes(reaction)}
                          >
                            <span>
                              {reaction === "共鸣"
                                ? "◉"
                                : reaction === "好奇"
                                  ? "?"
                                  : "⌣"}
                            </span>
                            {reaction}
                            {message.reactions[reaction] > 0 && (
                              <b>{message.reactions[reaction]}</b>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </article>
                ))
              )}
              <div ref={messageEndRef} />
            </div>

            <form className="composer" onSubmit={submitMessage}>
              <label htmlFor="message-draft">
                以 <strong>{roomState.self.alias}</strong> 的身份发言
              </label>
              <div>
                <textarea
                  id="message-draft"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value.slice(0, 160))}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  placeholder="写下此刻想说的话…"
                  maxLength={160}
                  rows={2}
                />
                <button type="submit" disabled={!draft.trim()}>
                  发出信号
                  <span>↗</span>
                </button>
              </div>
              <small>{draft.length}/160 · Enter 发送 · Shift + Enter 换行</small>
            </form>
          </section>

          <aside className="topic-rail">
            <section className="topic-card">
              <div className="topic-label">
                <span>TONIGHT&apos;S QUESTION</span>
                <b>#{String(roomState.room.topicNumber).padStart(2, "0")}</b>
              </div>
              <blockquote>{roomState.room.topic}</blockquote>
              {roomState.self.isHost ? (
                <button
                  type="button"
                  onClick={() => void sendAction({ type: "next_topic" })}
                >
                  换一个话题 ↻
                </button>
              ) : (
                <p>房主可以切换下一道话题</p>
              )}
            </section>

            <section className="listeners-card">
              <header>
                <span>LISTENERS</span>
                <strong>{roomState.members.length}</strong>
              </header>
              <ul>
                {roomState.members.map((member) => (
                  <li key={member.id}>
                    <i className={`alias-dot color-${member.color}`} />
                    <span>{member.alias}</span>
                    {member.isHost && <b>HOST</b>}
                  </li>
                ))}
              </ul>
            </section>

            {roomState.self.isHost && (
              <section className="host-card">
                <span>HOST CONTROL</span>
                <p>清屏会移除当前房间的全部消息和回应。</p>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("确定清空当前房间的所有消息吗？")) {
                      void sendAction({ type: "clear_messages" });
                    }
                  }}
                >
                  清空频道
                </button>
              </section>
            )}
          </aside>
        </section>
      )}

      <footer className="radio-footer">
        <span>ANONYMOUS · LOCAL NETWORK · EPHEMERAL</span>
        <p>无需账号 · 随机代号 · 内存消息 · 同端口局域网</p>
      </footer>
    </main>
  );
}
