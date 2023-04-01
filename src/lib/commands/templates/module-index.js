const ETL = require("../../lib/etl");

const sourceTable = "sourceTableOnDatabase";
const destinationTable = "destinationTableOnDatabase";
const mapColumns = [
  { source: "id", destination: "id" },
  // TODO: Add mapping for other columns
];

async function transformData(data) {
  const transformedData = [];

  for (let i = 0; i < data.length; i++) {
    const record = data[i];

    // TODO: Add logic to transform data

    transformedData.push({
      id: record.id,
      // TODO: More columns
    });
  }

  return transformedData;
}

const etlInit = new ETL(
  sourceTable,
  destinationTable,
  mapColumns,
  transformData
);

module.exports = {
  start: async () => await etlInit.start(),
  populate: async () => await etlInit.populate(),
};
