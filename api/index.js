const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Set up the PostgreSQL connection using the Neon database connection string
const pool = new Pool({
  connectionString: 'postgresql://mytask_owner:xNoh4FnXW1mv@ep-round-paper-a547zri7.us-east-2.aws.neon.tech/mytask?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

// Middleware to authenticate requests
const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id',
      [email, hashedPassword]
    );
    res.json({ message: 'User created successfully', userId: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: 'Error creating user' });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Error logging in' });
  }
});

// Create a task
app.post('/api/tasks', authenticate, async (req, res) => {
  try {
    const { title, description, deadline, priority } = req.body;
    const result = await pool.query(
      'INSERT INTO tasks (title, description, deadline, priority, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description, deadline, priority, req.userId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error creating task' });
  }
});

// Get all tasks for a user
app.get('/api/tasks', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE user_id = $1', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching tasks' });
  }
});

// Update a task
app.put('/api/tasks/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, deadline, priority } = req.body;
    const result = await pool.query(
      'UPDATE tasks SET title = $1, description = $2, deadline = $3, priority = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
      [title, description, deadline, priority, id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error updating task' });
  }
});

// Delete a task
app.delete('/api/tasks/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting task' });
  }
});

// Search tasks
app.get('/api/tasks/search', authenticate, async (req, res) => {
  try {
    const { query } = req.query;
    const result = await pool.query(
      'SELECT * FROM tasks WHERE user_id = $1 AND (title ILIKE $2 OR description ILIKE $2)',
      [req.userId, `%${query}%`]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error searching tasks' });
  }
});

// Filter tasks
app.get('/api/tasks/filter', authenticate, async (req, res) => {
  try {
    const { priority, dueDate } = req.query;
    let query = 'SELECT * FROM tasks WHERE user_id = $1';
    const params = [req.userId];

    if (priority) {
      query += ' AND priority = $2';
      params.push(priority);
    }

    if (dueDate) {
      query += priority ? ' AND deadline::date = $3' : ' AND deadline::date = $2';
      params.push(dueDate);
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error filtering tasks' });
  }
});

module.exports = app;
