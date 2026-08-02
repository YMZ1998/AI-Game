---
version: "alpha"
name: Outrun Canvas Study
description: A deliberately retro pseudo-3D highway with the original tuning controls presented as a playable technical arcade cabinet.
colors:
  primary: "#F7F1DA"
  canvas: "#6AB8DB"
  surface: "#1C2430"
  accent: "#FF4F8B"
  danger: "#E44A3A"
  focus: "#FFF06A"
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
  sm: 2px
  md: 6px
spacing:
  sm: 8px
  md: 16px
components:
  highway:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.surface}"
  tuning-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 3px
---

## Overview

Preserve the final JavaScript Racer demo: pseudo-3D road rendering, traffic, lap timing, audio, and live rendering controls.

## Layout

The road canvas remains centered with tuning controls and keyboard instructions adjacent at desktop sizes.

## Accessibility

WASD and arrow-key driving are both supported. Native selects and ranges retain their labels and keyboard interaction.

## Do's and Don'ts

- Do open the complete v4 game directly from the hall.
- Do keep all sprites, backgrounds, music, and code local.
- Don't replace the original renderer with decorative shell animation.
