# Design QA

- Source visual truth: `source-option-3.png`
- Implementation screenshot: `implementation-1440x1024.png`
- Responsive screenshot: `implementation-mobile-390x844.png`
- Combined comparison: `design-comparison.png`
- Source pixels: 1536 × 1024
- Implementation pixels / CSS viewport: 1440 × 1024 at device scale 1
- Responsive viewport: 390 × 844 at device scale 1
- Density normalization: both desktop images are 1024 px high and were placed unscaled side by side; the source's additional 96 px of width was retained.
- State: initial centred bubble, speech visible, idle animation active

## Full-view comparison evidence

The combined comparison preserves the source's near-black canvas, cobalt/violet ambient glow, luminous blue orb, comma eyes, monospace symbol mouth, attached outlined speech bubble, and quiet listening status. The implementation intentionally omits the two source action buttons because the user narrowed the requested scope to only the draggable bubble and speech bubble. The implementation's orb is slightly larger and more central, which gives the drag target a comfortable hit area without changing the hierarchy.

## Focused region comparison evidence

No extra focused crop was needed: the character face, mouth symbols, speech copy, outline, highlight, and status label are all clearly readable at native resolution in the full-height comparison. The separate 390 × 844 capture verifies the small-screen character treatment and speech placement.

## Findings

- No actionable P0, P1, or P2 differences remain.
- Fonts and typography: hierarchy and contrast match the restrained source direction; punctuation uses a dedicated monospace stack and remains legible.
- Spacing and layout rhythm: the desktop composition retains broad negative space; the mobile view has no horizontal or vertical overflow.
- Colors and visual tokens: near-black, electric blue, cyan, and violet remain faithful to the selected direction with accessible foreground contrast.
- Image quality and asset fidelity: the orb is rendered crisply at both tested sizes with no raster scaling artifacts; the user-requested comma and symbol facial features remain live text so they stay sharp.
- Copy and content: the speech line matches the source; the page title was simplified for the character playground and the unrequested source actions were removed.
- Accessibility and interaction: the drag target has a visible keyboard focus state, arrow-key movement, reduced-motion support, and a descriptive accessible label.

## Interaction verification

- Pointer drag moved the character from its origin to `translate3d(260px, 108px, 0px)` and remained inside the stage.
- Arrow-key movement is available on the focused character.
- Desktop and mobile screenshots rendered without page overflow.
- Browser console warnings/errors checked: none.

## Comparison history

- Initial pass: comma glyphs read as rotated apostrophes/quotation marks (P2).
- Fix: removed the 180-degree rotation and recaptured the implementation.
- Post-fix evidence: both eyes now read as downward comma glyphs in the desktop and mobile captures; no actionable P0/P1/P2 findings remain.

## Follow-up polish

- P3: the synthetic orb is cleaner and less particulate than the generated reference; this is acceptable for a lightweight interactive HTML prototype.

final result: passed
