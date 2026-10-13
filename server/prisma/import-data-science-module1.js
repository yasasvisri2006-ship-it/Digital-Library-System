const { readdir, readFile } = require('node:fs/promises');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { prisma } = require('../src/config/prisma');
const dataScienceService = require('../src/services/dataScienceService');

const sourceDirectory = path.resolve(__dirname, '../../mod1');
const presentationExtensions = new Set(['.ppt', '.pptx']);

async function main() {
  await prisma.$connect();

  const module = await prisma.dataScienceModule.findFirst({
    where: { number: 1, isPublic: true },
    select: { id: true },
  });
  if (!module) {
    throw new Error('Public Data Science Module 1 was not found. Apply database migrations and configure the public modules first.');
  }

  const fileNames = (await readdir(sourceDirectory))
    .filter((fileName) => presentationExtensions.has(path.extname(fileName).toLowerCase()))
    .sort((left, right) => left.localeCompare(right));
  if (fileNames.length === 0) {
    throw new Error(`No PPT or PPTX files were found in ${sourceDirectory}.`);
  }

  let importedCount = 0;
  let skippedCount = 0;
  for (const originalname of fileNames) {
    const existing = await prisma.dataScienceMaterial.findFirst({
      where: { moduleId: module.id, originalFileName: originalname },
      select: { id: true },
    });
    if (existing) {
      skippedCount += 1;
      console.log(`Skipped existing presentation: ${originalname}`);
      continue;
    }

    const buffer = await readFile(path.join(sourceDirectory, originalname));
    const material = await dataScienceService.uploadPublicMaterial(
      module.id,
      path.parse(originalname).name,
      {
        originalname,
        buffer,
        size: buffer.length,
        mimetype: 'application/octet-stream',
      },
    );
    importedCount += 1;
    console.log(`Imported ${originalname}${material.previewError ? ` (${material.previewError})` : ''}`);
  }

  console.log(`Module 1 import complete: ${importedCount} imported, ${skippedCount} already present.`);
}

main()
  .catch((error) => {
    console.error('Unable to import Module 1 presentations', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
