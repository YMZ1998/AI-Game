---
version: "alpha"
name: Neon Maze Archive
description: The preserved upstream Pac-Man canvas presented as a focused, full-frame arcade cabinet.
colors:
  primary: "#111111"
  canvas: "#000000"
  surface: "#1B1B1B"
  accent: "#F8E71C"
  danger: "#F04444"
  focus: "#62D7FF"
typography:
  display:
    fontFamily: Arial
    fontSize: 2rem
    fontWeight: 900
    lineHeight: 1
  body:
    fontFamily: Arial
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.5
rounded:
  sm: 4px
  md: 10px
spacing:
  sm: 8px
  md: 16px
components:
  game-canvas:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.accent}"
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 3px
---

## Overview

Keep the upstream maze, sprites, timing, and controls recognizable. PLAYROOM removes the surrounding portfolio chrome so the maze is the dominant surface.

## Layout

The 960 × 640 canvas scales down responsively and remains centered. The pause hint stays immediately below the playfield.

## Accessibility

Keyboard input is the primary control. Focus indication must remain visible and reduced-motion preferences must not introduce extra animation.

## Do's and Don'ts

- Do preserve the original game loop and local assets.
- Do keep author and license material in the vendored source.
- Don't add remote analytics, forced redirects, or third-party layout dependencies.
