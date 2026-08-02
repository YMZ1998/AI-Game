---
version: "alpha"
name: Bubble Battle
description: A playful competitive arcade identity built from crisp bubbles, saturated accents, and calm navy framing.
colors:
  primary: "#0B1026"
  surface: "#F7FBFF"
  surface-muted: "#E8F7FF"
  foreground: "#111827"
  accent: "#23C6D9"
  accent-alt: "#FF5F87"
  reward: "#F6C453"
  focus: "#2563EB"
typography:
  display:
    fontFamily: Arial
    fontSize: 3rem
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: -0.05em
  body-md:
    fontFamily: Arial
    fontSize: 1rem
    fontWeight: 600
    lineHeight: 1.5
  label-caps:
    fontFamily: Arial
    fontSize: 0.75rem
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: 0.12em
rounded:
  sm: 8px
  md: 16px
  lg: 24px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  game-shell:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.body-md}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 24px
  empty-state:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: 16px
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.pill}"
    padding: 12px
  button-versus:
    backgroundColor: "{colors.accent-alt}"
    textColor: "{colors.primary}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.pill}"
    padding: 12px
  mode-selector-active:
    backgroundColor: "{colors.accent-alt}"
    textColor: "{colors.primary}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.md}"
    padding: 12px
  duel-player:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.md}"
    padding: 12px
  online-room:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.foreground}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.md}"
    padding: 12px
  reward-badge:
    backgroundColor: "{colors.reward}"
    textColor: "{colors.primary}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.pill}"
    padding: 8px
  power-up-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.pill}"
    padding: 8px
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 4px
---

## Overview

Bubble Battle should feel energetic, friendly, and immediately readable. Deep navy contains the action while cyan, pink, and gold identify interaction, rivalry, rewards, and temporary power-up states.

## Colors

Use navy for the outer game frame and pale surfaces for menus and results. Cyan is the primary action color, pink marks opposing or versus states, and gold is reserved for score, streak, and reward moments. Never use accent colors as large background fields.

## Typography

Use a heavy, compact display treatment for scores and round titles. Body copy remains simple and highly legible. Uppercase labels should be short and spaced out; do not use them for paragraphs.

## Layout

Keep the playfield dominant. HUD elements should hug the edges, controls should remain thumb-reachable on mobile, and modal panels should never obscure essential live state without pausing play.

## Elevation & Depth

Use soft translucent highlights and restrained shadows to suggest glossy bubbles. Avoid glass effects that reduce text contrast or make hit targets ambiguous.

## Shapes

Prefer circles, pills, and generous rounded rectangles. Preserve a crisp silhouette for interactive controls and use round forms as a motif rather than making every container circular.

## Components

Primary actions use cyan pills; competitive states use pink; rewards use gold. Panels use pale surfaces on the navy game shell. Focus indicators must stay visible against both light panels and the dark playfield.

Power-up status uses compact pill chips over the playfield. Every chip combines a label with a countdown or action key so color is never the only status signal.

The mode selector exposes solo, local-versus, and online-room play as three equal choices. The active mode uses the pink competitive accent, while player status cards always pair cyan/pink markers with explicit P1/P2 labels and control text so team identity never depends on color alone.

Online-room setup uses a compact pale panel with a text room code, explicit connection status, and cyan primary action. It must remain usable at phone width and never communicate connection health by color alone.

## Do's and Don'ts

- Do prioritize fast state recognition, generous hit targets, and color-independent labels.
- Do provide reduced-motion behavior for bubble bursts and score animations.
- Don't let decorative bubbles overlap text or controls.
- Don't use pink and cyan alone to communicate teams or outcomes.
