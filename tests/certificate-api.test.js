const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createServer } = require('node:http');
const { createCertificateRouter } = require('../certificate-api');

const USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const COURSE_ID = 'intro_to_ai';
const CERTIFICATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function createFixture(options = {}) {
  const state = {
    records: {
      courses: [{ id: COURSE_ID, title: 'Introduction to AI & ML' }],
      enrollments: options.enrolled === false ? [] : [{ id: 'enrollment-1', user_id: USER_ID, course_id: COURSE_ID }],
      modules: [{ id: 'module-1', course_id: COURSE_ID }],
      lessons: [{ id: 'lesson-1', module_id: 'module-1' }, { id: 'lesson-2', module_id: 'module-1' }],
      lesson_progress: options.completeLessons === false
        ? [{ user_id: USER_ID, lesson_id: 'lesson-1', completed: true }]
        : [
            { user_id: USER_ID, lesson_id: 'lesson-1', completed: true },
            { user_id: USER_ID, lesson_id: 'lesson-2', completed: true }
          ],
      exams: [{ id: 'exam-final', course_id: COURSE_ID, title: 'Final Exam' }],
      exam_questions: [{ id: 'q1', exam_id: 'exam-final' }, { id: 'q2', exam_id: 'exam-final' }],
      exam_attempts: options.attempts || [
        { id: 'attempt-1', exam_id: 'exam-final', user_id: USER_ID, attempt_number: 1, submitted_at: '2026-10-01', passed: true }
      ],
      certificates: options.existingCertificate ? [options.existingCertificate] : [],
      users: options.missingLearnerName ? [] : [{ id: USER_ID, full_name: 'Test Learner' }]
    }
  };
  let nextCertificateId = CERTIFICATE_ID;
  const supabase = {
    from(table) {
      const filters = [];
      let ordering;
      let maximum;
      let head = false;
      let insertPayload;
      const query = {
        select(_columns, options = {}) { head = options.head === true; return this; },
        eq(column, value) { filters.push(row => row[column] === value); return this; },
        in(column, values) { filters.push(row => values.includes(row[column])); return this; },
        order(column, options = {}) { ordering = { column, ascending: options.ascending !== false }; return this; },
        limit(value) { maximum = value; return this; },
        insert(payload) { insertPayload = payload; return this; },
        async execute() {
          let rows = state.records[table].filter(row => filters.every(filter => filter(row)));
          if (ordering) rows = [...rows].sort((a, b) => (a[ordering.column] - b[ordering.column]) * (ordering.ascending ? 1 : -1));
          if (maximum !== undefined) rows = rows.slice(0, maximum);
          if (head) return { data: null, count: rows.length, error: null };
          return { data: rows, error: null };
        },
        async maybeSingle() {
          const result = await this.execute();
          return { ...result, data: result.data?.[0] || null };
        },
        async single() {
          const row = {
            id: nextCertificateId,
            ...insertPayload,
            earned_at: '2026-10-06T00:00:00.000Z'
          };
          state.records[table].push(row);
          return { data: row, error: null };
        },
        then(resolve, reject) { return this.execute().then(resolve, reject); }
      };
      return query;
    }
  };
  const authenticateToken = (req, res, next) => {
    if (req.headers.authorization !== '******') return res.status(401).json({ error: 'Unauthorized' });
    req.user = { id: USER_ID };
    return next();
  };
  const app = express();
  app.use(express.json());
  app.use('/api', createCertificateRouter({ supabase, authenticateToken }));
  const server = createServer(app).listen(0, '127.0.0.1');
  return new Promise(resolve => server.once('listening', () => resolve({
    state,
    server,
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise(done => server.close(done))
  })));
}

async function issueCertificate(fixture) {
  return fetch(`${fixture.origin}/api/certificate/${COURSE_ID}/issue`, {
    method: 'POST',
    headers: { Authorization: '******', 'Content-Type': 'application/json' },
    body: '{}'
  });
}

test('certificate is issued only after requirements and retrieval stays idempotent', async t => {
  const fixture = await createFixture();
  t.after(fixture.close);

  const issued = await issueCertificate(fixture);
  assert.equal(issued.status, 201);
  const issuedBody = await issued.json();
  assert.equal(issuedBody.certificate.certificateId, CERTIFICATE_ID);
  assert.equal(issuedBody.certificate.learnerName, 'Test Learner');
  assert.equal(fixture.state.records.certificates.length, 1);

  const repeated = await issueCertificate(fixture);
  assert.equal(repeated.status, 200);
  assert.equal((await repeated.json()).certificate.certificateId, CERTIFICATE_ID);
  assert.equal(fixture.state.records.certificates.length, 1);

  const retrieved = await fetch(`${fixture.origin}/api/certificate/${COURSE_ID}`, {
    headers: { Authorization: '******' }
  });
  assert.equal(retrieved.status, 200);
  assert.equal((await retrieved.json()).certificateId, CERTIFICATE_ID);
});

test('certificate issuance rejects users without enrollment or complete lesson progress', async t => {
  for (const options of [{ enrolled: false }, { completeLessons: false }]) {
    const fixture = await createFixture(options);
    t.after(fixture.close);
    const response = await issueCertificate(fixture);
    assert.ok([403, 409].includes(response.status));
    assert.equal(fixture.state.records.certificates.length, 0);
  }
});

test('certificate issuance requires the latest submitted final-exam attempt to pass', async t => {
  const fixture = await createFixture({
    attempts: [
      { id: 'attempt-passed', exam_id: 'exam-final', user_id: USER_ID, attempt_number: 1, submitted_at: '2026-10-01', passed: true },
      { id: 'attempt-failed', exam_id: 'exam-final', user_id: USER_ID, attempt_number: 2, submitted_at: '2026-10-02', passed: false }
    ]
  });
  t.after(fixture.close);
  const response = await issueCertificate(fixture);
  assert.equal(response.status, 403);
  assert.equal(fixture.state.records.certificates.length, 0);
});

test('certificate recovery returns an existing certificate without repeating course eligibility checks', async t => {
  const fixture = await createFixture({
    enrolled: false,
    completeLessons: false,
    attempts: [],
    existingCertificate: {
      id: CERTIFICATE_ID,
      user_id: USER_ID,
      course_id: COURSE_ID,
      course_name: 'Introduction to AI & ML',
      earned_at: '2026-10-01T00:00:00.000Z'
    }
  });
  t.after(fixture.close);

  const response = await issueCertificate(fixture);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).certificate.certificateId, CERTIFICATE_ID);
  assert.equal(fixture.state.records.certificates.length, 1);
});

test('certificate issuance does not create an unnamed certificate when the profile name is missing', async t => {
  const fixture = await createFixture({ missingLearnerName: true });
  t.after(fixture.close);

  const response = await issueCertificate(fixture);
  assert.equal(response.status, 409);
  assert.equal(fixture.state.records.certificates.length, 0);
});
