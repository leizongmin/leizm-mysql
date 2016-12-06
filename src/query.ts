/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import assert = require("assert");
import utils = require("./utils");

export interface QueryBuilderOptions {
  /**
   * 表名
   */
  table: string;
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
  (sql: string, callback?: utils.CallbackFunction<any>): void;
}

export interface QueryOptionsParams {
  /**
   * 跳过的行数
   */
  skip: number;
  /**
   * 返回的行数
   */
  limit: number;
  /**
   * 排序方向
   */
  order: string;
  /**
   * 返回字段列表
   */
  fields: string[];
}

export class QueryBuilder {

  private _tableName: string;
  private _tableNameEscaped: string;
  private _execCallback: QueryBuilderExecFunction;
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
    skipRows: number;
    limitRows: number;
    limit: string;
  };

  /**
   * 创建 QueryBuilder
   */
  constructor(options: QueryBuilderOptions) {
    assert.ok(options, `missing options`);
    assert.ok(options.table, `must provide table name`);
    assert.ok(typeof options.table === "string", `table name must be a string`);

    this._tableName = options.table;
    this._tableNameEscaped = utils.sqlEscapeId(options.table);

    if (options.exec) {
      assert.ok(typeof options.exec === "function", `exec callback must be a function`);
      this._execCallback = options.exec;
    } else {
      this._execCallback = null;
    }

    this._data = {
      fields: "*",
      conditions: [],
      type: "",
      update: [],
      insert: null,
      delete: null,
      sql: null,
      sqlTpl: null,
      sqlValues: [],
      orderFields: "",
      orderBy: "",
      skipRows: 0,
      limitRows: 0,
      limit: "",
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
  public format(tpl: string, values: utils.KeyValueObject): string;
  /**
   * 格式化模板字符串
   * @param tpl 模板字符串
   * @param values 参数数组
   */
  public format(tpl: string, values: any[]): string;

  public format(tpl: string, values?: utils.KeyValueObject | any[]): string {
    assert.ok(typeof tpl === "string", `first parameter must be a string`);
    if (!values) {
      return tpl;
    }
    assert.ok(values && (Array.isArray(values) || typeof values === "object"), "second parameter must be an array or object");
    if (Array.isArray(values)) {
      return utils.sqlFormat(tpl, values);
    }
    return utils.sqlFormatObject(tpl, values);
  }

  /**
   * 查询条件
   * @param condition 键值对数据：{ aaa: 1, bbb: 22 })
   */
  public where(condition: utils.KeyValueObject): this;
  /**
   * 查询条件
   * @param condition SQL 语句
   */
  public where(condition: string): this;
  /**
   * 查询条件
   * @param condition 模板字符串，可以为 ('aaa=:a AND bbb=:b', { a: 123, b: 456 }) 或 ('aaa=? AND bbb=?', [ 123, 456 ])
   */
  public where(condition: string, values: utils.KeyValueObject | any[]): this;

  public where(condition: utils.KeyValueObject | string, values?: utils.KeyValueObject | any[]): this {
    this._data.conditions = [];
    if (typeof condition === "string") {
      return this.and(condition, values);
    }
    return this.and(condition);
  }

  /**
   * 查询条件
   * @param condition 键值对数据：{ aaa: 1, bbb: 22 })
   */
  public and(condition: utils.KeyValueObject): this;
  /**
   * 查询条件
   * @param condition SQL 语句
   */
  public and(condition: string): this;
  /**
   * 查询条件
   * @param condition 模板字符串，可以为 ('aaa=:a AND bbb=:b', { a: 123, b: 456 })
   */
  public and(condition: string, values: utils.KeyValueObject): this;
  /**
   * 查询条件
   * @param condition 模板字符串，可以为 ('aaa=? AND bbb=?', [ 123, 456 ])
   */
  public and(condition: string, values: any[]): this;

  public and(condition: utils.KeyValueObject | string, values?: utils.KeyValueObject | any[]): this {
    const t = typeof condition;
    assert.ok(condition, `missing condition`);
    assert.ok(t === "string" || t === "object", `condition must be a string or object`);
    if (typeof condition === "string") {
      this._data.conditions.push(this.format(condition, values || []));
    } else {
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
    assert.ok(this._data.type === "", `cannot change query type after it was set to "${ this._data.type }"`);
    this._data.type = "SELECT";
    return this.fields(...fields);
  }

  /**
   * 设置查询字段
   * @param fields 要查询的字段
   */
  public fields(...fields: string[]): this {
    this._data.fields = fields.map(name => {
      assert.ok(name && typeof name === "string", `field name must be a string`);
      return name === "*" ? name : utils.sqlEscapeId(name);
    }).join(", ");
    return this;
  }

  /**
   * 查询数量
   * @param name 存储结果的字段名
   */
  public count(name: string): this {
    this._data.type = "SELECT";
    this._data.fields = "COUNT(*) AS " + utils.sqlEscapeId(name);
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
  public update(update: utils.KeyValueObject): this;
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
  public update(update: string, values: utils.KeyValueObject): this;
  /**
   * 更新
   * @param update SQL 语句模板，如 a=?
   * @param values 模板参数，如 [ 123 ]
   */
  public update(update: string, values: any[]): this;

  public update(update?: utils.KeyValueObject | string, values?: utils.KeyValueObject | any[]): this {
    assert.ok(this._data.type === "", `cannot change query type after it was set to "${ this._data.type }"`);
    this._data.type = "UPDATE";
    this._data.update = [];
    if (update) {
      if (typeof update === "string") {
        return this.set(update, values);
      }
      return this.set(update);
    }
    return this;
  }

  /**
   * 更新
   * @param update 键值对数据，如 { a: 123, b: 456 }
   */
  public set(update: utils.KeyValueObject): this;
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
  public set(update: string, values: utils.KeyValueObject): this;
  /**
   * 更新
   * @param update SQL 语句模板，如 a=?
   * @param values 模板参数，如 [ 123 ]
   */
  public set(update: string, values: any[]): this;

  public set(update: utils.KeyValueObject | string, values?: utils.KeyValueObject | any[]): this {
    const t = typeof update;
    assert.ok(this._data.type === "UPDATE", `query type must be UPDATE, please call .update() before`);
    assert.ok(update, `missing update data`);
    assert.ok(t === "string" || t === "object", `first parameter must be a string or array`);
    if (typeof update === "string") {
      this._data.update.push(this.format(update, values || []));
    } else {
      this._data.update.push(utils.sqlUpdateString(update));
    }
    return this;
  }

  /**
   * 插入
   * @param data 键值对数据
   */
  public insert(data: utils.KeyValueObject): this;
  /**
   * 插入
   * @param data 键值对数据数组
   */
  public insert(data: utils.KeyValueObject[]): this;

  public insert(data: utils.KeyValueObject | utils.KeyValueObject[]): this {
    assert.ok(this._data.type === "", `cannot change query type after it was set to "${ this._data.type }"`);
    this._data.type = "INSERT";
    assert.ok(data, `missing data`);
    assert.ok(typeof data === "object", `data must be an object or array`);
    if (Array.isArray(data)) {
      assert.ok(data.length >= 1, `data array must at least have 1 item`);
    } else {
      data = [ data ];
    }
    const originFields = Object.keys(data[0]);
    const fields = originFields.map(name => utils.sqlEscapeId(name));
    const values: string[] = [];
    for (const item of (data as utils.KeyValueObject[])) {
      assert.ok(item && typeof item === "object", `every item of data array must be an object`);
      const line: string[] = [];
      for (const field of originFields) {
        assert.ok(field in item, `every item of data array must have field "${ field }"`);
        line.push(utils.sqlEscape(item[field]));
      }
      values.push(`(${ line.join(", ") })`);
    }
    this._data.insert = `(${ fields.join(", ") }) VALUES ${ values.join(",\n") }`;
    return this;
  }

  /**
   * 删除
   */
  public delete(): this {
    assert.ok(this._data.type === "", `cannot change query type after it was set to "${ this._data.type }"`);
    this._data.type = "DELETE";
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
  public sql(sql: string, values: utils.KeyValueObject): this;
  /**
   * 自定义SQL语句
   * @param sql SQL 查询语句
   * @param values 模板参数，如 [ 123 ]
   */
  public sql(sql: string, values: any[]): this;

  public sql(sql: string, values?: utils.KeyValueObject | any[]): this {
    assert.ok(this._data.type === "", `cannot change query type after it was set to "${ this._data.type }"`);
    this._data.type = "CUSTOM";
    this._data.sqlTpl = sql;
    this._data.sqlValues = Array.isArray(values) ? values : [];
    return this;
  }

  /**
   * 排序方法
   * @param tpl SQL 查询语句
   */
  public order(tpl: string): this;
  /**
   * 排序方法
   * @param tpl SQL 查询语句
   * @param values 模板参数，如 { a: 123 }
   */
  public order(tpl: string, values: utils.KeyValueObject): this;
  /**
   * 排序方法
   * @param tpl SQL 查询语句
   * @param values 模板参数，如 [ 123 ]
   */
  public order(tpl: string, values: any[]): this;

  public order(tpl: string, values?: utils.KeyValueObject | any[]): this {
    if (values) {
      this._data.orderFields = this.format(tpl, values);
    } else {
      this._data.orderFields = tpl;
    }
    this._data.orderBy = `ORDER BY ${ this._data.orderFields }`;
    this._data.orderBy = this._data.orderBy.replace(/'DESC'/ig, "DESC").replace(/'ASC'/ig, "ASC");
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
   * @param options 选项，包含 { skip, limit, order, fields }
   */
  public options(options: QueryOptionsParams): this {
    assert.ok(options, `options must be an Object`);
    for (const name in options) {
      switch (name) {
      case "skip":
        this.skip(options.skip);
        break;
      case "limit":
        this.limit(options.limit);
        break;
      case "order":
        this.order(options.order);
        break;
      case "fields":
        this.fields(...options.fields);
        break;
      default:
        // do nothing
      }
    }
    return this;
  }

  /**
   * 生成 SQL 语句
   */
  public build(): string {
    const d = this._data;
    const t = this._tableNameEscaped;
    const where = d.conditions.length > 0 ? `WHERE ${ d.conditions.join(" AND ") }` : "";
    const limit = d.limit;
    let sql: string;
    switch (d.type) {
    case "SELECT":
      sql = `SELECT ${ d.fields } FROM ${ t } ${ where } ${ d.orderBy } ${ d.limit }`;
      break;
    case "INSERT":
      sql = `INSERT INTO ${ t } ${ d.insert }`;
      break;
    case "UPDATE":
      assert.ok(d.update.length > 0, `update data connot be empty`);
      sql = `UPDATE ${ t } SET ${ d.update.join(", ") } ${ where } ${ limit }`;
      break;
    case "DELETE":
      sql = `DELETE FROM ${ t } ${ where } ${ limit }`;
      break;
    case "CUSTOM":
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
    default:
      throw new Error(`invalid query type "${ d.type }"`);
    }
    return sql.trim();
  }

  /**
   * 执行
   */
  public exec(callback?: utils.CallbackFunction<any>): Promise<any> | void {
    assert.ok(this._execCallback, `please provide a exec callback when create QueryBuilder instance`);
    callback = utils.tryCreatePromiseCallback<any>(callback);
    this._execCallback(this.build(), callback);
    return callback.promise;
  }

}
