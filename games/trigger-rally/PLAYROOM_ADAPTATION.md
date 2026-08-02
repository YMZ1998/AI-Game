# PLAYROOM adaptation

- Removed Google Analytics, remote font loading, and the unused Socket.IO CDN script.
- Retained the upstream client, artwork, tracks, and IndexedDB save behavior.
- Added a visible loading/error state, mounted-path-safe audio, and an in-memory fallback when IndexedDB cannot open.
- Added WASD driving alongside the original arrow-key controls.
- Runs locally through the shared PLAYROOM port.

See `LICENSE.md` for the upstream source-code and content terms.
