const { z } = require('zod');

const titleSchema = z.string().trim().min(2).max(160);

const moduleUpdateSchema = z.object({ title: titleSchema }).strict();
const materialUploadSchema = z.object({
  title: titleSchema,
  isPublished: z.enum(['true', 'false']).optional(),
}).strict();
const materialUpdateSchema = z.object({
  title: titleSchema.optional(),
  isPublished: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

module.exports = { materialUpdateSchema, materialUploadSchema, moduleUpdateSchema };
