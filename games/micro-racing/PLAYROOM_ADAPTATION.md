# PLAYROOM adaptation

- Rebuilt the client and server for the current Node runtime.
- Routes WebSocket traffic through `/micro-racing-service` on the hall port.
- Replaced the native server-side canvas thumbnail step with deterministic SVG thumbnails.
- Bundled server dependencies so the hall can start the service without a second install.

The upstream project is MIT licensed; see `LICENSE.md`.
