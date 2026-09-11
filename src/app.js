const express = require('express');

const app = express();
app.use(express.json());

const TASK_STATUSES = new Set(['todo', 'in-progress', 'done']);
const TASK_FIELDS = new Set(['title', 'description', 'status']);
const MAX_TITLE_LENGTH = 120;

function validateTaskPayload(payload, { partial = false } = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return 'Request body must be a JSON object';
  }

  const fields = Object.keys(payload);
  const unknownField = fields.find((field) => !TASK_FIELDS.has(field));

  if (unknownField) {
    return `Unknown task field: ${unknownField}`;
  }

  if (partial && fields.length === 0) {
    return 'At least one task field is required';
  }

  if (!partial && !Object.hasOwn(payload, 'title')) {
    return 'Title is required';
  }

  if (Object.hasOwn(payload, 'title')) {
    if (typeof payload.title !== 'string' || payload.title.trim() === '') {
      return 'Title must be a non-empty string';
    }

    if (payload.title.length > MAX_TITLE_LENGTH) {
      return `Title must be at most ${MAX_TITLE_LENGTH} characters`;
    }
  }

  if (
    Object.hasOwn(payload, 'description') &&
    typeof payload.description !== 'string'
  ) {
    return 'Description must be a string';
  }

  if (Object.hasOwn(payload, 'status') && !TASK_STATUSES.has(payload.status)) {
    return 'Status must be one of: todo, in-progress, done';
  }

  return null;
}

let tasks = [
  {
    id: 1,
    title: 'Prepare GitHub workshop',
    description: 'Finish the slides',
    status: 'todo'
  },
  {
    id: 2,
    title: 'Write CI workflow',
    description: 'Configure GitHub Actions',
    status: 'in-progress'
  },
  {
    id: 3,
    title: 'Review Pull Request',
    description: 'Review teammate changes',
    status: 'done'
  }
];

app.get('/health', (req, res) => {
  res.json({
    status: 'ok'
  });
});

app.get('/tasks', (req, res) => {
  const { status } = req.query;

  if (status !== undefined && !TASK_STATUSES.has(status)) {
    return res.status(400).json({
      error: 'Status must be one of: todo, in-progress, done'
    });
  }

  const filteredTasks = status
    ? tasks.filter((task) => task.status === status)
    : tasks;

  return res.json(filteredTasks);
});

app.get('/tasks/:id', (req, res) => {
  const task = tasks.find((item) => item.id === Number(req.params.id));

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  return res.json(task);
});

app.post('/tasks', (req, res) => {
  const validationError = validateTaskPayload(req.body);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { title, description, status = 'todo' } = req.body;

  const task = {
    id: tasks.length ? Math.max(...tasks.map((item) => item.id)) + 1 : 1,
    title: title.trim(),
    description,
    status
  };

  tasks.push(task);
  return res.status(201).json(task);
});

app.patch('/tasks/:id', (req, res) => {
  const task = tasks.find((item) => item.id === Number(req.params.id));

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const validationError = validateTaskPayload(req.body, { partial: true });

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const updates = { ...req.body };

  if (Object.hasOwn(updates, 'title')) {
    updates.title = updates.title.trim();
  }

  Object.assign(task, updates);
  return res.json(task);
});

app.delete('/tasks/:id', (req, res) => {
  const taskIndex = tasks.findIndex(
    (item) => item.id === Number(req.params.id)
  );

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  tasks.splice(taskIndex, 1);
  return res.status(204).send();
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Request body contains invalid JSON' });
  }

  return next(error);
});

if (require.main === module) {
  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`Task API listening on port ${port}`);
  });
}

module.exports = { app };
