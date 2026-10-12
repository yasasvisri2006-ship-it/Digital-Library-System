const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

test('production session cookies support cross-site frontend requests securely', () => {
  const serverRoot = path.resolve(__dirname, '..');
  const output = execFileSync(process.execPath, ['-e', `
    const { setSessionCookie } = require('./src/utils/sessionCookie');
    setSessionCookie({
      cookie: (_name, _token, options) => console.log(JSON.stringify({
        httpOnly: options.httpOnly,
        secure: options.secure,
        sameSite: options.sameSite,
        path: options.path,
      })),
    }, 'test-session');
  `], {
    cwd: serverRoot,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://localhost/digital_library_test',
      JWT_SECRET: 'session-cookie-test-secret-at-least-thirty-two-characters',
      ACADEMIC_RESOURCE_STORAGE_PROVIDER: 'supabase',
      SUPABASE_URL: 'https://project-ref.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-only-storage-key',
      SUPABASE_STORAGE_BUCKET: 'private-files',
    },
    encoding: 'utf8',
  });
  const options = JSON.parse(output);

  assert.deepEqual(options, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/api',
  });
});
