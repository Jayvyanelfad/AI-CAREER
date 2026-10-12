const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define the courses we expect (from seed-course-content.js)
const coursesToSeed = [
  { id: 'intro_to_ai', title: 'Introduction to AI & ML', weeks: 4, description: 'Learn how AI and machine learning differ, how data and models produce predictions, and how to evaluate results responsibly. Progress from foundational terms and learning methods to neural networks, real-world applications, and a guided beginner project: a small classifier with a test plan and documented limitations. No prior AI experience is required.' },
  { id: 'python_for_careers', title: 'Python for Career Development', weeks: 4, description: 'Start with Python basics: values, conditions, and loops. Then use functions, collections, files, JSON, and a beginner API request. Finish by planning, building, safely testing, and presenting a local file-organization assistant. No programming experience is required.' },
  { id: 'data_analytics_basics', title: 'Data Analytics Basics', weeks: 3, description: 'Frame an analysis question, clean a small dataset, explore patterns with summaries and charts, and communicate a finding with its limits.' },
  { id: 'web_dev', title: 'Web Development Fundamentals', weeks: 5, description: 'Build a semantic, responsive web page with HTML, CSS, and JavaScript. Practice accessible forms, client-side interactions, and the basics of publishing a frontend.' },
  { id: 'dsa', title: 'Data Structures & Algorithms', weeks: 6, description: 'Choose and apply core data structures and algorithms to common problems, compare time and space costs, and explain the trade-offs behind a solution.' },
  { id: 'devops', title: 'DevOps & Cloud Basics', weeks: 4, description: 'Use Linux commands and shell scripts, package an application with Docker, and explain how cloud services support deployment and operations.' },
  { id: 'cybersecurity', title: 'Cybersecurity Fundamentals', weeks: 4, description: 'Recognize common threats, reduce basic web application risks, review security signals, and outline a responsible incident response in an authorized environment.' },
  { id: 'ui_ux', title: 'UI/UX Design Principles', weeks: 4, description: 'Turn user needs into a simple flow and interface, prototype it, check accessibility basics, and refine the design using usability feedback.' },
  { id: 'advanced_ml', title: 'Advanced Machine Learning', weeks: 4, description: 'Compare neural approaches for text and image tasks, reason about training and evaluation trade-offs, and explain how a model can be monitored after deployment.' },
  { id: 'aws_architect', title: 'AWS Solutions Architect', weeks: 4, description: 'Select AWS compute, storage, database, networking, and security services to sketch a resilient architecture and explain its trade-offs. Hands-on cloud deployment is not assumed.' },
  { id: 'data_science', title: 'Data Science Professional', weeks: 4, description: 'Prepare and explore a dataset, build and evaluate an appropriate model, and communicate what the evidence supports and where it falls short.' },
  { id: 'full_stack', title: 'Full Stack Web Development', weeks: 6, description: 'Plan the parts of a full stack application, build responsive frontend interactions, connect server APIs to data, and explain the roles of testing and delivery workflows.' }
];

async function seedCourses() {
  console.log('Starting to seed courses...');

  // First, get existing courses to avoid duplicates
  const { data: existingCourses, error: fetchError } = await supabase
    .from('courses')
    .select('id, title, weeks');

  if (fetchError) {
    console.error('Error fetching existing courses:', fetchError);
    process.exit(1);
  }

  const existingIds = existingCourses.map(c => c.id);
  console.log(`Found ${existingCourses.length} existing courses.`);

  // Filter out courses that already exist
  const coursesToInsert = coursesToSeed.filter(c => !existingIds.includes(c.id));

  if (coursesToInsert.length === 0) {
    console.log('All courses already exist. Seeding skipped.');
    process.exit(0);
  }

  console.log(`Inserting ${coursesToInsert.length} new courses:`);
  coursesToInsert.forEach(c => console.log(`  - ${c.id}: ${c.title}`));

  // Insert each course
  for (const course of coursesToInsert) {
    const { data, error } = await supabase
      .from('courses')
      .insert({
        id: course.id,
        title: course.title,
        description: course.description,
        image: `https://via.placeholder.com/400x300?text=${encodeURIComponent(course.title)}`,
        level: course.weeks <= 4 ? 'Beginner' : course.weeks <= 6 ? 'Intermediate' : 'Advanced',
        weeks: course.weeks,
        // We'll set isCreatedAt to default, but we can also set it explicitly if needed
        // created_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error(`Error inserting course ${course.id}:`, error);
      // Continue with other courses
    } else {
      console.log(`Inserted course ${course.id}`);
    }
  }

  // Verify final count
  const { data: allCourses, error: countError } = await supabase
    .from('courses')
    .select('id', { count: 'exact' });

  if (countError) {
    console.error('Error counting courses:', countError);
  } else {
    console.log(`Total courses in database: ${allCourses.length}`);
  }

  console.log('Course seeding completed.');
}

seedCourses().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
