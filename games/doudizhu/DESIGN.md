---
version: "alpha"
name: Jade Table
description: A lively modern Chinese card-room identity combining deep jade felt, warm paper cards, restrained gold, and clear multiplayer status.
colors:
  primary: "#173F35"
  primary-deep: "#081D19"
  surface: "#F5EAD1"
  foreground: "#211813"
  accent: "#D5A94C"
  danger: "#9E392D"
  focus: "#78D4FF"
  info: "#4D9DCE"
  muted: "#8FA79E"
typography:
  display:
    fontFamily: Georgia
    fontSize: 2.4rem
    fontWeight: 900
    lineHeight: 1
    letterSpacing: 0.04em
  body-md:
    fontFamily: Arial
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.5
  card-rank:
    fontFamily: Georgia
    fontSize: 1.3125rem
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: -0.07em
  label-caps:
    fontFamily: Arial
    fontSize: 0.6875rem
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: 0.12em
rounded:
  sm: 5px
  md: 8px
  lg: 17px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  game-table:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.body-md}"
  chrome:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.surface}"
    typography: "{typography.body-md}"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 32px
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.foreground}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.md}"
    padding: 12px
  button-hint:
    backgroundColor: "{colors.info}"
    textColor: "{colors.foreground}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.md}"
    padding: 12px
  result-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.surface}"
    typography: "{typography.display}"
    rounded: "{rounded.pill}"
    size: 66px
  player-meta:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.muted}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.md}"
    padding: 8px
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 3px
  memory-counter:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.surface}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.md}"
    padding: 8px
  bot-marker:
    backgroundColor: "{colors.info}"
    textColor: "{colors.foreground}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.pill}"
    padding: 4px
---

## Overview

Jade Table presents 斗地主 as a lively, polished card room rather than a noisy casino. Deep green felt, warm cream cards, and sparse gold details create ceremony and hierarchy; seal red is reserved for decisive outcomes. The three-seat hierarchy follows familiar mobile card-game ergonomics while all characters, marks, and visual assets remain original.

## Colors

Jade and near-black green form the environmental layers. Cream carries readable surfaces and card faces. Gold identifies the landlord role, primary actions, and active-turn cues. Blue is reserved for hints and informational actions. Red appears only in suits, warnings, and result seals.

## Typography

Use Georgia for the brand, card ranks, and ceremonial result moments. Use Arial with Chinese system fallbacks for controls and supporting text. Small uppercase labels should be compact and strongly weighted.

## Layout

The table remains the visual center. Seat information sits at the edges, the last play occupies the middle, the memory counter sits within quick eye reach, and the player's hand and three primary controls stay anchored to the bottom. LAN room and score-table views use the same material language. Responsive layouts may simplify metadata but must preserve turn, ownership, connection, and playable-card state.

## Elevation & Depth

Use soft inner rings, low-opacity borders, and broad shadows to suggest felt, lacquer, and paper. Avoid shiny gradients that make the room feel digital or arcade-like.

## Shapes

Cards use compact rounded corners; panels use larger soft corners; seals and role markers are circular or pill-shaped. Keep geometry disciplined and symmetrical around the table.

## Components

Gold buttons represent committed actions, while blue is reserved for hints, informational actions, and clearly identified bot seats. Bot portraits use a restrained antenna-and-blue-eye treatment instead of a separate visual theme. Cream panels handle bidding, room entry, score sheets, and results. Active seats receive a subtle gold border and glow. Focus rings use bright blue so keyboard state remains distinct from game-state gold.

## Signature Differentiator

Every match is visually anchored by three face-up landlord cards above a restrained gold landlord seal. This small ceremonial center remains visible in both solo and LAN play and is the table's most recognizable motif.

## Do's and Don'ts

- Do keep card faces, selected cards, turn state, connection status, and disabled controls unmistakable.
- Do retain Chinese cultural cues through proportion, typography, and seal motifs.
- Don't overuse gold, red, grain, or ornamental borders.
- Don't remove keyboard focus or reduced-motion behavior.
