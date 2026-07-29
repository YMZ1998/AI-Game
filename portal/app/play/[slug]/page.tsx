import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findGame, games } from "../../game-catalog";
import GameFrame from "./GameFrame";

type GamePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return games.map((game) => ({ slug: game.slug }));
}

export async function generateMetadata({
  params,
}: GamePageProps): Promise<Metadata> {
  const game = findGame((await params).slug);

  if (!game) {
    return { title: "游戏未找到｜PLAYROOM" };
  }

  return {
    title: `${game.title}｜PLAYROOM`,
    description: `在 PLAYROOM 游戏大厅直接游玩${game.title}。`,
  };
}

export default async function GamePage({ params }: GamePageProps) {
  const game = findGame((await params).slug);

  if (!game) {
    notFound();
  }

  return (
    <GameFrame
      slug={game.slug}
      title={game.title}
      english={game.english}
      number={game.number}
    />
  );
}
