# Portfolio Therapist — Ambient Bubble Design

## Purpose

The ambient bubble is a compact AI character for Portfolio Therapist. It communicates behavioural-finance findings without resembling a human therapist, medical professional, or financial adviser.

The character provides personality and conversation. Portfolio analytics remain the source of truth.

## Core Character

- A small, draggable, translucent orb.
- Two comma glyphs form the eyes.
- No mouth, symbol string, emoji, or `LISTENING` status.
- The orb softly breathes and changes colour with its emotion.
- The default diameter is `180px`.
- The adjustable diameter range is `120px–280px`.
- The speech bubble travels with the orb.

## Visual Direction

- Canvas: near-black navy.
- Character: electric blue glass with cyan edges and a violet ambient glow.
- Speech panel: translucent navy with a thin blue outline.
- Typography: restrained system sans serif for interface copy.
- Personality: intelligent, slightly mischievous, calm enough for finance.
- Keep the surrounding page sparse. Do not add portfolio charts or dashboard cards to this character showcase.

## Emotion States

All emotions retain comma eyes. Expression comes from the comma positions, tilt, glow colour, and dialogue.

### Calm

- Eyes lean gently inward.
- Colour treatment is cool and slightly desaturated.
- Example dialogue: “Your portfolio is unusually quiet today. I am suspicious, but impressed.”

### Curious

- One eye sits slightly higher than the other.
- Standard electric-blue colour treatment.
- Example dialogue: “Interesting. What made this trade feel different from the last three?”

### Concerned

- Eyes tilt inward more strongly.
- Warm amber highlights appear in the face.
- Example dialogue: “You added to the same position again. Let us look at the pattern first.”

### Roast

- Eyes tilt outward with a brighter magenta treatment.
- Example dialogue: “Your long-term strategy has survived approximately forty-seven seconds.”

## Controls

- Four emotion buttons: `Calm`, `Curious`, `Concerned`, and `Roast`.
- A range slider adjusts bubble size.
- Minus and plus buttons provide reliable keyboard-accessible size adjustment.
- A `Play demo conversation` button runs a short simulated exchange.

## Simulated Conversation

The demo sequence is intentionally short:

1. **You:** “I only make long-term trades.”
2. **Portfolio Therapist:** “You made fourteen trades in thirty minutes.”
3. **You:** “That was research.”
4. **Portfolio Therapist:** “Of course. Very fast research.”

Each line triggers the matching eye expression and speech animation.

## Speech Animation

- The speech panel floats subtly while idle.
- Switching emotions first shows three animated typing dots.
- The new line fades upward with a brief blur-to-sharp transition.
- The speaker label distinguishes `YOU` from `PORTFOLIO THERAPIST`.
- Motion must be disabled when `prefers-reduced-motion` is active.

## Drag Behaviour

- Mouse and touch can drag the entire character group.
- The character remains inside the visible stage.
- Dragging pauses the idle breathing animation and brightens the orb.
- Keyboard users can focus the character and move it with arrow keys.
- Holding Shift while using arrow keys moves it in larger steps.

## Responsive Behaviour

- Desktop: speech sits to the upper-right of the orb.
- Small screens: speech overlaps the upper-right edge without hiding both eyes.
- Controls remain fixed near the bottom and wrap when necessary.
- The page must not introduce horizontal or vertical overflow at `390 × 844`.

## Accessibility

- The draggable character has a descriptive accessible label.
- Emotion controls use native buttons with visible focus states.
- The size control has an explicit label and numeric output.
- Speech updates use an `aria-live` region.
- Colour is not the only emotion signal; eye position and dialogue change too.
- Reduced-motion preferences are respected.

## Implementation Files

- `src/App.jsx` — drag logic, size state, emotion selection, and simulated conversation.
- `src/styles.css` — orb appearance, expressions, responsive layout, and animation.
- `AGENTS.md` — durable prototype constraints.
- `design-qa.md` — visual and interaction verification notes.

## Product Guardrails

- Dialogue must describe detected behaviour rather than inventing facts.
- Do not recommend buying or selling securities.
- Do not label the user with a medical or psychological diagnosis.
- Roast and serious explanations should remain traceable to the same evidence.
