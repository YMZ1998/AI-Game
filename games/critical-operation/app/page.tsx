"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 540;
const FOV = Math.PI / 3;
const MOVE_SPEED = 2.35;
const TURN_SPEED = 1.9;
const BOMB_X = 13.5;
const BOMB_Y = 13.5;

const MAP = [
  "1111111111111111",
  "1000000000000001",
  "1011110011110101",
  "1000010000010001",
  "1110010111011101",
  "1000000100000001",
  "1011110101111101",
  "1000000000000001",
  "1011011111010101",
  "1001000000010001",
  "1101011111011101",
  "1001000000000001",
  "1011110111110101",
  "1000000100000001",
  "1000000000000001",
  "1111111111111111",
] as const;

type Phase = "briefing" | "active" | "won" | "lost";

type Actor = {
  x: number;
  y: number;
  angle: number;
};

type Bot = {
  id: number;
  x: number;
  y: number;
  health: number;
  alive: boolean;
  cooldown: number;
  alerted: boolean;
  flash: number;
  shotFlash: number;
};

type GameState = {
  phase: Phase;
  round: number;
  player: Actor;
  bots: Bot[];
  health: number;
  armor: number;
  ammo: number;
  reserve: number;
  money: number;
  kills: number;
  bombTimer: number;
  defuseProgress: number;
  reloadTime: number;
  shotCooldown: number;
  muzzleFlash: number;
  hitMarker: number;
  damageFlash: number;
  walking: boolean;
  recoil: number;
  viewKick: number;
  movePhase: number;
  stepCooldown: number;
};

type HudState = {
  phase: Phase;
  round: number;
  health: number;
  armor: number;
  ammo: number;
  reserve: number;
  money: number;
  kills: number;
  enemies: number;
  bombTimer: number;
  defuseProgress: number;
  reloading: boolean;
  nearBomb: boolean;
};

type RayHit = {
  distance: number;
  side: number;
  mapX: number;
  mapY: number;
  wallX: number;
};

const BOT_SPAWNS = [
  [13.25, 1.75],
  [4.45, 3.45],
  [11.3, 5.45],
  [2.6, 7.55],
  [8.5, 9.55],
  [13.25, 11.55],
] as const;

function isWall(x: number, y: number) {
  const mapX = Math.floor(x);
  const mapY = Math.floor(y);
  return (
    mapX < 0 ||
    mapY < 0 ||
    mapY >= MAP.length ||
    mapX >= MAP[0].length ||
    MAP[mapY][mapX] !== "0"
  );
}

function normalizeAngle(angle: number) {
  let normalized = angle;
  while (normalized > Math.PI) normalized -= Math.PI * 2;
  while (normalized < -Math.PI) normalized += Math.PI * 2;
  return normalized;
}

function distanceBetween(aX: number, aY: number, bX: number, bY: number) {
  return Math.hypot(aX - bX, aY - bY);
}

function hasLineOfSight(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) {
  const distance = distanceBetween(fromX, fromY, toX, toY);
  const steps = Math.ceil(distance / 0.08);
  for (let step = 1; step < steps; step += 1) {
    const ratio = step / steps;
    if (
      isWall(
        fromX + (toX - fromX) * ratio,
        fromY + (toY - fromY) * ratio,
      )
    ) {
      return false;
    }
  }
  return true;
}

function tryMove(actor: { x: number; y: number }, dx: number, dy: number) {
  const padding = 0.2;
  const nextX = actor.x + dx;
  const nextY = actor.y + dy;
  if (
    !isWall(nextX + Math.sign(dx) * padding, actor.y) &&
    !isWall(nextX, actor.y)
  ) {
    actor.x = nextX;
  }
  if (
    !isWall(actor.x, nextY + Math.sign(dy) * padding) &&
    !isWall(actor.x, nextY)
  ) {
    actor.y = nextY;
  }
}

function castRay(player: Actor, rayAngle: number): RayHit {
  const rayDirX = Math.cos(rayAngle);
  const rayDirY = Math.sin(rayAngle);
  let mapX = Math.floor(player.x);
  let mapY = Math.floor(player.y);

  const deltaDistX = Math.abs(1 / (rayDirX || 0.00001));
  const deltaDistY = Math.abs(1 / (rayDirY || 0.00001));
  const stepX = rayDirX < 0 ? -1 : 1;
  const stepY = rayDirY < 0 ? -1 : 1;
  let sideDistX =
    rayDirX < 0
      ? (player.x - mapX) * deltaDistX
      : (mapX + 1 - player.x) * deltaDistX;
  let sideDistY =
    rayDirY < 0
      ? (player.y - mapY) * deltaDistY
      : (mapY + 1 - player.y) * deltaDistY;
  let side = 0;

  for (let steps = 0; steps < 64; steps += 1) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }
    if (
      mapY < 0 ||
      mapX < 0 ||
      mapY >= MAP.length ||
      mapX >= MAP[0].length ||
      MAP[mapY][mapX] !== "0"
    ) {
      break;
    }
  }

  const distance =
    side === 0
      ? (mapX - player.x + (1 - stepX) / 2) / (rayDirX || 0.00001)
      : (mapY - player.y + (1 - stepY) / 2) / (rayDirY || 0.00001);
  const wallPosition =
    side === 0
      ? player.y + distance * rayDirY
      : player.x + distance * rayDirX;

  return {
    distance: Math.max(0.01, Math.abs(distance)),
    side,
    mapX,
    mapY,
    wallX: wallPosition - Math.floor(wallPosition),
  };
}

function makeBots(round: number): Bot[] {
  const count = Math.min(BOT_SPAWNS.length, 4 + round);
  return BOT_SPAWNS.slice(0, count).map(([x, y], index) => ({
    id: index + 1,
    x,
    y,
    health: 72 + round * 7,
    alive: true,
    cooldown: 0.65 + index * 0.17,
    alerted: index < 2,
    flash: 0,
    shotFlash: 0,
  }));
}

function createGame(): GameState {
  return {
    phase: "briefing",
    round: 1,
    player: { x: 1.65, y: 1.65, angle: 0 },
    bots: makeBots(1),
    health: 100,
    armor: 100,
    ammo: 30,
    reserve: 90,
    money: 800,
    kills: 0,
    bombTimer: 65,
    defuseProgress: 0,
    reloadTime: 0,
    shotCooldown: 0,
    muzzleFlash: 0,
    hitMarker: 0,
    damageFlash: 0,
    walking: false,
    recoil: 0,
    viewKick: 0,
    movePhase: 0,
    stepCooldown: 0,
  };
}

function initialHud(game: GameState): HudState {
  return {
    phase: game.phase,
    round: game.round,
    health: game.health,
    armor: game.armor,
    ammo: game.ammo,
    reserve: game.reserve,
    money: game.money,
    kills: game.kills,
    enemies: game.bots.filter((bot) => bot.alive).length,
    bombTimer: game.bombTimer,
    defuseProgress: game.defuseProgress,
    reloading: game.reloadTime > 0,
    nearBomb: false,
  };
}

function drawBot(
  context: CanvasRenderingContext2D,
  screenX: number,
  centerY: number,
  size: number,
  bot: Bot,
  now: number,
) {
  context.save();
  const stride = bot.alerted ? Math.sin(now / 115 + bot.id * 1.7) * 3 : 0;
  context.translate(screenX, centerY + Math.abs(stride) * 0.5);
  const scale = size / 160;
  context.scale(scale, scale);

  context.fillStyle = "rgba(0,0,0,0.32)";
  context.beginPath();
  context.ellipse(0, 64, 40, 11, 0, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.translate(-15, 27);
  context.rotate(-0.04 + stride * 0.008);
  context.fillStyle = "#171d1f";
  context.fillRect(-10, 0, 20, 57);
  context.fillStyle = "#30383a";
  context.fillRect(-13, 47, 26, 13);
  context.restore();

  context.save();
  context.translate(15, 27);
  context.rotate(0.04 - stride * 0.008);
  context.fillStyle = "#171d1f";
  context.fillRect(-10, 0, 20, 57);
  context.fillStyle = "#30383a";
  context.fillRect(-13, 47, 26, 13);
  context.restore();

  context.fillStyle = bot.flash > 0 ? "#d9c59e" : "#43423d";
  context.beginPath();
  context.moveTo(-31, -5);
  context.lineTo(-25, 43);
  context.lineTo(25, 43);
  context.lineTo(31, -5);
  context.closePath();
  context.fill();

  context.fillStyle = "#242a2b";
  context.fillRect(-35, 2, 70, 28);
  context.fillStyle = "#6f6653";
  context.fillRect(-23, 6, 46, 19);
  context.fillStyle = "#b1a57f";
  context.fillRect(-18, 10, 13, 11);
  context.fillRect(6, 10, 13, 11);

  context.fillStyle = "#806b52";
  context.beginPath();
  context.arc(0, -37, 20, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#202526";
  context.beginPath();
  context.arc(0, -45, 22, Math.PI, Math.PI * 2);
  context.lineTo(22, -36);
  context.lineTo(-22, -36);
  context.closePath();
  context.fill();

  context.fillStyle = "#101516";
  context.fillRect(-20, -40, 40, 9);
  context.fillStyle = "#d3b56f";
  context.fillRect(-15, -37, 12, 4);
  context.fillRect(4, -37, 12, 4);

  context.fillStyle = "#343a39";
  context.beginPath();
  context.moveTo(-31, 1);
  context.lineTo(-12, 12);
  context.lineTo(-3, 19);
  context.lineTo(-8, 25);
  context.lineTo(-27, 15);
  context.closePath();
  context.fill();
  context.beginPath();
  context.moveTo(31, 1);
  context.lineTo(12, 12);
  context.lineTo(3, 19);
  context.lineTo(8, 25);
  context.lineTo(27, 15);
  context.closePath();
  context.fill();

  context.save();
  context.translate(0, 12);
  context.fillStyle = "#4c5c61";
  context.beginPath();
  context.moveTo(-27, -7);
  context.lineTo(27, -7);
  context.lineTo(20, 12);
  context.lineTo(-20, 12);
  context.closePath();
  context.fill();
  context.fillStyle = "#111718";
  context.fillRect(-12, 8, 24, 17);
  context.fillStyle = "#05090b";
  context.beginPath();
  context.ellipse(0, 27, 14, 8, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "#879296";
  context.lineWidth = 2;
  context.stroke();
  if (bot.shotFlash > 0) {
    context.fillStyle = `rgba(255, 209, 105, ${Math.min(1, bot.shotFlash * 10)})`;
    context.beginPath();
    context.moveTo(0, 28);
    context.lineTo(-24, 47);
    context.lineTo(-7, 43);
    context.lineTo(0, 63);
    context.lineTo(8, 43);
    context.lineTo(25, 48);
    context.lineTo(11, 31);
    context.closePath();
    context.fill();
  }
  context.restore();

  context.fillStyle = "#ff5a52";
  context.fillRect(-22, -72, 44 * Math.max(0, bot.health / 110), 4);
  context.fillStyle = "rgba(0,0,0,0.58)";
  context.fillRect(-22, -72, 44, 1);
  context.restore();
}

function drawDevice(
  context: CanvasRenderingContext2D,
  screenX: number,
  centerY: number,
  size: number,
  urgent: boolean,
) {
  context.save();
  context.translate(screenX, centerY);
  const scale = size / 100;
  context.scale(scale, scale);
  context.fillStyle = "rgba(0,0,0,0.35)";
  context.beginPath();
  context.ellipse(0, 42, 42, 11, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#2b3337";
  context.fillRect(-37, -28, 74, 70);
  context.strokeStyle = "#f2b84b";
  context.lineWidth = 5;
  context.strokeRect(-37, -28, 74, 70);
  context.fillStyle = urgent ? "#ff5a52" : "#66e0c2";
  context.fillRect(-25, -16, 50, 21);
  context.fillStyle = "#0b1116";
  context.font = "900 17px Arial";
  context.textAlign = "center";
  context.fillText("B", 0, 1);
  context.strokeStyle = "#ff5a52";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(-24, 18);
  context.quadraticCurveTo(0, 4, 25, 20);
  context.stroke();
  context.restore();
}

function renderScene(
  context: CanvasRenderingContext2D,
  game: GameState,
  now: number,
) {
  const cameraBob = game.walking ? Math.sin(game.movePhase) * 3.5 : 0;
  const horizon = VIEW_HEIGHT / 2 + cameraBob + game.viewKick * 11;
  const ceiling = context.createLinearGradient(0, 0, 0, horizon);
  ceiling.addColorStop(0, "#04090d");
  ceiling.addColorStop(0.62, "#111c23");
  ceiling.addColorStop(1, "#25333a");
  context.fillStyle = ceiling;
  context.fillRect(0, 0, VIEW_WIDTH, horizon);

  const floor = context.createLinearGradient(
    0,
    horizon,
    0,
    VIEW_HEIGHT,
  );
  floor.addColorStop(0, "#565c5b");
  floor.addColorStop(0.34, "#333b3d");
  floor.addColorStop(1, "#0b1115");
  context.fillStyle = floor;
  context.fillRect(0, horizon, VIEW_WIDTH, VIEW_HEIGHT - horizon);

  context.fillStyle = "rgba(242, 184, 75, 0.09)";
  context.fillRect(0, horizon - 12, VIEW_WIDTH, 24);

  context.strokeStyle = "rgba(186, 208, 208, 0.1)";
  context.lineWidth = 1;
  for (let line = 1; line <= 10; line += 1) {
    const y =
      horizon +
      (1 - 1 / (1 + line * 0.55)) * (VIEW_HEIGHT - horizon) * 1.18;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(VIEW_WIDTH, y);
    context.stroke();
  }
  for (let x = -VIEW_WIDTH; x <= VIEW_WIDTH * 2; x += 92) {
    context.beginPath();
    context.moveTo(VIEW_WIDTH / 2, horizon);
    context.lineTo(x, VIEW_HEIGHT);
    context.stroke();
  }

  context.fillStyle = "rgba(0, 0, 0, 0.24)";
  for (let beam = 0; beam < 7; beam += 1) {
    const x = beam * 168 - 28;
    context.fillRect(x, 0, 24, horizon * 0.62);
  }
  for (let light = 0; light < 5; light += 1) {
    const x = 112 + light * 190;
    const glow = context.createRadialGradient(x, 48, 2, x, 48, 115);
    glow.addColorStop(0, "rgba(255, 211, 128, 0.28)");
    glow.addColorStop(1, "rgba(255, 211, 128, 0)");
    context.fillStyle = glow;
    context.fillRect(x - 115, 0, 230, 190);
    context.fillStyle = "#d7c18b";
    context.fillRect(x - 34, 34, 68, 6);
  }

  const depthBuffer = new Float32Array(VIEW_WIDTH);
  for (let column = 0; column < VIEW_WIDTH; column += 2) {
    const camera = column / VIEW_WIDTH - 0.5;
    const rayAngle = game.player.angle + camera * FOV;
    const hit = castRay(game.player, rayAngle);
    const corrected = hit.distance * Math.cos(rayAngle - game.player.angle);
    const wallHeight = Math.min(
      VIEW_HEIGHT * 1.8,
      (VIEW_HEIGHT * 0.88) / corrected,
    );
    const top = horizon - wallHeight / 2;
    const material = Math.abs(hit.mapX * 7 + hit.mapY * 11) % 4;
    const materialColors = [
      [120, 132, 133],
      [92, 108, 113],
      [126, 111, 87],
      [74, 91, 97],
    ] as const;
    const base = materialColors[material];
    const distanceShade = Math.max(0.22, 1 - corrected * 0.065);
    const sideShade = hit.side ? 0.76 : 1;
    const seam =
      hit.wallX < 0.035 ||
      hit.wallX > 0.965 ||
      Math.floor(hit.wallX * 12) % 6 === 0;
    const textureNoise =
      ((hit.mapX * 17 + hit.mapY * 31 + Math.floor(hit.wallX * 37)) % 13) - 6;
    const shade = distanceShade * sideShade * (seam ? 0.58 : 1);
    const red = Math.max(18, Math.min(210, base[0] * shade + textureNoise));
    const green = Math.max(20, Math.min(215, base[1] * shade + textureNoise));
    const blue = Math.max(22, Math.min(220, base[2] * shade + textureNoise));
    context.fillStyle = `rgb(${red}, ${green}, ${blue})`;
    context.fillRect(column, top, 2, wallHeight);
    context.fillStyle =
      Math.floor(hit.wallX * 16) % 8 === 0
        ? "rgba(255,255,255,0.085)"
        : "rgba(0,0,0,0.035)";
    context.fillRect(column, top, 1, wallHeight);
    if (material === 2 && Math.floor(hit.wallX * 10) % 5 === 0) {
      context.fillStyle = "rgba(242, 184, 75, 0.34)";
      context.fillRect(column, horizon - wallHeight * 0.17, 2, wallHeight * 0.07);
    }
    depthBuffer[column] = corrected;
    depthBuffer[column + 1] = corrected;
  }

  const sprites = [
    ...game.bots
      .filter((bot) => bot.alive)
      .map((bot) => ({ kind: "bot" as const, x: bot.x, y: bot.y, bot })),
    { kind: "device" as const, x: BOMB_X, y: BOMB_Y, bot: null },
  ].sort(
    (a, b) =>
      distanceBetween(game.player.x, game.player.y, b.x, b.y) -
      distanceBetween(game.player.x, game.player.y, a.x, a.y),
  );

  sprites.forEach((sprite) => {
    const dx = sprite.x - game.player.x;
    const dy = sprite.y - game.player.y;
    const distance = Math.hypot(dx, dy);
    const relativeAngle = normalizeAngle(Math.atan2(dy, dx) - game.player.angle);
    if (Math.abs(relativeAngle) > FOV * 0.7) return;

    const screenX = VIEW_WIDTH / 2 + (relativeAngle / FOV) * VIEW_WIDTH;
    const correctedDistance = Math.max(
      0.52,
      distance * Math.cos(relativeAngle),
    );
    const size =
      sprite.kind === "bot"
        ? Math.max(
            24,
            Math.min(
              VIEW_HEIGHT * 0.7,
              (VIEW_HEIGHT * 0.76) / correctedDistance,
            ),
          )
        : Math.max(
            20,
            Math.min(
              VIEW_HEIGHT * 0.38,
              (VIEW_HEIGHT * 0.45) / correctedDistance,
            ),
          );
    const depthIndex = Math.max(
      0,
      Math.min(VIEW_WIDTH - 1, Math.round(screenX)),
    );
    if (distance > depthBuffer[depthIndex] + 0.3) return;

    if (sprite.kind === "bot" && sprite.bot) {
      drawBot(context, screenX, horizon - size * 0.045, size, sprite.bot, now);
    } else {
      drawDevice(
        context,
        screenX,
        horizon + size * 0.24,
        size,
        game.bombTimer <= 12 && Math.floor(now / 180) % 2 === 0,
      );
    }
  });

  const bob = game.walking ? Math.sin(game.movePhase * 0.5) * 5 : 0;
  const reloadArc =
    game.reloadTime > 0 ? Math.sin((game.reloadTime / 1.55) * Math.PI) : 0;
  const weaponRootX =
    VIEW_WIDTH * 0.76 +
    Math.sin(game.movePhase * 0.5) * 4 +
    reloadArc * 42;
  const weaponRootY =
    VIEW_HEIGHT + 58 + bob + game.recoil * 42 + reloadArc * 48;
  const weaponAimX = VIEW_WIDTH / 2;
  const weaponAimY = VIEW_HEIGHT / 2;
  const weaponAngle =
    Math.atan2(weaponAimY - weaponRootY, weaponAimX - weaponRootX) -
    game.recoil * 0.045 +
    reloadArc * 0.34;
  const weaponLength =
    Math.hypot(weaponAimX - weaponRootX, weaponAimY - weaponRootY) * 0.72;

  context.save();
  context.translate(weaponRootX, weaponRootY);
  context.rotate(weaponAngle);

  context.fillStyle = "#84664f";
  context.beginPath();
  context.ellipse(72, -24, 67, 30, -0.08, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.ellipse(170, -17, 45, 24, 0.12, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#11191d";
  context.beginPath();
  context.moveTo(-12, -30);
  context.lineTo(202, -24);
  context.lineTo(220, 15);
  context.lineTo(22, 31);
  context.closePath();
  context.fill();
  context.fillStyle = "#2f3d42";
  context.beginPath();
  context.moveTo(30, -27);
  context.lineTo(210, -20);
  context.lineTo(204, -8);
  context.lineTo(42, -5);
  context.closePath();
  context.fill();

  context.fillStyle = "#0a1013";
  context.beginPath();
  context.moveTo(76, 20);
  context.lineTo(126, 17);
  context.lineTo(113, 83);
  context.lineTo(70, 86);
  context.closePath();
  context.fill();
  context.fillStyle = "#3e4d53";
  context.beginPath();
  context.moveTo(198, -15);
  context.lineTo(weaponLength - 6, -7);
  context.lineTo(weaponLength - 6, 7);
  context.lineTo(202, 10);
  context.closePath();
  context.fill();
  context.fillStyle = "#0a0f11";
  context.fillRect(weaponLength - 13, -11, 17, 22);

  context.fillStyle = "#151e22";
  context.fillRect(112, -52, 58, 27);
  context.fillStyle = "#859397";
  context.fillRect(120, -48, 42, 4);
  context.fillStyle = "#05090b";
  context.fillRect(132, -64, 23, 15);
  context.fillStyle = "#66e0c2";
  context.fillRect(34, -19, 34, 5);
  context.fillStyle = "#f2b84b";
  context.fillRect(178, -13, 36, 4);

  if (game.muzzleFlash > 0) {
    const flashAlpha = Math.min(1, game.muzzleFlash * 12);
    context.fillStyle = `rgba(255, 225, 149, ${flashAlpha})`;
    context.beginPath();
    context.moveTo(weaponLength, 0);
    context.lineTo(weaponLength + 52, -31);
    context.lineTo(weaponLength + 36, -3);
    context.lineTo(weaponLength + 58, 27);
    context.lineTo(weaponLength + 18, 12);
    context.closePath();
    context.fill();
  }
  context.restore();

  const crosshairGap = 7 + game.recoil * 24 + (game.walking ? 5 : 0);
  const crosshairLength = 10;
  context.strokeStyle =
    game.hitMarker > 0 ? "#fff" : "rgba(102, 224, 194, 0.92)";
  context.lineWidth = game.hitMarker > 0 ? 3 : 2;
  context.beginPath();
  context.moveTo(VIEW_WIDTH / 2 - crosshairGap - crosshairLength, VIEW_HEIGHT / 2);
  context.lineTo(VIEW_WIDTH / 2 - crosshairGap, VIEW_HEIGHT / 2);
  context.moveTo(VIEW_WIDTH / 2 + crosshairGap, VIEW_HEIGHT / 2);
  context.lineTo(VIEW_WIDTH / 2 + crosshairGap + crosshairLength, VIEW_HEIGHT / 2);
  context.moveTo(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - crosshairGap - crosshairLength);
  context.lineTo(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - crosshairGap);
  context.moveTo(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + crosshairGap);
  context.lineTo(VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + crosshairGap + crosshairLength);
  context.stroke();

  if (game.hitMarker > 0) {
    context.strokeStyle = "#fff";
    context.beginPath();
    context.moveTo(VIEW_WIDTH / 2 - 12, VIEW_HEIGHT / 2 - 12);
    context.lineTo(VIEW_WIDTH / 2 - 5, VIEW_HEIGHT / 2 - 5);
    context.moveTo(VIEW_WIDTH / 2 + 12, VIEW_HEIGHT / 2 - 12);
    context.lineTo(VIEW_WIDTH / 2 + 5, VIEW_HEIGHT / 2 - 5);
    context.moveTo(VIEW_WIDTH / 2 - 12, VIEW_HEIGHT / 2 + 12);
    context.lineTo(VIEW_WIDTH / 2 - 5, VIEW_HEIGHT / 2 + 5);
    context.moveTo(VIEW_WIDTH / 2 + 12, VIEW_HEIGHT / 2 + 12);
    context.lineTo(VIEW_WIDTH / 2 + 5, VIEW_HEIGHT / 2 + 5);
    context.stroke();
  }

  const bombAngle = normalizeAngle(
    Math.atan2(BOMB_Y - game.player.y, BOMB_X - game.player.x) -
      game.player.angle,
  );
  const bombDistance = distanceBetween(
    game.player.x,
    game.player.y,
    BOMB_X,
    BOMB_Y,
  );
  const objectiveX = Math.max(
    84,
    Math.min(
      VIEW_WIDTH - 84,
      VIEW_WIDTH / 2 + (bombAngle / FOV) * VIEW_WIDTH,
    ),
  );
  context.save();
  context.translate(objectiveX, 42);
  context.fillStyle = "rgba(7, 12, 16, 0.76)";
  context.fillRect(-34, -14, 68, 29);
  context.strokeStyle = "#f2b84b";
  context.lineWidth = 2;
  context.strokeRect(-34, -14, 68, 29);
  context.fillStyle = "#f2b84b";
  context.font = "900 11px Arial";
  context.textAlign = "center";
  context.fillText(`B · ${bombDistance.toFixed(0)}m`, 0, 5);
  context.restore();

  const radarCell = 5;
  const radarX = VIEW_WIDTH - MAP[0].length * radarCell - 22;
  const radarY = 66;
  context.fillStyle = "rgba(4, 9, 12, 0.72)";
  context.fillRect(radarX - 8, radarY - 8, 96, 96);
  MAP.forEach((row, mapY) => {
    [...row].forEach((cell, mapX) => {
      context.fillStyle =
        cell === "0" ? "rgba(220,228,227,0.08)" : "rgba(130,147,155,0.36)";
      context.fillRect(
        radarX + mapX * radarCell,
        radarY + mapY * radarCell,
        radarCell - 1,
        radarCell - 1,
      );
    });
  });
  context.fillStyle = "#f2b84b";
  context.beginPath();
  context.arc(
    radarX + BOMB_X * radarCell,
    radarY + BOMB_Y * radarCell,
    3.5,
    0,
    Math.PI * 2,
  );
  context.fill();
  game.bots.forEach((bot) => {
    if (!bot.alive || !bot.alerted) return;
    context.fillStyle = "#ff5a52";
    context.fillRect(
      radarX + bot.x * radarCell - 2,
      radarY + bot.y * radarCell - 2,
      4,
      4,
    );
  });
  context.save();
  context.translate(
    radarX + game.player.x * radarCell,
    radarY + game.player.y * radarCell,
  );
  context.rotate(game.player.angle);
  context.fillStyle = "#66e0c2";
  context.beginPath();
  context.moveTo(6, 0);
  context.lineTo(-4, -4);
  context.lineTo(-4, 4);
  context.closePath();
  context.fill();
  context.restore();

  if (game.damageFlash > 0) {
    context.fillStyle = `rgba(255, 35, 28, ${Math.min(0.38, game.damageFlash)})`;
    context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }

  const vignette = context.createRadialGradient(
    VIEW_WIDTH / 2,
    VIEW_HEIGHT / 2,
    VIEW_HEIGHT * 0.22,
    VIEW_WIDTH / 2,
    VIEW_HEIGHT / 2,
    VIEW_WIDTH * 0.65,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.52)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  context.fillStyle = "rgba(255,255,255,0.018)";
  for (let y = 0; y < VIEW_HEIGHT; y += 4) {
    context.fillRect(0, y, VIEW_WIDTH, 1);
  }
}

const INITIAL_HUD = initialHud(createGame());

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState>(createGame());
  const keysRef = useRef(new Set<string>());
  const fireHeldRef = useRef(false);
  const hudKeyRef = useRef("");
  const audioRef = useRef<AudioContext | null>(null);
  const [hud, setHud] = useState(INITIAL_HUD);
  const [message, setMessage] = useState("等待小队突入");
  const [pointerLocked, setPointerLocked] = useState(false);
  const [sound, setSound] = useState(true);

  const playTone = useCallback(
    (frequency: number, duration: number, type: OscillatorType = "square") => {
      if (!sound || typeof window === "undefined") return;
      const audio = audioRef.current ?? new AudioContext();
      audioRef.current = audio;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.055, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audio.currentTime + duration,
      );
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + duration);
    },
    [sound],
  );

  const playGunshot = useCallback(() => {
    if (!sound || typeof window === "undefined") return;
    const audio = audioRef.current ?? new AudioContext();
    audioRef.current = audio;
    const duration = 0.11;
    const buffer = audio.createBuffer(
      1,
      Math.floor(audio.sampleRate * duration),
      audio.sampleRate,
    );
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      const envelope = Math.pow(1 - index / channel.length, 3.2);
      channel[index] = (Math.random() * 2 - 1) * envelope;
    }
    const noise = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    noise.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = 1800;
    gain.gain.value = 0.2;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);

    const crack = audio.createOscillator();
    const crackGain = audio.createGain();
    crack.type = "square";
    crack.frequency.setValueAtTime(92, audio.currentTime);
    crack.frequency.exponentialRampToValueAtTime(48, audio.currentTime + 0.06);
    crackGain.gain.setValueAtTime(0.09, audio.currentTime);
    crackGain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.07);
    crack.connect(crackGain);
    crackGain.connect(audio.destination);
    noise.start();
    crack.start();
    crack.stop(audio.currentTime + 0.075);
  }, [sound]);

  const playFootstep = useCallback(() => {
    if (!sound || typeof window === "undefined") return;
    const audio = audioRef.current ?? new AudioContext();
    audioRef.current = audio;
    const buffer = audio.createBuffer(
      1,
      Math.floor(audio.sampleRate * 0.045),
      audio.sampleRate,
    );
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      const envelope = 1 - index / channel.length;
      channel[index] = (Math.random() * 2 - 1) * envelope;
    }
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = 320;
    gain.gain.value = 0.055;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    source.start();
  }, [sound]);

  const publishHud = useCallback((game: GameState) => {
    const next: HudState = {
      phase: game.phase,
      round: game.round,
      health: Math.max(0, Math.ceil(game.health)),
      armor: Math.max(0, Math.ceil(game.armor)),
      ammo: game.ammo,
      reserve: game.reserve,
      money: game.money,
      kills: game.kills,
      enemies: game.bots.filter((bot) => bot.alive).length,
      bombTimer: Math.max(0, game.bombTimer),
      defuseProgress: game.defuseProgress,
      reloading: game.reloadTime > 0,
      nearBomb:
        distanceBetween(game.player.x, game.player.y, BOMB_X, BOMB_Y) < 1.25,
    };
    const key = JSON.stringify({
      ...next,
      bombTimer: Math.ceil(next.bombTimer * 5) / 5,
      defuseProgress: Math.ceil(next.defuseProgress * 20) / 20,
    });
    if (key !== hudKeyRef.current) {
      hudKeyRef.current = key;
      setHud(next);
    }
  }, []);

  const startRound = useCallback(() => {
    const previous = gameRef.current;
    const round = previous.phase === "won" ? previous.round + 1 : previous.round;
    gameRef.current = {
      ...createGame(),
      phase: "active",
      round,
      bots: makeBots(round),
      money: previous.money,
      bombTimer: Math.max(48, 65 - (round - 1) * 3),
    };
    fireHeldRef.current = false;
    setMessage("B 点装置已启动：清除威胁并完成拆除");
    publishHud(gameRef.current);
    playTone(520, 0.08, "triangle");
    window.setTimeout(() => playTone(760, 0.12, "triangle"), 90);
    canvasRef.current?.focus();
  }, [playTone, publishHud]);

  const reload = useCallback(() => {
    const game = gameRef.current;
    if (
      game.phase !== "active" ||
      game.reloadTime > 0 ||
      game.ammo >= 30 ||
      game.reserve <= 0
    ) {
      return;
    }
    game.reloadTime = 1.55;
    setMessage("正在更换弹匣");
    playTone(210, 0.08, "triangle");
  }, [playTone]);

  const shoot = useCallback(() => {
    const game = gameRef.current;
    if (
      game.phase !== "active" ||
      game.reloadTime > 0 ||
      game.shotCooldown > 0
    ) {
      return;
    }
    if (game.ammo <= 0) {
      setMessage("弹匣已空，按 R 换弹");
      playTone(90, 0.05);
      return;
    }

    game.ammo -= 1;
    game.shotCooldown = 0.12;
    game.muzzleFlash = 0.075;
    game.recoil = Math.min(1, game.recoil + 0.2);
    game.viewKick = Math.min(1, game.viewKick + 0.24);
    playGunshot();

    const spread =
      0.0025 + game.recoil * 0.014 + (game.walking ? 0.012 : 0);
    const shotAngle =
      game.player.angle + (Math.random() - 0.5) * spread * 2;

    let target: Bot | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    game.bots.forEach((bot) => {
      if (!bot.alive) return;
      const distance = distanceBetween(
        game.player.x,
        game.player.y,
        bot.x,
        bot.y,
      );
      const angle = normalizeAngle(
        Math.atan2(bot.y - game.player.y, bot.x - game.player.x) -
          shotAngle,
      );
      const allowance = Math.atan(0.34 / distance) + 0.012;
      if (
        Math.abs(angle) <= allowance &&
        hasLineOfSight(game.player.x, game.player.y, bot.x, bot.y)
      ) {
        const score = Math.abs(angle) * 5 + distance * 0.01;
        if (score < bestScore) {
          target = bot;
          bestScore = score;
        }
      }
    });

    if (target) {
      const hitBot = target as Bot;
      const targetAngle = Math.abs(
        normalizeAngle(
          Math.atan2(
            hitBot.y - game.player.y,
            hitBot.x - game.player.x,
          ) - shotAngle,
        ),
      );
      const headshot = targetAngle < 0.009;
      hitBot.health -= headshot ? 112 : 43 + Math.random() * 16;
      hitBot.alerted = true;
      hitBot.flash = 0.1;
      game.hitMarker = 0.14;
      setMessage(headshot ? "爆头命中" : "命中目标");
      playTone(headshot ? 1180 : 860, 0.045, "triangle");
      if (hitBot.health <= 0) {
        hitBot.alive = false;
        game.kills += 1;
        game.money += 300;
        setMessage(headshot ? "爆头清除 · +$300" : "目标清除 · +$300");
        playTone(640, 0.08, "triangle");
      }
    }

    if (game.ammo === 0 && game.reserve > 0) {
      setMessage("弹匣已空，按 R 换弹");
    }
  }, [playGunshot, playTone]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keysRef.current.add(key);
      if (["w", "a", "s", "d", "e", "shift", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        event.preventDefault();
      }
      if (key === "r") reload();
      if (key === "enter" && gameRef.current.phase !== "active") startRound();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLowerCase());
    };
    const onMouseMove = (event: MouseEvent) => {
      if (
        document.pointerLockElement === canvasRef.current &&
        gameRef.current.phase === "active"
      ) {
        gameRef.current.player.angle = normalizeAngle(
          gameRef.current.player.angle + event.movementX * 0.00235,
        );
      }
    };
    const onPointerUp = () => {
      fireHeldRef.current = false;
    };
    const onPointerLock = () => {
      setPointerLocked(document.pointerLockElement === canvasRef.current);
    };
    const onBlur = () => keysRef.current.clear();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("pointerlockchange", onPointerLock);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("pointerlockchange", onPointerLock);
    };
  }, [reload, startRound]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const game = gameRef.current;
      const delta = Math.min(0.033, (now - previous) / 1000);
      previous = now;

      if (game.phase === "active") {
        const keys = keysRef.current;
        const quiet = keys.has("shift");
        const speed = MOVE_SPEED * (quiet ? 0.58 : 1) * delta;
        const forward =
          Number(keys.has("w") || keys.has("arrowup")) -
          Number(keys.has("s") || keys.has("arrowdown"));
        const strafe = Number(keys.has("d")) - Number(keys.has("a"));
        game.walking = forward !== 0 || strafe !== 0;
        game.movePhase += game.walking
          ? delta * (quiet ? 7.5 : 11.5)
          : delta * 2.5;
        game.stepCooldown -= delta;
        if (game.walking && game.stepCooldown <= 0) {
          game.stepCooldown = quiet ? 0.64 : 0.42;
          playFootstep();
        }

        if (keys.has("arrowleft")) {
          game.player.angle -= TURN_SPEED * delta;
        }
        if (keys.has("arrowright")) {
          game.player.angle += TURN_SPEED * delta;
        }
        game.player.angle = normalizeAngle(game.player.angle);

        if (forward !== 0 || strafe !== 0) {
          const length = Math.hypot(forward, strafe) || 1;
          const dx =
            (Math.cos(game.player.angle) * forward +
              Math.cos(game.player.angle + Math.PI / 2) * strafe) *
            (speed / length);
          const dy =
            (Math.sin(game.player.angle) * forward +
              Math.sin(game.player.angle + Math.PI / 2) * strafe) *
            (speed / length);
          tryMove(game.player, dx, dy);
        }

        game.bombTimer -= delta;
        game.shotCooldown = Math.max(0, game.shotCooldown - delta);
        game.muzzleFlash = Math.max(0, game.muzzleFlash - delta);
        game.hitMarker = Math.max(0, game.hitMarker - delta);
        game.damageFlash = Math.max(0, game.damageFlash - delta * 1.8);
        game.recoil = Math.max(0, game.recoil - delta * 1.5);
        game.viewKick = Math.max(0, game.viewKick - delta * 2.8);
        if (fireHeldRef.current && game.shotCooldown <= 0) {
          shoot();
        }

        if (game.reloadTime > 0) {
          game.reloadTime -= delta;
          if (game.reloadTime <= 0) {
            const needed = 30 - game.ammo;
            const loaded = Math.min(needed, game.reserve);
            game.ammo += loaded;
            game.reserve -= loaded;
            setMessage("换弹完成");
            playTone(320, 0.06, "triangle");
          }
        }

        game.bots.forEach((bot) => {
          if (!bot.alive) return;
          bot.cooldown -= delta;
          bot.flash = Math.max(0, bot.flash - delta);
          bot.shotFlash = Math.max(0, bot.shotFlash - delta);
          const distance = distanceBetween(
            bot.x,
            bot.y,
            game.player.x,
            game.player.y,
          );
          const visible = hasLineOfSight(
            bot.x,
            bot.y,
            game.player.x,
            game.player.y,
          );
          if (visible && distance < 9) bot.alerted = true;

          if (bot.alerted && distance > 2.15) {
            const botSpeed = (0.42 + game.round * 0.035) * delta;
            tryMove(
              bot,
              ((game.player.x - bot.x) / distance) * botSpeed,
              ((game.player.y - bot.y) / distance) * botSpeed,
            );
          }

          if (bot.alerted && visible && distance < 7.2 && bot.cooldown <= 0) {
            const rawDamage = 7 + Math.random() * 6 + game.round * 0.5;
            const absorbed = Math.min(game.armor, rawDamage * 0.55);
            game.armor -= absorbed;
            game.health -= rawDamage - absorbed;
            game.damageFlash = 0.3;
            game.viewKick = Math.min(1, game.viewKick + 0.15);
            bot.shotFlash = 0.09;
            bot.cooldown = 0.95 + Math.random() * 0.75;
            setMessage("遭到敌方火力");
            playTone(145, 0.07, "sawtooth");
          }
        });

        const nearBomb =
          distanceBetween(game.player.x, game.player.y, BOMB_X, BOMB_Y) < 1.25;
        if (nearBomb && keys.has("e")) {
          game.defuseProgress += delta;
          setMessage("正在拆除装置，不要松开 E");
          if (game.defuseProgress >= 4) {
            game.defuseProgress = 4;
            game.phase = "won";
            game.money += 900;
            setMessage("装置已拆除，反恐小队获胜");
            playTone(660, 0.12, "triangle");
            window.setTimeout(() => playTone(940, 0.18, "triangle"), 110);
          }
        } else {
          game.defuseProgress = Math.max(0, game.defuseProgress - delta * 0.75);
        }

        if (game.health <= 0) {
          game.health = 0;
          game.phase = "lost";
          setMessage("行动失败：小队成员倒下");
          playTone(105, 0.32, "sawtooth");
        } else if (game.bombTimer <= 0) {
          game.bombTimer = 0;
          game.phase = "lost";
          setMessage("行动失败：装置已引爆");
          playTone(72, 0.42, "sawtooth");
        } else if (
          game.bots.every((bot) => !bot.alive) &&
          !nearBomb &&
          Math.floor(game.bombTimer * 2) % 8 === 0
        ) {
          setMessage("区域安全，立即前往 B 点拆弹");
        }
      }

      publishHud(game);
      renderScene(context, game, now);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playFootstep, playTone, publishHud, shoot]);

  const pressControl = (key: string, pressed: boolean) => {
    if (pressed) keysRef.current.add(key);
    else keysRef.current.delete(key);
  };

  const overlayTitle =
    hud.phase === "won"
      ? "区域安全"
      : hud.phase === "lost"
        ? "行动失败"
        : "港口仓库 · B 点";
  const overlayCopy =
    hud.phase === "won"
      ? `回合 ${hud.round} 完成，清除 ${hud.kills} 个目标并成功拆除装置。`
      : hud.phase === "lost"
        ? "重新整理装备，再次突入。利用墙角换弹，不要在开阔区域停留。"
        : "突入仓库，清除敌方机器人；随后靠近橙色 B 点装置并长按 E 四秒完成拆除。";

  return (
    <main className="game-shell">
      <section className="game-frame" aria-label="临界行动第一人称游戏区域">
        <header className="topbar">
          <div className="brand">
            <span className="unit-mark">CT</span>
            <div>
              <p>ORIGINAL TACTICAL FPS</p>
              <h1>临界行动</h1>
            </div>
          </div>

          <div className="round-hud" aria-live="polite">
            <div>
              <span>回合</span>
              <strong>{String(hud.round).padStart(2, "0")}</strong>
            </div>
            <div>
              <span>剩余敌人</span>
              <strong>{hud.enemies}</strong>
            </div>
            <div className={hud.bombTimer <= 12 ? "danger" : ""}>
              <span>装置倒计时</span>
              <strong>{hud.bombTimer.toFixed(1)}</strong>
            </div>
          </div>

          <button
            type="button"
            className="sound-button"
            onClick={() => setSound((value) => !value)}
            aria-pressed={sound}
            aria-label={sound ? "关闭音效" : "开启音效"}
          >
            {sound ? "声" : "静"}
          </button>
        </header>

        <div className="viewport-wrap">
          <canvas
            ref={canvasRef}
            width={VIEW_WIDTH}
            height={VIEW_HEIGHT}
            tabIndex={0}
            aria-label="临界行动第一人称游戏画面"
            onPointerDown={() => {
              if (gameRef.current.phase === "active") {
                fireHeldRef.current = true;
                canvasRef.current?.requestPointerLock?.();
                shoot();
              }
            }}
          />

          <div className="status-strip" role="status" aria-live="polite">
            <i />
            {message}
          </div>

          {!pointerLocked && hud.phase === "active" && (
            <div className="lock-hint">点击画面锁定鼠标并射击</div>
          )}

          {hud.nearBomb && hud.phase === "active" && (
            <div className="defuse-panel">
              <div
                className="defuse-ring"
                style={
                  {
                    "--progress": `${Math.min(100, (hud.defuseProgress / 4) * 100)}%`,
                  } as React.CSSProperties
                }
              >
                <strong>E</strong>
              </div>
              <div>
                <span>长按 E 拆弹</span>
                <small>{hud.defuseProgress.toFixed(1)} / 4.0 秒</small>
              </div>
            </div>
          )}

          <div className="player-hud">
            <div className="vitals">
              <span>生命 <strong>{hud.health}</strong></span>
              <span>护甲 <strong>{hud.armor}</strong></span>
            </div>
            <div className="funds">${hud.money.toLocaleString("en-US")}</div>
            <div className="ammo">
              <strong>{hud.ammo}</strong>
              <span>/ {hud.reserve}</span>
              <small>{hud.reloading ? "换弹中…" : "AR-27"}</small>
            </div>
          </div>

          {hud.phase !== "active" && (
            <div className="game-overlay">
              <div className="briefing-card">
                <div className="brief-code">
                  OPERATION / {String(hud.round).padStart(2, "0")}
                </div>
                <span className="eyebrow">
                  {hud.phase === "won"
                    ? "ROUND SECURED"
                    : hud.phase === "lost"
                      ? "MISSION FAILED"
                      : "BOMB DEFUSAL"}
                </span>
                <h2>{overlayTitle}</h2>
                <p>{overlayCopy}</p>
                <div className="brief-stats">
                  <div>
                    <span>生命</span>
                    <strong>100</strong>
                  </div>
                  <div>
                    <span>弹匣</span>
                    <strong>30 / 90</strong>
                  </div>
                  <div>
                    <span>拆弹</span>
                    <strong>4 秒</strong>
                  </div>
                </div>
                <button type="button" className="start-button" onClick={startRound}>
                  <span>{hud.phase === "won" ? "下一回合" : "开始突入"}</span>
                  <b>→</b>
                </button>
                <div className="control-line">
                  <kbd>WASD</kbd> 移动 · <kbd>鼠标</kbd> 瞄准 ·{" "}
                  <kbd>左键</kbd> 左键射击 · <kbd>R</kbd> 换弹 ·{" "}
                  <kbd>E</kbd> 长按 E 拆弹
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="bottombar">
          <div className="mission-copy">
            <span>当前目标</span>
            <strong>
              {hud.enemies > 0
                ? `清除仓库内 ${hud.enemies} 个敌方目标`
                : "前往 B 点，长按 E 拆除装置"}
            </strong>
          </div>
          <div className="desktop-controls">
            <span><kbd>WASD</kbd> 移动</span>
            <span><kbd>鼠标</kbd> 瞄准</span>
            <span><kbd>左键</kbd> 射击</span>
            <button type="button" onClick={reload}>R · 换弹</button>
          </div>
          <div className="touch-controls" aria-label="触屏控制">
            <div>
              <button
                type="button"
                onPointerDown={() => pressControl("w", true)}
                onPointerUp={() => pressControl("w", false)}
                onPointerCancel={() => pressControl("w", false)}
              >
                ↑
              </button>
              <button
                type="button"
                onPointerDown={() => pressControl("arrowleft", true)}
                onPointerUp={() => pressControl("arrowleft", false)}
                onPointerCancel={() => pressControl("arrowleft", false)}
              >
                ←
              </button>
              <button
                type="button"
                onPointerDown={() => pressControl("s", true)}
                onPointerUp={() => pressControl("s", false)}
                onPointerCancel={() => pressControl("s", false)}
              >
                ↓
              </button>
              <button
                type="button"
                onPointerDown={() => pressControl("arrowright", true)}
                onPointerUp={() => pressControl("arrowright", false)}
                onPointerCancel={() => pressControl("arrowright", false)}
              >
                →
              </button>
            </div>
            <button
              type="button"
              className="touch-fire"
              onPointerDown={() => {
                fireHeldRef.current = true;
                shoot();
              }}
              onPointerUp={() => {
                fireHeldRef.current = false;
              }}
              onPointerCancel={() => {
                fireHeldRef.current = false;
              }}
            >
              开火
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}
