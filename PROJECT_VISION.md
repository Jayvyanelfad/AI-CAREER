# PROJECT VISION: CareerPath AI

## 1. PRODUCT IDENTITY

CareerPath AI is an AI Career Guidance Platform whose purpose extends beyond conventional online-course/LMS experiences. The platform combines:
- career discovery/guidance
- personalized learning
- structured technical courses
- interactive learning
- practical projects
- career-oriented outcomes

The long-term product should feel like an AI career-learning platform rather than a generic course catalog.

## 2. CORE LEARNING PHILOSOPHY

The most important product principle:

**COURSE CONTENT SHOULD BE TAUGHT THROUGH STORY-DRIVEN, FUN, MEMORABLE EXPERIENCES.**

The donkey/Daisy character is NOT a decorative mascot. The character/story is part of the teaching methodology.

The technical curriculum must remain:
- accurate
- complete
- structured
- technically meaningful

But the learner should encounter concepts through an engaging narrative/experience.

**Example flow:**
- A donkey encounters a problem
- The donkey observes something
- The learner is invited to think
- The underlying technical concept is introduced
- The concept is connected to the donkey's situation
- A real-world example follows
- The learner interacts with the concept
- A mini challenge tests understanding
- The lesson ends with a clear takeaway

Do NOT reduce the methodology to: "normal textbook content + a donkey introduction."
The story should be integrated into the actual teaching flow.

## 3. IMPORTANT PRODUCT PRINCIPLE

The donkey/story methodology is one of the project's differentiating ideas.

It should eventually be reusable across:
- AI
- machine learning
- Python
- mathematics
- data science
- cybersecurity
- other career-learning subjects where appropriate.

Do not hardcode the architecture around one lesson.

Build reusable learning structures.

## 4. LEARNING ARCHITECTURE

The desired conceptual hierarchy is:

```
COURSE
  ↓
MODULE / LEARNING PATH
  ↓
LEARNING UNIT
  ↓
1–3 RELATED TOPICS
  ↓
INTERACTIVE LEARNING EXPERIENCE
```

A learning unit should represent a meaningful learning experience rather than simply a database row containing a one-sentence description.

The learner should be able to directly select a meaningful unit/topic and enter its learning experience.

Avoid forcing learners to repeatedly view the entire course syllabus while learning one topic.

## 5. COURSE DETAIL UX

The course-detail page should distinguish between:

**A. understanding/browsing the course structure**

and

**B. actually learning.**

The active learning experience should receive visual and interaction priority.

The entire list of 20–30 lessons should NOT dominate every lesson view.

Navigation should remain available, but should not overwhelm the learning experience.

Learners should be able to click meaningful learning units/topics directly.

## 6. LEARNING EXPERIENCE MODEL

The architecture should support reusable content blocks such as:

- story/situation
- character
- discovery
- question
- concept explanation
- technical definition
- real-world example
- visual/diagram
- interaction
- mini challenge
- feedback
- practice
- takeaway
- reflection
- continuation

Do NOT require every future lesson to use every block.

The architecture should support different combinations.

## 7. CONTENT VS COURSE STRUCTURE

Distinguish clearly between:

**COURSE STRUCTURE**
- course
- module
- unit
- topic
- ordering
- prerequisites

and

**LEARNING CONTENT**
- story
- explanations
- examples
- interactions
- challenges
- assessments
- takeaways

Existing database lesson descriptions may currently be too short to represent complete teaching content.

Do not assume existing lesson.description fields are sufficient for the final learning experience.

## 8. CURRENT INTRO_TO_AI COURSE

The current course:

**Introduction to AI & ML**

currently contains five broad modules:

1. AI Foundations & History
2. Machine Learning Fundamentals
3. Neural Networks and Deep Learning
4. AI in the Real World
5. Starting an AI Career

The current database contains approximately 26 lesson records.

The current 26-lesson structure should be treated as existing source material, not automatically as the final learner-facing information architecture.

Do not delete or alter it merely to implement the new vision.

Future restructuring must preserve curriculum coverage.

## 9. FIRST PROTOTYPE

The first learning prototype should eventually be:

**Introduction to AI & ML**
→ AI Foundations & History
→ What is Artificial Intelligence?

This lesson already has a Daisy/donkey story-driven prototype in course-detail.js.

The future architecture should use this lesson as a prototype for the reusable learning experience.

The goal is NOT to immediately build all 26 lessons.

First make ONE learning experience genuinely good.

## 10. UI/UX PRINCIPLES

The interface should prioritize:

- clarity
- progressive disclosure
- direct navigation
- focused learning
- visual hierarchy
- readable content
- interaction
- sense of progression
- obvious next action
- mobile-friendly behavior
- accessibility

**Avoid:**
- giant syllabus dumps
- walls of text
- tiny lesson descriptions pretending to be lessons
- unnecessary repeated UI
- decorative story elements disconnected from teaching
- duplicate course/lesson implementations

## 11. ENGINEERING PRINCIPLES

Because previous AI-assisted modifications caused instability:

Every future implementation must follow:

**AUDIT**
→ **PLAN**
→ **ONE SMALL CHANGE**
→ **SYNTAX CHECK**
→ **VERIFY**
→ **REPORT**
→ **NEXT CHANGE**

Do not combine unrelated fixes.

Do not rewrite working backend systems merely to improve frontend UX.

Do not modify authentication unless authentication itself is the current task.

Do not modify the database without first defining and approving the data model.

Do not create duplicate pages when an existing page can be evolved safely.

Do not create temporary prototype files without explicitly marking them as prototypes.

## 12. CURRENT PROJECT REALITY

Document the known current state:

- public/courses.js currently has a syntax error around line 183
- course-detail.js currently renders the complete module/lesson outline
- most existing lessons contain short descriptions rather than complete teaching content
- the first AI lesson has hardcoded Daisy/story content
- personalized enrollment/progress endpoints require authentication
- unauthenticated requests to those endpoints may return 401
- those 401 responses are separate from public course/module/lesson retrieval
- previous experiments may have left prototype/debug files that need auditing

Do not fix any of these issues in this task.

## 13. NON-NEGOTIABLE RULES FOR FUTURE AI AGENTS

Future coding agents must:

1. Read PROJECT_VISION.md before modifying course/learning functionality.
2. Preserve the story-driven learning philosophy.
3. Treat Daisy/donkey as part of the teaching methodology, not decoration.
4. Prefer reusable architecture over one-off hardcoding.
5. Avoid dumping the complete course syllabus into every learning view.
6. Avoid replacing real teaching content with one-sentence descriptions.
7. Never redesign the entire project in one operation.
8. Make one controlled change at a time.
9. Run syntax checks after JavaScript modifications.
10. Clearly report exactly what files changed.
11. Never silently delete or abandon existing functionality.
12. Never create duplicate implementations without justification.

## 14. IMPORTANT DISTINCTION

This document describes the PRODUCT VISION and desired architecture.

It does NOT authorize implementation.

Do not modify application code as part of creating this document.