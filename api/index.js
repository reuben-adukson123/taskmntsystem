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

const JWT_SECRET = '79759502139273777132466007462544';

// Function to initialize the database
async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        deadline DATE,
        priority VARCHAR(50)
      )
    `);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Call the function to initialize the database
initDatabase();

// Middleware to authenticate requests
const authenticate = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
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
    console.log('Attempting to register user:', email);
    
    // Check if user already exists
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      console.log('User already exists:', email);
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id',
      [email, hashedPassword]
    );
    console.log('User registered successfully:', email);
    res.json({ message: 'User created successfully', userId: result.rows[0].id });
  } catch (error) {
    console.error('Error in registration:', error);
    res.status(500).json({ error: 'Error creating user', details: error.message });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Attempting to log in user:', email);
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      console.log('User not found:', email);
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('Invalid password for user:', email);
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);
    console.log('User logged in successfully:', email);
    res.json({ token });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ error: 'Error logging in', details: error.message });
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
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Error creating task', details: error.message });
  }
});

// Get all tasks for a user
app.get('/api/tasks', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE user_id = $1', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Error fetching tasks', details: error.message });
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
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Error updating task', details: error.message });
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
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Error deleting task', details: error.message });
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
    console.error('Error searching tasks:', error);
    res.status(500).json({ error: 'Error searching tasks', details: error.message });
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
    console.error('Error filtering tasks:', error);
    res.status(500).json({ error: 'Error filtering tasks', details: error.message });
  }
});

// Route to check database connection
app.get('/api/check-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ message: 'Database connected successfully', timestamp: result.rows[0].now });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed', details: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;