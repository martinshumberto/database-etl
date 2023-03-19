module.exports = {
  batchSize: parseInt(process.env.ETL_BATCH_SIZE) || 10,
  modules: [process.env.ETL_MODULES],
  clusterId: parseInt(process.env.NODE_APP_INSTANCE) || 0,
  clusterSize: parseInt(process.env.CLUSTER_SIZE) || 0,
};
