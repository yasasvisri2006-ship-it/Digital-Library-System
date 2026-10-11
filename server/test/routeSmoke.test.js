const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/digital_library_test';
process.env.JWT_SECRET = 'route-smoke-test-secret-with-at-least-thirty-two-characters';
process.env.ACADEMIC_RESOURCE_STORAGE_PROVIDER = 'local';

const { records } = require('../src/data/educationalMaterials');
const { prisma } = require('../src/config/prisma');
const { env } = require('../src/config/env');
const app = require('../src/app');

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
const originalFindMany = prisma.educationalMaterial.findMany;

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

  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  prisma.user.findUnique = originalFindUnique;
  prisma.educationalMaterial.findMany = originalFindMany;
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

test('/api/education serves populated My Learning and Lab Experiments sections', async () => {
  for (const [section, expectedCount] of [['my-learning', 7], ['lab-experiments', 10]]) {
    const response = await fetch(`${baseUrl}/api/education?section=${section}`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.materials.length, expectedCount);
    assert.ok(body.data.materials.every((material) => material.section === section));
    assert.ok(body.data.materials.every((material) => !Object.hasOwn(material, 'fileKey')));
  }
});
