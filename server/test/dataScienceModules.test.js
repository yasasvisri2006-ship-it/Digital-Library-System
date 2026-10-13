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
const originalMaterialCreate = prisma.dataScienceMaterial.create;
const originalMaterialFindFirst = prisma.dataScienceMaterial.findFirst;

let modules = [];

async function readStream(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function uploadFile(filename, buffer, isPublished = false) {
  return dataScienceService.uploadMaterial(ownerId, moduleId, 'Uploaded study resource', {
    originalname: filename,
    buffer,
    size: buffer.length,
    mimetype: 'application/octet-stream',
  }, isPublished);
}

after(async () => {
  prisma.dataScienceModule.findFirst = originalModuleFindFirst;
  prisma.dataScienceModule.findMany = originalModuleFindMany;
  prisma.dataScienceMaterial.create = originalMaterialCreate;
  prisma.dataScienceMaterial.findFirst = originalMaterialFindFirst;
  await rm(storageDir, { recursive: true, force: true });
});

test('reads the existing five modules without creating a duplicate set', async () => {
  modules = Array.from({ length: 5 }, (_, index) => ({
    id: index === 0 ? moduleId : `00000000-0000-4000-8000-${String(index + 93).padStart(12, '0')}`,
    ownerId,
    number: index + 1,
    title: `Module ${String(index + 1).padStart(2, '0')}`,
    isPublic: true,
    materials: [],
  }));
  prisma.dataScienceModule.findMany = async ({ where }) => modules.filter((module) => module.ownerId === where.ownerId);

  const result = await dataScienceService.listModules(ownerId);
  assert.deepEqual(result.map(({ title }) => title), [
    'Module 01', 'Module 02', 'Module 03', 'Module 04', 'Module 05',
  ]);
  assert.equal(modules.length, 5);
});

test('lists only published materials publicly and shows private materials to their owner', async () => {
  const published = {
    id: '00000000-0000-4000-8000-000000000095',
    moduleId,
    ownerId,
    title: 'Published PDF',
    originalFileName: 'published.pdf',
    fileType: 'PDF',
    mimeType: 'application/pdf',
    fileSize: 10,
    filePath: 'data-science/module/published.pdf',
    readerFilePath: null,
    readerError: null,
    isPublished: true,
    createdAt: new Date('2026-10-13T10:00:00.000Z'),
  };
  const unpublished = { ...published, id: '00000000-0000-4000-8000-000000000096', isPublished: false };
  prisma.dataScienceModule.findMany = async () => [{
    id: moduleId,
    ownerId,
    number: 1,
    title: 'Module 01',
    isPublic: true,
    owner: { role: 'STUDENT' },
    materials: [published, unpublished],
  }];

  const anonymous = await dataScienceService.listPublicModules();
  assert.equal(anonymous.length, 1);
  assert.deepEqual(anonymous[0].materials.map(({ id }) => id), [published.id]);
  assert.equal(anonymous[0].canManage, false);

  const owner = await dataScienceService.listPublicModules(ownerId);
  assert.equal(owner[0].canManage, true);
  assert.equal(owner[0].materials.length, 2);
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
    if (where.isPublished && where.module?.isPublic) {
      return material?.isPublished ? material : null;
    }
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

  const published = await uploadFile('published-notes.pdf', source, true);
  const publicPreview = await dataScienceService.getPublicMaterialFile(moduleId, published.id, true);
  assert.deepEqual(await readStream(publicPreview.stream), source);
  await assert.rejects(
    dataScienceService.getPublicMaterialFile(moduleId, result.id, true),
    { statusCode: 404 },
  );
});

test('keeps an actual PPTX download available and reports missing conversion clearly', async () => {
  const source = await readFile(path.resolve(__dirname, '../content/resources/data-science-workflow.pptx'));
  const result = await uploadFile('data-science-workflow.pptx', source, true);
  assert.equal(result.fileType, 'PPTX');
  assert.equal(result.canRead, false);
  assert.match(result.previewError, /LibreOffice/);

  const original = await dataScienceService.getMaterialFile(ownerId, moduleId, result.id);
  assert.equal(original.mimeType, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  assert.deepEqual(await readStream(original.stream), source);
  const publicOriginal = await dataScienceService.getPublicMaterialFile(moduleId, result.id);
  assert.deepEqual(await readStream(publicOriginal.stream), source);
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
