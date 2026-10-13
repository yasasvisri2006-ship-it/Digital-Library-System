const path = require('node:path');
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const optionalNonEmptyString = z.preprocess(
  (value) => value === '' ? undefined : value,
  z.string().min(1).optional(),
);

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must contain at least 32 characters'),
  AUTH_COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  ADMIN_SETUP_KEY: z.string().min(32).optional(),
  DEMO_STUDENT_ENABLED: z.enum(['true', 'false']).default('false'),
  DEMO_STUDENT_EMAIL: z.string().email().optional(),
  DEMO_STUDENT_PASSWORD: z.string().min(12).optional(),
  ACADEMIC_RESOURCE_STORAGE_PROVIDER: z.enum(['local', 'r2', 'supabase']).default('local'),
  ACADEMIC_RESOURCE_STORAGE_DIR: optionalNonEmptyString,
  LIBREOFFICE_PATH: optionalNonEmptyString,
  R2_ACCOUNT_ID: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().regex(/^[a-f0-9]{32}$/i, 'R2_ACCOUNT_ID must be a 32-character Cloudflare account ID').optional(),
  ),
  R2_ACCESS_KEY_ID: optionalNonEmptyString,
  R2_SECRET_ACCESS_KEY: optionalNonEmptyString,
  R2_BUCKET: optionalNonEmptyString,
  SUPABASE_URL: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().url().refine((value) => new URL(value).protocol === 'https:', 'SUPABASE_URL must use HTTPS')
      .refine((value) => !new URL(value).username && !new URL(value).password, 'SUPABASE_URL must not contain credentials')
      .optional(),
  ),
  SUPABASE_SERVICE_ROLE_KEY: optionalNonEmptyString,
  SUPABASE_STORAGE_BUCKET: optionalNonEmptyString,
  PORTFOLIO_STORAGE_DIR: optionalNonEmptyString,
  JUDGE0_URL: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().url().refine((value) => {
      const parsedUrl = new URL(value);
      return ['http:', 'https:'].includes(parsedUrl.protocol)
        && !parsedUrl.username
        && !parsedUrl.password
        && !parsedUrl.search
        && !parsedUrl.hash;
    }, 'JUDGE0_URL must be an HTTP(S) base URL without credentials, query, or fragment.').optional(),
  ),
  JUDGE0_API_KEY: optionalNonEmptyString,
  JUDGE0_PYTHON_LANGUAGE_ID: z.preprocess(
    (value) => value === '' || value === undefined ? undefined : value,
    z.coerce.number().int().positive().optional(),
  ),
  DATABASE_URL: z.string().min(1).refine(
    (value) => value.startsWith('postgresql://') || value.startsWith('postgres://'),
    'DATABASE_URL must use the postgresql:// or postgres:// scheme',
  ),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues
    .map(({ path: issuePath, message }) => `${issuePath.join('.')}: ${message}`)
    .join('; ');
  throw new Error(`Invalid server configuration: ${details}`);
}

const clientOrigins = parsedEnv.data.CLIENT_URL.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => {
    try {
      return new URL(origin).origin;
    } catch {
      throw new Error(`Invalid CLIENT_URL origin: ${origin}`);
    }
  });

if (clientOrigins.length === 0) {
  throw new Error('Invalid server configuration: CLIENT_URL must include at least one origin');
}

const env = Object.freeze({
  port: parsedEnv.data.PORT,
  clientOrigins,
  jwtSecret: parsedEnv.data.JWT_SECRET,
  authCookieSecure: parsedEnv.data.AUTH_COOKIE_SECURE === 'true',
  adminSetupKey: parsedEnv.data.ADMIN_SETUP_KEY,
  demoStudentEnabled: parsedEnv.data.DEMO_STUDENT_ENABLED === 'true',
  demoStudentEmail: parsedEnv.data.DEMO_STUDENT_EMAIL?.trim().toLowerCase(),
  demoStudentPassword: parsedEnv.data.DEMO_STUDENT_PASSWORD,
  databaseUrl: parsedEnv.data.DATABASE_URL,
  academicResourceStorageProvider: parsedEnv.data.ACADEMIC_RESOURCE_STORAGE_PROVIDER,
  libreOfficePath: parsedEnv.data.LIBREOFFICE_PATH,
  academicResourceStorageDir: path.resolve(
    parsedEnv.data.ACADEMIC_RESOURCE_STORAGE_DIR
      || path.resolve(__dirname, '../../storage/academic-resources'),
  ),
  r2AccountId: parsedEnv.data.R2_ACCOUNT_ID,
  r2AccessKeyId: parsedEnv.data.R2_ACCESS_KEY_ID,
  r2SecretAccessKey: parsedEnv.data.R2_SECRET_ACCESS_KEY,
  r2Bucket: parsedEnv.data.R2_BUCKET,
  r2Endpoint: parsedEnv.data.R2_ACCOUNT_ID
    ? `https://${parsedEnv.data.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : undefined,
  supabaseUrl: parsedEnv.data.SUPABASE_URL?.replace(/\/+$/, ''),
  supabaseServiceRoleKey: parsedEnv.data.SUPABASE_SERVICE_ROLE_KEY,
  supabaseStorageBucket: parsedEnv.data.SUPABASE_STORAGE_BUCKET,
  portfolioStorageDir: path.resolve(
    parsedEnv.data.PORTFOLIO_STORAGE_DIR
      || path.resolve(__dirname, '../../storage/portfolio'),
  ),
  judge0Url: parsedEnv.data.JUDGE0_URL?.replace(/\/+$/, ''),
  judge0ApiKey: parsedEnv.data.JUDGE0_API_KEY,
  judge0PythonLanguageId: parsedEnv.data.JUDGE0_PYTHON_LANGUAGE_ID,
  nodeEnv: parsedEnv.data.NODE_ENV,
});

if (env.judge0Url && env.nodeEnv === 'production' && !env.judge0Url.startsWith('https://')) {
  throw new Error('Invalid server configuration: JUDGE0_URL must use HTTPS in production');
}

if (env.judge0Url && !env.judge0PythonLanguageId) {
  throw new Error('Invalid server configuration: JUDGE0_PYTHON_LANGUAGE_ID is required when JUDGE0_URL is set');
}

if (env.nodeEnv === 'production' && env.academicResourceStorageProvider === 'local') {
  throw new Error('Invalid server configuration: private file storage requires ACADEMIC_RESOURCE_STORAGE_PROVIDER=r2 or supabase in production');
}

if (env.academicResourceStorageProvider === 'r2') {
  const missingR2Settings = [
    ['R2_ACCOUNT_ID', env.r2AccountId],
    ['R2_ACCESS_KEY_ID', env.r2AccessKeyId],
    ['R2_SECRET_ACCESS_KEY', env.r2SecretAccessKey],
    ['R2_BUCKET', env.r2Bucket],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missingR2Settings.length > 0) {
    throw new Error(`Invalid server configuration: R2 storage requires ${missingR2Settings.join(', ')}`);
  }
}

if (env.academicResourceStorageProvider === 'supabase') {
  const missingSupabaseSettings = [
    ['SUPABASE_URL', env.supabaseUrl],
    ['SUPABASE_SERVICE_ROLE_KEY', env.supabaseServiceRoleKey],
    ['SUPABASE_STORAGE_BUCKET', env.supabaseStorageBucket],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missingSupabaseSettings.length > 0) {
    throw new Error(`Invalid server configuration: Supabase storage requires ${missingSupabaseSettings.join(', ')}`);
  }
}

if (
  env.demoStudentEnabled
  && (!env.demoStudentEmail || !env.demoStudentPassword)
) {
  throw new Error('DEMO_STUDENT_ENABLED requires DEMO_STUDENT_EMAIL and DEMO_STUDENT_PASSWORD');
}

module.exports = { env };
