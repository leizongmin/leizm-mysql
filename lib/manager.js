'use strict';

/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const assert = require('assert');
const { EventEmitter } = require('events');
const coroutine = require('lei-coroutine');
const Cache = require('./cache');
const Connection = require('./connection');
const Model = require('./model');
const { createPromiseCallback } = require('./utils');

class Manager extends EventEmitter {

  /**
   * 创建 Manager
   *
   * @param {Object} options
   *   - {Object} redis { host, port, db, password }
   *   - {Array} connections { host, port, user, password, database, connectionLimit }
   *   - {Number} ttl 缓存时间，秒
   *   - {Stirng} prefix Key前缀
   */
  constructor(options) {
    super();
    options = Object.assign({}, options || {});

    this._cache = new Cache(options);
    this._connection = new Connection(options);

    this._models = new Map();
  }

  /**
   * 注册 model
   *
   * @param {Object} options
   *   - {String} table
   *   - {Object} fields 格式为 { name: info }
   *   - {String|Array} primary
   * @return {Object}
   */
  registerModel(options) {
    assert.ok(options, `please provide options`);
    const model = new Model({
      connection: this._connection,
      cache: this._cache,
      table: options.table,
      fields: options.fields,
      primary: options.primary,
    });
    this._models.set(options.table, model);
  }

  /**
   * 获取 model
   *
   * @param {String} name
   * @return {Object}
   */
  model(name) {
    return this._models.get(name);
  }

  /**
   * 关闭
   *
   * @param {Function} callback
   * @return {Promise}
   */
  close(callback) {
    callback = callback || createPromiseCallback();
    const self = this;
    coroutine(function* () {
      yield self._cache.close();
      yield self._connection.close();
      self._models.clear();
    }).then(ret => callback(null, ret)).catch(err => callback(err));
    return callback.promise;
  }

}

module.exports = Manager;
