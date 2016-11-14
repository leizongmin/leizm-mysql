'use strict';

/**
 * super-orm tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */


function getConnectionConfig(config) {
  return Object.assign({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'test',
    connectionLimit: 2,
    charset: 'utf8mb4',
  }, config || {});
}
exports.getConnectionConfig = getConnectionConfig;

function getCacheConfig(config) {
  return Object.assign({
    redis: {
      host: '127.0.0.1',
      port: 6379,
      db: 15,
    },
    prefix: 'TEST:',
    ttl: 30,
  }, config || {});
}
exports.getCacheConfig = getCacheConfig;
