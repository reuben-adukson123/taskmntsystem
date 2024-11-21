# TaskManager App

TaskManager is a full-stack web application that allows users to manage their tasks efficiently. Users can create, read, update, and delete tasks, as well as filter and search through their tasks.

## Features

- User authentication (register, login, logout)
- Create, read, update, and delete tasks
- Filter tasks by priority and due date
- Search tasks by title or description
- Responsive design for desktop and mobile devices

## Technologies Used

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- Database: PostgreSQL (hosted on Neon)
- Deployment: Vercel

## Prerequisites

Before you begin, ensure you have met the following requirements:

- You have installed the latest version of Node.js and npm
- You have a PostgreSQL database set up (we're using Neon in this project)
- You have a Vercel account for deployment

## Installing TaskManager

To install TaskManager, follow these steps:

1. Clone the repository:
   ```
   git clone https://github.com/reuben-adukson123/TaskManagerApp.git
   ```

2. Navigate to the project directory:
   ```
   cd TaskManagerApp
   ```

3. Install the dependencies:
   ```
   npm install
   ```

4. Create a `.env` file in the root directory and add the following environment variables:
   ```
   POSTGRES_URL=your_postgres_connection_string
   JWT_SECRET=your_jwt_secret
   ```
   Replace `your_postgres_connection_string` with your actual Neon database connection string, and `your_jwt_secret` with a secure random string.

## Using TaskManager

To use TaskManager, follow these steps:

1. Start the development server:
   ```
   npm run dev
   ```

2. Open your web browser and navigate to `http://localhost:3000` (or whatever port your app is running on)

3. Register a new account or log in if you already have one

4. Start managing your tasks!

## Deploying TaskManager

To deploy TaskManager to Vercel:

1. Install the Vercel CLI:
   ```
   npm install -g vercel
   ```

2. Login to Vercel:
   ```
   vercel login
   ```

3. Deploy the application:
   ```
   vercel
   ```

4. Follow the prompts to set up your project on Vercel

5. Add your environment variables to Vercel:
   ```
   vercel env add POSTGRES_URL
   vercel env add JWT_SECRET
   ```

6. Deploy to production:
   ```
   vercel --prod
   ```

## Contributing to TaskManager

To contribute to TaskManager, follow these steps:

1. Fork this repository
2. Create a branch: `git checkout -b <branch_name>`
3. Make your changes and commit them: `git commit -m '<commit_message>'`
4. Push to the original branch: `git push origin <project_name>/<location>`
5. Create the pull request

Alternatively, see the GitHub documentation on [creating a pull request](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/creating-a-pull-request).

## Contact

If you want to contact me, you can reach me at <your_email@example.com>.

## License

This project uses the following license: [MIT License](https://opensource.org/licenses/MIT).
