# AI Game

一个按游戏独立组织的 AI 游戏集合。

统一入口：[`portal`](portal)，本地运行后可从一个页面进入全部游戏。

## 游戏列表

| 游戏 | 目录 | 运行方式 |
| --- | --- | --- |
| 黄金矿工 | [`games/gold-miner`](games/gold-miner) | `cd games/gold-miner && npm install && npm run dev` |
| 斗地主 | [`games/doudizhu`](games/doudizhu) | `cd games/doudizhu && npm install && npm run dev` |
| 泡泡堂 | [`games/bubble-battle`](games/bubble-battle) | `cd games/bubble-battle && npm install && npm run dev` |
| 夜巡追捕 | [`games/police-chase`](games/police-chase) | `cd games/police-chase && npm install && npm run dev` |
| 临界行动 | [`games/critical-operation`](games/critical-operation) | `cd games/critical-operation && npm install && npm run dev -- --hostname 0.0.0.0 --port 3005` |

## 目录约定

每个游戏都放在 `games/` 下的独立文件夹中，并自行维护源码、资源、依赖、测试和构建配置：

```text
games/
├── gold-miner/
│   ├── app/
│   ├── public/
│   └── package.json
├── doudizhu/
│   ├── app/
│   ├── public/
│   └── package.json
├── bubble-battle/
│   ├── app/
│   ├── public/
│   └── package.json
├── police-chase/
│   ├── app/
│   ├── public/
│   └── package.json
└── critical-operation/
    ├── app/
    ├── public/
    └── package.json
```

门户单独维护在 `portal/`，新增游戏后同步更新门户中的游戏卡片即可。

新增游戏时，请在 `games/` 下创建新的同级目录，避免不同游戏之间共享或混放项目文件。
