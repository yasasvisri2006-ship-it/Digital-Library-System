const { IssueStatus } = require('@prisma/client');
const { prisma } = require('../config/prisma');
const { ApiError } = require('../utils/ApiError');

async function issueBook({ bookId, userId, dueAt }) {
  return prisma.$transaction(async (tx) => {
    const inventoryUpdate = await tx.book.updateMany({
      where: { id: bookId, availableCopies: { gt: 0 } },
      data: { availableCopies: { decrement: 1 } },
    });

    if (inventoryUpdate.count !== 1) {
      const bookExists = await tx.book.findUnique({ where: { id: bookId }, select: { id: true } });
      if (!bookExists) throw new ApiError(404, 'Book not found');
      throw new ApiError(409, 'No copies of this book are currently available');
    }

    return tx.issue.create({
      data: { bookId, userId, dueAt: new Date(dueAt) },
    });
  });
}

async function returnBook({ issueId, condition, notes }) {
  return prisma.$transaction(async (tx) => {
    const issueUpdate = await tx.issue.updateMany({
      where: { id: issueId, status: IssueStatus.ACTIVE },
      data: { status: IssueStatus.RETURNED },
    });

    if (issueUpdate.count !== 1) {
      const issueExists = await tx.issue.findUnique({ where: { id: issueId }, select: { id: true } });
      if (!issueExists) throw new ApiError(404, 'Active issue not found');
      throw new ApiError(409, 'This issue has already been closed');
    }

    const issue = await tx.issue.findUnique({
      where: { id: issueId },
      select: { bookId: true },
    });
    const record = await tx.returnRecord.create({
      data: { issueId, condition, notes },
    });
    await tx.book.update({
      where: { id: issue.bookId },
      data: { availableCopies: { increment: 1 } },
    });

    return record;
  });
}

async function deleteBook(bookId) {
  return prisma.$transaction(async (tx) => {
    const activeIssues = await tx.issue.count({
      where: { bookId, status: IssueStatus.ACTIVE },
    });
    if (activeIssues > 0) {
      throw new ApiError(409, 'Books with active issues cannot be deleted');
    }

    try {
      return await tx.book.delete({ where: { id: bookId } });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new ApiError(404, 'Book not found');
      }
      throw error;
    }
  });
}

module.exports = { issueBook, returnBook, deleteBook };
