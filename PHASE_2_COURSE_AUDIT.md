# Phase 2 Course Content Audit

## Overall

Total courses: 22\
Total modules: 127\
Total lessons: 381

GREEN: 0 — none yet pair developed content, practical evidence, project assessment, and completion assessment.\
YELLOW: 11 — Introduction to AI & ML; Prompt Engineering & LLM Workflows; AI Automation with n8n; Vibe Coding; Generative AI & LLM Application Development; RAG & Knowledge Systems; AI Agents & Tool Use; MCP & Tool-Connected AI; AI-Powered Software Engineering; AI Evaluation & Reliability; AI Builder Capstone.\
RED: 11 — Python for Career Development; Data Analytics Basics; Web Development Fundamentals; Data Structures & Algorithms; DevOps & Cloud Basics; UI/UX Design Principles; Advanced Machine Learning; AWS Solutions Architect; Data Science Professional; Full Stack Web Development; Cybersecurity Fundamentals.

### Audit basis and catalog-wide findings

- Counts and content were read from the live Supabase database using SELECT queries only. Catalog counts match the requested 22 / 127 / 381.
- Course rows contain title, ID, description, image URL, difficulty, level, duration in weeks, and badge. Category comes from `course-catalog-config.json`. Prerequisite, learning-outcome, and paid/free entitlement fields are absent. `level` means difficulty, not payment state. Metadata is PARTIAL for all courses.
- The 12 older courses contain 42 modules and 211 lessons. Their topic progressions are usually recognizable, but the stored lesson bodies are mostly short, unsectioned prose: 196/211 are under 55 words. None has the six-part Story/Discovery/Concept/Example/Challenge/Takeaway format, runnable code, or linked practical artifact. No exact duplicate full lesson bodies were found.
- The 10 newer courses contain 85 modules and 170 lessons. Every lesson has Objective, Concept, Example, Challenge, and Takeaway sections, with Story and Discovery framing shared by lessons in the same module. The fields form a solid learning outline, but examples are prose rather than worked implementations, there are no runnable code blocks, and challenges have no tracked submissions or grading.
- Project-named final modules exist in the newer courses, but no project/rubric/submission data exists. Treat projects as PARTIAL, not complete assessed deliverables. Three exam records exist, all for `intro_to_ai`: a populated 10-question final, a populated 10-question Section 1 Quiz, and an empty `Test Exam` (0 questions). The other 21 courses have no configured exam. Certificate issuance requires complete lessons and one configured final exam with a passing attempt; no project evaluation is linked to it.
- No dedicated course-project table was found. This was a content audit; application logic was not changed or exercised.

## Course-by-course audit

### Introduction to AI & ML

Course ID: `intro_to_ai` | Category: AI & Machine Learning | Difficulty: Beginner, 8 weeks\
Modules (5): AI Foundations & History; Machine Learning Fundamentals; Neural Networks and Deep Learning; AI in the Real World; Starting an AI Career.\
Lessons: 26 | Overall status: YELLOW

Metadata: PARTIAL. Module structure: PARTIAL — broadly logical, though a Python/model-evaluation bridge is missing before deep learning. Story-driven lessons: MISSING. Examples: PARTIAL. Challenges: PARTIAL — section quiz exists, lesson challenges do not. Practical work: PARTIAL — project topic only. Project: PARTIAL — no deliverable/rubric. Final assessment: PASS — 10-question exam; separate section quiz has 10 questions; an extra test exam is empty. 16/26 lesson bodies are under 55 words; foundational ML entries are among the shortest.\
Main weaknesses: Concepts lack worked data, code, checks, and an end-to-end model workflow.\
Missing concepts: Train/validation/test split, leakage, baseline, feature prep, metric selection, reproducible workflow.\
Recommended module improvements: Add a small-dataset lab before neural networks; turn “Starting an AI Career” into a checkpointed project studio.\
Recommended final project: Build/evaluate a small supervised-learning app with data notes, baseline comparison, metrics, limitations, and responsible-use review.\
Priority: HIGH

### Python for Career Development

Course ID: `python_for_careers` | Category: Software Engineering | Difficulty: Beginner, 6 weeks\
Modules (3): Python Programming Basics; Data Structures and Libraries; Practical Applications and Automation. Lessons: 15 | Overall status: RED

Metadata: PARTIAL. Module structure: PARTIAL — sensible broad order, but libraries arrive without adequate coding practice. Story-driven lessons: MISSING. Examples: MISSING. Challenges: MISSING. Practical work: MISSING. Project: MISSING. Final assessment: MISSING. All 15 lesson bodies are under 55 words (about 12 words on average); none has code or expected output.\
Main weaknesses: Topics are labels, not instruction; no exercises, tests, debugging, or worked examples.\
Missing concepts: venv/packages, input/output, tested functions, Git, error handling, project structure, API/data validation.\
Recommended module improvements: Add runnable examples and cumulative exercises; teach tested core Python before NumPy/Pandas.\
Recommended final project: A tested Python job-application tracker or CSV/API reporting tool with persistence, validation, CLI, and documentation.\
Priority: HIGH

### Data Analytics Basics

Course ID: `data_analytics_basics` | Category: Data | Difficulty: Beginner, 5 weeks\
Modules (3): Foundations of Data Analytics; Data Analysis Techniques; Tools and Technologies. Lessons: 15 | Overall status: RED

Metadata: PARTIAL. Module structure: PARTIAL — plausible sequence, but tools are surveyed instead of applied to a shared question. Story-driven lessons, examples, challenges, practical work, project, final assessment: MISSING. All 15 bodies are under 55 words (about 11 words average); no dataset or analysis is demonstrated.\
Main weaknesses: Spreadsheets, SQL, Python, BI, and storytelling have no common dataset, outputs, or interpretation practice.\
Missing concepts: Metric definitions, joins/aggregation, missing/outlier treatment, uncertainty, chart choice/accessibility, dashboard decisions.\
Recommended module improvements: Anchor lessons to one dataset; add spreadsheet, SQL, visualization walkthroughs and review checkpoints.\
Recommended final project: A Data Story dashboard with a decision question, metric definitions, caveats, and recommendations.\
Priority: HIGH

### Web Development Fundamentals

Course ID: `web_dev` | Category: Software Engineering | Difficulty: Beginner, 5 weeks\
Modules (3): HTML and CSS Foundations; JavaScript Essentials; Frontend Development and Deployment. Lessons: 15 | Overall status: RED

Metadata: PARTIAL. Module structure: PARTIAL — broad sequence works, but no integration path. Story-driven lessons, examples, challenges, practical work, project, final assessment: MISSING. All bodies are under 55 words; there is no code or browser result despite the course description promising a portfolio site.\
Main weaknesses: No implemented lesson teaches or checks the promised site.\
Missing concepts: DOM interaction, form validation, accessibility, responsive testing, browser debugging, Git, deploy verification.\
Recommended module improvements: Build one site progressively; add code-alongs and integration checkpoints before framework survey.\
Recommended final project: Ship an accessible responsive portfolio app with interactive filtering, validated contact flow, and live deployment.\
Priority: HIGH

### Data Structures & Algorithms

Course ID: `dsa` | Category: Software Engineering | Difficulty: Intermediate, 6 weeks\
Modules (3): Core Data Structures; Advanced Data Structures; Algorithm Design and Analysis. Lessons: 15 | Overall status: RED

Metadata: PARTIAL. Module structure: PARTIAL — relevant topics, but complexity analysis comes after advanced structures. Story-driven lessons, examples, challenges, practical work, project, final assessment: MISSING. All 15 bodies are under 55 words; no pseudocode, implementation, or trace.\
Main weaknesses: Learners cannot inspect operations, complexity tradeoffs, or implementations.\
Missing concepts: Early Big-O, invariants, recursion, edge-case tests, graph traversal/shortest paths, DP derivation.\
Recommended module improvements: Pair each structure/algorithm with trace, implementation, complexity, and test challenge; trim unpracticed advanced topics.\
Recommended final project: Route-planning or task-scheduling app demonstrating algorithm choices and comparisons.\
Priority: HIGH

### DevOps & Cloud Basics

Course ID: `devops` | Category: Cloud & Infrastructure | Difficulty: Intermediate, 6 weeks\
Modules (3): Linux Foundations and Scripting; Containerization with Docker; Cloud Computing and AWS Basics. Lessons: 15 | Overall status: RED

Metadata: PARTIAL. Module structure: PARTIAL — Linux → containers → cloud is reasonable, but no deployment path joins them. Story-driven lessons, examples, challenges, practical work, project, final assessment: MISSING. All bodies are under 55 words; no commands, config, or deployment example.\
Main weaknesses: Docker, AWS, Terraform, and CI/CD are labels without a reproducible application.\
Missing concepts: Git workflow, image build, secrets, CI tests, deployment/health/logs/rollback, IAM/network basics, cost cleanup.\
Recommended module improvements: Carry one app from shell diagnostics to container, pipeline, cloud deploy, monitor, and rollback.\
Recommended final project: Deploy a cloud-oriented app with CI, infrastructure definition, least privilege, health checks, and rollback notes.\
Priority: HIGH

### UI/UX Design Principles

Course ID: `ui_ux` | Category: Design & Product | Difficulty: Beginner, 6 weeks\
Modules (3): User Experience Foundations; User Interface Design; Design Thinking and Prototyping. Lessons: 15 | Overall status: RED

Metadata: PARTIAL. Module structure: PARTIAL — plausible domains, but no evidence-driven iteration loop. Story-driven lessons, examples, challenges, practical work, project, final assessment: MISSING. All bodies are under 55 words; no research/design artifact or example is present.\
Main weaknesses: Research, wireframing, prototyping, and testing have no case, outputs, or feedback cycle.\
Missing concepts: Research ethics/synthesis, task flows, responsive states, accessibility, usability test planning, iterative handoff.\
Recommended module improvements: Run one brief through research, synthesis, flows, wireframes, prototype, user test, revision, and handoff.\
Recommended final project: A complete product experience with research, responsive prototype, accessibility decisions, usability findings, iteration, and handoff.\
Priority: HIGH

### Advanced Machine Learning

Course ID: `advanced_ml` | Category: AI & Machine Learning | Difficulty: Advanced, 12 weeks\
Modules (4): Deep Learning Foundations; NLP; Computer Vision and Applications; ML Ops and Deployment. Lessons: 20 | Overall status: RED

Metadata: PARTIAL. Module structure: PARTIAL — wide range without prerequisite path or project thread. Story-driven lessons, examples, challenges, practical work, project, final assessment: MISSING. All 20 bodies are under 55 words; no derivation, code, or experiment.\
Main weaknesses: Advanced topics have only short summaries; no training/comparison/serving work.\
Missing concepts: Prerequisite math/Python, reproducibility, optimization/regularization, fine-tuning/evaluation, leakage, bias, drift.\
Recommended module improvements: Choose a coherent path, add notebook experiments, and evaluate before deployment.\
Recommended final project: Applied ML system comparing baseline/advanced model with evaluation, bias limits, and monitored service.\
Priority: HIGH

### AWS Solutions Architect

Course ID: `aws_architect` | Category: Cloud & Infrastructure | Difficulty: Intermediate, 10 weeks\
Modules (4): AWS Core Services; Storage and Database Services; Networking and Content Delivery; Security, Identity, and Compliance. Lessons: 20 | Overall status: RED

Metadata: PARTIAL. Module structure: PARTIAL — service survey without staged architecture decisions, resilience, or cost design. Story-driven lessons, examples, challenges, practical work, project, final assessment: MISSING. All 20 bodies are under 55 words; no diagram or scenario tradeoff.\
Main weaknesses: Service names lack requirements, architecture artifacts, and operational criteria.\
Missing concepts: Well-Architected tradeoffs, IAM boundaries, VPC routing, HA/DR, observability, cost estimate, infrastructure validation.\
Recommended module improvements: Organize around workload scenarios; require diagrams, service rationale, failure/cost analysis, and labs.\
Recommended final project: Design/deploy a secure resilient AWS scenario with diagram, IAM/network controls, cost estimate, and verification.\
Priority: HIGH

### Data Science Professional

Course ID: `data_science` | Category: Data | Difficulty: Advanced, 14 weeks\
Modules (4): Data Science Foundations; Machine Learning and Modeling; Big Data and Distributed Computing; Specialized Data Science Domains. Lessons: 20 | Overall status: RED

Metadata: PARTIAL. Module structure: PARTIAL — broad coverage is fragmented without a sustained problem or end-to-end case. Story-driven lessons, examples, challenges, practical work, project, final assessment: MISSING. All 20 bodies are under 55 words; no dataset/notebook/result.\
Main weaknesses: Lifecycle, modeling, scale, and domain claims have no practical depth or capstone thread.\
Missing concepts: Problem framing, provenance, leakage, baseline/validation, feature engineering, uncertainty, reproducibility, monitoring.\
Recommended module improvements: Use one project through acquisition, EDA, modeling, validation, deployment, and one selected specialization.\
Recommended final project: Reproducible data-science project with baseline comparison, justified metrics, error analysis, deployment/handoff, caveats.\
Priority: HIGH

### Full Stack Web Development

Course ID: `full_stack` | Category: Software Engineering | Difficulty: Intermediate, 12 weeks\
Modules (3): Frontend Development; Backend Development and APIs; Database Design and DevOps. Lessons: 15 | Overall status: RED

Metadata: PARTIAL. Module structure: PARTIAL — frontend → backend → storage/deployment is broad but stack choices are diffuse (React and Vue) and integration is absent. Story-driven lessons, examples, challenges, practical work, project, final assessment: MISSING. All 15 bodies are under 55 words; no end-to-end code.\
Main weaknesses: No coherent app or frontend/API/database integration.\
Missing concepts: One chosen framework, API contracts, validation/errors, migrations, auth/session security, integration tests, deployment, observability.\
Recommended module improvements: Carry one app across modules with vertical slices and tests; replace tool survey with practice.\
Recommended final project: Ship a full-stack app with responsive UI, secure auth, validated API, relational storage, tests, deployment, and operator notes.\
Priority: HIGH

### Cybersecurity Fundamentals

Course ID: `cybersecurity` | Category: Cybersecurity | Difficulty: Beginner, 8 weeks\
Modules (4): Cybersecurity Foundations; Ethical Hacking and Penetration Testing; Web and Application Security; Security Operations and Incident Response. Lessons: 20 | Overall status: RED

Metadata: PARTIAL. Module structure: PARTIAL — domains make sense, but safe lab boundaries and defensive evidence should precede offensive topics. Story-driven lessons, examples, challenges, practical work, project, final assessment: MISSING. All 20 bodies are under 55 words; no threat model, lab, or incident walkthrough.\
Main weaknesses: Offensive/security operations labels lack authorization boundaries, safe practice, evidence, and remediation.\
Missing concepts: Threat modeling, risk priority, lab scope, identity/MFA, remediation, detection/logging, incident recovery, legal/privacy limits.\
Recommended module improvements: Lead with defensive goals and safe-lab rules; pair attack concepts with detection, remediation, and reporting.\
Recommended final project: Security monitoring/protection prototype for a deliberately vulnerable local app, including scoped tests, detections, remediation, runbook, and evidence.\
Priority: HIGH

### Prompt Engineering & LLM Workflows

Course ID: `prompt_engineering` | Category: AI Building & Automation | Difficulty: Beginner, 6 weeks\
Modules (5): How LLMs Actually Respond; Prompt Patterns; Reliable LLM Workflows; From Prompt to Workflow; Build a Practical LLM Workflow. Lessons: 10 | Overall status: YELLOW

Metadata: PARTIAL. Module structure: PASS — mental model → prompt patterns → workflow design/testing. Story-driven lessons: PASS — module story/discovery shared by its lessons. Examples: PARTIAL — present but prose-only, no runnable test pack. Challenges: PASS — concrete design/test tasks. Practical work: PARTIAL — no tracked artifacts or grading. Project: PARTIAL — reusable workflow/handoff requested, no rubric. Final assessment: MISSING.\
Main weaknesses: Needs model/runtime exercises, reusable test inputs/expected outputs, and objective review.\
Missing concepts: Prompt injection/untrusted inputs; provider variance; cost/latency measurement; versioned regression fixtures.\
Recommended module improvements: Add normal, ambiguous, incomplete, and adversarial test cases with before/after comparison and validation.\
Recommended final project: Build a bounded LLM workflow with prompt versioning, validated output, failure cases, human review, and test evidence.\
Priority: MEDIUM

### AI Automation with n8n

Course ID: `ai_automation_n8n` | Category: AI Building & Automation | Difficulty: Beginner, 8 weeks\
Modules (8): Automation Thinking; n8n Fundamentals; APIs, Webhooks, and Data; Connecting AI Models; AI-Powered Workflows; Memory, Conditions, and Human Approval; Reliability and Error Handling; Build an AI Automation. Lessons: 16 | Overall status: YELLOW

Metadata: PARTIAL. Module structure: PASS — workflow framing → data/APIs → AI → controls/reliability → build. Story-driven lessons: PASS. Examples: PARTIAL — relevant scenarios, no importable workflow or full execution trace. Challenges: PASS. Practical work: PARTIAL — no verifiable submissions/execution dataset. Project: PARTIAL — end-to-end automation lacks rubric. Final assessment: MISSING.\
Main weaknesses: No credential-safe sandbox, importable workflow examples, or scored operational test.\
Missing concepts: Version compatibility, credential rotation, rate limits, observability, privacy/retention, recovery drills.\
Recommended module improvements: Supply sanitized workflow and sample payloads; test retry, duplicate, approval, and failure paths.\
Recommended final project: n8n AI workflow that validates input, calls API/model, retains evidence, gates consequential action, and documents recovery.\
Priority: MEDIUM

### Vibe Coding: Build & Ship Apps with AI

Course ID: `vibe_coding` | Category: AI Building & Automation | Difficulty: Intermediate, 8 weeks\
Modules (9): What Vibe Coding Actually Means; Turning Ideas into Specifications; Working with AI Coding Assistants; Building the First Prototype; Debugging AI-Generated Code; Working with Existing Codebases; Testing and Verification; Shipping the Application; Build Challenge: Specify, Build, Inspect, Ship. Lessons: 18 | Overall status: YELLOW

Metadata: PARTIAL. Module structure: PASS — specification, bounded implementation, debug, verification, shipping. Story-driven lessons: PASS. Examples: PARTIAL — no annotated diffs or executable repo exercises. Challenges: PASS. Practical work: PARTIAL — no starter repo or review submissions. Project: PARTIAL — explicit build challenge, no rubric. Final assessment: MISSING.\
Main weaknesses: Strong safe-process outline, but no integrated student build or objective review criteria.\
Missing concepts: Dependency/license review, accessibility/performance checks, deployment monitoring, rollback evidence.\
Recommended module improvements: Add a starter repository, staged issue cards, expected tests, intentional defects, review checkpoints.\
Recommended final project: Build/ship an AI-assisted app with specification, reviewed diffs, tests, accessibility/security checks, deployment, and verification evidence.\
Priority: MEDIUM

### Generative AI & LLM Application Development

Course ID: `generative_ai_llm` | Category: AI & Machine Learning | Difficulty: Intermediate, 10 weeks\
Modules (9): Generative AI Foundations; LLMs and Context; APIs and Model Interaction; Structured Outputs; Embeddings; Building an LLM Application; Conversation and Memory; Reliability, Cost, and Safety; LLM Application Project. Lessons: 18 | Overall status: YELLOW

Metadata: PARTIAL. Module structure: PASS — coherent path from foundations to project. Story-driven lessons: PASS. Examples: PARTIAL — prose scenarios, no complete runnable API/embedding app. Challenges: PASS. Practical work: PARTIAL — no starter code, fixtures, or scored lab. Project: PARTIAL — project tasks lack rubric/completion link. Final assessment: MISSING.\
Main weaknesses: Needs implementation, provider/model comparison, and measured quality/cost tradeoffs.\
Missing concepts: Streaming/cancellation, prompt-injection boundaries, structured tool calls, secrets, model comparison, regression set.\
Recommended module improvements: Build one vertical slice through API, validation, embeddings, memory, safety, evaluation; keep provider setup as replaceable detail.\
Recommended final project: Real generative AI app with validated input/output, feedback/fallback, latency/cost metrics, safety boundaries, and evaluation evidence.\
Priority: HIGH

### RAG & Knowledge Systems

Course ID: `rag_knowledge_systems` | Category: AI & Machine Learning | Difficulty: Intermediate, 8 weeks\
Modules (9): Why LLMs Need External Knowledge; Embeddings and Semantic Search; Document Ingestion; Chunking and Retrieval; Building a RAG Pipeline; Retrieval Quality; Citations and Grounding; RAG Evaluation; Build a Knowledge Assistant. Lessons: 18 | Overall status: YELLOW

Metadata: PARTIAL. Module structure: PASS — ingestion → retrieval/generation → grounding/evaluation. Story-driven lessons: PASS. Examples: PARTIAL — no corpus or worked retrieval trace. Challenges: PASS. Practical work: PARTIAL — no runnable pipeline or scored test set. Project: PARTIAL — sensible assistant project without rubric. Final assessment: MISSING.\
Main weaknesses: No inspectable chunks, ranked results, citation checks, or corpus refresh lab.\
Missing concepts: Retrieval-time access control, parsing quality, hybrid/reranking, stale/deleted documents, retrieved prompt injection, separate retrieval/answer metrics.\
Recommended module improvements: Add versioned corpus and retrieval traces; include unanswerable questions and separate retrieval from answer evaluation.\
Recommended final project: “Ask Your Documents” with access rules, citations, corpus refresh, retrieval/answer test set, and failure analysis.\
Priority: HIGH

### AI Agents & Tool Use

Course ID: `ai_agents` | Category: AI & Machine Learning | Difficulty: Intermediate, 8 weeks\
Modules (8): From Chatbots to Agents; Tools and Function Calling; Agent Loops; Planning and Task Decomposition; Memory and State; Multi-Step Tool Use; Agent Reliability and Safety; Build an AI Agent. Lessons: 16 | Overall status: YELLOW

Metadata: PARTIAL. Module structure: PASS — tools/contracts precede loops/planning/state and safety. Story-driven lessons: PASS. Examples: PARTIAL — no runnable tool schema or execution trace. Challenges: PASS. Practical work: PARTIAL — no sandbox, traces, or scored failure tests. Project: PARTIAL — build/demo lacks assessment. Final assessment: MISSING.\
Main weaknesses: No executable agent or measurable stop/recovery behavior.\
Missing concepts: External permission enforcement, tool-result injection, idempotency/rollback, cost/latency budget, repeatable trajectory evaluation.\
Recommended module improvements: Add deterministic local tools and test traces, permissions, untrusted results, and stop conditions.\
Recommended final project: Bounded tool-using agent with validated arguments, permissions, trace log, and safe escalation.\
Priority: HIGH

### MCP & Tool-Connected AI

Course ID: `mcp_tool_connected_ai` | Category: AI Building & Automation | Difficulty: Intermediate, 8 weeks\
Modules (8): Why Tool-Connected AI Matters; MCP Concepts; Servers, Tools, and Resources; Connecting AI to Tools; Building an MCP Tool; Permissions and Security; Debugging Tool Connections; Build a Tool-Connected AI Workflow. Lessons: 16 | Overall status: YELLOW

Metadata: PARTIAL. Module structure: PASS — concepts → server capabilities → connect/build → permissions/debugging. Story-driven lessons: PASS. Examples: PARTIAL — scenarios but no complete protocol traces. Challenges: PASS. Practical work: PARTIAL — no host/server starter project or interoperability fixtures. Project: PARTIAL — workflow lacks rubric. Final assessment: MISSING.\
Main weaknesses: Needs a runnable, current protocol lab and compatibility evidence.\
Missing concepts: Transport/session lifecycle, capability/schema evolution, conformance/adversarial tests, deployment operations.\
Recommended module improvements: Add minimal local host/server lab with fixtures and explicit version assumptions; separate protocol from adjacent patterns.\
Recommended final project: Tool-connected AI workflow with narrow MCP capabilities, consent, protocol tests, failure handling, and security review.\
Priority: MEDIUM

### AI-Powered Software Engineering

Course ID: `ai_software_engineering` | Category: Software Engineering | Difficulty: Intermediate, 10 weeks\
Modules (10): AI in the Software Development Lifecycle; AI-Assisted Requirements; AI-Assisted Architecture; Code Generation; Debugging with AI; Testing with AI; Code Review and Refactoring; Documentation; Shipping with AI; AI Engineering Project. Lessons: 20 | Overall status: YELLOW

Metadata: PARTIAL. Module structure: PASS — lifecycle from requirements through release. Story-driven lessons: PASS. Examples: PARTIAL — realistic but no repository diffs or test results. Challenges: PASS. Practical work: PARTIAL — no shared codebase or evidence artifacts. Project: PARTIAL — plan exists, not a graded engineering change. Final assessment: MISSING.\
Main weaknesses: No repository lab connecting requirements, patch review, tests, and release.\
Missing concepts: Proprietary-code data boundaries, licensing/attribution, quality baseline, human ownership, rollback practice.\
Recommended module improvements: Provide codebase, acceptance criteria, staged faults; require diff, tests, security review, release/rollback note.\
Recommended final project: AI-assisted workflow ships a reviewed feature with requirements, decisions, tests, security, docs, and release evidence.\
Priority: MEDIUM

### AI Evaluation & Reliability

Course ID: `ai_evaluation` | Category: AI & Machine Learning | Difficulty: Intermediate, 8 weeks\
Modules (9): Why AI Systems Fail; Evaluation Fundamentals; Designing Test Cases; Accuracy, Relevance, and Grounding; LLM Evaluation; Regression Testing; Safety and Reliability; Monitoring AI Systems; Build an Evaluation System. Lessons: 18 | Overall status: YELLOW

Metadata: PARTIAL. Module structure: PASS — failure analysis → test design/metrics → regression/safety/monitoring. Story-driven lessons: PASS. Examples: PARTIAL — no dataset, scorer, or worked evaluator disagreement. Challenges: PASS. Practical work: PARTIAL — pipeline is described, not runnable. Project: PARTIAL — outcome lacks rubric/submission. Final assessment: MISSING.\
Main weaknesses: No benchmark, baseline, judge calibration, or quantitative tradeoff evidence.\
Missing concepts: Statistical uncertainty, slice analysis, inter-rater agreement, evaluator drift, cost/latency tradeoffs, privacy-safe datasets.\
Recommended module improvements: Add versioned test set and rubric; compare human/automated scoring and enforce sample release gate.\
Recommended final project: Evaluation pipeline with labeled cases, calibrated scoring, regressions, safety checks, monitoring signals, and release report.\
Priority: HIGH

### AI Builder Capstone

Course ID: `ai_builder_capstone` | Category: AI Building & Automation | Difficulty: Intermediate, 12 weeks\
Modules (10): Choose the Problem; Define the User; Design the AI System; Build the Prototype; Connect Tools and Data; Test and Evaluate; Improve and Secure; Deploy; Document; Demo Day and Final Project. Lessons: 20 | Overall status: YELLOW

Metadata: PARTIAL. Module structure: PASS — complete problem-to-demo journey. Story-driven lessons: PASS. Examples: PARTIAL — relevant decisions, no exemplar capstone artifacts. Challenges: PASS — project checkpoints throughout. Practical work: PARTIAL — no workspace, rubric, milestone verification, or evaluator records. Project: PARTIAL — whole course is project-oriented but artifact/quality gates are unspecified. Final assessment: MISSING — demo prompt is not a configured scored exam.\
Main weaknesses: Best project path in catalog, but acceptance criteria, evidence, reviews, and completion assessment are not operationalized.\
Missing concepts: Mentor/review cadence, artifact rubric, accessibility/user testing, deployment constraints, quality thresholds, handoff acceptance.\
Recommended module improvements: Define milestone artifacts, observable acceptance criteria, review gates, and a rubric flexible across AI product types.\
Recommended final project: Substantial end-to-end AI product for a bounded user problem, with tested flow, data/tool boundaries, evaluation, safety review, deployment, monitoring, docs, and demo.\
Priority: HIGH

## Recommended development order

1. Repair the shared legacy lesson foundation in Python, Web Development, Data Analytics, and DSA. These RED courses are prerequisites for many paths and currently average 11–14 words per lesson. Establish worked examples, exercises, and project checkpoints before adding topics.
2. Develop Full Stack and DevOps as reusable integrated labs, then UI/UX, Cybersecurity, Advanced ML, AWS, and Data Science around complete artifacts. Make authorization and safe lab boundaries explicit before cybersecurity practice.
3. Turn the 10 YELLOW curricula into runnable labs. Start with Generative AI, RAG, AI Agents, AI Evaluation, and the AI Builder Capstone; then n8n, MCP, Prompt Engineering, Vibe Coding, and AI Software Engineering.
4. Expand Introduction to AI & ML alongside the legacy repair. It is the only older course with substantive lesson bodies and a populated final exam; strengthen short foundations and connect project evidence to completion.

This is a development recommendation only. Phase 2B content generation has not begun.

## Phase 2A completion record

FILES CREATED: `PHASE_2_COURSE_AUDIT.md`\
FILES MODIFIED: None\
PRODUCTION FILES MODIFIED: NO\
DATABASE CHANGED: NO\
COURSE CONTENT CHANGED: NO\
PHASE 2A STATUS: COMPLETE
