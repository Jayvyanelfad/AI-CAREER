// Checkpoint D: deepen the existing Full Stack lessons without inserting rows.
// Titles and lesson/module ordering match the existing full_stack database records.
const course = {
  id: 'full_stack',
  description: 'Trace a user action through browser UI, JavaScript, HTTP, APIs, server logic, validation, authorization, and database persistence; design and test basic endpoints, handle failures, and prepare a small web application for deployment.',
  modules: [
    {
      id: 'ace43463-c0d8-4cb8-990e-19d42c4cf624', order: 1, title: 'Frontend Development',
      description: 'Build accessible browser interfaces, manage client-side state, connect user actions to HTTP requests, and keep rendering responsive as data changes.',
      lessons: [
        ['HTML5 and CSS3 Advanced',
          'Build a semantic, responsive form and explain how browser structure and styling support a complete user task.',
          'A neighborhood library needs a page where residents can register for a workshop. The first mockup looks polished, but keyboard users cannot find the submit action and the event details are only communicated by color.',
          'Which parts of the page describe meaning, which control appearance, and how can a user complete the task without a mouse?',
          'HTML gives content and controls structure; semantic elements help browsers, assistive technology, and developers understand their roles. CSS controls layout and presentation. A form submits named values, while labels, focus states, and clear errors make the interaction usable across devices.',
          'Use a form with a visible label for email, a required event choice, and a submit button. On a narrow screen, let fields fill the available width; show validation beside the relevant control rather than relying on color alone.',
          'Sketch the workshop registration form with semantic elements. Identify each submitted field name, add a keyboard-visible focus state, and describe where an inline validation message should appear.',
          'The browser UI is the first link in a data path: accessible controls make user intent clear before JavaScript or a server handles it.'],
        ['JavaScript ES6+ and TypeScript',
          'Trace a form event through JavaScript and distinguish local UI state from data that must be sent to a server.',
          'A resident submits the workshop form twice because the page gives no feedback while the network is slow. The interface needs to capture the values, prevent accidental duplicate clicks, and report success or failure.',
          'What should happen in the browser immediately, and what can only be confirmed after the server responds?',
          'JavaScript handles events and coordinates UI behavior. A typed request shape can make expected fields explicit, but types disappear at runtime and do not validate untrusted input. The browser should represent states such as idle, submitting, success, and error.',
          'A submit handler prevents the default navigation, reads FormData, disables the button while a request is pending, then displays a result based on the HTTP response. It should restore the button if the request fails.',
          'Write pseudocode for submit handling that prevents a duplicate request, sends eventId and email, distinguishes a 4xx validation response from a network failure, and leaves entered values available after failure.',
          'Client-side logic improves interaction, but the server remains responsible for checking every value and deciding whether a change succeeded.'],
        ['Frontend Frameworks: React and Vue',
          'Connect a component event to a loading, success, or error view without treating framework state as persisted data.',
          'The workshop page has grown to include event details, registration fields, and confirmation. A developer changes the DOM directly in several places and the displayed registration count becomes inconsistent.',
          'Which values should be the source of truth, and which parts of the page should be derived from them?',
          'Component frameworks organize UI around data and events. State represents the current client view; props or equivalent inputs pass data between components. Rendering state does not save it to a database, and a refresh can discard unsaved client state.',
          'Keep form values and request status in the registration form component. Pass the selected event as an input. Render a confirmation only after the API returns a successful response, not merely when the button is clicked.',
          'Draw a small component tree for the workshop page. Mark the owner of selected event, form values, and request status, then identify which value must come from the server after a reload.',
          'Frameworks help keep a UI consistent; they do not replace the HTTP request or server-side source of truth.'],
        ['State Management and Data Flow',
          'Trace one registration value from input through client state and request payload, and identify when server data should refresh the view.',
          'A registration succeeds, but the page still shows the old attendee count. The form cleared itself before it knew whether the server accepted the request.',
          'Which state is temporary input, which state is a server result, and what event should connect them?',
          'Client state may include draft form values, loading indicators, and cached server data. These have different lifetimes. A successful response can update or invalidate cached data; a failed response should preserve the draft and expose a recoverable error.',
          'After POST /api/events/42/registrations returns the saved registration and updated count, show confirmation and refresh the event summary. If it returns 409 because the event is full, keep the user’s input and show the reason.',
          'Draw the state transitions for idle → submitting → success and idle → submitting → error. For each transition, state whether the form draft is retained and whether server data is refreshed.',
          'State becomes easier to reason about when each value has a clear owner and the UI changes in response to confirmed events.'],
        ['Frontend Performance Optimization',
          'Use browser evidence to locate a slow interaction and choose an optimization that preserves correct request behavior.',
          'The events page is slow on a phone. A developer adds memoization everywhere, but users still wait because each keystroke triggers a full list request and large event images dominate loading.',
          'Which measurement would show whether the delay is rendering, network work, or asset loading?',
          'Performance work starts with measurement. Browser profiling and network inspection can distinguish expensive rendering, repeated requests, and large assets. Debouncing may reduce search calls; lazy loading and right-sized images reduce transfer, but optimizations must preserve accessibility and fresh data needs.',
          'Measure the search interaction, then debounce requests until typing pauses and cancel or ignore stale responses so an older query cannot overwrite newer results. Load below-the-fold images only when needed.',
          'For a slow event search, list one browser measurement for rendering, one network measurement, and one small change. Explain how you would verify the newest query still determines the displayed results.',
          'Optimize the measured bottleneck and retest behavior; a faster interface is still incorrect if stale responses replace current data.']
      ]
    },
    {
      id: '6ecc9754-977d-48f6-bca6-64e104b3251b', order: 2, title: 'Backend Development and APIs',
      description: 'Implement request handlers and stable API contracts, validate untrusted input, enforce identity and permissions on the server, and return useful errors that the frontend can handle.',
      lessons: [
        ['Node.js and Express.js',
          'Trace an HTTP request through Express middleware to a route handler and explain how the server chooses a response.',
          'The registration button sends a request, but the page spins forever. The backend route parses the body, checks the event, saves a registration, and must return a response on every path.',
          'At which point can the request fail, and how does each failure reach the browser?',
          'Node.js runs JavaScript on the server; Express routes requests through middleware and handlers. A handler should parse only expected input, call application logic, await persistence, and send one deliberate response. Errors must reach centralized handling rather than leave requests hanging.',
          'A POST route validates eventId and email, asks the registration service to create the record, returns 201 with the saved result, maps a full event to 409, and passes unexpected failures to an error handler that logs a request ID.',
          'Trace a POST request through body parsing, route validation, service, database, and response. Mark what the user sees if validation fails, the event is full, the database is unavailable, or no response is sent.',
          'A backend is the controlled bridge between HTTP requests and application rules; every path needs a safe, understandable outcome.'],
        ['RESTful API Design',
          'Design a small resource-oriented API contract with appropriate methods, status codes, and stable request and response shapes.',
          'The browser and server team each implement registration differently: one sends a query parameter, the other expects JSON, and neither knows whether a timeout created a record.',
          'What contract would let both sides agree on the request, result, and retry behavior?',
          'An API contract defines resource paths, methods, input and output shapes, status codes, and error behavior. HTTP success does not guarantee the client received the response, so retry-sensitive actions need an idempotency strategy or a way to inspect the resulting resource.',
          'Use POST /api/events/42/registrations with JSON {email}. Return 201 and a registration ID when created, 400 for invalid input, 401 for missing identity, 403 for disallowed access, and 409 when capacity is full.',
          'Write the request and response contract for creating and listing registrations. Include status codes for malformed input, unauthenticated requests, full capacity, and a retry after the first response was lost.',
          'A clear contract lets the UI and server evolve together while making errors and repeated requests predictable.'],
        ['Working with Databases',
          'Follow a write request through a database operation and distinguish a confirmed commit from an attempted save.',
          'The API returns “registered” before the database write finishes. When the database rejects a duplicate email, the browser has already displayed success.',
          'What must the server wait for before it can report success?',
          'A database stores durable application records; the server maps domain operations to queries or transactions. It should await the operation and translate known constraint failures into safe application errors. A successful response should reflect committed data, not an optimistic assumption.',
          'Create a unique constraint on event_id and normalized email. Attempt the insert, return the saved row after commit, and map a uniqueness conflict to an “already registered” response without exposing SQL details.',
          'Trace a registration from JSON body to normalized values, database insert, and HTTP response. Identify what happens if the connection fails before commit and after commit but before the response reaches the browser.',
          'Persistence is part of request correctness: report success only when the intended state change is confirmed.'],
        ['Authentication and Authorization',
          'Separate identity verification from permission checks and enforce both at the server boundary for a protected action.',
          'A user changes an event ID in the browser request and successfully edits another organizer’s workshop. Hiding the edit button did not protect the data.',
          'Which server-side facts must be checked before applying the update?',
          'Authentication establishes who the request represents; authorization decides whether that identity may perform this action on this resource. Client UI checks are for experience, not security. The server must verify the session or token and evaluate ownership or role for every protected request.',
          'For PATCH /api/events/42, authenticate the session, load event 42, compare its organizer_id with the verified user or an authorized admin role, validate permitted fields, then update. Return 401 when identity is absent and 403 when permission is insufficient.',
          'Review a route that accepts eventId and title. List the identity, ownership, and field checks it needs; explain why checking only whether a user is logged in is insufficient.',
          'The browser may guide a user, but only server-side authorization can protect a resource from a crafted request.'],
        ['API Documentation and Testing',
          'Turn an API contract into executable checks for normal, invalid, unauthorized, and failed requests.',
          'A release breaks workshop registration because the frontend assumes a 200 response while the API correctly returns 201. The only test checked that the route did not crash.',
          'Which contract details should a test protect beyond basic availability?',
          'API tests verify observable behavior: status, response shape, validation, identity and permission boundaries, persistence, and error handling. Documentation should describe the same contract that tests exercise, including examples and failure responses.',
          'Test a valid create request and assert 201 plus a registration ID; submit an invalid email and assert 400; repeat the request and assert the documented duplicate behavior; verify an anonymous request cannot create a protected registration.',
          'Write four API checks for registration covering valid input, malformed input, no session, and a database failure. For each, state the expected status and whether a database row should exist.',
          'Tests and documentation make the frontend-server agreement inspectable and catch regressions before users encounter them.']
      ]
    },
    {
      id: '45411f32-2355-464a-90c5-c1fd586b47aa', order: 3, title: 'Database Design and DevOps',
      description: 'Model durable records around application rules, choose relational or document storage from access patterns, and deploy a reproducible service with configuration, health checks, and rollback planning.',
      lessons: [
        ['Relational Database Design',
          'Model users, events, and registrations with keys and constraints that keep relationships valid under concurrent requests.',
          'Two residents claim the last seat at the same time. Both requests read one remaining place and insert a registration, so the event now exceeds capacity.',
          'Which rules belong only in application code, and which invariants should the database help enforce?',
          'Relational tables represent entities and relationships through keys. Constraints protect invariants such as unique registration per event and valid foreign keys. Multi-step changes may require a transaction or atomic conditional update to avoid race conditions.',
          'Store events and registrations separately, reference events with a foreign key, and add a unique constraint on event_id plus normalized email. Reserve capacity with an atomic update or transaction that checks remaining seats while writing the registration.',
          'Sketch event and registration tables with primary and foreign keys. State how you would prevent duplicate registrations and two concurrent requests from taking the final seat.',
          'A sound schema makes important data rules explicit and helps preserve them when requests arrive concurrently.'],
        ['NoSQL Data Modeling',
          'Choose a document-oriented model from read and write patterns and identify the consistency cost of duplicated data.',
          'The event page must load quickly, so a team copies organizer details into every event document. An organizer changes their display name and old event documents become inconsistent.',
          'Which reads benefit from embedding, and what update work does duplication create?',
          'Document databases group related data around access patterns. Embedding can make common reads simpler; references reduce repeated data but may require more reads. Denormalized copies need an update strategy and do not replace validation or authorization.',
          'Embed a small immutable venue snapshot needed for each event card, but reference the organizer profile as canonical data. If a name snapshot is needed for historical display, label and preserve it intentionally.',
          'For events, choose which fields to embed and which to reference. Describe one likely query, one update, and how you would prevent a stale duplicated organizer field from misleading users.',
          'Choose a data model from real access patterns and document the consistency trade-offs it introduces.'],
        ['Containerization with Docker',
          'Explain how a container image packages an application and distinguish build-time inputs from runtime configuration.',
          'The registration service works on a developer’s laptop but fails after deployment because it relied on a local file and a secret stored in a shell profile.',
          'What belongs in the image, and what must be provided safely when the container runs?',
          'A container image packages application code and its runtime dependencies. Environment-specific settings and secrets should be injected at runtime through the hosting environment or secret manager. Persistent user data belongs in managed storage, not an ephemeral container filesystem.',
          'Build the server image from a lockfile and production build steps. At runtime provide the database URL through protected configuration, expose a health endpoint, and write logs to standard output without printing credentials.',
          'Review a Docker setup that copies a local .env file into the image and writes uploads to a container directory. Identify two deployment risks and propose a safer configuration or storage boundary.',
          'Reproducible packaging reduces environment drift, while runtime configuration and durable data stay outside the image.'],
        ['Infrastructure as Code (IaC)',
          'Describe deployment infrastructure as reviewable configuration and identify which settings require protected values or environment separation.',
          'A teammate manually changes the production database firewall during an incident, but the change is absent from the repository and disappears during the next rebuild.',
          'How can the team make infrastructure changes repeatable without committing credentials?',
          'Infrastructure as code records desired resources and relationships in version-controlled configuration. Plans or previews expose intended changes before apply. Environments should be separated, permissions limited, and secrets supplied by a protected secret store rather than source files.',
          'Define a web service, private database access, and health check as reviewed configuration. Keep production credentials in the platform’s secret settings and use a separate state backend with controlled access.',
          'Given a proposed infrastructure change that opens a database port to the public internet, identify the review evidence you need, a safer network rule, and where the credential should live.',
          'Infrastructure changes become safer when they are reviewable, repeatable, scoped, and separated from secret values.'],
        ['CI/CD Pipelines and Deployment Strategies',
          'Plan an end-to-end release for a small full-stack application, including automated checks, configuration, health verification, rollback, and a clear project presentation.',
          'The workshop application works locally, but after a release registrations fail because the production API points at a missing database setting. A polished demo had never exercised the deployed request path.',
          'What evidence would show that a real user can complete the whole task after deployment, and how could the team recover if the release fails?',
          'A delivery pipeline builds a known revision, runs checks, and deploys through controlled stages. Production readiness also depends on runtime configuration, database compatibility, health signals, observability, and a rollback or forward-fix plan. Blue-green or canary rollout can reduce exposure when the platform supports them, but do not replace verification.',
          'For the workshop registration app, run tests and build from the committed revision, apply a reviewed compatible schema change, deploy to a staging URL, submit a test registration through the browser, check logs and health, then promote gradually and monitor error rate. Keep the previous deploy available for rollback.',
          'Capstone: design and demonstrate a small workshop registration application. Include the user problem and intended users; requirements and acceptance checks; frontend form and states; API methods and response shapes; event/registration data model; validation; authentication and organizer authorization; duplicate/full-event and database errors; tests for normal and failure paths; configuration, health checks, monitoring, deployment, and rollback. Present it in this order: (1) What did you build? (2) What problem does it solve? (3) Who is it for? (4) How does the system work? (5) What does the frontend do? (6) What does the backend do? (7) How is data stored? (8) How did you handle authentication/security? (9) What problems did you encounter? (10) What would you improve? (11) What would you change before production? Show one successful request and one failure path; distinguish tested behavior from planned work.',
          'A deployment is the final part of the request path: verify the user journey in its real environment and preserve a safe recovery option.']
      ]
    }
  ]
};

const headings = ['Story', 'Discovery', 'Learning Objective', 'Concept', 'Example', 'Challenge', 'Takeaway'];
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}
function renderLesson(parts) {
  return parts.map((text, index) => `<section class="lesson-section"><h3>${headings[index]}</h3><p>${escapeHtml(text)}</p></section>`).join('\n');
}
function validate() {
  if (course.modules.length !== 3 || course.modules.reduce((n, module) => n + module.lessons.length, 0) !== 15) throw new Error('Expected the existing 3 modules and 15 lessons.');
  for (const module of course.modules) {
    if (!module.description || !module.id || !module.title) throw new Error(`Incomplete module ${module.title}`);
    for (const lesson of module.lessons) {
      if (lesson.length !== 8 || !lesson[0] || lesson.slice(1).some((part) => !part || part.length < 55)) throw new Error(`Incomplete lesson: ${lesson[0]}`);
    }
  }
}

module.exports = { course, headings, renderLesson, validate };
