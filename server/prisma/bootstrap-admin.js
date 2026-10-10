let prisma;

async function bootstrapAdmin() {
  if (process.env.ADMIN_BOOTSTRAP_CONFIRM !== 'CREATE_FIRST_ADMIN') {
    throw new Error('Set ADMIN_BOOTSTRAP_CONFIRM=CREATE_FIRST_ADMIN to explicitly authorize first-admin setup.');
  }
  if (!['development', 'test'].includes(process.env.NODE_ENV)) {
    throw new Error('Run the bootstrap only from a trusted development or test environment.');
  }
  const name = process.env.ADMIN_BOOTSTRAP_NAME?.trim();
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!name || name.length < 2 || name.length > 100) throw new Error('ADMIN_BOOTSTRAP_NAME must contain 2 to 100 characters.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('ADMIN_BOOTSTRAP_EMAIL must be a valid email address.');
  if (!password || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('ADMIN_BOOTSTRAP_PASSWORD must be at least 12 and at most 72 bytes.');
  }

  const { env } = require('../src/config/env');
  const databaseUrl = new URL(env.databaseUrl);
  const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\/+/, ''));
  const databaseHost = databaseUrl.hostname.toLowerCase();
  const localHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
  if (!databaseName) throw new Error('DATABASE_URL must identify a database.');
  if (!localHosts.has(databaseHost)) {
    throw new Error(`Refusing bootstrap: PostgreSQL host "${databaseHost}" is not local.`);
  }
  if (env.nodeEnv === 'development' && databaseName !== 'digital_library') {
    throw new Error('Refusing bootstrap: development setup requires the local "digital_library" database.');
  }
  if (env.nodeEnv === 'test' && !/_test$/i.test(databaseName)) {
    throw new Error('Refusing bootstrap: test setup requires a database whose name ends in _test.');
  }

  const environmentLabel = env.nodeEnv === 'test' ? 'test ' : '';
  console.log(`Creating the first administrator in the ${environmentLabel}database "${databaseName}" on ${databaseHost}.`);
  ({ prisma } = require('../src/config/prisma'));
  const { createFirstAdmin } = require('../src/services/firstAdminService');
  const admin = await createFirstAdmin({ name, email, password });
  console.log(`Initial administrator created (ID ${admin.id}). Credentials were not logged.`);
}

bootstrapAdmin()
  .catch((error) => {
    const message = error.message.includes('Administrator setup has already been completed')
      ? 'An administrator already exists; bootstrap did not create another account.'
      : error.message;
    console.error(`Administrator bootstrap failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prisma) await prisma.$disconnect();
  });
