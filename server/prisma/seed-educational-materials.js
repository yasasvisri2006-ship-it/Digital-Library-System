const { prisma } = require('../src/config/prisma');
const { seedCatalog } = require('../src/services/educationalMaterialService');
const { records } = require('../src/data/educationalMaterials');

async function main() {
  await prisma.$connect();
  const count = await seedCatalog();
  const sectionCounts = records.reduce((counts, { section }) => {
    counts[section] = (counts[section] || 0) + 1;
    return counts;
  }, {});
  console.log(`Upserted ${count} educational catalog records and uploaded packaged resources.`);
  for (const [section, sectionCount] of Object.entries(sectionCounts).sort(([left], [right]) => left.localeCompare(right))) {
    console.log(`  ${section}: ${sectionCount}`);
  }
}

main()
  .catch((error) => {
    console.error('Unable to seed educational catalog', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
