// DOM elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const taskContainer = document.getElementById('task-container');
const authContainer = document.getElementById('auth-container');
const createTaskForm = document.getElementById('create-task-form');
const logoutBtn = document.getElementById('logout-btn');
const errorContainer = document.getElementById('error-container');
const tasksList = document.getElementById('tasks-list');
const searchBtn = document.getElementById('search-btn');
const filterBtn = document.getElementById('filter-btn');

let token = localStorage.getItem('token');

function showError(message) {
  errorContainer.textContent = message;
  errorContainer.style.display = 'block';
}

function clearError() {
  errorContainer.textContent = '';
  errorContainer.style.display = 'none';
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

// Handle login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      token = data.token;
      localStorage.setItem('token', token);
      showTaskContainer();
    } else {
      showError(data.error || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    showError('Login failed. Please try again.');
  }
});

// Handle register
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      showError('Registration successful. Please log in.');
    } else {
      showError(data.error || 'Registration failed');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showError('Registration failed. Please try again.');
  }
});

// Handle logout
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  token = null;
  showAuthContainer();
});

// Handle task creation
createTaskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const title = document.getElementById('task-title').value;
  const description = document.getElementById('task-description').value;
  const deadline = document.getElementById('task-deadline').value;
  const priority = document.getElementById('task-priority').value;

  try {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, description, deadline, priority }),
    });
    const data = await response.json();
    if (response.ok) {
      createTaskForm.reset();
      fetchTasks();
    } else {
      showError(data.error || 'Failed to create task');
    }
  } catch (error) {
    console.error('Task creation error:', error);
    showError('Task creation failed. Please try again.');
  }
});

async function fetchTasks(query = '', filterPriority = '', filterDueDate = '') {
  try {
    let url = '/api/tasks';
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (filterPriority) params.append('priority', filterPriority);
    if (filterDueDate) params.append('dueDate', filterDueDate);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const tasks = await response.json();
      if (tasks.length === 0) {
        showError('No tasks found.');
        tasksList.innerHTML = ''; // Clear the tasks list
      } else {
        renderTasks(tasks);
        clearError(); // Clear any previous error messages
      }
    } else {
      throw new Error('Failed to fetch tasks');
    }
  } catch (error) {
    console.error('Fetch tasks error:', error);
    showError('Error fetching tasks: ' + error.message);
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
      <button onclick="updateTask('${task.id}')" class="btn btn-secondary">Update</button>
      <button onclick="deleteTask('${task.id}')" class="btn btn-danger">Delete</button>
    `;
    tasksList.appendChild(taskElement);
  });
}

async function updateTask(id) {
  const task = await fetchTask(id);
  if (!task) return;

  document.getElementById('task-title').value = task.title;
  document.getElementById('task-description').value = task.description;
  document.getElementById('task-deadline').value = task.deadline.split('T')[0];
  document.getElementById('task-priority').value = task.priority;

  const submitButton = createTaskForm.querySelector('button[type="submit"]');
  submitButton.textContent = 'Update Task';

  createTaskForm.onsubmit = async (e) => {
    e.preventDefault();
    clearError();

    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const deadline = document.getElementById('task-deadline').value;
    const priority = document.getElementById('task-priority').value;

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, description, deadline, priority }),
      });
      const data = await response.json();
      if (response.ok) {
        createTaskForm.reset();
        submitButton.textContent = 'Create Task';
        createTaskForm.onsubmit = null;
        fetchTasks();
      } else {
        showError(data.error);
      }
    } catch (error) {
      showError('Task update failed. Please try again.');
    }
  };
}

async function fetchTask(id) {
  try {
    const response = await fetch(`/api/tasks/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      return await response.json();
    } else {
      const data = await response.json();
      showError(data.error);
      return null;
    }
  } catch (error) {
    showError('Error fetching task');
    return null;
  }
}

async function deleteTask(id) {
  try {
    const response = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      fetchTasks();
    } else {
      const data = await response.json();
      showError(data.error);
    }
  } catch (error) {
    showError('Error deleting task');
  }
}

searchBtn.addEventListener('click', () => {
  const query = document.getElementById('search-input').value.trim();
  fetchTasks(query);
});

filterBtn.addEventListener('click', () => {
  const priority = document.getElementById('filter-priority').value;
  const dueDate = document.getElementById('filter-due-date').value;
  fetchTasks('', priority, dueDate);
});

function clearFiltersAndSearch() {
  document.getElementById('search-input').value = '';
  document.getElementById('filter-priority').value = '';
  document.getElementById('filter-due-date').value = '';
  fetchTasks();
}

document.getElementById('clear-filters-btn').addEventListener('click', clearFiltersAndSearch);

// Check if user is already logged in
if (token) {
  showTaskContainer();
} else {
  showAuthContainer();
}

// Make these functions global so they can be called from HTML
window.updateTask = updateTask;
window.deleteTask = deleteTask;