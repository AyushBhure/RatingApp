import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  database: "test3db",
  password: "Ayush@123",
});

pool
  .connect()
  .then(() => {
    console.log("Connected to PostgreSQL");
  })
  .catch((err) => {
    console.error("Database connection error:", err.message);
  });

export default pool;
