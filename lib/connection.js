'use strict';

/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const assert = require('assert');
const { EventEmitter } = require('events');
const { createPoolCluster, escape: sqlEscape, escapeId: sqlEscapeId, format: sqlFormat } = require('mysql');
const { createPromiseCallback } = require('lei-utils');

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
  return query.replace(/:(:?\w+)/g, (txt, key) => {
    if (values.hasOwnProperty(key)) {
      if (key[0] === ':') {
        return connection.escapeId(values[key].slice(1));
      }
      return connection.escape(values[key]);
    }
    return txt;
  });
}

class Connection extends EventEmitter {

  /**
   * 创建 Connection
   *
   * @param {Object} options
   *   - {Array} connections 连接信息数组，第一个为 master
   *                         包含 { host, port, user, password, database, connectionLimit }
   *                         参考 https://www.npmjs.com/package/mysql#connection-options
   *                         和   https://www.npmjs.com/package/mysql#pool-options
   */
  constructor(options) {
    super();
    this._options = options = Object.assign({}, options || {});

    assert.ok(Array.isArray(options.connections), `connections must be an array`);
    assert.ok(options.connections.length >= 1, `connections must includes at least one item`);
    this._poolCluster = createPoolCluster();
    this._poolCluster.add('MASTER', options.connections[0]);
    options.connections.slice(1).forEach((config, index) => {
      this._poolCluster.add(`SLAVE${ index }`, config);
    });
  }

  /**
   * 关闭连接
   *
   * @param {Function} callback
   * @return {Promise}
   */
  close(callback) {
    callback = callback || createPromiseCallback();
    this._poolCluster.end(callback);
    return callback.promise;
  }

  /**
   * 获取一个原始连接
   *
   * @param {String} selector
   * @param {Function} callback
   * @return {Promise}
   */
  _getConnection(selector, callback) {
    callback = callback || createPromiseCallback();
    this._poolCluster.getConnection(selector, callback);
    return callback.promise;
  }

  getConnection(callback) {
    return this._getConnection('*', callback);
  }

  getMasterConnection(callback) {
    return this._getConnection('Master', callback);
  }

  getSlaveConnection(callback) {
    return this._getConnection('SLAVE*', callback);
  }

  /**
   * 查询
   *
   * @param {String} selector
   * @param {String} sql
   * @param {Function} callback
   * @return {Promise}
   */
  _query(selector, sql, callback) {
    callback = callback || createPromiseCallback();
    this._getConnection(selector, (err, connection) => {
      if (err) return callback(err);
      connection.query(sql, (err, ret) => {
        connection.release();
        callback(err, ret);
      });
    });
    return callback.promise;
  }

  query(sql, callback) {
    return this._query('*', sql, callback);
  }

  queryMaster(sql, callback) {
    return this._query('MASTER', sql, callback);
  }

  querySlave(sql, callback) {
    return this._query('SLAVE*', sql, callback);
  }

  escape(value) {
    return sqlEscape(value);
  }

  escapeId(value) {
    return sqlEscapeId(value);
  }

  /**
   * 格式化查询
   *
   * @param {String} sql
   * @param {Array|Object} values
   * @return {String}
   */
  format(sql, values) {
    if (Array.isArray(values)) {
      return sqlFormat(sql, values);
    }
    return sqlFormatObject(this, sql, values);
  }

}

module.exports = Connection;
