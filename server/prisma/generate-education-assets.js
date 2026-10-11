const fs = require('node:fs/promises');
const path = require('node:path');
const PDFDocument = require('pdfkit');
const pptxgen = require('pptxgenjs');
const { cloudTopics, subjects } = require('../src/data/educationCatalog');

const outputDir = path.resolve(__dirname, '../content/resources');

function safeSlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function paragraph(doc, text, options = {}) {
  doc.font('Helvetica').fontSize(10).fillColor('#27323f').text(text, {
    width: 490,
    lineGap: 3,
    paragraphGap: 7,
    ...options,
  });
}

function drawWorkflow(doc) {
  const labels = ['Question', 'Inspect', 'Prepare', 'Analyze', 'Explain'];
  const startX = 58;
  const width = 82;
  const gap = 15;
  doc.font('Helvetica-Bold').fontSize(8);
  labels.forEach((label, index) => {
    const x = startX + index * (width + gap);
    doc.roundedRect(x, doc.y, width, 30, 4).fillAndStroke('#fff5f5', '#b5122b');
    doc.fillColor('#432632').text(label, x + 4, doc.y + 10, { width: width - 8, align: 'center', lineBreak: false });
    if (index < labels.length - 1) {
      doc.moveTo(x + width + 2, doc.y + 15).lineTo(x + width + gap - 3, doc.y + 15).stroke('#b5122b');
    }
  });
  doc.moveDown(3);
}

async function writePdf(subject) {
  const destination = path.join(outputDir, `${safeSlug(subject.code)}-study-notes.pdf`);
  const doc = new PDFDocument({ size: 'A4', margins: { top: 54, bottom: 54, left: 58, right: 58 }, info: { Title: `${subject.name} Study Notes`, Author: 'MBU Digital Library Learning Resources', Subject: subject.description } });
  const output = fs.open(destination, 'w').then((handle) => handle.createWriteStream());
  const stream = await output;
  doc.pipe(stream);
  doc.rect(0, 0, 595, 130).fill('#b5122b');
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11).text('MBU DIGITAL LIBRARY · PRACTICE LEARNING RESOURCE', 58, 42);
  doc.fontSize(25).text(subject.name, 58, 65, { width: 470 });
  doc.font('Helvetica').fontSize(10).text(`${subject.code}  |  ${subject.semester}  |  Student-authored study guide`, 58, 106);
  doc.moveDown(5);
  doc.fillColor('#432632').font('Helvetica-Bold').fontSize(15).text('How to use these notes');
  paragraph(doc, `${subject.description} Work through the units in order, reproduce each example, then answer the review prompts from memory. This is supplemental practice material, not an official MBU syllabus or assessment. Course sequencing is suggested and should be checked against your current approved syllabus.`);
  if (subject.name === 'Data Science') {
    doc.moveDown(1);
    doc.fillColor('#432632').font('Helvetica-Bold').fontSize(11).text('A repeatable workflow');
    drawWorkflow(doc);
  }
  subject.modules.forEach((module, index) => {
    if (doc.y > 645) doc.addPage();
    doc.moveDown(1);
    doc.fillColor('#b5122b').font('Helvetica-Bold').fontSize(13).text(`MODULE ${String(index + 1).padStart(2, '0')} · ${module.title}`);
    paragraph(doc, module.notes);
    doc.fillColor('#432632').font('Helvetica-Bold').fontSize(10).text('Worked example');
    doc.roundedRect(58, doc.y, 479, 42, 4).fill('#f8f4f2');
    doc.fillColor('#283545').font('Courier').fontSize(8).text(module.example.replace(/\\n/g, '\n'), 67, doc.y + 8, { width: 460 });
    doc.moveDown(3);
    doc.fillColor('#432632').font('Helvetica-Bold').fontSize(10).text('Check your understanding');
    module.questions.forEach((question) => paragraph(doc, `• ${question}`, { indent: 9 }));
  });
  doc.addPage();
  doc.fillColor('#b5122b').font('Helvetica-Bold').fontSize(16).text('Revision checklist');
  [
    'Can I explain the main idea without copying the notes?',
    'Can I reproduce the example and state its assumptions?',
    'Can I test an edge case and describe what should happen?',
    'Have I recorded a limitation and checked a primary reference?',
  ].forEach((item) => paragraph(doc, `□  ${item}`, { indent: 8 }));
  doc.moveDown(1);
  doc.fillColor('#432632').font('Helvetica-Bold').fontSize(11).text('Further reading');
  paragraph(doc, 'Use the official documentation and open references linked in the portal. Check the publication/version and license at the source before redistribution. Cite the source and access date in coursework.');
  doc.end();
  await new Promise((resolve, reject) => stream.on('finish', resolve).on('error', reject));
  return destination;
}

function addBulletSlide(pptx, title, subtitle, bullets) {
  const slide = pptx.addSlide();
  slide.background = { color: 'FFFFFF' };
  slide.addText(title, { x: 0.55, y: 0.42, w: 12.2, h: 0.55, fontFace: 'Aptos Display', fontSize: 26, bold: true, color: '8E1024', breakLine: false });
  slide.addShape(pptx.ShapeType.line, { x: 0.56, y: 1.13, w: 12.1, h: 0, line: { color: 'E7C6CB', width: 1.2 } });
  slide.addText(subtitle, { x: 0.6, y: 1.34, w: 12, h: 0.44, fontSize: 15, color: '45515E', breakLine: false });
  slide.addText(bullets.map((text) => ({ text, options: { bullet: { indent: 16 }, hanging: 4, breakLine: true, paraSpaceAfterPt: 15 } })), {
    x: 0.8, y: 2.05, w: 11.7, h: 4.6, fontSize: 19, color: '293442', valign: 'top', margin: 0.08, breakLine: false,
  });
  slide.addText('MBU Digital Library · Supplemental practice resource · Verify against official course materials', {
    x: 0.6, y: 7.08, w: 12, h: 0.22, fontSize: 8, color: '727C86', breakLine: false,
  });
}

async function writeDeck(slug, title, subtitle, slides) {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'MBU Digital Library Learning Resources';
  pptx.subject = 'Supplemental educational presentation';
  pptx.title = title;
  pptx.company = 'MBU Digital Library';
  pptx.lang = 'en-US';
  slides.forEach((slide) => addBulletSlide(pptx, slide.title, slide.subtitle, slide.bullets));
  const destination = path.join(outputDir, `${slug}.pptx`);
  await pptx.writeFile({ fileName: destination });
  return destination;
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  for (const subject of subjects) await writePdf(subject);
  const python = subjects.find(({ code }) => code === 'PY101');
  const sql = subjects.find(({ code }) => code === 'SQL101');
  const dataScience = subjects.find(({ code }) => code === 'DS101');
  const pythonDeck = await writeDeck('python-programming-foundations', 'Python Programming Foundations', 'A beginner’s route from expressions to tested functions', [
    { title: 'Start with small, named steps', subtitle: 'Make data flow visible and validate assumptions early.', bullets: ['Store input as a value with an explicit type.', 'Use conditions to reject values outside the problem domain.', 'Name intermediate results so a reader can follow the calculation.'] },
    ...python.modules.map((unit) => ({ title: unit.title, subtitle: unit.notes, bullets: [unit.example, ...unit.questions] })),
    { title: 'Practice and self-check', subtitle: 'A reliable beginner workflow', bullets: ['Write a normal case, an empty/boundary case, and an invalid-input case.', 'Run the tests after a change.', 'Read official Python documentation when behavior is uncertain.'] },
  ]);
  const sqlDeck = await writeDeck('sql-querying-and-relational-design', 'SQL Querying and Relational Design', 'From keys and relationships to readable queries', [
    { title: 'Model facts once', subtitle: 'Keys and constraints make assumptions explicit.', bullets: ['Choose a primary key that identifies each row.', 'Use foreign keys to protect relationships.', 'Normalize repeated facts to reduce update anomalies.'] },
    ...sql.modules.map((unit) => ({ title: unit.title, subtitle: unit.notes, bullets: [unit.example, ...unit.questions] })),
    { title: 'Write safe, testable queries', subtitle: 'Check grain, nulls, and row counts.', bullets: ['Parameterize user values.', 'Compare aggregate counts against a hand-checked sample.', 'Use EXPLAIN on a representative workload before changing indexes.'] },
  ]);
  const dataDeck = await writeDeck('data-science-workflow', 'A Practical Data Science Workflow', 'Question → inspect → prepare → analyze → explain', [
    { title: 'Frame the question', subtitle: dataScience.modules[0].notes, bullets: ['Define population, observation unit, time window, and outcome.', 'Identify a baseline and practical decision context.', 'Record assumptions before selecting a method.'] },
    ...dataScience.modules.map((unit) => ({ title: unit.title, subtitle: unit.notes, bullets: [unit.example, ...unit.questions] })),
    { title: 'Communicate responsibly', subtitle: 'Evidence needs context.', bullets: ['Report data source, sample size, metric, and uncertainty.', 'Separate association from causal claims.', 'Describe limitations and intended use.'] },
  ]);
  await writeDeck('cloud-and-aws-fundamentals', 'Cloud and AWS Fundamentals', 'Build safely, understand trade-offs, clean up', [
    { title: 'Shared responsibility', subtitle: cloudTopics[0].summary, bullets: ['The provider secures the underlying cloud infrastructure.', 'Customers secure identities, data, configuration, and workloads.', 'Responsibilities vary by service and deployment model.'] },
    ...cloudTopics.slice(1, 7).map((topic) => ({ title: topic.title, subtitle: topic.summary, bullets: ['Read the linked AWS documentation for current service behavior.', 'Use a sandbox account and least-privilege identities.', 'Verify region, network access, encryption, and expected cost.'] })),
    { title: 'Before ending a lab', subtitle: 'Avoid surprise exposure and charges.', bullets: ['Delete temporary resources and confirm their status.', 'Check budgets, logs, and unused resources.', 'Never store account secrets in a notebook or repository.'] },
  ]);
  const manifest = [
    ...subjects.map((subject) => ({ slug: `notes-${safeSlug(subject.code)}`, section: 'study-materials', title: `${subject.name} · Module notes and revision guide`, description: `Original supplemental notes, worked examples, module review questions, and revision checklist for ${subject.name}. Suggested semester: ${subject.semester}.`, subjectName: subject.name, semester: subject.semester, category: 'NOTES', content: { modules: subject.modules, revision: ['Explain the key idea without notes.', 'Reproduce one example and check a boundary case.', 'List a limitation and consult the primary reference.'] }, fileName: `${safeSlug(subject.code)}-study-notes.pdf`, path: path.join(outputDir, `${safeSlug(subject.code)}-study-notes.pdf`), mimeType: 'application/pdf' })),
    { slug: 'slides-python-foundations', section: 'study-materials', title: 'Python Programming Foundations · presentation', description: 'Editable classroom-style deck on values, control flow, collections, functions, and tests.', subjectName: 'Python Programming', category: 'SLIDES', content: { format: 'PowerPoint presentation' }, fileName: path.basename(pythonDeck), path: pythonDeck, mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
    { slug: 'slides-sql-relational-design', section: 'study-materials', title: 'SQL Querying and Relational Design · presentation', description: 'Editable deck covering relational constraints, SELECT, joins, aggregation, and safe changes.', subjectName: 'SQL', category: 'SLIDES', content: { format: 'PowerPoint presentation' }, fileName: path.basename(sqlDeck), path: sqlDeck, mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
    { slug: 'slides-data-science-workflow', section: 'study-materials', title: 'A Practical Data Science Workflow · presentation', description: 'Editable deck explaining problem framing, data checks, validation, and communication.', subjectName: 'Data Science', category: 'SLIDES', content: { format: 'PowerPoint presentation' }, fileName: path.basename(dataDeck), path: dataDeck, mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
    { slug: 'slides-cloud-aws-fundamentals', section: 'study-materials', title: 'Cloud and AWS Fundamentals · presentation', description: 'Editable deck on the shared responsibility model, core services, least privilege, and cost cleanup.', subjectName: 'Cloud & AWS', category: 'SLIDES', content: { format: 'PowerPoint presentation' }, fileName: 'cloud-and-aws-fundamentals.pptx', path: path.join(outputDir, 'cloud-and-aws-fundamentals.pptx'), mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  ];
  console.log(`Generated ${subjects.length} PDF study guides, 4 PowerPoint decks, and ${manifest.length} resource records in ${outputDir}`);
}

main().catch((error) => {
  console.error('Unable to generate educational resources', error);
  process.exitCode = 1;
});
