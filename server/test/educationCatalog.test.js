const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assignments, cloudTopics, codingProblems, datasets, labs, quizzes, references, subjects, tools } = require('../src/data/educationCatalog');
const { records } = require('../src/data/educationalMaterials');

const expectedSubjects = [
  'Data Science', 'Python Programming', 'C Programming', 'C++ Programming', 'Java Programming',
  'Database Management Systems', 'SQL', 'Data Structures and Algorithms', 'Statistics',
  'Probability', 'Mathematics for Data Science', 'Machine Learning', 'Artificial Intelligence',
  'Deep Learning', 'Big Data Analytics', 'Data Visualization', 'Software Engineering',
  'Computer Networks',
];

test('catalog covers requested subjects, tools, labs, AWS topics, and practice collections', () => {
  assert.deepEqual(subjects.map(({ name }) => name), expectedSubjects);
  assert.ok(subjects.every((subject) => subject.modules.length >= 3
    && subject.modules.every((module) => module.notes.length > 80 && module.example && module.questions.length >= 2)));
  assert.equal(labs.length, 10);
  assert.ok(labs.every((lab) => lab.aim && lab.algorithm.length && lab.code && lab.output && lab.result && lab.viva.length));
  assert.ok(['Python', 'Jupyter Notebook', 'NumPy', 'Pandas', 'Matplotlib', 'Seaborn', 'Scikit-learn', 'SQL', 'Power BI', 'Tableau', 'Git', 'GitHub', 'Visual Studio Code']
    .every((title) => tools.some((tool) => tool.title === title)));
  assert.ok(cloudTopics.some(({ title }) => title === 'IAM and least privilege'));
  assert.ok(cloudTopics.some(({ title }) => title === 'Amazon EC2'));
  assert.ok(cloudTopics.some(({ title }) => title === 'Amazon S3'));
  assert.ok(cloudTopics.some(({ title }) => title === 'Amazon VPC'));
  assert.ok(cloudTopics.some(({ title }) => title === 'Amazon RDS'));
  assert.ok(cloudTopics.some(({ title }) => title === 'AWS Lambda'));
  assert.ok(codingProblems.length >= 18 && codingProblems.every((problem) => problem.solution));
  assert.equal(assignments.length, subjects.length);
  assert.ok(assignments.every((assignment) => assignment.instructions.includes('not an official MBU assignment') && assignment.evaluation.length));
  assert.ok(references.length >= 15 && references.every((reference) => reference.author && reference.publisher && reference.year && reference.url.startsWith('https://')));
  assert.equal(datasets.length, 5);
  assert.equal(quizzes.length, 4);
  assert.equal(new Set(records.map(({ slug }) => slug)).size, records.length);
  assert.ok(records.length >= 190, `expected a substantive catalog, got ${records.length} records`);
});

test('generated downloadable PDFs and PowerPoint decks are real files', async () => {
  const resourcesDirectory = path.resolve(__dirname, '../content/resources');
  const pdfFiles = subjects.map(({ code }) => `${code.toLowerCase()}-study-notes.pdf`);
  const pptxFiles = [
    'python-programming-foundations.pptx',
    'sql-querying-and-relational-design.pptx',
    'data-science-workflow.pptx',
    'cloud-and-aws-fundamentals.pptx',
  ];

  for (const filename of pdfFiles) {
    const buffer = await readFile(path.join(resourcesDirectory, filename));
    assert.equal(buffer.toString('ascii', 0, 5), '%PDF-');
    assert.ok(buffer.length > 3500, `${filename} should include generated learning content`);
  }
  for (const filename of pptxFiles) {
    const buffer = await readFile(path.join(resourcesDirectory, filename));
    assert.equal(buffer.toString('ascii', 0, 2), 'PK');
    assert.ok(buffer.length > 20000, `${filename} should contain presentation slides`);
  }
});
