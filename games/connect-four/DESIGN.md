---
version: "alpha"
name: Primary Color Grid
description: A preserved Connect Four canvas using bold red, yellow, and blue game-piece contrast.
colors:
  primary: "#1D3557"
  canvas: "#F5F7FA"
  surface: "#2563EB"
  accent: "#FACC15"
  danger: "#EF4444"
  focus: "#0EA5E9"
typography:
  display:
    fontFamily: Arial
    fontSize: 2rem
    fontWeight: 800
    lineHeight: 1.1
  body:
    fontFamily: Arial
    fontSize: 0.9375rem
    fontWeight: 500
    lineHeight: 1.5
rounded:
  sm: 4px
  md: 10px
spacing:
  sm: 8px
  md: 16px
components:
  board:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.canvas}"
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 3px
---

## Overview

Preserve the upstream canvas board, dialog-driven mode selection, Minimax opponent, and local two-player option.

## Layout

The board remains the primary region, with settings in a native dialog and a compact status area.

## Accessibility

Settings are labeled form controls. Dialog focus must stay keyboard-operable and the two piece colors must remain clearly distinct.

## Do's and Don'ts

- Do default to the fully local human-versus-AI mode.
- Do retain upstream attribution beside the vendored build.
- Don't require the optional upstream online server for ordinary play.
