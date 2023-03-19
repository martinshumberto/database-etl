// Lib
const seriate = require("seriate");

// Package
const log = require("./log");
const dbConfig = require("../config/db");

async function createETLQueueTable() {
  const query = `
    IF OBJECT_ID('etl_queue', 'U') IS NULL
    CREATE TABLE etl_queue (
        id INT IDENTITY(1,1) NOT NULL,
        source_table VARCHAR(255) NOT NULL,
        destination_table VARCHAR(255) NOT NULL,
        batch_size INT NOT NULL,
        start_id INT NOT NULL,
        last_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        started_at DATETIME NULL,
        ended_at DATETIME NULL,
        status VARCHAR(255) NULL DEFAULT 'WAITING',
        error_message VARCHAR(255) NULL,
        cluster_id VARCHAR(255) NOT NULL,
        attempts INT NOT NULL,
        PRIMARY KEY (id)
    )
    `;
  return await seriate.execute({ query }).catch((err) => {
    log.error(`Processing stopped at function: createETLQueueTable`);
    throw err;
  });
}

const createDatabaseLogs = async () => {
  return await createETLQueueTable().catch((err) => {
    log.error(`Processing stopped at function: createDatabaseLogs`);
    throw err;
  });
};

const initDatabase = () => {
  return new Promise((resolve, reject) => {
    log.info("Initializing DB connection");

    seriate.addConnection(dbConfig);
    seriate.setDefaultConfig(dbConfig);

    seriate.on("connected", async () => {
      log.info("DB Connected");
      resolve(await createDatabaseLogs());
    });

    seriate.on("error", (err) => {
      log.error("DB Connection Error: ", err);
      reject(err);
      process.exit(1);
    });

    seriate.on("failed", (err) => {
      log.error("DB Connection Failed: ", err);
      reject(err);
      process.exit(1);
    });

    seriate.on("closed", (err) => {
      log.info("DB Disconnected");
      reject(err);
      process.exit(1);
    });
  });
};

module.exports = {
  initDatabase,
};
