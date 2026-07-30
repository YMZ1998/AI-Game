---
version: "alpha"
name: Racez Neon Circuit
description: A playful low-poly 3D circuit lobby with bold car color selection and an unobstructed racing viewport.
colors:
  primary: "#F5F7FF"
  canvas: "#13233B"
  surface: "#203A5B"
  accent: "#FF7B5C"
  danger: "#F24966"
  focus: "#7DE6FF"
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
    lineHeight: 1.5
rounded:
  sm: 6px
  md: 14px
spacing:
  sm: 8px
  md: 16px
components:
  circuit:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
  control-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 3px
---

## Overview

Preserve Racez.io's low-poly cars, two tracks, color picker, solo practice, and multiplayer lobby controls.

## Layout

The lobby keeps its three-column selection layout. The race page gives the 3D circuit the full viewport with lightweight HUD controls.

## Accessibility

Named buttons and inputs remain keyboard-operable. The landscape hint is retained for narrow mobile screens.

## Do's and Don'ts

- Do keep solo play available without creating a party.
- Do keep all models and gameplay assets local.
- Don't require remote fonts, icon kits, or analytics to render.
