# ETL Database
Extract, transform, load.
Database available for use: MSSQL

You can use this tool to extract data from a database, transform it and load it into the same database in different tables (soon you can load it to other databases). The tool is modular, so you can create your own modules to extract, transform and load data. The tool is also clustered, so you can run multiple instances of the tool to process data faster.

## Features

- Extract data from database
- Transform data with custom functions
- Load data to database
- Cluster with PM2 to run multiple instances
- Logging

## Usage

Copy the `.env.example` file to `.env` and fill in the environment variables.

```bash
cp .env.example .env
```

Install the dependencies

```bash
npm i / yarn
```

Create a new module

```bash
npm run / yarn etl:create-module [name-module]
```

Define the modules to be processed in the `.env` file

```bash
ETL_MODULES=module1,module2,module3
```

Configure the modules in the `src/modules/[name-module]/index.js` file

```js
//...

const sourceTable = "sourceTableOnDatabase"; // Table to extract data
const destinationTable = "destinationTableOnDatabase"; // Table to load data

// Columns to extract from the source table and load to the destination table.
// You can use items with just a destination table, to extract the content 
// through a query inside the `transformData` function
const mapColumns = [
  { source: "id", destination: "id" },
  { destination: "name" }
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

//...
```

Start the ETL process

```bash
npm run / yarn start:dev
```

or with clusters (PM2) to run multiple instances of the tool to process data faster
Change the `CLUSTER_SIZE` variable in the `.env` file to the number of clusters you want to run

```bash
CLUSTER_SIZE=4
```

```bash
npm run / yarn start:prod
```

## Available commands

These are the commands currently supported by the tool

- `npm run / yarn start:dev`: Starts the ETL process in development mode
- `npm run / yarn start:prod`: Starts the ETL process with PM2 to manager/monitor clusters
- `npm run / yarn stop`: Stops the ETL process with PM2
- `npm run / yarn delete`: Deletes the ETL process with PM2
- `npm run / yarn monitor`: Monitor the ETL process with PM2
- `npm run / yarn etl:create-module [name-module]`: Creates a new module
- `npm run / yarn etl:clear-logs`: Clears the log files
- `npm run / yarn etl:reset-state`: Resets the state and deletes data in the DB
- `npm run / yarn lint`: Linting

## Installation

```bash
  npm i / yarn
  cp .env.example .env
```
    
## Environment Variables

To run this project, you will need to add the following environment variables to your .env file


- `DB_SERVER` - Host
- `DB_PORT` - Port (default: 1433)
- `DB_DATABASE` - Database name
- `DB_USERNAME` - Database username
- `DB_PASSWORD` - Database password
- `CLUSTER_SIZE` - How many clusters to run in production (default: 0)
- `ETL_BATCH_SIZE` - How many records per batch to process
- `ETL_MODULES` - The variable will be used to define the modules to be processed and used in commands. String with the name of the folders in `src/modules` within the modules separated by a comma (eg. "module1,module2,module3").

## 💡 Future improvement ideas

- Add support to other databases (mysql, postgres, mongodb)
- Add connection to multiple databases
- Change commands from node to bash (https://github.com/google/zx)
- Add tests
- Add typescript
- Transform the tool into a library

## Contributing

Everyone is very welcome to contribute to this project.
You can contribute just by submitting bugs or suggesting improvements by
[opening an issue on GitHub](https://github.com/martinshumberto/database-etl/issues).

## Support

For support, email [humberto@consilio.com.br](mailto:humberto@consilio.com.br) or join our Discord server [Discord Server](https://discord.gg/EAJBUX79cp).

## License

Licensed under [MIT License](LICENSE). © Humberto Martins.
