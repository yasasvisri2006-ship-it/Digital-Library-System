const { randomUUID } = require('node:crypto');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const assert = require('node:assert/strict');

const storageDir = mkdtempSync(path.join(tmpdir(), 'digital-library-private-files-'));
process.env.NODE_ENV = 'test';
process.env.ACADEMIC_RESOURCE_STORAGE_PROVIDER = 'local';
process.env.ACADEMIC_RESOURCE_STORAGE_DIR = storageDir;
process.env.PORTFOLIO_STORAGE_DIR = storageDir;

const privateFileStorage = require('../src/services/privateFileStorage');

async function readStream(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

test('private storage stores, opens, and removes academic and portfolio object keys', async () => {
  const pdf = Buffer.from('%PDF-1.4\nprivate test file\n%%EOF\n');
  const imageKey = `${randomUUID()}/projects/${randomUUID()}.png`;
  const pdfKey = `${randomUUID()}.pdf`;

  try {
    await privateFileStorage.store(storageDir, pdfKey, pdf, 'application/pdf');
    await privateFileStorage.store(storageDir, imageKey, pdf, 'image/png');

    assert.deepEqual(await readStream(await privateFileStorage.open(storageDir, pdfKey)), pdf);
    assert.deepEqual(await readStream(await privateFileStorage.open(storageDir, imageKey)), pdf);

    await privateFileStorage.remove(storageDir, pdfKey);
    await privateFileStorage.remove(storageDir, imageKey);
    await assert.rejects(privateFileStorage.open(storageDir, pdfKey), { statusCode: 404 });
    await assert.rejects(privateFileStorage.open(storageDir, imageKey), { statusCode: 404 });
    await assert.rejects(privateFileStorage.open(storageDir, '..\\outside.pdf'), { statusCode: 404 });
  } finally {
    rmSync(storageDir, { recursive: true, force: true });
  }
});
