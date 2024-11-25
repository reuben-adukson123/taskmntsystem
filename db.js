const { Client } = require('pg');

// Database connection configuration
const client = new Client({
  host: 'dpg-ct1f8ad6l47c73bep52g-a.oregon-postgres.render.com', // Correct hostname from the external URL
  port: 5432, // PostgreSQL default port
  user: 'mydb_4nfi_user', // Your database username
  password: '0tCmOnRwmJwIFTKjh8De0PMRfpm27sEI', // Your database password
  database: 'mydb_4nfi', // Your database name
  ssl: {
    rejectUnauthorized: false, // Render databases require SSL
  },
});

// Connect to the database and create tables
client
  .connect()
  .then(() => {
    console.log('Connected to the database');
    return client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        deadline DATE,
        priority VARCHAR(50),
        user_id INTEGER REFERENCES users(id)
      );
    `);
  })
  .then(() => {
    console.log('Tables created successfully');
  })
  .catch((err) => {
    console.error('Error executing query', err);
  })
  .finally(() => {
    client.end();
  });
