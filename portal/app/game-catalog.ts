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
  {
    number: "07",
    slug: "anonymous-chat",
    title: "匿名夜话",
    english: "MIDNIGHT FREQUENCY",
    description:
      "无需账号，带着随机代号进入局域网频道，围绕今晚的话题交换回应与共鸣。",
    image: "/anonymous-chat.svg",
    tags: ["社交", "局域网", "匿名"],
    className: "chat-game",
  },
  {
    number: "08",
    slug: "pacman",
    title: "吃豆人",
    english: "PAC-MAN",
    description: "穿过霓虹迷宫吃完豆子，利用能量豆反击幽灵，并挑战连续十二关。",
    image: "/pacman.svg",
    tags: ["街机", "单人", "迷宫"],
    className: "pacman-game",
  },
  {
    number: "09",
    slug: "connect-four",
    title: "四子棋",
    english: "CONNECT FOUR",
    description: "把棋子投入七列棋盘，率先横向、纵向或斜向连成四子；支持人机和本地双人。",
    image: "/connect-four.svg",
    tags: ["棋类", "人机", "双人"],
    className: "connect-four-game",
  },
  {
    number: "10",
    slug: "2048",
    title: "2048",
    english: "NUMBER MERGE",
    description: "滑动数字方块，让相同数字相遇合并，在棋盘被填满之前抵达 2048。",
    image: "/2048.svg",
    tags: ["益智", "单人", "数字"],
    className: "number-game",
  },
  {
    number: "11",
    slug: "asteroids",
    title: "小行星",
    english: "ASTEROIDS",
    description: "驾驶矢量飞船穿越陨石带，旋转、推进并射击，在碎石围攻中刷新得分。",
    image: "/asteroids.svg",
    tags: ["街机", "射击", "复古"],
    className: "asteroids-game",
  },
  {
    number: "12",
    slug: "hexgl",
    title: "极速光轨",
    english: "HEXGL",
    description: "进入 WebGL 未来都市赛道，用键盘或触控驾驶反重力赛车冲击最快圈速。",
    image: "/hexgl.svg",
    tags: ["竞速", "3D", "WebGL"],
    className: "hexgl-game",
  },
  {
    number: "13",
    slug: "hextris",
    title: "六角拼图",
    english: "HEXTRIS",
    description: "旋转六角核心接住彩色方块，让同色边连续消除，在加速坠落中维持节奏。",
    image: "/hextris.svg",
    tags: ["益智", "反应", "触控"],
    className: "hextris-game",
  },
  {
    number: "14",
    slug: "tosios",
    title: "地牢枪手",
    english: "TOSIOS",
    description: "创建本地房间，与同一局域网的队友进入像素地牢，闪避怪物并争夺排行榜。",
    image: "/tosios.svg",
    tags: ["联机", "射击", "局域网"],
    className: "tosios-game",
  },
  {
    number: "15",
    slug: "armor-alley",
    title: "装甲峡谷",
    english: "ARMOR ALLEY",
    description: "驾驶直升机掩护地面车队，购买单位、占领碉堡，在经典横向战场上推进前线。",
    image: "/armor-alley.svg",
    tags: ["策略", "动作", "战役"],
    className: "armor-game",
  },
];

export function findGame(slug: string) {
  return games.find((game) => game.slug === slug);
}
