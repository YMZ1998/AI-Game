# 堆叠实验室：AI 俄罗斯方块

基于 MIT 许可的 [LoveDaisy/tetris_game](https://github.com/LoveDaisy/tetris_game) 移植而来的网页版俄罗斯方块。

原项目使用 Python、PyQt5 和 NumPy。本目录将其核心玩法与两步前瞻 AI 思路重写为响应式 Next.js 网页游戏，并保留原作者署名与许可证。

## 功能

- 10×22 逻辑棋盘，显示经典 10×20 游戏区域
- 七种俄罗斯方块、下一块预览、幽灵落点
- 方向键移动和旋转，空格直落，`P` 暂停，`R` 重开
- 触屏控制
- AI 自动运行模式
- AI 目标列、旋转角度、洞数、堆叠高度和棋盘评分遥测
- 消行计分、等级提速和本地最高分

## 本地运行

```bash
npm install
npm run dev -- --hostname 0.0.0.0 --port 3006
```

访问：<http://localhost:3006/>

## 开源许可

原始项目版权所有 © 2018 Jiajie Zhang，并以 MIT License 发布。完整许可证见 [`ORIGINAL_LICENSE`](ORIGINAL_LICENSE)。
