const { z } = require('zod');

const titleSchema = z.string().trim().min(2).max(160);

const moduleUpdateSchema = z.object({ title: titleSchema }).strict();
const materialUploadSchema = z.object({ title: titleSchema }).strict();
const materialUpdateSchema = z.object({ title: titleSchema }).strict();

module.exports = { materialUpdateSchema, materialUploadSchema, moduleUpdateSchema };
