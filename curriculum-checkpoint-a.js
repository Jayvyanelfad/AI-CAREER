// Authored learning content for checkpoint A. Lesson IDs are resolved by
// exact course/module/lesson titles when generating the guarded migration.
const courses = {
  data_analytics_basics: {
    objective: 'By the end, you will clean a small business dataset, calculate useful summaries, compare performance, and present a recommendation with its limits. No coding experience is required; spreadsheet experience is helpful but optional. Plan for about 6 hours. You will produce a short Business Performance Explorer analysis.',
    modules: {
      'Foundations of Data Analytics': 'Turn a real question into a trustworthy analysis. Start with the decision, identify suitable data, and check its quality before calculating anything.',
      'Data Analysis Techniques': 'Summarize and explore a dataset without confusing a pattern with proof. Practice comparisons, distributions, and responsible interpretation.',
      'Tools and Technologies': 'Use spreadsheet, SQL, Python, and charting concepts as complementary ways to answer a business question, then communicate a defensible finding.'
    },
    lessons: {
      'What is Data Analytics?': [
        'Explain how analysis connects a decision to evidence and a useful next step.',
        'A neighborhood shop has fewer repeat visits this month. The owner needs to decide whether to change opening hours, promote a product, or first collect better information.',
        'Which decision is actually being made? A useful analysis starts by keeping that decision in view.',
        'Data analytics is the process of asking a focused question, preparing relevant evidence, examining it, and explaining what it can support.',
        'For example, compare weekly repeat-customer counts with opening hours and promotion dates. A lower count is a signal to investigate, not proof that one change caused it.',
        'Write one question the shop could answer this week. Name the decision it would inform and one alternative explanation for the result.',
        'Analysis earns its place when evidence helps someone make a better decision. Keep the question and the limits of the evidence visible.'
      ],
      'The Data Analytics Workflow': [
        'Arrange an analysis into question, data, preparation, exploration, communication, and action.',
        'A team receives a spreadsheet and immediately calculates a monthly average. Later they discover several rows are duplicated and the date range excludes the busiest week.',
        'What check would have prevented the wrong conclusion? A repeatable workflow puts the question and data checks before the calculation.',
        'Define the decision; inspect source and time range; clean with a record of changes; summarize; visualize; explain uncertainty; recommend a next step. Return to the question when results do not answer it.',
        'For a delivery service, ask “Which routes missed the promised window last week?” Confirm what counts as late, inspect missing timestamps, then calculate the late share by route.',
        'Put these tasks in order for a question you care about: choose a chart, define the question, check missing values, recommend an action. Explain why your order protects trust.',
        'A workflow is a set of quality gates, not paperwork. Correct interpretation depends on the decisions made at every step.'
      ],
      'Types of Data: Quantitative vs Qualitative': [
        'Distinguish numeric measurements from categories and text, and choose a suitable summary for each.',
        'A café asks customers for a star rating and an optional comment. The owner wants to know both how ratings changed and what customers found frustrating.',
        'Can a comment be averaged? Ratings are numeric, while comments carry meaning in words. Treating them as the same kind of data hides useful detail.',
        'Quantitative data can be counted or measured, such as minutes waited or items sold. Qualitative data describes groups or experiences, such as order channel or a written complaint. A number used as a label, like postal code, is still categorical.',
        'Summarize wait time with a median and range; count ratings by star; group comments into transparent themes and preserve representative examples.',
        'Classify “5 stars,” “5 minutes,” “online order,” and “customer said the menu was unclear.” Which can be averaged? Which needs grouping or interpretation?',
        'Choose a method based on what a field means, not how it looks in a cell.'
      ],
      'Data Sources and Collection Methods': [
        'Identify who created a dataset, how it was collected, and what population or time period it represents.',
        'A manager compares a voluntary customer survey with every recorded transaction and wonders why the survey reports more complaints.',
        'Who chose to answer the survey? Voluntary responses can overrepresent people with strong opinions, while transactions answer different questions entirely.',
        'A source has provenance: its origin, collection method, definitions, and coverage. A sample is the part observed. If coverage misses a group or period, results may not represent the full population.',
        'Before comparing survey answers with sales, record the dates, invite method, response count, and transaction definition. Avoid joining records unless there is a legitimate, privacy-safe key.',
        'For a question about weekend wait times, list a direct source, a likely coverage gap, and one consent or privacy consideration.',
        'More rows do not guarantee representative evidence. Explain how the data came to exist.'
      ],
      'Data Quality and Cleaning Basics': [
        'Detect missing, duplicated, inconsistent, and implausible values and document any correction.',
        'A sales report shows two orders with the same receipt number and a blank quantity. Deleting both rows would remove genuine information as well as the duplicate.',
        'Which row is repeated, and what evidence identifies it? Cleaning should repair a known issue while keeping a trace of the original.',
        'Check uniqueness, required fields, allowed ranges, consistent units, and date formats. Missing values are not automatically zero; decide whether to exclude, investigate, or label them.',
        'If one item price is recorded as 1200 while similar prices are near 12, verify the source and currency before correcting. Write down the rule and count affected rows.',
        'Review a tiny table with a repeated order ID, blank quantity, and mixed date formats. Mark each issue and propose a reversible treatment.',
        'A clean dataset is one whose known limitations and transformations are understood, not one with every blank erased.'
      ],
      'Descriptive Statistics': [
        'Calculate counts, mean, median, and range, then select a summary that represents the question.',
        'A delivery team reports an average arrival time of 31 minutes. Most deliveries take about 24 minutes, but one storm delay took 115 minutes.',
        'Does the average describe a typical delivery? A single extreme value can pull the mean away from most observations.',
        'Mean adds values and divides by count; median is the middle ordered value; range is maximum minus minimum. Counts describe frequency. None explains why values differ.',
        'For 18, 20, 22, 24, 71 minutes, mean is 31 and median is 22. Show both when the unusually long delivery matters.',
        'For values 4, 5, 5, 6, 30, calculate mean and median. Which better describes an ordinary day, and what important event would it hide?',
        'A statistic is a summary with assumptions. Pair it with context and, when useful, a view of the distribution.'
      ],
      'Data Visualization Principles': [
        'Match a chart to the comparison, time trend, distribution, or relationship a reader needs to see.',
        'A product team puts 18 categories in a pie chart. Readers cannot compare the similarly sized slices or find the biggest change.',
        'What comparison should be easiest? A chart should reduce effort for that task instead of decorating the report.',
        'Use bars for category comparisons, lines for ordered time, and histograms for numeric distributions. Label units, state the period, keep scales honest, and provide a text summary for access.',
        'To compare monthly returns across four product lines, use a grouped bar chart or small multiples. Start a bar axis at zero when bar length encodes magnitude.',
        'Choose a chart for daily website visits and another for the distribution of delivery times. Add the exact title and unit each reader needs.',
        'A truthful chart makes its question, scale, and units easy to inspect.'
      ],
      'Exploratory Data Analysis (EDA)': [
        'Explore a dataset with counts, distributions, and segmented comparisons before settling on a conclusion.',
        'A shop sees total revenue rise and assumes every product is selling better. A deeper view shows the increase came from one seasonal item.',
        'What changes when you split revenue by product and week? A total can hide variation between groups.',
        'Exploratory analysis checks shape, missingness, unusual values, and relationships. Try a few relevant slices, record what you looked for, and distinguish a lead from a tested explanation.',
        'Compare orders and revenue by product and week; then inspect whether a promotion or stock shortage overlaps the change.',
        'Pick one metric and two meaningful groups. State what comparison you would inspect first and one pattern that would change your next question.',
        'Exploration helps form hypotheses. It does not turn a surprising chart into causal evidence.'
      ],
      'Introduction to Statistical Analysis': [
        'Explain how sample size, variation, and uncertainty affect a comparison.',
        'A small pilot tests a new checkout flow with eight shoppers. Seven finish quickly, so the team wants to roll it out to everyone.',
        'Would those eight shoppers represent all customers? A sample can vary by chance and by how people were selected.',
        'Statistics offers tools to describe variation and quantify uncertainty. A confidence interval is a range of plausible values under stated assumptions; it is not a guarantee that the result is correct.',
        'Report the number tested, selection method, typical completion time, and range. Compare like-for-like groups and avoid claiming the design caused a difference without an appropriate test.',
        'Name one reason an eight-person convenience sample may differ from all users. What additional evidence would you collect before a broad rollout?',
        'Use uncertainty to calibrate confidence and the size of the decision, not to decorate a weak result with technical language.'
      ],
      'Correlation and Regression Analysis': [
        'Interpret a relationship between two measures and explain why correlation alone does not establish cause.',
        'An ice-cream shop finds that cold-drink sales and sunscreen sales rise together. It considers bundling them as if one product caused the other.',
        'What else changes on hot days? Temperature can influence both sales, creating a shared pattern without either causing the other.',
        'Correlation describes how two variables move together. A simple regression estimates an association in a chosen form and can help make predictions within the observed range; omitted factors and poor data can mislead.',
        'Plot weekly drink sales against temperature, check unusual weeks, and label the result “associated with.” Do not extrapolate far beyond observed temperatures.',
        'Invent a third factor that could explain a relationship between umbrella sales and traffic delays. Write one cautious sentence about the association.',
        'A relationship is a clue. Causal claims need a design that rules out alternative explanations.'
      ],
      'Working with Spreadsheets': [
        'Use a tidy table, simple formulas, and filters to inspect a small dataset reproducibly.',
        'A coordinator tracks orders in merged cells, colored notes, and totals typed by hand. A second person cannot reliably update the report.',
        'What makes each row a single observation? Consistent columns let spreadsheet tools calculate and check the data.',
        'Keep one header row, one record per row, one variable per column, and avoid merged cells in the data region. Use formulas for calculations and retain a raw copy.',
        'For a table with date, product, quantity, and unit price, add revenue as `=C2*D2`, filter by date, and compare formula totals with a manual spot check.',
        'Sketch four columns for a small bookshop sales table. Add one formula and one validation rule that would catch an impossible quantity.',
        'A spreadsheet is both a working surface and a data model. Consistent structure makes its results easier to audit.'
      ],
      'Introduction to SQL': [
        'Read a basic SQL query and use filtering and grouping to answer a clearly defined question.',
        'A shop has thousands of orders and wants weekly units sold by product without copying rows into a new sheet.',
        'Which rows belong in the answer, and what should be combined? SQL states those choices explicitly.',
        'A `SELECT` names fields or calculations, `FROM` identifies a table, `WHERE` filters rows, and `GROUP BY` forms groups for aggregates such as `SUM` and `COUNT`.',
        'Example: `SELECT product, SUM(quantity) AS units FROM order_items WHERE order_date >= DATE \'2026-01-01\' GROUP BY product;` The date filter limits the question; the grouping produces one result per product.',
        'Add a condition for one product category to a grouped query. What changes if you group by both product and month?',
        'A query is an explicit recipe. Check the date boundary, row grain, and grouping before trusting the total.'
      ],
      'Python for Data Analysis': [
        'Recognize how Python can repeat a transparent cleaning and summary workflow on structured data.',
        'A weekly report is copied by hand every Monday. Small edits to one formula create inconsistent totals across months.',
        'Which steps are repeated and checkable? Code can make a process consistent, but it still needs validation and a reader who understands the result.',
        'A common beginner workflow loads a CSV with pandas, inspects columns and missing values, transforms selected fields, and summarizes groups. Confirm library versions and data types before analysis.',
        'Illustrative pandas: `df = pandas.read_csv("sales.csv")`; `df["revenue"] = df["quantity"] * df["unit_price"]`; `df.groupby("product")["revenue"].sum()`. Inspect sample rows and totals against a known check.',
        'Write the sequence of checks you would perform before sharing a grouped total. Include one way to detect a wrong data type or missing quantity.',
        'Automation improves repeatability, not truth by itself. Keep the transformation readable and check its output.'
      ],
      'Business Intelligence Tools': [
        'Describe how a dashboard helps users monitor a defined set of measures without hiding their definitions.',
        'A regional manager opens a dashboard showing a red sales number but cannot tell whether it is month-to-date, last month, or a target variance.',
        'What decision should the number support? A dashboard is useful only when measures, filters, timing, and ownership are clear.',
        'Business intelligence tools connect data sources to curated measures and interactive views. A dashboard should emphasize a few decision-relevant signals and let a reader inspect context.',
        'A service dashboard might show weekly ticket volume, median first response, and unresolved tickets older than a target. Include the period, unit, filter state, and a link to detail.',
        'Design three measures for a delivery operations dashboard. Define each numerator/denominator or calculation and identify who should act on a change.',
        'A polished dashboard cannot repair an ambiguous metric. Document definitions and make the next action apparent.'
      ],
      'Data Storytelling and Communication': [
        'Present a finding, supporting evidence, caveat, and practical recommendation in a concise narrative.',
        'A store owner has two minutes before a planning meeting. A report with twelve charts leaves the team unsure what to do next.',
        'What is the one decision and what evidence changes it? A clear story directs attention while leaving enough detail for scrutiny.',
        'State the question, finding, evidence, limitation, and recommendation. Separate observed facts from interpretation; show the time period and comparison behind a claim.',
        'Business Performance Explorer project: use a small, synthetic or appropriately authorized sales table. Clean it, compare weekly revenue and units by product, visualize one pattern, and recommend one experiment. Present the source, steps, chart, caveat, and next measure.',
        'Draft a five-sentence presentation: decision question; finding with metric and period; evidence; caveat; proposed action and follow-up measure. Do not imply that a synthetic dataset represents a real business.',
        'A useful analysis ends with a decision someone can test. Preserve the evidence and caveats alongside the recommendation.'
      ]
    }
  },
  web_dev: {
    objective: 'By the end, you will explain how a browser requests and renders a page, build a semantic responsive site with HTML, CSS, and JavaScript, and check accessibility and delivery. No programming background is required; plan for about 8 hours. Your outcome is a responsive personal or product website.',
    modules: {
      'HTML and CSS Foundations': 'Describe the browser’s role, structure a page with semantic HTML, and style readable layouts with CSS.',
      'JavaScript Essentials': 'Add small, accessible interactions by connecting JavaScript events to the page structure and state.',
      'Frontend Development and Deployment': 'Make the site responsive, inspect performance and accessibility, use version control, and prepare a clear deployment handoff.'
    },
    lessons: {
      'Introduction to HTML': [
        'Explain how HTML gives a page structure and write a small document with meaningful elements.',
        'A community group publishes an event page. Visitors using a screen reader need to find the date and registration details as quickly as sighted visitors.',
        'Which text is the page’s main heading and which is a section? Structure communicates relationships to browsers and assistive technology.',
        'HTML elements describe content roles. A document typically has a doctype, `html`, `head` metadata, and `body` content. Use headings in a logical outline and links for navigation.',
        'A page might contain `<main><h1>Garden Open Day</h1><p>Saturday, 10 am</p><a href="signup.html">Register</a></main>`. The heading names the page; the link says where it goes.',
        'Sketch the semantic outline for a product page: one title, two sections, and a link to specifications. Avoid choosing tags only for their default appearance.',
        'HTML is the document’s meaning and structure. CSS can change appearance without changing that meaning.'
      ],
      'CSS Basics: Styling Web Pages': [
        'Connect a CSS rule to selected HTML elements and use readable styles without changing content meaning.',
        'A local club wants the same event page to feel calm and readable on phones and laptops.',
        'Which visual choices help a visitor scan the date and action? Styling should strengthen hierarchy rather than compete with it.',
        'A CSS rule has a selector and declarations. Properties such as `color`, `font-size`, and `margin` affect presentation; the cascade resolves rules by origin, specificity, and order.',
        'Use `main { max-width: 42rem; margin: 2rem auto; padding: 1rem; }` to limit line length and center the content. Add contrast and a visible focus style for links.',
        'Style a heading, paragraph, and link. Predict which declaration wins when two rules set the heading color and explain how you checked.',
        'Readable type, spacing, contrast, and focus are functional design decisions, not decoration.'
      ],
      'HTML5 Semantic Elements': [
        'Choose semantic elements for page regions and interactive controls based on their purpose.',
        'A page built entirely from generic containers looks fine, but keyboard users cannot quickly identify its navigation or main content.',
        'What regions should be landmarks? Semantic elements give both browsers and assistive technology useful structure.',
        '`header`, `nav`, `main`, `article`, `section`, and `footer` communicate roles. Use a `button` for an action and an `a` for navigation; do not rely on clickable generic elements.',
        'An event card can be an `article` with a heading, details, and a link to the full event. A site-wide menu belongs in `nav` with a clear label when multiple nav regions exist.',
        'Given “open menu,” “go to schedule,” and “event description,” choose the appropriate interactive or structural element for each.',
        'Semantic markup improves navigation and resilience. Pick elements for their meaning and native behavior.'
      ],
      'CSS Box Model and Positioning': [
        'Predict how content, padding, border, and margin contribute to an element’s size and spacing.',
        'A card unexpectedly overflows its column after padding is added, pushing the call-to-action off screen.',
        'Does the declared width include the padding? The box model explains why an element can become wider than its content width.',
        'The default content box adds padding and border outside the declared width. `box-sizing: border-box` includes them in that width. Positioning should support layout rather than patch every spacing issue.',
        'With `width: 20rem; padding: 1rem; border: 2px solid`, content-box total width is 22rem plus border; border-box keeps the outside width at 20rem.',
        'Calculate the outside width for a 300px content box with 16px padding and 1px border on each side. Then choose one global rule to simplify sizing.',
        'When layout surprises you, inspect the box dimensions and containing block before adding offsets.'
      ],
      'Responsive Design Fundamentals': [
        'Build a layout that adapts to narrow and wide viewports without horizontal overflow or lost content.',
        'A portfolio looks elegant on a laptop, but the project cards become tiny columns on a phone.',
        'What should reflow, wrap, or remain prioritized? Responsive design preserves the task as space changes.',
        'Start with flexible widths, readable line lengths, and content order. Add media queries when the design no longer fits, not for a list of device models.',
        'A grid such as `repeat(auto-fit, minmax(min(100%, 16rem), 1fr))` lets cards wrap while preserving a useful minimum width. Test text zoom and long labels too.',
        'Plan how a two-column introduction and card grid should behave at 360px and 1100px. Name the first layout constraint that triggers a change.',
        'Responsive means the content remains usable across viewports, input methods, and zoom settings.'
      ],
      'JavaScript Basics': [
        'Describe how JavaScript values, variables, and expressions can make a page respond to changing information.',
        'An event page wants to display how many seats remain after a visitor reserves one.',
        'Which value changes, and which calculation should use it? Naming state makes the behavior easier to reason about.',
        'JavaScript stores values in variables, evaluates expressions, and can update the page. Use `const` when a binding is not reassigned and `let` when it is; avoid accidental global state.',
        'With `const capacity = 40; let reserved = 12; const remaining = capacity - reserved;`, the page can display 28. Validate any user-supplied value before using it.',
        'Trace `let count = 3; count = count + 1;` and write the displayed value. What should the UI say if the input is not a number?',
        'A page interaction is easier to trust when its state and transformations are explicit.'
      ],
      'DOM Manipulation and Events': [
        'Select a page element, respond to an event, and update text without replacing the whole document.',
        'A visitor filters a list of community events by selecting “online.” They expect the list and result count to update immediately.',
        'What user action starts the change? An event listener connects an action to a small, testable response.',
        'The DOM is the browser’s object representation of the document. Query a stable element, attach a listener, then update text or classes. Prefer `textContent` for untrusted text.',
        'A button listener can increment a visible counter: `button.addEventListener("click", () => { count += 1; output.textContent = String(count); });` Ensure the button is a real button with a useful label.',
        'Plan the event, state change, and visible result for an “online only” checkbox. How will a keyboard user operate it?',
        'Events turn user actions into behavior. Keep the state change understandable and expose its result.'
      ],
      'JavaScript Functions and Scope': [
        'Extract repeated behavior into a function with clear inputs and output.',
        'Two parts of a page format dates differently, so the same event appears as “May 2” in one place and “02/05” in another.',
        'What rule should both views share? A function gives that rule one named home.',
        'A function groups steps and can accept parameters. Local variables stay within their scope, which reduces accidental collisions and makes assumptions explicit.',
        'A `formatEventLabel(title, date)` function can return one display string. Keep formatting separate from DOM updates so it is easier to test.',
        'Design a function that takes a list of events and a category and returns matching events. State its behavior for an empty category.',
        'Small functions are useful when their name, inputs, and result match one clear responsibility.'
      ],
      'Working with Arrays and Objects': [
        'Represent a collection of similarly shaped records and select or transform them with array operations.',
        'A volunteer needs to show the next three events from a schedule instead of hardcoding three separate cards.',
        'What fields does every event need? Consistent objects make collection-level operations predictable.',
        'An array holds an ordered collection; an object groups named properties. Methods such as `filter`, `map`, and `slice` can express selection, display transformation, and limiting.',
        'For `[{title:"Talk", online:true}, ...]`, filter by `event.online`, map to labels, and limit the displayed list. Handle missing or malformed data explicitly.',
        'Write the sequence of operations to show titles for the first five upcoming events. How would you avoid mutating the original collection?',
        'Model records consistently and choose operations that reveal the intent of the interface.'
      ],
      'Asynchronous JavaScript: Callbacks and Promises': [
        'Explain why a network request completes later and handle success and failure without freezing the page.',
        'The events page requests the schedule from a service. Some visitors have a slow connection or no connection at all.',
        'What should appear while the result is pending? A request has a lifecycle the interface should make visible.',
        'A Promise represents a future result. `async`/`await` makes the flow readable, but requests can reject or return an HTTP error that code must check.',
        'Use `const response = await fetch(url); if (!response.ok) throw new Error("Schedule unavailable"); const events = await response.json();`. Show loading, empty, and error states.',
        'Sketch how a screen changes through loading, success with zero events, success with events, and failure. Why is an empty result different from an error?',
        'Asynchronous work needs honest loading and recovery states as well as a happy path.'
      ],
      'CSS Frameworks: Bootstrap and Tailwind': [
        'Evaluate a CSS framework as a tool while keeping layout, accessibility, and project requirements in control.',
        'A small team wants to build a consistent set of cards quickly, but its site already has a visual identity and semantic markup.',
        'What problem should the framework solve? Adding a dependency has costs in learning, bundle size, and customization.',
        'Frameworks provide reusable conventions or utility classes. They do not choose good content order, color contrast, or accessible interactions for you.',
        'Before adopting one, prototype a navigation bar and card, compare the output with project styles, and inspect keyboard focus and generated CSS.',
        'List one benefit and one cost of using a framework for a three-page portfolio. What small experiment would settle the decision?',
        'Choose tools against real constraints, and understand the markup and behavior they generate.'
      ],
      'Version Control with Git': [
        'Use a small Git workflow to record intentional changes and recover a known version.',
        'A project owner changes colors, navigation, and JavaScript in one late-night edit, then cannot identify which change broke the page.',
        'How can each change be reviewed separately? Version control records snapshots and makes comparison possible.',
        '`git status` shows changed files, `git diff` reveals edits, and a commit records a deliberate set with a message. A branch can isolate a proposed change.',
        'Commit a semantic HTML pass separately from a responsive layout pass. Review the diff and keep secrets and generated files out of the repository.',
        'Plan three small commits for the website project. What belongs in each, and what should never enter version control?',
        'A useful history makes changes reviewable and reversible. Small commits help locate regressions.'
      ],
      'Web Performance Optimization': [
        'Identify common causes of slow page loading and choose a measurement before optimizing.',
        'A portfolio hero uses a 9 MB photo and a custom font. Visitors on mobile data wait several seconds before seeing the page.',
        'Which resource delays the first useful view? Measure before replacing assets at random.',
        'Large images, unnecessary JavaScript, render-blocking resources, and layout shifts can hurt performance. Resize and compress images, load only needed code, and preserve dimensions to avoid shifts.',
        'Compare the same page before and after converting an oversized hero to an appropriately sized modern image. Record transfer size and a repeatable load metric.',
        'Inspect your project assets and identify the largest avoidable cost. What metric and device condition will you use to check improvement?',
        'Performance work is a measured tradeoff. Keep visual quality and accessibility while reducing avoidable work.'
      ],
      'Web Accessibility (a11y)': [
        'Check common access barriers in structure, keyboard operation, labels, contrast, and alternative text.',
        'A visitor navigates a product page using only a keyboard and cannot tell which control currently has focus.',
        'Can each task be completed without a mouse, and is the current location visible? Access is part of functionality.',
        'Use semantic HTML, logical focus order, visible focus indicators, sufficient contrast, descriptive labels, and meaningful alternative text. Automated tools catch some issues; human checks remain necessary.',
        'A decorative image can use empty alt text, while a chart needs a concise description and the data in accessible text. A placeholder is not a persistent form label.',
        'Keyboard-test the navigation and form in your project. Record one issue, its impact, and the change that resolves it.',
        'Accessible interfaces give people more than one reliable way to understand and operate the page.'
      ],
      'Deploying Websites': [
        'Combine semantic markup, responsive styling, a purposeful interaction, and verification into a small portfolio-ready site.',
        'A designer needs a page that helps a visitor understand a product and decide whether to request a demonstration.',
        'What is the visitor trying to learn, and what evidence makes the next action trustworthy? Start with a real user goal, not a collection of effects.',
        'Project plan: choose audience and one task; sketch content hierarchy; build semantic HTML; add responsive CSS; implement one accessible interaction; test keyboard, viewport, and error states; improve one measured issue.',
        'A product site might include a clear problem statement, three benefits tied to evidence, a comparison section, and a labeled contact form. Use placeholder contact data, never real personal data in a public demo.',
        'Prepare a short presentation: audience and problem, design choice, browser flow, accessibility/performance checks, what changed after testing, and one next improvement. Capture evidence only from your own project.',
        'A finished project explains its decisions and limitations. Deployment and persisted learner submissions are separate capabilities; do not claim the platform stores this work.'
      ]
    }
  },
  dsa: {
    objective: 'By the end, you will model common collections, trace search and sorting approaches, reason about work as input grows, and explain a small problem-solving toolkit. Basic programming in any language is recommended; plan for about 10 hours. You will build and present an algorithmic toolkit with tested examples.',
    modules: {
      'Core Data Structures': 'Choose arrays, strings, stacks, queues, and linked structures by the operations a problem needs.',
      'Advanced Data Structures': 'Use hash maps, trees, and graphs to model relationships and compare practical tradeoffs.',
      'Algorithm Design and Analysis': 'Break down a problem, select search or sort strategies, reason about growth, and verify a small toolkit.'
    },
    lessons: {
      'Arrays and Strings': [
        'Trace indexed access and insertion in an array-backed collection.',
        'A playlist lets a listener jump directly to track 80, but inserting a song at the beginning shifts many later positions.',
        'Why is jumping to an index different from inserting in the middle? These operations touch different amounts of data.',
        'Arrays store elements in indexed order, enabling constant-time access by index in the usual model. Inserting or deleting within a dense array may require shifting later elements; dynamic arrays occasionally resize.',
        'For `[A, B, C, D]`, insert `X` at index 1: move `B`, `C`, and `D`, then place `X`. Accessing index 3 does not require scanning from index 0.',
        'Trace the array after removing index 0 from `[red, blue, green]`. Which elements move, and which operation is efficient?',
        'A data structure’s name matters less than the cost of its operations in your use case.'
      ],
      'Stacks and Queues': [
        'Distinguish last-in-first-out and first-in-first-out behavior and select one for a workflow.',
        'An editor’s Undo should reverse the latest action first, while a printer should normally process submitted jobs in arrival order.',
        'Which item leaves first? The order rule determines the right abstraction.',
        'A stack uses push/pop at one end (LIFO). A queue adds at the back and removes from the front (FIFO). Both can be implemented with different underlying structures.',
        'Push “type A,” “delete A,” then “paste B” onto an undo stack. The first undo reverses paste B. A print queue processes job 1 before job 2.',
        'Choose a stack or queue for browser back history, customer support tickets, and a function-call trace. Explain one choice that may need a priority policy.',
        'Order of work is a behavior users notice. Model it directly with the appropriate operations.'
      ],
      'Linked Lists': [
        'Trace how linked nodes reference neighboring values and compare traversal with indexed access.',
        'A music player frequently inserts a song after the currently playing track, but rarely jumps to a numbered position.',
        'What reference must change to insert a node? Linked structures can make local edits simple while making distant access slower.',
        'A linked list stores nodes connected by references. Traversal visits nodes in sequence; finding position k requires walking from a known end or node. Extra references use memory and bugs can break links.',
        'For `A → C`, insert B by linking A to B and B to C. If only the head is known, reaching the thousandth node takes a sequence of visits.',
        'Draw the pointer updates to remove B from `A → B → C`. What must be handled if B is the head or tail?',
        'Linked lists suit some local update patterns, but they are not automatically faster than arrays.'
      ],
      'Hash Tables and Hashing': [
        'Use a key-based map for lookup and a set for membership while accounting for collisions and ordering.',
        'A support team needs to find a ticket by identifier among thousands of records and avoid processing the same ID twice.',
        'Would scanning every record on every request scale well? A hash function maps keys to locations for expected fast lookup.',
        'A hash map stores key-value associations; a set stores unique values. Collisions require resolution, and performance depends on hash quality, resizing, and implementation. Do not rely on iteration order unless documented.',
        'Map ticket ID `T-42` to its record; use a set of seen IDs to detect duplicates. Validate that IDs are normalized before lookup.',
        'Choose a map or set for a word-frequency counter and for removing duplicate usernames. What should happen when a key already exists?',
        'Hashing makes many lookups efficient in practice, with tradeoffs and assumptions worth stating.'
      ],
      'Trees and Binary Trees': [
        'Read parent-child relationships and use tree terms to explain hierarchical data.',
        'A company directory has departments, teams, and people. A flat list makes it hard to understand reporting structure.',
        'Which relationships form parent and child links? A tree models nested hierarchy without requiring every item to compare with every other item.',
        'A rooted tree has a root, children, leaves, and paths. A binary search tree additionally orders values; ordinary trees do not guarantee fast search unless their shape and rules support it.',
        'Represent a file system folder with child folders and files. Traversal can visit every descendant to calculate total file count.',
        'Draw a three-level category tree. Identify root, one leaf, and the path to a chosen item. What changes if one node has many children?',
        'Use tree language to describe actual relationships, and avoid assuming all trees are balanced or searchable.'
      ],
      'Graphs and Graph Representations': [
        'Model entities and relationships as vertices and edges, including direction and weight when needed.',
        'A transit planner must represent stations connected by routes, where some routes take longer or operate in one direction.',
        'Are connections symmetric? A list of stations alone cannot express all route relationships.',
        'A graph has vertices and edges. Edges may be directed or undirected and may carry weights. An adjacency list stores each vertex’s neighbors efficiently for many sparse graphs.',
        'Represent a one-way bus route A→B with an edge and travel time as its weight. Do not assume B→A exists unless the data says so.',
        'Model three people connected by “follows” relationships. Mark directed edges and explain what a two-way friendship would require.',
        'Choose graph details from the real relationship. Direction and weight change which algorithms are appropriate.'
      ],
      'Searching Algorithms': [
        'Compare linear and binary search and state the precondition for binary search.',
        'A librarian checks a shelf of unsorted returns, then later searches a catalog sorted by title.',
        'Can the librarian safely skip half the sorted catalog? Only if the order is correct and stable for the chosen comparison.',
        'Linear search checks items in sequence and works without sorting. Binary search repeatedly halves a sorted range, taking logarithmic comparisons; on unsorted data, that elimination rule is invalid.',
        'In 16 sorted values, binary search needs at most about 5 comparisons because 16→8→4→2→1. Linear search might inspect all 16.',
        'Choose a method for one lookup in an unsorted list and for thousands of lookups in a sorted list. Include sorting cost and update frequency in your reasoning.',
        'Algorithm choice includes preconditions and the cost of preparing data, not only the search loop.'
      ],
      'Sorting Algorithms': [
        'Describe a sorting algorithm’s work and choose a practical approach for a given input size and constraint.',
        'A store wants products ordered by price, while keeping products with equal prices in their original display order.',
        'Does equal-key order matter? Stability and memory can matter as much as the headline runtime.',
        'Simple insertion sort can be effective for small or nearly sorted lists but has quadratic worst-case comparisons. Efficient general sorts often use O(n log n) comparisons; exact behavior depends on implementation and input.',
        'For `[3, 1, 2]`, insertion sort grows a sorted prefix: `[1, 3, 2]`, then `[1, 2, 3]`. A stable sort preserves the relative order of equal prices.',
        'Sort five named tasks by priority and retain arrival order for ties. State the property your chosen sort must preserve.',
        'Measure the complete behavior you need: correctness, stability, memory, and performance.'
      ],
      'Asymptotic Notation': [
        'Use Big O as a high-level description of how work grows with input size.',
        'A report that scans every pair of customer records works for 100 rows but slows sharply when records reach one million.',
        'How does doubling input change the work? Growth helps compare approaches before timing them on one machine.',
        'O(n) grows roughly with input length; O(n²) can grow about four times when input doubles; O(log n) grows slowly. Big O omits constants and does not predict exact runtime.',
        'A nested loop over all pairs has quadratic work. A single pass to count values in a map is typically linear expected work, plus map operations.',
        'Estimate the growth of one loop over n items and two nested loops over n items. Which would you measure first for n=10,000?',
        'Complexity is a comparison tool. State assumptions and use measurements to check real workloads.'
      ],
      'Heaps and Priority Queues': [
        'Use a heap-backed priority queue when the next item should be chosen by priority rather than arrival order.',
        'A clinic receptionist needs to bring the most urgent waiting case to the top while preserving a clear tie-breaking rule.',
        'A normal queue serves first-in-first-out, but urgency changes the selection rule. A priority queue makes that rule explicit.',
        'A binary heap is a nearly complete tree with a parent-child priority invariant. It supports retrieving the highest or lowest priority efficiently; it does not keep every item fully sorted.',
        'Insert tasks with priorities 2, 5, and 3 into a max-priority queue. The next task has priority 5; ties need a documented policy such as earlier arrival first.',
        'Choose a heap or regular queue for an email outbox and an emergency alert dispatcher. What can go wrong if equal priorities have no stable ordering?',
        'Choose a priority queue when selection by rank is central; do not use a heap as if it were a sorted array.'
      ],
      'Tries and String Processing': [
        'Explain how a trie shares prefixes and when that can help prefix search.',
        'A search box suggests place names after each typed character. Rechecking every full name from scratch wastes repeated prefix work.',
        'What do “San” and “Santa” share? A trie represents common prefixes as shared paths.',
        'A trie stores keys one symbol at a time along edges. Prefix lookup follows the typed path, then explores descendants for matches. Memory use can be high, especially with sparse alphabets.',
        'For “map,” “man,” and “mat,” the path `m → a` is shared, then the final letters branch. Define case, Unicode normalization, and maximum suggestion count for a real search.',
        'Draw a trie for “cat,” “car,” and “dog.” Circle the prefix path for “ca” and identify a memory tradeoff.',
        'A specialized structure helps when its operation matches the product need; prefix search is the trie’s strength.'
      ],
      'Disjoint Set Union (Union-Find)': [
        'Use disjoint-set union to track which items belong to the same connected group as links are added.',
        'A network technician is connecting devices and wants to know whether two devices are already in the same connected component.',
        'Can every query recompute all connectivity from scratch? A disjoint-set structure remembers component representatives.',
        '`find(x)` returns a representative for x’s set; `union(a,b)` merges two sets. Path compression and union by rank/size make operations nearly constant amortized time in common analyses.',
        'If `find(A)=R1` and `find(B)=R2`, union merges their groups. A later find for any member should lead to the same representative.',
        'Track groups `{A,B}`, `{C}`, `{D,E}` after `union(B,C)` then `union(A,E)`. Which pairs are connected now?',
        'Union-Find is suited to merging connectivity groups; it does not efficiently split a group after a link is removed.'
      ],
      'Segment Trees and Binary Indexed Trees': [
        'Recognize range-query workloads and explain how a tree can trade extra memory for faster repeated updates and queries.',
        'A dashboard receives daily totals and repeatedly asks for the sum over a selected week, even as individual days are corrected.',
        'Would recomputing every selected range be expensive when queries repeat? Precomputed summaries can combine smaller intervals.',
        'A segment tree stores aggregates for intervals and supports point updates and range queries in logarithmic time with linear-scale storage. A Fenwick (binary indexed) tree is a compact option for prefix sums and point updates.',
        'For daily counts, a query over days 4–7 can combine stored subranges rather than add every day individually. The aggregate must support the chosen combination operation.',
        'Given millions of values, frequent point updates, and range-sum queries, explain why a Fenwick tree may fit. What would make a simple prefix array preferable?',
        'These structures solve a specific repeated-query tradeoff. Use them only when simpler approaches no longer meet the need.'
      ],
      'Graph Algorithms': [
        'Trace breadth-first and depth-first traversal and select shortest-path methods based on edge weights.',
        'A route planner needs a path between stations. Some routes are equal-length; others have different travel times.',
        'Does “fewest edges” mean “shortest travel time”? The algorithm depends on what an edge and its weight represent.',
        'BFS finds paths with the fewest edges in an unweighted graph. DFS explores deeply and helps with reachability and structure. Dijkstra’s algorithm handles nonnegative edge weights; negative weights need different methods.',
        'For an unweighted map, BFS explores all stations one transfer away before two transfers away. For travel minutes, use weights and do not substitute ordinary BFS.',
        'Choose BFS, DFS, or Dijkstra for: fewest links, exploring a dependency tree, and least total time with nonnegative costs. State each graph assumption.',
        'A graph algorithm’s correctness depends on the model and its preconditions.'
      ],
      'Dynamic Programming and Greedy Algorithms': [
        'Distinguish a locally greedy choice from a dynamic-programming solution, then use that reasoning in a small algorithm toolkit project.',
        'A delivery planner must choose a set of packages under a weight limit. Taking the heaviest valuable package first can block a better overall combination.',
        'Does the best immediate choice guarantee the best total? A counterexample can invalidate a greedy rule.',
        'Dynamic programming defines overlapping subproblems and stores answers; greedy methods make a locally best choice and need a proof that this choice remains globally optimal.',
        'For coin change with denominations 1, 3, and 4, greedily making 6 gives 4+1+1 (three coins), while 3+3 uses two. The example shows a greedy failure; a DP table can compare totals systematically.',
        'For the toolkit project, combine a map or set with one search/sort operation to solve a volunteer scheduling or duplicate-detection problem. Define input/output, implement it, test empty/duplicate/boundary cases, and annotate expected growth. Present the problem, structure choice, one counterexample or test, limitation, and next improvement.',
        'A successful algorithm needs a reason it works, not only a few examples where it appears to. The course stores lesson progress, but does not persist project submissions.'
      ]
    }
  }
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

function renderLesson(title, parts) {
  const headings = ['Learning Objective', 'Story', 'Discovery', 'Concept', 'Example', 'Challenge', 'Takeaway'];
  return `<section class="lesson-section"><h3>${headings[0]}</h3><p>${escapeHtml(parts[0])}</p></section>\n` +
    `<section class="lesson-section"><h3>${headings[1]}</h3><p>${escapeHtml(parts[1])}</p></section>\n` +
    `<section class="lesson-section"><h3>${headings[2]}</h3><p>${escapeHtml(parts[2])}</p></section>\n` +
    `<section class="lesson-section"><h3>${headings[3]}</h3><p>${escapeHtml(parts[3])}</p></section>\n` +
    `<section class="lesson-section"><h3>${headings[4]}</h3><p>${escapeHtml(parts[4])}</p></section>\n` +
    `<section class="lesson-section"><h3>${headings[5]}</h3><p>${escapeHtml(parts[5])}</p></section>\n` +
    `<section class="lesson-section"><h3>${headings[6]}</h3><p>${escapeHtml(parts[6])}</p></section>`;
}

module.exports = { courses, renderLesson };
