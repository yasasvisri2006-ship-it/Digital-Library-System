const { z } = require('zod');

const emailSchema = z.email().trim().toLowerCase();
const passwordSchema = z.string()
  .min(8)
  .max(72)
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, 'Password must be no more than 72 bytes.');

const loginSchema = z.object({
  identity: z.string().trim().min(1).max(254),
  password: passwordSchema,
}).strict();

const firstAdminSetupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: z.string()
    .min(12)
    .max(72)
    .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, 'Password must be no more than 72 bytes.'),
  setupKey: z.string().min(32).max(256),
}).strict();

const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  studentId: z.union([z.string().trim().min(1).max(40), z.null()]).optional(),
  program: z.union([z.string().trim().max(100), z.null()]).optional(),
  department: z.union([z.string().trim().max(120), z.null()]).optional(),
  branch: z.union([z.string().trim().max(120), z.null()]).optional(),
  year: z.union([z.string().trim().max(40), z.null()]).optional(),
  semester: z.union([z.string().trim().max(40), z.null()]).optional(),
  section: z.union([z.string().trim().max(40), z.null()]).optional(),
  phone: z.union([z.string().trim().max(40), z.null()]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one profile field to update');

module.exports = { firstAdminSetupSchema, loginSchema, profileUpdateSchema };
