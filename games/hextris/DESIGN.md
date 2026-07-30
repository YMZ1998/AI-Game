---
version: "alpha"
name: Rotating Color Core
description: The preserved Hextris hexagonal puzzle with saturated falling color bands and a quiet dark field.
colors:
  primary: "#FFFFFF"
  canvas: "#F7F7F7"
  surface: "#2C3E50"
  accent: "#F1C40F"
  danger: "#E74C3C"
  focus: "#3498DB"
typography:
  display:
    fontFamily: Arial
    fontSize: 2rem
    fontWeight: 800
    lineHeight: 1
  body:
    fontFamily: Arial
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: 3px
  md: 8px
spacing:
  sm: 8px
  md: 16px
components:
  puzzle-canvas:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.surface}"
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 3px
---

## Overview

Preserve the upstream rotating-core rules, saturated block colors, score hierarchy, pause controls, and touch gestures.

## Layout

The puzzle canvas remains centered and fills the playable frame without surrounding advertisements.

## Accessibility

Keyboard, pointer, and touch controls remain available. Focus and pause affordances must remain visible.

## Do's and Don'ts

- Do keep gameplay assets and GPL notices with the source.
- Do remove analytics and advertising scripts from the local copy.
- Don't alter the color matching rules.
