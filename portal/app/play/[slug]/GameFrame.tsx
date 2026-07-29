"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type GameFrameProps = {
  slug: string;
  title: string;
  english: string;
  number: string;
};

export default function GameFrame({
  slug,
  title,
  english,
  number,
}: GameFrameProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [frameKey, setFrameKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = () => {
    setLoading(true);
    setFrameKey((current) => current + 1);
  };

  const enterFullscreen = async () => {
    await stageRef.current?.requestFullscreen?.();
  };

  return (
    <main className="game-shell">
      <header className="game-shell__toolbar">
        <Link className="game-shell__back" href="/">
          <span aria-hidden="true">←</span>
          返回大厅
        </Link>

        <div className="game-shell__identity">
          <span>{number} / NOW PLAYING</span>
          <div>
            <strong>{title}</strong>
            <small>{english}</small>
          </div>
        </div>

        <div className="game-shell__actions">
          <button type="button" onClick={reload}>
            重新载入
          </button>
          <button type="button" onClick={enterFullscreen}>
            全屏游玩
          </button>
        </div>
      </header>

      <div className="game-shell__stage" ref={stageRef}>
        {loading ? (
          <div className="game-shell__loading" aria-live="polite">
            <span />
            正在装载 {title}
          </div>
        ) : null}
        <iframe
          key={frameKey}
          src={`/embedded/${slug}/index.html`}
          title={`${title}游戏`}
          allow="autoplay; fullscreen; gamepad"
          onLoad={() => setLoading(false)}
        />
      </div>
    </main>
  );
}
