const express = require('express');
const { z } = require('zod');
const libraryController = require('../controllers/libraryController');
const { authenticate } = require('../middleware/authenticate');
const { requireRole } = require('../middleware/requireRole');
const { requireTrustedOrigin } = require('../middleware/requireTrustedOrigin');
const { validateRequest } = require('../middleware/validateRequest');
const {
  bookSchema,
  bookUpdateSchema,
  categorySchema,
  categoryUpdateSchema,
  issueSchema,
  returnSchema,
} = require('../validators/libraryValidators');

const router = express.Router();
router.use(authenticate, requireRole('STUDENT', 'ADMIN'));

router.get('/books', libraryController.listBooks);
router.get('/books/:bookId', libraryController.validateParams('bookId'), libraryController.getBook);
router.get('/categories', libraryController.listCategories);
router.get('/departments', libraryController.listDepartments);
router.get('/my/issues', requireRole('STUDENT'), libraryController.listStudentIssues);

const admin = express.Router();
admin.use(requireRole('ADMIN'));
admin.post('/books', requireTrustedOrigin, validateRequest(bookSchema), libraryController.createBook);
admin.patch('/books/:bookId', requireTrustedOrigin, libraryController.validateParams('bookId'), validateRequest(bookUpdateSchema), libraryController.updateBook);
const activeStatusSchema = z.object({ isActive: z.boolean() }).strict();
admin.patch(
  '/books/:bookId/active',
  requireTrustedOrigin,
  libraryController.validateParams('bookId'),
  validateRequest(activeStatusSchema),
  libraryController.setBookActive,
);
admin.delete('/books/:bookId', requireTrustedOrigin, libraryController.validateParams('bookId'), libraryController.deleteBook);
admin.post('/categories', requireTrustedOrigin, validateRequest(categorySchema), libraryController.createCategory);
admin.patch('/categories/:categoryId', requireTrustedOrigin, libraryController.validateParams('categoryId'), validateRequest(categoryUpdateSchema), libraryController.updateCategory);
admin.delete('/categories/:categoryId', requireTrustedOrigin, libraryController.validateParams('categoryId'), libraryController.deleteCategory);
admin.get('/students', libraryController.listStudents);
admin.get('/issues', libraryController.listAdminIssues);
admin.get('/students/:studentId/issues', libraryController.validateParams('studentId'), libraryController.getStudentIssues);
admin.post('/issues', requireTrustedOrigin, validateRequest(issueSchema), libraryController.createIssue);
admin.post('/issues/:issueId/return', requireTrustedOrigin, libraryController.validateParams('issueId'), validateRequest(returnSchema), libraryController.returnIssue);
admin.get('/reports', libraryController.reports);
router.use('/admin', admin);

module.exports = router;
