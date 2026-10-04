-- Replace only the exact generic summaries created by seed-courses.js.
-- Content-only, repeat-safe. Does not change IDs, course structure, or availability.
-- Review and apply separately; this audit phase does not execute this file.
BEGIN;

UPDATE public.courses SET description = 'Learn how AI and machine learning differ, how data and models produce predictions, and how to evaluate results responsibly. Progress from foundational terms and learning methods to neural networks, real-world applications, and a guided beginner project: a small classifier with a test plan and documented limitations. No prior AI experience is required.'
WHERE id = 'intro_to_ai' AND title = 'Introduction to AI & ML' AND description = 'Learn about Introduction to AI & ML.';

UPDATE public.courses SET description = 'Start with Python basics: values, conditions, and loops. Then use functions, collections, files, JSON, and a beginner API request. Finish by planning, building, safely testing, and presenting a local file-organization assistant. No programming experience is required.'
WHERE id = 'python_for_careers' AND title = 'Python for Career Development' AND description = 'Learn about Python for Career Development.';

UPDATE public.courses SET description = 'Frame an analysis question, clean a small dataset, explore patterns with summaries and charts, and communicate a finding with its limits.'
WHERE id = 'data_analytics_basics' AND title = 'Data Analytics Basics' AND description = 'Learn about Data Analytics Basics.';

UPDATE public.courses SET description = 'Build a semantic, responsive web page with HTML, CSS, and JavaScript. Practice accessible forms, client-side interactions, and the basics of publishing a frontend.'
WHERE id = 'web_dev' AND title = 'Web Development Fundamentals' AND description = 'Learn about Web Development Fundamentals.';

UPDATE public.courses SET description = 'Choose and apply core data structures and algorithms to common problems, compare time and space costs, and explain the trade-offs behind a solution.'
WHERE id = 'dsa' AND title = 'Data Structures & Algorithms' AND description = 'Learn about Data Structures & Algorithms.';

UPDATE public.courses SET description = 'Use Linux commands and shell scripts, package an application with Docker, and explain how cloud services support deployment and operations.'
WHERE id = 'devops' AND title = 'DevOps & Cloud Basics' AND description = 'Learn about DevOps & Cloud Basics.';

UPDATE public.courses SET description = 'Recognize common threats, reduce basic web application risks, review security signals, and outline a responsible incident response in an authorized environment.'
WHERE id = 'cybersecurity' AND title = 'Cybersecurity Fundamentals' AND description = 'Learn about Cybersecurity Fundamentals.';

UPDATE public.courses SET description = 'Turn user needs into a simple flow and interface, prototype it, check accessibility basics, and refine the design using usability feedback.'
WHERE id = 'ui_ux' AND title = 'UI/UX Design Principles' AND description = 'Learn about UI/UX Design Principles.';

UPDATE public.courses SET description = 'Compare neural approaches for text and image tasks, reason about training and evaluation trade-offs, and explain how a model can be monitored after deployment.'
WHERE id = 'advanced_ml' AND title = 'Advanced Machine Learning' AND description = 'Learn about Advanced Machine Learning.';

UPDATE public.courses SET description = 'Select AWS compute, storage, database, networking, and security services to sketch a resilient architecture and explain its trade-offs. Hands-on cloud deployment is not assumed.'
WHERE id = 'aws_architect' AND title = 'AWS Solutions Architect' AND description = 'Learn about AWS Solutions Architect.';

UPDATE public.courses SET description = 'Prepare and explore a dataset, build and evaluate an appropriate model, and communicate what the evidence supports and where it falls short.'
WHERE id = 'data_science' AND title = 'Data Science Professional' AND description = 'Learn about Data Science Professional.';

UPDATE public.courses SET description = 'Plan the parts of a full stack application, build responsive frontend interactions, connect server APIs to data, and explain the roles of testing and delivery workflows.'
WHERE id = 'full_stack' AND title = 'Full Stack Web Development' AND description = 'Learn about Full Stack Web Development.';

COMMIT;
