// Libs
const fs = require("fs");
const { mkdirp } = require("mkdirp");
const path = require("path");

// Constants
const ROOT_PATH = process.cwd();
const TEMPLATE_PATH = path.join(
  ROOT_PATH,
  "src",
  "lib",
  "commands",
  "templates",
  "module-index.js"
);
const DIR_PERMISSIONS = 0o755;
const MODULE_TEMPLATE = fs.readFileSync(TEMPLATE_PATH, "utf8");
const MODULE_NAME = process.argv[2];
const MODULE_FOLDER = path.join(ROOT_PATH, "src", "modules", MODULE_NAME);

// TODO: Change process node to bash: https://github.com/google/zx

(async function createModule() {
  console.log(
    "\x1b[32m%s\x1b[0m",
    "[CREATE MODULE] Initializing...",
    "\x1b[0m"
  );

  console.log(
    "\x1b[32m%s\x1b[0m",
    `[CREATE MODULE] Creating module with name: ${MODULE_NAME}`,
    "\x1b[0m"
  );

  if (!MODULE_NAME) {
    console.log(
      "\x1b[31m",
      `[CREATE MODULE] ERROR: You need to provide a module name!`,
      "\x1b[0m"
    );
    process.exit(1);
  }

  if (fs.existsSync(MODULE_FOLDER)) {
    console.log(
      "\x1b[31m" +
        `[CREATE MODULE] ERROR: Module "${MODULE_NAME}" already exists!`,
      "\x1b[0m"
    );
    process.exit(1);
  }

  mkdirp(MODULE_FOLDER, { mode: DIR_PERMISSIONS })
    .then(() => {
      console.log(
        "\x1b[32m%s\x1b[0m",
        "[CREATE MODULE] Module folder was created successfully",
        "\x1b[0m"
      );

      fs.writeFile(`${MODULE_FOLDER}/index.js`, MODULE_TEMPLATE, (err) => {
        if (err) {
          console.error(
            "\x1b[31m%s\x1b[0m",
            "[CREATE MODULE] Error creating module file",
            "\x1b[0m"
          );
          console.error(err);
          process.exit(1);
        }

        console.log(
          "\x1b[32m%s\x1b[0m",
          `[CREATE MODULE] Module "${MODULE_NAME}" was created successfully.`,
          "\x1b[0m"
        );
      });
    })
    .catch((err) => {
      console.error(
        "\x1b[31m%s\x1b[0m",
        "[CREATE MODULE] Error creating module folder",
        "\x1b[0m"
      );
      console.error(err);
      process.exit(1);
    });
})();
