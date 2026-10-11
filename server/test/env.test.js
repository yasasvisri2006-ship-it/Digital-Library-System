const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const serverRoot = path.resolve(__dirname, '..');
const baseEnv = {
  ...process.env,
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/library',
  JWT_SECRET: 'test-only-secret-that-is-at-least-thirty-two-characters',
  PORTFOLIO_STORAGE_DIR: path.join(serverRoot, 'storage', 'portfolio'),
};

function loadEnv(overrides) {
  return execFileSync(process.execPath, ['-e', "require('./src/config/env')"], {
    cwd: serverRoot,
    env: { ...baseEnv, ...overrides },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

test('production rejects local academic resource storage', () => {
  assert.throws(
    () => loadEnv({ ACADEMIC_RESOURCE_STORAGE_PROVIDER: 'local' }),
    (error) => error.stderr.includes('ACADEMIC_RESOURCE_STORAGE_PROVIDER=r2 or supabase in production'),
  );
});

test('R2 provider requires all credentials and bucket settings', () => {
  assert.throws(
    () => loadEnv({ ACADEMIC_RESOURCE_STORAGE_PROVIDER: 'r2' }),
    (error) => error.stderr.includes('R2 storage requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET'),
  );
});

test('production R2 configuration remains supported without local storage directories', () => {
  assert.equal(loadEnv({
    ACADEMIC_RESOURCE_STORAGE_PROVIDER: 'r2',
    ACADEMIC_RESOURCE_STORAGE_DIR: '',
    PORTFOLIO_STORAGE_DIR: '',
    R2_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
    R2_ACCESS_KEY_ID: 'test-access-key',
    R2_SECRET_ACCESS_KEY: 'test-secret-key',
    R2_BUCKET: 'private-files',
  }), '');
});

test('Supabase provider requires HTTPS URL, service-role key, and bucket', () => {
  assert.throws(
    () => loadEnv({ ACADEMIC_RESOURCE_STORAGE_PROVIDER: 'supabase' }),
    (error) => error.stderr.includes('Supabase storage requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET'),
  );
  assert.throws(
    () => loadEnv({
      ACADEMIC_RESOURCE_STORAGE_PROVIDER: 'supabase',
      SUPABASE_URL: 'http://project-ref.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      SUPABASE_STORAGE_BUCKET: 'academic-files',
    }),
    (error) => error.stderr.includes('SUPABASE_URL must use HTTPS'),
  );
});

test('production Supabase configuration starts without local storage directories', () => {
  assert.equal(loadEnv({
    ACADEMIC_RESOURCE_STORAGE_PROVIDER: 'supabase',
    ACADEMIC_RESOURCE_STORAGE_DIR: '',
    PORTFOLIO_STORAGE_DIR: '',
    SUPABASE_URL: 'https://project-ref.supabase.co/',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    SUPABASE_STORAGE_BUCKET: 'academic-files',
  }), '');
});
