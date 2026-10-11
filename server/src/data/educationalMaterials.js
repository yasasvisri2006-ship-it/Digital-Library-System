const path = require('node:path');
const {
  assignments,
  cloudTopics,
  codingProblems,
  datasets,
  labs,
  quizzes,
  references,
  subjects,
  tools,
} = require('./educationCatalog');

const resourceDirectory = path.resolve(__dirname, '../../content/resources');
const resourceRecord = (subject) => ({
  slug: `notes-${subject.code.toLowerCase()}`,
  section: 'study-materials',
  title: `${subject.name} · Module notes and revision guide`,
  description: `Original supplemental notes, worked examples, module review questions, and revision checklist. ${subject.semester}.`,
  subjectName: subject.name,
  semester: subject.semester,
  category: 'NOTES',
  content: {
    modules: subject.modules,
    revision: [
      'Explain the key idea without notes.',
      'Reproduce one worked example and check a boundary case.',
      'List one limitation and consult the primary reference.',
    ],
  },
  fileName: `${subject.code.toLowerCase()}-study-notes.pdf`,
  localPath: path.join(resourceDirectory, `${subject.code.toLowerCase()}-study-notes.pdf`),
  mimeType: 'application/pdf',
  sortOrder: subject.code,
});

const subjectsSection = subjects.map((subject, index) => ({
  slug: `subject-${subject.code.toLowerCase()}`,
  section: 'subjects',
  title: subject.name,
  description: subject.description,
  subjectName: subject.name,
  semester: subject.semester,
  category: 'SUBJECT',
  content: {
    code: subject.code,
    modules: subject.modules,
    note: 'Suggested study sequence only; verify semester placement against your current approved MBU syllabus.',
  },
  sortOrder: index,
}));

const moduleRecords = subjects.flatMap((subject) => subject.modules.map((module, index) => ({
  slug: `module-${subject.code.toLowerCase()}-${index + 1}`,
  section: 'modules',
  title: module.title,
  description: module.notes,
  subjectName: subject.name,
  semester: subject.semester,
  moduleNumber: index + 1,
  category: 'UNIT',
  content: { ...module, subjectCode: subject.code },
  sortOrder: index + 1,
})));

const learningRoadmaps = [
  {
    slug: 'roadmap-data-science-starter', title: 'Data Science starter · 8 weeks',
    description: 'A beginner-friendly sequence from Python basics to a carefully explained mini-analysis.',
    content: { weeks: ['1–2: Python values, functions, and tests', '3: NumPy arrays and shapes', '4: pandas cleaning and grouping', '5: descriptive statistics and uncertainty', '6: clear Matplotlib/Seaborn charts', '7: baseline model and held-out evaluation', '8: write a reproducible report with source and limits'], checklist: ['Use an environment and record package versions.', 'Keep an untouched evaluation set.', 'Explain the unit of observation.', 'Cite the dataset and its license.'] },
  },
  {
    slug: 'roadmap-python-beginner', title: 'Python beginner plan · 4 weeks',
    description: 'Short daily practice for a first programming course; use small tasks and test each function.',
    content: { weeks: ['Week 1: expressions, types, input, conditions', 'Week 2: loops, lists, dictionaries, strings', 'Week 3: functions, files, and exceptions', 'Week 4: modules, simple tests, and a small CLI project'], checklist: ['Trace one example by hand.', 'Try an empty and boundary input.', 'Name variables by meaning.', 'Explain one design choice in comments or README.'] },
  },
  {
    slug: 'roadmap-c-cpp-java', title: 'C, C++, and Java foundations · 6 weeks',
    description: 'A comparative plan for syntax, types, functions, collections, and safe resource handling.',
    content: { weeks: ['1: types, expressions, and input validation', '2: conditionals, loops, and tracing', '3: functions and arrays/collections', '4: pointers in C; references and value semantics in C++/Java', '5: data structures and complexity', '6: tests, error cases, and a small project'], checklist: ['Compile with warnings enabled.', 'Check every input operation.', 'Document ownership/lifetime where applicable.', 'Test empty and maximum-size input.'] },
  },
  {
    slug: 'roadmap-dbms-sql', title: 'DBMS and SQL · 5 weeks',
    description: 'Go from entity relationships to normalized tables, safe queries, transactions, and indexing.',
    content: { weeks: ['1: entities, keys, and relationships', '2: functional dependencies and normalization', '3: SELECT, filtering, NULL, and sorting', '4: joins, aggregates, and window functions', '5: transactions, constraints, query plans, and parameterization'], checklist: ['State table grain and key.', 'Check row counts after joins.', 'Use transactions for related writes.', 'Measure before adding indexes.'] },
  },
  {
    slug: 'roadmap-statistics-probability', title: 'Statistics and probability · 6 weeks',
    description: 'Build intuition for distributions, sampling, conditional probability, estimation, and tests.',
    content: { weeks: ['1: descriptive summaries and plots', '2: counting rules and conditional probability', '3: common discrete/continuous distributions', '4: samples, standard errors, and intervals', '5: hypothesis tests and effect sizes', '6: association, confounding, and communication'], checklist: ['Draw a probability tree for conditional questions.', 'Report uncertainty with estimates.', 'Separate statistical and practical importance.', 'Never equate association with causation.'] },
  },
  {
    slug: 'roadmap-machine-learning', title: 'Machine Learning · 6 weeks',
    description: 'Frame a prediction task, create a baseline, build a leakage-safe pipeline, and evaluate responsibly.',
    content: { weeks: ['1: problem framing and baseline', '2: train/validation/test splits', '3: preprocessing pipelines', '4: linear models and trees', '5: metric, threshold, and subgroup analysis', '6: limitations, monitoring, and reproducibility'], checklist: ['Split before learning preprocessing.', 'Keep a final test set untouched.', 'Compare with a naive baseline.', 'Report data and model limitations.'] },
  },
  {
    slug: 'roadmap-cloud-aws', title: 'Cloud and AWS foundations · 5 weeks',
    description: 'Learn cloud vocabulary, IAM, networking, core services, and cost-safe hands-on habits.',
    content: { weeks: ['1: cloud service models and shared responsibility', '2: IAM users, roles, policies, and MFA', '3: VPC, subnets, and security groups', '4: EC2, S3, RDS, and Lambda use cases', '5: monitoring, cost review, and cleanup'], checklist: ['Use temporary credentials and least privilege.', 'Keep S3 Block Public Access on unless a design explicitly requires otherwise.', 'Create budget alerts before experiments.', 'Delete lab resources and verify cleanup.'] },
  },
];

const roadmapRecords = learningRoadmaps.map((roadmap, index) => ({
  ...roadmap,
  section: 'my-learning',
  category: 'ROADMAP',
  subjectName: roadmap.title.split(' · ')[0],
  sortOrder: index,
}));

const sectionRecords = (section, rows, convert) => rows.map((row, index) => ({
  ...convert(row, index),
  section,
  sortOrder: index,
}));

const records = [
  ...subjectsSection,
  ...moduleRecords,
  ...roadmapRecords,
  ...sectionRecords('lab-experiments', labs, (lab, index) => ({
    slug: `lab-${index + 1}-${lab.subject.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    title: lab.title,
    description: lab.aim,
    subjectName: lab.subject,
    category: 'PRACTICAL',
    content: lab,
  })),
  ...sectionRecords('tools', tools, (tool) => ({
    slug: `tool-${tool.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    title: tool.title,
    description: tool.summary,
    category: tool.category,
    content: { example: tool.example, officialDocumentation: tool.url },
    sourceUrl: tool.url,
  })),
  ...sectionRecords('cloud-aws', cloudTopics, (topic, index) => ({
    slug: `aws-${index + 1}`,
    title: topic.title,
    description: topic.summary,
    category: 'CLOUD FUNDAMENTALS',
    content: { officialDocumentation: topic.url, practice: 'Read the linked documentation, write down the relevant responsibility/cost boundary, then complete a sandbox-only hands-on exercise.' },
    sourceUrl: topic.url,
  })),
  ...sectionRecords('references', references, (reference) => ({
    slug: `reference-${reference.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    title: reference.title,
    description: `${reference.type}: ${reference.author}. ${reference.publisher}, ${reference.year}.`,
    category: reference.type,
    content: { author: reference.author, publisher: reference.publisher, year: reference.year, citation: `${reference.author}. ${reference.title}. ${reference.publisher}, ${reference.year}.` },
    sourceUrl: reference.url,
  })),
  ...sectionRecords('datasets', datasets, (dataset) => ({
    slug: `dataset-${dataset.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    title: dataset.title,
    description: dataset.description,
    category: 'PRACTICE DATASET',
    content: { source: dataset.source, tasks: dataset.tasks, licenseReminder: 'Review the dataset page, citation, and license before reuse or redistribution.' },
    sourceUrl: dataset.url,
  })),
  ...sectionRecords('assignments', assignments, (assignment, index) => ({
    slug: `assignment-${String(index + 1).padStart(2, '0')}-${assignment.subject.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    title: assignment.title,
    description: assignment.instructions,
    subjectName: assignment.subject,
    category: 'PRACTICE · NOT OFFICIAL',
    content: { tasks: assignment.tasks, evaluation: assignment.evaluation, dataset: assignment.dataset },
  })),
  ...sectionRecords('coding-practice', codingProblems, (problem, index) => ({
    slug: `coding-${String(index + 1).padStart(2, '0')}-${problem.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    title: problem.title,
    description: problem.statement,
    category: `${problem.language} · ${problem.difficulty}`,
    content: { language: problem.language, difficulty: problem.difficulty, solution: problem.solution, practiceNote: 'Try the problem before opening the explanation. Add your own tests for boundary cases.' },
  })),
  ...sectionRecords('quizzes-tests', quizzes, (quiz, index) => ({
    slug: `quiz-${index + 1}`,
    title: quiz.title,
    description: 'Self-check. Answer before expanding your notes or checking the short answer key.',
    category: 'REVISION CHECK',
    content: { questions: quiz.questions, answers: quiz.answers },
  })),
  ...subjects.map((subject, index) => ({ ...resourceRecord(subject), sortOrder: index })),
  {
    slug: 'slides-python-foundations', section: 'study-materials',
    title: 'Python Programming Foundations · presentation',
    description: 'Editable deck covering values, control flow, collections, functions, and testing.',
    subjectName: 'Python Programming', category: 'SLIDES',
    content: { format: 'PowerPoint presentation', slides: 7 },
    fileName: 'python-programming-foundations.pptx',
    localPath: path.join(resourceDirectory, 'python-programming-foundations.pptx'),
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    sortOrder: subjects.length,
  },
  {
    slug: 'slides-sql-relational-design', section: 'study-materials',
    title: 'SQL Querying and Relational Design · presentation',
    description: 'Editable deck covering relational constraints, SELECT, joins, aggregation, and safe changes.',
    subjectName: 'SQL', category: 'SLIDES',
    content: { format: 'PowerPoint presentation', slides: 6 },
    fileName: 'sql-querying-and-relational-design.pptx',
    localPath: path.join(resourceDirectory, 'sql-querying-and-relational-design.pptx'),
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    sortOrder: subjects.length + 1,
  },
  {
    slug: 'slides-data-science-workflow', section: 'study-materials',
    title: 'A Practical Data Science Workflow · presentation',
    description: 'Editable deck on problem framing, data checks, validation, and communication.',
    subjectName: 'Data Science', category: 'SLIDES',
    content: { format: 'PowerPoint presentation', slides: 6 },
    fileName: 'data-science-workflow.pptx',
    localPath: path.join(resourceDirectory, 'data-science-workflow.pptx'),
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    sortOrder: subjects.length + 2,
  },
  {
    slug: 'slides-cloud-aws-fundamentals', section: 'study-materials',
    title: 'Cloud and AWS Fundamentals · presentation',
    description: 'Editable deck on shared responsibility, core services, least privilege, and cost cleanup.',
    subjectName: 'Cloud & AWS', category: 'SLIDES',
    content: { format: 'PowerPoint presentation', slides: 9 },
    fileName: 'cloud-and-aws-fundamentals.pptx',
    localPath: path.join(resourceDirectory, 'cloud-and-aws-fundamentals.pptx'),
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    sortOrder: subjects.length + 3,
  },
];

module.exports = { learningRoadmaps, records };
