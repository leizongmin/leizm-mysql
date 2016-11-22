'use strict';

/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const assert = require('assert');
const {
  sqlEscape, sqlEscapeId, sqlFormat,
  sqlFormatObject, sqlUpdateString, sqlLimitString,
} = require('./utils');


class QueryBuilder {

  /**
   * 创建 QueryBuilder
   *
   * @param {Object} options
   *   - {String} table
   *   - {Function} exec
   */
  constructor(options) {
    options = Object.assign({}, options || {});

    assert.ok(options.table, `must provide table name`);
    assert.ok(typeof options.table === 'string', `table name must be a string`);
    this._tableName = options.table;
    this._tableNameEscaped = sqlEscapeId(options.table);

    if (options.exec) {
      assert.ok(typeof options.exec === 'function', `exec callback must be a function`);
      this._execCallback = options.exec;
    } else {
      this._execCallback = null;
    }

    this._data = {
      fields: '*',
      conditions: [],
      type: '',
      update: [],
      insert: null,
      delete: null,
      sql: null,
      sqlTpl: null,
      sqlValues: null,
      orderFields: '',
      orderBy: '',
      skipRows: 0,
      limitRows: 0,
      limit: '',
    };
  }

  /**
   * 格式化模板字符串
   *
   * @param {String} tpl
   * @param {Object|Array} values
   * @return {String}
   */
  format(tpl, values) {
    assert.ok(typeof tpl === 'string', `first parameter must be a string`);
    assert.ok(values && (Array.isArray(values) || typeof values === 'object'), 'second parameter must be an array or object');
    if (Array.isArray(values)) {
      return sqlFormat(tpl, values);
    }
    return sqlFormatObject(tpl, values);
  }

  /**
   * 查询条件
   * 支持的形式：
   *   where('aaa=1');
   *   where({ aaa: 1, bbb: 22 })
   *   where('aaa=:a AND bbb=:b', { a: 123, b: 456 })
   *   where('aaa=? AND bbb=?', [ 123, 456 ])
   *
   * @param {String|Object} condition
   * @param {Array|Object} values
   * @return {this}
   */
  where(condition, values) {
    this._data.conditions = [];
    return this.and(condition, values);
  }

  /**
   * 查询条件
   * 支持的形式：
   *   where('aaa=1');
   *   where({ aaa: 1, bbb: 22 })
   *   where('aaa=:a AND bbb=:b', { a: 123, b: 456 })
   *   where('aaa=? AND bbb=?', [ 123, 456 ])
   *
   * @param {String|Object} condition
   * @param {Array|Object} values
   * @return {this}
   */
  and(condition, values) {
    const t = typeof condition;
    assert.ok(condition, `missing condition`);
    assert.ok(t === 'string' || t === 'object', `condition must be a string or object`);
    if (t === 'string') {
      this._data.conditions.push(this.format(condition, values || []));
    } else {
      for (const name in condition) {
        this._data.conditions.push(`${ sqlEscapeId(name) }=${ sqlEscape(condition[name]) }`);
      }
    }
    return this;
  }

  /**
   * 查询的字段
   *
   * @return {this}
   */
  select(...fields) {
    assert.ok(this._data.type === '', `cannot change query type after it was set to "${ this._data.type }"`);
    this._data.type = 'SELECT';
    return this.fields(...fields);
  }

  /**
   * 设置查询字段
   *
   * @return {this}
   */
  fields(...fields) {
    this._data.fields = fields.map(name => {
      assert.ok(name && typeof name === 'string', `field name must be a string`);
      return name === '*' ? name : sqlEscapeId(name);
    }).join(', ');
    return this;
  }

  /**
   * 查询数量
   *
   * @param {String} name
   * @return {this}
   */
  count(name) {
    this._data.type = 'SELECT';
    this._data.fields = 'COUNT(*) AS ' + sqlEscapeId(name);
    return this;
  }

  /**
   * 更新
   * 支持的形式：
   *   update('a=a+1')
   *   update('a=:a+1', { a: 123 })
   *   update('a=?+1', [ 123 ])
   *   update({ a: 1 })
   *
   * @param {String|Object} update
   * @param {Array|Object} values
   * @return {this}
   */
  update(update, values) {
    assert.ok(this._data.type === '', `cannot change query type after it was set to "${ this._data.type }"`);
    this._data.type = 'UPDATE';
    this._data.update = [];
    if (update) {
      return this.set(update, values);
    }
    return this;
  }

  /**
   * 更新
   * 支持的形式：
   *   update('a=a+1')
   *   update('a=:a+1', { a: 123 })
   *   update('a=?+1', [ 123 ])
   *   update({ a: 1 })
   *
   * @param {String|Object} update
   * @param {Array|Object} values
   * @return {this}
   */
  set(update, values) {
    const t = typeof update;
    assert.ok(this._data.type === 'UPDATE', `query type must be UPDATE, please call .update() before`);
    assert.ok(update, `missing update data`);
    assert.ok(t === 'string' || t === 'object', `first parameter must be a string or array`);
    if (t === 'string') {
      this._data.update.push(this.format(update, values || []));
    } else {
      this._data.update.push(sqlUpdateString(update));
    }
    return this;
  }

  /**
   * 插入
   *
   * @param {Object|Array} data
   * @return {this}
   */
  insert(data) {
    assert.ok(this._data.type === '', `cannot change query type after it was set to "${ this._data.type }"`);
    this._data.type = 'INSERT';
    assert.ok(data, `missing data`);
    assert.ok(typeof data === 'object', `data must be an object or array`);
    if (Array.isArray(data)) {
      assert.ok(data.length >= 1, `data array must at least have 1 item`);
    } else {
      data = [ data ];
    }
    const originFields = Object.keys(data[0]);
    const fields = originFields.map(name => sqlEscapeId(name));
    const values = [];
    for (const item of data) {
      assert.ok(item && typeof item === 'object', `every item of data array must be an object`);
      const line = [];
      for (const field of originFields) {
        assert.ok(field in item, `every item of data array must have field "${ field }"`);
        line.push(sqlEscape(item[field]));
      }
      values.push(`(${ line.join(', ') })`);
    }
    this._data.insert = `(${ fields.join(', ') }) VALUES ${ values.join(',\n') }`;
    return this;
  }

  /**
   * 删除
   *
   * @return {this}
   */
  delete() {
    assert.ok(this._data.type === '', `cannot change query type after it was set to "${ this._data.type }"`);
    this._data.type = 'DELETE';
    return this;
  }

  /**
   * 自定义SQL语句
   *
   * @param {String} sql
   * @param {Array|Object} values
   * @return {this}
   */
  sql(sql, values) {
    assert.ok(this._data.type === '', `cannot change query type after it was set to "${ this._data.type }"`);
    this._data.type = 'CUSTOM';
    this._data.sqlTpl = sql;
    this._data.sqlValues = values || [];
    return this;
  }

  /**
   * 排序方法
   *
   * @param {String} tpl
   * @param {Array|Object} values
   * @return {this}
   */
  order(tpl, values) {
    if (values) {
      this._data.orderFields = this.format(tpl, values);
    } else {
      this._data.orderFields = tpl;
    }
    this._data.orderBy = `ORDER BY ${ this._data.orderFields }`;
    this._data.orderBy = this._data.orderBy.replace(/'DESC'/ig, 'DESC').replace(/'ASC'/ig, 'ASC');
    return this;
  }

  /**
   * 跳过指定行数
   *
   * @param {Number} rows
   * @return {this}
   */
  skip(rows) {
    assert.ok(rows >= 0, `rows must >= 0`);
    this._data.skipRows = Number(rows);
    this._data.limit = sqlLimitString(this._data.skipRows, this._data.limitRows);
    return this;
  }

  /**
   * 返回指定行数
   *
   * @param {Number} rows
   * @return {this}
   */
  limit(rows) {
    assert.ok(rows >= 0, `rows must >= 0`);
    this._data.limitRows = Number(rows);
    this._data.limit = sqlLimitString(this._data.skipRows, this._data.limitRows);
    return this;
  }

  /**
   * 生成 SQL 语句
   *
   * @return {String}
   */
  build() {
    const d = this._data;
    const t = this._tableNameEscaped;
    const where = d.conditions.length > 0 ? `WHERE ${ d.conditions.join(' AND ') }` : '';
    const limit = d.limit;
    let sql;
    switch (d.type) {
    case 'SELECT':
      sql = `SELECT ${ d.fields } FROM ${ t } ${ where } ${ d.orderBy } ${ d.limit }`;
      break;
    case 'INSERT':
      sql = `INSERT INTO ${ t } ${ d.insert }`;
      break;
    case 'UPDATE':
      assert.ok(d.update.length > 0, `update data connot be empty`);
      sql = `UPDATE ${ t } SET ${ d.update.join(', ') } ${ where } ${ limit }`;
      break;
    case 'DELETE':
      sql = `DELETE FROM ${ t } ${ where } ${ limit }`;
      break;
    case 'CUSTOM':
      this._data.sql = this.format(sqlFormatObject(d.sqlTpl, {
        $table: this._tableNameEscaped,
        $orderBy: this._data.orderBy,
        $limit: this._data.limit,
        $fields: this._data.fields,
        $skipRows: this._data.skipRows,
        $limitRows: this._data.limitRows,
      }, true), d.sqlValues);
      sql = this._data.sql;
      break;
    default:
      throw new Error(`invalid query type "${ d.type }"`);
    }
    return sql.trim();
  }

  /**
   * 执行
   *
   * @param {Function} callback
   * @return {Promise}
   */
  exec(callback) {
    assert.ok(this._execCallback, `please provide a exec callback when create QueryBuilder instance`);
    return this._execCallback(this.build(), callback);
  }

}

module.exports = QueryBuilder;
