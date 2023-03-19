// Lib
require("dotenv").config();

// Package
const ETLConfig = require("./src/config/etl");
const log = require("./src/lib/log");
const { initDatabase } = require("./src/lib/db");

(async function main() {
  try {
    await initDatabase();

    const modules = ETLConfig.modules;

    // Check if there are any modules to run
    if (modules.length === 0) {
      log.warn("No modules to run");
      process.exit(0);
    }

    // Run ETL process for each module
    for (let i = 0; i < modules.length; i++) {
      const module = require(`./src/modules/${modules[i]}`);

      await module
        .ETL()
        .then(() => {
          log.info(`Finished ETL process for module: ${modules[i]}`);
        })
        .catch((err) => {
          log.error(`Error running ETL process for module: ${modules[i]}`);
          log.error(err);
          throw err;
        });
    }
    process.exit(0);
  } catch (err) {
    log.error("Error running ETL process");
    log.error(err);
    process.exit(1);
  }
})();
