/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import assert = require('assert');
import utils = require('./utils');
import { Callback } from './define';
import { Schema } from './schema';

export interface QueryBuilderOptions {
  /**
   * 表名
   */
  table: string;
  /**
   * 可选的 Schema
   */
  schema?: Schema;
  /**
   * 执行查询
   */
  exec: QueryBuilderExecFunction;
}

export interface QueryBuilderExecFunction {
  /**
   * 执行查询
   * @param sql SQL 语句
   * @param callback 回调函数
   */
  (sql: string, callback?: Callback<any>): void;
}

export interface QueryOptionsParams {
  /**
   * 跳过的行数
   */
  skip?: number;
  /**
   * 返回的行数
   */
  limit?: number;
  /**
   * 排序方向
   */
  orderBy?: string;
  /**
   * 分组
   */
  groupBy?: string;
  /**
   * 返回字段列表
   */
  fields?: string[];
}

export class QueryBuilder {

  private _tableName: string;
  private _tableNameEscaped: string;
  private _execCallback: QueryBuilderExecFunction | null;
  private _data: {
    fields: string;
    conditions: string[];
    type: string;
    update: string[];
    insert: string;
    delete: string;
    sql: string;
    sqlTpl: string;
    sqlValues: any[];
    orderFields: string;
    orderBy: string;
    groupBy: string;
    groupByFields: string;
    skipRows: number;
    limitRows: number;
    limit: string;
  };
  private _schema: Schema;

  /**
   * 创建 QueryBuilder
   */
  constructor(options: QueryBuilderOptions) {
    assert.ok(options, `missing options`);
    assert.ok(options.table, `must provide table name`);
    assert.ok(typeof options.table === 'string', `table name must be a string`);

    this._tableName = options.table;
    this._tableNameEscaped = utils.sqlEscapeId(options.table);

    if (options.exec) {
      assert.ok(typeof options.exec === 'function', `exec callback must be a function`);
      this._execCallback = options.exec;
    } else {
      this._execCallback = null;
    }

    if (options.schema) {
      this._schema = options.schema;
    }

    this._data = {
      fields: '*',
      conditions: [],
      type: '',
      update: [],
      insert: '',
      delete: '',
      sql: '',
      sqlTpl: '',
      sqlValues: [],
      orderFields: '',
      orderBy: '',
      groupBy: '',
      groupByFields: '',
      skipRows: 0,
      limitRows: 0,
      limit: '',
    };
  }

  /**
   * 格式化模板字符串
   * @param tpl 模板字符串
   */
  public format(tpl: string): string;
  /**
   * 格式化模板字符串
   * @param tpl 模板字符串
   * @param values 键值对数据
   */
  public format(tpl: string, values: Record<string, any>): string;
  /**
   * 格式化模板字符串
   * @param tpl 模板字符串
   * @param values 参数数组
   */
  public format(tpl: string, values: any[]): string;

  public format(tpl: string, values?: Record<string, any> | any[]): string {
    assert.ok(typeof tpl === 'string', `first parameter must be a string`);
    if (!values) {
      return tpl;
    }
    assert.ok(values && (Array.isArray(values) || typeof values === 'object'), 'second parameter must be an array or object');
    if (Array.isArray(values)) {
      return utils.sqlFormat(tpl, values);
    }
    return utils.sqlFormatObject(tpl, values);
  }

  /**
   * 查询条件
   * @param condition 键值对数据：{ aaa: 1, bbb: 22 })
   */
  public where(condition: Record<string, any>): this;
  /**
   * 查询条件
   * @param condition SQL 语句
   */
  public where(condition: string): this;
  /**
   * 查询条件
   * @param condition 模板字符串，可以为 ('aaa=:a AND bbb=:b', { a: 123, b: 456 }) 或 ('aaa=? AND bbb=?', [ 123, 456 ])
   */
  public where(condition: string, values: Record<string, any> | any[]): this;

  public where(condition: Record<string, any> | string, values?: Record<string, any> | any[]): this {
    if (typeof condition === 'string') {
      if (values) {
        return this.and(condition, values);
      }
      return this.and(condition);
    }
    return this.and(condition);
  }

  /**
   * 查询条件
   * @param condition 键值对数据：{ aaa: 1, bbb: 22 })
   */
  public and(condition: Record<string, any>): this;
  /**
   * 查询条件
   * @param condition SQL 语句
   */
  public and(condition: string): this;
  /**
   * 查询条件
   * @param condition 模板字符串，可以为 ('aaa=:a AND bbb=:b', { a: 123, b: 456 })
   */
  public and(condition: string, values: Record<string, any>): this;
  /**
   * 查询条件
   * @param condition 模板字符串，可以为 ('aaa=? AND bbb=?', [ 123, 456 ])
   */
  public and(condition: string, values: any[]): this;

  public and(condition: Record<string, any> | string, values?: Record<string, any> | any[]): this {
    const t = typeof condition;
    assert.ok(condition, `missing condition`);
    assert.ok(t === 'string' || t === 'object', `condition must be a string or object`);
    if (typeof condition === 'string') {
      if (this._data.type !== 'SELECT') {
        // 如果是更改操作，检查 condition 不能为空
        assert.ok(condition.trim(), `modify condition cannot be empty`);
      }
      this._data.conditions.push(this.format(condition, values || []));
    } else {
      if (this._schema) {
        condition = this._schema.formatInput(condition);
      }
      if (this._data.type !== 'SELECT') {
        // 如果是更改操作，检查 condition 不能为空
        assert.ok(Object.keys(condition).length > 0, `modify condition cannot be empty`);
      }
      for (const name in condition) {
        this._data.conditions.push(`${ utils.sqlEscapeId(name) }=${ utils.sqlEscape(condition[name]) }`);
      }
    }
    return this;
  }

  /**
   * 查询的字段
   * @param fields 要查询的字段
   */
  public select(...fields: string[]): this {
    assert.ok(this._data.type === '', `cannot change query type after it was set to "${ this._data.type }"`);
    this._data.type = 'SELECT';
    return this.fields(...fields);
  }

  /**
   * 设置查询字段
   * @param fields 要查询的字段
   */
  public fields(...fields: string[]): this {
    assert.ok(!(this._data.fields && this._data.fields !== '*'), `cannot change fields after it has been set`);
    this._data.fields = fields.map(name => {
      assert.ok(name && typeof name === 'string', `field name must be a string`);
      return name === '*' ? name : utils.sqlEscapeId(name);
    }).join(', ');
    return this;
  }

  /**
   * 查询数量
   * @param name 存储结果的字段名
   */
  public count(name: string): this {
    assert.ok(this._data.type === '', `cannot change query type after it was set to "${ this._data.type }"`);
    this._data.type = 'SELECT';
    this._data.fields = 'COUNT(*) AS ' + utils.sqlEscapeId(name);
    return this;
  }

  /**
   * 更新
   */
  public update(): this;
  /**
   * 更新
   * @param update 键值对数据，如 { a: 123, b: 456 }
   */
  public update(update: Record<string, any>): this;
  /**
   * 更新
   * @param update SQL 语句，如 a=a+1
   */
  public update(update: string): this;
  /**
   * 更新
   * @param update SQL 语句模板，如 a=:a
   * @param values 模板参数，如 { a: 123 }
   */
  public update(update: string, values: Record<string, any>): this;
  /**
   * 更新
   * @param update SQL 语句模板，如 a=?
   * @param values 模板参数，如 [ 123 ]
   */
  public update(update: string, values: any[]): this;

  public update(update?: Record<string, any> | string, values?: Record<string, any> | any[]): this {
    assert.ok(this._data.type === '', `cannot change query type after it was set to "${ this._data.type }"`);
    this._data.type = 'UPDATE';
    this._data.update = [];
    if (update) {
      if (typeof update === 'string') {
        if (values) {
          return this.set(update, values);
        }
        return this.set(update);
      }
      return this.set(update);
    }
    return this;
  }

  /**
   * 更新
   * @param update 键值对数据，如 { a: 123, b: 456 }
   */
  public set(update: Record<string, any>): this;
  /**
   * 更新
   * @param update SQL 语句，如 a=a+1
   */
  public set(update: string): this;
  /**
   * 更新
   * @param update SQL 语句模板，如 a=:a
   * @param values 模板参数，如 { a: 123 }
   */
  public set(update: string, values: Record<string, any>): this;
  /**
   * 更新
   * @param update SQL 语句模板，如 a=?
   * @param values 模板参数，如 [ 123 ]
   */
  public set(update: string, values: any[]): this;

  public set(update: Record<string, any> | string, values?: Record<string, any> | any[]): this {
    const t = typeof update;
    assert.ok(this._data.type === 'UPDATE', `query type must be UPDATE, please call .update() before`);
    assert.ok(update, `missing update data`);
    assert.ok(t === 'string' || t === 'object', `first parameter must be a string or array`);
    if (typeof update === 'string') {
      this._data.update.push(this.format(update, values || []));
    } else {
      if (this._schema) {
        update = this._schema.formatInput(update);
      }
      const sql = utils.sqlUpdateString(update);
      if (sql) {
        this._data.update.push(sql);
      }
    }
    return this;
  }

  /**
   * 插入
   * @param data 键值对数据
   */
  public insert(data: Record<string, any>): this;
  /**
   * 插入
   * @param data 键值对数据数组
   */
  public insert(data: Array<Record<string, any>>): this;

  public insert(data: Record<string, any> | Array<Record<string, any>>): this {
    assert.ok(this._data.type === '', `cannot change query type after it was set to "${ this._data.type }"`);
    this._data.type = 'INSERT';
    assert.ok(data, `missing data`);
    assert.ok(typeof data === 'object', `data must be an object or array`);
    if (Array.isArray(data)) {
      assert.ok(data.length >= 1, `data array must at least have 1 item`);
    } else {
      data = [ data ];
    }

    let list: Array<Record<string, any>> = (data as Array<Record<string, any>>);
    if (this._schema) {
      list = list.map(item => this._schema.formatInput(item));
    }

    const originFields = Object.keys(list[0]);
    const fields = originFields.map(name => utils.sqlEscapeId(name));
    const values: string[] = [];
    for (const item of list) {
      assert.ok(item && typeof item === 'object', `every item of data array must be an object`);
      const line: string[] = [];
      for (const field of originFields) {
        assert.ok(field in item, `every item of data array must have field "${ field }"`);
        line.push(utils.sqlEscape(item[field]));
      }
      values.push(`(${ line.join(', ') })`);
    }
    this._data.insert = `(${ fields.join(', ') }) VALUES ${ values.join(',\n') }`;
    return this;
  }

  /**
   * 删除
   */
  public delete(): this {
    assert.ok(this._data.type === '', `cannot change query type after it was set to "${ this._data.type }"`);
    this._data.type = 'DELETE';
    return this;
  }

  /**
   * 自定义SQL语句
   * @param sql SQL 查询语句
   */
  public sql(sql: string): this;
  /**
   * 自定义SQL语句
   * @param sql SQL 查询语句
   * @param values 模板参数，如 { a: 123 }
   */
  public sql(sql: string, values: Record<string, any>): this;
  /**
   * 自定义SQL语句
   * @param sql SQL 查询语句
   * @param values 模板参数，如 [ 123 ]
   */
  public sql(sql: string, values: any[]): this;

  public sql(sql: string, values?: Record<string, any> | any[]): this {
    assert.ok(this._data.type === '', `cannot change query type after it was set to "${ this._data.type }"`);
    this._data.type = 'CUSTOM';
    this._data.sqlTpl = sql;
    this._data.sqlValues = Array.isArray(values) ? values : [];
    return this;
  }

  /**
   * 排序方法
   * @param tpl SQL 查询语句
   */
  public orderBy(tpl: string): this;
  /**
   * 排序方法
   * @param tpl SQL 查询语句
   * @param values 模板参数，如 { a: 123 }
   */
  public orderBy(tpl: string, values: Record<string, any>): this;
  /**
   * 排序方法
   * @param tpl SQL 查询语句
   * @param values 模板参数，如 [ 123 ]
   */
  public orderBy(tpl: string, values: any[]): this;

  public orderBy(tpl: string, values?: Record<string, any> | any[]): this {
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
   * 分组方法
   * @param tpl SQL 查询语句
   */
  public groupBy(tpl: string): this;
  /**
   * 分组方法
   * @param tpl SQL 查询语句
   * @param values 模板参数，如 { a: 123 }
   */
  public groupBy(tpl: string, values: Record<string, any>): this;
  /**
   * 分组方法
   * @param tpl SQL 查询语句
   * @param values 模板参数，如 [ 123 ]
   */
  public groupBy(tpl: string, values: any[]): this;

  public groupBy(tpl: string, values?: Record<string, any> | any[]): this {
    if (values) {
      this._data.groupByFields = this.format(tpl, values);
    } else {
      this._data.groupByFields = tpl;
    }
    this._data.groupBy = `GROUP BY ${ this._data.groupByFields }`;
    this._data.groupBy = this._data.groupBy.replace(/'DESC'/ig, 'DESC').replace(/'ASC'/ig, 'ASC');
    return this;
  }

  /**
   * 跳过指定行数
   * @param rows 行数
   */
  public skip(rows: number): this {
    assert.ok(rows >= 0, `rows must >= 0`);
    this._data.skipRows = Number(rows);
    this._data.limit = utils.sqlLimitString(this._data.skipRows, this._data.limitRows);
    return this;
  }

  /**
   * 返回指定行数
   * @param rows 行数
   */
  public limit(rows: number): this {
    assert.ok(rows >= 0, `rows must >= 0`);
    this._data.limitRows = Number(rows);
    this._data.limit = utils.sqlLimitString(this._data.skipRows, this._data.limitRows);
    return this;
  }

  /**
   * 批量设置 options
   * @param options 选项，包含 { skip, limit, orderBy, groupBy, fields }
   */
  public options(options: QueryOptionsParams): this {
    assert.ok(options, `options must be an Object`);
    if (typeof options.skip !== 'undefined') {
      this.skip(options.skip);
    }
    if (typeof options.limit !== 'undefined') {
      this.limit(options.limit);
    }
    if (typeof options.orderBy !== 'undefined') {
      this.orderBy(options.orderBy);
    }
    if (typeof options.groupBy !== 'undefined') {
      this.groupBy(options.groupBy);
    }
    if (typeof options.fields !== 'undefined') {
      this.fields(...options.fields);
    }
    return this;
  }

  /**
   * 生成 SQL 语句
   */
  public build(): string {
    const d = this._data;
    const t = this._tableNameEscaped;
    d.conditions = d.conditions.map(v => v.trim()).filter(v => v);
    const where = d.conditions.length > 0 ? `WHERE ${ d.conditions.join(' AND ') }` : '';
    const limit = d.limit;
    let sql: string;
    switch (d.type) {
    case 'SELECT': {
      const tail = utils.joinMultiString(where, d.groupBy, d.orderBy, d.limit);
      sql = `SELECT ${ d.fields } FROM ${ t } ${ tail }`;
      break;
    }
    case 'INSERT': {
      sql = `INSERT INTO ${ t } ${ d.insert }`;
      break;
    }
    case 'UPDATE': {
      assert.ok(d.update.length > 0, `update data connot be empty`);
      const tail = utils.joinMultiString(where, limit);
      sql = `UPDATE ${ t } SET ${ d.update.join(', ') } ${ tail }`;
      break;
    }
    case 'DELETE': {
      const tail = utils.joinMultiString(where, limit);
      sql = `DELETE FROM ${ t } ${ tail }`;
      break;
    }
    case 'CUSTOM': {
      this._data.sql = this.format(utils.sqlFormatObject(d.sqlTpl, {
        $table: this._tableNameEscaped,
        $orderBy: this._data.orderBy,
        $limit: this._data.limit,
        $fields: this._data.fields,
        $skipRows: this._data.skipRows,
        $limitRows: this._data.limitRows,
      }, true), d.sqlValues);
      sql = this._data.sql;
      break;
    }
    default:
      throw new Error(`invalid query type "${ d.type }"`);
    }
    return sql.trim();
  }

  /**
   * 执行
   */
  public exec(callback?: Callback<any>): Promise<any> | void {
    const cb = utils.wrapCallback<any>(callback);
    if (this._execCallback) {
      this._execCallback(this.build(), cb);
    } else {
      process.nextTick(() => cb(new Error(`please provide a exec callback when create QueryBuilder instance`)));
    }
    return cb.promise;
  }

}
