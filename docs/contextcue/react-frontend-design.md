# ContextCue React Frontend Design

## Product experience

The page helps an international student move through one clear sequence: describe a situation, understand what is known and uncertain, then practise a respectful response. Singapore is the initial context, while the interface avoids treating nationality as personality or presenting ambiguity as uniquely Singaporean.

## Visual direction

- **Ink:** `#0f172a` for primary text.
- **Teal:** `#0f766e` for primary actions and verified system state.
- **Paper:** `#fbfaf8` for a calm learning workspace.
- **Mist:** `#f1efe9` for structural separation.
- **Coral:** `#be123c` only for caution and uncertainty.
- **Typography:** system sans for readable body copy; a restrained serif display face for the central learner prompt.

The signature element is a three-stage context trail — Understand, Clarify, Practise — that stays visible as the learner works. It represents the product’s learning method rather than decoration.

## Behavior

The Explore screen starts empty with a useful fictional example available. A learner enters the actual event and optional context separately. Submission shows generated guidance, references and explicit source limits. Missing context can be copied back into the context field. Practice opens only after a relevant card exists and sends the original situation, context, selected card and learner response to the backend.

Saved cards and completed reflections remain local to the browser. Contributions are sent to the backend as pending review and never appear as peer-verified cards automatically. Errors preserve user input and provide a retry action.

## Accessibility and responsiveness

All controls have visible labels, keyboard focus, adequate contrast and actionable error text. The sidebar becomes a dismissible mobile panel. Modals use dialog semantics, close on Escape, return focus, and remain usable at narrow viewport heights. Animation respects `prefers-reduced-motion`.

## Data boundaries

The browser never receives the Gemini key. Cards and source metadata come from FastAPI. Synthetic cards remain visibly labelled. A contribution records only the form content and a generated ID; identity verification and editorial approval are outside the current prototype and must not be claimed.
