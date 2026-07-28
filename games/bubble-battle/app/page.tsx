"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

const COLS = 15;
const ROWS = 11;
const TILE = 56;
const WIDTH = COLS * TILE;
const HEIGHT = ROWS * TILE;
const ROUND_SECONDS = 120;

type Status = "ready" | "playing" | "levelComplete" | "gameOver";
type Direction = "up" | "down" | "left" | "right";
type PowerType = "speed" | "range" | "bubble";

type Actor = {
  x: number;
  y: number;
  direction: Direction;
  speed: number;
  turnAt: number;
  color: string;
};

type Bomb = {
  id: number;
  col: number;
  row: number;
  fuse: number;
  range: number;
};

type Flame = {
  col: number;
  row: number;
  life: number;
};

type PowerUp = {
  col: number;
  row: number;
  type: PowerType;
  bob: number;
};

type Runtime = {
  status: Status;
  board: number[][];
  player: Actor;
  enemies: Actor[];
  bombs: Bomb[];
  flames: Flame[];
  powerUps: PowerUp[];
  level: number;
  score: number;
  lives: number;
  timeLeft: number;
  bombRange: number;
  maxBombs: number;
  invulnerable: number;
  lastTime: number;
  nextBombId: number;
  levelClearDelay: number;
};

type Hud = {
  status: Status;
  level: number;
  score: number;
  lives: number;
  timeLeft: number;
  range: number;
  bubbles: number;
  enemies: number;
};

const directions: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const spawnSafe = new Set([
  "1,1",
  "2,1",
  "1,2",
  "13,9",
  "12,9",
  "13,8",
  "1,9",
  "2,9",
  "1,8",
  "13,1",
  "12,1",
  "13,2",
]);

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function buildBoard(level: number) {
  const random = seededRandom(6889 + level * 917);
  return Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLS }, (_, col) => {
      if (
        row === 0 ||
        col === 0 ||
        row === ROWS - 1 ||
        col === COLS - 1 ||
        (row % 2 === 0 && col % 2 === 0)
      ) {
        return 1;
      }
      if (spawnSafe.has(`${col},${row}`)) return 0;
      return random() < Math.min(0.43 + level * 0.015, 0.56) ? 2 : 0;
    }),
  );
}

function tileCenter(tile: number) {
  return tile * TILE + TILE / 2;
}

function makeActor(
  col: number,
  row: number,
  color: string,
  speed: number,
): Actor {
  return {
    x: tileCenter(col),
    y: tileCenter(row),
    direction: "down",
    speed,
    turnAt: 0,
    color,
  };
}

function createRuntime(level = 1, score = 0, lives = 3): Runtime {
  const enemySpawns = [
    [13, 9],
    [1, 9],
    [13, 1],
    [7, 9],
  ];
  const colors = ["#ff5e7d", "#8b65ff", "#ff9e3d", "#32c4a4"];
  const enemyCount = Math.min(2 + level, 4);

  return {
    status: "ready",
    board: buildBoard(level),
    player: makeActor(1, 1, "#25a9ff", 172),
    enemies: enemySpawns
      .slice(0, enemyCount)
      .map(([col, row], index) =>
        makeActor(col, row, colors[index], 92 + level * 7),
      ),
    bombs: [],
    flames: [],
    powerUps: [],
    level,
    score,
    lives,
    timeLeft: Math.max(75, ROUND_SECONDS - (level - 1) * 8),
    bombRange: 2,
    maxBombs: 1,
    invulnerable: 0,
    lastTime: 0,
    nextBombId: 1,
    levelClearDelay: 0,
  };
}

function canOccupy(
  runtime: Runtime,
  x: number,
  y: number,
  radius: number,
  ignoreBombTile?: string,
) {
  const corners = [
    [x - radius, y - radius],
    [x + radius, y - radius],
    [x - radius, y + radius],
    [x + radius, y + radius],
  ];

  return corners.every(([px, py]) => {
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (runtime.board[row]?.[col] !== 0) return false;
    const key = `${col},${row}`;
    return (
      key === ignoreBombTile ||
      !runtime.bombs.some((bomb) => bomb.col === col && bomb.row === row)
    );
  });
}

function moveActor(
  runtime: Runtime,
  actor: Actor,
  dx: number,
  dy: number,
  delta: number,
) {
  const radius = 18;
  const bombCol = Math.floor(actor.x / TILE);
  const bombRow = Math.floor(actor.y / TILE);
  const standingBomb = runtime.bombs.some(
    (bomb) => bomb.col === bombCol && bomb.row === bombRow,
  )
    ? `${bombCol},${bombRow}`
    : undefined;
  const nextX = actor.x + dx * actor.speed * delta;
  const nextY = actor.y + dy * actor.speed * delta;

  if (canOccupy(runtime, nextX, actor.y, radius, standingBomb)) {
    actor.x = nextX;
  }
  if (canOccupy(runtime, actor.x, nextY, radius, standingBomb)) {
    actor.y = nextY;
  }
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawWater(context: CanvasRenderingContext2D, time: number) {
  const gradient = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#aef2ff");
  gradient.addColorStop(0.55, "#66d6f3");
  gradient.addColorStop(1, "#27b8dc");
  context.fillStyle = gradient;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.strokeStyle = "rgba(255,255,255,.3)";
  context.lineWidth = 3;
  for (let row = 0; row < ROWS; row += 1) {
    context.beginPath();
    for (let x = -20; x <= WIDTH + 20; x += 20) {
      const y =
        row * TILE +
        17 +
        Math.sin(x * 0.035 + time * 1.8 + row * 0.7) * 3;
      if (x === -20) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }
}

function drawBoard(
  context: CanvasRenderingContext2D,
  runtime: Runtime,
  time: number,
) {
  drawWater(context, time);

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const tile = runtime.board[row][col];
      const x = col * TILE;
      const y = row * TILE;

      if (tile === 0) {
        context.fillStyle =
          (row + col) % 2 === 0
            ? "rgba(255,255,255,.14)"
            : "rgba(13,127,178,.07)";
        roundedRect(context, x + 4, y + 4, TILE - 8, TILE - 8, 12);
        context.fill();
        continue;
      }

      if (tile === 1) {
        context.fillStyle = "#eafcff";
        roundedRect(context, x + 3, y + 1, TILE - 6, TILE - 7, 15);
        context.fill();
        context.fillStyle = "#a8e5f0";
        roundedRect(context, x + 5, y + 9, TILE - 10, TILE - 15, 12);
        context.fill();
        context.fillStyle = "#ffffff";
        context.globalAlpha = 0.78;
        roundedRect(context, x + 10, y + 7, TILE - 25, 11, 6);
        context.fill();
        context.globalAlpha = 1;
      } else {
        const jiggle = Math.sin(time * 2.5 + row + col) * 0.7;
        context.save();
        context.translate(0, jiggle);
        context.fillStyle = "#ffb541";
        roundedRect(context, x + 6, y + 5, TILE - 12, TILE - 13, 12);
        context.fill();
        context.fillStyle = "#df7f2d";
        roundedRect(context, x + 10, y + 10, TILE - 20, TILE - 21, 8);
        context.fill();
        context.strokeStyle = "#ffe080";
        context.lineWidth = 5;
        context.beginPath();
        context.moveTo(x + 12, y + TILE / 2);
        context.lineTo(x + TILE - 12, y + TILE / 2);
        context.moveTo(x + TILE / 2, y + 10);
        context.lineTo(x + TILE / 2, y + TILE - 13);
        context.stroke();
        context.restore();
      }
    }
  }
}

function drawActor(
  context: CanvasRenderingContext2D,
  actor: Actor,
  time: number,
  player = false,
  faded = false,
) {
  const bounce = Math.sin(time * 7 + actor.x * 0.01) * 1.6;
  context.save();
  context.translate(actor.x, actor.y + bounce);
  if (faded) context.globalAlpha = 0.36 + Math.sin(time * 18) * 0.22;

  context.fillStyle = "rgba(18,83,110,.2)";
  context.beginPath();
  context.ellipse(0, 20, 20, 7, 0, 0, Math.PI * 2);
  context.fill();

  const bodyGradient = context.createRadialGradient(-8, -12, 3, 0, 0, 29);
  bodyGradient.addColorStop(0, "#ffffff");
  bodyGradient.addColorStop(0.2, actor.color);
  bodyGradient.addColorStop(1, player ? "#087dcf" : actor.color);
  context.fillStyle = bodyGradient;
  context.beginPath();
  context.arc(0, -1, 24, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#ffffff";
  context.beginPath();
  context.ellipse(-8, -5, 7, 9, 0, 0, Math.PI * 2);
  context.ellipse(8, -5, 7, 9, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#103a55";
  context.beginPath();
  context.arc(-6, -3, 3, 0, Math.PI * 2);
  context.arc(10, -3, 3, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "#103a55";
  context.lineWidth = 2.5;
  context.lineCap = "round";
  context.beginPath();
  context.arc(1, 7, 7, 0.2, Math.PI - 0.2);
  context.stroke();

  if (player) {
    context.fillStyle = "#ffe562";
    roundedRect(context, -18, -31, 36, 10, 5);
    context.fill();
    context.fillStyle = "#ff5c72";
    roundedRect(context, -8, -38, 16, 10, 4);
    context.fill();
  } else {
    context.fillStyle = "#fff";
    context.globalAlpha *= 0.7;
    context.beginPath();
    context.arc(-12, -14, 5, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawBomb(
  context: CanvasRenderingContext2D,
  bomb: Bomb,
  time: number,
) {
  const x = tileCenter(bomb.col);
  const y = tileCenter(bomb.row);
  const pulse = 1 + Math.sin(time * 10 + bomb.id) * 0.06;
  context.save();
  context.translate(x, y);
  context.scale(pulse, pulse);
  const gradient = context.createRadialGradient(-9, -10, 2, 0, 0, 27);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.15, "#8beeff");
  gradient.addColorStop(0.65, "#25b8ef");
  gradient.addColorStop(1, "#0874c7");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(0, 1, 23, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#ffffff";
  context.globalAlpha = 0.72;
  context.lineWidth = 3;
  context.beginPath();
  context.arc(-6, -5, 11, Math.PI, Math.PI * 1.55);
  context.stroke();
  context.globalAlpha = 1;
  context.fillStyle = bomb.fuse < 0.65 ? "#ff3d5d" : "#fff169";
  context.beginPath();
  context.arc(10, -17, 5, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawFlames(context: CanvasRenderingContext2D, flames: Flame[]) {
  flames.forEach((flame) => {
    const x = tileCenter(flame.col);
    const y = tileCenter(flame.row);
    const scale = Math.min(1, flame.life * 4);
    context.save();
    context.translate(x, y);
    context.scale(scale, scale);
    context.shadowColor = "#fff05a";
    context.shadowBlur = 18;
    context.fillStyle = "#ff5b43";
    roundedRect(context, -25, -25, 50, 50, 18);
    context.fill();
    context.fillStyle = "#fff06d";
    roundedRect(context, -17, -17, 34, 34, 13);
    context.fill();
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(-6, -7, 6, 0, Math.PI * 2);
    context.fill();
    context.restore();
  });
}

function drawPowerUp(
  context: CanvasRenderingContext2D,
  powerUp: PowerUp,
  time: number,
) {
  const x = tileCenter(powerUp.col);
  const y = tileCenter(powerUp.row) + Math.sin(time * 4 + powerUp.bob) * 4;
  const color =
    powerUp.type === "speed"
      ? "#55e398"
      : powerUp.type === "range"
        ? "#ff775f"
        : "#7f6fff";
  context.save();
  context.translate(x, y);
  context.shadowColor = color;
  context.shadowBlur = 16;
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(0, 0, 18, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = color;
  context.font = "900 19px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(
    powerUp.type === "speed" ? "⚡" : powerUp.type === "range" ? "↔" : "●",
    0,
    1,
  );
  context.restore();
}

function drawScene(context: CanvasRenderingContext2D, runtime: Runtime) {
  const time = performance.now() / 1000;
  drawBoard(context, runtime, time);
  runtime.powerUps.forEach((powerUp) =>
    drawPowerUp(context, powerUp, time),
  );
  runtime.bombs.forEach((bomb) => drawBomb(context, bomb, time));
  runtime.enemies.forEach((enemy) => drawActor(context, enemy, time));
  drawActor(
    context,
    runtime.player,
    time,
    true,
    runtime.invulnerable > 0,
  );
  drawFlames(context, runtime.flames);
}

function flameKey(col: number, row: number) {
  return `${col},${row}`;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<Runtime>(createRuntime());
  const keysRef = useRef<Set<string>>(new Set());
  const animationRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(false);
  const [muted, setMuted] = useState(false);
  const [bestScore, setBestScore] = useState(0);
  const [hud, setHud] = useState<Hud>({
    status: "ready",
    level: 1,
    score: 0,
    lives: 3,
    timeLeft: ROUND_SECONDS,
    range: 2,
    bubbles: 1,
    enemies: 3,
  });

  const syncHud = useCallback(() => {
    const runtime = runtimeRef.current;
    setHud({
      status: runtime.status,
      level: runtime.level,
      score: runtime.score,
      lives: runtime.lives,
      timeLeft: Math.max(0, Math.ceil(runtime.timeLeft)),
      range: runtime.bombRange,
      bubbles: runtime.maxBombs,
      enemies: runtime.enemies.length,
    });
  }, []);

  const playTone = useCallback(
    (frequency: number, duration = 0.08, type: OscillatorType = "sine") => {
      if (mutedRef.current) return;
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }).webkitAudioContext;
        if (!AudioContextClass) return;
        if (!audioRef.current) audioRef.current = new AudioContextClass();
        const audio = audioRef.current;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.05, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audio.currentTime + duration,
        );
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + duration);
      } catch {
        // Sound is optional and does not affect play.
      }
    },
    [],
  );

  const saveBest = useCallback((score: number) => {
    setBestScore((current) => {
      const next = Math.max(current, score);
      localStorage.setItem("bubble-battle-best", String(next));
      return next;
    });
  }, []);

  const resetGame = useCallback(() => {
    runtimeRef.current = createRuntime();
    runtimeRef.current.status = "playing";
    keysRef.current.clear();
    playTone(520, 0.12, "triangle");
    syncHud();
  }, [playTone, syncHud]);

  const nextLevel = useCallback(() => {
    const current = runtimeRef.current;
    runtimeRef.current = createRuntime(
      current.level + 1,
      current.score + 500,
      Math.min(5, current.lives + 1),
    );
    runtimeRef.current.status = "playing";
    playTone(720, 0.14, "triangle");
    syncHud();
  }, [playTone, syncHud]);

  const placeBomb = useCallback(() => {
    const runtime = runtimeRef.current;
    if (
      runtime.status !== "playing" ||
      runtime.bombs.length >= runtime.maxBombs
    ) {
      return;
    }
    const col = Math.floor(runtime.player.x / TILE);
    const row = Math.floor(runtime.player.y / TILE);
    if (
      runtime.bombs.some((bomb) => bomb.col === col && bomb.row === row)
    ) {
      return;
    }
    runtime.bombs.push({
      id: runtime.nextBombId,
      col,
      row,
      fuse: 2.15,
      range: runtime.bombRange,
    });
    runtime.nextBombId += 1;
    playTone(260, 0.07, "sine");
  }, [playTone]);

  const explodeBomb = useCallback(
    (runtime: Runtime, bomb: Bomb) => {
      const cells: Array<[number, number]> = [[bomb.col, bomb.row]];
      const rays: Array<[number, number]> = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];

      rays.forEach(([dx, dy]) => {
        for (let step = 1; step <= bomb.range; step += 1) {
          const col = bomb.col + dx * step;
          const row = bomb.row + dy * step;
          const tile = runtime.board[row]?.[col];
          if (tile === 1 || tile === undefined) break;
          cells.push([col, row]);
          if (tile === 2) {
            runtime.board[row][col] = 0;
            runtime.score += 30;
            const dropRoll = (col * 31 + row * 17 + bomb.id * 13) % 10;
            if (dropRoll < 3) {
              const types: PowerType[] = ["range", "speed", "bubble"];
              runtime.powerUps.push({
                col,
                row,
                type: types[dropRoll],
                bob: bomb.id,
              });
            }
            break;
          }
        }
      });

      const keys = new Set(cells.map(([col, row]) => flameKey(col, row)));
      cells.forEach(([col, row]) => {
        const existing = runtime.flames.find(
          (flame) => flame.col === col && flame.row === row,
        );
        if (existing) existing.life = 0.52;
        else runtime.flames.push({ col, row, life: 0.52 });
      });

      runtime.bombs.forEach((other) => {
        if (other.id !== bomb.id && keys.has(flameKey(other.col, other.row))) {
          other.fuse = 0;
        }
      });

      runtime.enemies = runtime.enemies.filter((enemy) => {
        const col = Math.floor(enemy.x / TILE);
        const row = Math.floor(enemy.y / TILE);
        if (!keys.has(flameKey(col, row))) return true;
        runtime.score += 250;
        playTone(760, 0.09, "square");
        return false;
      });

      const playerCol = Math.floor(runtime.player.x / TILE);
      const playerRow = Math.floor(runtime.player.y / TILE);
      if (
        runtime.invulnerable <= 0 &&
        keys.has(flameKey(playerCol, playerRow))
      ) {
        runtime.lives -= 1;
        runtime.invulnerable = 1.8;
        runtime.player.x = tileCenter(1);
        runtime.player.y = tileCenter(1);
        playTone(115, 0.22, "sawtooth");
      } else {
        playTone(150, 0.12, "square");
      }
    },
    [playTone],
  );

  useEffect(() => {
    const stored = Number(localStorage.getItem("bubble-battle-best") || 0);
    const frameId = requestAnimationFrame(() => {
      setBestScore(Number.isFinite(stored) ? stored : 0);
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "Space",
        ].includes(event.code)
      ) {
        event.preventDefault();
      }
      keysRef.current.add(event.code);
      if (event.code === "Space" && !event.repeat) placeBomb();
      if (
        event.code === "Enter" &&
        runtimeRef.current.status === "ready"
      ) {
        resetGame();
      }
    };
    const up = (event: KeyboardEvent) => keysRef.current.delete(event.code);
    const blur = () => keysRef.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [placeBomb, resetGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let lastHudSecond = -1;
    const frame = (timestamp: number) => {
      const runtime = runtimeRef.current;
      const delta = Math.min(
        0.034,
        runtime.lastTime ? (timestamp - runtime.lastTime) / 1000 : 0,
      );
      runtime.lastTime = timestamp;

      if (runtime.status === "playing") {
        runtime.timeLeft -= delta;
        runtime.invulnerable = Math.max(0, runtime.invulnerable - delta);

        let dx = 0;
        let dy = 0;
        const keys = keysRef.current;
        if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
        if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
        if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
        if (keys.has("ArrowDown") || keys.has("KeyS")) dy += 1;
        if (dx !== 0 || dy !== 0) {
          const length = Math.hypot(dx, dy);
          dx /= length;
          dy /= length;
          runtime.player.direction =
            Math.abs(dx) > Math.abs(dy)
              ? dx > 0
                ? "right"
                : "left"
              : dy > 0
                ? "down"
                : "up";
          moveActor(runtime, runtime.player, dx, dy, delta);
        }

        runtime.bombs.forEach((bomb) => {
          bomb.fuse -= delta;
        });
        const exploding = runtime.bombs.filter((bomb) => bomb.fuse <= 0);
        exploding.forEach((bomb) => explodeBomb(runtime, bomb));
        const explodingIds = new Set(exploding.map((bomb) => bomb.id));
        runtime.bombs = runtime.bombs.filter(
          (bomb) => !explodingIds.has(bomb.id),
        );

        runtime.flames.forEach((flame) => {
          flame.life -= delta;
        });
        runtime.flames = runtime.flames.filter((flame) => flame.life > 0);

        runtime.enemies.forEach((enemy, enemyIndex) => {
          enemy.turnAt -= delta;
          const current = directions[enemy.direction];
          const oldX = enemy.x;
          const oldY = enemy.y;
          moveActor(runtime, enemy, current.x, current.y, delta);
          const blocked =
            Math.abs(enemy.x - oldX) < 0.01 &&
            Math.abs(enemy.y - oldY) < 0.01;
          const nearCenter =
            Math.abs((enemy.x % TILE) - TILE / 2) < 2 &&
            Math.abs((enemy.y % TILE) - TILE / 2) < 2;
          if (blocked || (enemy.turnAt <= 0 && nearCenter)) {
            const options = (
              Object.keys(directions) as Direction[]
            ).filter((direction) => {
              const vector = directions[direction];
              return canOccupy(
                runtime,
                enemy.x + vector.x * 8,
                enemy.y + vector.y * 8,
                18,
              );
            });
            if (options.length) {
              const choice =
                Math.floor(
                  timestamp * 0.013 + enemyIndex * 7 + runtime.level * 3,
                ) % options.length;
              enemy.direction = options[choice];
            }
            enemy.turnAt =
              0.4 + ((enemyIndex * 0.37 + timestamp * 0.001) % 0.8);
          }

          if (
            runtime.invulnerable <= 0 &&
            Math.hypot(
              runtime.player.x - enemy.x,
              runtime.player.y - enemy.y,
            ) < 34
          ) {
            runtime.lives -= 1;
            runtime.invulnerable = 1.8;
            runtime.player.x = tileCenter(1);
            runtime.player.y = tileCenter(1);
            playTone(105, 0.22, "sawtooth");
          }
        });

        runtime.powerUps = runtime.powerUps.filter((powerUp) => {
          const x = tileCenter(powerUp.col);
          const y = tileCenter(powerUp.row);
          if (Math.hypot(runtime.player.x - x, runtime.player.y - y) > 27) {
            return true;
          }
          if (powerUp.type === "speed") {
            runtime.player.speed = Math.min(235, runtime.player.speed + 22);
          } else if (powerUp.type === "range") {
            runtime.bombRange = Math.min(5, runtime.bombRange + 1);
          } else {
            runtime.maxBombs = Math.min(4, runtime.maxBombs + 1);
          }
          runtime.score += 100;
          playTone(880, 0.1, "triangle");
          return false;
        });

        if (runtime.lives <= 0 || runtime.timeLeft <= 0) {
          runtime.status = "gameOver";
          runtime.timeLeft = Math.max(0, runtime.timeLeft);
          saveBest(runtime.score);
          syncHud();
        } else if (runtime.enemies.length === 0) {
          runtime.levelClearDelay += delta;
          if (runtime.levelClearDelay >= 0.75) {
            runtime.status = "levelComplete";
            saveBest(runtime.score + 500);
            playTone(960, 0.18, "triangle");
            syncHud();
          }
        }
      }

      const hudSecond = Math.ceil(runtime.timeLeft);
      if (hudSecond !== lastHudSecond) {
        lastHudSecond = hudSecond;
        syncHud();
      }

      drawScene(context, runtime);
      animationRef.current = requestAnimationFrame(frame);
    };

    animationRef.current = requestAnimationFrame(frame);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [explodeBomb, playTone, saveBest, syncHud]);

  const holdDirection = (
    event: ReactPointerEvent<HTMLButtonElement>,
    code: string,
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    keysRef.current.add(code);
  };

  const releaseDirection = (code: string) => {
    keysRef.current.delete(code);
  };

  const overlayTitle =
    hud.status === "ready"
      ? "水花开战！"
      : hud.status === "levelComplete"
        ? "清场成功！"
        : "泡泡破了";
  const overlayCopy =
    hud.status === "ready"
      ? "穿过水上街区，放下泡泡困住捣蛋怪。小心，自己的水花也会伤到你！"
      : hud.status === "levelComplete"
        ? `第 ${hud.level} 区已经恢复清凉，下一片街区会更热闹。`
        : hud.timeLeft <= 0
          ? "时间到！再来一局，找准路线连续引爆。"
          : "别被水花包围。记住先留好退路，再放泡泡！";

  return (
    <main className="page-shell">
      <section className="game-card" aria-label="泡泡堂游戏">
        <header className="game-header">
          <div className="brand">
            <div className="brand-bubble" aria-hidden="true">
              <span />
            </div>
            <div>
              <p>SPLASH DISTRICT</p>
              <h1>泡泡堂</h1>
            </div>
          </div>

          <div className="score-board" aria-live="polite">
            <div>
              <span>得分</span>
              <strong>{hud.score.toLocaleString()}</strong>
            </div>
            <div>
              <span>街区</span>
              <strong>{String(hud.level).padStart(2, "0")}</strong>
            </div>
            <div>
              <span>捣蛋怪</span>
              <strong>{hud.enemies}</strong>
            </div>
            <div className={hud.timeLeft <= 15 ? "danger" : ""}>
              <span>剩余时间</span>
              <strong>{String(hud.timeLeft).padStart(3, "0")}</strong>
            </div>
          </div>

          <button
            className="sound-toggle"
            type="button"
            onClick={() => setMuted((value) => !value)}
            aria-label={muted ? "打开声音" : "关闭声音"}
            title={muted ? "打开声音" : "关闭声音"}
          >
            {muted ? "×" : "♪"}
          </button>
        </header>

        <div className="play-area">
          <aside className="side-panel">
            <div className="player-card">
              <div className="mini-avatar" aria-hidden="true">
                <span />
              </div>
              <div>
                <small>蓝仔</small>
                <strong>水花队长</strong>
              </div>
            </div>
            <div className="life-row" aria-label={`剩余 ${hud.lives} 条生命`}>
              {Array.from({ length: 3 }, (_, index) => (
                <span
                  className={index < hud.lives ? "active" : ""}
                  key={index}
                >
                  ♥
                </span>
              ))}
            </div>
            <div className="ability-list">
              <div>
                <i className="ability-icon range">↔</i>
                <span>水花范围</span>
                <strong>{hud.range}</strong>
              </div>
              <div>
                <i className="ability-icon bubble">●</i>
                <span>泡泡数量</span>
                <strong>{hud.bubbles}</strong>
              </div>
            </div>
            <div className="best">
              <span>今日最佳</span>
              <strong>{bestScore.toLocaleString()}</strong>
            </div>
            <div className="tip">
              <span>战术提示</span>
              炸开橙色箱子，可能掉落速度、范围和泡泡升级。
            </div>
          </aside>

          <div className="canvas-shell">
            <canvas
              ref={canvasRef}
              width={WIDTH}
              height={HEIGHT}
              aria-label="泡泡堂水上街区游戏区域"
              tabIndex={0}
            />

            {hud.status !== "playing" && (
              <div className="overlay">
                <div className="overlay-card">
                  <div className="overlay-kicker">
                    {hud.status === "ready"
                      ? "WATER BATTLE · 01"
                      : hud.status === "levelComplete"
                        ? `DISTRICT ${String(hud.level).padStart(2, "0")} CLEAR`
                        : "TRY ANOTHER ROUTE"}
                  </div>
                  <h2>{overlayTitle}</h2>
                  <p>{overlayCopy}</p>
                  <button
                    type="button"
                    className="start-button"
                    onClick={
                      hud.status === "levelComplete" ? nextLevel : resetGame
                    }
                  >
                    {hud.status === "ready"
                      ? "进入街区"
                      : hud.status === "levelComplete"
                        ? "下一街区"
                        : "重新开战"}
                    <span aria-hidden="true">→</span>
                  </button>
                  <div className="key-hint">
                    <kbd>WASD</kbd>
                    <kbd>方向键</kbd>
                    移动
                    <kbd>SPACE</kbd>
                    放泡泡
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mobile-controls" aria-label="触屏游戏控制">
          <div className="d-pad">
            <button
              type="button"
              className="up"
              aria-label="向上移动"
              onPointerDown={(event) => holdDirection(event, "ArrowUp")}
              onPointerUp={() => releaseDirection("ArrowUp")}
              onPointerCancel={() => releaseDirection("ArrowUp")}
            >
              ↑
            </button>
            <button
              type="button"
              className="left"
              aria-label="向左移动"
              onPointerDown={(event) => holdDirection(event, "ArrowLeft")}
              onPointerUp={() => releaseDirection("ArrowLeft")}
              onPointerCancel={() => releaseDirection("ArrowLeft")}
            >
              ←
            </button>
            <button
              type="button"
              className="down"
              aria-label="向下移动"
              onPointerDown={(event) => holdDirection(event, "ArrowDown")}
              onPointerUp={() => releaseDirection("ArrowDown")}
              onPointerCancel={() => releaseDirection("ArrowDown")}
            >
              ↓
            </button>
            <button
              type="button"
              className="right"
              aria-label="向右移动"
              onPointerDown={(event) => holdDirection(event, "ArrowRight")}
              onPointerUp={() => releaseDirection("ArrowRight")}
              onPointerCancel={() => releaseDirection("ArrowRight")}
            >
              →
            </button>
          </div>
          <button
            type="button"
            className="bubble-button"
            onPointerDown={placeBomb}
            aria-label="放置泡泡"
          >
            <span />
            放泡泡
          </button>
        </div>

        <footer className="game-footer">
          <div>
            <span className="live-dot" />
            清凉街区正在营业
          </div>
          <p>方向键 / WASD 移动 · 空格键放泡泡 · 连锁引爆得分更快</p>
          <strong>最佳路线：先留退路</strong>
        </footer>
      </section>
    </main>
  );
}
