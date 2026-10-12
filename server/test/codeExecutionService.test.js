const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { ApiError } = require('../src/utils/ApiError');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://localhost/digital_library_test';
process.env.JWT_SECRET = 'code-execution-tests-secret-at-least-thirty-two-chars';
process.env.JUDGE0_URL = 'https://judge0.example.test';
process.env.JUDGE0_API_KEY = 'test-only-judge0-key';
process.env.JUDGE0_PYTHON_LANGUAGE_ID = '109';

const codeExecutionService = require('../src/services/codeExecutionService');
const { codeExecutionSchema } = require('../src/validators/learningValidators');
const originalFetch = global.fetch;

after(() => {
  global.fetch = originalFetch;
});

function judgeResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('submits Python with sandbox limits and returns real program output', async () => {
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (calls.length === 1) return judgeResponse({ token: 'submission-token-1' });
    return judgeResponse({
      stdout: 'Hello Yasasvisai\n',
      stderr: '',
      compile_output: null,
      message: null,
      exit_code: 0,
      status: { id: 3, description: 'Accepted' },
      time: '0.02',
      memory: 4096,
    });
  };

  const result = await codeExecutionService.executePython('print("Hello Yasasvisai")');

  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://judge0.example.test/submissions?base64_encoded=false&wait=false');
  assert.equal(calls[0].options.headers['X-Auth-Token'], 'test-only-judge0-key');
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    source_code: 'print("Hello Yasasvisai")',
    language_id: 109,
    cpu_time_limit: 2,
    cpu_extra_time: 1,
    wall_time_limit: 5,
    memory_limit: 131072,
    max_processes_and_or_threads: 20,
    max_file_size: 1024,
    enable_network: false,
    redirect_stderr_to_stdout: false,
  });
  assert.equal(result.stdout, 'Hello Yasasvisai\n');
  assert.equal(result.stderr, '');
  assert.equal(result.exitCode, 0);
  assert.equal(result.status, 'Accepted');
  assert.equal(result.error, null);
});

test('returns Python syntax errors from the sandbox', async () => {
  let callCount = 0;
  global.fetch = async () => {
    callCount += 1;
    return callCount === 1
      ? judgeResponse({ token: 'syntax-error-token' })
      : judgeResponse({
        stdout: null,
        stderr: null,
        compile_output: '  File "main.py", line 1\n    if True print("bad")\n            ^^^^^\nSyntaxError: invalid syntax\n',
        exit_code: 1,
        status: { id: 6, description: 'Compilation Error' },
      });
  };

  const result = await codeExecutionService.executePython('if True print("bad")');

  assert.equal(result.exitCode, 1);
  assert.equal(result.status, 'Compilation Error');
  assert.match(result.error, /SyntaxError: invalid syntax/);
});

test('returns sandbox execution time-limit errors', async () => {
  let callCount = 0;
  global.fetch = async () => {
    callCount += 1;
    return callCount === 1
      ? judgeResponse({ token: 'timeout-token' })
      : judgeResponse({
        stdout: null,
        stderr: null,
        compile_output: null,
        exit_code: null,
        status: { id: 5, description: 'Time Limit Exceeded' },
      });
  };

  const result = await codeExecutionService.executePython('while True: pass');

  assert.equal(result.status, 'Time Limit Exceeded');
  assert.equal(result.exitCode, null);
  assert.equal(result.error, 'Time Limit Exceeded');
});

test('rejects an unavailable Judge0 service explicitly', async () => {
  global.fetch = async () => { throw new TypeError('connection refused'); };

  await assert.rejects(
    codeExecutionService.executePython('print(1)'),
    (error) => error instanceof ApiError
      && error.statusCode === 503
      && error.message === 'The code execution service is unavailable.',
  );
});

test('validates code-execution request language, source length, and fields', () => {
  assert.equal(codeExecutionSchema.safeParse({ language: 'PYTHON', code: 'print(1)' }).success, true);
  assert.equal(codeExecutionSchema.safeParse({ language: 'JAVA', code: 'System.out.println(1);' }).success, false);
  assert.equal(codeExecutionSchema.safeParse({ language: 'PYTHON', code: '' }).success, false);
  assert.equal(codeExecutionSchema.safeParse({ language: 'PYTHON', code: 'x'.repeat(12001) }).success, false);
  assert.equal(codeExecutionSchema.safeParse({ language: 'PYTHON', code: 'print(1)', input: 'extra' }).success, false);
});

test('reports upstream service errors instead of presenting output as successful', async () => {
  global.fetch = async () => judgeResponse({ message: 'unavailable' }, 503);

  await assert.rejects(
    codeExecutionService.executePython('print(1)'),
    (error) => error instanceof ApiError
      && error.statusCode === 503
      && error.message === 'The code execution service returned HTTP 503.',
  );
});
