// Shared, declarative foundation for Programming Studio language journeys.
// Topics are planned outlines; empty activity/progress collections are intentional.
const PROGRAMMING_PRESENTATION_FIELDS = Object.freeze([
  'What did you build?', 'What problem were you solving?', 'Who is the user?',
  'What technologies did you use?', 'How does the solution work?',
  'What architecture/design did you choose?', 'What was difficult?',
  'How did you test it?', 'What would you improve?', 'What would you build next?',
  'Show the result/demo.'
]);

const PROGRAMMING_PROJECT_MILESTONES = Object.freeze([
  'Idea', 'Plan', 'Build', 'Test', 'Improve', 'Present'
]);

const PROGRAMMING_TRACKS = Object.freeze([
  {
    id: 'python', language: 'Python', family: 'General purpose', level: 'Beginner → Intermediate',
    beginner: 'A welcoming first language', focus: 'data and files',
    description: 'A readable first language for automation, data, and useful tools.',
    objectives: ['Read and write clear Python', 'Break a problem into functions', 'Work with collections and files', 'Test and explain a small tool'],
    modules: [
      { title: 'Foundations', topics: ['What programming does', 'Python values and variables', 'Input, output, and operators'] },
      { title: 'Thinking in Python', topics: ['Conditions and loops', 'Problem decomposition', 'Functions and debugging'] },
      { title: 'Core Python', topics: ['Lists, dictionaries, sets, and tuples', 'Strings and modules', 'Exceptions and tests'] },
      { title: 'Working With Data', topics: ['Files and folders', 'CSV and JSON', 'Data transformation and APIs'] },
      { title: 'Real-World Python', topics: ['Project structure', 'Reusable, safe automation', 'Error handling and testing'] }
    ],
    quickPractice: 'Create variables for a student name, age, and course, then format them into one readable message.',
    challenge: 'Read a list of file names, group them by extension, and explain how your code handles a name with no extension.',
    miniBuild: 'A command-line study session planner that validates a duration and summarizes a plan.',
    project: 'File Organization Assistant', projectSummary: 'Preview and safely sort a busy folder without moving anything until the plan is reviewed.',
    specializations: ['Python Foundations', 'Python for Data', 'Python for Automation', 'Python for Backend', 'Python for AI/ML', 'Python for Generative AI', 'Python for Cybersecurity']
  },
  {
    id: 'javascript', language: 'JavaScript', family: 'Web', level: 'Beginner → Intermediate',
    beginner: 'A practical first language for the web', focus: 'browser interfaces and APIs',
    description: 'Bring interfaces to life and connect browser experiences to data.',
    objectives: ['Use values, functions, and objects', 'Respond to browser events', 'Work with forms and web APIs', 'Build and explain an interactive flow'],
    modules: [
      { title: 'Foundations', topics: ['Values and expressions', 'Variables and operators', 'Console input and output'] },
      { title: 'Thinking in JavaScript', topics: ['Conditions and loops', 'Functions and scope', 'Read errors and debug'] },
      { title: 'Core JavaScript', topics: ['Arrays and objects', 'Modules and errors', 'Promises and async basics'] },
      { title: 'Working With the Browser', topics: ['DOM and events', 'Forms and validation', 'Fetch and browser APIs'] },
      { title: 'Real-World JavaScript', topics: ['Organize interface code', 'Handle loading and error states', 'Test important behavior'] }
    ],
    quickPractice: 'Store a user’s selected theme and update one page element when a button is clicked.',
    challenge: 'Build a searchable list that combines filtering, empty states, and a clear reset action.',
    miniBuild: 'An interactive reading list with add, filter, and remove behaviors.',
    project: 'Interactive Web Application', projectSummary: 'Create a responsive experience with a useful interaction and a clear user flow.',
    specializations: ['JavaScript Frontend', 'JavaScript Backend', 'JavaScript Full Stack']
  },
  {
    id: 'java', language: 'Java', family: 'General purpose', level: 'Beginner → Intermediate',
    beginner: 'Beginner-friendly with steady practice', focus: 'objects and application structure',
    description: 'Build an object-oriented foundation for dependable applications.',
    objectives: ['Use Java types and control flow', 'Model behavior with classes and methods', 'Work with collections and exceptions', 'Test a small application'],
    modules: [
      { title: 'Foundations', topics: ['How Java programs run', 'Types, variables, and operators', 'Input, output, and expressions'] },
      { title: 'Thinking in Java', topics: ['Conditions and loops', 'Methods and decomposition', 'Debugging compiler and runtime errors'] },
      { title: 'Core Java', topics: ['Classes and objects', 'Collections and generics', 'Exceptions and tests'] },
      { title: 'Working With Application Data', topics: ['Represent records with types', 'Read and write structured data', 'Validate state changes'] },
      { title: 'Real-World Java', topics: ['Package and organize code', 'Separate responsibilities', 'Test application behavior'] }
    ],
    quickPractice: 'Create a Book class with a title and availability state, then describe one valid state change.',
    challenge: 'Model a small catalog and support search, checkout, and return while rejecting invalid changes.',
    miniBuild: 'A command-line book catalog with a few sample records.',
    project: 'Library / Inventory Management System', projectSummary: 'Track items, availability, and clear records with a small, testable model.',
    specializations: ['Java Backend', 'Java Enterprise', 'Java Android (future)']
  },
  {
    id: 'c', language: 'C', family: 'Systems', level: 'Beginner → Intermediate',
    beginner: 'Approachable with careful, guided foundations', focus: 'memory and command-line data',
    description: 'Understand how programs work close to memory and the operating system.',
    objectives: ['Write small C programs', 'Use functions, arrays, and structs', 'Understand pointers and file handling', 'Check input and memory boundaries'],
    modules: [
      { title: 'Foundations', topics: ['Compile and run a C program', 'Types, variables, and operators', 'Input and formatted output'] },
      { title: 'Thinking in C', topics: ['Conditions and loops', 'Functions and decomposition', 'Warnings, errors, and debugging'] },
      { title: 'Core C', topics: ['Arrays and strings', 'Pointers and structs', 'Headers and separate source files'] },
      { title: 'Working With Files', topics: ['Read and write records', 'Validate input boundaries', 'Handle file errors'] },
      { title: 'Real-World C', topics: ['Plan data ownership', 'Check memory and edge cases', 'Compile and test repeatably'] }
    ],
    quickPractice: 'Read one integer, reject invalid input, and print a clear message for the accepted range.',
    challenge: 'Add, find, and update fixed-size student records while checking every input boundary.',
    miniBuild: 'A command-line grade summary for a small set of records.',
    project: 'Command-Line Student Management System', projectSummary: 'Create, find, and update student records with explicit input and storage limits.',
    specializations: []
  },
  {
    id: 'cpp', language: 'C++', family: 'Systems', level: 'Beginner → Intermediate',
    beginner: 'Best with patience and a strong foundation', focus: 'data structures and performance',
    description: 'Explore modern C++ through structured programs and performance choices.',
    objectives: ['Use modern C++ types and functions', 'Choose standard containers', 'Understand ownership and lifetimes', 'Measure tradeoffs instead of guessing'],
    modules: [
      { title: 'Foundations', topics: ['Compile and run C++', 'Values, types, and expressions', 'Input, output, and operators'] },
      { title: 'Thinking in C++', topics: ['Conditions and loops', 'Functions and decomposition', 'Read compiler diagnostics'] },
      { title: 'Core C++', topics: ['Classes and object lifetimes', 'Strings and standard containers', 'Errors, algorithms, and tests'] },
      { title: 'Working With Performance', topics: ['Ownership and references', 'Choose data structures', 'Measure simple operations'] },
      { title: 'Real-World C++', topics: ['Organize headers and source', 'Use safe resource management', 'Test edge cases and behavior'] }
    ],
    quickPractice: 'Store a short task list in a standard container and report its size after one change.',
    challenge: 'Compare two ways to find a task in a growing list, then explain the complexity and tradeoff.',
    miniBuild: 'A command-line task queue with sorting and completion status.',
    project: 'Performance-Oriented Task Manager', projectSummary: 'Organize tasks and make one measured, explainable performance choice.',
    specializations: ['C++ Game Development', 'C++ Systems', 'C++ Performance']
  },
  {
    id: 'csharp', language: 'C#', family: 'General purpose', level: 'Beginner → Intermediate',
    beginner: 'Beginner-friendly with guided structure', focus: 'application behavior and validation',
    description: 'Learn modern application structure with a clear, expressive language.',
    objectives: ['Use C# types and control flow', 'Model data with classes and records', 'Validate input and handle errors', 'Test a practical application flow'],
    modules: [
      { title: 'Foundations', topics: ['Run a C# program', 'Types, variables, and expressions', 'Input, output, and operators'] },
      { title: 'Thinking in C#', topics: ['Conditions and loops', 'Methods and decomposition', 'Debugging and diagnostics'] },
      { title: 'Core C#', topics: ['Classes, records, and collections', 'LINQ and data transformations', 'Exceptions and tests'] },
      { title: 'Working With Application State', topics: ['Validate user input', 'Model productivity workflows', 'Persist simple data'] },
      { title: 'Real-World C#', topics: ['Organize application layers', 'Use async work carefully', 'Test behavior and edge cases'] }
    ],
    quickPractice: 'Represent a daily task with a title and completion state, then validate an empty title.',
    challenge: 'Plan a weekly task view that filters completed work and handles a week with no entries.',
    miniBuild: 'A focused daily planning tool with a few productivity actions.',
    project: 'Productivity Application', projectSummary: 'Help someone plan recurring work and understand what is done next.',
    specializations: []
  },
  {
    id: 'go', language: 'Go', family: 'Backend', level: 'Beginner → Intermediate',
    beginner: 'Beginner-friendly for backend fundamentals', focus: 'HTTP services and APIs',
    description: 'Build straightforward services with strong tools for concurrency and deployment.',
    objectives: ['Organize Go packages and functions', 'Model data with structs and interfaces', 'Handle errors explicitly', 'Build and test an HTTP endpoint'],
    modules: [
      { title: 'Foundations', topics: ['Run a Go program', 'Values, types, and variables', 'Packages and basic input/output'] },
      { title: 'Thinking in Go', topics: ['Conditions and loops', 'Functions and multiple returns', 'Debugging and error messages'] },
      { title: 'Core Go', topics: ['Structs and interfaces', 'Slices, maps, and methods', 'Errors and table-driven tests'] },
      { title: 'Working With HTTP', topics: ['Routes and handlers', 'JSON request and response shapes', 'Validate and report errors'] },
      { title: 'Real-World Go', topics: ['Organize a small service', 'Context and cancellation', 'Test handlers and boundaries'] }
    ],
    quickPractice: 'Write a function that validates an API input and returns a useful error for a missing field.',
    challenge: 'Design a small REST resource with create, read, and list behavior plus clear invalid-input responses.',
    miniBuild: 'A JSON endpoint that returns a filtered list of saved items.',
    project: 'REST API / Backend Service', projectSummary: 'Design clear endpoints around one small domain and make behavior easy to test.',
    specializations: ['Go Backend', 'Go Cloud', 'Go Infrastructure']
  },
  {
    id: 'rust', language: 'Rust', family: 'Systems', level: 'Beginner → Intermediate',
    beginner: 'Beginner path available; concepts build carefully', focus: 'ownership and reliable command-line tools',
    description: 'Develop precise systems software with ownership and safety in view.',
    objectives: ['Read Rust types and compiler feedback', 'Use ownership and borrowing', 'Represent failures with Result', 'Build a predictable command-line tool'],
    modules: [
      { title: 'Foundations', topics: ['Compile and run Rust', 'Bindings, types, and expressions', 'Input, output, and pattern matching'] },
      { title: 'Thinking in Rust', topics: ['Conditions and iteration', 'Functions and decomposition', 'Use compiler feedback to debug'] },
      { title: 'Core Rust', topics: ['Structs and enums', 'Ownership and borrowing', 'Options, results, and tests'] },
      { title: 'Working With System Data', topics: ['Arguments and paths', 'Read and write files', 'Handle errors without hiding them'] },
      { title: 'Real-World Rust', topics: ['Organize crates and modules', 'Check edge cases', 'Keep resource use predictable'] }
    ],
    quickPractice: 'Parse one command-line option and return a clear error when its value is missing.',
    challenge: 'Summarize a directory safely while handling unreadable entries and documenting skipped files.',
    miniBuild: 'A CLI that counts and summarizes lines in selected text files.',
    project: 'CLI / Systems Utility', projectSummary: 'Solve one repeatable task with safe, predictable command-line behavior.',
    specializations: ['Rust Systems', 'Rust CLI', 'Rust Performance']
  },
  {
    id: 'typescript', language: 'TypeScript', family: 'Web', level: 'Beginner → Intermediate',
    beginner: 'Best after a little JavaScript experience', focus: 'typed web data and interfaces',
    description: 'Make JavaScript applications easier to understand and evolve with types.',
    objectives: ['Describe values with types', 'Model uncertain API data', 'Connect typed data to UI state', 'Test important application behavior'],
    modules: [
      { title: 'Foundations', topics: ['JavaScript and TypeScript roles', 'Inference, annotations, and primitives', 'Compile and run typed code'] },
      { title: 'Thinking in TypeScript', topics: ['Narrowing and control flow', 'Functions and reusable types', 'Read useful compiler errors'] },
      { title: 'Core TypeScript', topics: ['Objects, unions, and generics', 'Modules and strictness', 'Runtime validation boundaries'] },
      { title: 'Working With APIs', topics: ['Type response shapes', 'Model loading and error states', 'Keep runtime data checks explicit'] },
      { title: 'Real-World TypeScript', topics: ['Organize a typed web app', 'Connect UI and service data', 'Test data-driven behavior'] }
    ],
    quickPractice: 'Define a type for a task and write a function that formats one task for display.',
    challenge: 'Handle an API response that can be loading, successful, or failed without ambiguous UI states.',
    miniBuild: 'A typed search interface backed by a small sample data set.',
    project: 'Typed API-powered Web Application', projectSummary: 'Connect a clear interface to validated service data and explicit UI states.',
    specializations: []
  },
  {
    id: 'php', language: 'PHP', family: 'Web', level: 'Beginner → Intermediate',
    beginner: 'Beginner-friendly for server-side web basics', focus: 'requests, forms, and templates',
    description: 'Learn server-side web fundamentals through requests, templates, and data.',
    objectives: ['Understand request and response flow', 'Validate form input', 'Separate templates and application logic', 'Explain basic web security choices'],
    modules: [
      { title: 'Foundations', topics: ['Run PHP locally', 'Values, variables, and expressions', 'Input, output, and operators'] },
      { title: 'Thinking in PHP', topics: ['Conditions and loops', 'Functions and decomposition', 'Errors and debugging'] },
      { title: 'Core PHP', topics: ['Arrays and functions', 'Classes and modules', 'Exceptions and tests'] },
      { title: 'Working With Web Requests', topics: ['Forms and request methods', 'Validation and escaping', 'Templates and responses'] },
      { title: 'Real-World PHP', topics: ['Organize routes and views', 'Persist relational data', 'Handle errors and security basics'] }
    ],
    quickPractice: 'Validate a submitted display name and show a useful message when it is empty.',
    challenge: 'Design a contact request flow that validates input and presents success and error states clearly.',
    miniBuild: 'A server-rendered reading list with an add-item form.',
    project: 'Server-rendered Web Application', projectSummary: 'Turn a useful form flow into a clear page experience from request to response.',
    specializations: []
  },
  {
    id: 'html', language: 'HTML', family: 'Web foundations', level: 'Foundation',
    beginner: 'An ideal first step into building for the web', focus: 'semantic page structure and accessibility',
    description: 'Give web content a meaningful, accessible structure.',
    objectives: ['Choose semantic elements', 'Create clear page landmarks', 'Build usable forms and links', 'Check structure with accessibility tools'],
    modules: [
      { title: 'Foundations', topics: ['How a browser reads a page', 'Elements, attributes, and nesting', 'Headings and document structure'] },
      { title: 'Thinking in HTML', topics: ['Choose meaning before appearance', 'Group related information', 'Debug invalid nesting'] },
      { title: 'Core HTML', topics: ['Links, lists, and media', 'Tables and data relationships', 'Forms and labels'] },
      { title: 'Working With Accessibility', topics: ['Landmarks and headings', 'Keyboard-friendly controls', 'Useful text alternatives'] },
      { title: 'Real-World HTML', topics: ['Plan multi-page navigation', 'Validate page structure', 'Review content with assistive technology'] }
    ],
    quickPractice: 'Mark up a short article with a meaningful heading hierarchy and one descriptive link.',
    challenge: 'Structure an event page with schedule, location, registration form, and clear landmarks.',
    miniBuild: 'A three-page guide with consistent navigation and accessible headings.',
    project: 'Accessible Multi-page Website', projectSummary: 'Organize useful information into a clear site structure that works with keyboard navigation.',
    specializations: []
  },
  {
    id: 'css', language: 'CSS', family: 'Web foundations', level: 'Foundation',
    beginner: 'An ideal companion to HTML foundations', focus: 'responsive layout and reusable design patterns',
    description: 'Shape responsive, consistent interfaces from layout to small details.',
    objectives: ['Understand the cascade and box model', 'Build layouts with flexbox and grid', 'Adapt content to screen size', 'Create reusable visual tokens'],
    modules: [
      { title: 'Foundations', topics: ['Selectors and declarations', 'Cascade, inheritance, and values', 'Color, type, and spacing'] },
      { title: 'Thinking in CSS', topics: ['Box model and sizing', 'Choose layout constraints', 'Inspect and debug computed styles'] },
      { title: 'Core CSS', topics: ['Flexbox and grid', 'Responsive queries', 'States, focus, and motion'] },
      { title: 'Working With Design Systems', topics: ['Reusable custom properties', 'Consistent component patterns', 'Accessible contrast and focus'] },
      { title: 'Real-World CSS', topics: ['Progressive responsive layout', 'Prevent overflow and clipping', 'Review across viewport sizes'] }
    ],
    quickPractice: 'Create a spacing token and use it to align a heading, paragraph, and action consistently.',
    challenge: 'Turn a fixed two-column panel into a layout that remains readable on a narrow phone.',
    miniBuild: 'A responsive profile card with clear focus and hover states.',
    project: 'Responsive Interface / Design System', projectSummary: 'Create reusable visual patterns that remain legible across screen sizes.',
    specializations: []
  },
  {
    id: 'sql', language: 'SQL', family: 'Data', level: 'Beginner → Intermediate',
    beginner: 'Beginner-friendly for working with structured data', focus: 'relational questions and query results',
    description: 'Ask useful questions of relational data and explain what the results mean.',
    objectives: ['Read table and relationship structures', 'Filter, sort, and aggregate rows', 'Join related tables safely', 'Explain query assumptions and findings'],
    modules: [
      { title: 'Foundations', topics: ['Tables, rows, and columns', 'Types, keys, and constraints', 'Read a simple SELECT query'] },
      { title: 'Thinking in SQL', topics: ['Filter and sort results', 'Break a question into query steps', 'Check nulls and duplicate rows'] },
      { title: 'Core SQL', topics: ['Aggregation and grouping', 'Joins and relationships', 'Subqueries and common table expressions'] },
      { title: 'Working With Relational Data', topics: ['Model entities and keys', 'Insert and update safely', 'Understand transactions'] },
      { title: 'Real-World SQL', topics: ['Compare query results to the question', 'Inspect query cost basics', 'Document assumptions and limits'] }
    ],
    quickPractice: 'Count records by category and explain what happens when a category is missing.',
    challenge: 'Join related tables to answer a question while avoiding duplicate counts.',
    miniBuild: 'A small set of documented queries that summarizes a sample dataset.',
    project: 'Relational Data Exploration Project', projectSummary: 'Answer a focused question with transparent queries and explainable results.',
    specializations: []
  }
]);

const PROGRAMMING_TRACK_PROGRESS_TEMPLATE = Object.freeze({
  available: false,
  trackStartedAt: null,
  moduleCompletion: [], lessonCompletion: [], challengeCompletion: [],
  miniProjectCompletion: [], finalProjectStatus: null, presentationStatus: null
});

const PROGRAMMING_JOURNEY_STAGE_BLUEPRINT = Object.freeze([
  { id: 'foundations', label: 'Foundations' },
  { id: 'thinking', label: 'Thinking in {language}' },
  { id: 'core', label: 'Core {language}' },
  { id: 'application', label: 'Working With {focus}' },
  { id: 'real-world', label: 'Real-World {language}' },
  { id: 'challenges', label: 'Progressive Challenges' },
  { id: 'project', label: 'Build a Project' },
  { id: 'presentation', label: 'Present Your Project' }
]);

const PROGRAMMING_STUDIO_CONFIG = Object.freeze({
  presentationFields: PROGRAMMING_PRESENTATION_FIELDS,
  projectMilestones: PROGRAMMING_PROJECT_MILESTONES,
  journeyStages: PROGRAMMING_JOURNEY_STAGE_BLUEPRINT,
  practiceSequence: Object.freeze(['Understand', 'Quick practice', 'Challenge', 'Mini-build', 'Project']),
  tracks: Object.freeze(PROGRAMMING_TRACKS.map(track => Object.freeze({
    ...track,
    journeyStages: Object.freeze(PROGRAMMING_STUDIO_CONFIG_STAGES(track)),
    learningStatus: 'blueprint',
    progress: PROGRAMMING_TRACK_PROGRESS_TEMPLATE
  })))
});

window.PROGRAMMING_STUDIO_CONFIG = PROGRAMMING_STUDIO_CONFIG;

function PROGRAMMING_STUDIO_CONFIG_STAGES(track) {
  const moduleStages = track.modules.map((module, index) => ({
    id: module.id || `module-${index + 1}`,
    title: module.title,
    topics: module.topics,
    status: 'planned-outline'
  }));
  return [
    ...moduleStages,
    { id: 'challenges', title: PROGRAMMING_JOURNEY_STAGE_BLUEPRINT[5].label, topics: ['Combine concepts', 'Explain an approach', 'Review edge cases'], status: 'planned' },
    { id: 'project', title: `${PROGRAMMING_JOURNEY_STAGE_BLUEPRINT[6].label}: ${track.project}`, topics: ['Idea and plan', 'Build and test', 'Improve the result'], status: 'example-direction' },
    { id: 'presentation', title: PROGRAMMING_JOURNEY_STAGE_BLUEPRINT[7].label, topics: PROGRAMMING_PRESENTATION_FIELDS, status: 'framework-planned' }
  ];
}
