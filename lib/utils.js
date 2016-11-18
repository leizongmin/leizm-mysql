'use strict';

/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const createDebug = require('debug');
const { escape: sqlEscape, escapeId: sqlEscapeId, format: sqlFormat } = require('mysql');

module.exports = exports = require('lei-utils').extends(exports);


function debug(name) {
  return createDebug('super-orm:' + name);
}
exports.modelDebug = debug('model');
exports.schemaDebug = debug('schema');
exports.connectionDebug = debug('connection');
exports.managerDebug = debug('manager');
exports.cacheDebug = debug('cache');
exports.queryDebug = debug('query');
exports.otherDebug = debug('other');

exports.sqlEscape = sqlEscape;
exports.sqlEscapeId = sqlEscapeId;
exports.sqlFormat = sqlFormat;

/**
 * 格式化 SQL 查询
 * 格式： SELECT * FROM ::table WHERE `title`=:title
 *
 * @param {String} query
 * @param {Object} values
 * @param {Boolean} disable$
 * @return {String}
 */
function sqlFormatObject(query, values, disable$) {
  return query.replace(/:((:)?[\w$]+)/g, (txt, key) => {
    const isId = key[0] === ':';
    if (isId) key = key.slice(1);
    if (values.hasOwnProperty(key)) {
      if (disable$) {
        return values[key];
      }
      if (isId) {
        return sqlEscapeId(values[key]);
      }
      return sqlEscape(values[key]);
    }
    return txt;
  });
}
exports.sqlFormatObject = sqlFormatObject;

/**
 * 判断是否为 Connection 实例
 *
 * @param {Object} conn
 * @return {Boolean}
 */
function isConnectionInstance(conn) {
  return conn && conn._poolCluster &&
         typeof conn.getConnection === 'function' &&
         typeof conn.getMasterConnection === 'function' &&
         typeof conn.getSlaveConnection === 'function' &&
         typeof conn.query === 'function' &&
         typeof conn.queryMaster === 'function' &&
         typeof conn.querySlave === 'function' &&
         typeof conn.escape === 'function' &&
         typeof conn.escapeId === 'function' &&
         typeof conn.format === 'function';
}
exports.isConnectionInstance = isConnectionInstance;

/**
 * 判断是否为 Cache 实例
 *
 * @param {Object} cache
 * @return {Boolean}
 */
function isCacheInstance(cache) {
  return cache && cache._redis &&
         typeof cache.saveList === 'function' &&
         typeof cache.removeList === 'function' &&
         typeof cache.getList === 'function';
}
exports.isCacheInstance = isCacheInstance;

/**
 * 根据对象生成 SQL UPDATE 语句
 *
 * @param {Object} data
 * @return {String}
 */
function sqlUpdateString(data) {
  return Object.keys(data)
          .map(name => `${ sqlEscapeId(name) }=${ sqlEscape(data[name]) }`)
          .join(', ');
}
exports.sqlUpdateString = sqlUpdateString;

/**
 * 生成 SQL LIMIT 语句
 *
 * @param {Number} skip
 * @param {Number} limit
 * @return {String}
 */
function sqlLimitString(skip, limit) {
  skip = Number(skip);
  limit = Number(limit);
  if (limit > 0) {
    if (skip > 0) {
      return `LIMIT ${ skip },${ limit }`;
    }
    return `LIMIT ${ limit }`;
  }
  return `LIMIT ${ skip },18446744073709551615`;
}
exports.sqlLimitString = sqlLimitString;

/**
 * 判断是否为更新操作的 SQL
 *
 * @param {String} sql
 * @return {Boolean}
 */
function isUpdateSQL(sql) {
  return /^SELECT\s/.test(sql);
}
exports.isUpdateSQL = isUpdateSQL;
