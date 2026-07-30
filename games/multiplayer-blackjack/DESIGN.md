---
version: "alpha"
name: Midnight Blackjack Room
description: A room-based LAN blackjack table with high-contrast cards, shared turn feedback, and lightweight table chat.
colors:
  primary: "#F7F1E4"
  canvas: "#10151B"
  surface: "#173A31"
  accent: "#F4BD50"
  danger: "#E45757"
  focus: "#72D7FF"
typography:
  display:
    fontFamily: Arial
    fontSize: 3rem
    fontWeight: 900
    lineHeight: 1
  body:
    fontFamily: Arial
    fontSize: 1rem
    fontWeight: 600
    lineHeight: 1.5
rounded:
  sm: 6px
  md: 14px
spacing:
  sm: 10px
  md: 20px
components:
  room-code:
    backgroundColor: "{colors.accent}"
    textColor: "#14100A"
    rounded: "{rounded.sm}"
  card:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.sm}"
---

## Overview

Keep the upstream create-or-join room flow, adapted to the portal's local network service and fully local assets.

## Core Loop

Create or join a room, wait for the host, take hit-or-stand turns, compare hands with the dealer, and rematch with the same group.

## Social Play

Room codes make joining explicit. Turn ownership, connected players, and results remain visible to everyone at the table.

## Accessibility

Forms use real labels, actions have visible focus, room state is announced in text, and the interface stays usable without audio.

## Do's and Don'ts

- Do preserve the MIT license and upstream author credit.
- Do keep room data in memory and local to the running portal.
- Don't require an external account or database.
- Don't introduce real-money transactions or remote analytics.
