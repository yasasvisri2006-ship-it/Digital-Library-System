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
  ACADEMIC_RESOURCE_STORAGE_PROVIDER: z.enum(['local', 'r2']).default('local'),
  ACADEMIC_RESOURCE_STORAGE_DIR: optionalNonEmptyString,
  R2_ACCOUNT_ID: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().regex(/^[a-f0-9]{32}$/i, 'R2_ACCOUNT_ID must be a 32-character Cloudflare account ID').optional(),
  ),
  R2_ACCESS_KEY_ID: optionalNonEmptyString,
  R2_SECRET_ACCESS_KEY: optionalNonEmptyString,
  R2_BUCKET: optionalNonEmptyString,
  PORTFOLIO_STORAGE_DIR: optionalNonEmptyString,
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
  portfolioStorageDir: path.resolve(
    parsedEnv.data.PORTFOLIO_STORAGE_DIR
      || path.resolve(__dirname, '../../storage/portfolio'),
  ),
  nodeEnv: parsedEnv.data.NODE_ENV,
});

if (env.nodeEnv === 'production' && env.academicResourceStorageProvider !== 'r2') {
  throw new Error('Invalid server configuration: private file storage requires ACADEMIC_RESOURCE_STORAGE_PROVIDER=r2 in production');
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

if (
  env.demoStudentEnabled
  && (!env.demoStudentEmail || !env.demoStudentPassword)
) {
  throw new Error('DEMO_STUDENT_ENABLED requires DEMO_STUDENT_EMAIL and DEMO_STUDENT_PASSWORD');
}

module.exports = { env };
