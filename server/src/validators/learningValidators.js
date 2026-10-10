const { z } = require('zod');

const optionalText = (max) => z.string().trim().max(max).nullable().optional();
const webUrl = z.string().trim().url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === 'http:' || protocol === 'https:';
}, 'Only HTTP and HTTPS links are allowed.');

const codingProblemSchema = z.object({
  title: z.string().trim().min(2).max(160),
  statement: z.string().trim().min(1).max(8000),
  language: z.enum(['PYTHON', 'SQL', 'JAVA', 'CPP', 'DSA']),
  topic: optionalText(100),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
  sourceUrl: z.union([webUrl, z.null()]).optional(),
  solutionNotes: optionalText(8000),
}).strict();

const codingProblemUpdateSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  statement: z.string().trim().min(1).max(8000).optional(),
  language: z.enum(['PYTHON', 'SQL', 'JAVA', 'CPP', 'DSA']).optional(),
  topic: optionalText(100),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  sourceUrl: z.union([webUrl, z.null()]).optional(),
  solutionNotes: optionalText(8000),
  isCompleted: z.boolean().optional(),
  isBookmarked: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one coding problem field to update.');

const progressSchema = z.object({
  notes: z.string().max(8000).optional(),
  isCompleted: z.boolean().optional(),
  percentComplete: z.number().int().min(0).max(100).optional(),
}).strict()
  .refine((value) => Object.keys(value).length > 0, 'Provide progress or notes to save.')
  .refine(
    (value) => !(value.isCompleted === false && value.percentComplete === 100),
    'A completed progress value must also be marked completed.',
  );

const cloudLabSchema = z.object({
  title: z.string().trim().min(2).max(160),
  notes: z.string().trim().min(1).max(8000),
  isComplete: z.boolean().optional(),
}).strict();

const cloudLabUpdateSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  notes: z.string().trim().min(1).max(8000).optional(),
  isComplete: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one lab note field to update.');

const cloudCertificateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  issuer: optionalText(160),
  issuedAt: z.union([z.string().datetime(), z.null()]).optional(),
  credentialUrl: z.union([webUrl, z.null()]).optional(),
}).strict();

module.exports = {
  cloudCertificateSchema,
  cloudLabSchema,
  cloudLabUpdateSchema,
  codingProblemSchema,
  codingProblemUpdateSchema,
  progressSchema,
};
