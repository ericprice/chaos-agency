# Chaos Agency

Editable JSON configuration
---------------------------

The site supports updating a few behaviors at runtime via JSON files in `public/`.

1) `public/statements.json`
    - Statements have a quote field and an attribution field.
    - `cycleMs` controls total time per statement (including the hidden gap).
    - `gapMs` controls how long the statement is hidden between transitions.

2) `public/parallax.json`
   - Controls the shape parallax effect:
     - `moveScale` (number): overall cursor→movement scale.
     - `depthBase` (number): minimum movement factor for the farthest shape.
     - `depthRange` (number): additional movement factor scaled by depth.
     - `rotationScale` (number): rotation sensitivity to cursor.
     - `invertX` (boolean): flip X motion.
     - `invertY` (boolean): flip Y motion.

3) `public/contact.json`
   - Controls the footer email link:
     - `{ "email": "user@example.com" }`
