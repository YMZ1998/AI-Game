export type GameCatalogItem = {
  number: string;
  slug: string;
  title: string;
  english: string;
  description: string;
  image: string;
  tags: string[];
  className: string;
};

export const games: GameCatalogItem[] = [
  {
    number: "01",
    slug: "gold-miner",
    title: "黄金矿工",
    english: "GOLD RUSH",
    description: "看准时机放下抓钩，在岩层深处寻找金块与钻石。",
    image: "/gold-miner.webp",
    tags: ["街机", "单人", "50 秒"],
    className: "gold-game",
  },
  {
    number: "02",
    slug: "doudizhu",
    title: "斗地主",
    english: "LANDLORD",
    description: "抢地主、组牌、压制，与两位电脑牌手打完一局。",
    image: "/doudizhu.webp",
    tags: ["棋牌", "三人", "策略"],
    className: "card-game",
  },
  {
    number: "03",
    slug: "bubble-battle",
    title: "泡泡堂",
    english: "BUBBLE BATTLE",
    description: "穿过清凉水上街区，放下泡泡、炸开箱子，用连锁水花击败捣蛋怪。",
    image: "/bubble-battle.webp",
    tags: ["动作", "单人", "连锁爆破"],
    className: "bubble-game",
  },
  {
    number: "04",
    slug: "police-chase",
    title: "夜巡追捕",
    english: "NIGHT PATROL",
    description: "摆动准星、发射手铐，在倒计时结束前抓住小偷并追回证物。",
    image: "/police-chase.png",
    tags: ["街机", "单人", "连击追捕"],
    className: "police-game",
  },
  {
    number: "05",
    slug: "critical-operation",
    title: "临界行动",
    english: "CRITICAL OPERATION",
    description: "突入港口仓库，以第一人称视角清除敌方机器人，并在倒计时结束前拆除装置。",
    image: "/critical-operation.svg",
    tags: ["第一人称", "战术射击", "拆弹"],
    className: "tactical-game",
  },
  {
    number: "06",
    slug: "tetris-game",
    title: "AI 俄罗斯方块",
    english: "STACK LAB",
    description: "手动完成经典堆叠，或交给两步前瞻 AI，并实时观察它选择旋转与落点。",
    image: "/tetris-game.webp",
    tags: ["益智", "单人", "AI 自动"],
    className: "tetris-game",
  },
];

export function findGame(slug: string) {
  return games.find((game) => game.slug === slug);
}
