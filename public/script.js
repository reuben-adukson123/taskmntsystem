document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api';
    let token = localStorage.getItem('token');

    const authContainer = document.getElementById('auth-container');
    const taskContainer = document.getElementById('task-container');
    const errorContainer = document.getElementById('error-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');
    const createTaskForm = document.getElementById('create-task-form');
    const tasksList = document.getElementById('tasks-list');
    const searchBtn = document.getElementById('search-btn');
    const filterBtn = document.getElementById('filter-btn');

    function showError(message) {
        errorContainer.textContent = message;
    }

    function clearError() {
        errorContainer.textContent = '';
    }

    function showAuthContainer() {
        authContainer.style.display = 'block';
        taskContainer.style.display = 'none';
    }

    function showTaskContainer() {
        authContainer.style.display = 'none';
        taskContainer.style.display = 'block';
        fetchTasks();
    }

    async function fetchTasks() {
        try {
            const response = await fetch(`${API_URL}/tasks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const tasks = await response.json();
            renderTasks(tasks);
        } catch (error) {
            showError('Error fetching tasks');
        }
    }

    function renderTasks(tasks) {
        tasksList.innerHTML = '';
        tasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task';
            taskElement.innerHTML = `
                <h3>${task.title}</h3>
                <p>${task.description}</p>
                <p>Deadline: ${new Date(task.deadline).toLocaleDateString()}</p>
                <p>Priority: ${task.priority}</p>
                <button onclick="updateTaskPriority(${task.id}, '${task.priority}')">Change Priority</button>
                <button onclick="deleteTask(${task.id})">Delete</button>
            `;
            tasksList.appendChild(taskElement);
        });
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (data.token) {
                token = data.token;
                localStorage.setItem('token', token);
                showTaskContainer();
            } else {
                showError(data.error);
            }
        } catch (error) {
            showError('Error logging in');
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (data.userId) {
                showError('Registration successful. Please log in.');
            } else {
                showError(data.error);
            }
        } catch (error) {
            showError('Error registering user');
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        token = null;
        showAuthContainer();
    });

    createTaskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('task-title').value;
        const description = document.getElementById('task-description').value;
        const deadline = document.getElementById('task-deadline').value;
        const priority = document.getElementById('task-priority').value;
        try {
            const response = await fetch(`${API_URL}/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, description, deadline, priority })
            });
            const newTask = await response.json();
            fetchTasks();
            createTaskForm.reset();
        } catch (error) {
            showError('Error creating task');
        }
    });

    searchBtn.addEventListener('click', async () => {
        const query = document.getElementById('search-input').value;
        try {
            const response = await fetch(`${API_URL}/tasks/search?query=${query}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const tasks = await response.json();
            renderTasks(tasks);
        } catch (error) {
            showError('Error searching tasks');
        }
    });

    filterBtn.addEventListener('click', async () => {
        const priority = document.getElementById('filter-priority').value;
        const dueDate = document.getElementById('filter-due-date').value;
        try {
            const response = await fetch(`${API_URL}/tasks/filter?priority=${priority}&dueDate=${dueDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const tasks = await response.json();
            renderTasks(tasks);
        } catch (error) {
            showError('Error filtering tasks');
        }
    });

    window.updateTaskPriority = async (id, currentPriority) => {
        const newPriority = currentPriority === 'low' ? 'medium' : currentPriority === 'medium' ? 'high' : 'low';
        try {
            const response = await fetch(`${API_URL}/tasks/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ priority: newPriority })
            });
            await response.json();
            fetchTasks();
        } catch (error) {
            showError('Error updating task priority');
        }
    };

    window.deleteTask = async (id) => {
        try {
            await fetch(`${API_URL}/tasks/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchTasks();
        } catch (error) {
            showError('Error deleting task');
        }
    };

    if (token) {
        showTaskContainer();
    } else {
        showAuthContainer();
    }
});