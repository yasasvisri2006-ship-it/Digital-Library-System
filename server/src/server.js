const app = require('./app');
const { env } = require('./config/env');
const { prisma } = require('./config/prisma');

async function startServer() {
  await prisma.$connect();
  console.log('PostgreSQL database connection established');

  const server = app.listen(env.port, () => {
    console.log(`Digital Library API listening on port ${env.port}`);
  });

  let isShuttingDown = false;
  function shutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`${signal} received; closing HTTP server and database connection`);
    server.close(async (error) => {
      if (error) {
        console.error('Failed to close HTTP server cleanly', error);
        process.exitCode = 1;
      }
      try {
        await prisma.$disconnect();
      } catch (disconnectError) {
        console.error('Failed to disconnect Prisma cleanly', disconnectError);
        process.exitCode = 1;
      }
    });
  }

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch(async (error) => {
  console.error('Failed to start API because the database connection could not be established', error);
  try {
    await prisma.$disconnect();
  } catch (disconnectError) {
    console.error('Failed to disconnect Prisma after startup failure', disconnectError);
  }
  process.exitCode = 1;
});
