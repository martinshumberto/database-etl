const { createLogger, format, transports } = require("winston");
const { combine, timestamp, printf } = format;
const logConfig = require("../config/log");
const fs = require("fs");
const util = require("util");
const winston = require("winston");
require("colors");

if (!fs.existsSync(logConfig.pathFolder)) {
  fs.mkdirSync(logConfig.pathFolder);
}

const formatConsole = printf(({ level, message, timestamp, ...args }) => {
  const colors = {
    info: "green",
    warn: "yellow",
    error: "red",
    sql: "magenta",
  };

  const color = colors[level] || "white";

  let msg = message;
  if (Object.keys(args).length) {
    msg += "\n" + util.inspect(args, { colors: true });
  }

  return `[${timestamp}] ${level.toUpperCase()[color]}: ${msg}`;
});

const formatFile = printf(({ level, message, timestamp, ...args }) => {
  let msg = message;
  if (Object.keys(args).length) {
    msg += "\n" + util.inspect(args);
  }
  return `[${timestamp}] ${level.toUpperCase()}: ${msg}`;
});

// Create filters for each log level to separate them into different files
const infoFilter = winston.format((info, opts) => {
  return info.level === "info" ? info : false;
});
const warnFilter = winston.format((info, opts) => {
  return info.level === "warn" ? info : false;
});
const errorFilter = winston.format((info, opts) => {
  return info.level === "error" ? info : false;
});
const sqlFilter = winston.format((info, opts) => {
  return info.level === "sql" ? info : false;
});
const consoleFilter = winston.format((info, opts) => {
  return info.level !== "sql" ? info : false;
});

const logger = createLogger({
  level: "debug",
  levels: {
    emerg: 0,
    alert: 1,
    crit: 2,
    error: 3,
    warn: 4,
    notice: 5,
    info: 6,
    debug: 7,
    sql: 8,
  },
  transports: [
    new winston.transports.File({
      filename: logConfig.level.info.fileName,
      maxsize: logConfig.level.info.maxLogSize,
      format: combine(
        infoFilter(),
        timestamp({ format: logConfig.formats.timestamp }),
        formatFile
      ),
      level: "info",
    }),
    new winston.transports.File({
      filename: logConfig.level.error.fileName,
      maxsize: logConfig.level.error.maxLogSize,
      format: combine(
        errorFilter(),
        timestamp({ format: logConfig.formats.timestamp }),
        formatFile
      ),
      level: "error",
    }),
    new winston.transports.File({
      filename: logConfig.level.warn.fileName,
      maxsize: logConfig.level.warn.maxLogSize,
      format: combine(
        warnFilter(),
        timestamp({ format: logConfig.formats.timestamp }),
        formatFile
      ),
      level: "warn",
    }),
    new winston.transports.File({
      filename: logConfig.level.sql.fileName,
      maxsize: logConfig.level.sql.maxLogSize,
      format: combine(
        sqlFilter(),
        timestamp({ format: logConfig.formats.timestamp }),
        formatFile
      ),
      level: "sql",
    }),
    new winston.transports.File({
      format: combine(
        consoleFilter(),
        timestamp({ format: logConfig.formats.timestamp })
      ),
      filename: logConfig.fileName,
      maxsize: logConfig.maxLogSize,
    }),
    new transports.Console({
      format: combine(
        consoleFilter(),
        timestamp({ format: logConfig.formats.timestamp }),
        formatConsole
      ),
    }),
  ],
});

function info(...args) {
  logger.info(...args);
}

function error(...args) {
  logger.error(...args);
}

function warn(...args) {
  logger.warn(...args);
}

function sql(...args) {
  logger.sql(...args);
}

module.exports = {
  info,
  error,
  warn,
  sql,
};
