# PLAYROOM local adaptation

This vendored build is based on `hathora/TOSIOS-hathora`.

The source under `source/` contains the local changes used for this build:

- Hathora Cloud room creation and discovery were replaced with same-origin Colyseus matchmaking.
- Client navigation stays under the embedded PLAYROOM path.
- The local server is bundled as `server/tosios-server.cjs`.
- The hall proxies `/tosios` WebSocket and matchmaking traffic to the internal room process.

The browser only needs the hall address on port `3003`; port `3008` is an internal loopback service started and stopped with the development hall.
