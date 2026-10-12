const { randomUUID } = require('node:crypto');
const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { access, unlink } = require('node:fs/promises');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { UserRole } = require('@prisma/client');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-thirty-two-characters';
process.env.ADMIN_SETUP_KEY = 'test-only-admin-setup-key-that-is-long-enough';
if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is required; refusing to run integration tests against the application database.');
}
const testDatabaseUrl = new URL(process.env.TEST_DATABASE_URL);
const testDatabaseName = testDatabaseUrl.pathname.slice(1).split('?')[0];
if (!/_test$/i.test(testDatabaseName)) {
  throw new Error('TEST_DATABASE_URL must target a database whose name ends with _test.');
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

const { env } = require('../src/config/env');
const app = require('../src/app');
const { prisma } = require('../src/config/prisma');
const { getPhotoPath } = require('../src/services/profileService');

let server;
let baseUrl;
let studentCookie;
let studentId;
let studentEmail;
let adminCookie;
let adminId;
let bootstrapAdminEmail;
let bootstrapAdminPassword;
let testSubjectId;
const origin = 'http://localhost:5173';
const createdUserIds = [];

before(async () => {
  await prisma.$connect();
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  for (const userId of createdUserIds) {
    try {
      await unlink(await getPhotoPath(userId));
    } catch (error) {
      if (error.code !== 'ENOENT' && error.statusCode !== 404) throw error;
    }
  }
  if (createdUserIds.length) {
    const privateFiles = await prisma.academicResource.findMany({
      where: { ownerId: { in: createdUserIds }, filePath: { not: null } },
      select: { filePath: true },
    });
    for (const { filePath } of privateFiles) {
      await unlink(path.resolve(env.academicResourceStorageDir, filePath)).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
    const [screenshots, certificates, resumes] = await Promise.all([
      prisma.projectScreenshot.findMany({
        where: { ownerId: { in: createdUserIds } },
        select: { filePath: true },
      }),
      prisma.certificate.findMany({
        where: { ownerId: { in: createdUserIds }, filePath: { not: null } },
        select: { filePath: true },
      }),
      prisma.resumeProfile.findMany({
        where: { ownerId: { in: createdUserIds }, filePath: { not: null } },
        select: { filePath: true },
      }),
    ]);
    for (const { filePath } of [...screenshots, ...certificates, ...resumes]) {
      await unlink(path.resolve(env.portfolioStorageDir, filePath)).catch((error) => {
        if (error.code !== 'ENOENT') throw error;
      });
    }
    await prisma.subject.deleteMany({ where: { ownerId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await prisma.$disconnect();
});

test('GET /api/health returns a healthy API response with security headers', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.service, 'digital-library-api');
  assert.ok(Number.isFinite(Date.parse(body.data.timestamp)));
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});

test('educational catalog metadata is public while file downloads require a student session', async () => {
  const catalogResponse = await fetch(`${baseUrl}/api/education?section=subjects`);
  const catalogBody = await catalogResponse.json();

  assert.equal(catalogResponse.status, 200);
  assert.equal(catalogBody.success, true);
  assert.ok(Array.isArray(catalogBody.data.materials));
  assert.ok(catalogBody.data.materials.every((material) => !Object.hasOwn(material, 'fileKey')));
  assert.ok(catalogBody.data.materials.every((material) => material.fileUrl === null
    || material.fileUrl === `/education/${material.slug}/file`));

  const downloadResponse = await fetch(`${baseUrl}/api/education/private-material/file`);
  assert.equal(downloadResponse.status, 401);
});

test('public registration is disabled and request validation returns the standard error format', async () => {
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify({ name: '', email: 'not-an-email', password: 'x' }),
  });
  const body = await response.json();

  assert.equal(response.status, 404);

  const invalidLogin = await fetch(`${baseUrl}/api/auth/student/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify({ identity: '', password: 'x' }),
  });
  const validationBody = await invalidLogin.json();

  assert.equal(invalidLogin.status, 400);
  assert.equal(validationBody.success, false);
  assert.equal(validationBody.data, null);
  assert.ok(Array.isArray(validationBody.errors));
});

test('existing student records can sign in and public registration cannot create accounts', async () => {
  studentId = `TEST-${randomUUID().slice(0, 28)}`;
  studentEmail = `${randomUUID()}@example.com`;
  const user = await prisma.user.create({
    data: {
      name: 'Test Student',
      email: studentEmail,
      passwordHash: await bcrypt.hash('test-password-123', 12),
      studentProfile: {
        create: {
          studentId,
          program: 'B.Tech',
          department: 'CSE',
          branch: 'CSE (Data Science)',
          year: 'III Year',
          semester: 'V Semester',
          section: 'A',
        },
      },
    },
  });
  createdUserIds.push(user.id);

  const currentResponse = await fetch(`${baseUrl}/api/auth/me`);
  assert.equal(currentResponse.status, 401);
});

test('login rejects invalid credentials and accepts student ID or email', async () => {
  const invalidResponse = await fetch(`${baseUrl}/api/auth/student/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify({ identity: studentId, password: 'incorrect-password' }),
  });
  assert.equal(invalidResponse.status, 401);

  const emailLoginResponse = await fetch(`${baseUrl}/api/auth/student/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify({ identity: studentEmail, password: 'test-password-123' }),
  });
  assert.equal(emailLoginResponse.status, 200);
  const cookieHeader = emailLoginResponse.headers.getSetCookie()[0];
  assert.match(cookieHeader, /HttpOnly/i);
  assert.match(cookieHeader, /SameSite=Strict/i);
  assert.match(cookieHeader, /Path=\/api/i);
  studentCookie = cookieHeader.split(';')[0];

  const loginResponse = await fetch(`${baseUrl}/api/auth/student/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify({ identity: studentId, password: 'test-password-123' }),
  });
  assert.equal(loginResponse.status, 200);

  const currentResponse = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { cookie: studentCookie, origin },
  });
  const currentBody = await currentResponse.json();
  assert.equal(currentResponse.status, 200);
  assert.equal(currentBody.data.user.name, 'Test Student');
  assert.equal(currentBody.data.user.studentProfile.studentId, studentId);

});

test('first-admin bootstrap creates one hashed administrator and refuses a second run', async () => {
  bootstrapAdminEmail = `${randomUUID()}@example.com`;
  bootstrapAdminPassword = 'bootstrap-test-password';
  const childEnv = {
    ...process.env,
    ADMIN_BOOTSTRAP_CONFIRM: 'CREATE_FIRST_ADMIN',
    ADMIN_BOOTSTRAP_NAME: 'Bootstrap Test Admin',
    ADMIN_BOOTSTRAP_EMAIL: bootstrapAdminEmail,
    ADMIN_BOOTSTRAP_PASSWORD: bootstrapAdminPassword,
  };
  const scriptPath = path.resolve(__dirname, '../prisma/bootstrap-admin.js');
  let unconfirmedRunError;
  try {
    execFileSync(process.execPath, [scriptPath], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...childEnv, ADMIN_BOOTSTRAP_CONFIRM: '' },
      encoding: 'utf8',
      stdio: 'pipe',
    });
  } catch (error) {
    unconfirmedRunError = error;
  }
  assert.ok(unconfirmedRunError);
  assert.match(unconfirmedRunError.stderr.toString(), /explicitly authorize first-admin setup/);

  let productionRunError;
  try {
    execFileSync(process.execPath, [scriptPath], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...childEnv, NODE_ENV: 'production' },
      encoding: 'utf8',
      stdio: 'pipe',
    });
  } catch (error) {
    productionRunError = error;
  }
  assert.ok(productionRunError);
  assert.match(productionRunError.stderr.toString(), /development or test environment/);

  let developmentTestDatabaseError;
  try {
    execFileSync(process.execPath, [scriptPath], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...childEnv, NODE_ENV: 'development', DATABASE_URL: process.env.TEST_DATABASE_URL },
      encoding: 'utf8',
      stdio: 'pipe',
    });
  } catch (error) {
    developmentTestDatabaseError = error;
  }
  assert.ok(developmentTestDatabaseError);
  assert.match(developmentTestDatabaseError.stderr.toString(), /development setup requires the local "digital_library" database/);

  const wrongDevelopmentDatabase = new URL(process.env.TEST_DATABASE_URL);
  wrongDevelopmentDatabase.pathname = '/not_digital_library';
  let wrongDevelopmentDatabaseError;
  try {
    execFileSync(process.execPath, [scriptPath], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...childEnv, NODE_ENV: 'development', DATABASE_URL: wrongDevelopmentDatabase.toString() },
      encoding: 'utf8',
      stdio: 'pipe',
    });
  } catch (error) {
    wrongDevelopmentDatabaseError = error;
  }
  assert.ok(wrongDevelopmentDatabaseError);
  assert.match(wrongDevelopmentDatabaseError.stderr.toString(), /requires the local "digital_library" database/);

  const remoteDevelopmentDatabase = new URL(process.env.TEST_DATABASE_URL);
  remoteDevelopmentDatabase.pathname = '/digital_library';
  remoteDevelopmentDatabase.hostname = 'db.example.test';
  let remoteDevelopmentDatabaseError;
  try {
    execFileSync(process.execPath, [scriptPath], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...childEnv, NODE_ENV: 'development', DATABASE_URL: remoteDevelopmentDatabase.toString() },
      encoding: 'utf8',
      stdio: 'pipe',
    });
  } catch (error) {
    remoteDevelopmentDatabaseError = error;
  }
  assert.ok(remoteDevelopmentDatabaseError);
  assert.match(remoteDevelopmentDatabaseError.stderr.toString(), /is not local/);

  const output = execFileSync(process.execPath, [scriptPath], { cwd: path.resolve(__dirname, '..'), env: childEnv, encoding: 'utf8' });
  assert.match(output, /Initial administrator created/);
  assert.doesNotMatch(output, new RegExp(bootstrapAdminPassword));
  assert.match(output, /test database "digital_library_test"/);
  const admin = await prisma.user.findUnique({ where: { email: bootstrapAdminEmail } });
  assert.ok(admin);
  adminId = admin.id;
  createdUserIds.push(admin.id);
  assert.equal(admin.role, UserRole.ADMIN);
  assert.notEqual(admin.passwordHash, bootstrapAdminPassword);
  assert.equal(await bcrypt.compare(bootstrapAdminPassword, admin.passwordHash), true);

  const setupStatus = await fetch(`${baseUrl}/api/auth/admin/setup-status`);
  assert.equal(setupStatus.status, 200);
  assert.equal((await setupStatus.json()).data.available, false);
  const firstAdminService = require('../src/services/firstAdminService');
  await assert.rejects(
    firstAdminService.setupFirstAdmin({
      name: 'Second Admin',
      email: `${randomUUID()}@example.com`,
      password: 'another-secure-password',
      setupKey: 'wrong-setup-key-that-is-long-enough',
    }),
    { statusCode: 403 },
  );
  await assert.rejects(
    firstAdminService.setupFirstAdmin({
      name: 'Second Admin',
      email: `${randomUUID()}@example.com`,
      password: 'another-secure-password',
      setupKey: process.env.ADMIN_SETUP_KEY,
    }),
    { statusCode: 409 },
  );
  assert.equal(await prisma.user.count({ where: { role: UserRole.ADMIN } }), 1);

  let secondRunError;
  try {
    execFileSync(process.execPath, [scriptPath], { cwd: path.resolve(__dirname, '..'), env: childEnv, encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    secondRunError = error;
  }
  assert.ok(secondRunError);
  assert.match(secondRunError.stderr.toString(), /An administrator already exists/);
  assert.equal(await prisma.user.count({ where: { role: UserRole.ADMIN } }), 1);

  await prisma.user.delete({ where: { id: admin.id } });
  const availableStatus = await fetch(`${baseUrl}/api/auth/admin/setup-status`);
  assert.equal((await availableStatus.json()).data.available, true);

  const setupResponse = await fetch(`${baseUrl}/api/auth/admin/setup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify({
      name: 'Bootstrap Test Admin',
      email: bootstrapAdminEmail,
      password: bootstrapAdminPassword,
      setupKey: process.env.ADMIN_SETUP_KEY,
    }),
  });
  const setupBody = await setupResponse.json();
  assert.equal(setupResponse.status, 201, JSON.stringify(setupBody));
  assert.equal(setupBody.data.user.role, 'ADMIN');
  assert.equal('passwordHash' in setupBody.data.user, false);
  adminId = setupBody.data.user.id;
  createdUserIds.push(adminId);
  const unavailableStatus = await fetch(`${baseUrl}/api/auth/admin/setup-status`);
  assert.equal((await unavailableStatus.json()).data.available, false);
});

test('admin password reset changes only the selected admin password and revokes sessions', async () => {
  const resetPassword = 'admin-reset-test-password';
  const scriptPath = path.resolve(__dirname, '../prisma/reset-admin-password.js');
  const priorAdmin = await prisma.user.findUnique({ where: { id: adminId }, select: { tokenVersion: true } });
  const childEnv = {
    ...process.env,
    NODE_ENV: 'test',
    ADMIN_PASSWORD_RESET_CONFIRM: 'RESET_EXISTING_ADMIN_PASSWORD',
    ADMIN_PASSWORD_RESET_EMAIL: bootstrapAdminEmail,
    ADMIN_PASSWORD_RESET_VALUE: resetPassword,
  };
  const output = execFileSync(process.execPath, [scriptPath], {
    cwd: path.resolve(__dirname, '..'),
    env: childEnv,
    encoding: 'utf8',
  });
  assert.match(output, /Administrator password reset/);
  assert.doesNotMatch(output, new RegExp(resetPassword));

  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  assert.equal(admin.role, UserRole.ADMIN);
  assert.equal(admin.isActive, true);
  assert.equal(await bcrypt.compare(resetPassword, admin.passwordHash), true);
  assert.notEqual(admin.passwordHash, resetPassword);
  assert.equal(admin.tokenVersion, priorAdmin.tokenVersion + 1);
  bootstrapAdminPassword = resetPassword;

  let unconfirmedError;
  try {
    execFileSync(process.execPath, [scriptPath], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...childEnv, ADMIN_PASSWORD_RESET_CONFIRM: '' },
      encoding: 'utf8',
      stdio: 'pipe',
    });
  } catch (error) {
    unconfirmedError = error;
  }
  assert.ok(unconfirmedError);
  assert.match(unconfirmedError.stderr.toString(), /authorize the reset/);

  const changedDatabase = new URL(process.env.TEST_DATABASE_URL);
  changedDatabase.pathname = '/digital_library';
  let nonTestDatabaseError;
  try {
    execFileSync(process.execPath, [scriptPath], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...childEnv, DATABASE_URL: changedDatabase.toString() },
      encoding: 'utf8',
      stdio: 'pipe',
    });
  } catch (error) {
    nonTestDatabaseError = error;
  }
  assert.ok(nonTestDatabaseError);
  assert.match(nonTestDatabaseError.stderr.toString(), /test requires a database whose name ends in _test/);
});

test('only administrators can create student accounts and manage student access', async () => {
  const adminLogin = await fetch(`${baseUrl}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify({ identity: bootstrapAdminEmail, password: bootstrapAdminPassword }),
  });
  assert.equal(adminLogin.status, 200);
  const adminLoginBody = await adminLogin.json();
  assert.equal(adminLoginBody.data.user.role, 'admin');
  adminCookie = adminLogin.headers.getSetCookie()[0].split(';')[0];
  assert.match(adminLogin.headers.getSetCookie()[0], /HttpOnly/i);

  const restoredAdminResponse = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { cookie: adminCookie, origin },
  });
  const restoredAdminBody = await restoredAdminResponse.json();
  assert.equal(restoredAdminResponse.status, 200);
  assert.equal(restoredAdminBody.data.user.role, 'admin');

  async function request(path, { method = 'GET', body, cookie = adminCookie } = {}) {
    return fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body instanceof FormData ? {} : body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(cookie ? { cookie } : {}),
        origin,
      },
      ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }),
    });
  }

  const unauthenticated = await request('/api/admin/users/', { cookie: null });
  assert.equal(unauthenticated.status, 401);
  const selfDisable = await request(`/api/admin/users/${adminId}/status`, {
    method: 'PATCH',
    body: { isActive: false },
  });
  assert.equal(selfDisable.status, 409);
  const forbidden = await request('/api/admin/users', {
    method: 'POST',
    cookie: studentCookie,
    body: {
      studentId: `FORBIDDEN-${randomUUID().slice(0, 8)}`,
      name: 'Forbidden Student',
      email: `${randomUUID()}@example.com`,
      department: 'CSE',
      branch: 'Data Science',
      year: 'III Year',
      semester: 'V Semester',
      section: 'A',
      password: 'student-test-password',
    },
  });
  assert.equal(forbidden.status, 403);

  const createPayload = {
    studentId: `ADMIN-${randomUUID().slice(0, 12)}`,
    name: 'Admin Created Student',
    email: `${randomUUID()}@example.com`,
    department: 'School of Computing',
    branch: 'CSE (Data Science)',
    year: 'III Year',
    semester: 'V Semester',
    section: 'B',
    password: 'student-initial-password',
    phone: '9999999999',
  };
  const attemptedAdmin = await request('/api/admin/users', {
    method: 'POST',
    body: { ...createPayload, role: 'ADMIN' },
  });
  assert.equal(attemptedAdmin.status, 400);

  const createdResponse = await request('/api/admin/users', { method: 'POST', body: createPayload });
  const createdBody = await createdResponse.json();
  assert.equal(createdResponse.status, 201, JSON.stringify(createdBody));
  const created = createdBody.data.user;
  createdUserIds.push(created.id);
  assert.equal(created.role, 'STUDENT');
  assert.equal(created.studentProfile.branch, createPayload.branch);
  assert.equal(created.studentProfile.section, 'B');
  assert.equal('passwordHash' in created, false);
  assert.equal('password' in created, false);
  const stored = await prisma.user.findUnique({ where: { id: created.id } });
  assert.notEqual(stored.passwordHash, createPayload.password);
  assert.equal(await bcrypt.compare(createPayload.password, stored.passwordHash), true);

  const duplicateEmail = await request('/api/admin/users', {
    method: 'POST',
    body: { ...createPayload, studentId: `EMAIL-${randomUUID().slice(0, 10)}` },
  });
  assert.equal(duplicateEmail.status, 409);
  const duplicateStudentId = await request('/api/admin/users', {
    method: 'POST',
    body: { ...createPayload, email: `${randomUUID()}@example.com` },
  });
  assert.equal(duplicateStudentId.status, 409);

  const list = await request(`/api/admin/users/?search=${encodeURIComponent(createPayload.studentId)}&department=${encodeURIComponent(createPayload.department)}&status=ACTIVE`);
  const listBody = await list.json();
  assert.equal(list.status, 200);
  assert.equal(listBody.data.pagination.total, 1);
  assert.equal(listBody.data.users[0].id, created.id);

  const update = await request(`/api/admin/users/${created.id}`, {
    method: 'PATCH',
    body: { name: 'Updated Admin Created Student', section: 'C' },
  });
  assert.equal(update.status, 200);
  assert.equal((await update.json()).data.user.studentProfile.section, 'C');

  const studentLogin = await request('/api/auth/student/login', {
    method: 'POST',
    cookie: null,
    body: { identity: createPayload.studentId, password: createPayload.password },
  });
  assert.equal(studentLogin.status, 200);
  const createdStudentCookie = studentLogin.headers.getSetCookie()[0].split(';')[0];
  const disable = await request(`/api/admin/users/${created.id}/status`, {
    method: 'PATCH',
    body: { isActive: false },
  });
  assert.equal(disable.status, 200);
  const revokedSession = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie: createdStudentCookie, origin } });
  assert.equal(revokedSession.status, 401);
  const disabledLogin = await request('/api/auth/student/login', {
    method: 'POST',
    cookie: null,
    body: { identity: createPayload.studentId, password: createPayload.password },
  });
  assert.equal(disabledLogin.status, 401);

  const enable = await request(`/api/admin/users/${created.id}/status`, {
    method: 'PATCH',
    body: { isActive: true },
  });
  assert.equal(enable.status, 200);
  const reset = await request(`/api/admin/users/${created.id}/password`, {
    method: 'PATCH',
    body: { password: 'student-reset-password' },
  });
  assert.equal(reset.status, 200);
  const resetLogin = await request('/api/auth/student/login', {
    method: 'POST',
    cookie: null,
    body: { identity: createPayload.studentId, password: 'student-reset-password' },
  });
  assert.equal(resetLogin.status, 200);
  const oldPasswordLogin = await request('/api/auth/student/login', {
    method: 'POST',
    cookie: null,
    body: { identity: createPayload.studentId, password: createPayload.password },
  });
  assert.equal(oldPasswordLogin.status, 401);
});

test('subjects and academic resources support private CRUD, PDF downloads, and review progress', async () => {
  const unauthenticatedUpload = await fetch(`${baseUrl}/api/subjects/${randomUUID()}/resources/file`, {
    method: 'POST',
  });
  assert.equal(unauthenticatedUpload.status, 401);

  const createResponse = await fetch(`${baseUrl}/api/subjects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: studentCookie, origin },
    body: JSON.stringify({
      code: `TEST-${randomUUID().slice(0, 24)}`,
      name: 'DEMO - Test Subject',
      semester: 'Verified Semester',
      description: 'Test-only subject; not official MBU course content.',
    }),
  });
  const created = await createResponse.json();
  assert.equal(createResponse.status, 201, JSON.stringify(created));
  testSubjectId = created.data.subject.id;
  assert.equal(created.data.subject.resourceCount, 0);
  assert.equal(created.data.subject.progressPercent, 0);

  const listResponse = await fetch(`${baseUrl}/api/subjects?search=Test%20Subject&semester=Verified%20Semester`, {
    headers: { cookie: studentCookie, origin },
  });
  const list = await listResponse.json();
  assert.equal(listResponse.status, 200);
  assert.equal(list.data.subjects.length, 1);
  assert.equal(list.data.subjects[0].id, testSubjectId);

  const referenceResponse = await fetch(`${baseUrl}/api/subjects/${testSubjectId}/resources`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: studentCookie, origin },
    body: JSON.stringify({
      title: 'Official reference URL',
      type: 'REFERENCE',
      url: 'https://example.com/reference',
    }),
  });
  const reference = await referenceResponse.json();
  assert.equal(referenceResponse.status, 201, JSON.stringify(reference));
  const reviewedResponse = await fetch(`${baseUrl}/api/subjects/resources/${reference.data.resource.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', cookie: studentCookie, origin },
    body: JSON.stringify({ isReviewed: true }),
  });
  assert.equal(reviewedResponse.status, 200);

  const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n');
  const uploadForm = new FormData();
  uploadForm.append('title', 'Lecture notes PDF');
  uploadForm.append('description', 'A private test PDF.');
  uploadForm.append('type', 'NOTES');
  uploadForm.append('file', new Blob([pdf], { type: 'application/pdf' }), 'lecture-notes.pdf');
  const uploadResponse = await fetch(`${baseUrl}/api/subjects/${testSubjectId}/resources/file`, {
    method: 'POST',
    headers: { cookie: studentCookie, origin },
    body: uploadForm,
  });
  const uploadBody = await uploadResponse.json();
  assert.equal(uploadResponse.status, 201, JSON.stringify(uploadBody));
  const uploadedResource = uploadBody.data.resource;
  assert.equal(uploadedResource.fileName, 'lecture-notes.pdf');
  assert.equal('filePath' in uploadedResource, false);
  const storedResource = await prisma.academicResource.findUnique({
    where: { id: uploadedResource.id },
    select: { filePath: true },
  });
  assert.ok(storedResource.filePath);
  const filePath = path.resolve(env.academicResourceStorageDir, storedResource.filePath);
  await access(filePath);

  const downloadResponse = await fetch(`${baseUrl}/api/subjects/resources/${uploadedResource.id}/download`, {
    headers: { cookie: studentCookie, origin },
  });
  assert.equal(downloadResponse.status, 200);
  assert.equal(downloadResponse.headers.get('cache-control'), 'private, no-store');
  assert.match(downloadResponse.headers.get('content-disposition'), /attachment/);
  assert.match(downloadResponse.headers.get('content-type'), /application\/pdf/);
  assert.deepEqual(Buffer.from(await downloadResponse.arrayBuffer()), pdf);

  const updatedSubjectResponse = await fetch(`${baseUrl}/api/subjects/${testSubjectId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', cookie: studentCookie, origin },
    body: JSON.stringify({ name: 'DEMO - Renamed Test Subject' }),
  });
  assert.equal(updatedSubjectResponse.status, 200);
  const detailResponse = await fetch(`${baseUrl}/api/subjects/${testSubjectId}`, {
    headers: { cookie: studentCookie, origin },
  });
  const detail = await detailResponse.json();
  assert.equal(detail.data.subject.name, 'DEMO - Renamed Test Subject');
  assert.equal(detail.data.subject.resourceCount, 2);
  assert.equal(detail.data.subject.reviewedResourceCount, 1);
  assert.equal(detail.data.subject.progressPercent, 50);

  const deleteResourceResponse = await fetch(`${baseUrl}/api/subjects/resources/${reference.data.resource.id}`, {
    method: 'DELETE',
    headers: { cookie: studentCookie, origin },
  });
  assert.equal(deleteResourceResponse.status, 200);

  const deleteSubjectResponse = await fetch(`${baseUrl}/api/subjects/${testSubjectId}`, {
    method: 'DELETE',
    headers: { cookie: studentCookie, origin },
  });
  assert.equal(deleteSubjectResponse.status, 200);
  await assert.rejects(access(filePath), { code: 'ENOENT' });
});

test('subject and resource ownership prevents access from other student accounts', async () => {
  const unauthenticatedDownload = await fetch(`${baseUrl}/api/subjects/resources/${randomUUID()}/download`);
  assert.equal(unauthenticatedDownload.status, 401);

  const otherUser = await prisma.user.create({
    data: {
      name: 'Other Test Student',
      email: `${randomUUID()}@example.com`,
      passwordHash: await bcrypt.hash('unused-test-password', 4),
      role: UserRole.STUDENT,
      studentProfile: { create: {} },
    },
  });
  createdUserIds.push(otherUser.id);
  const otherToken = jwt.sign({ id: otherUser.id, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const otherCookie = `mbu_session=${otherToken}`;
  const subject = await prisma.subject.create({
    data: { ownerId: createdUserIds[0], name: 'Owner-only test subject' },
  });
  const resource = await prisma.academicResource.create({
    data: {
      ownerId: createdUserIds[0],
      subjectId: subject.id,
      title: 'Owner-only test resource',
      type: 'REFERENCE',
      url: 'https://example.com/private',
    },
  });
  const privatePdf = Buffer.from('%PDF-1.4\nprivate owner data\n%%EOF\n');
  const privateForm = new FormData();
  privateForm.append('title', 'Private owner PDF');
  privateForm.append('type', 'NOTES');
  privateForm.append('file', new Blob([privatePdf], { type: 'application/pdf' }), 'private.pdf');
  const privateUploadResponse = await fetch(`${baseUrl}/api/subjects/${subject.id}/resources/file`, {
    method: 'POST',
    headers: { cookie: studentCookie, origin },
    body: privateForm,
  });
  const privateUpload = await privateUploadResponse.json();
  assert.equal(privateUploadResponse.status, 201);
  try {
    const listResponse = await fetch(`${baseUrl}/api/subjects`, {
      headers: { cookie: otherCookie, origin },
    });
    assert.equal((await listResponse.json()).data.subjects.length, 0);

    const subjectResponse = await fetch(`${baseUrl}/api/subjects/${subject.id}`, {
      headers: { cookie: otherCookie, origin },
    });
    assert.equal(subjectResponse.status, 404);

    const resourceResponse = await fetch(`${baseUrl}/api/subjects/resources/${resource.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie: otherCookie, origin },
      body: JSON.stringify({ title: 'Unauthorized edit' }),
    });
    assert.equal(resourceResponse.status, 404);

    const downloadResponse = await fetch(`${baseUrl}/api/subjects/resources/${privateUpload.data.resource.id}/download`, {
      headers: { cookie: otherCookie, origin },
    });
    assert.equal(downloadResponse.status, 404);

    const deleteResponse = await fetch(`${baseUrl}/api/subjects/${subject.id}`, {
      method: 'DELETE',
      headers: { cookie: otherCookie, origin },
    });
    assert.equal(deleteResponse.status, 404);
    const unchanged = await prisma.academicResource.findUnique({ where: { id: resource.id } });
    assert.equal(unchanged.title, 'Owner-only test resource');
  } finally {
    await fetch(`${baseUrl}/api/subjects/${subject.id}`, {
      method: 'DELETE',
      headers: { cookie: studentCookie, origin },
    });
  }
});

test('optional demo subjects are explicit placeholders and can be added idempotently', async () => {
  await prisma.subject.deleteMany({
    where: { ownerId: createdUserIds[0], code: { startsWith: 'DEMO-' } },
  });
  const firstResponse = await fetch(`${baseUrl}/api/subjects/demo`, {
    method: 'POST',
    headers: { cookie: studentCookie, origin },
  });
  const first = await firstResponse.json();
  assert.equal(firstResponse.status, 200);
  assert.equal(first.data.subjects.length, 6);
  assert.ok(first.data.subjects.every((subject) => subject.name.includes('(DEMO)') && subject.semester === null));

  const secondResponse = await fetch(`${baseUrl}/api/subjects/demo`, {
    method: 'POST',
    headers: { cookie: studentCookie, origin },
  });
  const second = await secondResponse.json();
  assert.equal(second.data.subjects.length, 6);
  const ids = new Set(second.data.subjects.map((subject) => subject.id));
  assert.equal(ids.size, 6);
  await prisma.subject.deleteMany({
    where: { ownerId: createdUserIds[0], code: { startsWith: 'DEMO-' } },
  });
});

test('coding practice saves personal problems, bookmarks, completion, and activity history', async () => {
  const unauthenticated = await fetch(`${baseUrl}/api/learning/coding/problems`);
  assert.equal(unauthenticated.status, 401);

  const createResponse = await fetch(`${baseUrl}/api/learning/coding/problems`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: studentCookie, origin },
    body: JSON.stringify({
      title: 'Array pair test problem',
      statement: 'Given a list of integers, find two distinct entries whose sum matches a target.',
      language: 'PYTHON',
      topic: 'Arrays',
      difficulty: 'EASY',
      solutionNotes: 'Start with a lookup map.',
    }),
  });
  const created = await createResponse.json();
  assert.equal(createResponse.status, 201, JSON.stringify(created));
  const problemId = created.data.problem.id;

  const updateResponse = await fetch(`${baseUrl}/api/learning/coding/problems/${problemId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', cookie: studentCookie, origin },
    body: JSON.stringify({ isCompleted: true, isBookmarked: true, solutionNotes: 'Use a value-to-index map.' }),
  });
  const updated = await updateResponse.json();
  assert.equal(updateResponse.status, 200);
  assert.equal(updated.data.problem.isCompleted, true);
  assert.equal(updated.data.problem.isBookmarked, true);
  assert.ok(updated.data.problem.completedAt);

  const filteredResponse = await fetch(`${baseUrl}/api/learning/coding/problems?language=PYTHON&status=bookmarked`, {
    headers: { cookie: studentCookie, origin },
  });
  const filtered = await filteredResponse.json();
  assert.equal(filtered.data.problems.length, 1);
  assert.equal(filtered.data.progress.completionPercent, 100);

  const historyResponse = await fetch(`${baseUrl}/api/learning/coding/history`, {
    headers: { cookie: studentCookie, origin },
  });
  const history = await historyResponse.json();
  assert.ok(history.data.history.some((event) => event.problemTitle === created.data.problem.title && event.eventType === 'COMPLETED'));

  const otherUser = await prisma.user.create({
    data: {
      name: 'Coding Ownership Student',
      email: `${randomUUID()}@example.com`,
      passwordHash: await bcrypt.hash('unused-test-password', 4),
      role: UserRole.STUDENT,
      studentProfile: { create: {} },
    },
  });
  createdUserIds.push(otherUser.id);
  const otherCookie = `mbu_session=${jwt.sign({ id: otherUser.id, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' })}`;
  const unauthorized = await fetch(`${baseUrl}/api/learning/coding/problems/${problemId}`, {
    method: 'DELETE',
    headers: { cookie: otherCookie, origin },
  });
  assert.equal(unauthorized.status, 404);

  const deleteResponse = await fetch(`${baseUrl}/api/learning/coding/problems/${problemId}`, {
    method: 'DELETE',
    headers: { cookie: studentCookie, origin },
  });
  assert.equal(deleteResponse.status, 200);
  const deletedHistoryResponse = await fetch(`${baseUrl}/api/learning/coding/history`, {
    headers: { cookie: studentCookie, origin },
  });
  const deletedHistory = await deletedHistoryResponse.json();
  assert.ok(deletedHistory.data.history.some((event) => event.problemTitle === created.data.problem.title && event.eventType === 'DELETED'));
});

test('tool and AWS learning progress, private lab notes, and certificate records persist per student', async () => {
  const unknownTool = await fetch(`${baseUrl}/api/learning/tools/not-a-tool`, {
    headers: { cookie: studentCookie, origin },
  });
  assert.equal(unknownTool.status, 404);

  const toolSaveResponse = await fetch(`${baseUrl}/api/learning/tools/numpy`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', cookie: studentCookie, origin },
    body: JSON.stringify({ notes: 'Review array broadcasting.', percentComplete: 45 }),
  });
  const toolSaved = await toolSaveResponse.json();
  assert.equal(toolSaveResponse.status, 200);
  assert.equal(toolSaved.data.progress.percentComplete, 45);
  assert.equal(toolSaved.data.progress.isCompleted, false);

  const cloudSaveResponse = await fetch(`${baseUrl}/api/learning/cloud`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', cookie: studentCookie, origin },
    body: JSON.stringify({ notes: 'Review cloud fundamentals.', percentComplete: 30 }),
  });
  const cloudSaved = await cloudSaveResponse.json();
  assert.equal(cloudSaveResponse.status, 200);
  assert.equal(cloudSaved.data.progress.percentComplete, 30);

  const labResponse = await fetch(`${baseUrl}/api/learning/cloud/labs`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: studentCookie, origin },
    body: JSON.stringify({ title: 'IAM review notes', notes: 'Record the principles studied.' }),
  });
  const lab = await labResponse.json();
  assert.equal(labResponse.status, 201);
  const labUpdateResponse = await fetch(`${baseUrl}/api/learning/cloud/labs/${lab.data.note.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', cookie: studentCookie, origin },
    body: JSON.stringify({ isComplete: true }),
  });
  assert.equal((await labUpdateResponse.json()).data.note.isComplete, true);

  const certificateResponse = await fetch(`${baseUrl}/api/learning/cloud/certificates`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: studentCookie, origin },
    body: JSON.stringify({
      title: 'Test AWS Learning Record',
      issuer: 'Test issuer',
      issuedAt: new Date().toISOString(),
      credentialUrl: 'https://example.com/credential',
    }),
  });
  const certificate = await certificateResponse.json();
  assert.equal(certificateResponse.status, 201, JSON.stringify(certificate));
  assert.equal(certificate.data.certificate.category, 'AWS_CLOUD');

  const cloudReadResponse = await fetch(`${baseUrl}/api/learning/cloud`, {
    headers: { cookie: studentCookie, origin },
  });
  const cloudRead = await cloudReadResponse.json();
  assert.equal(cloudRead.data.learning.labNotes.length, 1);
  assert.equal(cloudRead.data.learning.certificates.length, 1);
  assert.equal(cloudRead.data.learning.progress.percentComplete, 30);

  const invalidProgressResponse = await fetch(`${baseUrl}/api/learning/tools/numpy`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', cookie: studentCookie, origin },
    body: JSON.stringify({ percentComplete: 150 }),
  });
  assert.equal(invalidProgressResponse.status, 400);

  const contradictoryProgressResponse = await fetch(`${baseUrl}/api/learning/tools/numpy`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', cookie: studentCookie, origin },
    body: JSON.stringify({ isCompleted: false, percentComplete: 100 }),
  });
  assert.equal(contradictoryProgressResponse.status, 400);

  const deleteCertificateResponse = await fetch(`${baseUrl}/api/learning/cloud/certificates/${certificate.data.certificate.id}`, {
    method: 'DELETE',
    headers: { cookie: studentCookie, origin },
  });
  assert.equal(deleteCertificateResponse.status, 200);
  const deleteLabResponse = await fetch(`${baseUrl}/api/learning/cloud/labs/${lab.data.note.id}`, {
    method: 'DELETE',
    headers: { cookie: studentCookie, origin },
  });
  assert.equal(deleteLabResponse.status, 200);
});

test('profile access is authenticated and ignores caller-supplied owner identifiers', async () => {
  const unauthenticatedResponse = await fetch(`${baseUrl}/api/profile`);
  assert.equal(unauthenticatedResponse.status, 401);

  const response = await fetch(`${baseUrl}/api/profile?ownerId=${randomUUID()}`, {
    headers: { cookie: studentCookie, origin },
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.data.profile.studentId, studentId);
});

test('student profile editing updates the authenticated account', async () => {
  const response = await fetch(`${baseUrl}/api/profile`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', cookie: studentCookie, origin },
    body: JSON.stringify({ name: 'Updated Student', department: 'CSE (Data Science)' }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.profile.name, 'Updated Student');
  assert.equal(body.data.profile.department, 'CSE (Data Science)');
});

test('profile photo upload validates image content and serves it only to its owner', async () => {
  const imageBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQk4AAAAASUVORK5CYII=',
    'base64',
  );
  const form = new FormData();
  form.append('photo', new Blob([imageBytes], { type: 'image/png' }), 'profile.png');
  const uploadResponse = await fetch(`${baseUrl}/api/profile/photo`, {
    method: 'POST',
    headers: { cookie: studentCookie, origin },
    body: form,
  });
  const uploadBody = await uploadResponse.json();
  assert.equal(uploadResponse.status, 200, JSON.stringify(uploadBody));
  assert.match(uploadBody.data.profile.photoUrl, /^\/profile\/photo\?/);

  const photoResponse = await fetch(`${baseUrl}/api/profile/photo`, {
    headers: { cookie: studentCookie, origin },
  });
  assert.equal(photoResponse.status, 200);
  assert.equal(photoResponse.headers.get('content-type'), 'image/png');
  assert.equal(photoResponse.headers.get('cache-control'), 'private, no-store');

  const invalidForm = new FormData();
  invalidForm.append('photo', new Blob(['not an image'], { type: 'image/png' }), 'fake.png');
  const invalidResponse = await fetch(`${baseUrl}/api/profile/photo`, {
    method: 'POST',
    headers: { cookie: studentCookie, origin },
    body: invalidForm,
  });
  assert.equal(invalidResponse.status, 400);
});

test('student profile APIs deny an authenticated administrator', async () => {
  const admin = await prisma.user.create({
    data: {
      name: 'Test Administrator',
      email: `${randomUUID()}@example.com`,
      passwordHash: await bcrypt.hash('unused-test-password', 4),
      role: UserRole.ADMIN,
    },
  });
  createdUserIds.push(admin.id);
  const token = jwt.sign({ id: admin.id, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const response = await fetch(`${baseUrl}/api/profile`, {
    headers: { cookie: `mbu_session=${token}`, origin },
  });
  assert.equal(response.status, 403);
});

test('expired sessions are rejected and logout revokes a valid session', async () => {
  const student = await prisma.user.findUnique({
    where: { id: createdUserIds[0] },
    select: { id: true, tokenVersion: true },
  });
  const expiredToken = jwt.sign(
    { id: student.id, tokenVersion: student.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: '-1s' },
  );
  const expiredResponse = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { cookie: `mbu_session=${expiredToken}`, origin },
  });
  assert.equal(expiredResponse.status, 401);

  const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { cookie: studentCookie, origin },
  });
  assert.equal(logoutResponse.status, 200);
  assert.match(logoutResponse.headers.getSetCookie()[0], /Expires=Thu, 01 Jan 1970/i);

  const revokedResponse = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { cookie: studentCookie, origin },
  });
  assert.equal(revokedResponse.status, 401);
});

test('CORS rejects an origin outside the configured allowlist', async () => {
  const response = await fetch(`${baseUrl}/api/health`, {
    headers: { origin: 'https://not-allowed.example' },
  });
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.success, false);
  assert.equal(body.data, null);
});

test('portfolio data supports CRUD, public visibility filtering, private uploads, and owner authorization', async () => {
  const owner = await prisma.user.create({
    data: {
      name: 'Portfolio Test Student',
      email: `${randomUUID()}@example.com`,
      passwordHash: await bcrypt.hash('unused-test-password', 4),
      role: UserRole.STUDENT,
      studentProfile: {
        create: {
          studentId: `PORTFOLIO-${randomUUID().slice(0, 18)}`,
          program: 'B.Tech',
          branch: 'CSE (DS)',
          department: 'Data Science',
          year: '3rd Year',
          semester: '5th Semester',
        },
      },
    },
  });
  createdUserIds.push(owner.id);
  const ownerToken = jwt.sign({ id: owner.id, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const ownerCookie = `mbu_session=${ownerToken}`;

  const other = await prisma.user.create({
    data: {
      name: 'Private Portfolio Test Student',
      email: `${randomUUID()}@example.com`,
      passwordHash: await bcrypt.hash('unused-test-password', 4),
      role: UserRole.STUDENT,
      studentProfile: { create: {} },
    },
  });
  createdUserIds.push(other.id);
  const otherToken = jwt.sign({ id: other.id, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const otherCookie = `mbu_session=${otherToken}`;
  const jsonRequest = (url, method, body, cookie = ownerCookie) => fetch(`${baseUrl}${url}`, {
    method,
    headers: { 'content-type': 'application/json', cookie, origin },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  const projectResponse = await jsonRequest('/api/portfolio/projects', 'POST', {
    title: 'Test portfolio project',
    description: 'A private project until published.',
    techStack: ['React', 'PostgreSQL'],
    repositoryUrl: 'https://github.com/example/test-project',
  });
  const projectBody = await projectResponse.json();
  assert.equal(projectResponse.status, 201, JSON.stringify(projectBody));
  const project = projectBody.data.project;
  assert.equal(project.isPublic, false);
  assert.equal('filePath' in project, false);

  const unauthorizedProjectUpdate = await jsonRequest(`/api/portfolio/projects/${project.id}`, 'PATCH', {
    title: 'Unauthorized project change',
  }, otherCookie);
  assert.equal(unauthorizedProjectUpdate.status, 404);

  const imageForm = new FormData();
  imageForm.append('file', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQk4AAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }), 'project.png');
  const screenshotResponse = await fetch(`${baseUrl}/api/portfolio/projects/${project.id}/screenshots`, {
    method: 'POST',
    headers: { cookie: ownerCookie, origin },
    body: imageForm,
  });
  const screenshotBody = await screenshotResponse.json();
  assert.equal(screenshotResponse.status, 201, JSON.stringify(screenshotBody));
  const screenshot = screenshotBody.data.screenshot;
  assert.equal('filePath' in screenshot, false);

  const resumeResponse = await jsonRequest('/api/portfolio/resume', 'GET');
  const resumeBody = await resumeResponse.json();
  assert.equal(resumeResponse.status, 200);
  const resume = resumeBody.data.resume;
  assert.equal('filePath' in resume, false);
  assert.deepEqual(resume.education, [{
    institution: 'Mohan Babu University',
    qualification: 'B.Tech',
    field: 'CSE (DS)',
    details: 'Current standing: 3rd Year · 5th Semester',
  }]);
  const disabledPublicResponse = await fetch(`${baseUrl}/api/public/portfolio/${resume.publicSlug}`);
  assert.equal(disabledPublicResponse.status, 404);

  const resumeForm = new FormData();
  resumeForm.append('file', new Blob(['%PDF-1.4\nTest resume\n%%EOF\n'], { type: 'application/pdf' }), 'test-resume.pdf');
  const resumeUploadResponse = await fetch(`${baseUrl}/api/portfolio/resume/file`, {
    method: 'POST',
    headers: { cookie: ownerCookie, origin },
    body: resumeForm,
  });
  const resumeUploadBody = await resumeUploadResponse.json();
  assert.equal(resumeUploadResponse.status, 200, JSON.stringify(resumeUploadBody));
  assert.equal(resumeUploadBody.data.resume.fileName, 'test-resume.pdf');
  assert.equal('filePath' in resumeUploadBody.data.resume, false);
  const privateResumeDownload = await fetch(`${baseUrl}/api/portfolio/resume/file`, {
    headers: { cookie: ownerCookie, origin },
  });
  assert.equal(privateResumeDownload.status, 200);
  assert.match(privateResumeDownload.headers.get('cache-control'), /private, no-store/);
  assert.match(privateResumeDownload.headers.get('content-disposition'), /attachment/);
  assert.match(await privateResumeDownload.text(), /^%PDF-1\.4/);
  const unauthorizedResumeDownload = await fetch(`${baseUrl}/api/portfolio/resume/file`, {
    headers: { cookie: otherCookie, origin },
  });
  assert.equal(unauthorizedResumeDownload.status, 404);
  const invalidResumeForm = new FormData();
  invalidResumeForm.append('file', new Blob(['not a PDF'], { type: 'application/pdf' }), 'invalid-resume.pdf');
  const invalidResumeUpload = await fetch(`${baseUrl}/api/portfolio/resume/file`, {
    method: 'POST',
    headers: { cookie: ownerCookie, origin },
    body: invalidResumeForm,
  });
  assert.equal(invalidResumeUpload.status, 400);

  const resumeUpdate = await jsonRequest('/api/portfolio/resume', 'PUT', {
    displayName: 'Portfolio Test Student',
    email: 'private@example.com',
    phone: '+1 555 0100',
    summary: 'A selectively shared, test-only professional summary.',
    skills: ['SQL', 'React'],
    education: [{ institution: 'Private University', qualification: 'B.Tech', field: 'Data Science' }],
    internships: [{ organization: 'Private Employer', role: 'Test Intern' }],
    achievements: ['Private achievement'],
    isPublic: true,
    publicSections: ['summary', 'skills'],
  });
  assert.equal(resumeUpdate.status, 200);

  const unpublishedPortfolio = await fetch(`${baseUrl}/api/public/portfolio/${resume.publicSlug}`);
  const unpublishedBody = await unpublishedPortfolio.json();
  assert.equal(unpublishedPortfolio.status, 200, JSON.stringify(unpublishedBody));
  assert.deepEqual(unpublishedBody.data.portfolio.projects, []);
  assert.deepEqual(unpublishedBody.data.portfolio.certificates, []);
  assert.equal(unpublishedBody.data.portfolio.resume.summary, 'A selectively shared, test-only professional summary.');
  assert.deepEqual(unpublishedBody.data.portfolio.resume.skills, ['SQL', 'React']);
  assert.equal(unpublishedBody.data.portfolio.resume.contact, null);
  assert.deepEqual(unpublishedBody.data.portfolio.resume.education, []);
  assert.deepEqual(unpublishedBody.data.portfolio.resume.internships, []);
  assert.deepEqual(unpublishedBody.data.portfolio.resume.achievements, []);
  assert.equal('email' in unpublishedBody.data.portfolio.resume, false);
  assert.equal('fileName' in unpublishedBody.data.portfolio.resume, false);
  assert.equal('fileUrl' in unpublishedBody.data.portfolio.resume, false);

  const publishProjectResponse = await jsonRequest(`/api/portfolio/projects/${project.id}`, 'PATCH', {
    isPublic: true,
    status: 'COMPLETED',
  });
  assert.equal(publishProjectResponse.status, 200);
  const publishedPortfolioResponse = await fetch(`${baseUrl}/api/public/portfolio/${resume.publicSlug}`);
  const publishedPortfolio = await publishedPortfolioResponse.json();
  assert.equal(publishedPortfolioResponse.status, 200);
  assert.equal(publishedPortfolio.data.portfolio.projects.length, 1);
  assert.equal(publishedPortfolio.data.portfolio.projects[0].title, 'Test portfolio project');
  assert.match(publishedPortfolio.data.portfolio.projects[0].screenshots[0].url, /\/public\/portfolio\//);

  const publicScreenshotResponse = await fetch(`${baseUrl}/api${publishedPortfolio.data.portfolio.projects[0].screenshots[0].url}`);
  assert.equal(publicScreenshotResponse.status, 200, await publicScreenshotResponse.clone().text());
  assert.match(publicScreenshotResponse.headers.get('cache-control'), /public/);

  const certificateResponse = await jsonRequest('/api/portfolio/certificates', 'POST', {
    title: 'Private test certificate',
    issuer: 'Test-only issuer',
    issuedAt: '2025-08-09',
  });
  const certificateBody = await certificateResponse.json();
  assert.equal(certificateResponse.status, 201, JSON.stringify(certificateBody));
  const certificate = certificateBody.data.certificate;
  assert.equal(certificate.isPublic, false);
  assert.equal('filePath' in certificate, false);

  const certificateForm = new FormData();
  certificateForm.append('file', new Blob(['%PDF-1.4\nTest certificate\n%%EOF\n'], { type: 'application/pdf' }), 'test-certificate.pdf');
  const certificateUpload = await fetch(`${baseUrl}/api/portfolio/certificates/${certificate.id}/file`, {
    method: 'POST',
    headers: { cookie: ownerCookie, origin },
    body: certificateForm,
  });
  assert.equal(certificateUpload.status, 200);
  const privateCertificateDownload = await fetch(`${baseUrl}/api/portfolio/certificates/${certificate.id}/file`, {
    headers: { cookie: otherCookie, origin },
  });
  assert.equal(privateCertificateDownload.status, 404);
  const privateCertificateList = await fetch(`${baseUrl}/api/portfolio/certificates`, {
    headers: { cookie: otherCookie, origin },
  });
  assert.deepEqual((await privateCertificateList.json()).data.certificates, []);

  const careerApplication = await jsonRequest('/api/portfolio/career/applications', 'POST', {
    companyName: 'Private Example Company',
    role: 'Data Science Intern',
    appliedAt: '2025-08-09',
    status: 'SAVED',
  });
  const applicationBody = await careerApplication.json();
  assert.equal(careerApplication.status, 201, JSON.stringify(applicationBody));
  const applicationId = applicationBody.data.application.id;
  const careerUpdate = await jsonRequest(`/api/portfolio/career/applications/${applicationId}`, 'PATCH', { status: 'INTERVIEW' });
  assert.equal(careerUpdate.status, 200);
  assert.equal((await careerUpdate.json()).data.application.status, 'INTERVIEW');
  const careerResource = await jsonRequest('/api/portfolio/career/resources', 'POST', {
    title: 'Private interview notes',
    type: 'INTERVIEW_PREPARATION',
    notes: 'Private test-only notes.',
  });
  const resourceBody = await careerResource.json();
  assert.equal(careerResource.status, 201);
  const privateCareerList = await fetch(`${baseUrl}/api/portfolio/career`, {
    headers: { cookie: otherCookie, origin },
  });
  const privateCareerData = (await privateCareerList.json()).data.career;
  assert.deepEqual(privateCareerData.applications, []);
  assert.deepEqual(privateCareerData.resources, []);
  assert.equal(JSON.stringify(publishedPortfolio.data.portfolio).includes('Private Example Company'), false);

  const foreignApplicationUpdate = await jsonRequest(`/api/portfolio/career/applications/${applicationId}`, 'PATCH', { status: 'OFFER' }, otherCookie);
  assert.equal(foreignApplicationUpdate.status, 404);
  const foreignCertificateDelete = await fetch(`${baseUrl}/api/portfolio/certificates/${certificate.id}`, {
    method: 'DELETE',
    headers: { cookie: otherCookie, origin },
  });
  assert.equal(foreignCertificateDelete.status, 404);

  const certificatePublish = await jsonRequest(`/api/portfolio/certificates/${certificate.id}`, 'PATCH', { isPublic: true });
  assert.equal(certificatePublish.status, 200);
  const visibleCertificateResponse = await fetch(`${baseUrl}/api/public/portfolio/${resume.publicSlug}`);
  const visibleCertificate = (await visibleCertificateResponse.json()).data.portfolio.certificates[0];
  assert.equal(visibleCertificate.title, 'Private test certificate');
  assert.ok(visibleCertificate.fileUrl);
  const publicCertificateFile = await fetch(`${baseUrl}/api${visibleCertificate.fileUrl}`);
  assert.equal(publicCertificateFile.status, 200);
  assert.equal(publicCertificateFile.headers.get('content-type'), 'application/pdf');

  const resumePrivate = await jsonRequest('/api/portfolio/resume', 'PUT', { isPublic: false });
  assert.equal(resumePrivate.status, 200);
  const hiddenPortfolio = await fetch(`${baseUrl}/api/public/portfolio/${resume.publicSlug}`);
  assert.equal(hiddenPortfolio.status, 404);

  assert.equal((await jsonRequest(`/api/portfolio/career/resources/${resourceBody.data.resource.id}`, 'DELETE')).status, 200);
  assert.equal((await jsonRequest(`/api/portfolio/career/applications/${applicationId}`, 'DELETE')).status, 200);
  assert.equal((await jsonRequest(`/api/portfolio/certificates/${certificate.id}`, 'DELETE')).status, 200);
  assert.equal((await jsonRequest(`/api/portfolio/projects/${project.id}`, 'DELETE')).status, 200);
  const deletedProjectScreenshot = await fetch(`${baseUrl}/api/portfolio/projects/${project.id}/screenshots/${screenshot.id}`, {
    headers: { cookie: ownerCookie, origin },
  });
  assert.equal(deletedProjectScreenshot.status, 404);
});

test('library catalog, administrator circulation, student history, and inventory safeguards work', async () => {
  const admin = await prisma.user.create({
    data: {
      name: 'Library Test Administrator',
      email: `${randomUUID()}@example.com`,
      passwordHash: await bcrypt.hash('unused-library-admin-test', 4),
      role: UserRole.ADMIN,
    },
  });
  const student = await prisma.user.create({
    data: {
      name: 'Library Test Student',
      email: `${randomUUID()}@example.com`,
      passwordHash: await bcrypt.hash('unused-library-student-test', 4),
      role: UserRole.STUDENT,
      studentProfile: { create: { studentId: `LIB-${randomUUID().slice(0, 20)}`, department: 'CSE (Data Science)' } },
    },
  });
  const otherStudent = await prisma.user.create({
    data: {
      name: 'Second Library Test Student',
      email: `${randomUUID()}@example.com`,
      passwordHash: await bcrypt.hash('unused-library-other-test', 4),
      role: UserRole.STUDENT,
      studentProfile: { create: {} },
    },
  });
  createdUserIds.push(admin.id, student.id, otherStudent.id);
  const adminCookie = `mbu_session=${jwt.sign({ id: admin.id, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' })}`;
  const ownerCookie = `mbu_session=${jwt.sign({ id: student.id, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' })}`;
  const otherCookie = `mbu_session=${jwt.sign({ id: otherStudent.id, tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' })}`;
  const bookIds = [];
  const categoryIds = [];
  const issueIds = [];
  const request = (url, method, body, cookie = adminCookie) => fetch(`${baseUrl}${url}`, {
    method,
    headers: { 'content-type': 'application/json', cookie, origin },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  try {
    const nonAdminBookCreate = await request('/api/library/admin/books', 'POST', {
      title: 'Forbidden book',
      author: 'Test Author',
      totalCopies: 1,
    }, ownerCookie);
    assert.equal(nonAdminBookCreate.status, 403);

    const categoryResponse = await request('/api/library/admin/categories', 'POST', {
      name: `Test ${randomUUID().slice(0, 8)} Category`,
      description: 'Temporary category used only for test validation.',
    });
    const categoryBody = await categoryResponse.json();
    assert.equal(categoryResponse.status, 201, JSON.stringify(categoryBody));
    const categoryId = categoryBody.data.category.id;
    categoryIds.push(categoryId);
    const categoryUpdate = await request(`/api/library/admin/categories/${categoryId}`, 'PATCH', {
      name: `Updated ${categoryBody.data.category.name}`,
      description: 'Updated test category description.',
    });
    assert.equal(categoryUpdate.status, 200);
    assert.equal((await categoryUpdate.json()).data.category.description, 'Updated test category description.');

    const invalidCategoryBook = await request('/api/library/admin/books', 'POST', {
      title: 'Category validation test',
      author: 'Test Author',
      totalCopies: 1,
      categoryIds: [randomUUID()],
    });
    assert.equal(invalidCategoryBook.status, 400);

    const bookResponse = await request('/api/library/admin/books', 'POST', {
      title: 'Transactional Inventory Test Book',
      author: 'Test Author',
      isbn: `ISBN-${randomUUID().slice(0, 20)}`,
      department: 'CSE (Data Science)',
      totalCopies: 1,
      categoryIds: [categoryId],
    });
    const bookBody = await bookResponse.json();
    assert.equal(bookResponse.status, 201, JSON.stringify(bookBody));
    const book = bookBody.data.book;
    bookIds.push(book.id);
    assert.equal(book.availableCopies, 1);
    assert.equal(book.categories[0].id, categoryId);

    const studentCatalog = await request('/api/library/books', 'GET', undefined, ownerCookie);
    const catalogBody = await studentCatalog.json();
    assert.equal(studentCatalog.status, 200);
    assert.ok(catalogBody.data.books.some((candidate) => candidate.id === book.id));
    assert.equal(catalogBody.data.pagination.pageSize, 12);
    const departmentResponse = await fetch(`${baseUrl}/api/library/departments`, { headers: { cookie: ownerCookie, origin } });
    assert.ok((await departmentResponse.json()).data.departments.includes('CSE (Data Science)'));

    const searchByIsbn = await fetch(`${baseUrl}/api/library/books?search=${encodeURIComponent(book.isbn)}&department=CSE%20(Data%20Science)&categoryId=${categoryId}&page=1&pageSize=1`, {
      headers: { cookie: ownerCookie, origin },
    });
    assert.equal((await searchByIsbn.json()).data.pagination.total, 1);

    const invalidPage = await fetch(`${baseUrl}/api/library/books?page=0`, { headers: { cookie: ownerCookie, origin } });
    assert.equal(invalidPage.status, 400);
    const oversizedPage = await fetch(`${baseUrl}/api/library/books?pageSize=51`, { headers: { cookie: ownerCookie, origin } });
    assert.equal(oversizedPage.status, 400);

    const unauthorizedIssue = await request('/api/library/admin/issues', 'POST', {
      userId: student.id,
      bookId: book.id,
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    }, ownerCookie);
    assert.equal(unauthorizedIssue.status, 403);

    const invalidDue = await request('/api/library/admin/issues', 'POST', {
      userId: student.id,
      bookId: book.id,
      issuedAt: '2026-10-10T00:00:00.000Z',
      dueAt: '2026-10-09T00:00:00.000Z',
    });
    assert.equal(invalidDue.status, 400);

    const issueResponse = await request('/api/library/admin/issues', 'POST', {
      userId: student.id,
      bookId: book.id,
      issuedAt: '2026-10-01T00:00:00.000Z',
      dueAt: '2026-10-02T00:00:00.000Z',
    });
    const issueBody = await issueResponse.json();
    assert.equal(issueResponse.status, 201, JSON.stringify(issueBody));
    const issue = issueBody.data.issue;
    issueIds.push(issue.id);
    assert.equal(issue.status, 'ACTIVE');
    assert.equal(issue.isOverdue, true);
    assert.ok(issue.overdueDays > 0);

    const inventoryAfterIssue = await prisma.book.findUnique({ where: { id: book.id } });
    assert.equal(inventoryAfterIssue.availableCopies, 0);

    const duplicateIssue = await request('/api/library/admin/issues', 'POST', {
      userId: student.id,
      bookId: book.id,
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    });
    assert.equal(duplicateIssue.status, 409);

    const noCopiesIssue = await request('/api/library/admin/issues', 'POST', {
      userId: otherStudent.id,
      bookId: book.id,
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    });
    assert.equal(noCopiesIssue.status, 409);
    assert.equal((await prisma.book.findUnique({ where: { id: book.id } })).availableCopies, 0);

    const tooFewCopies = await request(`/api/library/admin/books/${book.id}`, 'PATCH', { totalCopies: 0 });
    assert.equal(tooFewCopies.status, 409);

    const adminReturnAttempt = await request(`/api/library/admin/issues/${issue.id}/return`, 'POST', { returnedAt: '2026-09-30T00:00:00.000Z' });
    assert.equal(adminReturnAttempt.status, 400);
    assert.equal((await prisma.issue.findUnique({ where: { id: issue.id } })).status, 'ACTIVE');

    const ownHistory = await fetch(`${baseUrl}/api/library/my/issues?page=1&pageSize=5`, { headers: { cookie: ownerCookie, origin } });
    const ownHistoryBody = await ownHistory.json();
    assert.equal(ownHistory.status, 200);
    assert.equal(ownHistoryBody.data.issues.length, 1);
    assert.equal(ownHistoryBody.data.issues[0].userId, student.id);

    const otherHistory = await fetch(`${baseUrl}/api/library/my/issues`, { headers: { cookie: otherCookie, origin } });
    assert.deepEqual((await otherHistory.json()).data.issues, []);

    const returnResponse = await request(`/api/library/admin/issues/${issue.id}/return`, 'POST', {
      returnedAt: '2026-10-04T00:00:00.000Z',
      condition: 'Good',
    });
    const returnBody = await returnResponse.json();
    assert.equal(returnResponse.status, 200, JSON.stringify(returnBody));
    assert.equal(returnBody.data.issue.status, 'RETURNED');
    assert.equal(returnBody.data.issue.overdueDays, 2);
    assert.equal((await prisma.book.findUnique({ where: { id: book.id } })).availableCopies, 1);

    const secondReturn = await request(`/api/library/admin/issues/${issue.id}/return`, 'POST', {});
    assert.equal(secondReturn.status, 409);
    assert.equal(await prisma.returnRecord.count({ where: { issueId: issue.id } }), 1);

    const reissue = await request('/api/library/admin/issues', 'POST', {
      userId: student.id,
      bookId: book.id,
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    });
    const reissueBody = await reissue.json();
    assert.equal(reissue.status, 201, JSON.stringify(reissueBody));
    issueIds.push(reissueBody.data.issue.id);
    assert.equal((await prisma.book.findUnique({ where: { id: book.id } })).availableCopies, 0);

    const deactivated = await request(`/api/library/admin/books/${book.id}/active`, 'PATCH', { isActive: false });
    assert.equal(deactivated.status, 200);
    assert.equal((await deactivated.json()).data.book.isActive, false);
    const hiddenInactive = await fetch(`${baseUrl}/api/library/books`, { headers: { cookie: ownerCookie, origin } });
    const studentActiveBooks = (await hiddenInactive.json()).data.books;
    assert.equal(studentActiveBooks.some((candidate) => candidate.id === book.id), false);
    assert.ok(studentActiveBooks.every((candidate) => candidate.isActive));
    const adminInactive = await fetch(`${baseUrl}/api/library/books?includeInactive=true`, { headers: { cookie: adminCookie, origin } });
    assert.equal((await adminInactive.json()).data.books.find((candidate) => candidate.id === book.id).isActive, false);

    const historyDelete = await request(`/api/library/admin/books/${book.id}`, 'DELETE');
    assert.equal(historyDelete.status, 409);
    const reports = await fetch(`${baseUrl}/api/library/admin/reports`, { headers: { cookie: adminCookie, origin } });
    const report = (await reports.json()).data.report;
    assert.ok(report.bookCount >= 1);
    assert.ok(report.overdueIssues >= 0);

    const studentAdminAccess = await fetch(`${baseUrl}/api/library/admin/reports`, { headers: { cookie: ownerCookie, origin } });
    assert.equal(studentAdminAccess.status, 403);
  } finally {
    const testIssueWhere = { OR: [{ id: { in: issueIds } }, { bookId: { in: bookIds } }, { userId: { in: [admin.id, student.id, otherStudent.id] } }] };
    const relatedIssues = await prisma.issue.findMany({ where: testIssueWhere, select: { id: true } });
    const relatedIssueIds = relatedIssues.map(({ id }) => id);
    await prisma.returnRecord.deleteMany({ where: { issueId: { in: relatedIssueIds } } });
    await prisma.issue.deleteMany({ where: { id: { in: relatedIssueIds } } });
    await prisma.book.deleteMany({ where: { id: { in: bookIds } } });
    await prisma.category.deleteMany({ where: { id: { in: categoryIds } } });
    await prisma.user.deleteMany({ where: { id: { in: [admin.id, student.id, otherStudent.id] } } });
    for (const id of [admin.id, student.id, otherStudent.id]) {
      const index = createdUserIds.indexOf(id);
      if (index !== -1) createdUserIds.splice(index, 1);
    }
  }
});
