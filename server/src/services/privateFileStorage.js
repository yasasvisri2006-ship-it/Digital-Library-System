const path = require('node:path');
const { access, mkdir, unlink, writeFile } = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const { Readable } = require('node:stream');
const { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
const { env } = require('../config/env');
const { ApiError } = require('../utils/ApiError');

const client = env.academicResourceStorageProvider === 'r2'
  ? new S3Client({
    region: 'auto',
    endpoint: env.r2Endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.r2AccessKeyId,
      secretAccessKey: env.r2SecretAccessKey,
    },
  })
  : null;
const supabase = env.academicResourceStorageProvider === 'supabase'
  ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
  : null;

const validObjectKey = /^(?:[a-f0-9-]{36}\.pdf|[a-f0-9-]{36}\/(?:projects\/[a-f0-9-]{36}\.(?:jpg|png|webp)|certificates\/[a-f0-9-]{36}\.pdf|resumes\/[a-f0-9-]{36}\.pdf)|catalog\/[a-f0-9-]{36}\.(?:pdf|pptx))$/i;

function assertValidKey(key) {
  if (typeof key !== 'string' || !validObjectKey.test(key)) {
    throw new ApiError(404, 'Private file was not found.');
  }
}

function localPathFor(storageDir, key) {
  const resolved = path.resolve(storageDir, key);
  if (!resolved.startsWith(`${storageDir}${path.sep}`)) {
    throw new ApiError(404, 'Private file was not found.');
  }
  return resolved;
}

async function store(storageDir, key, buffer, contentType, { overwrite = false } = {}) {
  assertValidKey(key);
  if (supabase) {
    const { error } = await supabase.storage
      .from(env.supabaseStorageBucket)
      .upload(key, buffer, { contentType, upsert: overwrite });
    if (error) throw error;
    return;
  }
  if (client) {
    await client.send(new PutObjectCommand({
      Bucket: env.r2Bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }));
    return;
  }

  const filePath = localPathFor(storageDir, key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, buffer, { flag: overwrite ? 'w' : 'wx', mode: 0o600 });
}

async function open(storageDir, key) {
  assertValidKey(key);
  if (supabase) {
    const { data, error } = await supabase.storage
      .from(env.supabaseStorageBucket)
      .download(key);
    if (error) {
      if (Number(error.statusCode || error.status) === 404) {
        throw new ApiError(404, 'Private file not found.');
      }
      throw error;
    }
    if (!data) throw new Error('Supabase Storage returned an empty private file object.');
    return Readable.fromWeb(data.stream());
  }
  if (client) {
    try {
      const response = await client.send(new GetObjectCommand({
        Bucket: env.r2Bucket,
        Key: key,
      }));
      if (!response.Body) throw new Error('R2 returned an empty private file object.');
      return response.Body;
    } catch (error) {
      if (error.name === 'NoSuchKey' || error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        throw new ApiError(404, 'Private file not found.');
      }
      throw error;
    }
  }

  const filePath = localPathFor(storageDir, key);
  try {
    await access(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') throw new ApiError(404, 'Private file not found.');
    throw error;
  }
  return createReadStream(filePath);
}

async function remove(storageDir, key) {
  assertValidKey(key);
  if (supabase) {
    const { error } = await supabase.storage
      .from(env.supabaseStorageBucket)
      .remove([key]);
    if (error) throw error;
    return;
  }
  if (client) {
    await client.send(new DeleteObjectCommand({
      Bucket: env.r2Bucket,
      Key: key,
    }));
    return;
  }

  try {
    await unlink(localPathFor(storageDir, key));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

module.exports = { open, remove, store };
