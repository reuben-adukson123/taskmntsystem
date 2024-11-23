require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const Joi = require('joi');

// Initialize Express app
const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB using Mongoose
mongoose.connect(process.env.DB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// Task Schema
const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    deadline: Date,
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});
const Task = mongoose.model('Task', taskSchema);

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

// Validation Schemas
const taskValidationSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().allow(''),
    deadline: Joi.date().optional(),
    priority: Joi.string().valid('low', 'medium', 'high').optional()
});

// User Registration Route
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already in use' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ email, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error creating user' });
    }
});

// User Login Route
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: 'Error logging in' });
    }
});

// Create Task Route
app.post('/api/tasks', authenticate, async (req, res) => {
    try {
        const { error } = taskValidationSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { title, description, deadline, priority } = req.body;
        const task = new Task({ title, description, deadline, priority, userId: req.userId });
        await task.save();
        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ error: 'Error creating task' });
    }
});

// Get All Tasks Route
app.get('/api/tasks', authenticate, async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.userId });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching tasks' });
    }
});

// Get Single Task Route
app.get('/api/tasks/:id', authenticate, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(task);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching task' });
    }
});

// Update Task Route
app.put('/api/tasks/:id', authenticate, async (req, res) => {
    try {
        const { error } = taskValidationSchema.validate(req.body);
        if (error) return res.status(400).json({ error: error.details[0].message });

        const { title, description, deadline, priority } = req.body;
        const task = await Task.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { title, description, deadline, priority },
            { new: true, runValidators: true }
        );
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(task);
    } catch (error) {
        res.status(500).json({ error: 'Error updating task' });
    }
});

// Delete Task Route
app.delete('/api/tasks/:id', authenticate, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting task' });
    }
});

// Search Tasks Route with Pagination
app.get('/api/tasks/search', authenticate, async (req, res) => {
    try {
        const { query, page = 1, limit = 10 } = req.query;
        const tasks = await Task.find({
            userId: req.userId,
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ]
        })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Error searching tasks' });
    }
});

// Filter Tasks Route with Pagination
app.get('/api/tasks/filter', authenticate, async (req, res) => {
    try {
        const { priority, dueDate, page = 1, limit = 10 } = req.query;
        const filter = { userId: req.userId };
        if (priority) filter.priority = priority;
        if (dueDate) filter.deadline = { $lte: new Date(dueDate) };
        const tasks = await Task.find(filter)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Error filtering tasks' });
    }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Route for homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
