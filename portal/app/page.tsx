import { games } from "./game-catalog";
import { GameGallery } from "./game-gallery";

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
          <span>{games.length} 款游戏在线</span>
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
            二十四款随时开玩的小游戏，
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
          <p>搜索或筛选，挑一张卡片立即开玩。</p>
        </div>

        <GameGallery games={games} />
      </section>

      <section className="about-section" id="about">
        <div className="about-index">24</div>
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
