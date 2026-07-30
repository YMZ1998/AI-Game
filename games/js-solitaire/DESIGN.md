---
version: "alpha"
name: Desktop Solitaire
description: A compact Klondike table inspired by classic desktop solitaire, with direct card manipulation and clear foundations.
colors:
  primary: "#FFFFFF"
  canvas: "#008080"
  surface: "#008000"
  accent: "#1084D0"
  danger: "#B42318"
  focus: "#03FFFF"
typography:
  display:
    fontFamily: Arial
    fontSize: 1rem
    fontWeight: 700
    lineHeight: 1
  body:
    fontFamily: Arial
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: 4px
  md: 8px
spacing:
  sm: 8px
  md: 16px
components:
  card:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.sm}"
  move-target:
    backgroundColor: "{colors.focus}"
    size: 2px
---

## Overview

Keep the upstream Windows-inspired Klondike identity while making the table fit the portal viewport.

## Core Loop

Reveal cards, build alternating descending columns, move aces into foundations, and clear the tableau.

## Layout

The 660-by-440 authored board scales down as one unit on narrow displays. The new-game action stays above the table.

## Accessibility

Click-to-move remains available alongside drag interaction. Focus indicators and readable controls must not depend on card color alone.

## Do's and Don'ts

- Do preserve the MIT license and original win animation.
- Do keep direct manipulation responsive.
- Don't alter Klondike placement rules.
- Don't introduce remote assets or analytics.
