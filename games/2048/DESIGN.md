---
version: "alpha"
name: Warm Number Board
description: The preserved upstream 2048 board with warm neutral tiles and compact score controls.
colors:
  primary: "#776E65"
  canvas: "#FAF8EF"
  surface: "#BBADA0"
  accent: "#EDC53F"
  danger: "#F65E3B"
  focus: "#2B7FFF"
typography:
  display:
    fontFamily: Arial
    fontSize: 3rem
    fontWeight: 900
    lineHeight: 1
  body:
    fontFamily: Arial
    fontSize: 1rem
    fontWeight: 500
    lineHeight: 1.5
rounded:
  sm: 3px
  md: 6px
spacing:
  sm: 8px
  md: 16px
components:
  number-tile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 3px
---

## Overview

Preserve the original 2048 proportions, warm palette, tile hierarchy, score display, and swipe or arrow-key interaction.

## Layout

The board stays centered at its authored width and scales to narrow viewports without horizontal scrolling.

## Accessibility

Keyboard and touch input must both remain available. Controls need visible focus and readable labels.

## Do's and Don'ts

- Do keep tile values and movement feedback immediately legible.
- Do retain upstream attribution files.
- Don't add remote analytics or change the number-merging rules.
