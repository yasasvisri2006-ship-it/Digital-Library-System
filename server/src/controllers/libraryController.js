const libraryService = require('../services/libraryService');
const { ApiError } = require('../utils/ApiError');
const { sendSuccess } = require('../utils/apiResponse');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateParams(...names) {
  return (req, res, next) => {
    for (const name of names) {
      if (!uuidPattern.test(req.params[name])) {
        next(new ApiError(400, `Invalid ${name}.`));
        return;
      }
    }
    next();
  };
}

async function listBooks(req, res) {
  const result = await libraryService.listBooks(req.query, req.auth.role === 'ADMIN');
  sendSuccess(res, { message: 'Books loaded.', data: result });
}

async function getBook(req, res) {
  const book = await libraryService.getBook(req.params.bookId);
  sendSuccess(res, { message: 'Book loaded.', data: { book } });
}

async function createBook(req, res) {
  const book = await libraryService.createBook(req.body);
  sendSuccess(res, { statusCode: 201, message: 'Book added to the catalog.', data: { book } });
}

async function updateBook(req, res) {
  const book = await libraryService.updateBook(req.params.bookId, req.body);
  sendSuccess(res, { message: 'Book updated.', data: { book } });
}

async function deleteBook(req, res) {
  await libraryService.deleteBook(req.params.bookId);
  sendSuccess(res, { message: 'Book deleted.' });
}

async function setBookActive(req, res) {
  const book = await libraryService.setBookActive(req.params.bookId, req.body.isActive);
  sendSuccess(res, { message: `Book ${book.isActive ? 'activated' : 'deactivated'}.`, data: { book } });
}

async function listCategories(req, res) {
  const categories = await libraryService.listCategories();
  sendSuccess(res, { message: 'Categories loaded.', data: { categories } });
}

async function listDepartments(req, res) {
  const departments = await libraryService.listDepartments();
  sendSuccess(res, { message: 'Departments loaded.', data: { departments } });
}

async function createCategory(req, res) {
  const category = await libraryService.createCategory(req.body);
  sendSuccess(res, { statusCode: 201, message: 'Category created.', data: { category } });
}

async function updateCategory(req, res) {
  const category = await libraryService.updateCategory(req.params.categoryId, req.body);
  sendSuccess(res, { message: 'Category updated.', data: { category } });
}

async function deleteCategory(req, res) {
  await libraryService.deleteCategory(req.params.categoryId);
  sendSuccess(res, { message: 'Category deleted.' });
}

async function listStudentIssues(req, res) {
  const result = await libraryService.listIssues(req.query, req.auth.id);
  sendSuccess(res, { message: 'Your borrowing records loaded.', data: result });
}

async function listAdminIssues(req, res) {
  if (req.query.userId && !uuidPattern.test(req.query.userId)) throw new ApiError(400, 'Invalid userId filter.');
  if (req.query.bookId && !uuidPattern.test(req.query.bookId)) throw new ApiError(400, 'Invalid bookId filter.');
  const result = await libraryService.listIssues(req.query);
  sendSuccess(res, { message: 'Issue records loaded.', data: result });
}

async function getStudentIssues(req, res) {
  if (!uuidPattern.test(req.params.studentId)) throw new ApiError(400, 'Invalid studentId.');
  const result = await libraryService.listIssues({ ...req.query, userId: req.params.studentId });
  sendSuccess(res, { message: 'Student borrowing history loaded.', data: result });
}

async function createIssue(req, res) {
  const issue = await libraryService.createIssue(req.body);
  sendSuccess(res, { statusCode: 201, message: 'Book issued.', data: { issue } });
}

async function returnIssue(req, res) {
  const issue = await libraryService.returnIssue(req.params.issueId, req.body);
  sendSuccess(res, { message: 'Book return recorded.', data: { issue } });
}

async function listStudents(req, res) {
  const result = await libraryService.students(req.query);
  sendSuccess(res, { message: 'Students loaded.', data: result });
}

async function reports(req, res) {
  const report = await libraryService.reports();
  sendSuccess(res, { message: 'Library report loaded.', data: { report } });
}

module.exports = {
  createBook, createCategory, createIssue, deleteBook, deleteCategory, getBook, listAdminIssues,
  getStudentIssues, listBooks, listCategories, listDepartments, listStudentIssues, listStudents, reports, returnIssue, setBookActive,
  updateBook, updateCategory, validateParams,
};
