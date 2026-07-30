---
version: "alpha"
name: Isometric Pit Grid
description: A technical WebGL2 racing room with compact telemetry, map cards, and an isometric track as the visual anchor.
colors:
  primary: "#F4F6F5"
  canvas: "#172521"
  surface: "#273A34"
  accent: "#65E38B"
  danger: "#F06B5F"
  focus: "#7CD7FF"
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
  sm: 4px
  md: 8px
spacing:
  sm: 8px
  md: 16px
components:
  race-board:
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

Preserve the original WebGL2 isometric race, generated tracks, room controls, bots, chat, and score screen. PLAYROOM starts its real-time service together with the hall.

## Layout

Room selection and car configuration remain compact panels; the race canvas dominates once a match begins.

## Accessibility

Keyboard controls remain documented in-game. Buttons and room fields retain their authored labels and focus behavior.

## Do's and Don'ts

- Do proxy HTTP and WebSocket traffic through the hall's public port.
- Do retain bots, track thumbnails, and upstream notices.
- Don't require a second user-facing address or native canvas dependency.
