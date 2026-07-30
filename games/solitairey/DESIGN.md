---
version: "alpha"
name: Classic Green Solitaire Table
description: A preserved multi-variant solitaire collection with a traditional green felt table and readable playing cards.
colors:
  primary: "#F4F1E8"
  canvas: "#0B5A2B"
  surface: "#174C2D"
  accent: "#F5D76E"
  danger: "#B72D2D"
  focus: "#7ED7FF"
typography:
  display:
    fontFamily: Arial
    fontSize: 2rem
    fontWeight: 800
    lineHeight: 1.1
  body:
    fontFamily: Arial
    fontSize: 1rem
    fontWeight: 500
    lineHeight: 1.5
rounded:
  sm: 4px
  md: 10px
spacing:
  sm: 8px
  md: 16px
components:
  card:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.sm}"
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 3px
---

## Overview

Preserve the upstream collection and its familiar green-table presentation. The main value is breadth: players can switch between sixteen solitaire variants without leaving the game.

## Core Loop

Choose a ruleset, inspect the deal, move legal card sequences, reveal hidden information, and complete the foundations or target layout.

## Layout

The authored desktop table remains intact while the portal shell supplies a responsive viewport and full-screen control.

## Accessibility

Game selection and links must remain keyboard reachable. Cards need sufficient contrast against the table and visible legal-move feedback.

## Do's and Don'ts

- Do preserve every upstream ruleset and the BSD license.
- Do keep the collection usable without remote services.
- Don't merge its visual tokens with the other card games.
- Don't remove the source-code attribution link.
