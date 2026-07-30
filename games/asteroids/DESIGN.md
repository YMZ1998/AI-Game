---
version: "alpha"
name: Vector Space Cabinet
description: A preserved monochrome Asteroids vector field with immediate keyboard play.
colors:
  primary: "#FFFFFF"
  canvas: "#000000"
  surface: "#111111"
  accent: "#FFFFFF"
  danger: "#FF5A5A"
  focus: "#62D7FF"
typography:
  display:
    fontFamily: Arial
    fontSize: 2rem
    fontWeight: 800
    lineHeight: 1
  body:
    fontFamily: Arial
    fontSize: 0.875rem
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: 0px
  md: 4px
spacing:
  sm: 8px
  md: 16px
components:
  vector-field:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 3px
---

## Overview

The source game is intentionally sparse: white vector geometry, black space, terse score text, and direct keyboard response.

## Layout

The game canvas owns the viewport. Avoid decorative panels inside the game frame.

## Accessibility

Keep the control instructions visible before play and retain a strong focus state around the game surface.

## Do's and Don'ts

- Do preserve the original collision and movement feel.
- Do retain bundled sound attribution and license files.
- Don't introduce remote tracking or low-contrast chrome.
