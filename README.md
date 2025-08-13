# chaos-agency

Publicly editable JSON configuration
-----------------------------------

The site supports updating a few behaviors at runtime via JSON files in `public/`.

1) `public/statements.json`
   - Two supported formats:
     - Simple array of items (legacy):
       - Each item is either a string, or an object `{ "quote": string, "attribution": string }`.
     - Config object (recommended):
       - `{ "cycleMs": number, "gapMs": number, "items": [ ...items as above... ] }`
   - Behavior:
     - The app fetches this file on load and cycles through statements.
     - `cycleMs` controls total time per item (including the hidden gap).
     - `gapMs` controls how long the statement is hidden (opacity 0) between items.

2) `public/parallax.json`
   - Controls the shape parallax effect:
     - `moveScale` (number): overall cursor→movement scale.
     - `depthBase` (number): minimum movement factor for the farthest shape.
     - `depthRange` (number): additional movement factor scaled by depth.
     - `rotationScale` (number): rotation sensitivity to cursor.
     - `invertX` (boolean): flip X motion.
     - `invertY` (boolean): flip Y motion.
   - All parameters are optional; missing fields fall back to defaults.

3) `public/contact.json`
   - Controls the footer email link:
     - `{ "email": "user@example.com" }`
   - The same value is used for both the link label and `mailto:` href.

Notes
-----
- Files are fetched with `cache: 'no-store'` and a timestamp query param to avoid stale caching.
- Edits take effect on page reload.
