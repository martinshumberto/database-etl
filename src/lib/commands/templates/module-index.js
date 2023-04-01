const ETL = require("../../lib/etl");

const sourceTable = "sourceTableOnDatabase";
const destinationTable = "destinationTableOnDatabase";
const mapColumns = [
  { source: "id", destination: "id" },
  // TODO: Add mapping for other columns
];

async function transformData(data) {
  const transformedData = data.map((record) => {
    return {
      id: record.id,
      // TODO: Add logic to transform data
    };
  });
  return transformedData;
}

const etlInit = new ETL(
  sourceTable,
  destinationTable,
  mapColumns,
  transformData
);

module.exports = {
  sourceTable,
  destinationTable,
  start: async () => await etlInit.start(),
  populate: async () => await etlInit.populate(),
};
