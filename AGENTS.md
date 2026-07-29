# Project Instructions

## DESIGN.md

- Before changing a game's UI, read the nearest `games/<game>/DESIGN.md`.
- Treat its tokens as the source of truth for visual intent. Keep implementation values aligned, and update the document when the design system changes.
- Keep each game's visual identity independent; do not copy tokens between games unless the task explicitly calls for a shared system.
- Run `npm run design:lint` from the changed game directory before finishing UI work.
- Use `npm run design:export:css` for Tailwind v4 CSS tokens or `npm run design:export:tokens` for DTCG JSON when generated tokens are needed.
