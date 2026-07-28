# 泡泡堂

一款基于 React、Canvas 和 vinext 的泡泡堂风格网页游戏。

玩家需要在水上街区移动、放置泡泡、炸开箱子并收集强化道具，用十字水花击败全部捣蛋怪。水花会伤到自己，放泡泡前记得留好退路。

## 操作

- 方向键或 `WASD`：移动
- 空格键：放置泡泡
- 触屏设备：使用页面下方方向键和泡泡按钮

## 环境要求

- Node.js `>=22.13.0`

## 本地运行

```bash
npm install
npm run dev
```

## 构建与测试

```bash
npm run build
npm test
```

## 主要目录

- `app/`：游戏界面、绘制和核心玩法
- `public/`：分享图片与静态资源
- `tests/`：服务端渲染测试
- `.openai/hosting.json`：Sites 托管配置
