'use strict';

/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const { escape: sqlEscape, escapeId: sqlEscapeId, format: sqlFormat } = require('mysql');

module.exports = exports = require('lei-utils').extends(exports);

exports.sqlEscape = sqlEscape;
exports.sqlEscapeId = sqlEscapeId;
exports.sqlFormat = sqlFormat;

/**
 * 格式化 SQL 查询
 * 格式： SELECT * FROM ::table WHERE `title`=:title
 *
 * @param {Object} connection
 * @param {String} query
 * @param {Object} values
 * @return {String}
 */
function sqlFormatObject(connection, query, values) {
  return query.replace(/:((:)?\w+)/g, (txt, key) => {
    const isId = key[0] === ':';
    if (isId) key = key.slice(1);
    if (values.hasOwnProperty(key)) {
      if (isId) {
        return connection.escapeId(values[key]);
      }
      return connection.escape(values[key]);
    }
    return txt;
  });
}
exports.sqlFormatObject = sqlFormatObject;

/**
 * 判断是否为 Connection 实例
 *
 * @param {Object} connection
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
