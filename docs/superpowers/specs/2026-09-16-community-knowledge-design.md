# Community Knowledge Design

**Parent:** [ContextCue V2 Master Design](2026-09-16-contextcue-v2-master-design.md)  
**Delivery phase:** C  
**Dependencies:** Versioned card repository and hybrid retriever from phase A

## 1. Goal

Turn local context contributions into an inspectable, human-reviewed knowledge workflow without presenting anonymous or synthetic material as verified cultural truth.

## 2. Roles

- **Learner:** reads approved cards and public candidate summaries.
- **Anonymous contributor:** creates a contribution or adds a perspective using a browser-generated contributor ID.
- **Reviewer:** signs into the local review workspace and records moderation decisions.
- **System:** performs validation, state transitions, versioning, and retrieval eligibility. It never approves content autonomously.

Anonymous contributor IDs help detect repeated submissions from one browser. They do not verify identity or residence.

## 3. Domain records

### Contribution

- contributor ID;
- expression or event;
- scenario description;
- scenario family;
- relationship, channel, and formality;
- contributor's interpretation;
- plausibility conditions;
- counterconditions;
- do-not-assume guidance;
- suggested safe action;
- direct-experience statement;
- consent and privacy acknowledgement;
- moderation status and timestamps.

### Card candidate

A candidate groups contributions about a sufficiently similar cue and setting. Grouping suggestions may use retrieval, but a reviewer confirms every merge. Automatic grouping cannot discard or publish content.

### Perspective

A perspective retains its original contributor and candidate linkage. Two perspectives count toward readiness only when their anonymous contributor IDs differ and their content is not a normalized duplicate.

### Review

- reviewer pseudonymous ID;
- privacy decision;
- stereotype-risk decision;
- evidence-scope decision;
- perspective-quality decision;
- counterexample decision;
- final action;
- decision note;
- timestamp.

### Approved card version

Approval creates an immutable snapshot with a monotonically increasing version. Editing an approved card creates a new candidate version. Old versions remain auditable and become superseded rather than overwritten.

## 4. State machine

```text
pending
→ collecting_perspectives
→ ready_for_review
→ approved | needs_revision | rejected
approved → superseded | archived
needs_revision → ready_for_review
```

Illegal transitions return HTTP 409. Model output cannot change state.

## 5. Readiness rules

A candidate becomes `ready_for_review` only when it has:

- at least two non-duplicate perspectives from different anonymous contributor IDs;
- a do-not-assume statement;
- at least one counterexample;
- a safe next action;
- an evidence-scope statement;
- no detected direct identifier requiring revision.

Readiness is a workflow state, not approval.

## 6. Approval rules

Reviewer approval requires affirmative checks for:

- privacy;
- stereotype risk;
- conditional wording;
- perspective diversity;
- counterexample quality;
- safe-action quality;
- evidence-scope accuracy.

The reviewer may edit presentation wording but may not rewrite a contributor statement and continue attributing it to that contributor. Material edits create an editorial field with explicit provenance.

## 7. Privacy checks

Deterministic checks flag likely:

- email addresses;
- phone numbers;
- student IDs;
- URLs containing private tokens;
- full names introduced through labels;
- long pasted conversations;
- precise private locations when unnecessary.

Flagged submissions remain client-side until the contributor edits them. The first version does not send community submissions to Gemini for privacy screening.

## 8. Provenance labels

| Stored state | Public label |
|---|---|
| synthetic seed | Synthetic seed |
| pending/collecting | Pending contribution |
| ready for review | Awaiting community review |
| approved without verified identities | Community-reviewed |
| verified identities in a future system | Peer-verified |

The V2 product cannot produce the final label.

## 9. Retrieval eligibility

- `approved_card_versions` are eligible for trusted community retrieval.
- synthetic seeds remain eligible as lower-trust prototype evidence and keep their label.
- pending, collecting, ready, needs-revision, rejected, superseded, and archived candidates are ineligible.
- approval writes the card version and queues embedding generation as one transaction boundary; the card remains lexical-only until embedding succeeds.
- retrieval never exposes contributor or reviewer identifiers.

## 10. Reviewer authentication

Hackathon mode uses a server-side `REVIEWER_TOKEN`.

1. Reviewer submits the token over the login endpoint.
2. Backend compares a constant-time hash.
3. Backend issues a signed, short-lived, HttpOnly, SameSite cookie.
4. Reviewer endpoints validate the cookie.
5. Logout invalidates the session identifier.

The token never enters local storage, URL query strings, application logs, or agent state.

## 11. API

### Community

```text
POST /api/v2/community/contributions
GET  /api/v2/community/candidates
GET  /api/v2/community/candidates/{candidate_id}
POST /api/v2/community/candidates/{candidate_id}/perspectives
GET  /api/v2/community/contributions/{contribution_id}/status
```

Public candidate responses contain sanitized display content and workflow status. They omit internal flags and identities.

### Reviewer

```text
POST /api/v2/reviewer/login
POST /api/v2/reviewer/logout
GET  /api/v2/reviewer/queue
GET  /api/v2/reviewer/candidates/{candidate_id}
POST /api/v2/reviewer/candidates/{candidate_id}/decision
GET  /api/v2/reviewer/cards/{card_id}/versions
```

Decision requests include expected candidate version to prevent lost updates.

## 12. User experience

### Community page

- explain the lifecycle;
- contribute a new cue or event;
- find a similar candidate before creating a duplicate;
- add a conditional perspective;
- track a submitted contribution by local receipt ID;
- show exactly which review requirement remains.

### Review Workspace

- queue grouped by readiness state;
- side-by-side perspectives;
- privacy and stereotype flags;
- source and evidence-scope editor;
- counterexample preview;
- retrieval preview;
- approve, request revision, reject;
- version history.

## 13. Tests

- blank, oversized, and identifier-containing submissions are rejected or flagged as specified;
- same contributor cannot satisfy two-perspective readiness;
- normalized duplicates do not satisfy readiness;
- readiness requires do-not-assume, counterexample, safe action, and evidence scope;
- unauthorized review endpoints return 401;
- invalid transitions return 409;
- stale version decisions return 409;
- approval creates one immutable version;
- approved version enters eligible retrieval;
- pending content never enters eligible retrieval;
- public API omits contributor IDs and reviewer notes;
- labels map exactly to provenance state.

## 14. Definition of done

- a contributor can submit and add a perspective;
- the UI explains remaining readiness requirements;
- reviewer login uses an HttpOnly session;
- reviewer can request revision, reject, or approve;
- approved version is immutable and auditable;
- only eligible versions enter trusted retrieval;
- no V2 path displays peer-verified;
- all workflow, authorization, privacy, and retrieval tests pass.

## 15. Non-goals

- institutional identity verification;
- automated cultural-truth scoring;
- public reviewer profiles;
- reputation points;
- social comments or direct messaging;
- automatic approval by Gemini;
- importing private chat histories.

