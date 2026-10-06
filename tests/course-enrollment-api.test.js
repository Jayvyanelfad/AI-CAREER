const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { createServer } = require('node:http');
const { createCourseEnrollmentRouter } = require('../course-enrollment-api');

const USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const COURSE_ID = 'intro_to_ai';

function createFixture(options = {}) {
  const state = {
    course: { id: COURSE_ID, title: 'Introduction to AI & ML', status: 'available' },
    enrollment: options.enrollment || null,
    enrollmentReadError: options.enrollmentReadError || null,
    insertError: options.insertError || null,
    inserts: []
  };

  const supabase = {
    from(table) {
      const filters = {};
      let insertPayload;
      const query = {
        select() { return this; },
        eq(column, value) { filters[column] = value; return this; },
        insert(payload) { insertPayload = payload; return this; },
        async maybeSingle() {
          if (table === 'courses') return { data: state.course, error: null };
          if (table === 'enrollments' && state.enrollmentReadError) {
            return { data: null, error: state.enrollmentReadError };
          }
          if (table === 'enrollments' && state.enrollment?.user_id === filters.user_id &&
              state.enrollment?.course_id === filters.course_id) {
            return { data: state.enrollment, error: null };
          }
          return { data: null, error: null };
        },
        async single() {
          state.inserts.push(insertPayload);
          if (state.insertError) {
            if (state.insertError.code === '23505') {
              state.enrollment = {
                id: 'enrollment-race',
                ...insertPayload,
                enrolled_at: '2026-10-06T00:00:00.000Z'
              };
            }
            return { data: null, error: state.insertError };
          }
          state.enrollment = {
            id: 'enrollment-1',
            ...insertPayload,
            enrolled_at: '2026-10-06T00:00:00.000Z'
          };
          return { data: state.enrollment, error: null };
        }
      };
      return query;
    }
  };

  const authenticateToken = (req, res, next) => {
    if (req.headers.authorization !== 'Bearer valid-token') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = { id: USER_ID };
    return next();
  };

  const app = express();
  app.use(express.json());
  app.use('/api', createCourseEnrollmentRouter({ supabase, authenticateToken }));
  const server = createServer(app).listen(0, '127.0.0.1');
  return new Promise(resolve => server.once('listening', () => resolve({
    state,
    server,
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise(done => server.close(done))
  })));
}

test('enrollment lookup distinguishes unauthenticated, not enrolled, enrolled, and database failure', async t => {
  const fixture = await createFixture();
  t.after(fixture.close);

  const anonymous = await fetch(`${fixture.origin}/api/enrollments/${COURSE_ID}`);
  assert.equal(anonymous.status, 401);

  const notEnrolled = await fetch(`${fixture.origin}/api/enrollments/${COURSE_ID}`, {
    headers: { Authorization: 'Bearer valid-token' }
  });
  assert.equal(notEnrolled.status, 404);
  assert.deepEqual(await notEnrolled.json(), { error: 'NOT_ENROLLED' });

  fixture.state.enrollment = {
    id: 'enrollment-existing',
    user_id: USER_ID,
    course_id: COURSE_ID,
    course_name: 'Introduction to AI & ML',
    progress: 25,
    completed_hours: 2,
    total_hours: 8,
    enrolled_at: '2026-10-01T00:00:00.000Z'
  };
  const enrolled = await fetch(`${fixture.origin}/api/enrollments/${COURSE_ID}`, {
    headers: { Authorization: 'Bearer valid-token' }
  });
  assert.equal(enrolled.status, 200);
  assert.equal((await enrolled.json()).courseId, COURSE_ID);

  fixture.state.enrollmentReadError = { message: 'database unavailable' };
  const failedLookup = await fetch(`${fixture.origin}/api/enrollments/${COURSE_ID}`, {
    headers: { Authorization: 'Bearer valid-token' }
  });
  assert.equal(failedLookup.status, 500);
  assert.deepEqual(await failedLookup.json(), { error: 'Could not verify enrollment' });
});

test('enroll request persists once, returns existing enrollment on retry, and recovers a unique race', async t => {
  const fixture = await createFixture();
  t.after(fixture.close);
  const headers = { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' };
  const request = () => fetch(`${fixture.origin}/api/enroll`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ courseId: COURSE_ID, courseName: 'Untrusted label', totalHours: 400 })
  });

  const anonymous = await fetch(`${fixture.origin}/api/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId: COURSE_ID })
  });
  assert.equal(anonymous.status, 401);
  const created = await request();
  assert.equal(created.status, 201);
  assert.equal((await created.json()).enrollment.courseId, COURSE_ID);
  assert.equal(fixture.state.inserts[0].total_hours, 0, 'client-supplied course labels and estimated hours are not persisted');
  const retried = await request();
  assert.equal(retried.status, 200);
  assert.equal((await retried.json()).enrollment.id, 'enrollment-1');
  assert.equal(fixture.state.inserts.length, 1, 'repeat requests do not insert duplicate rows');

  const raced = await createFixture({ insertError: { code: '23505', message: 'unique violation' } });
  t.after(raced.close);
  const raceResponse = await fetch(`${raced.origin}/api/enroll`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ courseId: COURSE_ID })
  });
  assert.equal(raceResponse.status, 200);
  assert.equal((await raceResponse.json()).enrollment.id, 'enrollment-race');
});

test('enrollment database failures are explicit and unavailable courses are rejected', async t => {
  const fixture = await createFixture({ enrollmentReadError: { message: 'database unavailable' } });
  t.after(fixture.close);
  const response = await fetch(`${fixture.origin}/api/enroll`, {
    method: 'POST',
    headers: { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId: COURSE_ID })
  });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: 'Could not enroll in course' });
  assert.equal(fixture.state.inserts.length, 0);

  fixture.state.enrollmentReadError = null;
  fixture.state.course.status = 'coming_soon';
  const unavailable = await fetch(`${fixture.origin}/api/enroll`, {
    method: 'POST',
    headers: { Authorization: 'Bearer valid-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ courseId: COURSE_ID })
  });
  assert.equal(unavailable.status, 409);
  assert.equal(fixture.state.inserts.length, 0);
});
