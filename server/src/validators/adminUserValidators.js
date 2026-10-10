const { z } = require('zod');

const emailSchema = z.email().trim().toLowerCase();
const passwordSchema = z.string()
  .min(8)
  .max(72)
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, 'Password must be no more than 72 bytes.');

const createStudentSchema = z.object({
  studentId: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  department: z.string().trim().min(1).max(120),
  branch: z.string().trim().min(1).max(120),
  year: z.string().trim().min(1).max(40),
  semester: z.string().trim().min(1).max(40),
  section: z.string().trim().min(1).max(40),
  password: passwordSchema,
  phone: z.string().trim().max(40).optional(),
}).strict();

const updateStudentSchema = z.object({
  studentId: z.string().trim().min(1).max(40).optional(),
  name: z.string().trim().min(2).max(100).optional(),
  email: emailSchema.optional(),
  department: z.string().trim().min(1).max(120).nullable().optional(),
  branch: z.string().trim().min(1).max(120).nullable().optional(),
  year: z.string().trim().min(1).max(40).nullable().optional(),
  semester: z.string().trim().min(1).max(40).nullable().optional(),
  section: z.string().trim().min(1).max(40).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update.');

const statusSchema = z.object({ isActive: z.boolean() }).strict();
const passwordResetSchema = z.object({ password: passwordSchema }).strict();

module.exports = { createStudentSchema, passwordResetSchema, statusSchema, updateStudentSchema };
