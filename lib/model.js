'use strict';

/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

const assert = require('assert');
const {
  createPromiseCallback, sqlEscape, sqlEscapeId, sqlFormat, sqlFormatObject,
  isConnectionInstance,
} = require('lei-utils');
const coroutine = require('lei-coroutine');
const Schema = require('./schema');
const QueryBuilder = require('./query');


class Model {

  /**
   * 创建 Model
   *
   * @param {Object} options
   *   - {Object} connection
   *   - {String} table
   *   - {Object} fields 格式为 { name: info }
   */
  constructor(options) {
    options = Object.assign({}, options || {});

    assert.ok(isConnectionInstance(options.connection), `connection must be an Connection instance`);
    this._connection = options.connection;

    assert.ok(options.table, `must provide table name`);
    assert.ok(typeof options.table === 'string', `table name must be a string`);
    this._tableName = options.table;

    this.schema = new Schema(options);
  }

  newQuery() {
    return new QueryBuilder({
      table: this._tableName,
      exec: (sql, callback) => {
        return this._connection.smartQuery(sql, callback);
      },
    });
  }

  /**
   * 查询
   *
   * @return {Object}
   */
  find() {
    return this.newQuery();
  }

}

module.exports = Model;
