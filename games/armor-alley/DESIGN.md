---
version: "alpha"
name: Dust and Rotor
description: The preserved Armor Alley remaster with a dark battlefield, utilitarian HUD, and classic military silhouette.
colors:
  primary: "#F0E2BC"
  canvas: "#050505"
  surface: "#2D281F"
  accent: "#E5B55B"
  danger: "#C94034"
  focus: "#6DD8FF"
typography:
  display:
    fontFamily: Arial
    fontSize: 2.25rem
    fontWeight: 900
    lineHeight: 1
  body:
    fontFamily: Arial
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: 0px
  md: 4px
spacing:
  sm: 8px
  md: 16px
components:
  battlefield:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 3px
---

## Overview

Preserve the upstream remaster's battlefield, campaign menu, unit queue, radar, controls, and authored retro-computer character.

## Layout

The battlefield owns the viewport. Radar, funds, inventory, fuel, and ammunition stay in their original HUD regions.

## Accessibility

Keep the tutorial and control configuration reachable. Keyboard focus must remain visible in menus and modals.

## Do's and Don'ts

- Do keep upstream code, asset credits, licensing notes, and change history beside the build.
- Do default to local campaign play in PLAYROOM.
- Don't remove attribution or trigger optional network features during ordinary single-player play.
