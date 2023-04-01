# ETL Database
Extract, transform, load.
Database available for use: MSSQL

## Features

- Extract data from database
- Transform data with custom functions
- Load data to database
- Cluster with PM2 to run multiple instances
- Logging


## Commands

```
npm run / yarn start:dev - Start
npm run / yarn start:prod - Start with PM2 to manager/monitor clusters
npm run / yarn stop - Stop clusters PM2
npm run / yarn delete - Delete clusters PM2
npm run / yarn monitor - Monitor clusters PM2
npm run / yarn etl:clear-logs - Clear files logs
npm run / yarn etl:reset-state - Resets the state and deletes data in the DB
npm run / yarn lint - Linting
```

## Installation

```bash
  npm i / yarn
  cp .env.example .env
```
    
## Environment Variables

To run this project, you will need to add the following environment variables to your .env file

`DB_SERVER` - Host

`DB_PORT` - Port (default: 1433)

`DB_DATABASE` - Database name

`DB_USERNAME` - Database username

`DB_PASSWORD` - Database password

`CLUSTER_SIZE` - How many clusters to run in production (default: 0)

`ETL_BATCH_SIZE` - How many records per batch to process

`ETL_MODULES` - The variable will be used to define the modules to be processed and used in commands. String with the name of the folders in `src/modules` within the modules separated by a comma (eg. "module1,module2,module3").

## Roadmap

- Add support to other databases
- Connect to multiple databases
- Change commands from node to bash
- Add tests
- Add typescript


## Support

For support, email [humberto@consilio.com.br](mailto:humberto@consilio.com.br) or join our Discord server [Discord Server](https://discord.gg/EAJBUX79cp).
