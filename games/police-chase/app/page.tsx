"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const WIDTH = 1280;
const HEIGHT = 720;
const ANCHOR_X = WIDTH / 2;
const ANCHOR_Y = 154;
const RESTING_CABLE = 72;
const MAX_CABLE = 640;

type MissionPhase = "ready" | "playing" | "won" | "lost";
type CableMode = "aiming" | "extending" | "retracting";
type TargetKind = "thief" | "boss" | "evidence" | "civilian" | "cone";

type Target = {
  id: number;
  kind: TargetKind;
  x: number;
  y: number;
  radius: number;
  value: number;
  label: string;
  pullSpeed: number;
  weightLabel: string;
  caught: boolean;
};

type Cable = {
  angle: number;
  direction: number;
  length: number;
  mode: CableMode;
  targetId: number | null;
};

type GameState = {
  phase: MissionPhase;
  level: number;
  score: number;
  targetScore: number;
  timeLeft: number;
  combo: number;
  captured: number;
  sound: boolean;
  targets: Target[];
  cable: Cable;
};

type HudState = {
  phase: MissionPhase;
  level: number;
  score: number;
  targetScore: number;
  timeLeft: number;
  combo: number;
  captured: number;
};

function makeTargets(level: number): Target[] {
  const specs: Array<
    [TargetKind, number, number, number, string, number, number, string]
  > = [
    ["thief", 214, 248, 36, "小偷", 180, 350, "轻"],
    ["evidence", 430, 270, 28, "赃物", 140, 440, "轻"],
    ["boss", 684, 276, 52, "头目", 520, 175, "很重"],
    ["cone", 878, 224, 28, "路障", -4, 155, "很重"],
    ["civilian", 1060, 270, 37, "市民", -150, 315, "中"],
    ["thief", 1040, 406, 34, "小偷", 220, 340, "轻"],
    ["evidence", 822, 420, 29, "赃物", 160, 425, "轻"],
    ["cone", 410, 420, 30, "路障", -4, 150, "很重"],
    ["thief", 150, 458, 35, "小偷", 200, 330, "中"],
    ["boss", 566, 514, 48, "头目", 480, 185, "很重"],
    ["civilian", 930, 554, 36, "市民", -150, 305, "中"],
    ["evidence", 332, 600, 27, "赃物", 120, 450, "轻"],
    ["thief", 782, 626, 34, "小偷", 180, 345, "轻"],
    ["cone", 1015, 640, 29, "路障", -4, 145, "很重"],
  ];

  return specs.map(
    ([kind, x, y, radius, label, value, pullSpeed, weightLabel], index) => {
      const levelShift = ((index * 47 + level * 29) % 51) - 25;
      return {
        id: index + 1,
        kind,
        x: Math.max(92, Math.min(WIDTH - 92, x + levelShift)),
        y: Math.max(218, Math.min(646, y + (levelShift % 17))),
        radius,
        value,
        label,
        pullSpeed: Math.max(125, pullSpeed - (level - 1) * 8),
        weightLabel,
        caught: false,
      };
    },
  );
}

function createGame(): GameState {
  return {
    phase: "ready",
    level: 1,
    score: 0,
    targetScore: 1000,
    timeLeft: 60,
    combo: 1,
    captured: 0,
    sound: true,
    targets: makeTargets(1),
    cable: {
      angle: -0.72,
      direction: 1,
      length: RESTING_CABLE,
      mode: "aiming",
      targetId: null,
    },
  };
}

function cableEnd(game: GameState) {
  return {
    x: ANCHOR_X + Math.sin(game.cable.angle) * game.cable.length,
    y: ANCHOR_Y + Math.cos(game.cable.angle) * game.cable.length,
  };
}

function roundRect(
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

function drawTarget(context: CanvasRenderingContext2D, target: Target) {
  const { x, y, radius } = target;
  context.save();
  context.translate(x, y);

  if (target.kind === "cone") {
    context.fillStyle = "#ff8a3d";
    context.beginPath();
    context.moveTo(0, -radius);
    context.lineTo(radius * 0.82, radius * 0.72);
    context.lineTo(-radius * 0.82, radius * 0.72);
    context.closePath();
    context.fill();
    context.fillStyle = "#f3e7c9";
    context.fillRect(-radius * 0.56, 2, radius * 1.12, 7);
    context.fillStyle = "#8a3a20";
    context.fillRect(-radius, radius * 0.66, radius * 2, 7);
  } else if (target.kind === "evidence") {
    context.fillStyle = "#ffc857";
    context.beginPath();
    context.moveTo(-radius * 0.62, -radius * 0.62);
    context.quadraticCurveTo(0, -radius * 1.02, radius * 0.62, -radius * 0.62);
    context.lineTo(radius * 0.82, radius * 0.68);
    context.quadraticCurveTo(0, radius * 1.02, -radius * 0.82, radius * 0.68);
    context.closePath();
    context.fill();
    context.strokeStyle = "#71531f";
    context.lineWidth = 3;
    context.stroke();
    context.fillStyle = "#594015";
    context.font = "900 18px Arial";
    context.textAlign = "center";
    context.fillText("赃", 0, 7);
  } else {
    const isCivilian = target.kind === "civilian";
    const isBoss = target.kind === "boss";
    context.fillStyle = isCivilian
      ? "#5c9ed8"
      : isBoss
        ? "#8959d8"
        : "#ff4d5d";
    roundRect(
      context,
      -radius * 0.74,
      -radius * 0.16,
      radius * 1.48,
      radius * 1.18,
      12,
    );
    context.fill();

    context.fillStyle = "#e8b38a";
    context.beginPath();
    context.arc(0, -radius * 0.42, radius * 0.48, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = isCivilian ? "#173754" : "#151b2c";
    context.beginPath();
    context.arc(0, -radius * 0.63, radius * 0.48, Math.PI, Math.PI * 2);
    context.lineTo(radius * 0.5, -radius * 0.39);
    context.lineTo(-radius * 0.5, -radius * 0.39);
    context.closePath();
    context.fill();

    if (!isCivilian) {
      context.fillStyle = "#101827";
      roundRect(
        context,
        -radius * 0.5,
        -radius * 0.48,
        radius,
        radius * 0.26,
        5,
      );
      context.fill();
      context.fillStyle = "#f3e7c9";
      context.beginPath();
      context.arc(-radius * 0.2, -radius * 0.37, 2.6, 0, Math.PI * 2);
      context.arc(radius * 0.2, -radius * 0.37, 2.6, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = "#f3e7c9";
      context.lineWidth = 4;
      for (let stripe = -1; stripe <= 1; stripe += 1) {
        context.beginPath();
        context.moveTo(-radius * 0.52, radius * (0.17 + stripe * 0.2));
        context.lineTo(radius * 0.52, radius * (0.17 + stripe * 0.2));
        context.stroke();
      }
    } else {
      context.fillStyle = "#f3e7c9";
      context.beginPath();
      context.arc(-radius * 0.17, -radius * 0.4, 2.4, 0, Math.PI * 2);
      context.arc(radius * 0.17, -radius * 0.4, 2.4, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#173754";
      context.fillRect(-radius * 0.38, radius * 0.22, radius * 0.76, 4);
    }
  }

  context.font = "900 12px Arial";
  context.textAlign = "center";
  context.fillStyle =
    target.kind === "civilian" ? "#b9ddff" : target.kind === "cone" ? "#ffcf9c" : "#f3e7c9";
  context.fillText(target.label, 0, radius + 22);
  if (target.value > 0) {
    context.fillStyle = target.kind === "evidence" ? "#ffc857" : "#65d69a";
    context.fillText(`+${target.value} · ${target.weightLabel}`, 0, radius + 38);
  } else {
    context.fillStyle = target.kind === "civilian" ? "#b9ddff" : "#ffcf9c";
    context.fillText(
      target.kind === "civilian" ? "别抓" : `${target.weightLabel} · 耗时`,
      0,
      radius + 38,
    );
  }
  context.restore();
}

function drawOfficer(context: CanvasRenderingContext2D, pulse: number) {
  context.save();
  context.translate(ANCHOR_X, 104);

  context.fillStyle = "#10263b";
  roundRect(context, -128, -58, 256, 102, 22);
  context.fill();
  context.strokeStyle = "#d5a839";
  context.lineWidth = 3;
  context.stroke();

  context.fillStyle = "#081522";
  context.fillRect(-151, 42, 302, 18);
  for (let stripe = -140; stripe < 145; stripe += 34) {
    context.fillStyle = stripe % 68 === 0 ? "#ffc857" : "#182a3a";
    context.beginPath();
    context.moveTo(stripe, 42);
    context.lineTo(stripe + 21, 42);
    context.lineTo(stripe + 9, 60);
    context.lineTo(stripe - 12, 60);
    context.closePath();
    context.fill();
  }

  context.fillStyle = "#d99a72";
  context.beginPath();
  context.arc(0, -12, 25, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#1e5a8d";
  roundRect(context, -34, 7, 68, 38, 14);
  context.fill();
  context.fillStyle = "#13263e";
  context.beginPath();
  context.arc(0, -30, 30, Math.PI, Math.PI * 2);
  context.fill();
  context.fillRect(-32, -32, 64, 9);

  context.globalAlpha = 0.58 + pulse * 0.42;
  context.fillStyle = "#37d7ff";
  context.fillRect(-91, -45, 50, 10);
  context.fillStyle = "#ff4d5d";
  context.fillRect(41, -45, 50, 10);
  context.globalAlpha = 1;

  context.fillStyle = "#f3e7c9";
  context.font = "900 11px Arial";
  context.textAlign = "center";
  context.fillText("抓捕操作台", 0, 36);
  context.restore();
}

function drawScene(
  context: CanvasRenderingContext2D,
  game: GameState,
  now: number,
) {
  context.clearRect(0, 0, WIDTH, HEIGHT);

  const sky = context.createLinearGradient(0, 0, 0, 190);
  sky.addColorStop(0, "#06101d");
  sky.addColorStop(1, "#17324a");
  context.fillStyle = sky;
  context.fillRect(0, 0, WIDTH, 190);

  context.fillStyle = "#0b1721";
  context.fillRect(0, 174, WIDTH, HEIGHT - 174);

  const depthBands = [
    ["#173246", 190, 104],
    ["#142c3e", 294, 110],
    ["#102536", 404, 112],
    ["#0e2130", 516, 112],
    ["#0b1b29", 628, 92],
  ] as const;
  depthBands.forEach(([color, y, height], index) => {
    context.fillStyle = color;
    context.fillRect(0, y, WIDTH, height);
    context.strokeStyle = "rgba(255, 214, 126, 0.08)";
    context.lineWidth = 1;
    for (let x = index % 2 ? -54 : 0; x < WIDTH; x += 118) {
      context.strokeRect(x, y, 112, height);
    }
  });

  context.fillStyle = "#ffc857";
  context.fillRect(0, 174, WIDTH, 6);
  context.fillStyle = "rgba(255, 200, 87, 0.13)";
  context.fillRect(0, 180, WIDTH, 18);

  context.strokeStyle = "rgba(55, 215, 255, 0.17)";
  context.lineWidth = 12;
  context.beginPath();
  context.moveTo(38, 548);
  context.lineTo(38, 350);
  context.quadraticCurveTo(38, 325, 63, 325);
  context.lineTo(190, 325);
  context.stroke();
  context.beginPath();
  context.moveTo(WIDTH - 44, 392);
  context.lineTo(WIDTH - 44, 582);
  context.quadraticCurveTo(WIDTH - 44, 606, WIDTH - 68, 606);
  context.lineTo(WIDTH - 196, 606);
  context.stroke();

  context.fillStyle = "rgba(243, 231, 201, 0.35)";
  context.font = "900 10px Arial";
  context.textAlign = "left";
  context.fillText("封锁街区 · 目标保持原位", 24, 214);
  context.textAlign = "right";
  context.fillText("越重的目标，回收越慢", WIDTH - 24, 214);

  game.targets.forEach((target) => drawTarget(context, target));

  const end = cableEnd(game);
  context.strokeStyle =
    game.cable.mode === "aiming" ? "#f3e7c9" : "#d7e9f3";
  context.lineWidth = game.cable.mode === "aiming" ? 4 : 6;
  context.beginPath();
  context.moveTo(ANCHOR_X, ANCHOR_Y);
  context.lineTo(end.x, end.y);
  context.stroke();

  context.save();
  context.translate(end.x, end.y);
  context.rotate(-game.cable.angle);
  context.strokeStyle = "#f3e7c9";
  context.lineWidth = 5;
  context.beginPath();
  context.arc(-10, 0, 11, 0, Math.PI * 2);
  context.arc(10, 0, 11, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = "#87a5be";
  context.fillRect(-4, -3, 8, 6);
  context.restore();

  drawOfficer(context, (Math.sin(now / 180) + 1) / 2);

  context.fillStyle = "rgba(255,255,255,0.018)";
  for (let y = 0; y < HEIGHT; y += 4) {
    context.fillRect(0, y, WIDTH, 1);
  }
}

const initialHud: HudState = {
  phase: "ready",
  level: 1,
  score: 0,
  targetScore: 1000,
  timeLeft: 60,
  combo: 1,
  captured: 0,
};

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState>(createGame());
  const audioRef = useRef<AudioContext | null>(null);
  const hudKeyRef = useRef("");
  const [hud, setHud] = useState<HudState>(initialHud);
  const [sound, setSound] = useState(true);
  const [message, setMessage] = useState("等待抓捕任务开始");

  const playTone = useCallback(
    (frequency: number, duration = 0.1, type: OscillatorType = "sine") => {
      const game = gameRef.current;
      if (!game.sound || typeof window === "undefined") return;
      const AudioContextClass = window.AudioContext;
      const audio = audioRef.current ?? new AudioContextClass();
      audioRef.current = audio;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.07, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audio.currentTime + duration,
      );
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + duration);
    },
    [],
  );

  const publishHud = useCallback((game: GameState) => {
    const next = {
      phase: game.phase,
      level: game.level,
      score: game.score,
      targetScore: game.targetScore,
      timeLeft: Math.max(0, Math.ceil(game.timeLeft)),
      combo: game.combo,
      captured: game.captured,
    };
    const key = JSON.stringify(next);
    if (key !== hudKeyRef.current) {
      hudKeyRef.current = key;
      setHud(next);
    }
  }, []);

  const startMission = useCallback(() => {
    const game = gameRef.current;
    const nextLevel = game.phase === "won" ? game.level + 1 : game.level;
    game.level = nextLevel;
    game.score = 0;
    game.targetScore = 1000 + (nextLevel - 1) * 350;
    game.timeLeft = Math.max(42, 60 - (nextLevel - 1) * 2);
    game.combo = 1;
    game.captured = 0;
    game.phase = "playing";
    game.targets = makeTargets(nextLevel);
    game.cable = {
      angle: -0.72,
      direction: 1,
      length: RESTING_CABLE,
      mode: "aiming",
      targetId: null,
    };
    setMessage(`第 ${nextLevel} 区开始巡逻`);
    publishHud(game);
    playTone(520, 0.09, "triangle");
    window.setTimeout(() => playTone(740, 0.12, "triangle"), 90);
  }, [playTone, publishHud]);

  const fireCable = useCallback(() => {
    const game = gameRef.current;
    if (game.phase !== "playing" || game.cable.mode !== "aiming") return;
    game.cable.mode = "extending";
    setMessage("手铐钩出动");
    playTone(320, 0.08, "square");
  }, [playTone]);

  const toggleSound = useCallback(() => {
    const game = gameRef.current;
    game.sound = !game.sound;
    setSound(game.sound);
    if (game.sound) playTone(660, 0.1, "triangle");
  }, [playTone]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        fireCable();
      } else if (event.key.toLowerCase() === "m") {
        toggleSound();
      } else if (event.key.toLowerCase() === "r") {
        const game = gameRef.current;
        if (game.phase !== "ready") startMission();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fireCable, startMission, toggleSound]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const game = gameRef.current;
      const delta = Math.min(0.034, (now - previous) / 1000);
      previous = now;

      if (game.phase === "playing") {
        game.timeLeft -= delta;

        if (game.cable.mode === "aiming") {
          game.cable.angle += game.cable.direction * delta * 1.12;
          if (game.cable.angle > 1.14 || game.cable.angle < -1.14) {
            game.cable.angle = Math.max(-1.14, Math.min(1.14, game.cable.angle));
            game.cable.direction *= -1;
          }
        } else if (game.cable.mode === "extending") {
          game.cable.length += delta * 720;
          const end = cableEnd(game);
          const hit = game.targets.find((target) => {
            if (target.caught) return false;
            const dx = target.x - end.x;
            const dy = target.y - end.y;
            return Math.hypot(dx, dy) <= target.radius + 14;
          });

          if (hit) {
            hit.caught = true;
            game.cable.targetId = hit.id;
            game.cable.mode = "retracting";
            playTone(hit.kind === "civilian" ? 150 : 560, 0.11, "square");
          } else if (
            game.cable.length >= MAX_CABLE ||
            end.x < 0 ||
            end.x > WIDTH ||
            end.y > HEIGHT
          ) {
            game.cable.mode = "retracting";
          }
        } else {
          const caught = game.targets.find(
            (target) => target.id === game.cable.targetId,
          );
          const retractSpeed = caught ? caught.pullSpeed : 590;
          game.cable.length -= delta * retractSpeed;
          const end = cableEnd(game);
          if (caught) {
            caught.x = end.x;
            caught.y = end.y;
          }

          if (game.cable.length <= RESTING_CABLE) {
            game.cable.length = RESTING_CABLE;
            game.cable.mode = "aiming";

            if (caught) {
              if (
                caught.kind === "thief" ||
                caught.kind === "boss" ||
                caught.kind === "evidence"
              ) {
                const reward = caught.value;
                game.score += reward;
                game.combo = Math.min(5, game.combo + 1);
                if (caught.kind !== "evidence") game.captured += 1;
                setMessage(
                  caught.kind === "evidence"
                    ? `追回赃物 +${reward}`
                    : `${caught.label}归案 +${reward}`,
                );
                playTone(760, 0.08, "triangle");
                window.setTimeout(() => playTone(940, 0.1, "triangle"), 65);
              } else if (caught.kind === "civilian") {
                game.score = Math.max(0, game.score + caught.value);
                game.combo = 1;
                setMessage("误抓市民，扣 150 分");
                playTone(130, 0.18, "sawtooth");
              } else {
                game.timeLeft = Math.max(0, game.timeLeft + caught.value);
                game.combo = 1;
                setMessage("拖回沉重路障，损失 4 秒");
                playTone(110, 0.2, "square");
              }
              game.targets = game.targets.filter(
                (target) => target.id !== caught.id,
              );
              game.cable.targetId = null;
            } else {
              setMessage("没有锁定目标");
            }

            if (game.score >= game.targetScore) {
              game.phase = "won";
              setMessage(`任务完成：第 ${game.level} 区恢复安全`);
              playTone(660, 0.12, "triangle");
              window.setTimeout(() => playTone(880, 0.18, "triangle"), 110);
            }
          }
        }

        if (game.timeLeft <= 0 && game.phase === "playing") {
          game.timeLeft = 0;
          game.phase = "lost";
          setMessage("时间到，目标逃出巡逻区");
          playTone(140, 0.32, "sawtooth");
        }
      }

      publishHud(game);
      drawScene(context, game, now);
      animationFrame = requestAnimationFrame(tick);
    };

    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [playTone, publishHud]);

  const overlayTitle =
    hud.phase === "won"
      ? "巡区恢复安全"
      : hud.phase === "lost"
        ? "目标逃出封锁线"
        : "夜巡任务待命";
  const overlayBody =
    hud.phase === "won"
      ? `本区抓获 ${hud.captured} 名目标。下一关任务分更高，重型目标也会更难拖回。`
      : hud.phase === "lost"
        ? `本次获得 ${hud.score} 分，距离目标还差 ${Math.max(0, hud.targetScore - hud.score)} 分。`
        : "玩法和淘金者一样：手铐钩会自动左右摆动。看准角度发射，抓住小偷后自动拖回；目标越重，回收越慢。";

  return (
    <main className="game-shell">
      <section className="game-frame" aria-label="夜巡追捕游戏区域">
        <header className="topbar">
          <div className="brand">
            <div className="brand-lights" aria-hidden="true">
              <i />
              <i />
            </div>
            <div>
              <p>GOLD-MINER STYLE · HOOK PATROL</p>
              <h1>夜巡追捕</h1>
            </div>
          </div>

          <div className="mission-hud" aria-live="polite">
            <div className="hud-item score">
              <span>当前积分</span>
              <strong>{hud.score.toLocaleString("zh-CN")}</strong>
            </div>
            <div className="hud-item target">
              <span>任务目标</span>
              <strong>{hud.targetScore.toLocaleString("zh-CN")}</strong>
            </div>
            <div className="hud-item sector">
              <span>巡逻区</span>
              <strong>{String(hud.level).padStart(2, "0")}</strong>
            </div>
            <div className={`timer ${hud.timeLeft <= 10 ? "urgent" : ""}`}>
              <span>剩余时间</span>
              <strong>{String(hud.timeLeft).padStart(2, "0")}</strong>
              <small>秒</small>
            </div>
          </div>

          <button
            type="button"
            className="sound-button"
            onClick={toggleSound}
            aria-pressed={sound}
            aria-label={sound ? "关闭音效" : "开启音效"}
          >
            {sound ? "声" : "静"}
          </button>
        </header>

        <div className="canvas-wrap">
          <canvas
            ref={canvasRef}
            width={WIDTH}
            height={HEIGHT}
            tabIndex={0}
            role="button"
            aria-label="淘金者式夜巡街区。按空格键或点击放下手铐钩。"
            onClick={fireCable}
          />

          <div className="status-ribbon" role="status" aria-live="polite">
            <i aria-hidden="true" />
            {message}
          </div>

          {hud.combo > 1 && hud.phase === "playing" && (
            <div className="combo-badge" aria-label={`${hud.combo} 倍连击`}>
              <span>连续抓捕</span>
              <strong>×{hud.combo}</strong>
            </div>
          )}

          {hud.phase !== "playing" && (
            <div className="game-overlay">
              <div className="dossier-card">
                <div className="case-tab">
                  CASE {String(hud.level).padStart(2, "0")}
                </div>
                <span className="eyebrow">
                  {hud.phase === "won" ? "MISSION CLEARED" : "NIGHT BRIEFING"}
                </span>
                <h2>{overlayTitle}</h2>
                <p>{overlayBody}</p>
                <div className="brief-grid">
                  <div>
                    <span>抓捕</span>
                    <strong>{hud.captured}</strong>
                  </div>
                  <div>
                    <span>连续抓捕</span>
                    <strong>×{hud.combo}</strong>
                  </div>
                  <div>
                    <span>任务分</span>
                    <strong>{hud.targetScore}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="primary-button"
                  onClick={startMission}
                >
                  <span>{hud.phase === "won" ? "下一巡区" : "开始巡逻"}</span>
                  <b aria-hidden="true">→</b>
                </button>
                <div className="control-hint">
                  <kbd>SPACE</kbd> 放下手铐钩 · <kbd>M</kbd> 音效 ·{" "}
                  <kbd>R</kbd> 重试
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="bottombar">
          <div className="target-legend" aria-label="目标图例">
            <span>
              <i className="legend-mark thief" />小偷 · 轻
            </span>
            <span>
              <i className="legend-mark boss" />头目 · 很重
            </span>
            <span>
              <i className="legend-mark evidence" />赃物 · 回收快
            </span>
            <span>
              <i className="legend-mark civilian" />市民 −150
            </span>
            <span>
              <i className="legend-mark cone" />路障 · 又重又耗时
            </span>
          </div>
          <button
            type="button"
            className="fire-button"
            onClick={fireCable}
            disabled={hud.phase !== "playing"}
          >
            <span>空格键</span>
            放下手铐钩
          </button>
        </footer>
      </section>

      <p className="sr-only" id="game-state">
        {JSON.stringify({
          phase: hud.phase,
          level: hud.level,
          score: hud.score,
          targetScore: hud.targetScore,
          timeLeft: hud.timeLeft,
          combo: hud.combo,
          captured: hud.captured,
        })}
      </p>
    </main>
  );
}
