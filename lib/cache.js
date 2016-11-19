'use strict';

/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const assert = require('assert');
const { EventEmitter } = require('events');
const Redis = require('ioredis');
const { createPromiseCallback } = require('./utils');

class Cache extends EventEmitter {

  /**
   * 创建 Cache 实例
   *
   * @param {Object} options
   *   - {Object} redis Redis连接信息 {host, port, password, db }
   *                    参考 https://github.com/luin/ioredis/blob/master/API.md#new_Redis
   *   - {Number} ttl 缓存时间，秒
   *   - {String} prefix Key前缀
   */
  constructor(options) {
    super();
    options = Object.assign({}, options || {});

    assert.ok(options.redis, `missing redis parameter`);
    this._redis = new Redis(options.redis);
    this._redis.on('error', err => {
      this.emit('error', err);
    });

    assert.ok(options.ttl, `missing ttl parameter`);
    assert.ok(options.ttl > 0, `parameter ttl must > 0`);
    this._ttl = Number(options.ttl);

    this._prefix = options.prefix || '';
  }

  /**
   * 获取实际的 Key
   *
   * @param {String} key
   * @return {String}
   */
  _getKey(key) {
    return this._prefix + key;
  }

  /**
   * 保存到缓存
   *
   * @param {Array} list 每个元素为 { key, data }
   * @param {Function} callback
   * @return {Promise}
   */
  saveList(list, callback) {
    callback = callback || createPromiseCallback();
    const p = this._redis.multi();
    const keys = [];
    for (const item of list) {
      const key = this._getKey(item.key);
      keys.push(key);
      p.setex(key, this._ttl, item.data);
    }
    p.exec(err => callback(err, keys));
    return callback.promise;
  }

  /**
   * 查询缓存
   *
   * @param {Array} list
   * @param {Function} callback
   * @return {Promise}
   */
  getList(list, callback) {
    callback = callback || createPromiseCallback();
    list = list.map(key => this._getKey(key));
    this._redis.mget(list, callback);
    return callback.promise;
  }

  /**
   * 从缓存中缓存
   *
   * @param {Array} list 每个元素为 { key, data }
   * @param {Function} callback
   * @return {Promise}
   */
  removeList(list, callback) {
    callback = callback || createPromiseCallback();
    const p = this._redis.multi();
    const keys = [];
    for (const item of list) {
      const key = this._getKey(item);
      keys.push(key);
      p.del(key);
    }
    p.exec(err => callback(err, keys));
    return callback.promise;
  }

  /**
   * 关闭连接
   *
   * @param {Function} callback
   * @return {Promise}
   */
  close(callback) {
    callback = callback || createPromiseCallback();
    this._redis.quit(callback);
    return callback.promise;
  }

}

module.exports = Cache;
