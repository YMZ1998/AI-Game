---
version: "alpha"
name: Dustline Rally
description: A full-frame WebGL rally stage that keeps the original terrain, timing, and garage hierarchy intact.
colors:
  primary: "#F4EFE5"
  canvas: "#1B211F"
  surface: "#353B35"
  accent: "#F0A43A"
  danger: "#D5513E"
  focus: "#8ED8FF"
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
  rally-stage:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
  loading-panel:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
    accentColor: "{colors.accent}"
    borderRadius: "{rounded.md}"
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 3px
---

## Overview

Preserve Trigger Rally's authored terrain, car handling, stage browser, timing, and IndexedDB progress. The PLAYROOM copy removes remote analytics and CDN-only boot dependencies.

## Layout

The WebGL stage fills the embedded viewport. Existing garage, track, and result overlays retain their original hierarchy. A compact loading panel explains controls while the local track cache and WebGL scene initialize, then yields to the stage.

## Accessibility

Keyboard driving remains primary, with visible focus on menus and no additional motion outside the game loop. Both WASD and arrow-key controls are supported, and loading failures expose a keyboard-focusable retry action.

## Do's and Don'ts

- Do preserve local progress and the upstream experience.
- Do keep upstream notices and usage terms with the game.
- Don't require analytics, remote fonts, or a separate public port.
