const { z } = require('zod');

const optionalText = (max) => z.string().trim().max(max).nullable().optional();
const webUrl = z.string().trim().url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === 'http:' || protocol === 'https:';
}, 'Only HTTP and HTTPS links are allowed.');
const optionalUrl = z.union([webUrl, z.null()]).optional();
const optionalDate = z.union([z.string().datetime(), z.iso.date(), z.null()]).optional();
const stringList = (maxItems, maxLength) => z.array(z.string().trim().min(1).max(maxLength)).max(maxItems);
const educationEntry = z.object({
  institution: z.string().trim().min(1).max(180),
  qualification: z.string().trim().max(160).optional(),
  field: z.string().trim().max(160).optional(),
  startYear: z.string().trim().max(20).optional(),
  endYear: z.string().trim().max(20).optional(),
  details: z.string().trim().max(1000).optional(),
}).strict();
const internshipEntry = z.object({
  organization: z.string().trim().min(1).max(160),
  role: z.string().trim().max(160).optional(),
  startDate: z.string().trim().max(30).optional(),
  endDate: z.string().trim().max(30).optional(),
  description: z.string().trim().max(1500).optional(),
}).strict();

const projectSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: optionalText(3000),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED']).optional(),
  repositoryUrl: optionalUrl,
  demoUrl: optionalUrl,
  techStack: stringList(30, 60).optional(),
  documentation: optionalText(12000),
  isPublic: z.boolean().optional(),
}).strict();
const projectUpdateSchema = projectSchema.partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one project field to update.');

const resumeSchema = z.object({
  displayName: optionalText(120),
  email: z.union([z.string().trim().email().max(254), z.null()]).optional(),
  phone: optionalText(40),
  location: optionalText(160),
  summary: z.string().trim().max(3000).optional(),
  linkedInUrl: optionalUrl,
  githubUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  skills: stringList(80, 80).optional(),
  education: z.array(educationEntry).max(15).optional(),
  internships: z.array(internshipEntry).max(30).optional(),
  achievements: stringList(50, 500).optional(),
  isPublic: z.boolean().optional(),
  publicSections: z.array(z.enum(['summary', 'contact', 'education', 'skills', 'internships', 'achievements', 'social'])).max(7).optional(),
}).strict();

const certificateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  issuer: optionalText(160),
  issuedAt: optionalDate,
  credentialUrl: optionalUrl,
  category: z.enum(['GENERAL', 'AWS_CLOUD']).optional(),
  isPublic: z.boolean().optional(),
}).strict();
const certificateUpdateSchema = certificateSchema.partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one certificate field to update.');

const careerApplicationSchema = z.object({
  companyName: z.string().trim().min(2).max(160),
  role: z.string().trim().min(2).max(160),
  appliedAt: optionalDate,
  status: z.enum(['SAVED', 'APPLIED', 'ASSESSMENT', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN']).optional(),
  notes: optionalText(3000),
  jobUrl: optionalUrl,
}).strict();
const careerApplicationUpdateSchema = careerApplicationSchema.partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one application field to update.');

const careerResourceSchema = z.object({
  title: z.string().trim().min(2).max(160),
  type: z.enum(['INTERVIEW_PREPARATION', 'APTITUDE_PRACTICE', 'TECHNICAL_INTERVIEW', 'OTHER']),
  url: optionalUrl,
  notes: optionalText(3000),
}).strict();
const careerResourceUpdateSchema = careerResourceSchema.partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one resource field to update.');

module.exports = {
  careerApplicationSchema,
  careerApplicationUpdateSchema,
  careerResourceSchema,
  careerResourceUpdateSchema,
  certificateSchema,
  certificateUpdateSchema,
  projectSchema,
  projectUpdateSchema,
  resumeSchema,
};
