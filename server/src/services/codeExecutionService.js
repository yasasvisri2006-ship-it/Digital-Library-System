const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');

const executionLimits = Object.freeze({
  cpu_time_limit: 2,
  cpu_extra_time: 1,
  wall_time_limit: 5,
  memory_limit: 131072,
  max_processes_and_or_threads: 20,
  max_file_size: 1024,
  enable_network: false,
  redirect_stderr_to_stdout: false,
});
const requestTimeoutMs = 3000;
const executionTimeoutMs = 15000;
const maxResponseBytes = 256 * 1024;
const maxOutputCharacters = 16 * 1024;
const inProgressStatusIds = new Set([1, 2]);

async function readJsonResponse(response) {
  if (!response.body) throw new ApiError(502, 'The code execution service returned an empty response.');
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxResponseBytes) {
        await reader.cancel();
        throw new ApiError(502, 'The code execution service response exceeded the allowed size.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(502, 'The code execution service returned an invalid response.');
  }
}

async function requestJson(url, options, deadline) {
  const remainingMs = deadline - Date.now();
  if (remainingMs <= 0) throw new ApiError(504, 'Python execution timed out while waiting for the sandbox.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(requestTimeoutMs, remainingMs));
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new ApiError(
          503,
          'Judge0 rejected its API authentication. Verify the backend-only JUDGE0_API_KEY and that this endpoint accepts the X-Auth-Token header.',
          undefined,
          { exposeMessage: true },
        );
      }
      throw new ApiError(503, `The code execution service returned HTTP ${response.status}.`);
    }
    return await readJsonResponse(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error.name === 'AbortError') {
      if (Date.now() >= deadline) throw new ApiError(504, 'Python execution timed out while waiting for the sandbox.');
      throw new ApiError(503, 'The code execution service did not respond in time.');
    }
    throw new ApiError(503, 'The code execution service is unavailable.');
  } finally {
    clearTimeout(timeout);
  }
}

function resultResponse(submission) {
  const statusDescription = submission.status?.description || 'Execution finished.';
  const stdout = (submission.stdout || '').slice(0, maxOutputCharacters);
  const stderr = (submission.stderr || '').slice(0, maxOutputCharacters);
  const compileOutput = (submission.compile_output || '').slice(0, maxOutputCharacters);
  const error = compileOutput || submission.message || (
    submission.status?.id !== 3 && !stderr ? statusDescription : null
  );
  return {
    stdout,
    stderr,
    exitCode: submission.exit_code ?? null,
    status: statusDescription,
    error,
    time: submission.time ?? null,
    memory: submission.memory ?? null,
    outputTruncated: [submission.stdout, submission.stderr, submission.compile_output]
      .some((value) => typeof value === 'string' && value.length > maxOutputCharacters),
  };
}

async function executePython(code) {
  if (!env.judge0Url || !env.judge0PythonLanguageId) {
    throw new ApiError(503, 'Python execution is not configured. Contact the application administrator.');
  }

  const headers = { 'Content-Type': 'application/json' };
  if (env.judge0ApiKey) headers['X-Auth-Token'] = env.judge0ApiKey;
  const deadline = Date.now() + executionTimeoutMs;
  const submission = await requestJson(
    `${env.judge0Url}/submissions?base64_encoded=false&wait=false`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source_code: code,
        language_id: env.judge0PythonLanguageId,
        ...executionLimits,
      }),
    },
    deadline,
  );
  if (typeof submission.token !== 'string' || !/^[\w-]{1,200}$/.test(submission.token)) {
    throw new ApiError(502, 'The code execution service did not return a valid submission token.');
  }

  const resultUrl = `${env.judge0Url}/submissions/${encodeURIComponent(submission.token)}?base64_encoded=false`;
  while (Date.now() < deadline) {
    const result = await requestJson(resultUrl, { headers }, deadline);
    if (!inProgressStatusIds.has(result.status?.id)) return resultResponse(result);
    await new Promise((resolve) => setTimeout(resolve, Math.min(400, Math.max(0, deadline - Date.now()))));
  }
  throw new ApiError(504, 'Python execution timed out while waiting for the sandbox.');
}

module.exports = { executePython };
