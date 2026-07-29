---
version: "alpha"
name: Midnight Frequency
description: A temporary anonymous LAN lounge that feels like tuning into a warm midnight radio signal.
colors:
  primary: "#0B0B1A"
  surface: "#15152B"
  surface-raised: "#20203D"
  foreground: "#FFF7EB"
  muted: "#9894AE"
  accent: "#FF8066"
  accent-alt: "#8EF0C7"
  signal: "#A99BFF"
  warning: "#FFD36A"
  focus: "#B8F7FF"
typography:
  display:
    fontFamily: Georgia
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: -0.05em
  body:
    fontFamily: Arial
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.6
  mono:
    fontFamily: Consolas
    fontSize: 0.75rem
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: 0.08em
  label:
    fontFamily: Arial
    fontSize: 0.6875rem
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: 0.14em
rounded:
  sm: 8px
  md: 14px
  lg: 24px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 36px
components:
  room-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 24px
  message:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: 16px
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: 12px
  status-online:
    backgroundColor: "{colors.accent-alt}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
  status-host:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
  frequency-mark:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.primary}"
    typography: "{typography.mono}"
    rounded: "{rounded.sm}"
  text-muted:
    textColor: "{colors.muted}"
    typography: "{typography.body}"
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 3px
---

## Overview

匿名夜话是一间只在当前大厅进程中存在的局域网聊天室。玩家不注册、不取昵称，进入时得到随机匿名代号；每次围绕一个夜间话题分享一句话，再通过“共鸣”等轻量反馈形成社交玩法循环。

## Core Loop

回答当前话题，观察其他匿名玩家的实时回应，用共鸣、好奇或笑脸给出反馈，再由房主切换下一道话题。每轮在几十秒内完成，奖励来自被理解与发现新的观点，而非排名。

## Colors

深靛黑表现午夜空间，珊瑚色只用于主要行动与发言者信号，薄荷绿表示在线和连接成功，淡紫色表示广播频率。暖白消息面保证长文本清晰，黄色只用于房主权限提示。

## Typography

Georgia 用于标题与话题，营造夜间电台和私人手记的气质；Arial 用于聊天正文；Consolas 用于房间码、频率和时间。紧凑全大写标签负责导航层级。

## Layout

桌面采用房间信息、对话主舞台、话题与成员三栏结构。消息流始终占据最大面积，输入器固定在主舞台底部。窄屏收为单栏：话题、消息、输入、成员依次排列，所有关键操作保留至少 44px 触控区域。

## Motion

新消息轻微上浮，在线电波缓慢扩散，连接状态平滑切换。动效只用于表达新内容和实时状态，并尊重 reduced-motion。

## Signature Differentiator

每个匿名代号使用一枚“电台印章”，其外圈以呼吸电波显示在线信号；顶部频率刻度会随房间与话题变化，让聊天室像一台正在收听的午夜广播。

## Privacy and Safety

- 不使用账号、头像上传或永久昵称。
- 消息最多 160 字，只保存在大厅主机内存，重启即清空。
- 私密房间通过四位房间码加入。
- 房主可切换话题并清空屏幕。
- 服务端限制消息长度、反应类型和发送频率。

## Do's and Don'ts

- Do keep the temporary-memory privacy notice visible.
- Do provide empty, connecting, connected, error, and room states.
- Do keep room codes and host permissions unmistakable.
- Don't add persistent chat history or browser storage for messages.
- Don't mimic social-media feeds, profile systems, or competitive leaderboards.
- Don't hide keyboard focus or rely on color alone for connection status.
