const path = require('node:path');
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must contain at least 32 characters'),
  AUTH_COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  ADMIN_SETUP_KEY: z.string().min(32).optional(),
  DEMO_STUDENT_ENABLED: z.enum(['true', 'false']).default('false'),
  DEMO_STUDENT_EMAIL: z.string().email().optional(),
  DEMO_STUDENT_PASSWORD: z.string().min(12).optional(),
  ACADEMIC_RESOURCE_STORAGE_DIR: z.string().min(1).optional(),
  PORTFOLIO_STORAGE_DIR: z.string().min(1).optional(),
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
  academicResourceStorageDir: path.resolve(
    parsedEnv.data.ACADEMIC_RESOURCE_STORAGE_DIR
      || path.resolve(__dirname, '../../storage/academic-resources'),
  ),
  portfolioStorageDir: path.resolve(
    parsedEnv.data.PORTFOLIO_STORAGE_DIR
      || path.resolve(__dirname, '../../storage/portfolio'),
  ),
  nodeEnv: parsedEnv.data.NODE_ENV,
});

if (env.nodeEnv === 'production' && !parsedEnv.data.ACADEMIC_RESOURCE_STORAGE_DIR) {
  throw new Error('Invalid server configuration: ACADEMIC_RESOURCE_STORAGE_DIR must point to persistent private storage in production');
}

if (env.nodeEnv === 'production' && !parsedEnv.data.PORTFOLIO_STORAGE_DIR) {
  throw new Error('Invalid server configuration: PORTFOLIO_STORAGE_DIR must point to persistent private storage in production');
}

if (
  env.demoStudentEnabled
  && (!env.demoStudentEmail || !env.demoStudentPassword)
) {
  throw new Error('DEMO_STUDENT_ENABLED requires DEMO_STUDENT_EMAIL and DEMO_STUDENT_PASSWORD');
}

module.exports = { env };
