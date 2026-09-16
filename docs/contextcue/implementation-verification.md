# Implementation verification

Updated 16 September 2026 after replacing the original Streamlit demo with the supplied React/Vite interface.

## Automated checks

- React service tests verify API paths, request payloads, and visible backend errors.
- React journey tests verify situation/context submission, uncertainty guidance, synthetic provenance, and practice feedback.
- TypeScript type checking and the Vite production build pass.
- Backend tests cover health, retrieval, no-match behavior, input boundaries, provider validation, and pending-review contributions.
- The authored evaluation set checks retrieval behavior for 15 examples. It is not an independent user study.

## Product safeguards represented in the UI

- Guidance uses possible meanings rather than a verdict about the speaker.
- Every retrieved seed card is labelled synthetic and awaiting community review.
- Evidence includes both what a source supports and what it cannot establish.
- User contributions enter a separate `pending_review` queue and do not become cards automatically.
- Saved cards and practice status remain in browser local storage.

## Required real-world validation

- Singapore campus reviewers must review individual cards before any peer-verified claim.
- Students from multiple countries and language backgrounds must test comprehension and usability.
- The team must record observed retrieval misses and harmful or misleading interpretations.
