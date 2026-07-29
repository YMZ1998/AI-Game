---
version: "alpha"
name: Harbor Breach
description: An original desktop-first tactical FPS interface using concrete gray, sodium amber, tactical teal, and restrained danger red.
colors:
  primary: "#101821"
  primary-soft: "#1A2731"
  surface: "#DCE4E3"
  foreground: "#0B1116"
  tactical: "#66E0C2"
  amber: "#F2B84B"
  danger: "#FF5A52"
  muted: "#82939B"
  focus: "#FFFFFF"
typography:
  display:
    fontFamily: Arial
    fontSize: 3rem
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: -0.05em
  hud:
    fontFamily: Arial
    fontSize: 1.5rem
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
  sm: 4px
  md: 10px
  lg: 18px
  frame: 22px
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
  briefing-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 32px
  primary-action:
    backgroundColor: "{colors.tactical}"
    textColor: "{colors.foreground}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.md}"
    padding: 16px
  objective-badge:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.foreground}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.pill}"
    padding: 8px
  danger-badge:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.foreground}"
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

Harbor Breach is a compact first-person tactical shooter for desktop browsers. The player clears hostile bots inside a concrete port warehouse, then reaches the planted device and holds the defuse action before detonation.

## Core Loop

Move and listen, acquire a target, fire controlled shots, reload behind cover, clear the route, reach the B site, and hold to defuse. A round lasts roughly one minute and immediately exposes the next tactical decision.

## Visual Direction

The environment uses procedurally textured concrete, metal wall panels, deep blue-black distance fog, and sodium amber work lights. Tactical teal communicates player status and successful actions; danger red is reserved for incoming damage and the device timer. A compact radar exposes only alerted enemies.

## Layout

The first-person canvas dominates the frame. Round and objective information sit above, while health, armor, ammunition, and contextual controls occupy the lower edge. On narrow screens, keep the viewport and fire control visible before secondary labels.

## Motion

Camera bob and footsteps respond to movement. The rifle sways, kicks, flashes, fires continuously while held, and tilts through a visible reload arc. Enemies animate their stride and muzzle flash; damage kicks the view and briefly washes the frame red. The device progress ring fills only while the player actively holds the defuse input.

## Audio

Gunfire uses a short filtered noise burst layered with a low-frequency mechanical crack. Footsteps use quieter filtered impacts, while UI, hit, elimination, and objective states keep short tonal cues so every sound has a distinct gameplay meaning.

## Signature Differentiator

The circular defuse progress ring is the signature element. It turns the final interaction into a legible high-pressure hold action without obscuring the center crosshair.

## Do's and Don'ts

- Do make walls, enemies, the device, and the extraction path distinguishable by silhouette and contrast.
- Do keep hit, reload, damage, elimination, and defuse feedback immediate.
- Do use original names, colors, maps, and assets.
- Don't copy Counter-Strike logos, maps, weapon models, or audio.
- Don't hide critical ammunition or objective state behind decorative panels.
