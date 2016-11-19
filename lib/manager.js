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
   *   - {Number} ttl 缓存时间，秒
   *   - {Stirng} prefix Key前缀
   *   - {Array} connections { host, port, user, password, database, connectionLimit }
   */
  constructor(options) {
    super();
    options = Object.assign({}, options || {});

    this.cache = new Cache(options);
    this.connection = new Connection(options);

    this._models = new Map();
  }

  /**
   * 注册 model
   *
   * @param {String} name
   * @param {Object} options
   *   - {String} table
   *   - {Object} fields 格式为 { name: info }
   *   - {String|Array} primary
   *   - {Boolean} autoIncrement
   * @return {Object}
   */
  registerModel(name, options) {
    assert.equal(typeof name, 'string', `model name must be a string`);
    assert.ok(name, `model name cannot be empty`);
    assert.ok(options, `please provide options`);
    const model = new Model(Object.assign({
      connection: this.connection,
      cache: this.cache,
    }, options));
    this._models.set(name, model);
  }

  /**
   * 判断 model 是否存在
   *
   * @param {String} name
   * @return {Boolean}
   */
  hasModel(name) {
    return this._models.has(name);
  }

  /**
   * 获取 model
   *
   * @param {String} name
   * @return {Object}
   */
  model(name) {
    if (!this._models.has(name)) {
      throw new Error(`model "${ name }" does not exists`);
    }
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
      yield self.cache.close();
      yield self.connection.close();
      self._models.clear();
    }).then(ret => callback(null, ret)).catch(err => callback(err));
    return callback.promise;
  }

}

module.exports = Manager;
