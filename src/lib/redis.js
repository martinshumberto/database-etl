// Lib
const redis = require("redis");

// Package
const log = require("./log");

let clientRedis;

const initRedis = () => {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    log.info("Initializing Redis connection");

    clientRedis = redis.createClient({
      host: "localhost",
      port: 6379,
    });
    clientRedis
      .connect()
      .then(() => {
        log.info("Redis Connected");
        resolve();
      })
      .catch((err) => {
        log.error("Redis Connection Error: ", err);
        reject(err);
        process.exit(1);
      });
  });
};

async function acquireLock(lockKey, lockTimeout) {
  return new Promise((resolve, reject) => {
    clientRedis
      .set(lockKey, "locked", "NX", "PX", lockTimeout)
      .then((result) => {
        if (result === "OK") {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
}

module.exports = {
  acquireLock,
  initRedis,
  clientRedis,
};
