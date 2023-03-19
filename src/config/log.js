const path = require("path");

const ROOT_PATH = path.resolve(__dirname, "../..");
const PATH_FOLDER = `${ROOT_PATH}/logs`;

module.exports = {
  pathFolder: PATH_FOLDER,
  fileName: `${PATH_FOLDER}/etl_combined.log`,
  maxLogSize: 10485760,
  formats: {
    timestamp: "YYYY-MM-DD HH:mm:ss",
  },
  level: {
    error: {
      fileName: `${PATH_FOLDER}/etl_error.log`,
      maxLogSize: 5242880,
    },
    info: {
      fileName: `${PATH_FOLDER}/etl_info.log`,
      maxLogSize: 5242880,
    },
    warn: {
      fileName: `${PATH_FOLDER}/etl_warn.log`,
      maxLogSize: 5242880,
    },
    sql: {
      fileName: `${PATH_FOLDER}/etl_sql.log`,
      maxLogSize: 5242880,
    },
  },
};
