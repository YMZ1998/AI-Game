"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { GameCatalogItem } from "./game-catalog";

const kinds = ["全部", "街机", "棋牌", "动作", "射击", "益智", "策略", "竞速", "联机", "社交"] as const;
const warmedGames = new Set<string>();

function warmGame(slug: string) {
  if (warmedGames.has(slug)) return;
  warmedGames.add(slug);

  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = `/embedded/${slug}/index.html`;
  link.as = "document";
  document.head.append(link);
}

type GameGalleryProps = {
  games: GameCatalogItem[];
};

export function GameGallery({ games }: GameGalleryProps) {
  const [activeKind, setActiveKind] = useState<(typeof kinds)[number]>("全部");
  const [query, setQuery] = useState("");

  const visibleGames = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("zh-CN");

    return games.filter((game) => {
      const matchesKind = activeKind === "全部" || game.kind === activeKind;
      const searchText = [
        game.title,
        game.english,
        game.description,
        game.kind,
        ...game.tags,
      ]
        .join(" ")
        .toLocaleLowerCase("zh-CN");

      return matchesKind && (!keyword || searchText.includes(keyword));
    });
  }, [activeKind, games, query]);

  return (
    <>
      <div className="gallery-toolbar" aria-label="游戏筛选工具">
        <label className="game-search">
          <span className="sr-only">搜索游戏</span>
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索游戏、玩法或标签"
          />
        </label>

        <div className="kind-filters" aria-label="按类型筛选游戏">
          {kinds.map((kind) => (
            <button
              type="button"
              className={activeKind === kind ? "is-active" : ""}
              aria-pressed={activeKind === kind}
              onClick={() => setActiveKind(kind)}
              key={kind}
            >
              {kind}
            </button>
          ))}
        </div>

        <span className="result-count" aria-live="polite">
          {visibleGames.length.toString().padStart(2, "0")} / {games.length}
        </span>
      </div>

      {visibleGames.length > 0 ? (
        <div className="game-grid">
          {visibleGames.map((game, index) => (
            <a
              className={`game-card ${game.className}`}
              href={`/play/${game.slug}/index.html`}
              key={game.title}
              aria-label={`开始玩${game.title}`}
              onPointerEnter={() => warmGame(game.slug)}
              onFocus={() => warmGame(game.slug)}
            >
              <div className="card-cover">
                <Image
                  src={game.image}
                  alt={`${game.title}游戏封面`}
                  fill
                  unoptimized
                  sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                  priority={index < 6}
                />
                <div className="card-cover-shade" />
                <span className="card-number">{game.number}</span>
                <span className="card-kind">{game.kind}</span>
              </div>

              <div className="card-copy">
                <span className="game-english">{game.english}</span>
                <h3>{game.title}</h3>
                <p>{game.description}</p>
              </div>

              <div className="card-footer">
                <div className="card-tags">
                  {game.tags.slice(0, 2).map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
                <span className="card-play">
                  开玩 <i aria-hidden="true">↗</i>
                </span>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="empty-games">
          <span>NO MATCH</span>
          <h3>没有找到这款游戏</h3>
          <p>换个关键词，或者看看其他类型。</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActiveKind("全部");
            }}
          >
            查看全部游戏
          </button>
        </div>
      )}
    </>
  );
}
