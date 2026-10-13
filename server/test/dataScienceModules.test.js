const { after, test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync } = require('node:fs');
const { readFile, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const storageDir = mkdtempSync(path.join(os.tmpdir(), 'mbu-data-science-test-'));

process.env.NODE_ENV = 'test';
process.env.ACADEMIC_RESOURCE_STORAGE_PROVIDER = 'local';
process.env.ACADEMIC_RESOURCE_STORAGE_DIR = storageDir;
process.env.LIBREOFFICE_PATH = path.join(os.tmpdir(), 'mbu-test-no-libreoffice');
process.env.DATABASE_URL = 'postgresql://localhost/digital_library_test';
process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-thirty-two-characters';

const { prisma } = require('../src/config/prisma');
const dataScienceService = require('../src/services/dataScienceService');
const privateFileStorage = require('../src/services/privateFileStorage');

const ownerId = '00000000-0000-4000-8000-000000000091';
const otherOwnerId = '00000000-0000-4000-8000-000000000092';
const moduleId = '00000000-0000-4000-8000-000000000093';
const storedMaterials = new Map();

const originalModuleFindFirst = prisma.dataScienceModule.findFirst;
const originalModuleFindMany = prisma.dataScienceModule.findMany;
const originalModuleCreateMany = prisma.dataScienceModule.createMany;
const originalUserUpdateMany = prisma.user.updateMany;
const originalTransaction = prisma.$transaction;
const originalMaterialCreate = prisma.dataScienceMaterial.create;
const originalMaterialFindFirst = prisma.dataScienceMaterial.findFirst;

let modules = [];
let modulesInitialized = false;

async function readStream(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function uploadFile(filename, buffer) {
  return dataScienceService.uploadMaterial(ownerId, moduleId, 'Uploaded study resource', {
    originalname: filename,
    buffer,
    size: buffer.length,
    mimetype: 'application/octet-stream',
  });
}

after(async () => {
  prisma.dataScienceModule.findFirst = originalModuleFindFirst;
  prisma.dataScienceModule.findMany = originalModuleFindMany;
  prisma.dataScienceModule.createMany = originalModuleCreateMany;
  prisma.user.updateMany = originalUserUpdateMany;
  prisma.$transaction = originalTransaction;
  prisma.dataScienceMaterial.create = originalMaterialCreate;
  prisma.dataScienceMaterial.findFirst = originalMaterialFindFirst;
  await rm(storageDir, { recursive: true, force: true });
});

test('creates the first three empty modules once and does not recreate modules after deletion', async () => {
  modules = [];
  modulesInitialized = false;
  prisma.$transaction = async (callback) => callback(prisma);
  prisma.user.updateMany = async ({ where }) => {
    if (where.dataScienceModulesInitialized === false && !modulesInitialized) {
      modulesInitialized = true;
      return { count: 1 };
    }
    return { count: 0 };
  };
  prisma.dataScienceModule.findMany = async () => modules;
  prisma.dataScienceModule.createMany = async ({ data }) => {
    modules = data.map((item, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 101).padStart(12, '0')}`,
      ...item,
      createdAt: new Date('2026-10-13T10:00:00.000Z'),
      updatedAt: new Date('2026-10-13T10:00:00.000Z'),
      materials: [],
    }));
    return { count: modules.length };
  };

  const firstVisit = await dataScienceService.listModules(ownerId);
  assert.deepEqual(firstVisit.map(({ title }) => title), ['Module 01', 'Module 02', 'Module 03']);
  assert.ok(firstVisit.every(({ materials }) => materials.length === 0));

  modules = [];
  assert.deepEqual(await dataScienceService.listModules(ownerId), []);
});

test('uploads and opens an actual PDF using private storage', async () => {
  prisma.dataScienceModule.findFirst = async ({ where }) => (
    where.ownerId === ownerId && where.id === moduleId ? { id: moduleId } : null
  );
  prisma.dataScienceMaterial.create = async ({ data }) => {
    const material = { ...data, createdAt: new Date('2026-10-13T10:00:00.000Z') };
    storedMaterials.set(data.id, material);
    return material;
  };
  prisma.dataScienceMaterial.findFirst = async ({ where }) => {
    const material = storedMaterials.get(where.id);
    return material && material.ownerId === where.ownerId && material.moduleId === where.moduleId
      ? material
      : null;
  };

  const source = await readFile(path.resolve(__dirname, '../content/resources/ds101-study-notes.pdf'));
  const result = await uploadFile('data-analysis-notes.pdf', source);
  assert.equal(result.fileType, 'PDF');
  assert.equal(result.originalFileName, 'data-analysis-notes.pdf');
  assert.equal(result.canRead, true);

  const preview = await dataScienceService.getMaterialFile(ownerId, moduleId, result.id, true);
  assert.equal(preview.mimeType, 'application/pdf');
  assert.deepEqual(await readStream(preview.stream), source);
});

test('keeps an actual PPTX download available and reports missing conversion clearly', async () => {
  const source = await readFile(path.resolve(__dirname, '../content/resources/data-science-workflow.pptx'));
  const result = await uploadFile('data-science-workflow.pptx', source);
  assert.equal(result.fileType, 'PPTX');
  assert.equal(result.canRead, false);
  assert.match(result.previewError, /LibreOffice/);

  const original = await dataScienceService.getMaterialFile(ownerId, moduleId, result.id);
  assert.equal(original.mimeType, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  assert.deepEqual(await readStream(original.stream), source);
  await assert.rejects(
    dataScienceService.getMaterialFile(ownerId, moduleId, result.id, true),
    { statusCode: 415 },
  );
});

test('rejects invalid file contents and material access outside the owner account', async () => {
  await assert.rejects(
    uploadFile('notes.pdf', Buffer.from('not a pdf')),
    { statusCode: 400 },
  );

  const material = [...storedMaterials.values()].find(({ fileType }) => fileType === 'PDF');
  assert.ok(material);
  await assert.rejects(
    dataScienceService.getMaterialFile(otherOwnerId, moduleId, material.id),
    { statusCode: 404 },
  );

  prisma.dataScienceModule.findFirst = async () => null;
  await assert.rejects(
    uploadFile('notes.txt', Buffer.from('private')),
    { statusCode: 404 },
  );
});
