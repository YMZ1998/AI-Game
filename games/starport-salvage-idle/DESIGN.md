---
version: "alpha"
name: Starport Salvage Idle
description: A portrait-first miniature salvage station where every resource gain is visible in the production line.
colors:
  primary: "#F2F7FF"
  canvas: "#07111F"
  surface: "#10263A"
  surfaceRaised: "#17344A"
  accent: "#52E6D6"
  forge: "#FF9A52"
  currency: "#FFD86B"
  danger: "#FF6B7D"
  focus: "#9EEBFF"
typography:
  display:
    fontFamily: "Arial Narrow, Microsoft YaHei, sans-serif"
    fontSize: 2rem
    fontWeight: 900
    lineHeight: 1
  body:
    fontFamily: "Arial, Microsoft YaHei, sans-serif"
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.45
rounded:
  sm: 8px
  md: 16px
  pill: 999px
spacing:
  xs: 6px
  sm: 10px
  md: 16px
components:
  resource-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.pill}"
  station-panel:
    backgroundColor: "{colors.surfaceRaised}"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
  primary-action:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.sm}"
  forge-action:
    backgroundColor: "{colors.forge}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.sm}"
  currency-badge:
    backgroundColor: "{colors.currency}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.pill}"
  danger-action:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.sm}"
  focus-ring:
    backgroundColor: "{colors.focus}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.pill}"
---

## Overview

Present the complete MVP loop in one portrait screen: salvage scrap, watch drones and the furnace work, fulfill alloy orders, and reinvest credits into three production lines.

## Core Loop

Tap or hold the wreck, receive scrap, refine it into alloy, deliver an order for credits, buy an upgrade, and immediately see the station accelerate.

## Layout

- Resource chips remain at the top.
- The animated miniature station occupies the visual center.
- Upgrade cards and the primary order actions stay in the lower half.
- Desktop layouts preserve the portrait station instead of stretching controls across the viewport.

## Motion

Motion must communicate production state. Drones travel only while salvaging, the furnace pulses while refining, the conveyor moves with available scrap, and rewards use short floating labels.

## Accessibility

All actions use real buttons, visible focus rings, 44px minimum touch targets, text labels alongside icons, reduced-motion support, and independent music/effects switches.

## Do's and Don'ts

- Do make resource flow readable without relying on color alone.
- Do keep the first upgrade and first order reachable quickly.
- Do keep offline calculations clamped and deterministic.
- Don't add monetization, multiplayer, combat, prestige, or random events to the MVP.
- Don't hide primary actions behind hover-only interactions.
