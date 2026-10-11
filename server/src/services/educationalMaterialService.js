const path = require('node:path');
const { createHash } = require('node:crypto');
const { readFile } = require('node:fs/promises');
const { env } = require('../config/env');
const { prisma } = require('../config/prisma');
const privateFileStorage = require('./privateFileStorage');
const { ApiError } = require('../utils/ApiError');
const { records: sourceRecords } = require('../data/educationalMaterials');

const catalogFileKeyPattern = /^catalog\/[a-f0-9-]{36}\.(?:pdf|pptx)$/i;

function objectKeyFor(slug, extension) {
  const digest = createHash('sha256').update(`mbu-education:${slug}`).digest('hex');
  const id = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-a${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
  return `catalog/${id}.${extension}`;
}

function publicRecord(record) {
  const { fileKey, ...metadata } = record;
  return {
    ...metadata,
    fileUrl: fileKey ? `/education/${record.slug}/file` : null,
  };
}

function publicSourceRecord(record, sortOrder) {
  return {
    slug: record.slug,
    section: record.section,
    title: record.title,
    description: record.description,
    subjectName: record.subjectName || null,
    semester: record.semester || null,
    moduleNumber: record.moduleNumber || null,
    category: record.category || null,
    content: record.content || {},
    sourceUrl: record.sourceUrl || null,
    fileUrl: null,
    fileName: null,
    mimeType: null,
    fileSize: null,
    sortOrder,
    updatedAt: null,
  };
}

async function listMaterials(section) {
  try {
    const materials = await prisma.educationalMaterial.findMany({
      where: section ? { section } : undefined,
      orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }, { title: 'asc' }],
    });
    return materials.map(publicRecord);
  } catch (error) {
    if (error.code !== 'P2021') throw error;
    console.warn('EducationalMaterial table is missing; serving source catalog metadata without file downloads. Apply migrations and seed the catalog.');
    return sourceRecords
      .map((record, index) => publicSourceRecord(record, index))
      .filter((record) => !section || record.section === section);
  }
}

async function getDownload(slug) {
  const material = await prisma.educationalMaterial.findUnique({
    where: { slug },
    select: { fileKey: true, fileName: true, mimeType: true },
  });
  if (!material?.fileKey) throw new ApiError(404, 'Educational file not found.');
  if (!catalogFileKeyPattern.test(material.fileKey)) {
    throw new ApiError(404, 'Educational file not found.');
  }
  const stream = await privateFileStorage.open(env.academicResourceStorageDir, material.fileKey);
  return {
    stream,
    fileName: material.fileName,
    mimeType: material.mimeType || 'application/octet-stream',
  };
}

async function seedCatalog() {
  const { records } = require('../data/educationalMaterials');
  const slugs = new Set();
  for (const record of records) {
    if (slugs.has(record.slug)) {
      throw new Error(`Educational catalog contains duplicate slug "${record.slug}".`);
    }
    slugs.add(record.slug);
  }

  const assetBuffers = new Map();
  for (const record of records) {
    if (record.localPath) assetBuffers.set(record.slug, await readFile(record.localPath));
  }

  for (const [index, record] of records.entries()) {
    const fileKey = record.localPath
      ? objectKeyFor(record.slug, path.extname(record.fileName).slice(1))
      : null;
    let fileSize = null;
    if (record.localPath) {
      const buffer = assetBuffers.get(record.slug);
      fileSize = buffer.length;
      await privateFileStorage.store(
        env.academicResourceStorageDir,
        fileKey,
        buffer,
        record.mimeType,
        { overwrite: true },
      );
    }
    const data = {
      section: record.section,
      title: record.title,
      description: record.description,
      subjectName: record.subjectName || null,
      semester: record.semester || null,
      moduleNumber: record.moduleNumber || null,
      category: record.category || null,
      content: record.content || {},
      sourceUrl: record.sourceUrl || null,
      fileKey,
      fileName: record.fileName || null,
      mimeType: record.mimeType || null,
      fileSize,
      sortOrder: index,
    };
    await prisma.educationalMaterial.upsert({
      where: { slug: record.slug },
      create: { slug: record.slug, ...data },
      update: data,
    });
  }
  return records.length;
}

module.exports = { getDownload, listMaterials, seedCatalog };
