const { prisma } = require('../src/config/prisma');
const { seedCatalog } = require('../src/services/educationalMaterialService');

async function main() {
  await prisma.$connect();
  const count = await seedCatalog();
  console.log(`Seeded ${count} educational catalog records and uploaded packaged resources.`);
}

main()
  .catch((error) => {
    console.error('Unable to seed educational catalog', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
