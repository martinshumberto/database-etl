// Lib
const seriate = require("seriate");

// Package
const dbConfig = require("../../config/db");
const ETLConfig = require("../../config/etl");

// Constants
const MODULES = ETLConfig.modules;

// TODO: Change process node to bash: https://github.com/google/zx

(async function resetState() {
  console.log("\x1b[32m%s\x1b[0m", "[RESET STATE] Initializing...", "\x1b[0m");
  try {
    seriate.addConnection(dbConfig);

    seriate.on("connected", async () => {
      console.log("\x1b[32m%s\x1b[0m", "[RESET STATE] DB Connected", "\x1b[0m");

      const sourceTables = [];
      const destinationTables = [];
      for (let i = 0; i < MODULES.length; i++) {
        const module = require(`../../modules/${MODULES[i]}`);
        sourceTables.push(module.sourceTable);
        destinationTables.push(module.destinationTable);
      }

      console.log(
        "\x1b[32m%s\x1b[0m",
        `[RESET STATE] Truncating tables: ${destinationTables.join(",")}`,
        "\x1b[0m"
      );
      const truncateQuery = `
        DELETE FROM ${destinationTables.map((t) => t).join(", ")}
      `;
      await seriate.execute({ query: truncateQuery });

      console.log(
        "\x1b[32m%s\x1b[0m",
        `[RESET STATE] Deleting from etl_queue: ${sourceTables.join(",")}`,
        "\x1b[0m"
      );

      // Delete from etl_queue
      const ETLLogProcessing = `
        DELETE FROM etl_queue
        WHERE source_table IN (${sourceTables.map((t) => `'${t}'`).join(", ")})
        AND destination_table IN (${destinationTables
          .map((t) => `'${t}'`)
          .join(", ")})
        `;
      await seriate.execute({ query: ETLLogProcessing });

      console.log(
        "\x1b[32m%s\x1b[0m",
        `[RESET STATE] Reseted state successfully.`,
        "\x1b[0m"
      );
      process.exit(0);
    });

    seriate.on("closed", () => {
      console.log("\x1b[31m", `[RESET STATE] DB Disconnected`, "\x1b[0m");
    });
    seriate.on("failed", (err) => {
      console.log(
        "\x1b[31m",
        `[RESET STATE] DB Connection Failed: `,
        "\x1b[0m",
        err
      );
      process.exit(1);
    });
    seriate.on("error", (err) => {
      console.log(
        "\x1b[31m",
        `[RESET STATE] DB Connection Error: `,
        "\x1b[0m",
        err
      );
      process.exit(1);
    });
  } catch (err) {
    console.error(
      "\x1b[31m%s\x1b[0m",
      "[RESET STATE] Error resetting state",
      "\x1b[0m"
    );
    console.error(err);
    process.exit(1);
  }
})();
