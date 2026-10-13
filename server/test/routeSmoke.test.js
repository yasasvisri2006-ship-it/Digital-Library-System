const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { Readable } = require('node:stream');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/digital_library_test';
process.env.JWT_SECRET = 'route-smoke-test-secret-with-at-least-thirty-two-characters';
process.env.ACADEMIC_RESOURCE_STORAGE_PROVIDER = 'local';

const { records } = require('../src/data/educationalMaterials');
const { prisma } = require('../src/config/prisma');
const { env } = require('../src/config/env');
const codeExecutionService = require('../src/services/codeExecutionService');
const dataScienceService = require('../src/services/dataScienceService');
const app = require('../src/app');
const privateFileStorage = require('../src/services/privateFileStorage');

const testUser = {
  id: '00000000-0000-4000-8000-000000000099',
  name: 'Route Test Student',
  email: 'route-test@example.com',
  role: 'STUDENT',
  isActive: true,
  tokenVersion: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  studentProfile: null,
};

let server;
let baseUrl;
const originalFindUnique = prisma.user.findUnique;
const originalDataScienceModuleFindMany = prisma.dataScienceModule.findMany;
const originalDataScienceMaterialFindFirst = prisma.dataScienceMaterial.findFirst;
const originalFindMany = prisma.educationalMaterial.findMany;
const originalMaterialFindUnique = prisma.educationalMaterial.findUnique;
const originalOpen = privateFileStorage.open;
const originalExecutePython = codeExecutionService.executePython;
const originalPublicDataScienceUpload = dataScienceService.uploadPublicMaterial;

before(async () => {
  prisma.user.findUnique = async ({ select }) => (
    select
      ? {
        id: testUser.id,
        email: testUser.email,
        role: testUser.role,
        isActive: testUser.isActive,
        tokenVersion: testUser.tokenVersion,
      }
      : testUser
  );
  prisma.dataScienceModule.findMany = async () => [];
  prisma.dataScienceMaterial.findFirst = async ({ where }) => (
    where.isPublished && where.module?.isPublic
      ? {
        filePath: 'data-science/module/published.pdf',
        readerFilePath: null,
        originalFileName: 'published.pdf',
        fileType: 'PDF',
        mimeType: 'application/pdf',
        readerError: null,
      }
      : null
  );
  prisma.educationalMaterial.findMany = async ({ where } = {}) => records
    .filter((record) => !where?.section || record.section === where.section)
    .map((record, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      slug: record.slug,
      section: record.section,
      title: record.title,
      description: record.description,
      subjectName: record.subjectName || null,
      semester: record.semester || null,
      moduleNumber: record.moduleNumber || null,
      category: record.category || null,
      content: record.content || {},
      sourceUrl: record.sourceUrl || null,
      fileKey: record.localPath ? 'catalog/00000000-0000-4000-8000-000000000001.pdf' : null,
      fileName: record.fileName || null,
      mimeType: record.mimeType || null,
      fileSize: null,
      sortOrder: record.sortOrder || 0,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    }));
  prisma.educationalMaterial.findUnique = async ({ where }) => (
    where.slug === 'slides-python-foundations'
      ? {
        fileKey: 'catalog/00000000-0000-4000-8000-000000000001.pptx',
        fileName: 'python-foundations.pptx',
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      }
      : null
  );
  privateFileStorage.open = async () => Readable.from([Buffer.from('private-bucket-file-through-api')]);

  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  prisma.user.findUnique = originalFindUnique;
  prisma.dataScienceModule.findMany = originalDataScienceModuleFindMany;
  prisma.dataScienceMaterial.findFirst = originalDataScienceMaterialFindFirst;
  prisma.educationalMaterial.findMany = originalFindMany;
  prisma.educationalMaterial.findUnique = originalMaterialFindUnique;
  privateFileStorage.open = originalOpen;
  codeExecutionService.executePython = originalExecutePython;
  dataScienceService.uploadPublicMaterial = originalPublicDataScienceUpload;
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('/api/auth/me is mounted and still verifies the authenticated session', async () => {
  const unauthenticated = await fetch(`${baseUrl}/api/auth/me`);
  assert.equal(unauthenticated.status, 401);

  const token = jwt.sign(
    { id: testUser.id, tokenVersion: testUser.tokenVersion },
    env.jwtSecret,
    { expiresIn: '1m' },
  );
  const authenticated = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { cookie: `mbu_session=${token}` },
  });

  const body = await authenticated.json();

  assert.equal(authenticated.status, 200);
  assert.equal(body.data.user.id, testUser.id);
  assert.equal(body.data.user.role, 'student');
});

test('Data Science public reads work without sign-in while owner writes remain protected', async () => {
  const publicRead = await fetch(`${baseUrl}/api/data-science/public/modules`);
  const publicPreview = await fetch(
    `${baseUrl}/api/data-science/public/modules/00000000-0000-4000-8000-000000000093/materials/00000000-0000-4000-8000-000000000094/preview`,
  );
  const privateRead = await fetch(`${baseUrl}/api/data-science/modules`);
  const write = await fetch(`${baseUrl}/api/data-science/modules`, {
    method: 'POST',
    headers: { origin: 'http://localhost:5173' },
  });
  assert.equal(publicRead.status, 200);
  assert.deepEqual((await publicRead.json()).data.modules, []);
  assert.equal(publicPreview.status, 200);
  assert.equal(publicPreview.headers.get('content-type'), 'application/pdf');
  assert.equal(await publicPreview.text(), 'private-bucket-file-through-api');
  assert.equal(privateRead.status, 401);
  assert.equal(write.status, 401);
});

test('public Data Science uploads accept anonymous uploads from the trusted browser origin', async () => {
  let uploadArguments;
  dataScienceService.uploadPublicMaterial = async (...args) => {
    uploadArguments = args;
    return {
      id: '00000000-0000-4000-8000-000000000095',
      title: args[1],
      originalFileName: args[2].originalname,
      isPublished: true,
      previewError: null,
    };
  };

  const form = new FormData();
  form.append('title', 'Visitor presentation');
  form.append('file', new Blob(['presentation content'], { type: 'text/plain' }), 'visitor.txt');
  const response = await fetch(
    `${baseUrl}/api/data-science/public/modules/00000000-0000-4000-8000-000000000093/materials`,
    {
      method: 'POST',
      headers: { origin: 'http://localhost:5173' },
      body: form,
    },
  );
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.data.material.isPublished, true);
  assert.equal(uploadArguments[0], '00000000-0000-4000-8000-000000000093');
  assert.equal(uploadArguments[1], 'Visitor presentation');
  assert.equal(uploadArguments[2].originalname, 'visitor.txt');
  assert.equal(uploadArguments[2].buffer.toString(), 'presentation content');
});

test('Python code execution requires an authenticated student, validates requests, and reports missing sandbox configuration', async () => {
  const unauthenticated = await fetch(`${baseUrl}/api/learning/coding/execute`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' },
    body: JSON.stringify({ language: 'PYTHON', code: 'print(1)' }),
  });
  const unauthenticatedBody = await unauthenticated.json();
  assert.equal(unauthenticated.status, 401);
  assert.equal(unauthenticatedBody.message, 'Authentication token is missing.');

  const token = jwt.sign(
    { id: testUser.id, tokenVersion: testUser.tokenVersion },
    env.jwtSecret,
    { expiresIn: '1m' },
  );
  const headers = {
    'content-type': 'application/json',
    cookie: `mbu_session=${token}`,
    origin: 'http://localhost:5173',
  };
  const invalidRequest = await fetch(`${baseUrl}/api/learning/coding/execute`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ language: 'PYTHON', code: 'x'.repeat(12001) }),
  });
  assert.equal(invalidRequest.status, 400);

  codeExecutionService.executePython = async (code) => ({
    stdout: code === 'print(1)' ? '1\n' : '',
    stderr: '',
    exitCode: 0,
    status: 'Accepted',
    error: null,
    outputTruncated: false,
  });
  const successful = await fetch(`${baseUrl}/api/learning/coding/execute`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ language: 'PYTHON', code: 'print(1)' }),
  });
  const successfulBody = await successful.json();
  assert.equal(successful.status, 200);
  assert.equal(successfulBody.data.execution.stdout, '1\n');
  codeExecutionService.executePython = originalExecutePython;

  const unavailable = await fetch(`${baseUrl}/api/learning/coding/execute`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ language: 'PYTHON', code: 'print(1)' }),
  });
  const unavailableBody = await unavailable.json();
  assert.equal(unavailable.status, 503);
  assert.equal(unavailableBody.message, 'Internal server error.');

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const rateLimitBoundary = await fetch(`${baseUrl}/api/learning/coding/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ language: 'PYTHON', code: 'print(1)' }),
    });
    assert.equal(rateLimitBoundary.status, 503);
  }
  const rateLimited = await fetch(`${baseUrl}/api/learning/coding/execute`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ language: 'PYTHON', code: 'print(1)' }),
  });
  assert.equal(rateLimited.status, 429);
});

test('/api/education serves populated My Learning and Lab Experiments sections', async () => {
  const expectedCounts = new Map([
    ['subjects', 18],
    ['modules', 54],
    ['my-learning', 7],
    ['lab-experiments', 10],
    ['tools', 13],
    ['cloud-aws', 10],
    ['study-materials', 22],
    ['references', 19],
    ['datasets', 5],
    ['assignments', 18],
    ['coding-practice', 18],
    ['quizzes-tests', 4],
  ]);
  for (const [section, expectedCount] of expectedCounts) {
    const response = await fetch(`${baseUrl}/api/education?section=${section}`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.materials.length, expectedCount);
    assert.ok(body.data.materials.every((material) => material.section === section));
    assert.ok(body.data.materials.every((material) => !Object.hasOwn(material, 'fileKey')));
  }
});

test('/api/education falls back to authored metadata if its migration is missing', async () => {
  const originalFindMany = prisma.educationalMaterial.findMany;
  prisma.educationalMaterial.findMany = async () => {
    const error = new Error('EducationalMaterial table does not exist.');
    error.code = 'P2021';
    throw error;
  };
  try {
    const response = await fetch(`${baseUrl}/api/education?section=my-learning`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.data.materials.length, 7);
    assert.ok(body.data.materials.every((material) => material.fileUrl === null));
  } finally {
    prisma.educationalMaterial.findMany = originalFindMany;
  }
});

test('/api/education serves seeded catalog files without exposing storage keys', async () => {
  const response = await fetch(`${baseUrl}/api/education/slides-python-foundations/file`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-disposition'), /python-foundations\.pptx/);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(await response.text(), 'private-bucket-file-through-api');
});

test('/api/education does not expose keys outside the catalog object prefix', async () => {
  const originalFindUnique = prisma.educationalMaterial.findUnique;
  prisma.educationalMaterial.findUnique = async () => ({
    fileKey: '00000000-0000-4000-8000-000000000001.pdf',
    fileName: 'private-resource.pdf',
    mimeType: 'application/pdf',
  });
  try {
    const response = await fetch(`${baseUrl}/api/education/slides-python-foundations/file`);
    assert.equal(response.status, 404);
  } finally {
    prisma.educationalMaterial.findUnique = originalFindUnique;
  }
});

test('personal subjects and account-management routes remain protected', async () => {
  const [subjectsResponse, subjectDeleteResponse, adminResponse] = await Promise.all([
    fetch(`${baseUrl}/api/subjects`),
    fetch(`${baseUrl}/api/subjects/00000000-0000-4000-8000-000000000001`, { method: 'DELETE' }),
    fetch(`${baseUrl}/api/admin/users`),
  ]);
  assert.equal(subjectsResponse.status, 401);
  assert.equal(subjectDeleteResponse.status, 401);
  assert.equal(adminResponse.status, 401);
});
