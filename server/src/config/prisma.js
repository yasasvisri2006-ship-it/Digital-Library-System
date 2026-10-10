const { PrismaClient } = require('@prisma/client');
const { env } = require('./env');

const prisma = new PrismaClient({
  datasources: {
    db: { url: env.databaseUrl },
  },
});

module.exports = { prisma };
