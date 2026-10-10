const { z } = require('zod');

const optionalText = (max) => z.union([z.string().trim().max(max), z.null()]).optional();
const url = z.string().trim().url().refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), 'Only HTTP and HTTPS URLs are allowed.');
const optionalUrl = z.union([url, z.null()]).optional();

const bookSchema = z.object({
  isbn: optionalText(32),
  title: z.string().trim().min(1).max(240),
  author: z.string().trim().min(1).max(180),
  department: optionalText(120),
  publisher: optionalText(180),
  publishedYear: z.union([z.number().int().min(1000).max(2200), z.null()]).optional(),
  description: optionalText(4000),
  coverUrl: optionalUrl,
  totalCopies: z.number().int().min(0).max(100000),
  categoryIds: z.array(z.string().uuid()).max(20).optional(),
  isActive: z.boolean().optional(),
}).strict();
const bookUpdateSchema = bookSchema.partial().refine((value) => Object.keys(value).length > 0, 'Provide book fields to update.');
const categorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: optionalText(1000),
}).strict();
const categoryUpdateSchema = categorySchema.partial().refine((value) => Object.keys(value).length > 0, 'Provide category fields to update.');
const issueSchema = z.object({
  userId: z.string().uuid(),
  bookId: z.string().uuid(),
  issuedAt: z.string().datetime().optional(),
  dueAt: z.string().datetime(),
}).strict();
const returnSchema = z.object({
  returnedAt: z.string().datetime().optional(),
  condition: optionalText(120),
  notes: optionalText(1000),
}).strict();

module.exports = { bookSchema, bookUpdateSchema, categorySchema, categoryUpdateSchema, issueSchema, returnSchema };
