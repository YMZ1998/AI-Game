"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LanGame from "./LanGame";

type Suit = "♠" | "♥" | "♣" | "♦" | "joker";
type Phase = "dealing" | "bidding" | "playing" | "finished";
type ComboKind =
  | "single"
  | "pair"
  | "triple"
  | "tripleSingle"
  | "triplePair"
  | "straight"
  | "pairStraight"
  | "airplane"
  | "airplaneSingle"
  | "airplanePair"
  | "fourTwoSingles"
  | "fourTwoPairs"
  | "bomb"
  | "rocket";

type Card = {
  id: string;
  rank: number;
  label: string;
  suit: Suit;
  color: "red" | "black" | "joker-red" | "joker-black";
};

type Combo = {
  kind: ComboKind;
  mainRank: number;
  length: number;
  label: string;
};

type LastPlay = {
  player: number;
  cards: Card[];
  combo: Combo;
};

type BidRecord = {
  player: number;
  score: number;
};

type PlayerRecord = {
  wins: number;
  games: number;
  score: number;
  streak: number;
  bestStreak: number;
};

type GameState = {
  phase: Phase;
  hands: Card[][];
  bottom: Card[];
  landlord: number | null;
  currentTurn: number;
  lastPlay: LastPlay | null;
  passes: number;
  winner: number | null;
  actionText: string;
  multiplier: number;
  bidStarter: number;
  highestBid: number;
  highestBidder: number | null;
  bidTurns: number;
  bidHistory: BidRecord[];
  plays: number[];
  playedCards: Card[];
  spring: boolean;
  roundDelta: number;
};

const PLAYER_NAMES = ["你", "阿桃", "老陈"];
const PLAYER_TITLES = ["今日牌手", "稳健派", "记牌高手"];
const COUNTER_RANKS = [17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3];
const RANK_LABELS: Record<number, string> = {
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "8",
  9: "9",
  10: "10",
  11: "J",
  12: "Q",
  13: "K",
  14: "A",
  15: "2",
  16: "小王",
  17: "大王",
};

const comboLabels: Record<ComboKind, string> = {
  single: "单张",
  pair: "对子",
  triple: "三张",
  tripleSingle: "三带一",
  triplePair: "三带二",
  straight: "顺子",
  pairStraight: "连对",
  airplane: "飞机",
  airplaneSingle: "飞机带翅膀",
  airplanePair: "飞机带双翼",
  fourTwoSingles: "四带二",
  fourTwoPairs: "四带两对",
  bomb: "炸弹",
  rocket: "王炸",
};

const emptyGame: GameState = {
  phase: "dealing",
  hands: [[], [], []],
  bottom: [],
  landlord: null,
  currentTurn: 0,
  lastPlay: null,
  passes: 0,
  winner: null,
  actionText: "正在洗牌…",
  multiplier: 1,
  bidStarter: 0,
  highestBid: 0,
  highestBidder: null,
  bidTurns: 0,
  bidHistory: [],
  plays: [0, 0, 0],
  playedCards: [],
  spring: false,
  roundDelta: 0,
};

function createDeck(): Card[] {
  const cards: Card[] = [];
  const suits: Suit[] = ["♠", "♥", "♣", "♦"];
  let serial = 0;

  for (let rank = 3; rank <= 15; rank += 1) {
    suits.forEach((suit) => {
      cards.push({
        id: `card-${serial++}`,
        rank,
        label: RANK_LABELS[rank],
        suit,
        color: suit === "♥" || suit === "♦" ? "red" : "black",
      });
    });
  }

  cards.push({
    id: `card-${serial++}`,
    rank: 16,
    label: "JOKER",
    suit: "joker",
    color: "joker-black",
  });
  cards.push({
    id: `card-${serial}`,
    rank: 17,
    label: "JOKER",
    suit: "joker",
    color: "joker-red",
  });

  return cards;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function sortCards(cards: Card[]) {
  const suitOrder: Record<Suit, number> = {
    "♠": 4,
    "♥": 3,
    "♣": 2,
    "♦": 1,
    joker: 5,
  };
  return [...cards].sort(
    (a, b) => b.rank - a.rank || suitOrder[b.suit] - suitOrder[a.suit],
  );
}

function dealGame(redeal = false): GameState {
  const deck = shuffle(createDeck());
  const bidStarter = Math.floor(Math.random() * 3);
  return {
    ...emptyGame,
    phase: "bidding",
    hands: [
      sortCards(deck.slice(0, 17)),
      sortCards(deck.slice(17, 34)),
      sortCards(deck.slice(34, 51)),
    ],
    bottom: deck.slice(51),
    bidStarter,
    currentTurn: bidStarter,
    actionText: redeal
      ? `无人叫分，已重新发牌 · ${PLAYER_NAMES[bidStarter]}先叫`
      : `${PLAYER_NAMES[bidStarter]}先叫地主`,
  };
}

function rankGroups(cards: Card[]) {
  const groups = new Map<number, Card[]>();
  cards.forEach((card) => {
    const group = groups.get(card.rank) ?? [];
    group.push(card);
    groups.set(card.rank, group);
  });
  return groups;
}

function consecutive(ranks: number[]) {
  return ranks.every(
    (rank, index) => index === 0 || rank === ranks[index - 1] + 1,
  );
}

function findTripleCores(
  groups: Map<number, Card[]>,
  needed: number,
): number[][] {
  const tripleRanks = [...groups.entries()]
    .filter(([rank, cards]) => rank < 15 && cards.length >= 3)
    .map(([rank]) => rank)
    .sort((a, b) => a - b);

  const cores: number[][] = [];
  for (let start = 0; start <= tripleRanks.length - needed; start += 1) {
    const window = tripleRanks.slice(start, start + needed);
    if (consecutive(window)) cores.push(window);
  }
  return cores;
}

function analyzeCombo(cards: Card[]): Combo | null {
  if (!cards.length) return null;
  const sorted = sortCards(cards);
  const groups = rankGroups(sorted);
  const entries = [...groups.entries()].sort(([a], [b]) => a - b);
  const ranks = entries.map(([rank]) => rank);
  const counts = entries.map(([, group]) => group.length);
  const count = cards.length;

  const make = (
    kind: ComboKind,
    mainRank: number,
    length = count,
  ): Combo => ({
    kind,
    mainRank,
    length,
    label: comboLabels[kind],
  });

  if (count === 2 && ranks[0] === 16 && ranks[1] === 17) {
    return make("rocket", 17, 1);
  }
  if (count === 4 && entries.length === 1) {
    return make("bomb", ranks[0], 1);
  }
  if (count === 1) return make("single", ranks[0], 1);
  if (count === 2 && entries.length === 1) return make("pair", ranks[0], 1);
  if (count === 3 && entries.length === 1) return make("triple", ranks[0], 1);

  if (count === 4 && counts.includes(3)) {
    return make("tripleSingle", entries.find(([, group]) => group.length === 3)![0], 1);
  }
  if (count === 5 && counts.includes(3) && counts.includes(2)) {
    return make("triplePair", entries.find(([, group]) => group.length === 3)![0], 1);
  }

  if (
    count >= 5 &&
    entries.length === count &&
    ranks[ranks.length - 1] < 15 &&
    consecutive(ranks)
  ) {
    return make("straight", ranks[ranks.length - 1], count);
  }

  if (
    count >= 6 &&
    count % 2 === 0 &&
    counts.every((value) => value === 2) &&
    ranks[ranks.length - 1] < 15 &&
    consecutive(ranks)
  ) {
    return make("pairStraight", ranks[ranks.length - 1], count / 2);
  }

  if (
    count >= 6 &&
    count % 3 === 0 &&
    counts.every((value) => value === 3) &&
    ranks[ranks.length - 1] < 15 &&
    consecutive(ranks)
  ) {
    return make("airplane", ranks[ranks.length - 1], count / 3);
  }

  if (count === 6 && counts.includes(4)) {
    return make(
      "fourTwoSingles",
      entries.find(([, group]) => group.length === 4)![0],
      1,
    );
  }
  if (
    count === 8 &&
    counts.includes(4) &&
    entries.filter(([, group]) => group.length === 2).length === 2
  ) {
    return make(
      "fourTwoPairs",
      entries.find(([, group]) => group.length === 4)![0],
      1,
    );
  }

  if (count >= 8 && count % 4 === 0) {
    const coreLength = count / 4;
    const cores = findTripleCores(groups, coreLength);
    for (const core of cores) {
      const remaining = new Map(groups);
      core.forEach((rank) => {
        remaining.set(rank, remaining.get(rank)!.slice(3));
      });
      if (core.some((rank) => remaining.get(rank)!.length > 0)) continue;
      const wingCount = [...remaining.values()].reduce(
        (sum, group) => sum + group.length,
        0,
      );
      if (wingCount === coreLength) {
        return make("airplaneSingle", core[core.length - 1], coreLength);
      }
    }
  }

  if (count >= 10 && count % 5 === 0) {
    const coreLength = count / 5;
    const cores = findTripleCores(groups, coreLength);
    for (const core of cores) {
      const remaining = new Map(groups);
      core.forEach((rank) => {
        remaining.set(rank, remaining.get(rank)!.slice(3));
      });
      if (core.some((rank) => remaining.get(rank)!.length > 0)) continue;
      const wings = [...remaining.values()].filter((group) => group.length);
      if (
        wings.length === coreLength &&
        wings.every((group) => group.length === 2)
      ) {
        return make("airplanePair", core[core.length - 1], coreLength);
      }
    }
  }

  return null;
}

function beats(challenger: Combo, current: Combo) {
  if (challenger.kind === "rocket") return current.kind !== "rocket";
  if (current.kind === "rocket") return false;
  if (challenger.kind === "bomb" && current.kind !== "bomb") return true;
  if (current.kind === "bomb" && challenger.kind !== "bomb") return false;
  return (
    challenger.kind === current.kind &&
    challenger.length === current.length &&
    challenger.mainRank > current.mainRank
  );
}

function cardsAtRank(groups: Map<number, Card[]>, rank: number, count: number) {
  return (groups.get(rank) ?? []).slice(0, count);
}

function lowestRanks(
  groups: Map<number, Card[]>,
  count: number,
  excluded: Set<number>,
  pairsOnly = false,
) {
  const picked: Card[] = [];
  const entries = [...groups.entries()].sort(([a], [b]) => a - b);
  for (const [rank, cards] of entries) {
    if (excluded.has(rank)) continue;
    if (pairsOnly) {
      if (cards.length >= 2) picked.push(...cards.slice(0, 2));
      if (picked.length >= count * 2) return picked.slice(0, count * 2);
    } else {
      picked.push(...cards);
      if (picked.length >= count) return picked.slice(0, count);
    }
  }
  return [];
}

function findRun(
  groups: Map<number, Card[]>,
  length: number,
  copies: number,
  above: number,
) {
  for (let start = 3; start + length - 1 <= 14; start += 1) {
    const end = start + length - 1;
    if (end <= above) continue;
    const ranks = Array.from({ length }, (_, index) => start + index);
    if (ranks.every((rank) => (groups.get(rank)?.length ?? 0) >= copies)) {
      return ranks.flatMap((rank) => cardsAtRank(groups, rank, copies));
    }
  }
  return [];
}

function bombOrRocket(groups: Map<number, Card[]>, above = 0): Card[] {
  const bombRank = [...groups.entries()]
    .filter(([rank, cards]) => cards.length === 4 && rank > above)
    .map(([rank]) => rank)
    .sort((a, b) => a - b)[0];
  if (bombRank) return cardsAtRank(groups, bombRank, 4);
  if (groups.has(16) && groups.has(17)) {
    return [groups.get(16)![0], groups.get(17)![0]];
  }
  return [];
}

function findBeatingPlay(hand: Card[], current: Combo): Card[] {
  if (current.kind === "rocket") return [];
  const groups = rankGroups(hand);
  const eligibleRanks = (copies: number) =>
    [...groups.entries()]
      .filter(([rank, cards]) => rank > current.mainRank && cards.length >= copies)
      .sort(
        ([rankA, cardsA], [rankB, cardsB]) =>
          Number(cardsA.length !== copies) - Number(cardsB.length !== copies) ||
          rankA - rankB,
      )
      .map(([rank]) => rank);

  let play: Card[] = [];
  if (current.kind === "single") {
    const rank = eligibleRanks(1)[0];
    if (rank) play = cardsAtRank(groups, rank, 1);
  } else if (current.kind === "pair") {
    const rank = eligibleRanks(2)[0];
    if (rank) play = cardsAtRank(groups, rank, 2);
  } else if (current.kind === "triple") {
    const rank = eligibleRanks(3)[0];
    if (rank) play = cardsAtRank(groups, rank, 3);
  } else if (
    current.kind === "straight" ||
    current.kind === "pairStraight" ||
    current.kind === "airplane"
  ) {
    const copies =
      current.kind === "straight" ? 1 : current.kind === "pairStraight" ? 2 : 3;
    play = findRun(groups, current.length, copies, current.mainRank);
  } else if (
    current.kind === "tripleSingle" ||
    current.kind === "triplePair"
  ) {
    for (const rank of eligibleRanks(3)) {
      const wings = lowestRanks(
        groups,
        1,
        new Set([rank]),
        current.kind === "triplePair",
      );
      const needed = current.kind === "triplePair" ? 2 : 1;
      if (wings.length === needed) {
        play = [...cardsAtRank(groups, rank, 3), ...wings];
        break;
      }
    }
  } else if (
    current.kind === "airplaneSingle" ||
    current.kind === "airplanePair"
  ) {
    const core = findRun(groups, current.length, 3, current.mainRank);
    if (core.length) {
      const coreRanks = new Set(core.map((card) => card.rank));
      const wings = lowestRanks(
        groups,
        current.length,
        coreRanks,
        current.kind === "airplanePair",
      );
      const needed =
        current.kind === "airplanePair"
          ? current.length * 2
          : current.length;
      if (wings.length === needed) play = [...core, ...wings];
    }
  } else if (
    current.kind === "fourTwoSingles" ||
    current.kind === "fourTwoPairs"
  ) {
    for (const rank of eligibleRanks(4)) {
      const wings = lowestRanks(
        groups,
        2,
        new Set([rank]),
        current.kind === "fourTwoPairs",
      );
      const needed = current.kind === "fourTwoPairs" ? 4 : 2;
      if (wings.length === needed) {
        play = [...cardsAtRank(groups, rank, 4), ...wings];
        break;
      }
    }
  } else if (current.kind === "bomb") {
    return bombOrRocket(groups, current.mainRank);
  }

  return play.length ? play : bombOrRocket(groups);
}

function findLeadPlay(hand: Card[]): Card[] {
  const groups = rankGroups(hand);
  if (hand.length <= 5) {
    const wholeCombo = analyzeCombo(hand);
    if (wholeCombo) return hand;
  }

  for (let length = 12; length >= 5; length -= 1) {
    const run = findRun(groups, length, 1, 0);
    if (run.length) return run;
  }
  for (let length = 6; length >= 3; length -= 1) {
    const run = findRun(groups, length, 2, 0);
    if (run.length) return run;
  }

  const triples = [...groups.entries()]
    .filter(([, cards]) => cards.length >= 3)
    .sort(([a], [b]) => a - b);
  if (triples.length) {
    const [rank] = triples[0];
    const wing = lowestRanks(groups, 1, new Set([rank]));
    if (wing.length) return [...cardsAtRank(groups, rank, 3), wing[0]];
    return cardsAtRank(groups, rank, 3);
  }

  const pairs = [...groups.entries()]
    .filter(([, cards]) => cards.length >= 2)
    .sort(([a], [b]) => a - b);
  if (pairs.length) return cardsAtRank(groups, pairs[0][0], 2);

  const singles = [...groups.entries()]
    .filter(([rank, cards]) => cards.length && rank < 16)
    .sort(([a], [b]) => a - b);
  if (singles.length) return cardsAtRank(groups, singles[0][0], 1);
  return [sortCards(hand)[hand.length - 1]];
}

function removeCards(hand: Card[], played: Card[]) {
  const ids = new Set(played.map((card) => card.id));
  return hand.filter((card) => !ids.has(card.id));
}

function estimateHandStrength(hand: Card[]) {
  const groups = rankGroups(hand);
  let strength = 0;
  hand.forEach((card) => {
    if (card.rank >= 16) strength += card.rank === 17 ? 4.5 : 3.5;
    else if (card.rank === 15) strength += 2;
    else if (card.rank === 14) strength += 1;
  });
  groups.forEach((cards) => {
    if (cards.length === 4) strength += 5;
    else if (cards.length === 3) strength += 1.5;
    else if (cards.length === 2 && cards[0].rank >= 14) strength += 0.8;
  });
  if (groups.has(16) && groups.has(17)) strength += 3;
  return strength;
}

function chooseAiBid(hand: Card[], highestBid: number) {
  const strength = estimateHandStrength(hand) + Math.random() * 2.2;
  const target = strength >= 13 ? 3 : strength >= 9 ? 2 : strength >= 6 ? 1 : 0;
  return target > highestBid ? target : 0;
}

function finalizeLandlord(
  state: GameState,
  landlord: number,
  bidScore: number,
): GameState {
  const hands = state.hands.map((hand) => [...hand]);
  hands[landlord] = sortCards([...hands[landlord], ...state.bottom]);
  return {
    ...state,
    phase: "playing",
    landlord,
    hands,
    currentTurn: landlord,
    multiplier: Math.max(1, bidScore),
    actionText:
      landlord === 0
        ? `你以 ${bidScore} 分成为地主，先手出牌`
        : `${PLAYER_NAMES[landlord]}以 ${bidScore} 分成为地主`,
  };
}

function applyBid(state: GameState, player: number, score: number): GameState {
  if (
    state.phase !== "bidding" ||
    state.currentTurn !== player ||
    score < 0 ||
    score > 3 ||
    (score > 0 && score <= state.highestBid)
  ) {
    return state;
  }

  const bidHistory = [...state.bidHistory, { player, score }];
  const bidTurns = state.bidTurns + 1;
  const highestBid = score > state.highestBid ? score : state.highestBid;
  const highestBidder = score > state.highestBid ? player : state.highestBidder;
  const nextState = {
    ...state,
    bidHistory,
    bidTurns,
    highestBid,
    highestBidder,
    actionText:
      score === 0
        ? `${PLAYER_NAMES[player]}不叫`
        : `${PLAYER_NAMES[player]}叫 ${score} 分`,
  };

  if (score === 3) return finalizeLandlord(nextState, player, 3);
  if (bidTurns >= 3) {
    return highestBidder === null
      ? dealGame(true)
      : finalizeLandlord(nextState, highestBidder, highestBid);
  }

  const currentTurn = (player + 1) % 3;
  return {
    ...nextState,
    currentTurn,
    actionText: `${nextState.actionText} · 轮到${PLAYER_NAMES[currentTurn]}`,
  };
}

function sameTeam(state: GameState, first: number, second: number) {
  if (state.landlord === null) return false;
  return (
    first === second ||
    (first !== state.landlord && second !== state.landlord)
  );
}

function applyPlay(state: GameState, player: number, cards: Card[]): GameState {
  const combo = analyzeCombo(cards);
  if (!combo) return state;
  const hands = state.hands.map((hand) => [...hand]);
  hands[player] = removeCards(hands[player], cards);
  const won = hands[player].length === 0;
  const isPowerPlay = combo.kind === "bomb" || combo.kind === "rocket";
  const plays = [...state.plays];
  plays[player] += 1;
  const spring =
    won &&
    state.landlord !== null &&
    (player === state.landlord
      ? plays.every((count, index) => index === state.landlord || count === 0)
      : plays[state.landlord] === 1);
  const multiplier =
    state.multiplier * (isPowerPlay ? 2 : 1) * (spring ? 2 : 1);
  const playerWon =
    won &&
    state.landlord !== null &&
    sameTeam(state, 0, player);
  const playerFactor = state.landlord === 0 ? 2 : 1;
  const roundDelta = won
    ? 100 * multiplier * playerFactor * (playerWon ? 1 : -1)
    : 0;
  return {
    ...state,
    hands,
    plays,
    playedCards: [...state.playedCards, ...cards],
    lastPlay: { player, cards: sortCards(cards), combo },
    passes: 0,
    currentTurn: (player + 1) % 3,
    winner: won ? player : null,
    phase: won ? "finished" : "playing",
    multiplier,
    spring,
    roundDelta,
    actionText: won
      ? `${PLAYER_NAMES[player]}打完了所有手牌${spring ? " · 春天！" : ""}`
      : `${PLAYER_NAMES[player]}出了${combo.label}`,
  };
}

function applyPass(state: GameState, player: number): GameState {
  const passes = state.passes + 1;
  const trickReset = passes >= 2;
  return {
    ...state,
    currentTurn: (player + 1) % 3,
    passes: trickReset ? 0 : passes,
    lastPlay: trickReset ? null : state.lastPlay,
    actionText: trickReset
      ? "新一轮，重新领牌"
      : `${PLAYER_NAMES[player]}选择不出`,
  };
}

function CardFace({
  card,
  selected = false,
  small = false,
  onClick,
}: {
  card: Card;
  selected?: boolean;
  small?: boolean;
  onClick?: () => void;
}) {
  const isJoker = card.suit === "joker";
  return (
    <button
      className={`poker-card ${card.color} ${selected ? "selected" : ""} ${small ? "small" : ""}`}
      type="button"
      onClick={onClick}
      aria-pressed={onClick ? selected : undefined}
      aria-label={
        isJoker
          ? card.rank === 17
            ? "大王"
            : "小王"
          : `${card.suit}${card.label}`
      }
      disabled={!onClick}
    >
      {isJoker ? (
        <>
          <span className="joker-star">{card.rank === 17 ? "★" : "☆"}</span>
          <span className="joker-word">JOKER</span>
          <span className="joker-mark">王</span>
        </>
      ) : (
        <>
          <span className="card-rank">{card.label}</span>
          <span className="card-suit">{card.suit}</span>
          <span className="card-center">{card.suit}</span>
        </>
      )}
    </button>
  );
}

function CardBack({ index = 0 }: { index?: number }) {
  return (
    <div
      className="card-back"
      style={{ transform: `translate(${index * 3}px, ${index * -1}px)` }}
      aria-hidden="true"
    >
      <span>鬥</span>
    </div>
  );
}

function PlayerSeat({
  index,
  game,
}: {
  index: 1 | 2;
  game: GameState;
}) {
  const isTurn =
    (game.phase === "playing" || game.phase === "bidding") &&
    game.currentTurn === index;
  const isLandlord = game.landlord === index;
  const dangerCount =
    game.phase === "playing" && game.hands[index].length <= 2
      ? game.hands[index].length
      : null;
  return (
    <aside className={`player-seat player-${index} ${isTurn ? "active" : ""}`}>
      <div className="player-portrait">
        <span className="portrait-face" aria-hidden="true">
          <i className="portrait-hair" />
          <i className="portrait-eyes" />
          <b>{index === 1 ? "桃" : "陈"}</b>
        </span>
        {isLandlord && <i className="landlord-pin">地主</i>}
      </div>
      <div className="player-details">
        <strong>{PLAYER_NAMES[index]}</strong>
        <span>{PLAYER_TITLES[index]}</span>
        <b>余 {game.hands[index].length} 张</b>
      </div>
      {dangerCount !== null && (
        <strong className="danger-callout">
          {dangerCount === 1 ? "报单" : "报双"}
        </strong>
      )}
      <div className="opponent-cards" aria-label={`${PLAYER_NAMES[index]}的手牌`}>
        {[0, 1, 2, 3, 4].map((item) => (
          <CardBack key={item} index={item} />
        ))}
      </div>
      {isTurn && (
        <div className="turn-beacon">
          {game.phase === "bidding" ? "叫分中" : "思考中"}
        </div>
      )}
    </aside>
  );
}

function SoloGame({ onLan }: { onLan: () => void }) {
  const [game, setGame] = useState<GameState>(emptyGame);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [record, setRecord] = useState<PlayerRecord>({
    wins: 0,
    games: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
  });
  const audioRef = useRef<AudioContext | null>(null);

  const playTone = useCallback(
    (frequency: number, duration = 0.06) => {
      if (!soundOn) return;
      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioContextClass) return;
        const audio = audioRef.current ?? new AudioContextClass();
        audioRef.current = audio;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.045, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audio.currentTime + duration,
        );
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + duration);
      } catch {
        // Sound is optional and never blocks a round.
      }
    },
    [soundOn],
  );

  const beginRound = useCallback(() => {
    setSelectedIds([]);
    setToast("");
    setGame(dealGame());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem("doudizhu-record");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Partial<PlayerRecord>;
          setRecord({
            wins: parsed.wins ?? 0,
            games: parsed.games ?? 0,
            score: parsed.score ?? 0,
            streak: parsed.streak ?? 0,
            bestStreak: parsed.bestStreak ?? 0,
          });
        } catch {
          // Ignore an invalid old local record.
        }
      }
      beginRound();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [beginRound]);

  useEffect(() => {
    if (game.phase !== "finished" || game.winner === null) return;
    const timer = window.setTimeout(() => {
      setRecord((current) => {
        const landlordWon = game.winner === game.landlord;
        const playerWon =
          (game.landlord === 0 && landlordWon) ||
          (game.landlord !== 0 && !landlordWon);
        const streak = playerWon ? current.streak + 1 : 0;
        const next = {
          games: current.games + 1,
          wins: current.wins + (playerWon ? 1 : 0),
          score: current.score + game.roundDelta,
          streak,
          bestStreak: Math.max(current.bestStreak, streak),
        };
        localStorage.setItem("doudizhu-record", JSON.stringify(next));
        return next;
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [game.phase, game.winner, game.landlord, game.roundDelta]);

  useEffect(() => {
    if (game.phase !== "bidding" || game.currentTurn === 0) return;

    const timer = window.setTimeout(() => {
      setGame((current) => {
        if (current.phase !== "bidding" || current.currentTurn === 0) {
          return current;
        }
        const player = current.currentTurn;
        return applyBid(
          current,
          player,
          chooseAiBid(current.hands[player], current.highestBid),
        );
      });
    }, 650 + Math.random() * 450);

    return () => window.clearTimeout(timer);
  }, [game.currentTurn, game.phase]);

  useEffect(() => {
    if (
      game.phase !== "playing" ||
      game.currentTurn === 0 ||
      game.winner !== null
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      setGame((current) => {
        if (
          current.phase !== "playing" ||
          current.currentTurn === 0 ||
          current.winner !== null
        ) {
          return current;
        }
        const player = current.currentTurn;
        const mustBeat =
          current.lastPlay && current.lastPlay.player !== player
            ? current.lastPlay.combo
            : null;
        const teammateLeading =
          !!current.lastPlay &&
          current.lastPlay.player !== player &&
          sameTeam(current, player, current.lastPlay.player);
        if (teammateLeading) return applyPass(current, player);
        const choice = mustBeat
          ? findBeatingPlay(current.hands[player], mustBeat)
          : findLeadPlay(current.hands[player]);

        if (!choice.length && mustBeat) return applyPass(current, player);
        const choiceCombo = analyzeCombo(choice);
        const opponentDanger = current.hands.some(
          (hand, index) =>
            !sameTeam(current, player, index) && hand.length <= 2,
        );
        if (
          mustBeat &&
          (choiceCombo?.kind === "bomb" || choiceCombo?.kind === "rocket") &&
          choice.length < current.hands[player].length &&
          !opponentDanger
        ) {
          return applyPass(current, player);
        }
        playTone(analyzeCombo(choice)?.kind === "bomb" ? 120 : 250, 0.08);
        return applyPlay(current, player, choice);
      });
    }, 780 + Math.random() * 520);

    return () => window.clearTimeout(timer);
  }, [game.currentTurn, game.phase, game.winner, playTone]);

  const selectedCards = useMemo(() => {
    const ids = new Set(selectedIds);
    return game.hands[0].filter((card) => ids.has(card.id));
  }, [game.hands, selectedIds]);

  const currentCombo = useMemo(
    () => analyzeCombo(selectedCards),
    [selectedCards],
  );

  const remainingRankCounts = useMemo(() => {
    const counts = new Map<number, number>(
      COUNTER_RANKS.map((rank) => [rank, rank >= 16 ? 1 : 4]),
    );
    [...game.hands[0], ...game.playedCards].forEach((card) => {
      counts.set(card.rank, Math.max(0, (counts.get(card.rank) ?? 0) - 1));
    });
    return COUNTER_RANKS.map((rank) => ({
      rank,
      label: RANK_LABELS[rank],
      count: counts.get(rank) ?? 0,
    }));
  }, [game.hands, game.playedCards]);

  const selectedCanPlay = useMemo(() => {
    if (!currentCombo) return false;
    if (!game.lastPlay || game.lastPlay.player === 0) return true;
    return beats(currentCombo, game.lastPlay.combo);
  }, [currentCombo, game.lastPlay]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 1600);
  }, []);

  const placeBid = useCallback(
    (score: number) => {
      setGame((current) => applyBid(current, 0, score));
      playTone(score > 0 ? 480 + score * 70 : 240, 0.1);
    },
    [playTone],
  );

  const toggleCard = useCallback(
    (card: Card) => {
      if (game.phase !== "playing" || game.currentTurn !== 0) return;
      setSelectedIds((current) =>
        current.includes(card.id)
          ? current.filter((id) => id !== card.id)
          : [...current, card.id],
      );
      playTone(430, 0.025);
    },
    [game.currentTurn, game.phase, playTone],
  );

  const playSelected = useCallback(() => {
    if (game.phase !== "playing" || game.currentTurn !== 0) return;
    const combo = analyzeCombo(selectedCards);
    if (!combo) {
      showToast(selectedCards.length ? "这些牌还不能组成有效牌型" : "请先选择要出的牌");
      return;
    }
    if (
      game.lastPlay &&
      game.lastPlay.player !== 0 &&
      !beats(combo, game.lastPlay.combo)
    ) {
      showToast(`需要压过对方的${game.lastPlay.combo.label}`);
      return;
    }
    setGame((current) => applyPlay(current, 0, selectedCards));
    setSelectedIds([]);
    playTone(combo.kind === "rocket" ? 90 : combo.kind === "bomb" ? 130 : 310, 0.1);
  }, [game, playTone, selectedCards, showToast]);

  const passTurn = useCallback(() => {
    if (
      game.phase !== "playing" ||
      game.currentTurn !== 0 ||
      !game.lastPlay ||
      game.lastPlay.player === 0
    ) {
      showToast("你是本轮先手，需要出牌");
      return;
    }
    setGame((current) => applyPass(current, 0));
    setSelectedIds([]);
    playTone(180, 0.05);
  }, [game, playTone, showToast]);

  const hint = useCallback(() => {
    if (game.phase !== "playing" || game.currentTurn !== 0) return;
    const mustBeat =
      game.lastPlay && game.lastPlay.player !== 0
        ? game.lastPlay.combo
        : null;
    const choice = mustBeat
      ? findBeatingPlay(game.hands[0], mustBeat)
      : findLeadPlay(game.hands[0]);
    if (!choice.length) {
      showToast("没有能压过的牌，可以选择不出");
      setSelectedIds([]);
    } else {
      setSelectedIds(choice.map((card) => card.id));
      playTone(620, 0.05);
    }
  }, [game, playTone, showToast]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        playSelected();
      } else if (event.key.toLowerCase() === "h") {
        hint();
      } else if (event.key.toLowerCase() === "p") {
        passTurn();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hint, passTurn, playSelected]);

  const playerIsLandlord = game.landlord === 0;
  const playerWon =
    game.winner !== null &&
    ((playerIsLandlord && game.winner === 0) ||
      (!playerIsLandlord && game.winner !== game.landlord));
  const canPass =
    !!game.lastPlay &&
    game.lastPlay.player !== 0 &&
    game.phase === "playing";

  return (
    <main className="table-page">
      <div className="ambient-grain" aria-hidden="true" />
      <header className="game-header">
        <div className="brand">
          <div className="brand-seal">鬥</div>
          <div>
            <span>CLASSIC CARD ROOM</span>
            <h1>斗地主</h1>
          </div>
        </div>
        <div className="room-meta">
          <span>经典三人场</span>
          <i />
          <span>底分 100</span>
          <i />
          <strong>× {game.multiplier}</strong>
          <i />
          <span>积分 {record.score >= 0 ? "+" : ""}{record.score}</span>
        </div>
        <div className="header-actions">
          <button type="button" className="mode-switch" onClick={onLan}>
            局域网对战
          </button>
          <button
            type="button"
            onClick={() => setSoundOn((current) => !current)}
            aria-label={soundOn ? "关闭声音" : "打开声音"}
          >
            {soundOn ? "♪" : "×"}
          </button>
          <button type="button" onClick={beginRound}>
            新牌局
          </button>
        </div>
      </header>

      <section className="card-table" aria-label="斗地主牌桌">
        <div className="table-ring" aria-hidden="true" />
        <div className="table-monogram" aria-hidden="true">
          <span>鬥</span>
          <small>LANDLORD</small>
        </div>

        <div className="bottom-cards" aria-label="地主底牌">
          <span>底牌</span>
          <div>
            {game.bottom.map((card, index) =>
              game.landlord === null ? (
                <CardBack key={card.id} index={index} />
              ) : (
                <CardFace key={card.id} card={card} small />
              ),
            )}
          </div>
        </div>

        <aside className="card-counter" aria-label="记牌器">
          <div className="counter-heading">
            <strong>记牌器</strong>
            <span>REMEMBER</span>
          </div>
          <div className="counter-ranks">
            {remainingRankCounts.map((item) => (
              <div
                className={`${item.count === 0 ? "empty" : ""} ${item.rank >= 16 ? "joker" : ""}`}
                key={item.rank}
              >
                <span>{item.label === "小王" ? "小" : item.label === "大王" ? "大" : item.label}</span>
                <b>{item.count}</b>
              </div>
            ))}
          </div>
        </aside>

        <PlayerSeat index={2} game={game} />
        <PlayerSeat index={1} game={game} />

        <div className="play-zone" aria-live="polite">
          <div className="action-ribbon">{game.actionText}</div>
          {game.lastPlay ? (
            <div className="last-play">
              <span>
                {PLAYER_NAMES[game.lastPlay.player]} · {game.lastPlay.combo.label}
              </span>
              <div className="played-cards">
                {game.lastPlay.cards.map((card) => (
                  <CardFace key={card.id} card={card} small />
                ))}
              </div>
            </div>
          ) : (
            game.phase === "playing" && (
              <div className="lead-notice">本轮自由出牌</div>
            )
          )}
        </div>

        {game.phase === "bidding" && (
          <div className="bid-panel">
            <span className="panel-kicker">
              叫分阶段 · 当前最高 {game.highestBid || "—"} 分
            </span>
            <h2>
              {game.currentTurn === 0
                ? "这把牌，你准备叫几分？"
                : `等待${PLAYER_NAMES[game.currentTurn]}叫分`}
            </h2>
            <p>
              叫分越高，成为地主后的基础倍数越高。三人都不叫会自动重新发牌。
            </p>
            {game.bidHistory.length > 0 && (
              <div className="bid-history" aria-label="叫分记录">
                {game.bidHistory.map((bid, index) => (
                  <span key={`${bid.player}-${index}`}>
                    {PLAYER_NAMES[bid.player]} · {bid.score ? `${bid.score} 分` : "不叫"}
                  </span>
                ))}
              </div>
            )}
            <div className="bid-actions">
              {game.currentTurn === 0 ? (
                <>
                  <button type="button" className="ghost-action" onClick={() => placeBid(0)}>
                    不叫
                  </button>
                  {[1, 2, 3].map((score) => (
                    <button
                      key={score}
                      type="button"
                      className={score === 3 ? "gold-action bid-score" : "ghost-action bid-score"}
                      onClick={() => placeBid(score)}
                      disabled={score <= game.highestBid}
                    >
                      {score} 分
                    </button>
                  ))}
                </>
              ) : (
                <div className="bid-waiting" role="status">
                  <i />
                  对手正在估牌
                </div>
              )}
            </div>
          </div>
        )}

        {game.phase === "finished" && (
          <div className="result-panel">
            <div className={`result-stamp ${playerWon ? "win" : "lose"}`}>
              {playerWon ? "胜" : "惜败"}
            </div>
            <span className="panel-kicker">
              {game.landlord === game.winner ? "地主阵营获胜" : "农民阵营获胜"}
            </span>
            <h2>{playerWon ? "漂亮，这局拿下！" : "牌局未定，再来一把"}</h2>
            <p>
              本局倍数 ×{game.multiplier}
              {game.spring ? " · 春天翻倍" : ""}
              {" · "}
              {PLAYER_NAMES[game.winner ?? 0]}率先出完手牌
            </p>
            <div className={`score-delta ${game.roundDelta >= 0 ? "positive" : ""}`}>
              本局积分 {game.roundDelta >= 0 ? "+" : ""}{game.roundDelta}
            </div>
            <button type="button" className="gold-action" onClick={beginRound}>
              再来一局
              <span>↻</span>
            </button>
          </div>
        )}

        <div className={`self-seat ${game.currentTurn === 0 && game.phase === "playing" ? "active" : ""}`}>
          <div className="self-info">
            <div className="self-avatar">
              <span className="portrait-face self-portrait" aria-hidden="true">
                <i className="portrait-hair" />
                <i className="portrait-eyes" />
                <b>你</b>
              </span>
              {playerIsLandlord && <i className="landlord-pin">地主</i>}
            </div>
            <div>
              <strong>今日牌手</strong>
              <span>
                胜 {record.wins} / {record.games} 局
                {record.streak > 1 ? ` · ${record.streak} 连胜` : ""}
              </span>
            </div>
          </div>

          {game.phase === "playing" && game.currentTurn === 0 && (
            <div
              className={`selection-status ${
                selectedCards.length === 0
                  ? ""
                  : selectedCanPlay
                    ? "valid"
                    : "invalid"
              }`}
              aria-live="polite"
            >
              {selectedCards.length === 0
                ? "请选择手牌，或使用提示"
                : currentCombo
                  ? selectedCanPlay
                    ? `${currentCombo.label} · 可以出牌`
                    : `${currentCombo.label} · 压不过上家`
                  : `${selectedCards.length} 张 · 不是有效牌型`}
            </div>
          )}

          <div className="hand" aria-label="你的手牌">
            <span className="hand-caption">
              手牌 <b>{game.hands[0].length}</b>
            </span>
            {game.hands[0].map((card) => (
              <CardFace
                key={card.id}
                card={card}
                selected={selectedIds.includes(card.id)}
                onClick={
                  game.phase === "playing" && game.currentTurn === 0
                    ? () => toggleCard(card)
                    : undefined
                }
              />
            ))}
          </div>

          <div className="turn-controls">
            {game.phase === "playing" && game.currentTurn === 0 ? (
              <>
                <button
                  type="button"
                  className="control secondary"
                  onClick={passTurn}
                  disabled={!canPass}
                  title="快捷键 P"
                >
                  不出
                </button>
                <button
                  type="button"
                  className="control hint"
                  onClick={hint}
                  title="快捷键 H"
                >
                  提示
                </button>
                <button
                  type="button"
                  className="control primary"
                  onClick={playSelected}
                  title="快捷键 空格"
                >
                  出牌
                  {currentCombo && <span>{currentCombo.label}</span>}
                </button>
              </>
            ) : (
              game.phase === "playing" && (
                <div className="waiting-turn">
                  <i />
                  等待对手出牌
                </div>
              )
            )}
          </div>
        </div>

        {toast && <div className="toast">{toast}</div>}
      </section>

      <footer className="game-footer">
        <span>点击手牌选择 · 空格出牌 · H 提示 · P 不出</span>
        <span>支持：顺子 / 连对 / 飞机 / 四带二 / 炸弹 / 王炸</span>
      </footer>
    </main>
  );
}

export default function Home() {
  const [mode, setMode] = useState<"solo" | "lan">("solo");

  useEffect(() => {
    if (new URLSearchParams(location.search).has("room")) setMode("lan");
  }, []);

  return mode === "lan" ? (
    <LanGame onExit={() => setMode("solo")} />
  ) : (
    <SoloGame onLan={() => setMode("lan")} />
  );
}
