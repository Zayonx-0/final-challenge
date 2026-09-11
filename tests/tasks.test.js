const test = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../src/app');

async function request(path, options = {}) {
  const server = app.listen(0, '127.0.0.1');

  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      headers: {
        'content-type': 'application/json',
        ...(options.headers || {})
      },
      ...options
    });

    const body = await response.json();
    return { response, body };
  } finally {
    server.close();
  }
}

test('GET /health returns an OK status', async () => {
  const { response, body } = await request('/health');

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
});

test('GET /tasks returns tasks', async () => {
  const { response, body } = await request('/tasks');

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body));
  assert.ok(body.length > 0);
});

test('GET /tasks filters tasks by each supported status', async () => {
  for (const status of ['todo', 'in-progress', 'done']) {
    const { response, body } = await request(`/tasks?status=${status}`);

    assert.equal(response.status, 200);
    assert.ok(body.length > 0);
    assert.ok(body.every((task) => task.status === status));
  }
});

test('GET /tasks rejects an unsupported status filter', async () => {
  const { response, body } = await request('/tasks?status=blocked');

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Status must be one of: todo, in-progress, done');
});

test('GET /tasks searches titles case-insensitively', async () => {
  const { response, body } = await request('/tasks?search=WORKSHOP');

  assert.equal(response.status, 200);
  assert.deepEqual(body.map((task) => task.id), [1]);
});

test('GET /tasks searches descriptions case-insensitively', async () => {
  const { response, body } = await request('/tasks?search=github%20actions');

  assert.equal(response.status, 200);
  assert.deepEqual(body.map((task) => task.id), [2]);
});

test('GET /tasks returns an empty list when search has no match', async () => {
  const { response, body } = await request('/tasks?search=does-not-exist');

  assert.equal(response.status, 200);
  assert.deepEqual(body, []);
});

test('GET /tasks treats an empty search as an unfiltered request', async () => {
  const unfiltered = await request('/tasks');
  const emptySearch = await request('/tasks?search=%20%20');

  assert.equal(emptySearch.response.status, 200);
  assert.deepEqual(emptySearch.body, unfiltered.body);
});

test('GET /tasks combines status filtering and search', async () => {
  const match = await request('/tasks?status=in-progress&search=actions');
  const noMatch = await request('/tasks?status=done&search=actions');

  assert.equal(match.response.status, 200);
  assert.deepEqual(match.body.map((task) => task.id), [2]);
  assert.equal(noMatch.response.status, 200);
  assert.deepEqual(noMatch.body, []);
});

test('GET /tasks rejects repeated query parameters', async () => {
  const repeatedStatus = await request('/tasks?status=todo&status=done');
  const repeatedSearch = await request('/tasks?search=github&search=actions');

  assert.equal(repeatedStatus.response.status, 400);
  assert.equal(
    repeatedStatus.body.error,
    'Status must be one of: todo, in-progress, done'
  );
  assert.equal(repeatedSearch.response.status, 400);
  assert.equal(repeatedSearch.body.error, 'Search must be provided once as text');
});

test('GET /tasks/:id returns 404 for an unknown task', async () => {
  const { response, body } = await request('/tasks/999999');

  assert.equal(response.status, 404);
  assert.equal(body.error, 'Task not found');
});
