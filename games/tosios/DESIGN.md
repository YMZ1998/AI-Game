---
version: "alpha"
name: Pixel Dungeon Signal
description: A preserved multiplayer pixel shooter adapted from cloud matchmaking to a local PLAYROOM room service.
colors:
  primary: "#FFF4CF"
  canvas: "#25131A"
  surface: "#3B1C4C"
  accent: "#FFCC57"
  danger: "#EE5B7D"
  focus: "#74D9FF"
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
  sm: 4px
  md: 8px
spacing:
  sm: 8px
  md: 16px
components:
  dungeon-viewport:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
  room-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 3px
---

## Overview

Preserve TOSIOS's pixel dungeon, room list, match settings, Pixi rendering, HUD, monsters, and touch controls. The PLAYROOM adaptation replaces Hathora cloud matchmaking with a local Colyseus process proxied through the hall.

## Layout

The home screen centers name and room controls. During a match, the game viewport fills the frame and the HUD remains overlaid at the authored edges.

## Accessibility

Room controls remain labeled and keyboard-operable. Mobile players retain both virtual joysticks.

## Do's and Don'ts

- Do expose multiplayer through the same public hall address and port.
- Do retain the upstream MIT license and source history.
- Don't make cloud credentials, remote discovery, or external analytics a prerequisite.
