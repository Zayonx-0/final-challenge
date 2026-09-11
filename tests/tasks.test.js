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

    const responseText = await response.text();
    const body = responseText ? JSON.parse(responseText) : null;
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

test('GET /tasks/:id returns 404 for an unknown task', async () => {
  const { response, body } = await request('/tasks/999999');

  assert.equal(response.status, 404);
  assert.equal(body.error, 'Task not found');
});

test('POST /tasks creates a valid task with the default status', async () => {
  const { response, body } = await request('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      title: '  Validate API requests  ',
      description: 'Reject invalid task payloads'
    })
  });

  assert.equal(response.status, 201);
  assert.equal(body.title, 'Validate API requests');
  assert.equal(body.status, 'todo');
  assert.equal(typeof body.id, 'number');
});

test('POST /tasks rejects a missing title', async () => {
  const { response, body } = await request('/tasks', {
    method: 'POST',
    body: JSON.stringify({ description: 'A title is required' })
  });

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Title is required');
});

test('POST /tasks rejects an unsupported status', async () => {
  const { response, body } = await request('/tasks', {
    method: 'POST',
    body: JSON.stringify({ title: 'Invalid state', status: 'blocked' })
  });

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Status must be one of: todo, in-progress, done');
});

test('POST /tasks rejects a title longer than 120 characters', async () => {
  const { response, body } = await request('/tasks', {
    method: 'POST',
    body: JSON.stringify({ title: 'a'.repeat(121) })
  });

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Title must be at most 120 characters');
});

test('POST /tasks rejects an invalid request structure', async () => {
  const { response, body } = await request('/tasks', {
    method: 'POST',
    body: JSON.stringify(['not', 'an', 'object'])
  });

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Request body must be a JSON object');
});

test('POST /tasks returns JSON for a malformed JSON request', async () => {
  const { response, body } = await request('/tasks', {
    method: 'POST',
    body: '{"title":'
  });

  assert.equal(response.status, 400);
  assert.equal(body.error, 'Request body contains invalid JSON');
});

test('PATCH /tasks/:id updates only the supplied task fields', async () => {
  const { response, body } = await request('/tasks/1', {
    method: 'PATCH',
    body: JSON.stringify({ title: '  Prepare release notes  ', status: 'done' })
  });

  assert.equal(response.status, 200);
  assert.equal(body.id, 1);
  assert.equal(body.title, 'Prepare release notes');
  assert.equal(body.description, 'Finish the slides');
  assert.equal(body.status, 'done');
});

test('PATCH /tasks/:id rejects an invalid status without changing the task', async () => {
  const invalidUpdate = await request('/tasks/2', {
    method: 'PATCH',
    body: JSON.stringify({ status: 'archived' })
  });

  assert.equal(invalidUpdate.response.status, 400);
  assert.equal(
    invalidUpdate.body.error,
    'Status must be one of: todo, in-progress, done'
  );

  const { body: unchangedTask } = await request('/tasks/2');
  assert.equal(unchangedTask.status, 'in-progress');
});

test('PATCH /tasks/:id rejects an empty update', async () => {
  const { response, body } = await request('/tasks/1', {
    method: 'PATCH',
    body: JSON.stringify({})
  });

  assert.equal(response.status, 400);
  assert.equal(body.error, 'At least one task field is required');
});

test('PATCH /tasks/:id returns 404 for an unknown task', async () => {
  const { response, body } = await request('/tasks/999999', {
    method: 'PATCH',
    body: JSON.stringify({ status: 'done' })
  });

  assert.equal(response.status, 404);
  assert.equal(body.error, 'Task not found');
});

test('DELETE /tasks/:id deletes a task and returns no content', async () => {
  const created = await request('/tasks', {
    method: 'POST',
    body: JSON.stringify({ title: 'Temporary task' })
  });

  const deletion = await request(`/tasks/${created.body.id}`, {
    method: 'DELETE'
  });

  assert.equal(deletion.response.status, 204);
  assert.equal(deletion.body, null);

  const regressionCheck = await request(`/tasks/${created.body.id}`);
  assert.equal(regressionCheck.response.status, 404);
  assert.equal(regressionCheck.body.error, 'Task not found');
});

test('DELETE /tasks/:id returns 404 for an unknown task', async () => {
  const { response, body } = await request('/tasks/999999', {
    method: 'DELETE'
  });

  assert.equal(response.status, 404);
  assert.equal(body.error, 'Task not found');
});
