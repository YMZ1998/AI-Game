"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  buildMap,
  getMapName,
  MAP_COLS,
  MAP_ROWS,
} from "./map-layouts";

const COLS = MAP_COLS;
const ROWS = MAP_ROWS;
const TILE = 56;
const WIDTH = COLS * TILE;
const HEIGHT = ROWS * TILE;
const ROUND_SECONDS = 120;

type Status = "ready" | "playing" | "levelComplete" | "gameOver";
type GameMode = "solo" | "versus";
type Winner = "player1" | "player2" | "draw" | null;
type Direction = "up" | "down" | "left" | "right";
type PowerType =
  | "speed"
  | "range"
  | "bubble"
  | "shield"
  | "clock"
  | "freeze"
  | "remote"
  | "magnet"
  | "heal";

type Actor = {
  x: number;
  y: number;
  direction: Direction;
  speed: number;
  turnAt: number;
  color: string;
};

type Enemy = Actor & {
  id: number;
  bombCooldown: number;
};

type Bomb = {
  id: number;
  col: number;
  row: number;
  fuse: number;
  range: number;
  remote: boolean;
  owner: "player" | "player2" | number;
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
  mode: GameMode;
  winner: Winner;
  mapName: string;
  board: number[][];
  player: Actor;
  player2: Actor | null;
  player1Alive: boolean;
  player2Alive: boolean;
  enemies: Enemy[];
  bombs: Bomb[];
  flames: Flame[];
  powerUps: PowerUp[];
  level: number;
  score: number;
  lives: number;
  timeLeft: number;
  bombRange: number;
  maxBombs: number;
  shield: number;
  freezeTimer: number;
  magnetTimer: number;
  remoteCharges: number;
  invulnerable: number;
  lastTime: number;
  nextBombId: number;
  levelClearDelay: number;
};

type Hud = {
  status: Status;
  mode: GameMode;
  winner: Winner;
  player1Alive: boolean;
  player2Alive: boolean;
  mapName: string;
  level: number;
  score: number;
  lives: number;
  timeLeft: number;
  range: number;
  bubbles: number;
  enemies: number;
  shield: number;
  freeze: number;
  magnet: number;
  remoteCharges: number;
  remoteBombs: number;
  player1Bombs: number;
  player2Bombs: number;
};

const directions: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const powerDropPool: PowerType[] = [
  "range",
  "range",
  "speed",
  "speed",
  "bubble",
  "bubble",
  "shield",
  "shield",
  "clock",
  "freeze",
  "remote",
  "magnet",
  "heal",
];

const powerVisuals: Record<PowerType, { color: string; symbol: string }> = {
  speed: { color: "#23C6D9", symbol: "⚡" },
  range: { color: "#FF5F87", symbol: "↔" },
  bubble: { color: "#7868f2", symbol: "●" },
  shield: { color: "#2563EB", symbol: "◇" },
  clock: { color: "#F6C453", symbol: "+15" },
  freeze: { color: "#65c9ff", symbol: "❄" },
  remote: { color: "#FF5F87", symbol: "R" },
  magnet: { color: "#e54b9a", symbol: "U" },
  heal: { color: "#ff4567", symbol: "♥" },
};

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

function makeEnemy(
  id: number,
  col: number,
  row: number,
  color: string,
  speed: number,
): Enemy {
  return {
    ...makeActor(col, row, color, speed),
    id,
    bombCooldown: 0.8 + id * 0.35,
  };
}

function createRuntime(
  level = 1,
  score = 0,
  lives = 3,
  mode: GameMode = "solo",
): Runtime {
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
    mode,
    winner: null,
    mapName: getMapName(level),
    board: buildMap(level),
    player: makeActor(1, 1, "#25a9ff", 172),
    player2:
      mode === "versus" ? makeActor(13, 9, "#ff5e7d", 172) : null,
    player1Alive: true,
    player2Alive: mode === "versus",
    enemies:
      mode === "solo"
        ? enemySpawns
            .slice(0, enemyCount)
            .map(([col, row], index) =>
              makeEnemy(
                index + 1,
                col,
                row,
                colors[index],
                Math.min(150, 94 + level * 9),
              ),
            )
        : [],
    bombs: [],
    flames: [],
    powerUps: [],
    level,
    score,
    lives,
    timeLeft:
      mode === "versus"
        ? 90
        : Math.max(75, ROUND_SECONDS - (level - 1) * 8),
    bombRange: 2,
    maxBombs: 1,
    shield: 0,
    freezeTimer: 0,
    magnetTimer: 0,
    remoteCharges: 0,
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
  ignoredBombTiles?: ReadonlySet<string>,
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
      ignoredBombTiles?.has(key) ||
      !runtime.bombs.some((bomb) => bomb.col === col && bomb.row === row)
    );
  });
}

function overlappingBombTiles(
  runtime: Runtime,
  actor: Actor,
  radius: number,
) {
  return new Set(
    runtime.bombs
      .filter(
        (bomb) =>
          actor.x + radius > bomb.col * TILE &&
          actor.x - radius < (bomb.col + 1) * TILE &&
          actor.y + radius > bomb.row * TILE &&
          actor.y - radius < (bomb.row + 1) * TILE,
      )
      .map((bomb) => `${bomb.col},${bomb.row}`),
  );
}

function blastPathIsClear(
  runtime: Runtime,
  fromCol: number,
  fromRow: number,
  toCol: number,
  toRow: number,
) {
  if (fromCol !== toCol && fromRow !== toRow) return false;
  const dx = Math.sign(toCol - fromCol);
  const dy = Math.sign(toRow - fromRow);
  const distance = Math.abs(toCol - fromCol) + Math.abs(toRow - fromRow);

  for (let step = 1; step < distance; step += 1) {
    if (runtime.board[fromRow + dy * step]?.[fromCol + dx * step] !== 0) {
      return false;
    }
  }
  return true;
}

function tileThreat(runtime: Runtime, col: number, row: number) {
  if (runtime.flames.some((flame) => flame.col === col && flame.row === row)) {
    return 6;
  }

  return runtime.bombs.reduce((highest, bomb) => {
    const distance = Math.abs(bomb.col - col) + Math.abs(bomb.row - row);
    if (
      distance > bomb.range ||
      !blastPathIsClear(runtime, bomb.col, bomb.row, col, row)
    ) {
      return highest;
    }
    const urgency = bomb.fuse < 0.7 ? 5 : bomb.fuse < 1.35 ? 4 : 3;
    return Math.max(highest, urgency);
  }, 0);
}

function enemyBombRange(level: number) {
  return Math.min(4, 1 + Math.ceil(level / 2));
}

function enemyBombFuse(level: number) {
  return Math.max(1.45, 2.45 - level * 0.1);
}

function predictedBlastCells(
  runtime: Runtime,
  originCol: number,
  originRow: number,
  range: number,
) {
  const cells = new Set([flameKey(originCol, originRow)]);
  Object.values(directions).forEach(({ x, y }) => {
    for (let step = 1; step <= range; step += 1) {
      const col = originCol + x * step;
      const row = originRow + y * step;
      const tile = runtime.board[row]?.[col];
      if (tile === 1 || tile === undefined) break;
      cells.add(flameKey(col, row));
      if (tile === 2) break;
    }
  });
  return cells;
}

function enemyHasEscapeRoute(
  runtime: Runtime,
  enemy: Enemy,
  originCol: number,
  originRow: number,
  range: number,
  fuse: number,
) {
  const blastCells = predictedBlastCells(
    runtime,
    originCol,
    originRow,
    range,
  );
  const maxSteps = Math.max(
    2,
    Math.floor((fuse * enemy.speed * 0.82) / TILE),
  );
  const queue = [{ col: originCol, row: originRow, steps: 0 }];
  const visited = new Set([flameKey(originCol, originRow)]);

  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    const key = flameKey(current.col, current.row);
    if (
      current.steps > 0 &&
      !blastCells.has(key) &&
      tileThreat(runtime, current.col, current.row) === 0
    ) {
      return true;
    }
    if (current.steps >= maxSteps) continue;

    Object.values(directions).forEach(({ x, y }) => {
      const col = current.col + x;
      const row = current.row + y;
      const nextKey = flameKey(col, row);
      if (
        visited.has(nextKey) ||
        runtime.board[row]?.[col] !== 0 ||
        runtime.bombs.some((bomb) => bomb.col === col && bomb.row === row)
      ) {
        return;
      }
      visited.add(nextKey);
      queue.push({ col, row, steps: current.steps + 1 });
    });
  }
  return false;
}

function shouldEnemyPlaceBomb(runtime: Runtime, enemy: Enemy) {
  const col = Math.floor(enemy.x / TILE);
  const row = Math.floor(enemy.y / TILE);
  if (tileThreat(runtime, col, row) > 0) return false;

  const playerCol = Math.floor(runtime.player.x / TILE);
  const playerRow = Math.floor(runtime.player.y / TILE);
  const playerDistance =
    Math.abs(playerCol - col) + Math.abs(playerRow - row);
  const attackDistance = Math.min(6, 3 + Math.floor(runtime.level / 2));
  const playerInLine =
    playerDistance <= attackDistance &&
    blastPathIsClear(runtime, col, row, playerCol, playerRow);
  const besideCrate = Object.values(directions).some(
    ({ x, y }) => runtime.board[row + y]?.[col + x] === 2,
  );

  const hasAttackTarget = playerDistance <= 1 || playerInLine || besideCrate;
  const range = enemyBombRange(runtime.level);
  const fuse = enemyBombFuse(runtime.level);
  return (
    hasAttackTarget &&
    enemyHasEscapeRoute(runtime, enemy, col, row, range, fuse)
  );
}

function chooseEnemyDirection(
  runtime: Runtime,
  enemy: Enemy,
  timestamp: number,
) {
  const ignoredBombTiles = overlappingBombTiles(runtime, enemy, 18);
  const options = (Object.keys(directions) as Direction[]).filter(
    (direction) => {
      const vector = directions[direction];
      return canOccupy(
        runtime,
        enemy.x + vector.x * 8,
        enemy.y + vector.y * 8,
        18,
        ignoredBombTiles,
      );
    },
  );
  if (!options.length) return undefined;

  const col = Math.floor(enemy.x / TILE);
  const row = Math.floor(enemy.y / TILE);
  const playerCol = Math.floor(runtime.player.x / TILE);
  const playerRow = Math.floor(runtime.player.y / TILE);
  const currentThreat = tileThreat(runtime, col, row);
  const elapsedPressure = Math.min(0.18, (ROUND_SECONDS - runtime.timeLeft) / 500);
  const aggression = Math.min(
    0.96,
    0.67 + runtime.level * 0.055 + elapsedPressure,
  );
  const decisionRoll =
    ((Math.floor(timestamp / 220) + enemy.id * 23 + runtime.level * 11) %
      100) /
    100;

  if (currentThreat === 0 && decisionRoll > aggression) {
    const safest = options.filter((direction) => {
      const vector = directions[direction];
      return tileThreat(runtime, col + vector.x, row + vector.y) === 0;
    });
    const pool = safest.length ? safest : options;
    return pool[
      (Math.floor(timestamp * 0.009) + enemy.id * 7) % pool.length
    ];
  }

  return options
    .map((direction, index) => {
      const vector = directions[direction];
      const nextCol = col + vector.x;
      const nextRow = row + vector.y;
      const danger = tileThreat(runtime, nextCol, nextRow);
      const playerDistance =
        Math.abs(playerCol - nextCol) + Math.abs(playerRow - nextRow);
      const turnNoise =
        ((enemy.id * 17 + index * 13 + Math.floor(timestamp / 180)) % 11) /
        100;
      return {
        direction,
        score: danger * 100 + playerDistance + turnNoise,
      };
    })
    .sort((a, b) => a.score - b.score)[0].direction;
}

function placeEnemyBomb(runtime: Runtime, enemy: Enemy) {
  if (enemy.bombCooldown > 0 || !shouldEnemyPlaceBomb(runtime, enemy)) {
    return;
  }

  const col = Math.floor(enemy.x / TILE);
  const row = Math.floor(enemy.y / TILE);
  const maxBombs = runtime.level >= 4 ? 2 : 1;
  const activeBombs = runtime.bombs.filter(
    (bomb) => bomb.owner === enemy.id,
  ).length;
  if (
    activeBombs >= maxBombs ||
    runtime.bombs.some((bomb) => bomb.col === col && bomb.row === row)
  ) {
    return;
  }

  runtime.bombs.push({
    id: runtime.nextBombId,
    col,
    row,
    fuse: enemyBombFuse(runtime.level),
    range: enemyBombRange(runtime.level),
    remote: false,
    owner: enemy.id,
  });
  runtime.nextBombId += 1;
  enemy.bombCooldown = Math.max(
    1.55,
    4.1 - runtime.level * 0.28 - (runtime.timeLeft < 45 ? 0.45 : 0),
  );
  enemy.turnAt = 0;
}

function moveActor(
  runtime: Runtime,
  actor: Actor,
  dx: number,
  dy: number,
  delta: number,
) {
  const radius = 18;
  const nextX = actor.x + dx * actor.speed * delta;
  const nextY = actor.y + dy * actor.speed * delta;

  const ignoredBombTilesX = overlappingBombTiles(runtime, actor, radius);
  if (canOccupy(runtime, nextX, actor.y, radius, ignoredBombTilesX)) {
    actor.x = nextX;
  }
  const ignoredBombTilesY = overlappingBombTiles(runtime, actor, radius);
  if (canOccupy(runtime, actor.x, nextY, radius, ignoredBombTilesY)) {
    actor.y = nextY;
  }
}

type ControlScheme = Record<Direction, readonly string[]>;

const soloControls: ControlScheme = {
  up: ["ArrowUp", "KeyW"],
  down: ["ArrowDown", "KeyS"],
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
};

const playerOneControls: ControlScheme = {
  up: ["KeyW"],
  down: ["KeyS"],
  left: ["KeyA"],
  right: ["KeyD"],
};

const playerTwoControls: ControlScheme = {
  up: ["ArrowUp"],
  down: ["ArrowDown"],
  left: ["ArrowLeft"],
  right: ["ArrowRight"],
};

function moveControlledActor(
  runtime: Runtime,
  actor: Actor,
  keys: ReadonlySet<string>,
  controls: ControlScheme,
  delta: number,
) {
  let dx = 0;
  let dy = 0;
  if (controls.left.some((code) => keys.has(code))) dx -= 1;
  if (controls.right.some((code) => keys.has(code))) dx += 1;
  if (controls.up.some((code) => keys.has(code))) dy -= 1;
  if (controls.down.some((code) => keys.has(code))) dy += 1;
  if (dx === 0 && dy === 0) return;

  const length = Math.hypot(dx, dy);
  dx /= length;
  dy /= length;
  actor.direction =
    Math.abs(dx) > Math.abs(dy)
      ? dx > 0
        ? "right"
        : "left"
      : dy > 0
        ? "down"
        : "up";
  moveActor(runtime, actor, dx, dy, delta);
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
  shield = 0,
  frozen = false,
  label?: string,
) {
  const bounce = Math.sin(time * 7 + actor.x * 0.01) * 1.6;
  context.save();
  context.translate(actor.x, actor.y + bounce);
  if (faded) context.globalAlpha = 0.36 + Math.sin(time * 18) * 0.22;

  if (shield > 0) {
    context.strokeStyle = shield > 1 ? "#F6C453" : "#23C6D9";
    context.lineWidth = 4;
    context.globalAlpha = faded ? 0.45 : 0.82;
    context.beginPath();
    context.arc(0, -2, 31 + Math.sin(time * 5) * 1.5, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = faded ? 0.5 : 1;
  }

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
    if (label) {
      context.fillStyle = "#ffffff";
      context.font = "900 9px Arial";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(label, 0, -32.5);
    }
  } else {
    context.fillStyle = "#fff";
    context.globalAlpha *= 0.7;
    context.beginPath();
    context.arc(-12, -14, 5, 0, Math.PI * 2);
    context.fill();
    if (frozen) {
      context.globalAlpha = 1;
      context.fillStyle = "#dff8ff";
      context.font = "900 15px Arial";
      context.textAlign = "center";
      context.fillText("❄", 14, -18);
    }
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
  const playerTwoBomb = bomb.owner === "player2";
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.15, playerTwoBomb ? "#ffc5d2" : "#8beeff");
  gradient.addColorStop(0.65, playerTwoBomb ? "#ff5f87" : "#25b8ef");
  gradient.addColorStop(1, playerTwoBomb ? "#c6294d" : "#0874c7");
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
  context.fillStyle = bomb.remote
    ? "#FF5F87"
    : bomb.fuse < 0.65
      ? "#ff3d5d"
      : "#fff169";
  context.beginPath();
  context.arc(10, -17, 5, 0, Math.PI * 2);
  context.fill();
  if (bomb.remote) {
    context.fillStyle = "#ffffff";
    context.font = "900 13px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("R", 0, 2);
  }
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
  const visual = powerVisuals[powerUp.type];
  context.save();
  context.translate(x, y);
  context.shadowColor = visual.color;
  context.shadowBlur = 16;
  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(0, 0, 18, 0, Math.PI * 2);
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = visual.color;
  context.font =
    powerUp.type === "clock" ? "900 11px Arial" : "900 19px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(visual.symbol, 0, 1);
  context.restore();
}

function drawScene(context: CanvasRenderingContext2D, runtime: Runtime) {
  const time = performance.now() / 1000;
  drawBoard(context, runtime, time);
  runtime.powerUps.forEach((powerUp) =>
    drawPowerUp(context, powerUp, time),
  );
  runtime.bombs.forEach((bomb) => drawBomb(context, bomb, time));
  runtime.enemies.forEach((enemy) =>
    drawActor(
      context,
      enemy,
      time,
      false,
      false,
      0,
      runtime.freezeTimer > 0,
    ),
  );
  if (runtime.player1Alive) {
    drawActor(
      context,
      runtime.player,
      time,
      true,
      runtime.invulnerable > 0,
      runtime.shield,
      false,
      runtime.mode === "versus" ? "P1" : undefined,
    );
  }
  if (runtime.player2 && runtime.player2Alive) {
    drawActor(
      context,
      runtime.player2,
      time,
      true,
      false,
      0,
      false,
      "P2",
    );
  }
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
  const [selectedMode, setSelectedMode] = useState<GameMode>("solo");
  const [bestScore, setBestScore] = useState(0);
  const [hud, setHud] = useState<Hud>({
    status: "ready",
    mode: "solo",
    winner: null,
    player1Alive: true,
    player2Alive: false,
    mapName: getMapName(1),
    level: 1,
    score: 0,
    lives: 3,
    timeLeft: ROUND_SECONDS,
    range: 2,
    bubbles: 1,
    enemies: 3,
    shield: 0,
    freeze: 0,
    magnet: 0,
    remoteCharges: 0,
    remoteBombs: 0,
    player1Bombs: 0,
    player2Bombs: 0,
  });

  const syncHud = useCallback(() => {
    const runtime = runtimeRef.current;
    setHud({
      status: runtime.status,
      mode: runtime.mode,
      winner: runtime.winner,
      player1Alive: runtime.player1Alive,
      player2Alive: runtime.player2Alive,
      mapName: runtime.mapName,
      level: runtime.level,
      score: runtime.score,
      lives: runtime.lives,
      timeLeft: Math.max(0, Math.ceil(runtime.timeLeft)),
      range: runtime.bombRange,
      bubbles: runtime.maxBombs,
      enemies: runtime.enemies.length,
      shield: runtime.shield,
      freeze: Math.ceil(runtime.freezeTimer),
      magnet: Math.ceil(runtime.magnetTimer),
      remoteCharges: runtime.remoteCharges,
      remoteBombs: runtime.bombs.filter((bomb) => bomb.remote).length,
      player1Bombs: runtime.bombs.filter(
        (bomb) => bomb.owner === "player",
      ).length,
      player2Bombs: runtime.bombs.filter(
        (bomb) => bomb.owner === "player2",
      ).length,
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
    runtimeRef.current = createRuntime(1, 0, 3, selectedMode);
    runtimeRef.current.status = "playing";
    keysRef.current.clear();
    playTone(520, 0.12, "triangle");
    syncHud();
  }, [playTone, selectedMode, syncHud]);

  const selectMode = useCallback(
    (mode: GameMode) => {
      setSelectedMode(mode);
      runtimeRef.current = createRuntime(1, 0, 3, mode);
      keysRef.current.clear();
      syncHud();
    },
    [syncHud],
  );

  const nextLevel = useCallback(() => {
    const current = runtimeRef.current;
    runtimeRef.current = createRuntime(
      current.level + 1,
      current.score + 500,
      Math.min(5, current.lives + 1),
      "solo",
    );
    runtimeRef.current.status = "playing";
    playTone(720, 0.14, "triangle");
    syncHud();
  }, [playTone, syncHud]);

  const hurtPlayer = useCallback(
    (runtime: Runtime) => {
      if (runtime.invulnerable > 0) return;
      if (runtime.shield > 0) {
        runtime.shield -= 1;
        runtime.invulnerable = 0.9;
        playTone(620, 0.12, "triangle");
        syncHud();
        return;
      }
      runtime.lives -= 1;
      runtime.invulnerable = 1.8;
      runtime.player.x = tileCenter(1);
      runtime.player.y = tileCenter(1);
      playTone(105, 0.22, "sawtooth");
      syncHud();
    },
    [playTone, syncHud],
  );

  const detonateRemote = useCallback(() => {
    const runtime = runtimeRef.current;
    if (runtime.status !== "playing") return;
    const remoteBombs = runtime.bombs.filter(
      (bomb) => bomb.remote && bomb.owner === "player",
    );
    if (!remoteBombs.length) return;
    remoteBombs.forEach((bomb) => {
      bomb.fuse = 0;
    });
    playTone(460, 0.08, "square");
  }, [playTone]);

  const placeBomb = useCallback((playerNumber: 1 | 2 = 1) => {
    const runtime = runtimeRef.current;
    const isPlayerTwo = playerNumber === 2;
    const actor = isPlayerTwo ? runtime.player2 : runtime.player;
    const alive = isPlayerTwo
      ? runtime.player2Alive
      : runtime.player1Alive;
    const owner = isPlayerTwo ? "player2" : "player";
    if (
      runtime.status !== "playing" ||
      !actor ||
      !alive ||
      runtime.bombs.filter((bomb) => bomb.owner === owner).length >=
        runtime.maxBombs
    ) {
      return;
    }
    const col = Math.floor(actor.x / TILE);
    const row = Math.floor(actor.y / TILE);
    if (
      runtime.bombs.some((bomb) => bomb.col === col && bomb.row === row)
    ) {
      return;
    }
    const remote =
      !isPlayerTwo &&
      runtime.mode === "solo" &&
      runtime.remoteCharges > 0;
    runtime.bombs.push({
      id: runtime.nextBombId,
      col,
      row,
      fuse: remote ? 12 : 2.15,
      range: runtime.bombRange,
      remote,
      owner,
    });
    if (remote) runtime.remoteCharges -= 1;
    runtime.nextBombId += 1;
    playTone(260, 0.07, "sine");
    syncHud();
  }, [playTone, syncHud]);

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
            if (runtime.mode === "solo" && bomb.owner === "player") {
              runtime.score += 30;
            }
            const dropRoll = (col * 31 + row * 17 + bomb.id * 13) % 100;
            if (runtime.mode === "solo" && dropRoll < 43) {
              const poolIndex =
                (col * 7 + row * 11 + bomb.id * 5 + runtime.level) %
                powerDropPool.length;
              runtime.powerUps.push({
                col,
                row,
                type: powerDropPool[poolIndex],
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
        if (bomb.owner !== "player") return true;
        runtime.score += 250;
        playTone(760, 0.09, "square");
        return false;
      });

      const playerCol = Math.floor(runtime.player.x / TILE);
      const playerRow = Math.floor(runtime.player.y / TILE);
      if (runtime.mode === "versus") {
        let playerHit = false;
        if (
          runtime.player1Alive &&
          keys.has(flameKey(playerCol, playerRow))
        ) {
          runtime.player1Alive = false;
          playerHit = true;
        }
        if (runtime.player2 && runtime.player2Alive) {
          const player2Col = Math.floor(runtime.player2.x / TILE);
          const player2Row = Math.floor(runtime.player2.y / TILE);
          if (keys.has(flameKey(player2Col, player2Row))) {
            runtime.player2Alive = false;
            playerHit = true;
          }
        }
        playTone(playerHit ? 105 : 150, playerHit ? 0.22 : 0.12, "square");
      } else if (
        runtime.invulnerable <= 0 &&
        keys.has(flameKey(playerCol, playerRow))
      ) {
        hurtPlayer(runtime);
      } else {
        playTone(150, 0.12, "square");
      }
    },
    [hurtPlayer, playTone],
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
          "KeyF",
          "Enter",
        ].includes(event.code)
      ) {
        event.preventDefault();
      }
      keysRef.current.add(event.code);
      const runtime = runtimeRef.current;
      if (
        event.code === "Enter" &&
        runtime.status === "ready"
      ) {
        resetGame();
        return;
      }
      if (runtime.status !== "playing" || event.repeat) return;
      if (runtime.mode === "versus") {
        if (event.code === "Space" || event.code === "KeyF") placeBomb(1);
        if (event.code === "Enter") placeBomb(2);
      } else {
        if (event.code === "Space") placeBomb(1);
        if (event.code === "KeyE") detonateRemote();
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
  }, [detonateRemote, placeBomb, resetGame]);

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
        runtime.freezeTimer = Math.max(0, runtime.freezeTimer - delta);
        runtime.magnetTimer = Math.max(0, runtime.magnetTimer - delta);

        const keys = keysRef.current;
        if (runtime.player1Alive) {
          moveControlledActor(
            runtime,
            runtime.player,
            keys,
            runtime.mode === "versus" ? playerOneControls : soloControls,
            delta,
          );
        }
        if (
          runtime.mode === "versus" &&
          runtime.player2 &&
          runtime.player2Alive
        ) {
          moveControlledActor(
            runtime,
            runtime.player2,
            keys,
            playerTwoControls,
            delta,
          );
        }

        runtime.bombs.forEach((bomb) => {
          bomb.fuse -= delta;
        });
        const explodingIds = new Set<number>();
        let nextExplosion = runtime.bombs.find((bomb) => bomb.fuse <= 0);
        while (nextExplosion) {
          explodingIds.add(nextExplosion.id);
          explodeBomb(runtime, nextExplosion);
          nextExplosion = runtime.bombs.find(
            (bomb) => bomb.fuse <= 0 && !explodingIds.has(bomb.id),
          );
        }
        runtime.bombs = runtime.bombs.filter(
          (bomb) => !explodingIds.has(bomb.id),
        );

        runtime.flames.forEach((flame) => {
          flame.life -= delta;
        });
        runtime.flames = runtime.flames.filter((flame) => flame.life > 0);

        runtime.enemies.forEach((enemy) => {
          enemy.turnAt -= delta;
          enemy.bombCooldown = Math.max(0, enemy.bombCooldown - delta);
          const current = directions[enemy.direction];
          const oldX = enemy.x;
          const oldY = enemy.y;
          moveActor(
            runtime,
            enemy,
            current.x,
            current.y,
            delta * (runtime.freezeTimer > 0 ? 0.42 : 1),
          );
          const blocked =
            Math.abs(enemy.x - oldX) < 0.01 &&
            Math.abs(enemy.y - oldY) < 0.01;
          const nearCenter =
            Math.abs((enemy.x % TILE) - TILE / 2) < 2 &&
            Math.abs((enemy.y % TILE) - TILE / 2) < 2;
          if (blocked || (enemy.turnAt <= 0 && nearCenter)) {
            const nextDirection = chooseEnemyDirection(
              runtime,
              enemy,
              timestamp,
            );
            if (nextDirection) enemy.direction = nextDirection;
            enemy.turnAt =
              0.25 + ((enemy.id * 0.29 + timestamp * 0.001) % 0.55);
          }
          if (nearCenter) placeEnemyBomb(runtime, enemy);

          if (
            Math.hypot(
              runtime.player.x - enemy.x,
              runtime.player.y - enemy.y,
            ) < 34
          ) {
            hurtPlayer(runtime);
          }
        });

        runtime.powerUps = runtime.powerUps.filter((powerUp) => {
          const x = tileCenter(powerUp.col);
          const y = tileCenter(powerUp.row);
          const pickupRadius = runtime.magnetTimer > 0 ? TILE * 2.4 : 27;
          if (
            Math.hypot(runtime.player.x - x, runtime.player.y - y) >
            pickupRadius
          ) {
            return true;
          }
          if (powerUp.type === "speed") {
            runtime.player.speed = Math.min(235, runtime.player.speed + 22);
          } else if (powerUp.type === "range") {
            runtime.bombRange = Math.min(5, runtime.bombRange + 1);
          } else if (powerUp.type === "bubble") {
            runtime.maxBombs = Math.min(4, runtime.maxBombs + 1);
          } else if (powerUp.type === "shield") {
            runtime.shield = Math.min(2, runtime.shield + 1);
          } else if (powerUp.type === "clock") {
            runtime.timeLeft = Math.min(180, runtime.timeLeft + 15);
          } else if (powerUp.type === "freeze") {
            runtime.freezeTimer = Math.max(runtime.freezeTimer, 8);
          } else if (powerUp.type === "remote") {
            runtime.remoteCharges = Math.min(3, runtime.remoteCharges + 1);
          } else if (powerUp.type === "magnet") {
            runtime.magnetTimer = Math.max(runtime.magnetTimer, 10);
          } else if (powerUp.type === "heal") {
            runtime.lives = Math.min(5, runtime.lives + 1);
          }
          runtime.score += 100;
          playTone(880, 0.1, "triangle");
          return false;
        });

        if (
          runtime.mode === "versus" &&
          (!runtime.player1Alive ||
            !runtime.player2Alive ||
            runtime.timeLeft <= 0)
        ) {
          runtime.status = "gameOver";
          runtime.timeLeft = Math.max(0, runtime.timeLeft);
          runtime.winner =
            !runtime.player1Alive && !runtime.player2Alive
              ? "draw"
              : !runtime.player1Alive
                ? "player2"
                : !runtime.player2Alive
                  ? "player1"
                  : "draw";
          playTone(
            runtime.winner === "draw" ? 330 : 880,
            0.18,
            "triangle",
          );
          syncHud();
        } else if (
          runtime.mode === "solo" &&
          (runtime.lives <= 0 || runtime.timeLeft <= 0)
        ) {
          runtime.status = "gameOver";
          runtime.timeLeft = Math.max(0, runtime.timeLeft);
          saveBest(runtime.score);
          syncHud();
        } else if (
          runtime.mode === "solo" &&
          runtime.enemies.length === 0
        ) {
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
  }, [explodeBomb, hurtPlayer, playTone, saveBest, syncHud]);

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

  const versusResult =
    hud.winner === "player1"
      ? "P1 获胜！"
      : hud.winner === "player2"
        ? "P2 获胜！"
        : "本局平手！";
  const overlayTitle =
    hud.status === "ready"
      ? hud.mode === "versus"
        ? "双人对战！"
        : "水花开战！"
      : hud.status === "levelComplete"
        ? "清场成功！"
        : hud.mode === "versus"
          ? versusResult
          : "泡泡破了";
  const overlayCopy =
    hud.status === "ready"
      ? hud.mode === "versus"
        ? "P1 使用 WASD 移动、F 放泡泡；P2 使用方向键移动、Enter 放泡泡。最后留在场上的玩家获胜！"
        : "穿过水上街区，放下泡泡困住捣蛋怪。小心，自己的水花也会伤到你！"
      : hud.status === "levelComplete"
        ? `第 ${hud.level} 区已经恢复清凉，下一片街区会更热闹。`
        : hud.mode === "versus"
          ? hud.winner === "draw"
            ? "双方同时被水花击中，或者倒计时结束仍未分出胜负。再来一局！"
            : "漂亮的路线封锁！换个出生点思路，再来一场对决。"
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
              <span>街区 · {hud.mapName}</span>
              <strong>{String(hud.level).padStart(2, "0")}</strong>
            </div>
            <div>
              <span>{hud.mode === "versus" ? "对战状态" : "捣蛋怪"}</span>
              <strong>
                {hud.mode === "versus" ? "P1 VS P2" : hud.enemies}
              </strong>
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
            {hud.mode === "versus" ? (
              <div className="duel-roster" aria-label="双人对战状态">
                <div
                  className={`duel-player player-one ${hud.player1Alive ? "" : "eliminated"}`}
                >
                  <span className="duel-dot" aria-hidden="true" />
                  <div>
                    <small>P1 · WASD</small>
                    <strong>{hud.player1Alive ? "准备战斗" : "已淘汰"}</strong>
                  </div>
                </div>
                <div
                  className={`duel-player player-two ${hud.player2Alive ? "" : "eliminated"}`}
                >
                  <span className="duel-dot" aria-hidden="true" />
                  <div>
                    <small>P2 · 方向键</small>
                    <strong>{hud.player2Alive ? "准备战斗" : "已淘汰"}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="player-card">
                  <div className="mini-avatar" aria-hidden="true">
                    <span />
                  </div>
                  <div>
                    <small>蓝仔</small>
                    <strong>水花队长</strong>
                  </div>
                </div>
                <div
                  className="life-row"
                  aria-label={`剩余 ${hud.lives} 条生命`}
                >
                  {Array.from({ length: 5 }, (_, index) => (
                    <span
                      className={index < hud.lives ? "active" : ""}
                      key={index}
                    >
                      ♥
                    </span>
                  ))}
                </div>
              </>
            )}
            {hud.mode === "versus" ? (
              <div className="versus-controls">
                <div>
                  <span>P1 放泡泡</span>
                  <strong>
                    <kbd>F</kbd> {hud.player1Bombs}/{hud.bubbles}
                  </strong>
                </div>
                <div>
                  <span>P2 放泡泡</span>
                  <strong>
                    <kbd>ENTER</kbd> {hud.player2Bombs}/{hud.bubbles}
                  </strong>
                </div>
              </div>
            ) : (
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
                <div>
                  <i className="ability-icon shield">◇</i>
                  <span>护盾层数</span>
                  <strong>{hud.shield}</strong>
                </div>
                <div>
                  <i className="ability-icon remote">R</i>
                  <span>遥控器</span>
                  <strong>{hud.remoteCharges}</strong>
                </div>
              </div>
            )}
            {hud.mode === "solo" ? (
              <>
                <div className="best">
                  <span>今日最佳</span>
                  <strong>{bestScore.toLocaleString()}</strong>
                </div>
                <div className="tip">
                  <span>战术提示</span>
                  炸开橙色箱子可获得九种道具。遥控泡泡放下后，按 E
                  主动起爆。
                </div>
              </>
            ) : (
              <div className="tip versus-tip">
                <span>对战规则</span>
                公平属性 · 禁用随机道具 · 水花可伤到自己
              </div>
            )}
          </aside>

          <div className="canvas-shell">
            <canvas
              ref={canvasRef}
              width={WIDTH}
              height={HEIGHT}
              aria-label="泡泡堂水上街区游戏区域"
              tabIndex={0}
            />

            <div className="effect-chips" aria-live="polite">
              {hud.freeze > 0 && <span className="freeze">冰冻 {hud.freeze}s</span>}
              {hud.magnet > 0 && <span className="magnet">磁铁 {hud.magnet}s</span>}
              {hud.remoteBombs > 0 && (
                <span className="remote">E · 遥控起爆</span>
              )}
            </div>

            {hud.status !== "playing" && (
              <div className="overlay">
                <div className="overlay-card">
                  <div className="overlay-kicker">
                    {hud.status === "ready"
                      ? hud.mode === "versus"
                        ? `${hud.mapName} · LOCAL VERSUS`
                        : `${hud.mapName} · DISTRICT 01`
                      : hud.status === "levelComplete"
                        ? `${hud.mapName} · DISTRICT ${String(hud.level).padStart(2, "0")} CLEAR`
                        : "TRY ANOTHER ROUTE"}
                  </div>
                  <h2>{overlayTitle}</h2>
                  <p>{overlayCopy}</p>
                  {hud.status !== "levelComplete" && (
                    <div className="mode-selector" aria-label="选择游戏模式">
                      <button
                        type="button"
                        aria-pressed={selectedMode === "solo"}
                        onClick={() => selectMode("solo")}
                      >
                        单人闯关
                      </button>
                      <button
                        type="button"
                        aria-pressed={selectedMode === "versus"}
                        onClick={() => selectMode("versus")}
                      >
                        双人对战
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    className="start-button"
                    onClick={
                      hud.status === "levelComplete" ? nextLevel : resetGame
                    }
                  >
                    {hud.status === "ready"
                      ? hud.mode === "versus"
                        ? "开始对战"
                        : "进入街区"
                      : hud.status === "levelComplete"
                        ? "下一街区"
                        : "重新开战"}
                    <span aria-hidden="true">→</span>
                  </button>
                  <div className="key-hint">
                    {hud.mode === "versus" ? (
                      <>
                        <kbd>P1 · WASD + F</kbd>
                        <kbd>P2 · 方向键 + ENTER</kbd>
                      </>
                    ) : (
                      <>
                        <kbd>WASD</kbd>
                        <kbd>方向键</kbd>
                        移动
                        <kbd>SPACE</kbd>
                        放泡泡
                        <kbd>E</kbd>
                        遥控起爆
                      </>
                    )}
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
              onPointerDown={(event) => holdDirection(event, "KeyW")}
              onPointerUp={() => releaseDirection("KeyW")}
              onPointerCancel={() => releaseDirection("KeyW")}
            >
              ↑
            </button>
            <button
              type="button"
              className="left"
              aria-label="向左移动"
              onPointerDown={(event) => holdDirection(event, "KeyA")}
              onPointerUp={() => releaseDirection("KeyA")}
              onPointerCancel={() => releaseDirection("KeyA")}
            >
              ←
            </button>
            <button
              type="button"
              className="down"
              aria-label="向下移动"
              onPointerDown={(event) => holdDirection(event, "KeyS")}
              onPointerUp={() => releaseDirection("KeyS")}
              onPointerCancel={() => releaseDirection("KeyS")}
            >
              ↓
            </button>
            <button
              type="button"
              className="right"
              aria-label="向右移动"
              onPointerDown={(event) => holdDirection(event, "KeyD")}
              onPointerUp={() => releaseDirection("KeyD")}
              onPointerCancel={() => releaseDirection("KeyD")}
            >
              →
            </button>
          </div>
          <div className="action-buttons">
            {hud.mode === "solo" && (
              <button
                type="button"
                className="remote-button"
                onPointerDown={detonateRemote}
                aria-label="遥控起爆"
                disabled={hud.remoteBombs === 0}
              >
                R
                <small>起爆</small>
              </button>
            )}
            <button
              type="button"
              className="bubble-button"
              onPointerDown={() => placeBomb(1)}
              aria-label={
                hud.mode === "versus" ? "P1 放置泡泡" : "放置泡泡"
              }
            >
              <span />
              放泡泡
            </button>
          </div>
        </div>

        <footer className="game-footer">
          <div>
            <span className="live-dot" />
            {hud.mapName}正在营业
          </div>
          <p>
            {hud.mode === "versus"
              ? "P1：WASD + F · P2：方向键 + Enter"
              : "方向键 / WASD 移动 · 空格键放泡泡 · E 键遥控起爆"}
          </p>
          <strong>
            {hud.mode === "versus"
              ? "本地双人 · 最后存活者获胜"
              : "最佳路线：先留退路"}
          </strong>
        </footer>
      </section>
    </main>
  );
}
