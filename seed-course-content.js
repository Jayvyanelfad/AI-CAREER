const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const introToAiContent = require('./intro-to-ai-course-content');
const pythonCareerContent = require('./python-career-course-content');

// Course content definitions
const courseContent = {
  // Free courses
  intro_to_ai: {
    title: "Introduction to AI & ML",
    modules: [
      {
        title: "AI Foundations & History",
        description: "Understanding what AI is, its history, and fundamental concepts",
        lessons: [
          { title: "What is Artificial Intelligence?", description: "Defining AI and distinguishing it from traditional programming", content: "Artificial Intelligence refers to systems or machines that mimic human intelligence to perform tasks and can iteratively improve themselves based on the information they collect." },
          { title: "History and Evolution of AI", description: "Key milestones in AI development from Turing to modern deep learning", content: "From Alan Turing's 1950 paper to the AI winter periods and the current renaissance driven by deep learning and big data." },
          { title: "Types of AI: Narrow vs General", description: "Understanding the different categories and capabilities of AI systems", content: "Narrow AI (or Weak AI) is designed for specific tasks, while General AI (or Strong AI) would have human-like cognitive abilities across domains." },
          { title: "Machine Learning Basics", description: "Introduction to ML as a subset of AI", content: "Machine Learning enables systems to learn and improve from experience without being explicitly programmed, focusing on developing computer programs that can access data and use it to learn." },
          { title: "Real-world AI Applications", description: "Examples of AI in use today across industries", content: "From recommendation systems and voice assistants to medical diagnosis and autonomous vehicles, AI is transforming how we live and work." }
        ]
      },
      {
        title: "Machine Learning Fundamentals",
        description: "Core ML concepts, algorithms, and methodologies",
        lessons: [
          { title: "Supervised vs Unsupervised Learning", description: "Understanding the two main categories of machine learning", content: "Supervised learning uses labeled data to train models, while unsupervised learning finds patterns in unlabeled data." },
          { title: "Regression Techniques", description: "Linear, polynomial, and regularized regression methods", content: "Regression models predict continuous values and are fundamental for forecasting and trend analysis." },
          { title: "Classification Algorithms", description: "Logistic regression, decision trees, and SVM for classification tasks", content: "Classification models predict discrete categories and are used in spam detection, medical diagnosis, and image recognition." },
          { title: "Clustering Methods", description: "K-means, hierarchical clustering, and density-based approaches", content: "Clustering groups similar data points together without predefined labels, useful for customer segmentation and anomaly detection." },
          { title: "Model Evaluation and Validation", description: "Metrics and techniques to assess model performance", content: "Accuracy, precision, recall, F1-score, and ROC curves help determine how well a model generalizes to unseen data." }
        ]
      },
      {
        title: "Neural Networks and Deep Learning",
        description: "Introduction to neural networks and deep learning concepts",
        lessons: [
          { title: "Perceptrons and Neural Network Basics", description: "Building blocks of neural networks", content: "Inspired by biological neurons, artificial neural networks consist of interconnected nodes that process information using connection weights." },
          { title: "Activation Functions and Loss Functions", description: "Key components that enable learning in neural networks", content: "Activation functions introduce non-linearity, while loss functions measure prediction error to guide optimization." },
          { title: "Convolutional Neural Networks (CNNs)", description: "Specialized networks for image processing", content: "CNNs use convolutional layers to automatically and adaptively learn spatial hierarchies of features from images." },
          { title: "Recurrent Neural Networks (RNNs)", description: "Networks designed for sequential data", content: "RNNs have internal memory that makes them well-suited for processing sequences like text, speech, and time series data." },
          { title: "Training Neural Networks", description: "Backpropagation and optimization algorithms", content: "Backpropagation calculates gradients for weight updates, while optimizers like SGD and Adam determine how to apply these gradients." }
        ]
      }
    ]
  },
  python_for_careers: {
    title: "Python for Career Development",
    modules: [
      {
        title: "Python Programming Basics",
        description: "Fundamental Python syntax and programming concepts",
        lessons: [
          { title: "Python Installation and Setup", description: "Getting Python running on your system", content: "Installing Python, setting up PATH, verifying installation, and choosing an IDE or text editor." },
          { title: "Variables, Data Types, and Operators", description: "Core building blocks of Python programs", content: "Understanding integers, floats, strings, booleans, and how to manipulate them with operators." },
          { title: "Control Flow: Conditionals and Loops", description: "Making decisions and repeating actions in Python", content: "If statements, for loops, while loops, and control statements like break and continue." },
          { title: "Functions and Modules", description: "Organizing code for reusability and maintainability", content: "Defining functions, passing arguments, return values, and organizing code into modules and packages." },
          { title: "Working with Files and Exceptions", description: "Reading/writing files and handling errors gracefully", content: "Opening files in different modes, handling file I/O errors, and using try-except blocks for robust error handling." }
        ]
      },
      {
        title: "Data Structures and Libraries",
        description: "Essential Python data structures and useful libraries",
        lessons: [
          { title: "Lists, Tuples, and Dictionaries", description: "Python's built-in collection data types", content: "When to use each type, common operations, and performance characteristics of Python collections." },
          { title: "Sets and Strings", description: "Additional collection types and text processing", content: "Uniqueness properties of sets and powerful string manipulation capabilities in Python." },
          { title: "Introduction to NumPy", description: "Numerical computing with Python", content: "NumPy arrays, vectorized operations, and mathematical functions for scientific computing." },
          { title: "Data Manipulation with Pandas", description: "Working with structured data in Python", content: "DataFrames, Series, data cleaning, filtering, grouping, and time series analysis." },
          { title: "Data Visualization with Matplotlib and Seaborn", description: "Creating informative visualizations", content: "Basic plotting, customization, subplots, and statistical visualization techniques." }
        ]
      },
      {
        title: "Practical Applications and Automation",
        description: "Using Python for real-world tasks and automation",
        lessons: [
          { title: "Web Scraping with BeautifulSoup and Requests", description: "Extracting data from websites", content: "Sending HTTP requests, parsing HTML, and navigating the DOM to extract information." },
          { title: "Working with APIs and JSON", description: "Consuming web services in Python", content: "Making HTTP requests to REST APIs, handling JSON data, and authenticating with API keys." },
          { title: "Automating Excel and CSV Files", description: "Data processing with pandas and openpyxl", content: "Reading, writing, modifying, and analyzing spreadsheet data programmatically." },
          { title: "Intro to GUI Development with Tkinter", description: "Creating desktop applications with Python", content: "Building windows, adding widgets, handling events, and creating interactive applications." },
          { title: "Testing and Debugging Python Code", description: "Ensuring code quality and reliability", content: "Unit testing with pytest, debugging techniques, and code coverage analysis." }
        ]
      }
    ]
  },
  data_analytics_basics: {
    title: "Data Analytics Basics",
    modules: [
      {
        title: "Foundations of Data Analytics",
        description: "Core concepts and workflow in data analytics",
        lessons: [
          { title: "What is Data Analytics?", description: "Defining data analytics and its role in decision-making", content: "Data analytics involves examining datasets to draw conclusions about the information they contain, increasingly with specialized systems and software." },
          { title: "The Data Analytics Workflow", description: "From problem definition to insight communication", content: "Asking questions, data collection, data cleaning, analysis, interpretation, and communicating results." },
          { title: "Types of Data: Quantitative vs Qualitative", description: "Understanding different data classifications", content: "Quantitative data is numerical and measurable, while qualitative data is descriptive and conceptual." },
          { title: "Data Sources and Collection Methods", description: "Where data comes from and how to gather it", content: "Internal databases, external APIs, surveys, sensors, web scraping, and manual entry." },
          { title: "Data Quality and Cleaning Basics", description: "Ensuring data is accurate and usable", content: "Handling missing values, removing duplicates, correcting inconsistencies, and standardizing formats." }
        ]
      },
      {
        title: "Data Analysis Techniques",
        description: "Methods for analyzing and interpreting data",
        lessons: [
          { title: "Descriptive Statistics", description: "Summarizing and describing dataset features", content: "Measures of central tendency (mean, median, mode) and dispersion (range, variance, standard deviation)." },
          { title: "Data Visualization Principles", description: "Creating effective charts and graphs", content: "Choosing the right chart type, avoiding misleading representations, and following visualization best practices." },
          { title: "Exploratory Data Analysis (EDA)", description: "Initial investigation to discover patterns and anomalies", content: "Using summary statistics and visualizations to understand data distribution, relationships, and outliers." },
          { title: "Introduction to Statistical Analysis", description: "Drawing inferences from data", content: "Hypothesis testing, confidence intervals, and understanding statistical significance." },
          { title: "Correlation and Regression Analysis", description: "Understanding relationships between variables", content: "Measuring how variables change together and predicting one variable based on others." }
        ]
      },
      {
        title: "Tools and Technologies",
        description: "Software and platforms used in data analytics",
        lessons: [
          { title: "Working with Spreadsheets", description: "Excel and Google Sheets for data analysis", content: "Formulas, functions, pivot tables, charts, and data analysis toolpak." },
          { title: "Introduction to SQL", description: "Querying relational databases", content: "SELECT statements, filtering with WHERE, joins, aggregation, and data modification." },
          { title: "Python for Data Analysis", description: "Using pandas and NumPy for analytics", content: "Building on the Python course to apply programming to data tasks." },
          { title: "Business Intelligence Tools", description: "Tableau, Power BI, and similar platforms", content: "Drag-and-drop interfaces for creating interactive dashboards and reports." },
          { title: "Data Storytelling and Communication", description: "Presenting insights effectively", content: "Tailoring messages to audiences, using narrative techniques, and creating compelling data-driven stories." }
        ]
      }
    ]
  },
  web_dev: {
    title: "Web Development Fundamentals",
    modules: [
      {
        title: "HTML and CSS Foundations",
        description: "Building blocks of web pages",
        lessons: [
          { title: "Introduction to HTML", description: "Structure and semantics of web pages", content: "HyperText Markup Language (HTML) is the standard markup language for documents designed to be displayed in a web browser." },
          { title: "CSS Basics: Styling Web Pages", description: "Controlling presentation and layout", content: "Cascading Style Sheets (CSS) is a style sheet language used for describing the presentation of a document written in HTML." },
          { title: "HTML5 Semantic Elements", description: "Meaningful markup for accessibility and SEO", content: "Using elements like header, nav, section, article, aside, and footer to convey meaning about content structure." },
          { title: "CSS Box Model and Positioning", description: "Understanding how elements are sized and positioned", content: "Margin, border, padding, and content areas, plus static, relative, absolute, fixed, and sticky positioning." },
          { title: "Responsive Design Fundamentals", description: "Making websites work on all devices", content: "Media queries, flexible grids, and flexible images to create layouts that adapt to different screen sizes." }
        ]
      },
      {
        title: "JavaScript Essentials",
        description: "Adding interactivity to websites",
        lessons: [
          { title: "JavaScript Basics", description: "Syntax, variables, and data types", content: "JavaScript is a lightweight, interpreted programming language with first-class functions." },
          { title: "DOM Manipulation and Events", description: "Interacting with web page elements", content: "The Document Object Model (DOM) represents the page so programs can change document structure, style, and content." },
          { title: "JavaScript Functions and Scope", description: "Organizing and reusing code", content: "Functions are reusable blocks of code that perform specific tasks, with considerations for variable scope and hoisting." },
          { title: "Working with Arrays and Objects", description: "Essential data structures in JavaScript", content: "Arrays store ordered collections, while objects store key-value pairs for more complex data structures." },
          { title: "Asynchronous JavaScript: Callbacks and Promises", description: "Handling operations that take time", content: "Techniques for handling asynchronous operations like API requests and file operations." }
        ]
      },
      {
        title: "Frontend Development and Deployment",
        description: "Building complete websites and deploying them",
        lessons: [
          { title: "CSS Frameworks: Bootstrap and Tailwind", description: "Accelerating UI development with components", content: "Pre-built CSS classes for common UI patterns and responsive layouts." },
          { title: "Version Control with Git", description: "Tracking changes and collaborating on code", content: "Basic Git workflow: cloning, committing, branching, merging, and resolving conflicts." },
          { title: "Web Performance Optimization", description: "Making websites load faster", content: "Image optimization, minification, caching, and reducing HTTP requests." },
          { title: "Web Accessibility (a11y)", description: "Making websites usable by everyone", content: "Following WCAG guidelines to ensure people with disabilities can use websites." },
          { title: "Deploying Websites", description: "Getting your site live on the internet", content: "Shared hosting, VPS, Netlify, Vercel, GitHub Pages, and cloud platforms like AWS and Azure." }
        ]
      }
    ]
  },
  dsa: {
    title: "Data Structures & Algorithms",
    modules: [
      {
        title: "Core Data Structures",
        description: "Fundamental data structures for efficient data organization",
        lessons: [
          { title: "Arrays and Strings", description: "Basic sequential data structures", content: "Arrays store elements in contiguous memory locations, enabling efficient indexed access." },
          { title: "Linked Lists", description: "Dynamic data structures with pointers", content: "Linear collections where elements are not stored contiguously, each pointing to the next." },
          { title: "Stacks and Queues", description: "LIFO and FIFO data structures", content: "Stacks (Last-In, First-Out) and Queues (First-In, First-Out) with their common variations and applications." },
          { title: "Hash Tables and Hashing", description: "Key-value storage with constant-time access", content: "Using hash functions to map keys to indices in an array for efficient lookup." },
          { title: "Trees and Binary Trees", description: "Hierarchical data structures", content: "Node-based structures with parent-child relationships, focusing on binary trees where each node has at most two children." }
        ]
      },
      {
        title: "Advanced Data Structures",
        description: "Specialized structures for specific use cases",
        lessons: [
          { title: "Heaps and Priority Queues", description: "Efficient access to minimum/maximum elements", content: "Complete binary trees where parent nodes follow heap property relative to children." },
          { title: "Graphs and Graph Representations", description: "Modeling relationships between entities", content: "Collections of nodes (vertices) connected by edges, represented as adjacency matrices or lists." },
          { title: "Tries and String Processing", description: "Efficient string storage and retrieval", content: "Tree-like structures optimized for storing and searching strings with common prefixes." },
          { title: "Disjoint Set Union (Union-Find)", description: "Managing partitions and detecting cycles", content: "Data structure that tracks a set of elements partitioned into disjoint subsets." },
          { title: "Segment Trees and Binary Indexed Trees", description: "Efficient range queries and updates", content: "Data structures for storing information about intervals or segments and answering range queries." }
        ]
      },
      {
        title: "Algorithm Design and Analysis",
        description: "Techniques for creating and evaluating algorithms",
        lessons: [
          { title: "Asymptotic Notation", description: "Big O, Big Theta, and Big Omega analysis", content: "Mathematical tools to describe algorithm efficiency and scalability as input size grows." },
          { title: "Sorting Algorithms", description: "Comparing different approaches to ordering data", content: "Bubble sort, selection sort, insertion sort, merge sort, quicksort, heap sort, and counting sort." },
          { title: "Searching Algorithms", description: "Finding elements in data structures", content: "Linear search, binary search, and search algorithms for specialized data structures." },
          { title: "Graph Algorithms", description: "Traversing and analyzing graph structures", content: "Breadth-first search (BFS), depth-first search (DFS), Dijkstra's algorithm, and A* search." },
          { title: "Dynamic Programming and Greedy Algorithms", description: "Optimization techniques for complex problems", content: "Breaking problems into overlapping subproblems and making locally optimal choices." }
        ]
      }
    ]
  },
  devops: {
    title: "DevOps & Cloud Basics",
    modules: [
      {
        title: "Linux Foundations and Scripting",
        description: "Core operating system skills for DevOps engineers",
        lessons: [
          { title: "Linux Fundamentals", description: "Understanding the Linux operating system", content: "Linux is a family of open-source Unix-like operating systems based on the Linux kernel." },
          { title: "Essential Linux Commands", description: "Navigation, file manipulation, and system monitoring", content: "ls, cd, pwd, mkdir, rm, cp, mv, grep, find, chmod, chown, ps, top, df, du, and more." },
          { title: "Shell Scripting with Bash", description: "Automating tasks in Linux environments", content: "Writing scripts that can be executed by the bash shell to perform sequences of commands." },
          { title: "Text Processing and Regular Expressions", description: "Manipulating and searching text data", content: "Using sed, awk, and regular expressions for powerful text transformation capabilities." },
          { title: "Linux Networking Fundamentals", description: "Understanding how Linux handles network communication", content: "IP addressing, subnetting, routing, DNS, and basic network troubleshooting." }
        ]
      },
      {
        title: "Containerization with Docker",
        description: "Packaging and running applications in containers",
        lessons: [
          { title: "What are Containers?", description: "Understanding container technology", content: "Containers are lightweight, executable packages that include everything needed to run an application: code, runtime, system tools, libraries, and settings." },
          { title: "Docker Architecture and Components", description: "Understanding how Docker works", content: "Docker Engine, Docker Hub, images, containers, registries, and the client-server architecture." },
          { title: "Working with Docker Images", description: "Creating, managing, and distributing container images", content: "Dockerfile instructions, building images, tagging, and using docker-compose for multi-container applications." },
          { title: "Container Orchestration Basics", description: "Managing multiple containers at scale", content: "Introduction to Kubernetes concepts like pods, deployments, services, and namespaces." },
          { title: "Docker Security Best Practices", description: "Running containers securely", content: "Image scanning, runtime security, resource limits, and proper user namespace configuration." }
        ]
      },
      {
        title: "Cloud Computing and AWS Basics",
        description: "Understanding cloud platforms and services",
        lessons: [
          { title: "Cloud Computing Fundamentals", description: "IaaS, PaaS, SaaS, and deployment models", content: "On-demand delivery of IT resources over the internet with pay-as-you-go pricing." },
          { title: "Introduction to Amazon Web Services", description: "Core AWS services and global infrastructure", content: "Overview of AWS offerings including EC2, S3, RDS, Lambda, and networking services." },
          { title: "Working with EC2 and S3", description: "Virtual servers and object storage in AWS", content: "Elastic Compute Cloud for virtual servers and Simple Storage Service for scalable object storage." },
          { title: "Infrastructure as Code with Terraform", description: "Managing cloud infrastructure declaratively", content: "Writing configuration files to define and provide data center infrastructure using a high-level language." },
          { title: "CI/CD Pipelines and DevOps Practices", description: "Automating software delivery and infrastructure changes", content: "Continuous Integration and Continuous Delivery practices, tools like Jenkins, GitLab CI, and GitHub Actions." }
        ]
      }
    ]
  },
  cybersecurity: {
    title: "Cybersecurity Fundamentals",
    modules: [
      {
        title: "Cybersecurity Foundations",
        description: "Core concepts and terminology in cybersecurity",
        lessons: [
          { title: "What is Cybersecurity?", description: "Defining cybersecurity and its importance", content: "Cybersecurity is the practice of protecting systems, networks, and programs from digital attacks." },
          { title: "The CIA Triad", description: "Confidentiality, Integrity, and Availability principles", content: "Foundational model for developing security policies to protect organizations." },
          { title: "Types of Cyber Threats", description: "Malware, phishing, ransomware, and other attack vectors", content: "Understanding different attack methods and their characteristics." },
          { title: "Network Security Basics", description: "Protecting computer networks from intruders", content: "Firewalls, intrusion detection/prevention systems, and virtual private networks." },
          { title: "Cryptography Fundamentals", description: "Encrypting and securing information", content: "Study of techniques for secure communication in the presence of third parties." }
        ]
      },
      {
        title: "Ethical Hacking and Penetration Testing",
        description: "Offensive security techniques for defense",
        lessons: [
          { title: "What is Ethical Hacking?", description: "Legal and authorized hacking for security testing", content: "Authorized attempt to gain unauthorized access to a computer system, application, or data." },
          { title: "Reconnaissance and Information Gathering", description: "The first phase of penetration testing", content: "Collecting information about a target before attempting to exploit vulnerabilities." },
          { title: "Scanning and Enumeration", description: "Identifying live hosts, open ports, and services", content: "Using tools like Nmap to discover network information and vulnerabilities." },
          { title: "Exploitation Techniques", description: "Taking advantage of discovered vulnerabilities", content: "Using tools like Metasploit to exploit security weaknesses in systems and applications." },
          { title: "Post-Exploitation and Reporting", description: "Maintaining access and documenting findings", content: "Steps taken after successfully breaking into a system and how to report discoveries." }
        ]
      },
      {
        title: "Web and Application Security",
        description: "Securing web applications and APIs",
        lessons: [
          { title: "Common Web Vulnerabilities", description: "OWASP Top 10 and other web risks", content: "Injection, broken authentication, sensitive data exposure, XML external entities, and broken access control." },
          { title: "Secure Coding Practices", description: "Writing code with security in mind", content: "Input validation, output encoding, proper error handling, and using security frameworks." },
          { title: "API Security Fundamentals", description: "Protecting application programming interfaces", content: "Authentication, authorization, input validation, and rate limiting for APIs." },
          { title: "Web Application Firewalls (WAF)", description: "Filtering and monitoring HTTP traffic", content: "Appliances, server plugins, or filters that apply a set of rules to HTTP conversations." },
          { title: "Application and System Hardening", description: "Reducing vulnerability surfaces", content: "Removing unnecessary software, changing default passwords, and disabling unused services." }
        ]
      },
      {
        title: "Security Operations and Incident Response",
        description: "Detecting, responding to, and recovering from security incidents",
        lessons: [
          { title: "Security Monitoring and SIEM", description: "Collecting and analyzing security-related data", content: "Real-time analysis of security alerts generated by applications and network hardware." },
          { title: "Incident Response Lifecycle", description: "Preparation, detection, containment, eradication, and recovery", content: "Structured approach to handling security breaches and cyber attacks." },
          { title: "Digital Forensics Basics", description: "Collecting and analyzing digital evidence", content: "Application of investigation and analysis techniques to gather and preserve evidence." },
          { title: "Security Policies and Procedures", description: "Creating and enforcing security guidelines", content: "Documents that outline an organization's approach to managing security." },
          { title: "Security Awareness and Training", description: "Educating users about security best practices", content: "Regular training to help employees recognize and avoid security threats." }
        ]
      }
    ]
  },
  ui_ux: {
    title: "UI/UX Design Principles",
    modules: [
      {
        title: "User Experience Foundations",
        description: "Core principles of user-centered design",
        lessons: [
          { title: "What is UX Design?", description: "Understanding user experience and its scope", content: "User experience design is the process of creating products that provide meaningful and relevant experiences to users." },
          { title: "User-Centered Design Process", description: "Iterative approach focused on user needs", content: "Understanding users, defining requirements, designing solutions, and evaluating outcomes." },
          { title: "User Research Methods", description: "Gathering insights about users and their needs", content: "Interviews, surveys, usability testing, analytics, and contextual inquiry." },
          { title: "Information Architecture", description: "Organizing and structuring content effectively", content: "The structural design of shared information environments." },
          { title: "Interaction Design Principles", description: "Designing engaging interfaces with well thought out behaviors", content: "Creating meaningful relationships between people and the products they use." }
        ]
      },
      {
        title: "User Interface Design",
        description: "Creating visually appealing and functional interfaces",
        lessons: [
          { title: "UI Design Fundamentals", description: "Visual design principles for interfaces", content: "Typography, color theory, layout, and visual hierarchy in interface design." },
          { title: "Wireframing and Prototyping", description: "Creating low-fidelity and high-fidelity models", content: "Wireframes are basic visual guides used to suggest the arrangement of elements." },
          { title: "Design Systems and Style Guides", description: "Creating consistent visual languages", content: "Collections of reusable components guided by clear standards." },
          { title: "Typography in UI Design", description: "Effective use of text in interfaces", content: "Selection, spacing, and styling of type to enhance readability and accessibility." },
          { title: "Color Theory and Application", description: "Using color effectively in interfaces", content: "Psychological effects of color, color harmony, and creating accessible color palettes." }
        ]
      },
      {
        title: "Design Thinking and Prototyping",
        description: "Human-centered approach to innovation",
        lessons: [
          { title: "Design Thinking Process", description: "Empathize, define, ideate, prototype, and test", content: "Human-centered approach to innovation that draws from the designer's toolkit." },
          { title: "Usability Testing and Evaluation", description: "Testing designs with real users", content: "Evaluating a product or service by testing it with representative users." },
          { title: "Accessibility in Design (a11y)", description: "Making designs usable by people with disabilities", content: "Ensuring that everyone can use, understand, navigate, and interact with the UI." },
          { title: "Design Handoff and Collaboration", description: "Working effectively with developers and stakeholders", content: "Bridging the gap between design and implementation through clear communication." },
          { title: "Design Trends and Future Directions", description: "Staying current in the evolving design landscape", content: "Neumorphism, glassmorphism, dark mode, and designing for emerging technologies." }
        ]
      }
    ]
  }
};

// Premium courses
const premiumContent = {
  advanced_ml: {
    title: "Advanced Machine Learning",
    modules: [
      {
        title: "Deep Learning Foundations",
        description: "Neural networks, backpropagation, and training deep models",
        lessons: [
          { title: "Artificial Neural Networks Review", description: "Refreshing core ANN concepts", content: "Multilayer perceptrons, activation functions, loss functions, and gradient descent optimization." },
          { title: "Convolutional Neural Networks (CNNs)", description: "Deep learning for image processing", content: "Architecture, convolutional layers, pooling layers, and applications in computer vision." },
          { title: "Recurrent Neural Networks (RNNs)", description: "Sequence modeling with neural networks", content: "LSTM and GRU architectures for handling temporal dependencies in data." },
          { title: "Training Deep Networks", description: "Challenges and solutions in deep learning", content: "Vanishing/exploding gradients, overfitting, regularization techniques, and batch normalization." },
          { title: "Transfer Learning and Fine-tuning", description: "Leveraging pre-trained models", content: "Using models trained on large datasets as starting points for new tasks." }
        ]
      },
      {
        title: "Natural Language Processing (NLP)",
        description: "Processing and understanding human language",
        lessons: [
          { title: "Text Preprocessing and Representation", description: "Cleaning and converting text to numerical form", content: "Tokenization, stemming, lemmatization, and vectorization techniques like TF-IDF and word embeddings." },
          { title: "Classical NLP Techniques", description: "Rule-based and statistical approaches to language", content: "Part-of-speech tagging, named entity recognition, and sentiment analysis." },
          { title: "Word Embeddings and Language Models", description: "Dense vector representations of words", content: "Word2Vec, GloVe, and FastText for capturing semantic relationships between words." },
          { title: "Sequence Models with RNNs and Transformers", description: "Modeling sequential data in NLP", content: "LSTM, GRU, and attention mechanisms for processing text sequences." },
          { title: "Transformer Architecture and BERT", description: "Revolutionary architecture for NLP tasks", content: "Self-attention mechanism, encoder-decoder structure, and bidirectional encoder representations." }
        ]
      },
      {
        title: "Computer Vision and Applications",
        description: "Enabling machines to interpret visual information",
        lessons: [
          { title: "Image Processing Fundamentals", description: "Basic operations on digital images", content: "Filters, transformations, frequency domain processing, and morphological operations." },
          { title: "Object Detection and Recognition", description: "Locating and identifying objects in images", content: "Traditional computer vision approaches and deep learning-based methods." },
          { title: "Image Segmentation", description: "Partitioning images into meaningful regions", content: "Semantic, instance, and panoptic segmentation techniques." },
          { title: "Video Analysis and Motion Tracking", description: "Processing and understanding video content", content: "Spatial and temporal analysis of video sequences for activity recognition." },
          { title: "Applications: Autonomous Vehicles and Medical Imaging", description: "Real-world impact of computer vision", content: "From self-driving cars to cancer detection in radiological images." }
        ]
      },
      {
        title: "ML Ops and Deployment",
        description: "Bringing machine learning models to production",
        lessons: [
          { title: "Model Serving and APIs", description: "Making ML models accessible via interfaces", content: "REST APIs, gRPC, and batch prediction systems for serving predictions." },
          { title: "Monitoring and Maintaining ML Models", description: "Tracking performance and data drift in production", content: "Detecting concept drift, monitoring prediction distributions, and setting up alerts." },
          { title: "A/B Testing and Experimentation", description: "Comparing model performance in production", content: "Statistical methods for comparing two versions to determine which performs better." },
          { title: "Ethical AI and Bias Mitigation", description: "Building fair and responsible AI systems", content: "Identifying and reducing unfair bias in machine learning models." },
          { title: "ML Pipeline Automation", description: "End-to-end automation of ML workflows", content: "Data ingestion, preprocessing, training, evaluation, deployment, and monitoring." }
        ]
      }
    ]
  },
  aws_architect: {
    title: "AWS Solutions Architect",
    modules: [
      {
        title: "AWS Core Services",
        description: "Fundamental AWS services for building applications",
        lessons: [
          { title: "Introduction to AWS", description: "Overview of Amazon Web Services", content: "Amazon Web Services (AWS) is the world's most comprehensive and broadly adopted cloud platform." },
          { title: "Amazon EC2: Virtual Servers in the Cloud", description: "Elastic Compute Cloud for scalable computing capacity", content: "Resizable compute capacity in the cloud with virtual servers." },
          { title: "Amazon S3: Object Storage Service", description: "Scalable storage for internet applications", content: "Object storage built to store and retrieve any amount of data from anywhere." },
          { title: "Amazon RDS: Relational Database Service", description: "Managed relational databases in the cloud", content: "Easy setup, operation, and scaling of a relational database." },
          { title: "Amazon VPC: Isolating Cloud Resources", description: "Virtual Private Cloud for logically isolated sections", content: "Launch AWS resources into a virtual network that you've defined." }
        ]
      },
      {
        title: "Storage and Database Services",
        description: "AWS services for data storage and management",
        lessons: [
          { title: "AWS Storage Options", description: "Comparing S3, EBS, EFS, and Glacier", content: "Understanding when to use each storage type based on access patterns and durability requirements." },
          { title: "Amazon DynamoDB: NoSQL Database", description: "Fast and flexible non-relational database service", content: "Key-value and document database that delivers single-digit millisecond performance." },
          { title: "Amazon Redshift: Data Warehousing", description: "Fast, scalable data warehouse for analytic queries", content: "Fully managed, petabyte-scale data warehouse service in the cloud." },
          { title: "AWS Database Migration Service", description: "Migrating databases to AWS easily and securely", content: "Facilitates migration of databases to AWS with minimal downtime." },
          { title: "Amazon Aurora: MySQL and PostgreSQL Compatible", description: "High-performance relational database", content: "MySQL- and PostgreSQL-compatible relational database engine." }
        ]
      },
      {
        title: "Networking and Content Delivery",
        description: "AWS services for networking and content distribution",
        lessons: [
          { title: "Amazon CloudFront: CDN Service", description: "Globally distributed network for content delivery", content: "Works with other AWS services to deliver data, videos, applications, and APIs globally." },
          { title: "Amazon Route 53: DNS Web Service", description: "Highly available and scalable cloud Domain Name System", content: "Reliable and cost-effective way to route users to Internet Applications." },
          { title: "AWS Load Balancing", description: "Distributing incoming application traffic", content: "Application Load Balancer, Network Load Balancer, and Classic Load Balancer." },
          { title: "AWS Direct Connect: Dedicated Network Connection", description: "Establishing a dedicated network connection from premises to AWS", content: "Makes it easier to build a hybrid environment." },
          { title: "AWS Global Accelerator", description: "Improving availability and performance of applications", content: "Uses the AWS global network to route traffic via optimal endpoints." }
        ]
      },
      {
        title: "Security, Identity, and Compliance",
        description: "Protecting AWS resources and data",
        lessons: [
          { title: "AWS Identity and Access Management (IAM)", description: "Securely control access to AWS resources", content: "Web service that helps you securely control access to AWS resources for your users." },
          { title: "AWS Key Management Service (KMS)", description: "Create and control encryption keys", content: "Managed service that makes it easy for you to create and control encryption keys." },
          { title: "AWS Certificate Manager", description: "Provision, manage, and deploy SSL/TLS certificates", content: "Lets you easily provision, manage, and deploy public and private SSL/TLS certificates." },
          { title: "AWS Security Hub", description: "Comprehensive view of security alerts and compliance status", content: "Aggregates, organizes, and prioritizes security alerts from multiple AWS services." },
          { title: "AWS Artifact and Compliance Reports", description: "On-demand access to AWS compliance reports", content: "Provides customers with the ability to select and download specific AWS compliance reports." }
        ]
      }
    ]
  },
  data_science: {
    title: "Data Science Professional",
    modules: [
      {
        title: "Data Science Foundations",
        description: "Core concepts and workflow in data science",
        lessons: [
          { title: "What is Data Science?", description: "Defining data science and its interdisciplinary nature", content: "Data science is an interdisciplinary field that uses scientific methods, processes, algorithms and systems to extract knowledge." },
          { title: "The Data Science Lifecycle", description: "From problem formulation to deployment and monitoring", content: "Asking questions, obtaining data, exploring data, modeling, deploying, and monitoring." },
          { title: "Statistics and Probability Foundations", description: "Essential mathematical background", content: "Descriptive statistics, inferential statistics, probability distributions, and statistical testing." },
          { title: "Data Acquisition and Cleaning", description: "Gathering and preparing data for analysis", content: "Data integration, data wrangling, handling missing values, and data transformation." },
          { title: "Exploratory Data Analysis (EDA)", description: "Initial investigation to uncover patterns and anomalies", content: "Using visualization and numerical summaries to understand data characteristics." }
        ]
      },
      {
        title: "Machine Learning and Modeling",
        description: "Building predictive and descriptive models",
        lessons: [
          { title: "Supervised Learning Algorithms", description: "Regression and classification techniques", content: "Linear regression, logistic regression, decision trees, random forests, and support vector machines." },
          { title: "Unsupervised Learning Techniques", description: "Clustering, dimensionality reduction, and association rules", content: "K-means, hierarchical clustering, PCA, t-SNE, and association rule learning." },
          { title: "Model Evaluation and Validation", description: "Assessing model performance and generalization", content: "Train-test split, cross-validation, and metrics for regression and classification." },
          { title: "Feature Engineering and Selection", description: "Improving models through better input data", content: "Domain knowledge, transformation, creation, and selection of relevant features." },
          { title: "Model Deployment and Monitoring", description: "Putting models into production and tracking performance", content: "Serialization, containerization, API serving, and performance monitoring in production." }
        ]
      },
      {
        title: "Big Data and Distributed Computing",
        description: "Handling large-scale data processing",
        lessons: [
          { title: "Introduction to Big Data", description: "Characteristics and challenges of large datasets", content: "Volume, velocity, variety, veracity, and value - the 5 V's of big data." },
          { title: "Apache Hadoop Ecosystem", description: "Distributed storage and processing framework", content: "HDFS for storage and MapReduce for processing, plus related projects like Hive and Pig." },
          { title: "Apache Spark: Fast Data Processing", description: "Unified analytics engine for big data processing", content: "In-memory computing, SQL, streaming, machine learning, and graph processing capabilities." },
          { title: "NoSQL Databases", description: "Non-relational databases for scalability and flexibility", content: "Document, key-value, wide-column, and graph databases." },
          { title: "Real-time Data Processing", description: "Stream processing and event-driven architectures", content: "Apache Kafka, Apache Storm, and Apache Flink for real-time analytics." }
        ]
      },
      {
        title: "Specialized Data Science Domains",
        description: "Applications of data science in specific fields",
        lessons: [
          { title: "Business Analytics and Intelligence", description: "Applying data science to business problems", content: "Using data-driven insights to support business decision-making processes." },
          { title: "Bioinformatics and Computational Biology", description: "Data science in biological research", content: "Analyzing biological data, especially genetic sequences and molecular structures." },
          { title: "Financial Analytics and Risk Modeling", description: "Data science in finance and risk management", content: "Stock market analysis, credit risk modeling, and fraud detection." },
          { title: "Healthcare Analytics and Medical Informatics", description: "Data science in healthcare and medical research", content: "Patient data analysis, clinical decision support, and hospital operations optimization." },
          { title: "Geospatial Data Analysis and GIS", description: "Working with geographical and spatial data", content: "Geographic Information Systems for capturing, storing, analyzing, and managing geographical data." }
        ]
      }
    ]
  },
  full_stack: {
    title: "Full Stack Web Development",
    modules: [
      {
        title: "Frontend Development",
        description: "Building user interfaces and client-side applications",
        lessons: [
          { title: "HTML5 and CSS3 Advanced", description: "Modern web markup and styling", content: "Semantic elements, custom properties, gradients, transitions, and animations." },
          { title: "JavaScript ES6+ and TypeScript", description: "Modern JavaScript and typed supersets", content: "Arrow functions, destructuring, spread operator, modules, and static typing." },
          { title: "Frontend Frameworks: React and Vue", description: "Component-based UI development", content: "Building reusable UI components with state management and routing capabilities." },
          { title: "State Management and Data Flow", description: "Managing application state in complex UIs", content: "Redux, Context API, Vuex, and other state management solutions." },
          { title: "Frontend Performance Optimization", description: "Making frontend applications fast and efficient", content: "Code splitting, lazy loading, memoization, and optimizing rendering performance." }
        ]
      },
      {
        title: "Backend Development and APIs",
        description: "Building server-side logic and application programming interfaces",
        lessons: [
          { title: "Node.js and Express.js", description: "JavaScript runtime and web framework for servers", content: "Asynchronous event-driven JavaScript runtime designed to build scalable network applications." },
          { title: "RESTful API Design", description: "Principles for building scalable web APIs", content: "Representational State Transfer architectural style for distributed hypermedia systems." },
          { title: "Working with Databases", description: "SQL and NoSQL databases for persistent storage", content: "Relational databases like MySQL and PostgreSQL, and MongoDB for document storage." },
          { title: "Authentication and Authorization", description: "Securing access to backend resources", content: "Authentication verifies who you are, authorization determines what you can do." },
          { title: "API Documentation and Testing", description: "Creating clear interfaces and verifying correctness", content: "OpenAPI/Swagger documentation, Postman, and automated testing frameworks." }
        ]
      },
      {
        title: "Database Design and DevOps",
        description: "Data storage, infrastructure, and deployment practices",
        lessons: [
          { title: "Relational Database Design", description: "Normalization and schema design principles", content: "First normal form (1NF), second normal form (2NF), third normal form (3NF), and Boyce-Codd normal form (BCNF)." },
          { title: "NoSQL Data Modeling", description: "Designing data structures for document and key-value stores", content: "Modeling data for MongoDB, Cassandra, Redis, and similar databases." },
          { title: "Containerization with Docker", description: "Packaging applications for consistent execution", content: "Using Docker to create, deploy, and run applications in containers." },
          { title: "Infrastructure as Code (IaC)", description: "Managing infrastructure through code", content: "Terraform, AWS CloudFormation, and Ansible for provisioning and managing infrastructure." },
          { title: "CI/CD Pipelines and Deployment Strategies", description: "Automating software delivery and infrastructure changes", content: "Blue-green deployment, canary releases, and feature flags for safe deployments." }
        ]
      }
    ]
  }
};

// Combine all course content
const allCourses = {
  ...courseContent,
  ...premiumContent,
  intro_to_ai: introToAiContent,
  python_for_careers: pythonCareerContent
};
const targetCourseId = process.argv.find(argument => argument.startsWith('--course='))?.slice('--course='.length);

async function seedCourseContent() {
  console.log('Starting course content seeding...');

  if (targetCourseId && !allCourses[targetCourseId]) {
    throw new Error(`No content is defined for requested course: ${targetCourseId}`);
  }

  try {
    // Get list of courses from database
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id, title, weeks');

    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
      process.exit(1);
    }

    console.log(`Found ${courses.length} courses in database`);

    let totalModulesCreated = 0;
    let totalLessonsCreated = 0;
    let coursesProcessed = 0;

    // Process each course
    for (const course of courses) {
      const courseId = course.id;
      if (targetCourseId && courseId !== targetCourseId) continue;
      console.log(`\nProcessing course: ${courseId} (${course.title})`);

      // Check if we have content for this course
      if (!allCourses[courseId]) {
        console.log(`  No content defined for course ${courseId}, skipping...`);
        continue;
      }

      const courseDef = allCourses[courseId];
      let modulesCreated = 0;
      let lessonsCreated = 0;

      // Process each module
      for (const [moduleIndex, module] of courseDef.modules.entries()) {
        // Check if module already exists (by looking for any module with this course_id and similar title)
        // We'll use a smarter approach: try to insert with error handling for duplicates

        const moduleData = {
          course_id: courseId,
          title: module.title,
          description: module.description,
          module_order: moduleIndex + 1
          // id will be auto-generated
          // created_at will be auto-generated
        };

        let moduleResult;
        try {
          const { data, error } = await supabase
            .from('modules')
            .upsert(moduleData, { onConflict: ['course_id', 'module_order'] })
            .select();

          if (error) {
            console.error(`  Error upserting module "${module.title}":`, error);
            continue;
          }

          moduleResult = data;

          if (!moduleResult || moduleResult.length === 0) {
            console.error(`  No data returned for module "${module.title}"`);
            continue;
          }

          const moduleId = moduleResult[0].id;
          modulesCreated++;

          // Process each lesson in this module
          for (const [lessonIndex, lesson] of module.lessons.entries()) {
            const lessonData = {
              module_id: moduleId,
              title: lesson.title,
              content: lesson.content,
              lesson_order: lessonIndex + 1,
              duration_minutes: lesson.duration_minutes || 20 // Default duration
              // id will be auto-generated
              // created_at will be auto-generated
            };

            let lessonResult;
            try {
              const { data, error } = await supabase
                .from('lessons')
                .upsert(lessonData, { onConflict: ['module_id', 'lesson_order'] })
                .select();

              if (error) {
                console.error(`    Error upserting lesson "${lesson.title}":`, error);
                continue;
              }

              lessonResult = data;

              if (!lessonResult || lessonResult.length === 0) {
                console.error(`    No data returned for lesson "${lesson.title}"`);
                continue;
              }

              lessonsCreated++;
            } catch (lessonError) {
              console.error(`    Exception upserting lesson "${lesson.title}":`, lessonError);
            }
          }

        } catch (moduleError) {
          console.error(`  Exception upserting module "${module.title}":`, moduleError);
        }
      }

      console.log(`  Created ${modulesCreated} modules and ${lessonsCreated} lessons`);
      totalModulesCreated += modulesCreated;
      totalLessonsCreated += lessonsCreated;
      coursesProcessed++;
    }

    console.log(`\nSeeding completed!`);
    console.log(`Courses processed: ${coursesProcessed}`);
    console.log(`Modules created: ${totalModulesCreated}`);
    console.log(`Lessons created: ${totalLessonsCreated}`);

    // Verify counts
    const { data: modulesCountData, error: modulesCountError } = await supabase
      .from('modules')
      .select('id', { count: 'exact' });

    if (modulesCountError) {
      console.error('Error counting modules:', modulesCountError);
    } else {
      console.log(`Total modules in database: ${modulesCountData.length}`);
    }

    const { data: lessonsCountData, error: lessonsCountError } = await supabase
      .from('lessons')
      .select('id', { count: 'exact' });

    if (lessonsCountError) {
      console.error('Error counting lessons:', lessonsCountError);
    } else {
      console.log(`Total lessons in database: ${lessonsCountData.length}`);
    }

  } catch (err) {
    console.error('Error during seeding:', err);
    process.exit(1);
  }
}

seedCourseContent().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
