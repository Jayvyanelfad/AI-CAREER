# PROPOSED final exam: ai_evaluation — DRAFT FOR OWNER REVIEW, NOT FOR SEEDING

Do not insert these rows until the owner approves wording, answers, and
passing score. Suggested exam: id `ai_evaluation_final_1`,
title `AI Evaluation & Reliability Final Exam`, `is_final = TRUE`,
`passing_score = 70`, 8 questions × 1 point.

1. [Why AI Systems Fail] What is the most useful first step when an AI feature misbehaves in production?
   - CORRECT: Narrow the failure to a system part (data, retrieval, model, prompt, tool, UX) and reproduce it.
   - Wrong: Immediately retrain the model on new data. / Increase the sampling temperature. / Delete the logs and redeploy.
   - Why: Triage before treatment; retraining without diagnosis wastes effort and data.
2. [Evaluation Fundamentals] What distinguishes an evaluation from a demo?
   - CORRECT: A repeatable set of cases with defined expected behavior and scoring.
   - Wrong: A longer prompt. / A larger model. / A nicer user interface.
   - Why: Repeatability plus scoring is what makes results comparable over time.
3. [Designing Test Cases] Good evaluation cases should primarily cover…
   - CORRECT: Typical uses, edge cases, and known past failures.
   - Wrong: Only the easiest inputs. / Only adversarial attacks. / Random internet text.
   - Why: Coverage must reflect real usage and guard against regressions.
4. [Accuracy, Relevance, Grounding] A grounded answer is one that…
   - CORRECT: Is supported by the retrieved sources or provided context.
   - Wrong: Uses confident language. / Is longer than alternatives. / Matches the training data exactly.
   - Why: Grounding is about evidence linkage, not tone or length.
5. [LLM Evaluation] Why is exact-match scoring often insufficient for LLM outputs?
   - CORRECT: Many different wordings can be equally correct.
   - Wrong: Models never produce exact text. / Scores cannot be computed automatically. / Exact match is too fast.
   - Why: Open-ended generation needs semantic or rubric-based judgment.
6. [Regression Testing] The main purpose of regression tests for an AI feature is to…
   - CORRECT: Catch previously fixed failures reappearing after changes.
   - Wrong: Prove the model is perfect. / Replace user feedback. / Reduce inference cost.
   - Why: Regression suites protect past fixes during iteration.
7. [Safety and Reliability] Which practice most directly reduces harmful outputs?
   - CORRECT: Input/output guardrails plus refusal and escalation paths for risky requests.
   - Wrong: Hiding the model version. / Shorter answers. / More emojis.
   - Why: Explicit safety paths beat cosmetic measures.
8. [Monitoring] After deployment, the most important monitoring signal is…
   - CORRECT: Task success and failure rates on live traffic, sliced by use case.
   - Wrong: Total token count. / Server uptime alone. / Number of registered users.
   - Why: Outcome metrics per use case detect real degradation.
