---
version: "alpha"
name: Night Shift Hookline
description: A family-friendly Gold Miner-style police arcade identity built from midnight navy, static city layers, cyan interaction light, and warm dossier paper.
colors:
  primary: "#071426"
  primary-soft: "#102844"
  surface: "#F3E7C9"
  foreground: "#142033"
  radar: "#37D7FF"
  siren: "#FF4D5D"
  reward: "#FFC857"
  success: "#65D69A"
  muted: "#87A5BE"
  focus: "#FFFFFF"
typography:
  display:
    fontFamily: Arial
    fontSize: 3rem
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: -0.06em
  hud:
    fontFamily: Arial
    fontSize: 1.375rem
    fontWeight: 900
    lineHeight: 1
    letterSpacing: -0.03em
  body-md:
    fontFamily: Arial
    fontSize: 0.9375rem
    fontWeight: 600
    lineHeight: 1.55
  label-caps:
    fontFamily: Arial
    fontSize: 0.6875rem
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: 0.14em
rounded:
  sm: 6px
  md: 12px
  lg: 20px
  frame: 28px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  app-shell:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.body-md}"
  game-frame:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.surface}"
    rounded: "{rounded.frame}"
  dossier-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 32px
  primary-action:
    backgroundColor: "{colors.radar}"
    textColor: "{colors.primary}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.md}"
    padding: 16px
  danger-badge:
    backgroundColor: "{colors.siren}"
    textColor: "{colors.primary}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.pill}"
    padding: 8px
  reward-badge:
    backgroundColor: "{colors.reward}"
    textColor: "{colors.primary}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.pill}"
    padding: 8px
  success-badge:
    backgroundColor: "{colors.success}"
    textColor: "{colors.primary}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.pill}"
    padding: 8px
  secondary-label:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.muted}"
    typography: "{typography.label-caps}"
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 4px
---

## Overview

Night Shift Hookline turns the classic Gold Miner timing loop into a friendly police chase. A fixed officer sits above a cutaway city block while a handcuff hook swings, drops in a straight line, catches a stationary target, and retracts at a speed determined by weight.

## Colors

Midnight navy owns the environment. Cyan indicates aiming, interaction, and active scan state. Red is limited to urgent time and thief markers. Gold represents recovered evidence and score; green confirms successful captures. Warm dossier paper is reserved for overlays and instructions.

## Typography

Use heavy condensed-feeling Arial for the title, timer, and score. Supporting Chinese copy stays practical and compact. Uppercase-style labels should be short, highly tracked, and never replace explanatory sentences.

## Layout

Keep the 16:9 city cutaway dominant. The officer and swinging hook sit at the top center; stationary thieves, evidence, civilians, and roadblocks are distributed through the layers below. The mission HUD sits above the field, while controls and the weight legend remain below.

## Elevation & Depth

Use broad navy street layers, masonry seams, exposed utility pipes, and subtle scanlines inside the playfield. Interface panels use crisp borders and controlled shadows. Avoid glow or decorative motion that competes with the swinging hook.

## Shapes

The outer frame and dossier overlays use large corners. Buttons use firm medium corners. Radar markers, status lights, and combo badges use circles or pills. Police-tape diagonals may appear as accents but not behind body copy.

## Components

Primary fire controls use cyan. Mission danger uses red, evidence uses gold, and successful capture feedback uses green. Focus rings are white with a dark offset so keyboard interaction remains visible everywhere.

## Do's and Don'ts

- Do make thieves, civilians, evidence, and roadblocks distinguishable by shape and labels as well as color.
- Do keep the chase nonviolent and family-friendly.
- Do preserve keyboard, pointer, and touch controls with reduced-motion support.
- Don't use realistic weapons, official insignia, or distressing police imagery.
- Don't move targets horizontally; the challenge comes from judging the swinging hook angle.
