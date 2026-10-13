const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.ACADEMIC_RESOURCE_STORAGE_PROVIDER = 'supabase';
process.env.SUPABASE_URL = 'https://project-ref.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-service-role-key';
process.env.SUPABASE_STORAGE_BUCKET = 'academic-files';

const supabaseSdk = require('@supabase/supabase-js');
const calls = [];
const file = Buffer.from('%PDF-1.4\nprivate test file\n%%EOF\n');

supabaseSdk.createClient = (url, key, options) => {
  assert.equal(url, process.env.SUPABASE_URL);
  assert.equal(key, process.env.SUPABASE_SERVICE_ROLE_KEY);
  assert.deepEqual(options.auth, {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  });
  return {
    storage: {
      from(bucket) {
        assert.equal(bucket, 'academic-files');
        return {
          async upload(keyPath, buffer, uploadOptions) {
            calls.push({ operation: 'upload', keyPath, buffer, uploadOptions });
            return { error: null };
          },
          async download(keyPath) {
            calls.push({ operation: 'download', keyPath });
            return { data: new Blob([file]), error: null };
          },
          async remove(keyPaths) {
            calls.push({ operation: 'remove', keyPaths });
            return { error: null };
          },
        };
      },
    },
  };
};

const privateFileStorage = require('../src/services/privateFileStorage');

async function readStream(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

test('Supabase stores, privately downloads, and removes existing object keys', async () => {
  const key = 'catalog/00000000-0000-4000-8000-000000000001.pdf';

  await privateFileStorage.store('', key, file, 'application/pdf');
  await privateFileStorage.store('', key, file, 'application/pdf', { overwrite: true });
  assert.deepEqual(await readStream(await privateFileStorage.open('', key)), file);
  await privateFileStorage.remove('', key);

  assert.deepEqual(calls, [
    {
      operation: 'upload',
      keyPath: key,
      buffer: file,
      uploadOptions: { contentType: 'application/pdf', upsert: false },
    },
    {
      operation: 'upload',
      keyPath: key,
      buffer: file,
      uploadOptions: { contentType: 'application/pdf', upsert: true },
    },
    { operation: 'download', keyPath: key },
    { operation: 'remove', keyPaths: [key] },
  ]);
  calls.length = 0;
});

test('Supabase accepts private resume object keys', async () => {
  const key = '00000000-0000-4000-8000-000000000001/resumes/00000000-0000-4000-8000-000000000002.pdf';
  await privateFileStorage.store('', key, file, 'application/pdf');
  assert.deepEqual(await readStream(await privateFileStorage.open('', key)), file);
  await privateFileStorage.remove('', key);
  assert.deepEqual(calls.map(({ operation, keyPath, keyPaths }) => ({
    operation,
    keyPath,
    keyPaths,
  })), [
    { operation: 'upload', keyPath: key, keyPaths: undefined },
    { operation: 'download', keyPath: key, keyPaths: undefined },
    { operation: 'remove', keyPath: undefined, keyPaths: [key] },
  ]);
  calls.length = 0;
});

test('Supabase accepts private Data Science originals and converted reader PDFs', async () => {
  const moduleId = '00000000-0000-4000-8000-000000000011';
  const materialId = '00000000-0000-4000-8000-000000000012';
  const originalKey = `data-science/${moduleId}/${materialId}.pptx`;
  const readerKey = `data-science/${moduleId}/${materialId}.reader.pdf`;

  await privateFileStorage.store('', originalKey, file, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  await privateFileStorage.store('', readerKey, file, 'application/pdf');
  assert.deepEqual(await readStream(await privateFileStorage.open('', originalKey)), file);
  assert.deepEqual(await readStream(await privateFileStorage.open('', readerKey)), file);
  await privateFileStorage.remove('', originalKey);
  await privateFileStorage.remove('', readerKey);
  assert.equal(calls.length, 6);
  calls.length = 0;
});

test('Supabase adapter rejects invalid object keys before storage access', async () => {
  await assert.rejects(
    privateFileStorage.open('', '../outside.pdf'),
    { statusCode: 404 },
  );
  assert.equal(calls.length, 0);
});
