import './apm';
import { LoggerService, type DatabaseManagerInstance } from '@frmscoe/frms-coe-lib';
import { StartupFactory, type IStartupService } from '@frmscoe/frms-coe-startup-lib';
import { configuration } from './config';
import { handleExecute } from './services/logic.service';
import { Singleton } from './services/services';

const databaseManagerConfig = {
  redisConfig: {
    db: configuration.redis.db,
    servers: configuration.redis.servers,
    password: configuration.redis.password,
    isCluster: configuration.redis.isCluster,
  },
  configuration: {
    databaseName: configuration.db.configurationDb,
    certPath: configuration.db.dbCertPath,
    password: configuration.db.password,
    url: configuration.db.url,
    user: configuration.db.user,
    localCacheEnabled: configuration.db.cacheEnabled,
    localCacheTTL: configuration.db.cacheTTL,
  },
  transaction: configuration.db.transactionDb
    ? {
        databaseName: configuration.db.transactionDb,
        url: configuration.db.url,
        password: configuration.db.password,
        user: configuration.db.user,
        certPath: configuration.db.dbCertPath,
      }
    : undefined,
  transactionHistory: {
    databaseName: configuration.db.transactionHistoryDb,
    url: configuration.db.url,
    password: configuration.db.password,
    user: configuration.db.user,
    certPath: configuration.db.dbCertPath,
  },
};

export const loggerService: LoggerService = new LoggerService();
let databaseManager: DatabaseManagerInstance<typeof databaseManagerConfig>;

export const dbInit = async (): Promise<void> => {
  databaseManager = await Singleton.getDatabaseManager(databaseManagerConfig);
  loggerService.log(databaseManager.isReadyCheck())
};

/*
 * Initialize the clients and start the server
 */
export let server: IStartupService;

export const runServer = async (): Promise<void> => {
  server = new StartupFactory();
  if (configuration.env !== 'test') {
    let isConnected = false;
    for (let retryCount = 0; retryCount < 10; retryCount++) {
      loggerService.log('Connecting to nats server...');
      if (!(await server.init(handleExecute))) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else {
        loggerService.log('Connected to nats');
        isConnected = true;
        break;
      }
    }

    if (!isConnected) {
      throw new Error('Unable to connect to nats after 10 retries');
    }
  }
};

process.on('uncaughtException', (err) => {
  loggerService.error('process on uncaughtException error', err, 'index.ts');
});

process.on('unhandledRejection', (err) => {
  loggerService.error(`process on unhandledRejection error: ${JSON.stringify(err) ?? '[NoMetaData]'}`);
});


(async () => {
  try {
    if (configuration.env !== 'test') {
      await dbInit();
      await runServer();
    }
  } catch (err) {
    loggerService.error(`Error while starting services on Worker ${process.pid}`, err);
    process.exit(1);
  }
})();

export { databaseManager };
