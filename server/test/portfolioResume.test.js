const { test } = require('node:test');
const assert = require('node:assert/strict');
const { profileEducation } = require('../src/services/portfolioService');

test('resume starter includes only verified student education details', () => {
  assert.deepEqual(profileEducation({
    program: 'B.Tech',
    branch: 'CSE (DS)',
    department: 'Data Science',
    year: '3rd Year',
    semester: '5th Semester',
  }), [{
    institution: 'Mohan Babu University',
    qualification: 'B.Tech',
    field: 'CSE (DS)',
    details: 'Current standing: 3rd Year · 5th Semester',
  }]);
});

test('resume starter leaves education blank when no academic profile details exist', () => {
  assert.deepEqual(profileEducation({}), []);
  assert.deepEqual(profileEducation(null), []);
});
