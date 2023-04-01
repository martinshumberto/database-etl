const { join, resolve } = require("path");
require("dotenv").config({
  path: join(resolve(__dirname, "../.."), ".env"),
});

module.exports = {
  name: "default",
  server: process.env.DB_SERVER || "localhost",
  database: process.env.DB_DATABASE || "default",
  user: process.env.DB_USERNAME || "root",
  password: process.env.DB_PASSWORD || "",
  port: parseInt(process.env.DB_PORT) || 1433,
  requestTimeout: 300000,
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
