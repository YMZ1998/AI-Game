---
version: "alpha"
name: Gold Rush Field Notes
description: A tactile mining-arcade identity built from warm paper, dark timber, stamped red controls, and mineral highlights.
colors:
  primary: "#26150E"
  canvas: "#170D08"
  surface: "#F4E5C8"
  surface-strong: "#EAD6B3"
  accent: "#F2AE28"
  danger: "#C9432D"
  danger-deep: "#86291E"
  focus: "#65BFFF"
  muted: "#6E5038"
typography:
  display:
    fontFamily: Arial
    fontSize: 3rem
    fontWeight: 900
    lineHeight: 0.98
    letterSpacing: -0.07em
  body-md:
    fontFamily: Arial
    fontSize: 0.9375rem
    fontWeight: 600
    lineHeight: 1.65
  hud:
    fontFamily: Arial
    fontSize: 1.25rem
    fontWeight: 900
    lineHeight: 1
    letterSpacing: -0.04em
  label-caps:
    fontFamily: Arial
    fontSize: 0.6875rem
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: 0.14em
rounded:
  sm: 5px
  md: 11px
  lg: 22px
  frame: 28px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  game-shell:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.surface}"
    typography: "{typography.body-md}"
  game-frame:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.frame}"
  hud:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.primary}"
    typography: "{typography.hud}"
    rounded: "{rounded.md}"
    padding: 16px
  hud-label:
    backgroundColor: "{colors.surface-strong}"
    textColor: "{colors.muted}"
    typography: "{typography.label-caps}"
  button-primary:
    backgroundColor: "{colors.danger-deep}"
    textColor: "{colors.surface}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.md}"
    padding: 16px
  mineral-gold:
    backgroundColor: "{colors.accent}"
    size: 10px
  danger-marker:
    backgroundColor: "{colors.danger}"
    size: 10px
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 4px
---

## Overview

Gold Rush Field Notes combines a rugged mining camp with an illustrated expedition ledger. Warm paper UI surrounds a dark playable mine, while saturated mineral colors make targets readable at a glance.

## Colors

Dark brown anchors the mine and frame. Paper and parchment tones carry HUD and overlay surfaces. Gold is reserved for treasure and score value. Stamped red drives primary actions and urgent states; bright blue appears only for keyboard focus and diamond highlights.

## Typography

Use a heavy Arial treatment for scores, timer values, and overlay headlines. Supporting copy stays compact and practical, like annotations in a field notebook. Avoid decorative Western typefaces that reduce Chinese legibility.

## Layout

The canvas is the dominant 16:9 playfield. HUD information belongs above it and value legends below it. On narrow screens, preserve timer, score, target, primary action, and the full interaction area before secondary metadata.

## Elevation & Depth

Use inset borders, paper gradients, and firm vertical shadows to make controls feel tactile. The mine can use glow and atmospheric gradients, but interface surfaces should remain matte and readable.

## Shapes

The outer frame and overlay cards use broad rounded corners. Controls use medium corners and circular icon wells. Mineral markers may vary by material, but hit targets and interactive controls must retain consistent geometry.

## Components

Primary actions use a deep stamped-red base with a warm paper label. Gold markers identify valuable objects; red square markers identify TNT or danger. Focus rings use sky blue and must remain visible on both paper and mine surfaces.

## Do's and Don'ts

- Do preserve immediate recognition of gold, diamonds, rocks, TNT, and the claw.
- Do keep the HUD compact, responsive, and readable during time pressure.
- Don't let texture, glow, or particle effects obscure collision targets.
- Don't use gold for ordinary chrome or non-reward actions.
