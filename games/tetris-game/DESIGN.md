---
version: "alpha"
name: Stack Lab
description: A midnight computation lab where classic tetromino play meets a visible AI decision trace.
colors:
  primary: "#071116"
  surface: "#0E1F26"
  surface-raised: "#142C34"
  foreground: "#E8F4F2"
  muted: "#78949A"
  accent: "#42E8E0"
  accent-alt: "#C9F84A"
  warning: "#FFB84D"
  danger: "#FF6577"
  focus: "#8CB4FF"
typography:
  display:
    fontFamily: Arial
    fontSize: 3rem
    fontWeight: 900
    lineHeight: 0.9
    letterSpacing: -0.05em
  body:
    fontFamily: Arial
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.5
  mono:
    fontFamily: Consolas
    fontSize: 0.75rem
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: 0.06em
  label:
    fontFamily: Arial
    fontSize: 0.6875rem
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: 0.16em
rounded:
  sm: 4px
  md: 8px
  lg: 16px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  board:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  telemetry:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    typography: "{typography.mono}"
    rounded: "{rounded.lg}"
    padding: 24px
  button-primary:
    backgroundColor: "{colors.accent-alt}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 12px
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: 12px
  status-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
  status-ai:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
  status-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
  text-muted:
    textColor: "{colors.muted}"
    typography: "{typography.mono}"
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 3px
---

## Overview

Stack Lab turns the original Python AI Tetris project into a browser-first game. It should feel like a compact computation instrument: the board is the experiment, the player or AI is the operator, and every placement produces readable feedback.

## Colors

Near-black blue-green forms the room and board. Cyan identifies computation and AI state; acid lime marks committed primary actions. Amber is reserved for score acceleration and line clears, while pink-red appears only for game-over and destructive states. Tetromino colors remain varied but use the same bright-on-dark contrast.

## Typography

Large Arial display type gives the title an industrial lab identity. Consolas carries score, coordinates, AI metrics, and key hints. Compact uppercase labels separate operational data from player-facing messages.

## Layout

The 10×20 visible board remains the visual center. A right-side telemetry rail contains next-piece preview, score, level, mode, and AI decision data. A compact control dock sits below the board and becomes a two-row touch controller on small screens.

## Motion

Motion communicates state: pieces fall, ghost cells preview a landing, line clears flash, and the AI status light pulses while calculating. Avoid decorative motion unrelated to play. Respect reduced-motion preferences.

## Signature Differentiator

The AI decision trace is always visible in auto mode, showing target rotation, column, and board-quality metrics. It makes the original repository's AI concept legible instead of hiding automation behind the board.

## Do's and Don'ts

- Do keep the board grid, ghost piece, next piece, score, pause state, and game-over state immediately legible.
- Do provide keyboard, pointer, and touch controls.
- Do preserve attribution to the MIT-licensed original Python project.
- Don't imitate neon arcade cabinets or use ornamental gradients.
- Don't let telemetry overpower the board.
- Don't remove focus indicators or reduced-motion support.
