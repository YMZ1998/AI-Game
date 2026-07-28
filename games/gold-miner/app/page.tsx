"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const HOOK_HOME = 72;
const LEVEL_SECONDS = 50;

type GameStatus = "ready" | "playing" | "levelComplete" | "gameOver";
type HookPhase = "aim" | "extend" | "retract";
type MineralType = "gold" | "goldBig" | "diamond" | "rock" | "silver" | "tnt";

type Mineral = {
  id: number;
  type: MineralType;
  x: number;
  y: number;
  radius: number;
  value: number;
  weight: number;
  rotation: number;
};

type Burst = {
  x: number;
  y: number;
  life: number;
  color: string;
  vx: number;
  vy: number;
};

type Runtime = {
  status: GameStatus;
  phase: HookPhase;
  level: number;
  score: number;
  target: number;
  timeLeft: number;
  angle: number;
  angleDirection: number;
  hookLength: number;
  caughtId: number | null;
  minerals: Mineral[];
  bursts: Burst[];
  lastTime: number;
};

type Hud = {
  score: number;
  target: number;
  level: number;
  timeLeft: number;
  status: GameStatus;
};

const mineralStats: Record<
  MineralType,
  { radius: [number, number]; value: number; weight: number }
> = {
  gold: { radius: [28, 39], value: 120, weight: 3 },
  goldBig: { radius: [50, 64], value: 320, weight: 8 },
  diamond: { radius: [20, 25], value: 500, weight: 1 },
  rock: { radius: [34, 52], value: 30, weight: 7 },
  silver: { radius: [29, 40], value: 80, weight: 4 },
  tnt: { radius: [28, 32], value: 0, weight: 2 },
};

const initialRuntime = (): Runtime => ({
  status: "ready",
  phase: "aim",
  level: 1,
  score: 0,
  target: 800,
  timeLeft: LEVEL_SECONDS,
  angle: 0,
  angleDirection: 1,
  hookLength: HOOK_HOME,
  caughtId: null,
  minerals: [],
  bursts: [],
  lastTime: 0,
});

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function buildMine(level: number): Mineral[] {
  const minerals: Mineral[] = [];
  const types: MineralType[] = [
    "rock",
    "gold",
    "silver",
    "gold",
    "rock",
    "goldBig",
    "rock",
    "diamond",
    "gold",
    "silver",
    "tnt",
    "rock",
    "gold",
    "goldBig",
    ...(level > 1 ? (["diamond", "rock"] as MineralType[]) : []),
  ];

  types.forEach((type, index) => {
    const stats = mineralStats[type];
    const radius = randomBetween(stats.radius[0], stats.radius[1]);
    let x = 0;
    let y = 0;

    for (let attempt = 0; attempt < 80; attempt += 1) {
      x = randomBetween(radius + 45, GAME_WIDTH - radius - 45);
      y = randomBetween(260, GAME_HEIGHT - radius - 28);
      const clear = minerals.every(
        (item) =>
          Math.hypot(item.x - x, item.y - y) >
          item.radius + radius + 22,
      );
      if (clear) break;
    }

    minerals.push({
      id: level * 100 + index,
      type,
      x,
      y,
      radius,
      value: stats.value,
      weight: stats.weight,
      rotation: randomBetween(-0.7, 0.7),
    });
  });

  return minerals;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawMineral(ctx: CanvasRenderingContext2D, mineral: Mineral) {
  const { x, y, radius, type, rotation } = mineral;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  if (type === "diamond") {
    ctx.shadowColor = "#68d9ff";
    ctx.shadowBlur = 24;
    ctx.fillStyle = "#a8edff";
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(radius * 0.85, -radius * 0.2);
    ctx.lineTo(radius * 0.5, radius * 0.85);
    ctx.lineTo(0, radius * 1.12);
    ctx.lineTo(-radius * 0.5, radius * 0.85);
    ctx.lineTo(-radius * 0.85, -radius * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.52, -radius * 0.15);
    ctx.lineTo(0, -radius * 0.75);
    ctx.lineTo(-radius * 0.04, radius * 0.55);
    ctx.closePath();
    ctx.fill();
  } else if (type === "tnt") {
    ctx.fillStyle = "#411b14";
    roundedRect(ctx, -radius * 0.77, -radius, radius * 1.54, radius * 2, 8);
    ctx.fill();
    ctx.fillStyle = "#dc3f2f";
    roundedRect(ctx, -radius * 0.62, -radius * 0.86, radius * 1.24, radius * 1.72, 6);
    ctx.fill();
    ctx.fillStyle = "#fff0c2";
    ctx.font = `900 ${radius * 0.62}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("TNT", 0, 2);
    ctx.strokeStyle = "#34221f";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.bezierCurveTo(5, -radius - 17, 19, -radius - 13, 18, -radius - 27);
    ctx.stroke();
    ctx.fillStyle = "#ffcf45";
    ctx.beginPath();
    ctx.arc(19, -radius - 29, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const isGold = type === "gold" || type === "goldBig";
    const isSilver = type === "silver";
    const points = 9;
    ctx.shadowColor = isGold ? "#ffbe2e" : "transparent";
    ctx.shadowBlur = isGold ? 18 : 0;
    ctx.fillStyle = isGold ? "#f5ad24" : isSilver ? "#aab4b2" : "#5d4a3d";
    ctx.beginPath();
    for (let index = 0; index < points; index += 1) {
      const angle = (index / points) * Math.PI * 2;
      const wobble = 0.82 + ((mineral.id * 7 + index * 11) % 21) / 100;
      const px = Math.cos(angle) * radius * wobble;
      const py = Math.sin(angle) * radius * wobble;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = isGold ? "#ffd86a" : isSilver ? "#d9dedb" : "#766152";
    ctx.globalAlpha = 0.76;
    ctx.beginPath();
    ctx.ellipse(
      -radius * 0.24,
      -radius * 0.28,
      radius * 0.29,
      radius * 0.18,
      -0.45,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.globalAlpha = 1;
    if (!isGold) {
      ctx.fillStyle = isSilver ? "#7f8988" : "#49382e";
      ctx.beginPath();
      ctx.arc(radius * 0.2, radius * 0.18, radius * 0.11, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawScene(ctx: CanvasRenderingContext2D, game: Runtime) {
  const time = performance.now() / 1000;
  const background = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  background.addColorStop(0, "#472516");
  background.addColorStop(0.36, "#241611");
  background.addColorStop(1, "#100c0a");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = "#60361f";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let x = 0; x <= GAME_WIDTH; x += 80) {
    ctx.lineTo(x, 105 + Math.sin(x * 0.017) * 18);
  }
  ctx.lineTo(GAME_WIDTH, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#372017";
  ctx.beginPath();
  ctx.moveTo(0, 170);
  for (let x = 0; x <= GAME_WIDTH; x += 70) {
    ctx.lineTo(x, 190 + Math.sin(x * 0.011 + 1.4) * 16);
  }
  ctx.lineTo(GAME_WIDTH, 124);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 0.32;
  for (let index = 0; index < 72; index += 1) {
    const x = (index * 181 + 47) % GAME_WIDTH;
    const y = 180 + ((index * 97) % 520);
    const glow = 0.5 + Math.sin(time * 0.8 + index) * 0.2;
    ctx.fillStyle = index % 9 === 0 ? `rgba(255,190,73,${glow})` : "#b89470";
    ctx.beginPath();
    ctx.arc(x, y, index % 9 === 0 ? 2.2 : 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(235, 186, 120, 0.12)";
  ctx.lineWidth = 3;
  for (let y = 330; y < GAME_HEIGHT; y += 145) {
    ctx.beginPath();
    ctx.moveTo(-30, y);
    ctx.bezierCurveTo(260, y - 38, 420, y + 38, 690, y);
    ctx.bezierCurveTo(930, y - 34, 1090, y + 26, 1310, y - 12);
    ctx.stroke();
  }

  game.minerals.forEach((mineral) => drawMineral(ctx, mineral));

  game.bursts.forEach((burst) => {
    ctx.globalAlpha = Math.max(0, burst.life);
    ctx.fillStyle = burst.color;
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, 3 + burst.life * 7, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  const pivotX = GAME_WIDTH / 2;
  const pivotY = 72;
  const tipX = pivotX + Math.sin(game.angle) * game.hookLength;
  const tipY = pivotY + Math.cos(game.angle) * game.hookLength;

  ctx.strokeStyle = "#23150e";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.strokeStyle = "#b78654";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.save();
  ctx.translate(tipX, tipY);
  ctx.rotate(-game.angle);
  ctx.strokeStyle = "#e3c294";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(0, 14);
  ctx.quadraticCurveTo(-4, 34, -23, 38);
  ctx.moveTo(0, 14);
  ctx.quadraticCurveTo(4, 34, 23, 38);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#29140d";
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d68a2c";
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 29, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5b2a18";
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#4c2416";
  roundedRect(ctx, pivotX - 118, 18, 78, 67, 13);
  ctx.fill();
  ctx.fillStyle = "#d4452e";
  roundedRect(ctx, pivotX - 108, 26, 57, 47, 8);
  ctx.fill();
  ctx.fillStyle = "#f3cf9e";
  ctx.beginPath();
  ctx.arc(pivotX - 132, 49, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e4aa48";
  ctx.beginPath();
  ctx.ellipse(pivotX - 132, 31, 31, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#4c2416";
  ctx.beginPath();
  ctx.arc(pivotX - 140, 47, 3, 0, Math.PI * 2);
  ctx.arc(pivotX - 124, 47, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#7c3a21";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(pivotX - 132, 52, 9, 0.2, Math.PI - 0.2);
  ctx.stroke();

  if (game.status === "playing" && game.phase === "aim") {
    ctx.fillStyle = "rgba(255, 224, 140, 0.82)";
    ctx.font = "800 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText("点击 / 空格 · 放下抓钩", pivotX, 142);
  }
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runtimeRef = useRef<Runtime>(initialRuntime());
  const animationRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const [muted, setMuted] = useState(false);
  const [bestScore, setBestScore] = useState(0);
  const [hud, setHud] = useState<Hud>({
    score: 0,
    target: 800,
    level: 1,
    timeLeft: LEVEL_SECONDS,
    status: "ready",
  });

  const syncHud = useCallback(() => {
    const game = runtimeRef.current;
    setHud({
      score: game.score,
      target: game.target,
      level: game.level,
      timeLeft: Math.max(0, Math.ceil(game.timeLeft)),
      status: game.status,
    });
  }, []);

  const playTone = useCallback(
    (frequency: number, duration = 0.08, type: OscillatorType = "sine") => {
      if (muted) return;
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioContextClass) return;
        if (!audioRef.current) audioRef.current = new AudioContextClass();
        const audio = audioRef.current;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.06, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audio.currentTime + duration,
        );
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + duration);
      } catch {
        // Audio is an enhancement; gameplay remains available without it.
      }
    },
    [muted],
  );

  const saveBest = useCallback((score: number) => {
    setBestScore((current) => {
      const next = Math.max(current, score);
      localStorage.setItem("gold-rush-best", String(next));
      return next;
    });
  }, []);

  const startGame = useCallback(() => {
    const game = runtimeRef.current;
    game.status = "playing";
    game.phase = "aim";
    game.level = 1;
    game.score = 0;
    game.target = 800;
    game.timeLeft = LEVEL_SECONDS;
    game.angle = 0;
    game.angleDirection = 1;
    game.hookLength = HOOK_HOME;
    game.caughtId = null;
    game.minerals = buildMine(1);
    game.bursts = [];
    playTone(420, 0.12, "triangle");
    syncHud();
  }, [playTone, syncHud]);

  const nextLevel = useCallback(() => {
    const game = runtimeRef.current;
    game.level += 1;
    game.target = game.score + 700 + game.level * 220;
    game.timeLeft = Math.max(38, LEVEL_SECONDS - (game.level - 1) * 2);
    game.status = "playing";
    game.phase = "aim";
    game.angle = 0;
    game.hookLength = HOOK_HOME;
    game.caughtId = null;
    game.minerals = buildMine(game.level);
    game.bursts = [];
    playTone(560, 0.12, "triangle");
    syncHud();
  }, [playTone, syncHud]);

  const dropHook = useCallback(() => {
    const game = runtimeRef.current;
    if (game.status === "playing" && game.phase === "aim") {
      game.phase = "extend";
      playTone(190, 0.06, "square");
    }
  }, [playTone]);

  useEffect(() => {
    const stored = Number(localStorage.getItem("gold-rush-best") || 0);
    runtimeRef.current.minerals = buildMine(1);
    const frameId = requestAnimationFrame(() => {
      setBestScore(Number.isFinite(stored) ? stored : 0);
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        dropHook();
      }
      if (event.code === "Enter" && runtimeRef.current.status === "ready") {
        startGame();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dropHook, startGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastHudSecond = -1;
    const frame = (timestamp: number) => {
      const game = runtimeRef.current;
      const delta = Math.min(
        0.035,
        game.lastTime ? (timestamp - game.lastTime) / 1000 : 0,
      );
      game.lastTime = timestamp;

      if (game.status === "playing") {
        game.timeLeft -= delta;
        if (game.timeLeft <= 0) {
          game.timeLeft = 0;
          if (game.score >= game.target) {
            game.status = "levelComplete";
            playTone(680, 0.25, "triangle");
          } else {
            game.status = "gameOver";
            saveBest(game.score);
            playTone(110, 0.3, "sawtooth");
          }
          syncHud();
        }

        if (game.phase === "aim") {
          game.angle += game.angleDirection * delta * 1.25;
          if (game.angle > 1.14 || game.angle < -1.14) {
            game.angle = Math.max(-1.14, Math.min(1.14, game.angle));
            game.angleDirection *= -1;
          }
        } else {
          const caught = game.minerals.find(
            (item) => item.id === game.caughtId,
          );
          const speed =
            game.phase === "extend"
              ? 900
              : 920 / (1 + (caught?.weight || 0) * 0.13);
          game.hookLength +=
            (game.phase === "extend" ? 1 : -1) * speed * delta;

          const pivotX = GAME_WIDTH / 2;
          const pivotY = 72;
          const tipX = pivotX + Math.sin(game.angle) * game.hookLength;
          const tipY = pivotY + Math.cos(game.angle) * game.hookLength;

          if (caught) {
            caught.x = tipX;
            caught.y = tipY + caught.radius * 0.45;
          }

          if (game.phase === "extend") {
            const hit = game.minerals.find(
              (item) =>
                item.id !== game.caughtId &&
                Math.hypot(item.x - tipX, item.y - tipY) <
                  item.radius + 13,
            );
            if (hit) {
              if (hit.type === "tnt") {
                const nearby = game.minerals.filter(
                  (item) =>
                    item.id !== hit.id &&
                    Math.hypot(item.x - hit.x, item.y - hit.y) < 150,
                );
                const bonus = nearby.reduce(
                  (sum, item) =>
                    sum + (item.type === "rock" ? 0 : Math.round(item.value / 2)),
                  0,
                );
                const removed = new Set([hit.id, ...nearby.map((item) => item.id)]);
                game.minerals = game.minerals.filter(
                  (item) => !removed.has(item.id),
                );
                game.score += bonus;
                for (let index = 0; index < 28; index += 1) {
                  const angle = (index / 28) * Math.PI * 2;
                  const velocity = randomBetween(70, 260);
                  game.bursts.push({
                    x: hit.x,
                    y: hit.y,
                    life: 1,
                    color: index % 2 ? "#ffcf45" : "#ef5b36",
                    vx: Math.cos(angle) * velocity,
                    vy: Math.sin(angle) * velocity,
                  });
                }
                game.phase = "retract";
                playTone(80, 0.28, "sawtooth");
                syncHud();
              } else {
                game.caughtId = hit.id;
                game.phase = "retract";
                playTone(hit.type === "diamond" ? 880 : 310, 0.1, "triangle");
              }
            } else if (
              tipX < 10 ||
              tipX > GAME_WIDTH - 10 ||
              tipY > GAME_HEIGHT - 8 ||
              game.hookLength > 880
            ) {
              game.phase = "retract";
            }
          }

          if (game.phase === "retract" && game.hookLength <= HOOK_HOME) {
            game.hookLength = HOOK_HOME;
            if (caught) {
              game.score += caught.value;
              game.minerals = game.minerals.filter(
                (item) => item.id !== caught.id,
              );
              game.caughtId = null;
              playTone(caught.type === "diamond" ? 1040 : 520, 0.11, "triangle");
              syncHud();
            }
            game.phase = "aim";
          }
        }
      }

      game.bursts.forEach((burst) => {
        burst.life -= delta * 1.7;
        burst.x += burst.vx * delta;
        burst.y += burst.vy * delta;
        burst.vy += 180 * delta;
      });
      game.bursts = game.bursts.filter((burst) => burst.life > 0);

      const hudSecond = Math.ceil(game.timeLeft);
      if (hudSecond !== lastHudSecond) {
        lastHudSecond = hudSecond;
        syncHud();
      }

      drawScene(ctx, game);
      animationRef.current = requestAnimationFrame(frame);
    };

    animationRef.current = requestAnimationFrame(frame);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [playTone, saveBest, syncHud]);

  const statusTitle =
    hud.status === "ready"
      ? "矿脉已经苏醒"
      : hud.status === "levelComplete"
        ? "满载而归！"
        : "本轮收工";
  const statusCopy =
    hud.status === "ready"
      ? "看准时机放下抓钩，把地下的宝贝全带回来。"
      : hud.status === "levelComplete"
        ? `你已超过 ¥${hud.target.toLocaleString()} 的目标，下一层矿脉更富也更险。`
        : `差 ¥${Math.max(0, hud.target - hud.score).toLocaleString()} 达标，再试一次一定能挖到大的。`;

  return (
    <main className="game-shell">
      <section className="game-frame" aria-label="黄金矿工游戏">
        <header className="topbar">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              <span />
            </div>
            <div>
              <p>DEEP CAVE CO.</p>
              <h1>黄金矿工</h1>
            </div>
          </div>

          <div className="hud" aria-live="polite">
            <div className="hud-item">
              <span>赏金</span>
              <strong>¥ {hud.score.toLocaleString()}</strong>
            </div>
            <div className="hud-item target">
              <span>本关目标</span>
              <strong>¥ {hud.target.toLocaleString()}</strong>
            </div>
            <div className="hud-item level">
              <span>矿层</span>
              <strong>0{hud.level}</strong>
            </div>
            <div className={`timer ${hud.timeLeft <= 10 ? "urgent" : ""}`}>
              <span>剩余</span>
              <strong>{String(hud.timeLeft).padStart(2, "0")}</strong>
              <small>秒</small>
            </div>
          </div>

          <button
            className="sound-button"
            type="button"
            onClick={() => setMuted((value) => !value)}
            aria-label={muted ? "打开声音" : "关闭声音"}
            title={muted ? "打开声音" : "关闭声音"}
          >
            {muted ? "×" : "♪"}
          </button>
        </header>

        <div className="canvas-wrap">
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            onPointerDown={dropHook}
            aria-label="矿洞游戏区域，点击放下抓钩"
          />

          {hud.status !== "playing" && (
            <div className="game-overlay">
              <div className="overlay-card">
                <div className="eyebrow">
                  {hud.status === "ready"
                    ? "今日矿情 · 极佳"
                    : hud.status === "levelComplete"
                      ? `矿层 0${hud.level} 已清算`
                      : "矿洞暂时关闭"}
                </div>
                <h2>{statusTitle}</h2>
                <p>{statusCopy}</p>
                <button
                  className="primary-button"
                  type="button"
                  onClick={hud.status === "levelComplete" ? nextLevel : startGame}
                >
                  {hud.status === "ready"
                    ? "开始淘金"
                    : hud.status === "levelComplete"
                      ? "深入下一层"
                      : "再挖一轮"}
                  <span aria-hidden="true">→</span>
                </button>
                <div className="control-hint">
                  <span>SPACE</span>
                  或点击屏幕放钩
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="bottombar">
          <div className="legend" aria-label="矿物价值图例">
            <span><i className="dot gold" />金块 ¥120–320</span>
            <span><i className="dot diamond" />钻石 ¥500</span>
            <span><i className="dot silver" />银矿 ¥80</span>
            <span><i className="dot tnt" />炸药可清场</span>
          </div>
          <div className="best-score">
            <span>个人最佳</span>
            <strong>¥ {bestScore.toLocaleString()}</strong>
          </div>
        </footer>
      </section>
    </main>
  );
}
