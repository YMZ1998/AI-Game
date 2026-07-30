# AI Game

一个按游戏独立组织的网页游戏集合。统一入口位于 [`portal`](portal)，本地运行后可从同一个页面、同一个端口直接游玩全部游戏。

## 统一启动

在仓库根目录双击 [`启动游戏大厅.bat`](启动游戏大厅.bat)，或执行：

```bash
npm run dev
```

访问 `http://localhost:3003`。十九款游戏均从大厅同源加载；斗地主、匿名夜话、地牢枪手和微型赛车的实时服务也由大厅进程统一提供。项目只用于本地和局域网运行，不会自动发布到线上。

## 游戏列表

| # | 游戏 | 目录 | 模式 |
| --- | --- | --- | --- |
| 01 | 黄金矿工 | [`games/gold-miner`](games/gold-miner) | 单人 |
| 02 | 斗地主 | [`games/doudizhu`](games/doudizhu) | 人机 / 局域网 |
| 03 | 泡泡堂 | [`games/bubble-battle`](games/bubble-battle) | 单人 |
| 04 | 夜巡追捕 | [`games/police-chase`](games/police-chase) | 单人 |
| 05 | 临界行动 | [`games/critical-operation`](games/critical-operation) | 单人 |
| 06 | AI 俄罗斯方块 | [`games/tetris-game`](games/tetris-game) | 单人 / AI |
| 07 | 匿名夜话 | [`games/anonymous-chat`](games/anonymous-chat) | 局域网 |
| 08 | 吃豆人 | [`games/pacman`](games/pacman) | 单人 |
| 09 | 四子棋 | [`games/connect-four`](games/connect-four) | 人机 / 本地双人 |
| 10 | 2048 | [`games/2048`](games/2048) | 单人 |
| 11 | 小行星 | [`games/asteroids`](games/asteroids) | 单人 |
| 12 | 极速光轨 | [`games/hexgl`](games/hexgl) | 单人 |
| 13 | 六角拼图 | [`games/hextris`](games/hextris) | 单人 |
| 14 | 地牢枪手 | [`games/tosios`](games/tosios) | 局域网 |
| 15 | 装甲峡谷 | [`games/armor-alley`](games/armor-alley) | 单人战役 |
| 16 | 尘土拉力 | [`games/trigger-rally`](games/trigger-rally) | 单人 / 离线存档 |
| 17 | 微型赛车 | [`games/micro-racing`](games/micro-racing) | 人机 / 实时房间 |
| 18 | 霓虹赛车 | [`games/racez`](games/racez) | 单人练习 / 在线联机 |
| 19 | 公路追风 | [`games/javascript-racer`](games/javascript-racer) | 单人 |

## 目录约定

每个游戏都放在 `games/` 下的独立同级目录中，自行维护源码或上游发行资源、设计说明和来源声明。大厅通过 `portal/scripts/sync-games.mjs` 将游戏同步到同源的 `/embedded/<slug>/` 路径，并为每款游戏生成 `/play/<slug>/index.html` 入口。

新增游戏时必须同时更新：

- `portal/app/game-catalog.ts` 中的票券卡片；
- `portal/scripts/sync-games.mjs` 中的同步清单；
- 大厅数量、编号、封面和测试；
- 本 README 的游戏列表。

引入第三方开源游戏时，保留其原始许可证、作者信息和素材声明。
