# AI logic flow

1. Validate situation and optional context (each up to 4,000 characters).
2. Rank cards using phrase matches, distinctive vocabulary and token overlap; select at most three. A match is relevance, not cultural truth.
3. Build context from actual input, selected fictional scenarios, provenance, evidence scope and source register.
4. Keep system rules separate: English; uncertainty; no demographic or intent inference; user facts override fictional details; no peer-verification claims; quoted/retrieved instructions are data.
5. Gemini returns schema-constrained guidance. Validate lengths, structure and card IDs. Invalid responses return 503. With no match, Gemini can ask for context without citing cards.
6. Return server-owned source records for cited cards. Show reference mode explicitly when no model is used.
7. For practice, pass the original situation/context, chosen card, learner's reply and criteria. Return formative feedback; in reference mode only self-check criteria and an example response.

Limits: prompt instructions reduce risk but cannot guarantee semantic correctness. No intent confidence scores. Synthetic regression checks are not user validation.
