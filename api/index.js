require('dotenv').config();
const express = require('express');
const { Client } = require('pg'); // PostgreSQL client
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path'); // Add path module

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Route for homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// PostgreSQL Database Connection
const client = new Client({
  host: 'dpg-ct1f8ad6l47c73bep52g-a.oregon-postgres.render.com',
  port: 5432,
  user: 'mydb_4nfi_user',
  password: '0tCmOnRwmJwIFTKjh8De0PMRfpm27sEI',
  database: 'mydb_4nfi',
  ssl: {
    rejectUnauthorized: false,
  },
});

client.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch((err) => console.error('Error connecting to PostgreSQL:', err.stack));

// Middleware to authenticate the user
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

// User Registration Route
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user already exists
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Hash password and insert new user
    const hashedPassword = await bcrypt.hash(password, 10);
    await client.query('INSERT INTO users (email, password) VALUES ($1, $2)', [email, hashedPassword]);

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error creating user' });
  }
});

// User Login Route
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const result = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Error logging in' });
  }
});

// Task Creation Route
app.post('/api/tasks', authenticate, async (req, res) => {
  try {
    const { title, description, deadline, priority } = req.body;
    const userId = req.userId;

    // Insert new task
    const result = await client.query(
      'INSERT INTO tasks (title, description, deadline, priority, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description, deadline, priority, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error creating task' });
  }
});

// Get Tasks Route
app.get('/api/tasks', authenticate, async (req, res) => {
  try {
    const userId = req.userId;
    const result = await client.query('SELECT * FROM tasks WHERE user_id = $1', [userId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching tasks' });
  }
});

// Get Single Task Route
app.get('/api/tasks/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const result = await client.query('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching task' });
  }
});

// Update Task Route
app.put('/api/tasks/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, deadline, priority } = req.body;
    const userId = req.userId;

    const result = await client.query(
      'UPDATE tasks SET title = $1, description = $2, deadline = $3, priority = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
      [title, description, deadline, priority, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error updating task' });
  }
});

// Delete Task Route
app.delete('/api/tasks/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const result = await client.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *', [id, userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting task' });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
