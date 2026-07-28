# AI Game

一个按游戏独立组织的 AI 游戏集合。

## 游戏列表

| 游戏 | 目录 | 运行方式 |
| --- | --- | --- |
| 黄金矿工 | [`games/gold-miner`](games/gold-miner) | `cd games/gold-miner && npm install && npm run dev` |
| 泡泡堂 | [`games/bubble-battle`](games/bubble-battle) | `cd games/bubble-battle && npm install && npm run dev` |

## 目录约定

每个游戏都放在 `games/` 下的独立文件夹中，并自行维护源码、资源、依赖、测试和构建配置：

```text
games/
├── gold-miner/
│   ├── app/
│   ├── public/
│   ├── tests/
│   ├── package.json
│   └── README.md
└── bubble-battle/
    ├── app/
    ├── public/
    └── package.json
```

新增游戏时，请在 `games/` 下创建新的同级目录，避免不同游戏之间共享或混放项目文件。
