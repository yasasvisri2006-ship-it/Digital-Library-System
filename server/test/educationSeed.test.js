const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/digital_library_test';
process.env.JWT_SECRET = 'education-seed-test-secret-with-at-least-thirty-two-characters';
process.env.ACADEMIC_RESOURCE_STORAGE_PROVIDER = 'local';

const { records } = require('../src/data/educationalMaterials');
const { prisma } = require('../src/config/prisma');
const privateFileStorage = require('../src/services/privateFileStorage');
const { seedCatalog } = require('../src/services/educationalMaterialService');

test('education seed is repeatable and upserts stable slugs without duplicates', async () => {
  const seededRows = new Map();
  let uploadCount = 0;
  const originalUpsert = prisma.educationalMaterial.upsert;
  const originalStore = privateFileStorage.store;
  prisma.educationalMaterial.upsert = async ({ where, create, update }) => {
    const record = seededRows.get(where.slug);
    seededRows.set(where.slug, record ? { ...record, ...update } : create);
    return seededRows.get(where.slug);
  };
  privateFileStorage.store = async () => {
    uploadCount += 1;
  };

  try {
    assert.equal(await seedCatalog(), records.length);
    assert.equal(seededRows.size, records.length);
    assert.equal(uploadCount, records.filter(({ localPath }) => localPath).length);

    assert.equal(await seedCatalog(), records.length);
    assert.equal(seededRows.size, records.length);
    assert.equal(uploadCount, records.filter(({ localPath }) => localPath).length * 2);
  } finally {
    prisma.educationalMaterial.upsert = originalUpsert;
    privateFileStorage.store = originalStore;
  }
});
