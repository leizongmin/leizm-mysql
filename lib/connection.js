'use strict';

/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const assert = require('assert');
const { EventEmitter } = require('events');
const { createPoolCluster } = require('mysql');
const {
  createPromiseCallback, sqlEscape, sqlEscapeId, sqlFormat, sqlFormatObject,
  isUpdateSQL,
} = require('./utils');
const coroutine = require('lei-coroutine');

/**
 * 原始 connection 增加 Promise 支持
 *
 * @param {Object} connection
 * @return {Object}
 */
function wrapConnection(connection) {
  return new Proxy(connection, {
    get(target, name) {
      switch (name) {
      case 'query':
      case 'beginTransaction':
      case 'commit':
      case 'rollback':
        return function (...args) {
          const cb = args[args.length - 1];
          if (typeof cb === 'function') {
            return target[name](...args);
          }
          return coroutine.cb(target, name, ...args);
        };
      default:
        return target[name];
      }
    },
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

    this._poolCluster.on('error', err => this.emit('error', err));
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
   * 获取一个原始连接（增加 Promise 支持）
   *
   * @param {String} selector
   * @param {Function} callback
   * @return {Promise}
   */
  _getConnection(selector, callback) {
    callback = callback || createPromiseCallback();
    this._poolCluster.getConnection(selector, (err, connection) => {
      if (err) return callback(err);
      callback(null, wrapConnection(connection));
    });
    return callback.promise;
  }

  getConnection(callback) {
    return this._getConnection('*', callback);
  }

  getMasterConnection(callback) {
    return this._getConnection('MASTER', callback);
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
    this._poolCluster.getConnection(selector, (err, connection) => {
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

  /**
   * 智能查询，更新操作会在 MASTER 执行，其他在任意服务器查询
   *
   * @param {String} sql
   * @param {Function} callback
   * @return {Promise}
   */
  smartQuery(sql, callback) {
    if (isUpdateSQL(sql)) {
      return this.queryMaster(sql, callback);
    }
    return this.query(sql, callback);
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
    return sqlFormatObject(sql, values);
  }

}

module.exports = Connection;
