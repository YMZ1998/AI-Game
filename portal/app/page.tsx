import Image from "next/image";

const games = [
  {
    number: "01",
    title: "黄金矿工",
    english: "GOLD RUSH",
    description: "看准时机放下抓钩，在岩层深处寻找金块与钻石。",
    image: "/gold-miner.webp",
    href: "http://localhost:3000/",
    tags: ["街机", "单人", "50 秒"],
    className: "gold-game",
  },
  {
    number: "02",
    title: "斗地主",
    english: "LANDLORD",
    description: "抢地主、组牌、压制，与两位电脑牌手打完一局。",
    image: "/doudizhu.webp",
    href: "http://localhost:3001/",
    tags: ["棋牌", "三人", "策略"],
    className: "card-game",
  },
  {
    number: "03",
    title: "泡泡堂",
    english: "BUBBLE BATTLE",
    description: "穿过清凉水上街区，放下泡泡、炸开箱子，用连锁水花击败捣蛋怪。",
    image: "/bubble-battle.webp",
    href: "http://localhost:3002/",
    tags: ["动作", "单人", "连锁爆破"],
    className: "bubble-game",
  },
  {
    number: "04",
    title: "夜巡追捕",
    english: "NIGHT PATROL",
    description: "摆动准星、发射手铐，在倒计时结束前抓住小偷并追回证物。",
    image: "/police-chase.png",
    href: "https://night-patrol-police-chase.ymz1998.chatgpt.site",
    tags: ["街机", "单人", "连击追捕"],
    className: "police-game",
  },
  {
    number: "05",
    title: "临界行动",
    english: "CRITICAL OPERATION",
    description: "突入港口仓库，以第一人称视角清除敌方机器人，并在倒计时结束前拆除装置。",
    image: "/critical-operation.svg",
    href: "http://localhost:3005/",
    tags: ["第一人称", "战术射击", "拆弹"],
    className: "tactical-game",
  },
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#" aria-label="回到游戏大厅顶部">
          <span className="wordmark-glyph">P</span>
          <span>
            PLAYROOM
            <small>游戏收藏室</small>
          </span>
        </a>

        <div className="online-status">
          <i />
          <span>5 款游戏在线</span>
        </div>

        <nav aria-label="主导航">
          <a href="#games">全部游戏</a>
          <a href="#about">关于大厅</a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-kicker">
          <span>OPEN DAILY</span>
          <i />
          <span>NO TICKETS NEEDED</span>
        </div>
        <div className="hero-heading" aria-label="随时开玩">
          <div>
            <span>随时</span>
            <strong>PLAY</strong>
          </div>
          <div>
            <strong>ROOM</strong>
            <span>开玩</span>
          </div>
        </div>
        <div className="hero-bottom">
          <p>
            五款认真做的小游戏，
            <br />
            一个入口，点开就玩。
          </p>
          <a href="#games" className="scroll-cue">
            <span>挑一款游戏</span>
            <i>↓</i>
          </a>
          <div className="edition">
            <span>COLLECTION</span>
            <strong>VOL. 01</strong>
          </div>
        </div>
      </section>

      <section className="games-section" id="games">
        <div className="section-heading">
          <span>NOW PLAYING</span>
          <h2>今天玩什么？</h2>
          <p>选择一张游戏票，立即进入。</p>
        </div>

        <div className="game-grid">
          {games.map((game) => (
            <a
              className={`game-ticket ${game.className}`}
              href={game.href}
              target="_blank"
              rel="noreferrer"
              key={game.title}
              aria-label={`开始玩${game.title}`}
            >
              <div className="ticket-image">
                <Image
                  src={game.image}
                  alt={`${game.title}游戏封面`}
                  fill
                  unoptimized
                  sizes="(max-width: 760px) 100vw, 50vw"
                  priority
                />
                <div className="image-shade" />
                <span className="game-number">{game.number}</span>
                <div className="ticket-labels">
                  {game.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
              <div className="ticket-copy">
                <div>
                  <span className="game-english">{game.english}</span>
                  <h3>{game.title}</h3>
                  <p>{game.description}</p>
                </div>
                <div className="play-button">
                  <span>开始游戏</span>
                  <i>↗</i>
                </div>
              </div>
              <div className="perforation" aria-hidden="true" />
            </a>
          ))}
        </div>
      </section>

      <section className="about-section" id="about">
        <div className="about-index">06</div>
        <div className="about-copy">
          <span>NEXT UP</span>
          <h2>下一款，正在路上。</h2>
          <p>
            这个大厅会继续长大。新的小游戏会沿用同一个入口出现，
            你的收藏、规则和乐趣都在这里汇合。
          </p>
        </div>
        <div className="coming-soon" aria-label="新游戏即将推出">
          <span>COMING SOON</span>
          <div className="mystery-mark">?</div>
          <p>下一款由你决定</p>
        </div>
      </section>

      <footer>
        <div className="footer-mark">
          <span>P</span>
          <strong>PLAY SOMETHING GOOD.</strong>
        </div>
        <p>本地游戏收藏 · 2026</p>
        <a href="#">回到顶部 ↑</a>
      </footer>
    </main>
  );
}
