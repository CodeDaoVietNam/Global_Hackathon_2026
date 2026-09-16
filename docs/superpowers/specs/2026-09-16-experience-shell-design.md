# Experience Shell Design

**Parent:** [ContextCue V2 Master Design](2026-09-16-contextcue-v2-master-design.md)  
**Delivery phase:** D  
**Dependencies:** Stable v2 Context Map, practice, learning, community, and reviewer APIs

## 1. Goal

Expose the depth of ContextCue through a coherent, responsive React experience that makes the learning method, evidence, workflow progress, and community governance understandable during normal use and a short hackathon demo.

## 2. Information architecture

Primary navigation:

- Explore
- Context Lab
- Practice Studio
- My Learning
- Community

Review Workspace appears only after a reviewer session is established.

Routes:

```text
/
/explore
/sessions/:threadId
/sessions/:threadId/practice/:practiceId
/learning
/community
/community/candidates/:candidateId
/review
/review/candidates/:candidateId
```

## 3. Visual language

Retain the supplied teal, cream, ink, mist, and coral palette. Use typography and spacing to distinguish:

- facts and evidence;
- hypotheses and uncertainty;
- caution and boundary issues;
- actions and progress;
- provenance state.

The signature visual is the `Understand → Clarify → Respond → Practise → Reflect` trail. It reflects actual graph and learning state.

## 4. Explore

Desktop uses a filter sidebar, card library, and quick situation input. Mobile uses a dismissible filter sheet.

Filters:

- scenario family;
- relationship;
- communication channel;
- formality;
- learning goal;
- evidence level.

Cards show title, confusing cue, short scenario, skill tags, provenance label, and action. Empty states explain whether no data exists or filters removed all matches.

## 5. Context Lab

Desktop layout:

```text
learning trail | Context Map workspace | evidence and agent trace
```

Mobile layout uses ordered sections with sticky stage navigation.

### Context Map sections

- situation summary;
- what we know;
- what remains unclear;
- possible perspectives;
- assumption risks;
- safest next action;
- response strategies.

Each perspective expands to show supporting signals, contradicting signals, evidence, limits, and conditions that change it.

### Evidence rail

- retrieved cards;
- match reason;
- provenance label;
- source support;
- source limitation;
- retrieval mode.

### Agent trace

The trace renders real streaming business events. It must never display model chain-of-thought, full prompts, secrets, or raw exception traces.

## 6. Missing-context flow

When the graph interrupts, the Context Lab preserves current facts and shows up to three focused questions. The learner can answer any subset and resume. A visible action permits an evidence-only result when the learner cannot provide more context.

## 7. Context Switcher

The switcher opens a side panel containing allowed hypothetical fields. Submission renders a comparison:

- changed interpretations;
- unchanged facts;
- changed response strategies;
- changed evidence;
- reason each change occurred.

The hypothetical version has a persistent visual label and cannot silently replace the original session.

## 8. Response Lab and Practice Studio

Response strategies appear as selectable cards with editable drafts. Starting practice carries the selected goal, perspective, and response into Practice Studio.

Practice Studio shows:

- selected learning goal;
- context summary;
- turn counter;
- learner response;
- simulated partner reply;
- visible simulation assumptions;
- coach criteria and evidence;
- retry and continue actions;
- reflection at completion.

Simulated partner, coach, and learner use distinct labels, icons, and colors so model roles cannot be confused.

## 9. My Learning

- sessions explored;
- completed practice runs;
- reflections;
- skill evidence counts;
- explanation of what progress does and does not mean;
- deterministic recommended scenario;
- session history with continue, retry, and delete.

Skill visuals use counts and criteria descriptions. They do not use a single cultural-intelligence score.

## 10. Community and review

Community displays the lifecycle before the contribution form. Candidate pages show perspectives, counterexamples, safe actions, status, and remaining requirements without contributor identity.

Review Workspace displays authentication, queue, side-by-side perspectives, checks, editorial fields, decision note, retrieval preview, and version history.

## 11. Loading and errors

- streaming stages update in place;
- user input remains after every recoverable error;
- retries retain thread and idempotency key;
- lexical fallback is a normal completion state;
- provider errors explain retry without exposing provider payloads;
- 401 reviewer errors return to reviewer login;
- 409 review conflicts reload the latest candidate before another decision.

## 12. Accessibility

- semantic headings and landmarks;
- visible labels for every control;
- keyboard-accessible cards, tabs, dialogs, filters, and comparisons;
- focus enters dialogs and returns to the trigger;
- Escape closes dismissible overlays;
- status is not conveyed by color alone;
- streaming updates use a non-disruptive live region;
- reduced-motion preferences disable nonessential animation;
- narrow viewport support down to 360 CSS pixels;
- text and interactive controls meet WCAG AA contrast targets.

## 13. Frontend organization

```text
frontend/src/
  app/
    router.tsx
    layout/
  features/
    explore/
    context-lab/
    practice/
    learning/
    community/
    review/
  components/
    provenance/
    evidence/
    progress/
    forms/
  services/
    api/
    streaming/
    storage/
  types/
```

Feature folders own their API view models and tests. Server contracts are mapped at the API boundary rather than spread through components.

## 14. Tests

- route and ownership loading;
- Explore filters and empty state;
- Context Map renders facts, gaps, perspectives, and provenance;
- streaming events update trace;
- missing-context resume preserves original facts;
- Context Switcher labels hypothetical results and comparison;
- practice roles and assumptions are distinguishable;
- turn limit and reflection flow;
- My Learning deletion;
- community lifecycle and readiness display;
- reviewer authentication and conflict recovery;
- keyboard navigation and accessible names for critical flows;
- mobile component behavior;
- production build and Nginx SPA fallback.

## 15. Definition of done

- all primary routes are usable on desktop and mobile;
- three signature demo moments are understandable without backend logs;
- provenance and uncertainty are visible at decision points;
- graph progress is backed by real events;
- errors preserve work and offer one clear next action;
- critical keyboard and accessibility tests pass;
- production build and Docker health checks pass;
- connected-browser visual inspection records desktop and mobile evidence when available.

## 16. Non-goals

- native mobile application;
- social feed;
- real-time contributor chat;
- audio or video role-play;
- offline service worker;
- visualized private chain-of-thought;
- a generic chatbot screen as the primary interface.

