# Learning Studio Design

**Parent:** [ContextCue V2 Master Design](2026-09-16-contextcue-v2-master-design.md)  
**Delivery phase:** B  
**Dependency:** Completed Context Intelligence Agent and Context Map artifact

## 1. Goal

Turn a grounded Context Map into an active learning cycle: select a communication goal, draft a response, role-play up to three turns, revise with evidence-based coaching, reflect, and record limited practice progress.

## 2. Learning method

```text
Understand
→ choose a goal
→ draft
→ observe a simulated consequence
→ receive criteria-based feedback
→ revise
→ reflect
→ practise a related scenario
```

The simulator is a learning environment. It does not predict what the real speaker will say.

## 3. Practice goals

- clarify meaning;
- confirm responsibility or deadline;
- adapt formality;
- respond to ambiguous humour;
- give actionable feedback;
- receive direct feedback;
- set a respectful boundary.

Each goal maps to two to four observable criteria. Criteria are stored server-side and versioned.

## 4. Practice state

The LangGraph state is extended with:

- selected practice goal;
- role-play configuration;
- practice turns;
- current criteria;
- demonstrated criteria evidence;
- revision suggestions;
- completion reason;
- learner reflection;
- skill evidence updates.

The backend enforces a maximum of three submitted learner responses per practice run.

## 5. Role-play contract

One structured model call per turn returns:

- simulated partner reply;
- simulation assumptions, if any;
- coach summary;
- strengths tied to exact response spans;
- improvements tied to criteria;
- suggested revision;
- criteria evidence;
- whether another turn is useful.

The simulated partner receives only the Context Map, selected perspective, role-play configuration, and conversation turns. It may not invent deadlines, task ownership, prior agreements, protected traits, or unprovided personal history.

If a plausible simulated response needs an extra assumption, that assumption appears explicitly in `simulation_assumptions` and is visually labelled.

## 6. Response Lab

Before role-play, the learner sees up to three strategies selected from clarification, confirmation, boundary-setting, and formal response.

Every strategy includes:

- communication goal;
- editable sample wording;
- tone and formality;
- why it is low risk;
- assumption it avoids;
- conditions where it should not be used.

The learner must type or edit a response before feedback becomes available.

## 7. Coach behavior

The coach evaluates only observable features of the submitted response:

- separates facts and assumptions;
- asks an answerable question;
- makes commitments explicit;
- matches formality to configured context;
- acknowledges explicit discomfort;
- avoids invented details;
- remains actionable and concise.

It gives no personality score, nationality comparison, cultural-intelligence score, or certainty about real-world outcomes.

## 8. Reflection

At completion, the learner answers:

1. What did you initially assume?
2. What would you clarify next time?

The backend validates length and stores reflection separately from model feedback. Reflection remains learner-authored and is never rewritten as if the model wrote it.

## 9. Skill evidence

Skill keys:

- `clarify_before_inferring`
- `make_commitments_explicit`
- `adapt_formality`
- `handle_humour_ambiguity`
- `give_actionable_feedback`
- `receive_direct_feedback`
- `set_respectful_boundaries`
- `use_evidence_carefully`

Each record stores criterion ID, practice run, response span, model result, learner confirmation, and timestamp. Dashboard progress is a count of demonstrated criteria across practice scenarios, with recency and repetition. It is not a psychometric score.

## 10. Recommendations

The recommender is deterministic:

1. prefer a skill with the least recent evidence;
2. select a different scenario family from the previous session;
3. avoid repeating the same card until alternatives are exhausted;
4. provide a reason for the recommendation.

No separate recommendation model is needed in V2.

## 11. API

```text
POST /api/v2/threads/{thread_id}/practice
GET  /api/v2/threads/{thread_id}/practice/{practice_id}
POST /api/v2/threads/{thread_id}/practice/{practice_id}/respond
POST /api/v2/threads/{thread_id}/practice/{practice_id}/reflection
GET  /api/v2/learning/{learner_id}
GET  /api/v2/learning/{learner_id}/sessions
DELETE /api/v2/learning/{learner_id}/sessions/{thread_id}
```

Owner mismatch returns 404. A fourth response returns 409 with reflection guidance. Reusing an idempotency key does not create a duplicate turn.

## 12. Frontend

- goal picker;
- editable response strategies;
- chat-style role-play with learner, simulated partner, and coach visually distinct;
- visible turn count;
- retry from the previous turn without erasing history;
- reflection form;
- My Learning overview, skill evidence, history, recommendation, and deletion controls.

## 13. Tests

- goal-to-criteria mapping;
- exact response evidence required for positive criteria;
- invented simulation detail is rejected;
- third turn completes or moves to reflection;
- fourth turn is rejected;
- retry preserves history;
- reflection is stored verbatim;
- skill update links to a real practice turn;
- deterministic recommendation changes scenario family;
- deleting a session removes learning artifacts and checkpoints.

## 14. Definition of done

- learner can complete a two-turn demo and a three-turn maximum path;
- every feedback item links to criteria and response evidence;
- simulation assumptions are visible;
- reflection updates skill evidence;
- My Learning explains what progress means and does not mean;
- recommendation is deterministic and explainable;
- all practice and ownership tests pass.

## 15. Non-goals

- voice conversation;
- pronunciation scoring;
- open-ended companion chat;
- global learner ranking;
- clinical or wellbeing assessment;
- claims that simulated replies predict real people.

