// Lib
const seriate = require("seriate");
const fnv = require("fnv-plus");

// Package
const log = require("./log");
const ETLConfig = require("../config/etl");
const dbConfig = require("../config/db");
const { exponentialBackoff } = require("./helpers");
const Queue = require("./queue");

class ETL {
  constructor(sourceTable, destinationTable, mapColumns, transformData) {
    this.sourceTable = sourceTable;
    this.destinationTable = destinationTable;
    this.mapColumns = mapColumns;
    this.transformData = transformData;
    this.batchSize = ETLConfig.batchSize;
    this.clusterId = ETLConfig.clusterId;
    this.clusterSize = ETLConfig.clusterSize;
    this.queue = new Queue(
      sourceTable,
      destinationTable,
      mapColumns,
      this.handleProcess.bind(this)
    );
  }

  async getRecordsToProcess(queueItem) {
    const startId = queueItem.start_id;
    const endId = queueItem.last_id;

    const query = `
        SELECT TOP ${this.batchSize} *
        FROM ${this.sourceTable}
        WHERE id >= @startId
        AND id <= @endId
        ORDER BY id ASC
        `;

    const params = {
      startId,
      endId,
    };

    log.sql(`[SELECT] Query: ${query}`);
    log.sql(`[SELECT] Params: ${JSON.stringify(params)}`);

    return await seriate
      .execute({
        query,
        params,
      })
      .catch((err) => {
        log.error(`Processing stopped at function: getRecordsToProcess`);
        throw err;
      });
  }

  async processBatch(transformedData) {
    const destinationColumns = Object.values(this.mapColumns).map(
      (column) => column.destination
    );
    const destinationColumnsString = destinationColumns.join(",");

    return await seriate
      .executeTransaction(dbConfig, async (execute) => {
        for (const record of transformedData) {
          const placeholders = [];
          const values = {};
          const recordPlaceholders = [];

          for (const column of this.mapColumns) {
            const value = record[column?.destination];
            if (value !== null && value !== undefined) {
              recordPlaceholders.push(`@${column.destination}_${record.id}`);

              if (value instanceof Date) {
                values[`${column.destination}_${record.id}`] = new Date(value)
                  .toISOString()
                  .slice(0, 19)
                  .replace("T", " ");
              } else if (Array.isArray(value)) {
                values[`${column.destination}_${record.id}`] =
                  JSON.stringify(value);
              } else {
                values[`${column.destination}_${record.id}`] = value;
              }
            } else {
              recordPlaceholders.push(`NULL`);
            }
          }
          placeholders.push(`(${recordPlaceholders.join(",")})`);

          const placeholdersValuesString = placeholders.join(",");
          const destinationQuery = `
                    SET IDENTITY_INSERT ${this.destinationTable} ON
                    INSERT INTO ${this.destinationTable} (${destinationColumnsString}) VALUES ${placeholdersValuesString}
                    SET IDENTITY_INSERT ${this.destinationTable} OFF
                `;

          log.sql(`[INSERT] Query: ${destinationQuery}`);
          log.sql(`[INSERT] Params: ${JSON.stringify(values)}`);

          await execute({
            query: destinationQuery,
            params: values,
          }).catch(async (err) => {
            if (err.message.includes("Violation of PRIMARY KEY constraint")) {
              log.sql(
                `Record already exists in ${this.destinationTable} with ID: #${record.id} - Updating record...`
              );

              const primaryKeyColumn = "id"; // Get primary key column from destination table

              const updateValues = destinationColumns.map((column, index) => {
                return {
                  column,
                  placeholder: recordPlaceholders[index],
                };
              });

              // Remove PRIMARY KEY from updateValues
              const index = updateValues.findIndex(
                (item) => item.column === primaryKeyColumn
              );
              if (index > -1) {
                updateValues.splice(index, 1);
              }

              const updateQuery = `
                    UPDATE ${this.destinationTable} SET ${updateValues
                .map((item) => `${item.column} = ${item.placeholder}`)
                .join(", ")}
                    WHERE ${primaryKeyColumn} = ${record[primaryKeyColumn]}
                `;

              // Remove PRIMARY KEY from values
              delete values[`${primaryKeyColumn}_${record.id}`];

              const updateParams = {
                ...values,
              };

              log.sql(`[UPDATE] Query: ${updateQuery}`);
              log.sql(`[UPDATE] Params: ${JSON.stringify(updateParams)}`);

              return await execute({
                query: updateQuery,
                params: updateParams,
              });
            } else {
              return Promise.reject(err);
            }
          });
        }
        Promise.resolve();
      })
      .then((data) => {
        data.transaction.commit();
      })
      .catch((err) => {
        log.error(err);
        return Promise.reject(err);
      });
  }

  async handleProcess(queueItem) {
    const data = await exponentialBackoff(() =>
      this.getRecordsToProcess(queueItem)
    );

    if (data.length === 0) {
      return;
    }

    log.info(
      `Processing range: [${this.sourceTable}] ${data[0].id} - ${
        data[data.length - 1].id
      }`
    );

    const transformedData = await this.transformData(data);

    if (transformedData.length > 0) {
      return await this.processBatch(transformedData)
        .then(() => {
          return Promise.resolve();
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    } else {
      log.warn(`No new records to process in ${this.sourceTable}`);
      return Promise.resolve();
    }
  }

  async populateQueue() {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      const query = `
      SELECT id
      FROM ${this.sourceTable}
      ORDER BY id ASC
      `;
      log.sql(`[SELECT] Query: ${query}`);

      const data = await seriate
        .execute({
          query,
        })
        .catch((err) => {
          log.error(err);
          log.error(`Processing stopped at function: populateQueue`);
          reject(err);
        });

      const lastRecordId = await this.queue.getLastRecordId();

      if (lastRecordId) {
        const lastNewRecordId = data[data.length - 1].id;
        if (lastRecordId >= lastNewRecordId) {
          log.info(
            `No new records to populate queue. Last record ID: ${lastRecordId}`
          );
          return resolve();
        }
      }

      const records = data.map((record) => record.id);
      const numClusters = this.clusterSize;
      const queueBatchSize = this.batchSize;

      log.info(`Populating queue with ${records.length} records`);

      try {
        while (records.length > 0) {
          const queue = [];

          for (
            let batchIndex = 0;
            batchIndex < Math.ceil(records.length / queueBatchSize);
            batchIndex++
          ) {
            const startIndex = batchIndex * queueBatchSize;
            const endIndex = Math.min(
              startIndex + queueBatchSize,
              records.length
            );
            const startId = records[startIndex];
            const lastId = records[endIndex - 1];

            if (startId && lastId) {
              const hash = fnv.hash(startId?.toString(), 32).dec();
              const clusterId = numClusters === 0 ? 0 : hash % numClusters;

              queue.push({
                startId,
                lastId,
                clusterId,
              });

              if (records.length > 0) {
                records.splice(startIndex, queueBatchSize);
              }
            }
          }

          const promises = queue.map((item) =>
            this.queue.addItem(item.startId, item.lastId, item.clusterId)
          );

          const results = await Promise.allSettled(promises);
          resolve(results);
        }
      } catch (err) {
        log.error(err);
        log.error(`Processing stopped at function: populateQueue`);
        reject(err);
      }
    });
  }

  async populate() {
    log.info(
      `Populating queue for [${this.sourceTable}] to [${this.destinationTable}]`
    );
    await this.populateQueue();
    log.info(
      `Queue populated finished for [${this.sourceTable}] to [${this.destinationTable}]`
    );
  }

  async start() {
    log.info(
      `Starting ETL process for [${this.sourceTable}] to [${this.destinationTable}] on Cluster #${this.clusterId}`
    );

    // Sleep for 1 second per cluster to avoid concurrency issues
    const sleep = require("util").promisify(setTimeout);
    await sleep(this.clusterId * 1000);

    const startTime = Date.now();
    let elapsedTime = 0;
    const maxElapsedTime = 1 * 60 * 1000; // 1 minute

    while (elapsedTime < maxElapsedTime) {
      await this.queue.process();
      elapsedTime = Date.now() - startTime;
      await sleep(20 * 1000);
      log.info(
        `ETL process for [${this.sourceTable}] waiting for more records to process...`
      );
    }

    log.info(
      `No more records ETL for ${this.sourceTable} to ${this.destinationTable}`
    );
    return Promise.resolve();
  }
}

module.exports = ETL;
