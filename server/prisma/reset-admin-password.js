let prisma;

async function resetAdminPassword() {
  if (process.env.ADMIN_PASSWORD_RESET_CONFIRM !== 'RESET_EXISTING_ADMIN_PASSWORD') {
    throw new Error('Set ADMIN_PASSWORD_RESET_CONFIRM=RESET_EXISTING_ADMIN_PASSWORD to authorize the reset.');
  }
  if (!['development', 'test'].includes(process.env.NODE_ENV)) {
    throw new Error('Run the password reset only from a trusted development or test environment.');
  }

  const email = process.env.ADMIN_PASSWORD_RESET_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD_RESET_VALUE;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_PASSWORD_RESET_EMAIL must be a valid email address.');
  }
  if (!password || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('The new password must be at least 12 and at most 72 bytes.');
  }

  const { env } = require('../src/config/env');
  const databaseUrl = new URL(env.databaseUrl);
  const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));
  const databaseHost = databaseUrl.hostname.toLowerCase();
  if (!['localhost', '127.0.0.1', '[::1]'].includes(databaseHost)) {
    throw new Error(`Refusing password reset: PostgreSQL host "${databaseHost}" is not local.`);
  }
  if (env.nodeEnv === 'development' && databaseName !== 'digital_library') {
    throw new Error('Refusing password reset: development requires the local "digital_library" database.');
  }
  if (env.nodeEnv === 'test' && !/_test$/i.test(databaseName)) {
    throw new Error('Refusing password reset: test requires a database whose name ends in _test.');
  }

  const environmentLabel = env.nodeEnv === 'test' ? 'test ' : '';
  console.log(`Resetting an existing administrator password in the ${environmentLabel}database "${databaseName}" on ${databaseHost}.`);
  ({ prisma } = require('../src/config/prisma'));
  const admin = await prisma.user.findFirst({
    where: { email, role: 'ADMIN' },
    select: { id: true, name: true, email: true, isActive: true },
  });
  if (!admin) throw new Error('No administrator account with that email exists; no account was changed.');

  const bcrypt = require('bcryptjs');
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({
    where: { id: admin.id },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });
  console.log(`Administrator password reset for ${admin.name} (${admin.email}); account status: ${admin.isActive ? 'ACTIVE' : 'INACTIVE'}. Existing sessions were revoked.`);
}

resetAdminPassword()
  .catch((error) => {
    console.error(`Administrator password reset failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (prisma) await prisma.$disconnect();
  });
