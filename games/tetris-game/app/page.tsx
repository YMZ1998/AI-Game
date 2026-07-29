"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 22;
const HIDDEN_ROWS = 2;

type PieceKind = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type Cell = 0 | PieceKind;
type Board = Cell[][];
type Status = "ready" | "playing" | "paused" | "over";

type Piece = {
  kind: PieceKind;
  rotation: number;
  x: number;
  y: number;
};

type Metrics = {
  holes: number;
  height: number;
  bumpiness: number;
  value: number;
};

type AiTarget = Metrics & {
  rotation: number;
  x: number;
};

type GameState = {
  board: Board;
  current: Piece | null;
  next: PieceKind;
  status: Status;
  ai: boolean;
  aiTarget: AiTarget | null;
  score: number;
  best: number;
  lines: number;
  level: number;
  lastClear: number;
  message: string;
};

const SHAPE_NAMES: Record<PieceKind, string> = {
  1: "I",
  2: "L",
  3: "J",
  4: "T",
  5: "O",
  6: "S",
  7: "Z",
};

const SHAPE_COORDS: Record<PieceKind, Array<[number, number]>> = {
  1: [
    [0, -1],
    [0, 0],
    [0, 1],
    [0, 2],
  ],
  2: [
    [0, -1],
    [0, 0],
    [0, 1],
    [1, 1],
  ],
  3: [
    [0, -1],
    [0, 0],
    [0, 1],
    [-1, 1],
  ],
  4: [
    [0, -1],
    [0, 0],
    [0, 1],
    [1, 0],
  ],
  5: [
    [0, 0],
    [0, -1],
    [1, 0],
    [1, -1],
  ],
  6: [
    [0, 0],
    [0, -1],
    [-1, 0],
    [1, -1],
  ],
  7: [
    [0, 0],
    [0, -1],
    [1, 0],
    [-1, -1],
  ],
};

function emptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array<Cell>(BOARD_WIDTH).fill(0),
  );
}

function randomKind(): PieceKind {
  return (Math.floor(Math.random() * 7) + 1) as PieceKind;
}

function rotationCount(kind: PieceKind) {
  if (kind === 5) return 1;
  if (kind === 1 || kind === 6 || kind === 7) return 2;
  return 4;
}

function rotatedOffsets(kind: PieceKind, rotation: number) {
  const normalized = rotation % rotationCount(kind);
  return SHAPE_COORDS[kind].map(([x, y]): [number, number] => {
    if (normalized === 1) return [-y, x];
    if (normalized === 2) return [-x, -y];
    if (normalized === 3) return [y, -x];
    return [x, y];
  });
}

function spawnPiece(kind: PieceKind): Piece {
  const offsets = rotatedOffsets(kind, 0);
  const minY = Math.min(...offsets.map(([, y]) => y));
  return {
    kind,
    rotation: 0,
    x: Math.floor(BOARD_WIDTH / 2),
    y: -minY,
  };
}

function pieceCells(piece: Piece) {
  return rotatedOffsets(piece.kind, piece.rotation).map(
    ([dx, dy]): [number, number] => [piece.x + dx, piece.y + dy],
  );
}

function canPlace(board: Board, piece: Piece) {
  return pieceCells(piece).every(
    ([x, y]) =>
      x >= 0 &&
      x < BOARD_WIDTH &&
      y >= 0 &&
      y < BOARD_HEIGHT &&
      board[y][x] === 0,
  );
}

function dropY(board: Board, piece: Piece) {
  let y = piece.y;
  while (canPlace(board, { ...piece, y: y + 1 })) y += 1;
  return y;
}

function mergePiece(board: Board, piece: Piece) {
  const next = board.map((row) => [...row]);
  pieceCells(piece).forEach(([x, y]) => {
    if (y >= 0 && y < BOARD_HEIGHT) next[y][x] = piece.kind;
  });
  return next;
}

function clearLines(board: Board) {
  const kept = board.filter((row) => row.some((cell) => cell === 0));
  const count = BOARD_HEIGHT - kept.length;
  return {
    board: [
      ...Array.from({ length: count }, () =>
        Array<Cell>(BOARD_WIDTH).fill(0),
      ),
      ...kept,
    ],
    count,
  };
}

function boardMetrics(board: Board, cleared = 0): Metrics {
  const heights: number[] = [];
  let holes = 0;

  for (let x = 0; x < BOARD_WIDTH; x += 1) {
    let firstBlock = -1;
    for (let y = 0; y < BOARD_HEIGHT; y += 1) {
      if (board[y][x] !== 0 && firstBlock === -1) firstBlock = y;
      if (firstBlock !== -1 && board[y][x] === 0) holes += 1;
    }
    heights.push(firstBlock === -1 ? 0 : BOARD_HEIGHT - firstBlock);
  }

  const height = Math.max(...heights);
  const bumpiness = heights
    .slice(1)
    .reduce((sum, value, index) => sum + Math.abs(value - heights[index]), 0);
  const value =
    cleared * 18 -
    holes * 7.5 -
    height * 0.72 -
    bumpiness * 0.48;

  return { holes, height, bumpiness, value };
}

function simulatePlacement(
  board: Board,
  kind: PieceKind,
  rotation: number,
  x: number,
) {
  const offsets = rotatedOffsets(kind, rotation);
  const minY = Math.min(...offsets.map(([, y]) => y));
  const piece = { kind, rotation, x, y: -minY };
  if (!canPlace(board, piece)) return null;
  piece.y = dropY(board, piece);
  const cleared = clearLines(mergePiece(board, piece));
  return {
    ...cleared,
    piece,
    metrics: boardMetrics(cleared.board, cleared.count),
  };
}

function candidateColumns(kind: PieceKind, rotation: number) {
  const offsets = rotatedOffsets(kind, rotation);
  const minX = Math.min(...offsets.map(([x]) => x));
  const maxX = Math.max(...offsets.map(([x]) => x));
  return Array.from(
    { length: BOARD_WIDTH - maxX + minX },
    (_, index) => index - minX,
  );
}

function chooseAiTarget(
  board: Board,
  current: PieceKind,
  next: PieceKind,
): AiTarget | null {
  let best: AiTarget | null = null;

  for (
    let rotation = 0;
    rotation < rotationCount(current);
    rotation += 1
  ) {
    for (const x of candidateColumns(current, rotation)) {
      const first = simulatePlacement(board, current, rotation, x);
      if (!first) continue;

      let lookahead = -Infinity;
      for (
        let nextRotation = 0;
        nextRotation < rotationCount(next);
        nextRotation += 1
      ) {
        for (const nextX of candidateColumns(next, nextRotation)) {
          const second = simulatePlacement(
            first.board,
            next,
            nextRotation,
            nextX,
          );
          if (second) lookahead = Math.max(lookahead, second.metrics.value);
        }
      }

      const value =
        first.metrics.value +
        (Number.isFinite(lookahead) ? lookahead * 0.34 : -25);
      if (!best || value > best.value) {
        best = {
          rotation,
          x,
          holes: first.metrics.holes,
          height: first.metrics.height,
          bumpiness: first.metrics.bumpiness,
          value,
        };
      }
    }
  }

  return best;
}

function createGame(ai: boolean, best: number): GameState {
  const currentKind = randomKind();
  const next = randomKind();
  const board = emptyBoard();
  return {
    board,
    current: spawnPiece(currentKind),
    next,
    status: "playing",
    ai,
    aiTarget: ai ? chooseAiTarget(board, currentKind, next) : null,
    score: 0,
    best,
    lines: 0,
    level: 1,
    lastClear: 0,
    message: ai ? "AI 已接管 · 正在评估落点" : "实验开始 · 保持堆叠平整",
  };
}

const INITIAL_GAME: GameState = {
  board: emptyBoard(),
  current: null,
  next: 4,
  status: "ready",
  ai: false,
  aiTarget: null,
  score: 0,
  best: 0,
  lines: 0,
  level: 1,
  lastClear: 0,
  message: "选择手动模式或让 AI 运行实验",
};

function lockCurrent(state: GameState, piece: Piece, dropBonus = 0): GameState {
  const merged = mergePiece(state.board, piece);
  const cleared = clearLines(merged);
  const lines = state.lines + cleared.count;
  const level = Math.floor(lines / 10) + 1;
  const lineScore = [0, 100, 300, 500, 800][cleared.count] * state.level;
  const score = state.score + lineScore + dropBonus;
  const nextCurrent = spawnPiece(state.next);
  const nextKind = randomKind();
  const over = !canPlace(cleared.board, nextCurrent);
  const best = Math.max(state.best, score);

  return {
    ...state,
    board: cleared.board,
    current: over ? null : nextCurrent,
    next: nextKind,
    status: over ? "over" : "playing",
    aiTarget:
      !over && state.ai
        ? chooseAiTarget(cleared.board, nextCurrent.kind, nextKind)
        : null,
    score,
    best,
    lines,
    level,
    lastClear: cleared.count,
    message: over
      ? "堆叠越过安全线 · 按 R 重新实验"
      : cleared.count
        ? `消除 ${cleared.count} 行 · ${lineScore} 分`
        : state.ai
          ? "AI 已锁定下一落点"
          : "方块已固定",
  };
}

function moveHorizontal(state: GameState, direction: -1 | 1): GameState {
  if (state.status !== "playing" || !state.current || state.ai) return state;
  const moved = { ...state.current, x: state.current.x + direction };
  return canPlace(state.board, moved)
    ? { ...state, current: moved, lastClear: 0, message: "横向位置已调整" }
    : state;
}

function softDrop(state: GameState): GameState {
  if (state.status !== "playing" || !state.current || state.ai) return state;
  const moved = { ...state.current, y: state.current.y + 1 };
  if (canPlace(state.board, moved)) {
    return {
      ...state,
      current: moved,
      score: state.score + 1,
      best: Math.max(state.best, state.score + 1),
      lastClear: 0,
      message: "软降 +1",
    };
  }
  return lockCurrent(state, state.current);
}

function rotateCurrent(state: GameState): GameState {
  if (state.status !== "playing" || !state.current || state.ai) return state;
  const rotation =
    (state.current.rotation + 1) % rotationCount(state.current.kind);
  for (const kick of [0, -1, 1, -2, 2]) {
    const rotated = { ...state.current, rotation, x: state.current.x + kick };
    if (canPlace(state.board, rotated)) {
      return {
        ...state,
        current: rotated,
        lastClear: 0,
        message: kick ? "旋转并完成墙踢修正" : "方块已旋转",
      };
    }
  }
  return { ...state, message: "当前空间不足以旋转" };
}

function hardDrop(state: GameState): GameState {
  if (state.status !== "playing" || !state.current || state.ai) return state;
  const landing = dropY(state.board, state.current);
  const distance = landing - state.current.y;
  return lockCurrent(
    state,
    { ...state.current, y: landing },
    distance * 2,
  );
}

function gravityTick(state: GameState): GameState {
  if (state.status !== "playing" || !state.current) return state;

  if (state.ai) {
    const target =
      state.aiTarget ??
      chooseAiTarget(state.board, state.current.kind, state.next);
    if (target) {
      if (state.current.rotation !== target.rotation) {
        const rotation =
          (state.current.rotation + 1) % rotationCount(state.current.kind);
        const rotated = { ...state.current, rotation };
        if (canPlace(state.board, rotated)) {
          return {
            ...state,
            current: rotated,
            aiTarget: target,
            message: `AI 旋转 ${SHAPE_NAMES[state.current.kind]} 方块`,
          };
        }
      }
      if (state.current.x !== target.x) {
        const moved = {
          ...state.current,
          x: state.current.x + (state.current.x < target.x ? 1 : -1),
        };
        if (canPlace(state.board, moved)) {
          return {
            ...state,
            current: moved,
            aiTarget: target,
            message: `AI 对齐第 ${target.x + 1} 列`,
          };
        }
      }
    }
  }

  const moved = { ...state.current, y: state.current.y + 1 };
  return canPlace(state.board, moved)
    ? { ...state, current: moved, lastClear: 0 }
    : lockCurrent(state, state.current);
}

function displayedCells(state: GameState) {
  const active = new Map<string, PieceKind>();
  const ghost = new Set<string>();

  if (state.current) {
    pieceCells(state.current).forEach(([x, y]) => {
      active.set(`${x},${y}`, state.current!.kind);
    });
    const ghostPiece = {
      ...state.current,
      y: dropY(state.board, state.current),
    };
    pieceCells(ghostPiece).forEach(([x, y]) => {
      if (!active.has(`${x},${y}`)) ghost.add(`${x},${y}`);
    });
  }

  return { active, ghost };
}

function bestFromStorage() {
  if (typeof window === "undefined") return 0;
  const value = Number(window.localStorage.getItem("stack-lab-best") ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export default function Home() {
  const [game, setGame] = useState<GameState>(INITIAL_GAME);

  const startGame = useCallback((ai = game.ai) => {
    setGame(createGame(ai, bestFromStorage()));
  }, [game.ai]);

  useEffect(() => {
    if (game.status !== "playing") return;
    const delay = game.ai
      ? 78
      : Math.max(120, 720 - (game.level - 1) * 55);
    const timer = window.setInterval(
      () => setGame((current) => gravityTick(current)),
      delay,
    );
    return () => window.clearInterval(timer);
  }, [game.ai, game.level, game.status]);

  useEffect(() => {
    if (game.status !== "ready") {
      window.localStorage.setItem("stack-lab-best", String(game.best));
    }
  }, [game.best, game.status]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        setGame((current) =>
          current.status === "playing"
            ? { ...current, status: "paused", message: "窗口离开 · 实验已暂停" }
            : current,
        );
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  const togglePause = useCallback(() => {
    setGame((current) => {
      if (current.status === "playing") {
        return { ...current, status: "paused", message: "实验已暂停" };
      }
      if (current.status === "paused") {
        return { ...current, status: "playing", message: "实验继续" };
      }
      return current;
    });
  }, []);

  const toggleAi = useCallback(() => {
    setGame((current) => {
      const ai = !current.ai;
      if (current.status === "ready" || current.status === "over") {
        return { ...current, ai, message: ai ? "AI 模式待命" : "手动模式待命" };
      }
      return {
        ...current,
        ai,
        aiTarget:
          ai && current.current
            ? chooseAiTarget(current.board, current.current.kind, current.next)
            : null,
        message: ai ? "AI 已接管当前实验" : "已切换为手动控制",
      };
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(event.key)) {
        event.preventDefault();
      }
      if (event.key === "ArrowLeft") {
        setGame((current) => moveHorizontal(current, -1));
      } else if (event.key === "ArrowRight") {
        setGame((current) => moveHorizontal(current, 1));
      } else if (event.key === "ArrowUp") {
        setGame(rotateCurrent);
      } else if (event.key === "ArrowDown") {
        setGame(softDrop);
      } else if (event.key === " ") {
        setGame(hardDrop);
      } else if (event.key.toLowerCase() === "p") {
        togglePause();
      } else if (event.key.toLowerCase() === "r") {
        startGame();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [startGame, togglePause]);

  const visible = useMemo(() => displayedCells(game), [game]);
  const nextOffsets = rotatedOffsets(game.next, 0);
  const nextMinX = Math.min(...nextOffsets.map(([x]) => x));
  const nextMaxX = Math.max(...nextOffsets.map(([x]) => x));
  const nextMinY = Math.min(...nextOffsets.map(([, y]) => y));
  const nextMaxY = Math.max(...nextOffsets.map(([, y]) => y));
  const nextCells = new Set(
    nextOffsets.map(
      ([x, y]) =>
        `${x - nextMinX + Math.floor((4 - (nextMaxX - nextMinX + 1)) / 2)},${
          y - nextMinY + Math.floor((4 - (nextMaxY - nextMinY + 1)) / 2)
        }`,
    ),
  );

  const manualDisabled = game.ai || game.status !== "playing";
  const modeLabel = game.ai ? "AI AUTO" : "MANUAL";

  return (
    <main className="lab-page">
      <header className="lab-header">
        <div className="brand-block">
          <span className="brand-index">06 / STACK SYSTEM</span>
          <h1>堆叠实验室</h1>
          <p>AI TETRIS WEB PORT</p>
        </div>

        <div className="header-status" aria-live="polite">
          <i className={game.status} />
          <span>{game.message}</span>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className={`mode-switch ${game.ai ? "active" : ""}`}
            onClick={toggleAi}
            aria-pressed={game.ai}
          >
            <span>AI</span>
            {game.ai ? "自动运行" : "手动控制"}
          </button>
          <button type="button" onClick={() => startGame()}>
            {game.status === "ready" ? "开始实验" : "重新开始"}
          </button>
        </div>
      </header>

      <section className="lab-stage" aria-label="俄罗斯方块实验台">
        <div className="board-column">
          <div className="board-frame">
            <div className="board-label">
              <span>PLAYFIELD / 10 × 20</span>
              <strong>{modeLabel}</strong>
            </div>
            <div className="board" role="grid" aria-label="俄罗斯方块棋盘">
              {game.board.slice(HIDDEN_ROWS).flatMap((row, visibleY) =>
                row.map((cell, x) => {
                  const y = visibleY + HIDDEN_ROWS;
                  const active = visible.active.get(`${x},${y}`);
                  const isGhost = visible.ghost.has(`${x},${y}`);
                  const value = active ?? cell;
                  return (
                    <div
                      key={`${x}-${y}`}
                      role="gridcell"
                      className={`board-cell ${value ? `piece-${value}` : ""} ${
                        active ? "active-piece" : ""
                      } ${isGhost ? `ghost piece-${game.current?.kind ?? 0}` : ""} ${
                        game.lastClear && visibleY >= 20 - game.lastClear
                          ? "line-flash"
                          : ""
                      }`}
                      aria-label={
                        value
                          ? `${SHAPE_NAMES[value]} 方块`
                          : isGhost
                            ? "预计落点"
                            : "空格"
                      }
                    />
                  );
                }),
              )}
            </div>

            {(game.status === "ready" ||
              game.status === "paused" ||
              game.status === "over") && (
              <div className={`board-overlay ${game.status}`}>
                <span>
                  {game.status === "ready"
                    ? "SYSTEM READY"
                    : game.status === "paused"
                      ? "PAUSED"
                      : "STACK LIMIT"}
                </span>
                <strong>
                  {game.status === "ready"
                    ? "准备开始堆叠"
                    : game.status === "paused"
                      ? "实验暂停"
                      : "实验结束"}
                </strong>
                <p>
                  {game.status === "over"
                    ? `最终得分 ${game.score.toLocaleString()}`
                    : "方向键移动与旋转，空格直接落下"}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    game.status === "paused" ? togglePause() : startGame()
                  }
                >
                  {game.status === "paused" ? "继续" : "启动"}
                </button>
              </div>
            )}
          </div>

          <div className="touch-controls" aria-label="触屏控制">
            <button
              type="button"
              onClick={() => setGame((current) => moveHorizontal(current, -1))}
              disabled={manualDisabled}
              aria-label="向左移动"
            >
              ←
              <small>LEFT</small>
            </button>
            <button
              type="button"
              onClick={() => setGame(rotateCurrent)}
              disabled={manualDisabled}
              aria-label="顺时针旋转"
            >
              ↻
              <small>ROTATE</small>
            </button>
            <button
              type="button"
              onClick={() => setGame((current) => moveHorizontal(current, 1))}
              disabled={manualDisabled}
              aria-label="向右移动"
            >
              →
              <small>RIGHT</small>
            </button>
            <button
              type="button"
              onClick={() => setGame(softDrop)}
              disabled={manualDisabled}
              aria-label="向下移动"
            >
              ↓
              <small>DOWN</small>
            </button>
            <button
              type="button"
              className="drop-control"
              onClick={() => setGame(hardDrop)}
              disabled={manualDisabled}
              aria-label="直接落下"
            >
              DROP
              <small>SPACE</small>
            </button>
          </div>
        </div>

        <aside className="telemetry-rail">
          <section className="next-module">
            <div className="module-heading">
              <span>NEXT SHAPE</span>
              <strong>{SHAPE_NAMES[game.next]}</strong>
            </div>
            <div className="next-grid" aria-label="下一个方块">
              {Array.from({ length: 16 }, (_, index) => {
                const x = index % 4;
                const y = Math.floor(index / 4);
                return (
                  <i
                    key={index}
                    className={nextCells.has(`${x},${y}`) ? `piece-${game.next}` : ""}
                  />
                );
              })}
            </div>
          </section>

          <section className="score-module">
            <div>
              <span>SCORE</span>
              <strong>{game.score.toLocaleString().padStart(6, "0")}</strong>
            </div>
            <div className="score-grid">
              <p>
                <span>LINES</span>
                <b>{String(game.lines).padStart(3, "0")}</b>
              </p>
              <p>
                <span>LEVEL</span>
                <b>{String(game.level).padStart(2, "0")}</b>
              </p>
              <p>
                <span>BEST</span>
                <b>{game.best.toLocaleString()}</b>
              </p>
              <p>
                <span>MODE</span>
                <b>{game.ai ? "AI" : "YOU"}</b>
              </p>
            </div>
          </section>

          <section className={`ai-module ${game.ai ? "online" : ""}`}>
            <div className="module-heading">
              <span>AI DECISION TRACE</span>
              <strong>{game.ai ? "ONLINE" : "STANDBY"}</strong>
            </div>
            <div className="trace">
              <div>
                <span>TARGET COLUMN</span>
                <b>{game.aiTarget ? game.aiTarget.x + 1 : "—"}</b>
              </div>
              <div>
                <span>ROTATION</span>
                <b>{game.aiTarget ? `${game.aiTarget.rotation * 90}°` : "—"}</b>
              </div>
              <div>
                <span>HOLES</span>
                <b>{game.aiTarget?.holes ?? "—"}</b>
              </div>
              <div>
                <span>STACK HEIGHT</span>
                <b>{game.aiTarget?.height ?? "—"}</b>
              </div>
              <div className="trace-wide">
                <span>BOARD VALUE</span>
                <b>{game.aiTarget ? game.aiTarget.value.toFixed(2) : "—"}</b>
              </div>
            </div>
            <p>
              两步前瞻：先评估当前方块，再以 34% 权重模拟下一方块。
            </p>
          </section>

          <section className="key-module">
            <span>CONTROL MAP</span>
            <div>
              <kbd>← →</kbd><b>移动</b>
              <kbd>↑</kbd><b>旋转</b>
              <kbd>↓</kbd><b>软降</b>
              <kbd>SPACE</kbd><b>直落</b>
              <kbd>P</kbd><b>暂停</b>
              <kbd>R</kbd><b>重开</b>
            </div>
            <button type="button" onClick={togglePause} disabled={game.status === "ready" || game.status === "over"}>
              {game.status === "paused" ? "继续实验" : "暂停实验"}
            </button>
          </section>
        </aside>
      </section>

      <footer className="lab-footer">
        <span>WEB PORT / MIT LICENSE / ORIGINAL LOGIC BY JIAJIE ZHANG</span>
        <a
          href="https://github.com/LoveDaisy/tetris_game"
          target="_blank"
          rel="noreferrer"
        >
          SOURCE · LoveDaisy/tetris_game ↗
        </a>
      </footer>
    </main>
  );
}
