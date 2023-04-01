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

    // Populate queue for each module on Cluster Master
    if (ETLConfig.clusterId === 0) {
      log.info(
        `Populating queue for modules with cluster ${ETLConfig.clusterId}`
      );
      await Promise.allSettled(
        modules.map(async (module) => {
          try {
            const mod = require(`./src/modules/${module}`);
            await mod.populate();
            return Promise.resolve();
          } catch (err) {
            log.error(`Error running ETL process for module: ${module}`);
            log.error(err);
            return Promise.reject(err);
          }
        })
      );
      log.info(`Releasing cluster #${ETLConfig.clusterId} for processing`);
    }

    // Start process for each module
    await Promise.allSettled(
      modules.map(async (module) => {
        try {
          const mod = require(`./src/modules/${module}`);
          await mod.start();
          log.info(`Finished ETL process for module: ${module}`);
          return Promise.resolve();
        } catch (err) {
          log.error(`Error running ETL process for module: ${module}`);
          log.error(err);
          return Promise.reject(err);
        }
      })
    );
    process.exit(0);
  } catch (err) {
    log.error("Error running ETL process");
    log.error(err);
    process.exit(1);
  }
})();
