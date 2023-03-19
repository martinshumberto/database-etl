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

    try {
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

            try {
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
              });
            } catch (err) {
              if (err.message.includes("Violation of PRIMARY KEY constraint")) {
                log.warn(
                  `Record already exists in ${this.destinationTable} with ID: #${record.id}`
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

                await execute({
                  query: updateQuery,
                  params: updateParams,
                });
              } else {
                log.error(`Processing stopped at function: processBatch`);
                throw err;
              }
            }
          }
        })
        .then((data) => {
          data.transaction.commit();
        });
    } catch (err) {
      log.error(`Processing stopped at function: processBatch`);
      throw err;
    }
  }

  async populateQueue() {
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
        log.error(`Processing stopped at function: populateQueue`);
        throw err;
      });

    const lastRecordId = await this.queue.getLastRecordId();

    if (lastRecordId) {
      const lastNewRecordId = data[data.length - 1].id;
      if (lastRecordId >= lastNewRecordId) {
        log.info(
          `No new records to populate queue. Last record ID: ${lastRecordId}`
        );
        return Promise.resolve();
      }
    }

    const records = data.map((record) => record.id);
    const numRecords = records.length;
    const numClusters = this.clusterSize;
    const queueBatchSize = this.batchSize;

    log.info(`Populating queue with ${numRecords} records`);

    while (records.length > 0) {
      const queue = [];

      for (
        let batchIndex = 0;
        batchIndex < Math.ceil(numRecords / queueBatchSize);
        batchIndex++
      ) {
        const startIndex = batchIndex * queueBatchSize;
        const endIndex = Math.min(startIndex + queueBatchSize, numRecords);
        const startId = records[startIndex];
        const lastId = records[endIndex - 1];

        const hash = fnv.hash(startId.toString(), 32).dec();
        const clusterId = numClusters === 0 ? 0 : hash % numClusters;

        queue.push({
          startId,
          lastId,
          clusterId,
        });
      }

      const promises = queue.map((item) => {
        return this.queue
          .addItem(item.startId, item.lastId, item.clusterId)
          .catch((err) => {
            log.error(`Processing stopped at function: populateQueue`);
            throw err;
          });
      });

      await Promise.all(promises).catch((err) => {
        log.error(`Processing stopped at function: populateQueue`);
        console.log(err);
        throw err;
      });

      if (records.length > queueBatchSize) {
        log.info(
          `Populated queue with ${queueBatchSize} records. ${records.length} records remaining`
        );
      }

      if (records.length <= queueBatchSize) {
        break;
      }

      records.splice(0, queueBatchSize);
    }

    Promise.resolve();
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
      try {
        await exponentialBackoff(() => this.processBatch(transformedData));
        log.info(
          `Processed batch with last id ${queueItem.last_id} [${this.sourceTable}] successfully`
        );
        Promise.resolve();
      } catch (err) {
        log.error(`${err.message}`);
        // Update item in queue as failed
        this.queue.updateStatus(queueItem.id, "FAILED", err?.message);
        process.exit(1);
      }
    } else {
      log.warn(`No new records to process in ${this.sourceTable}`);
      Promise.resolve();
    }
  }

  async start() {
    log.info(
      `Starting ETL process for [${this.sourceTable}] to [${this.destinationTable}] on Cluster #${this.clusterId}`
    );

    // Populate queue with records to process on Cluster Master
    if (this.clusterId === 0) {
      log.info(
        `Populating queue for [${this.sourceTable}] to [${this.destinationTable}]`
      );
      await this.populateQueue();
      log.info(
        `Queue populated finished for [${this.sourceTable}] to [${this.destinationTable}]`
      );
      log.info(
        `Cluster #${this.clusterId} is released for processing and will start now`
      );
    }

    // Sleep for 1 second per cluster to avoid concurrency issues
    const sleep = require("util").promisify(setTimeout);
    await sleep(this.clusterId * 1000);

    await exponentialBackoff(() => this.queue.process());

    log.info(
      `Finished ETL for ${this.sourceTable} to ${this.destinationTable}`
    );
  }
}

module.exports = ETL;
