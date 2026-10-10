const { z } = require('zod');

const optionalText = (max) => z.union([z.string().trim().max(max), z.null()]).optional();
const webUrl = z.string().trim().url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === 'http:' || protocol === 'https:';
}, 'Only HTTP and HTTPS links are allowed.');

const subjectSchema = z.object({
  code: optionalText(40),
  name: z.string().trim().min(2).max(120).optional(),
  description: optionalText(2000),
  semester: optionalText(40),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one subject field to update');

const createSubjectSchema = z.object({
  code: optionalText(40),
  name: z.string().trim().min(2).max(120),
  description: optionalText(2000),
  semester: optionalText(40),
}).strict();

const resourceSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: optionalText(2000),
  type: z.enum(['SYLLABUS', 'NOTES', 'SLIDES', 'DOCUMENT', 'ASSIGNMENT', 'REFERENCE', 'VIDEO', 'LINK', 'OTHER']),
  url: z.union([webUrl, z.null()]).optional(),
}).strict().superRefine((value, context) => {
  if (value.type === 'LINK' || value.type === 'REFERENCE') {
    if (!value.url) {
      context.addIssue({ code: 'custom', path: ['url'], message: 'A URL is required for links and references.' });
    }
  } else if (value.url) {
    context.addIssue({ code: 'custom', path: ['url'], message: 'Use a link/reference resource for external URLs.' });
  }
});

const resourceUpdateSchema = z.object({
  title: z.string().trim().min(2).max(160).optional(),
  description: optionalText(2000),
  type: z.enum(['SYLLABUS', 'NOTES', 'SLIDES', 'DOCUMENT', 'ASSIGNMENT', 'REFERENCE', 'VIDEO', 'LINK', 'OTHER']).optional(),
  url: z.union([webUrl, z.null()]).optional(),
  isReviewed: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one resource field to update');

module.exports = { createSubjectSchema, resourceSchema, resourceUpdateSchema, subjectSchema };
