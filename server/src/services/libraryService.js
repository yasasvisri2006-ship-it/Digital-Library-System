const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');

const BOOK_INCLUDE = { categories: { orderBy: { name: 'asc' } } };
const PAGE_SIZE_MAX = 50;

function parsePage(value, fallback) {
  const page = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(page) || page < 1 || page > 1000000) throw new ApiError(400, 'Invalid pagination value.');
  return page;
}

function pagination(query) {
  const page = parsePage(query.page, 1);
  const pageSize = parsePage(query.pageSize, 12);
  if (pageSize > PAGE_SIZE_MAX) throw new ApiError(400, `Page size cannot exceed ${PAGE_SIZE_MAX}.`);
  return { page, pageSize };
}

function utcDate(value = new Date()) {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function overdueDays(dueAt, effectiveAt = new Date()) {
  return Math.max(0, Math.floor((utcDate(effectiveAt) - utcDate(dueAt)) / 86400000));
}

function issueView(issue, now = new Date()) {
  const effectiveAt = issue.returnRecord?.returnedAt || now;
  return {
    ...issue,
    overdueDays: overdueDays(issue.dueAt, effectiveAt),
    isOverdue: issue.status === 'ACTIVE' && overdueDays(issue.dueAt, now) > 0,
  };
}

function bookFilter(query, includeInactive = false) {
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  const department = typeof query.department === 'string' ? query.department.trim() : '';
  const categoryId = typeof query.categoryId === 'string' ? query.categoryId : '';
  if (query.includeInactive !== undefined && !['true', 'false'].includes(query.includeInactive)) throw new ApiError(400, 'Invalid includeInactive filter.');
  if (search.length > 120 || department.length > 120) throw new ApiError(400, 'Search or department filter is too long.');
  if (categoryId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(categoryId)) {
    throw new ApiError(400, 'Invalid category filter.');
  }
  return {
    ...(!includeInactive || query.includeInactive !== 'true' ? { isActive: true } : {}),
    ...(department ? { department: { equals: department, mode: 'insensitive' } } : {}),
    ...(categoryId ? { categories: { some: { id: categoryId } } } : {}),
    ...(search ? {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
        { isbn: { contains: search, mode: 'insensitive' } },
        ...(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(search) ? [{ id: search }] : []),
      ],
    } : {}),
  };
}

async function listBooks(query, allowInactive = false) {
  const where = bookFilter(query, allowInactive);
  const { page, pageSize } = pagination(query);
  const [books, total] = await prisma.$transaction([
    prisma.book.findMany({ where, include: BOOK_INCLUDE, orderBy: [{ title: 'asc' }, { id: 'asc' }], skip: (page - 1) * pageSize, take: pageSize }),
    prisma.book.count({ where }),
  ]);
  return { books, pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) } };
}

async function getBook(bookId, includeInactive = false) {
  const book = await prisma.book.findFirst({ where: { id: bookId, ...(includeInactive ? {} : { isActive: true }) }, include: BOOK_INCLUDE });
  if (!book) throw new ApiError(404, 'Book not found.');
  return book;
}

async function validateCategories(tx, categoryIds = []) {
  const uniqueIds = [...new Set(categoryIds)];
  const count = await tx.category.count({ where: { id: { in: uniqueIds } } });
  if (count !== uniqueIds.length) throw new ApiError(400, 'One or more selected categories do not exist.');
  return uniqueIds;
}

async function createBook(input) {
  const categoryIds = await prisma.$transaction((tx) => validateCategories(tx, input.categoryIds));
  return prisma.book.create({
    data: {
      isbn: input.isbn || null,
      title: input.title,
      author: input.author,
      department: input.department || null,
      publisher: input.publisher || null,
      publishedYear: input.publishedYear ?? null,
      description: input.description || null,
      coverUrl: input.coverUrl || null,
      totalCopies: input.totalCopies,
      availableCopies: input.totalCopies,
      categories: { connect: categoryIds.map((id) => ({ id })) },
    },
    include: BOOK_INCLUDE,
  });
}

async function updateBook(bookId, changes) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.book.findUnique({ where: { id: bookId }, include: { ...BOOK_INCLUDE, _count: { select: { issues: true } } } });
    if (!current) throw new ApiError(404, 'Book not found.');
    const activeIssueCount = await tx.issue.count({ where: { bookId, status: 'ACTIVE' } });
    const data = {};
    for (const field of ['isbn', 'title', 'author', 'department', 'publisher', 'publishedYear', 'description', 'coverUrl']) {
      if (changes[field] !== undefined) data[field] = changes[field] || null;
    }
    if (changes.title !== undefined) data.title = changes.title;
    if (changes.author !== undefined) data.author = changes.author;
    if (changes.totalCopies !== undefined) {
      if (changes.totalCopies < activeIssueCount) throw new ApiError(409, `Total copies cannot be less than ${activeIssueCount} active issue(s).`);
      data.totalCopies = changes.totalCopies;
      data.availableCopies = current.availableCopies + changes.totalCopies - current.totalCopies;
    }
    if (changes.categoryIds !== undefined) {
      const ids = await validateCategories(tx, changes.categoryIds);
      data.categories = { set: ids.map((id) => ({ id })) };
    }
    if (changes.isActive !== undefined) data.isActive = changes.isActive;
    return tx.book.update({ where: { id: bookId }, data, include: BOOK_INCLUDE });
  }, { isolationLevel: 'Serializable' });
}

async function deleteBook(bookId) {
  const result = await prisma.$transaction(async (tx) => {
    const book = await tx.book.findUnique({ where: { id: bookId }, select: { id: true } });
    if (!book) throw new ApiError(404, 'Book not found.');
    const issueCount = await tx.issue.count({ where: { bookId } });
    if (issueCount > 0) throw new ApiError(409, 'This book has borrowing history. Deactivate it instead of deleting it.');
    await tx.book.delete({ where: { id: bookId } });
  });
  return result;
}

async function setBookActive(bookId, isActive) {
  const result = await prisma.book.updateMany({ where: { id: bookId }, data: { isActive } });
  if (result.count === 0) throw new ApiError(404, 'Book not found.');
  return getBook(bookId, true);
}

async function listCategories() {
  return prisma.category.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { books: true } } } });
}

async function listDepartments() {
  const rows = await prisma.book.findMany({
    where: { isActive: true, department: { not: null } },
    distinct: ['department'],
    select: { department: true },
    orderBy: { department: 'asc' },
  });
  return rows.map(({ department }) => department);
}

async function createCategory(input) {
  return prisma.category.create({ data: { name: input.name, description: input.description || null } });
}

async function updateCategory(categoryId, changes) {
  const result = await prisma.category.updateMany({
    where: { id: categoryId },
    data: { ...(changes.name !== undefined ? { name: changes.name } : {}), ...(changes.description !== undefined ? { description: changes.description || null } : {}) },
  });
  if (!result.count) throw new ApiError(404, 'Category not found.');
  return prisma.category.findUnique({ where: { id: categoryId }, include: { _count: { select: { books: true } } } });
}

async function deleteCategory(categoryId) {
  const result = await prisma.category.deleteMany({ where: { id: categoryId } });
  if (!result.count) throw new ApiError(404, 'Category not found.');
}

function issueFilter(query, ownerId) {
  const status = query.status;
  if (status && !['ACTIVE', 'RETURNED', 'LOST', 'CANCELLED'].includes(status)) throw new ApiError(400, 'Invalid issue status filter.');
  if (query.overdue !== undefined && !['true', 'false'].includes(query.overdue)) throw new ApiError(400, 'Invalid overdue filter.');
  return {
    ...(ownerId ? { userId: ownerId } : {}),
    ...(status ? { status } : {}),
    ...(query.bookId ? { bookId: query.bookId } : {}),
    ...(!ownerId && query.userId ? { userId: query.userId } : {}),
    ...(query.overdue === 'true' ? { status: 'ACTIVE', dueAt: { lt: new Date(new Date().setUTCHours(0, 0, 0, 0)) } } : {}),
  };
}

async function listIssues(query, ownerId) {
  const where = issueFilter(query, ownerId);
  const { page, pageSize } = pagination(query);
  const [issues, total] = await prisma.$transaction([
    prisma.issue.findMany({
      where,
      include: { book: { include: BOOK_INCLUDE }, user: { select: { id: true, name: true, email: true, studentProfile: { select: { studentId: true, department: true, year: true } } } }, returnRecord: true },
      orderBy: [{ dueAt: 'asc' }, { issuedAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.issue.count({ where }),
  ]);
  return { issues: issues.map(issueView), pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) } };
}

async function createIssue(input) {
  const issuedAt = input.issuedAt ? new Date(input.issuedAt) : new Date();
  const dueAt = new Date(input.dueAt);
  if (dueAt <= issuedAt) throw new ApiError(400, 'Due date must be after the issue date.');
  try {
    const issue = await prisma.$transaction(async (tx) => {
      const [student, book] = await Promise.all([
        tx.user.findFirst({ where: { id: input.userId, role: 'STUDENT' }, select: { id: true } }),
        tx.book.findFirst({ where: { id: input.bookId, isActive: true }, select: { id: true, availableCopies: true } }),
      ]);
      if (!student) throw new ApiError(404, 'Student account not found.');
      if (!book) throw new ApiError(404, 'Active book not found.');
      const decrement = await tx.book.updateMany({ where: { id: book.id, isActive: true, availableCopies: { gt: 0 } }, data: { availableCopies: { decrement: 1 } } });
      if (!decrement.count) throw new ApiError(409, 'No copies of this book are currently available.');
      return tx.issue.create({ data: { userId: student.id, bookId: book.id, issuedAt, dueAt }, include: { book: true, user: { select: { id: true, name: true } } } });
    }, { isolationLevel: 'Serializable' });
    return issueView(issue);
  } catch (error) {
    if (error.code === 'P2002') throw new ApiError(409, 'This student already has an active issue for this book.');
    if (error.code === 'P2034') throw new ApiError(409, 'The book inventory changed during this request. Please try again.');
    throw error;
  }
}

async function returnIssue(issueId, input = {}) {
  const returnedAt = input.returnedAt ? new Date(input.returnedAt) : new Date();
  try {
    return await prisma.$transaction(async (tx) => {
      const issue = await tx.issue.findUnique({ where: { id: issueId }, include: { book: true, returnRecord: true } });
      if (!issue) throw new ApiError(404, 'Issue record not found.');
      if (issue.status !== 'ACTIVE' || issue.returnRecord) throw new ApiError(409, 'This issue has already been closed.');
      if (returnedAt < issue.issuedAt) throw new ApiError(400, 'Return date cannot be before the issue date.');
      const updated = await tx.issue.updateMany({ where: { id: issueId, status: 'ACTIVE' }, data: { status: 'RETURNED' } });
      if (!updated.count) throw new ApiError(409, 'This issue has already been closed.');
      const returnRecord = await tx.returnRecord.create({
        data: { issueId, returnedAt, condition: input.condition || null, notes: input.notes || null },
      });
      await tx.book.update({ where: { id: issue.bookId }, data: { availableCopies: { increment: 1 } } });
      return issueView({ ...issue, status: 'RETURNED', returnRecord });
    }, { isolationLevel: 'Serializable' });
  } catch (error) {
    if (error.code === 'P2002' || error.code === 'P2034') throw new ApiError(409, 'This issue has already been returned.');
    throw error;
  }
}

async function reports() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const [bookCount, activeBookCount, totalCopies, availableCopies, activeIssues, overdueIssues, studentCount, categoryCount, recentIssues] = await prisma.$transaction([
    prisma.book.count(),
    prisma.book.count({ where: { isActive: true } }),
    prisma.book.aggregate({ _sum: { totalCopies: true } }),
    prisma.book.aggregate({ _sum: { availableCopies: true } }),
    prisma.issue.count({ where: { status: 'ACTIVE' } }),
    prisma.issue.count({ where: { status: 'ACTIVE', dueAt: { lt: today } } }),
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.category.count(),
    prisma.issue.findMany({ take: 8, orderBy: { createdAt: 'desc' }, include: { book: { select: { id: true, title: true } }, user: { select: { id: true, name: true, email: true } } } }),
  ]);
  return { bookCount, activeBookCount, totalCopies: totalCopies._sum.totalCopies || 0, availableCopies: availableCopies._sum.availableCopies || 0, activeIssues, overdueIssues, studentCount, categoryCount, recentIssues: recentIssues.map(issueView) };
}

async function students(query = {}) {
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  if (search.length > 120) throw new ApiError(400, 'Student search is too long.');
  const { page, pageSize } = pagination(query);
  const where = {
    role: 'STUDENT',
    ...(search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { studentProfile: { is: { studentId: { contains: search, mode: 'insensitive' } } } },
      ],
    } : {}),
  };
  const [results, total] = await prisma.$transaction([
    prisma.user.findMany({ where, select: { id: true, name: true, email: true, studentProfile: { select: { studentId: true, department: true, year: true } } }, orderBy: { name: 'asc' }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.user.count({ where }),
  ]);
  return { students: results, pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) } };
}

module.exports = {
  createBook, createCategory, createIssue, deleteBook, deleteCategory, getBook, listBooks, listCategories, listDepartments,
  listIssues, overdueDays, reports, returnIssue, setBookActive, students, updateBook, updateCategory,
};
