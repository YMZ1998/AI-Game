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
  nitro-meter:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    fillColor: "{colors.accent}"
    activeColor: "{colors.focus}"
  touch-action:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    borderColor: "{colors.accent}"
    activeColor: "{colors.focus}"
---

## Overview

Keep HexGL's authored 3D track, vehicle, HUD, quality settings, and keyboard or touch control identity.

## Layout

The WebGL viewport fills the available frame. Menus and credits layer over it without introducing a second shell.

The race HUD adds a compact cyan nitro meter at the lower edge. Drift charging and nitro release switch to the focus green only while the action is active.

## Accessibility

The quality selector must remain reachable on lower-power devices. Preserve visible control help before the race starts.

Keyboard help must name WASD and arrow-key driving, Shift for drifting, and Space for nitro. Touch mode must expose large, separated drift and nitro action buttons.

## Do's and Don'ts

- Do keep the upstream asset credits available.
- Do remove external analytics from the local copy.
- Don't replace the authored cyan racing HUD with portal colors.
