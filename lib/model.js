'use strict';

/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const assert = require('assert');
const {
  createPromiseCallback, isConnectionInstance, isCacheInstance, isUpdateSQL,
} = require('./utils');
const Schema = require('./schema');
const QueryBuilder = require('./query');


class Model {

  /**
   * 创建 Model
   *
   * @param {Object} options
   *   - {Object} connection
   *   - {Object} cache
   *   - {String} table
   *   - {Object} fields 格式为 { name: info }
   *   - {String|Array} primary
   *   - {Boolean} autoIncrement
   */
  constructor(options) {
    options = Object.assign({}, options || {});

    assert.ok(isConnectionInstance(options.connection), `connection must be an Connection instance`);
    this.connection = options.connection;

    assert.ok(isCacheInstance(options.cache), `cache must be an Cache instance`);
    this.cache = options.cache;

    assert.ok(options.table, `must provide table name`);
    assert.ok(typeof options.table === 'string', `table name must be a string`);
    this.tableName = options.table;

    if (options.primary) {
      assert.ok(typeof options.primary === 'string' || Array.isArray(options.primary), `primary must be a string or array`);
      if (Array.isArray(options.primary)) {
        options.primary.forEach(name => {
          assert.ok(typeof name === 'string', `every item of primary must be a string`);
        });
        // 包装 key 是按顺序排列的
        this.primaryKey = options.primary.slice().sort();
      } else {
        this.primaryKey = [ options.primary ];
      }
    } else {
      this.primaryKey = null;
    }

    if (options.autoIncrement) {
      assert.equal(this.primaryKey.length, 1, `invalid primary key number when autoIncrement=true`);
      this.primaryKeyAutoIncrement = true;
    } else {
      this.primaryKeyAutoIncrement = false;
    }

    this.schema = new Schema(options);
  }

  /**
   * 从一行数据中获取主键标志符
   *
   * @param {Object} data
   * @param {Boolean} strict
   * @return {String}
   */
  getPrimaryCacheKey(data, strict) {
    assert.ok(this.primaryKey, `table "${ this.tableName }" does not have primary key`);
    const key = this.primaryKey.map(name => {
      if (strict) {
        assert.ok(name in data, `missing primary key "${ name }" in this data row`);
      }
      return `${ name }_${ data[name] }`;
    }).join('&');
    return `${ this.tableName }:r:${ key }`;
  }

  /**
   * 从一行数据中保留主键的数据
   *
   * @param {Object} data
   * @return {Object}
   */
  keepPrimaryFields(data) {
    assert.ok(this.primaryKey, `table "${ this.tableName }" does not have primary key`);
    const ret = {};
    for (const name of this.primaryKey) {
      assert.ok(name in data, `missing primary key "${ name }" in this data row`);
      ret[name] = data[name];
    }
    return ret;
  }

  /**
   * 将结果保存到缓存
   *
   * @param {Array|Object} data
   * @param {Function} callback
   * @return {Promise}
   */
  saveCache(data, callback) {
    if (!Array.isArray(data)) {
      data = [ data ];
    }
    const list = data.map(item => {
      return {
        key: this.getPrimaryCacheKey(item, true),
        data: this.schema.serialize(item),
      };
    });
    return this.cache.saveList(list, callback);
  }

  /**
   * 删除缓存中的结果
   *
   * @param {Array|Object} data
   * @param {Function} callback
   * @return {Promise}
   */
  removeCache(data, callback) {
    if (!Array.isArray(data)) {
      data = [ data ];
    }
    const list = data.map(item => this.getPrimaryCacheKey(item, false));
    return this.cache.removeList(list, callback);
  }

  /**
   * 从缓存中查询结果
   *
   * @param {Array|Object} data
   * @param {Function} callback
   * @return {Promise}
   */
  getCache(data, callback) {
    if (!Array.isArray(data)) {
      data = [ data ];
    }
    const list = data.map(item => this.getPrimaryCacheKey(item, false));
    return this.cache.getList(list, (err, ret) => {
      if (err) return callback(err);
      if (Array.isArray(ret)) {
        callback(null, ret.map(v => this.schema.unserialize(v)));
      } else {
        callback(null, this.schema.unserialize(ret));
      }
    });
  }

  /**
   * 创建 Query
   *
   * @param {Object} options
   *   - {Boolean} format 是否格式化输出
   *   - {Function} callback 使用自定义的函数处理回调结果
   * @return {Object}
   */
  query(options) {
    options = options || {};
    return new QueryBuilder({
      table: this.tableName,
      exec: (sql, callback) => {
        callback = callback || createPromiseCallback();
        this.connection.query(sql, (err, ret) => {
          // 格式化输出
          if (ret && options.format) {
            if (Array.isArray(ret)) {
              ret = this.schema.formatOutputList(ret);
            } else {
              ret = this.schema.formatOutput(ret);
            }
          }
          if (!options.callback) {
            return callback(err, ret);
          }
          // 处理回调结果
          options.callback(err, ret, callback);
        });
        return callback.promise;
      },
    });
  }

  /**
   * 查询数据
   *
   * @return {Object}
   */
  find() {
    assert.equal(arguments.length, 0, `expected 0 argument for find() but got ${ arguments.length }`);
    return this.query({ format: true }).select('*');
  }

  /**
   * 查询一行数据
   *
   * @return {Object}
   */
  findOne() {
    assert.equal(arguments.length, 0, `expected 0 argument for findOne() but got ${ arguments.length }`);
    return this.query({
      format: true,
      callback(err, ret, callback) {
        if (err) return callback(err);
        callback(null, ret[0]);
      },
    }).select('*').limit(1);
  }

  /**
   * 查询数量
   *
   * @return {Object}
   */
  count() {
    assert.equal(arguments.length, 0, `expected 0 argument for count() but got ${ arguments.length }`);
    return this.query({
      format: false,
      callback(err, ret, callback) {
        if (err) return callback(err);
        callback(null, ret[0].c);
      },
    }).count('c').limit(1);
  }

  /**
   * 更新数据
   *
   * @param {String|Object} update
   * @param {Array|Object} values
   * @return {Object}
   */
  update(update, values) {
    // 格式化输入
    if (typeof update !== 'string') {
      update = this.schema.formatInput(update);
    }
    return this.query({ format: false }).update(update, values);
  }

  /**
   * 更新一行数据
   *
   * @param {String|Object} update
   * @param {Array|Object} values
   * @return {Object}
   */
  updateOne(update, values) {
    // 格式化输入
    if (typeof update !== 'string') {
      update = this.schema.formatInput(update);
    }
    return this.query({ format: false }).update(update, values).limit(1);
  }

  /**
   * 删除数据
   *
   * @return {Object}
   */
  delete() {
    assert.equal(arguments.length, 0, `expected 0 argument for delete() but got ${ arguments.length }`);
    return this.query({ format: false }).delete();
  }

  /**
   * 删除一行数据
   *
   * @return {Object}
   */
  deleteOne() {
    assert.equal(arguments.length, 0, `expected 0 argument for deleteOne() but got ${ arguments.length }`);
    return this.query({ format: false }).delete().limit(1);
  }

  /**
   * 插入数据
   *
   * @param {Object|Array} data
   * @return {Object}
   */
  insert(data) {
    // 格式化输入
    if (Array.isArray(data)) {
      data = this.schema.formatInputList(data);
    } else {
      data = [ this.schema.formatInput(data) ];
    }
    // 检查是否包含主键
    if (!this.primaryKeyAutoIncrement) {
      for (const item of data) {
        for (const key of this.primaryKey) {
          if (typeof item[key] === 'undefined') {
            throw new Error(`missing primary key "${ key }"`);
          }
        }
      }
    }
    return this.query({ format: false }).insert(data);
  }

  /**
   * 执行 SQL 查询
   *
   * @param {String} sql
   * @param {Array|Object} values
   * @return {Object}
   */
  sql(sql, values) {
    return this.query({ format: !isUpdateSQL(sql) }).sql(sql, values);
  }

  /**
   * 获取指定主键的数据，优先从缓存读取
   *
   * @param {Object} query
   * @param {Function} callback
   * @return {Promise}
   */
  getByPrimary(query, callback) {
    callback = callback || createPromiseCallback();
    query = this.keepPrimaryFields(query);
    // 先尝试从缓存中获取
    this.getCache(query, (err, list) => {
      if (err) return callback(err);
      const c = list && list[0];
      if (c) return callback(err, c);
      // 从数据库查询
      this.findOne().where(query).exec((err, ret) => {
        if (err) return callback(err);
        // 保存到缓存
        this.saveCache(ret, err => callback(err, ret));
      });
    });
    return callback.promise;
  }

  /**
   * 更新指定主键的数据，并更新缓存
   *
   * @param {Object} query
   * @param {Object} update
   * @param {Function} callback
   * @return {Promise}
   */
  updateByPrimary(query, update, callback) {
    callback = callback || createPromiseCallback();
    this.updateOne(update)
      .where(this.keepPrimaryFields(query))
      .exec((err, ret) => {
        if (err) return callback(err);
        this.removeCache(query, err => callback(err, ret));
      });
    return callback.promise;
  }

  /**
   * 删除主键的数据，并删除缓存
   *
   * @param {Object} query
   * @param {Function} callback
   * @return {Promise}
   */
  deleteByPrimary(query, callback) {
    callback = callback || createPromiseCallback();
    this.deleteOne()
      .where(this.keepPrimaryFields(query))
      .exec((err, ret) => {
        if (err) return callback(err);
        this.removeCache(query, err => callback(err, ret));
      });
    return callback.promise;
  }

}

module.exports = Model;
