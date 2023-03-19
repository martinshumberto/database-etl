module.exports = {
  name: "default",
  server: process.env.DB_SERVER || "localhost",
  database: process.env.DB_NAME || "default",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    textsize: 2147483647,
    outFormat: "json",
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};
