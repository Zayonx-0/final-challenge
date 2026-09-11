const express = require('express');

const app = express();
app.use(express.json());

const TASK_STATUSES = new Set(['todo', 'in-progress', 'done']);

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

  if (status && !TASK_STATUSES.has(status)) {
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
  const { title, description, status = 'todo' } = req.body;

  const task = {
    id: tasks.length ? Math.max(...tasks.map((item) => item.id)) + 1 : 1,
    title,
    description,
    status
  };

  tasks.push(task);
  return res.status(201).json(task);
});

if (require.main === module) {
  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`Task API listening on port ${port}`);
  });
}

module.exports = { app };
