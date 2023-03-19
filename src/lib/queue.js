const seriate = require("seriate");
const ETLConfig = require("../config/etl");
const log = require("./log");

class Queue {
  constructor(sourceTable, destinationTable, mapColumns, handleProcess) {
    this.sourceTable = sourceTable;
    this.destinationTable = destinationTable;
    this.mapColumns = mapColumns;
    this.batchSize = ETLConfig.batchSize;
    this.clusterId = ETLConfig.clusterId;
    this.handleProcess = handleProcess;
  }

  async addItem(startId, lastId, clusterId) {
    const query = `
      INSERT INTO etl_queue (
        source_table,
        destination_table,
        batch_size,
        start_id,
        last_id,
        status,
        cluster_id,
        attempts
      )
      VALUES (
        @sourceTable,
        @destinationTable,
        @batchSize,
        @startId,
        @lastId,
        'WAITING',
        @clusterId,
        0
      )
    `;

    const params = {
      sourceTable: this.sourceTable,
      destinationTable: this.destinationTable,
      batchSize: this.batchSize,
      startId,
      lastId,
      clusterId: clusterId || 0,
    };

    log.sql(`[INSERT] Query: ${query}`);
    log.sql(`[INSERT] Params: ${JSON.stringify(params)}`);

    try {
      await seriate.execute({
        query,
        params,
      });
    } catch (err) {
      log.error(`Processing stopped at function: addItem`);
      throw err;
    }
  }

  async getItem() {
    const query = `
      SELECT TOP 1 *
      FROM etl_queue
      WHERE source_table = @sourceTable
      AND destination_table = @destinationTable
      AND status = 'WAITING'
      AND cluster_id = @clusterId
      ORDER BY created_at ASC
    `;

    const params = {
      sourceTable: this.sourceTable,
      destinationTable: this.destinationTable,
      clusterId: this.clusterId || 0,
    };

    log.sql(`[SELECT] Query: ${query}`);
    log.sql(`[SELECT] Params: ${JSON.stringify(params)}`);

    try {
      const result = await seriate.execute({
        query,
        params,
      });
      return result[0];
    } catch (err) {
      log.error(`Processing stopped at function: getItem`);
      console.log(err);
      throw err;
    }
  }

  async updateStatus(id, status, errorMessage = null) {
    const query = `
      UPDATE etl_queue
      SET
          status = @status,
          started_at = CASE WHEN @status = 'RUNNING' THEN GETDATE() ELSE started_at END,
          ended_at = CASE WHEN @status = 'COMPLETED' THEN GETDATE() ELSE ended_at END,
          error_message = CASE WHEN @status = 'FAILED' THEN @errorMessage ELSE error_message END,
          attempts = CASE WHEN @status = 'FAILED' THEN attempts + 1 ELSE attempts END
      WHERE id = @id
    `;
    const params = {
      id,
      status,
      errorMessage: errorMessage ?? "",
    };

    log.sql(`[UPDATE] Query: ${query}`);
    log.sql(`[UPDATE] Params: ${JSON.stringify(params)}`);

    try {
      await seriate.execute({
        query,
        params,
      });
    } catch (err) {
      log.error(`Processing stopped at function: updateStatus`);
      console.log(err);
      throw err;
    }
  }

  async getLastRecordId() {
    const query = `
      SELECT TOP 1 last_id
      FROM etl_queue
      WHERE source_table = @sourceTable
      AND destination_table = @destinationTable
      ORDER BY last_id DESC
    `;

    const params = {
      sourceTable: this.sourceTable,
      destinationTable: this.destinationTable,
    };

    log.sql(`[SELECT] Query: ${query}`);
    log.sql(`[SELECT] Params: ${JSON.stringify(params)}`);

    try {
      const result = await seriate.execute({
        query,
        params,
      });
      return result[0]?.last_id ?? 0;
    } catch (err) {
      log.error(`Processing stopped at function: getLastRecordId`);
      throw err;
    }
  }

  async process() {
    log.info(
      `Processing queue [${this.sourceTable}] to [${this.destinationTable}]`
    );
    // Process queue
    let queueItem = await this.getItem();
    while (queueItem) {
      try {
        // Update status to running
        await this.updateStatus(queueItem.id, "RUNNING");
        // Process item
        await this.handleProcess(queueItem);
        // Update status to completed
        await this.updateStatus(queueItem.id, "COMPLETED");
      } catch (err) {
        log.error(
          `Error processing range id: ${queueItem.start_id} - ${queueItem.last_id}`
        );
        // Update status to failed
        await this.updateStatus(queueItem.id, "FAILED", err.message);
      }
      // Get next item
      queueItem = await this.getItem();
    }
  }
}

module.exports = Queue;
