---
version: "alpha"
name: Warm Casino Blackjack
description: A focused single-player blackjack table with warm gold controls, clear scores, and quick rematches.
colors:
  primary: "#FFF8E7"
  canvas: "#123E2A"
  surface: "#1F6B45"
  accent: "#E2A53A"
  danger: "#D74343"
  focus: "#8CD8FF"
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
  action-button:
    backgroundColor: "{colors.accent}"
    textColor: "#1B1205"
    rounded: "{rounded.sm}"
  card:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.sm}"
---

## Overview

Present a fast, readable player-versus-dealer blackjack round with no account, currency, or real-money framing.

## Core Loop

Read the opening hand, choose hit or stand, compare against the dealer, then immediately start another round.

## Difficulty

The dealer follows the standard stand-on-seventeen rule. The challenge comes from probability and risk choice rather than hidden difficulty scaling.

## Accessibility

Primary actions need keyboard focus, Chinese labels, persistent score text, and sound that can be disabled.

## Do's and Don'ts

- Do preserve the MIT license and upstream card artwork.
- Do describe betting concepts only as card-game rules.
- Don't add purchases, wagering, or external tracking.
- Don't rely on sound as the only outcome feedback.
