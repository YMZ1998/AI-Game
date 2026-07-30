---
version: "alpha"
name: Electric Velocity
description: A preserved WebGL racing cockpit with cyan energy, dark city geometry, and high-speed HUD telemetry.
colors:
  primary: "#D8F8FF"
  canvas: "#02060D"
  surface: "#081828"
  accent: "#00E5FF"
  danger: "#FF375F"
  focus: "#7CFF6B"
typography:
  display:
    fontFamily: Arial
    fontSize: 2.5rem
    fontWeight: 900
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
  race-viewport:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.accent}"
  focus-ring:
    backgroundColor: "{colors.focus}"
    size: 3px
---

## Overview

Keep HexGL's authored 3D track, vehicle, HUD, quality settings, and keyboard or touch control identity.

## Layout

The WebGL viewport fills the available frame. Menus and credits layer over it without introducing a second shell.

## Accessibility

The quality selector must remain reachable on lower-power devices. Preserve visible control help before the race starts.

## Do's and Don'ts

- Do keep the upstream asset credits available.
- Do remove external analytics from the local copy.
- Don't replace the authored cyan racing HUD with portal colors.
