/**
 * super-orm
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import assert = require("assert");
import utils = require("./utils");
import connection = require("./connection");
import cache = require("./cache");
import schema = require("./schema");
import query = require("./query");
import { Callback, KVObject } from "./define";

export interface ModelBaseOptions extends schema.SchemaOptions {
  /**
   * 表名
   */
  table: string;
  /**
   * 主键
   */
  primary?: string | string[];
  /**
   * 主键是否自增
   */
  autoIncrement?: boolean;
}

export interface ModelOptions extends ModelBaseOptions {
  /**
   * Connection 实例
   */
  connection: connection.Connection;
  /**
   * Cache 实例
   */
  cache: cache.Cache;
}

export interface ModelQueryOptions {
  /**
   * 是否自动格式化查询结果
   */
  format?: boolean;
  /**
   * 回调函数
   */
  callback?: (err: Error, ret: any, callback?: Callback<any>) => void;
}

export class Model {

  public readonly connection: connection.Connection;
  public readonly cache: cache.Cache;
  public readonly tableName: string;
  public readonly primaryKey: string[];
  public readonly primaryKeyAutoIncrement: boolean;
  public readonly schema: schema.Schema;

  /**
   * 创建 Model
   */
  constructor(options: ModelOptions) {
    assert.ok(options, `missing options`);

    assert.ok(utils.isConnectionInstance(options.connection), `connection must be an Connection instance`);
    this.connection = options.connection;

    assert.ok(utils.isCacheInstance(options.cache), `cache must be an Cache instance`);
    this.cache = options.cache;

    assert.ok(options.table, `must provide table name`);
    assert.ok(typeof options.table === "string", `table name must be a string`);
    this.tableName = options.table;

    if (options.primary) {
      assert.ok(typeof options.primary === "string" || Array.isArray(options.primary), `primary must be a string or array`);
      if (Array.isArray(options.primary)) {
        options.primary.forEach(name => {
          assert.ok(typeof name === "string", `every item of primary must be a string`);
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

    this.schema = new schema.Schema(options);
  }

  /**
   * 从一行数据中获取主键标志符
   * @param data 键值对数据
   * @param strict 是否严格检查每个键的数据都存在，如果为 true 且键不存在时抛出异常，否则返回 undefined
   */
  public getPrimaryCacheKey(data: KVObject, strict?: boolean): string | void {
    assert.ok(this.primaryKey, `table "${ this.tableName }" does not have primary key`);
    let everyKeyExists = true;
    const key = this.primaryKey.map(name => {
      everyKeyExists = everyKeyExists && name in data;
      if (strict) {
        assert.ok(everyKeyExists, `missing primary key "${ name }" in this data row`);
      }
      return `${ name }_${ data[name] }`;
    }).join(":");
    if (everyKeyExists) {
      return `${ this.tableName }:r:${ key }`;
    }
  }

  /**
   * 从一行数据中保留主键的数据
   * @param data 键值对数据
   */
  public keepPrimaryFields(data: KVObject): KVObject {
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
   * @param data 键值对数据
   */
  public saveCache(data: cache.CacheDataItem, callback?: Callback<string[]>): Promise<string[]> | void;
  /**
   * 将结果保存到缓存
   * @param data 键值对数据数组
   */
  public saveCache(data: cache.CacheDataItem[], callback?: Callback<string[]>): Promise<string[]> | void;

  public saveCache(data: cache.CacheDataItem | cache.CacheDataItem[], callback?: Callback<string[]>): Promise<string[]> | void {
    if (!Array.isArray(data)) {
      data = [ data ];
    }
    const list = data.filter(item => {
      // 过滤无效的结果
      return item;
    }).map(item => {
      return {
        key: this.getPrimaryCacheKey(item, true),
        data: this.schema.serialize(item),
      };
    }).filter(item => item.key) as cache.CacheDataItem[];
    return this.cache.saveList(list, callback);
  }

  /**
   * 删除缓存中的结果
   * @param data 键值对数据
   */
  public removeCache(data: KVObject, callback?: Callback<string[]>): Promise<string[]> | void;
  /**
   * 删除缓存中的结果
   * @param data 键值对数据数组
   */
  public removeCache(data: KVObject[], callback?: Callback<string[]>): Promise<string[]> | void;

  public removeCache(data: KVObject | KVObject[], callback?: Callback<string[]>): Promise<string[]> | void {
    if (!Array.isArray(data)) {
      data = [ data ];
    }
    const list = (data as KVObject[])
                    .map(item => this.getPrimaryCacheKey(item, false))
                    .filter(key => key) as string[];
    return this.cache.removeList(list, callback);
  }

  /**
   * 从缓存中查询结果
   * @param data 键值对数据
   */
  public getCache(data: KVObject, callback?: Callback<KVObject[]>): Promise<KVObject[]> | void;
  /**
   * 从缓存中查询结果
   * @param data 键值对数据数组
   */
  public getCache(data: KVObject[], callback?: Callback<KVObject[]>): Promise<KVObject[]> | void;

  public getCache(data: KVObject | KVObject[], callback?: Callback<KVObject[]>): Promise<KVObject[]> | void {
    if (!Array.isArray(data)) {
      data = [ data ];
    }
    const list = (data as KVObject[])
                    .map(item => this.getPrimaryCacheKey(item, false))
                    .filter(key => key) as string[];
    return this.cache.getList(list, (err, ret) => {
      if (err) {
        return callback(err);
      }
      callback(null, ret.map(v => this.schema.unserialize(v)));
    });
  }

  /**
   * 创建 Query
   */
  public query(options: ModelQueryOptions = {}): query.QueryBuilder {
    return new query.QueryBuilder({
      table: this.tableName,
      exec: (sql, callback) => {
        callback = utils.wrapCallback(callback);
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
   */
  public find(): query.QueryBuilder {
    assert.equal(arguments.length, 0, `expected 0 argument for find() but got ${ arguments.length }`);
    return this.query({ format: true }).select("*");
  }

  /**
   * 查询一行数据
   */
  public findOne(): query.QueryBuilder {
    assert.equal(arguments.length, 0, `expected 0 argument for findOne() but got ${ arguments.length }`);
    return this.query({
      format: true,
      callback(err, ret, callback) {
        if (err) {
          return callback(err);
        }
        callback(null, ret[0]);
      },
    }).select("*").limit(1);
  }

  /**
   * 查询数量
   */
  public count(): query.QueryBuilder {
    assert.equal(arguments.length, 0, `expected 0 argument for count() but got ${ arguments.length }`);
    return this.query({
      format: false,
      callback(err, ret, callback) {
        if (err) {
          return callback(err);
        }
        callback(null, ret[0].c);
      },
    }).count("c").limit(1);
  }

  /**
   * 更新数据
   * @param update 键值对数据
   */
  public update(update: KVObject): query.QueryBuilder;
  /**
   * 更新数据
   * @param update SQL 语句
   */
  public update(update: string): query.QueryBuilder;
  /**
   * 更新数据
   * @param update SQL 模板语句
   * @param values 模板参数，如 { a: 123 }
   */
  public update(update: string, values: KVObject): query.QueryBuilder;
  /**
   * 更新数据
   * @param update SQL 模板语句
   * @param values 模板参数，如 [ 123 ]
   */
  public update(update: string, values: any[]): query.QueryBuilder;

  public update(update: KVObject | string, values?: KVObject | any[]): query.QueryBuilder {
    assert.ok(arguments.length === 1 || arguments.length === 2, `expected 1 or 2 argument for update() but got ${ arguments.length }`);
    assert.ok(typeof values !== "function", `update() does not expected a callback function, maybe this is what you want: update(data).exec(callback)`);
    // 格式化输入
    if (typeof update === "string") {
      return this.query({ format: false }).update(update, values);
    }
    update = this.schema.formatInput(update);
    return this.query({ format: false }).update(update);
  }

  /**
   * 更新一行数据
   * @param update 键值对数据
   */
  public updateOne(update: KVObject): query.QueryBuilder;
  /**
   * 更新一行数据
   * @param update SQL 语句
   */
  public updateOne(update: string): query.QueryBuilder;
  /**
   * 更新一行数据
   * @param update SQL 模板语句
   * @param values 模板参数，如 { a: 123 }
   */
  public updateOne(update: string, values: KVObject): query.QueryBuilder;
  /**
   * 更新一行数据
   * @param update SQL 模板语句
   * @param values 模板参数，如 [ 123 ]
   */
  public updateOne(update: string, values: any[]): query.QueryBuilder;

  public updateOne(update: KVObject | string, values?: KVObject | any[]): query.QueryBuilder {
    assert.ok(arguments.length === 1 || arguments.length === 2, `expected 1 or 2 argument for updateOne() but got ${ arguments.length }`);
    assert.ok(typeof values !== "function", `updateOne() does not expected a callback function, maybe this is what you want: updateOne(data).exec(callback)`);
    // 格式化输入
    if (typeof update === "string") {
      return this.query({ format: false }).update(update, values).limit(1);
    }
    update = this.schema.formatInput(update);
    return this.query({ format: false }).update(update);
  }

  /**
   * 删除数据
   */
  public delete(): query.QueryBuilder {
    assert.equal(arguments.length, 0, `expected 0 argument for delete() but got ${ arguments.length }`);
    return this.query({ format: false }).delete();
  }

  /**
   * 删除一行数据
   */
  public deleteOne(): query.QueryBuilder {
    assert.equal(arguments.length, 0, `expected 0 argument for deleteOne() but got ${ arguments.length }`);
    return this.query({ format: false }).delete().limit(1);
  }

  /**
   * 插入数据
   * @param data 键值对数据
   */
  public insert(data: KVObject): query.QueryBuilder;
  /**
   * 插入数据
   * @param data 键值对数据数组
   */
  public insert(data: KVObject[]): query.QueryBuilder;

  public insert(data: KVObject | KVObject[]): query.QueryBuilder {
    assert.equal(arguments.length, 1, `expected 1  argument for insert() but got ${ arguments.length }`);
    // 格式化输入
    if (Array.isArray(data)) {
      data = this.schema.formatInputList(data);
    } else {
      data = [ this.schema.formatInput(data) ];
    }
    // 检查是否包含主键（仅当主键不是自增时）
    if (!this.primaryKeyAutoIncrement) {
      for (const item of (data as KVObject[])) {
        for (const key of this.primaryKey) {
          if (typeof item[key] === "undefined") {
            throw new Error(`missing primary key "${ key }"`);
          }
        }
      }
    }
    return this.query({ format: false }).insert(data);
  }

  /**
   * 增加指定字段的值
   * @param data 键值对数据，如：{ count: 1 }
   */
  public incr(data: KVObject): query.QueryBuilder {
    assert.equal(arguments.length, 1, `expected 1  argument for incr() but got ${ arguments.length }`);
    const q = this.query({ format: false }).update();
    for (const name in data) {
      q.set("?? = ?? + (?)", [ name, name, data[name] ]);
    }
    return q;
  }

  /**
   * 执行 SQL 查询
   * @param sql SQL 语句
   */
  public sql(sql: string): query.QueryBuilder;
  /**
   * 执行 SQL 查询
   * @param sql SQL 语句模板
   * @param values 模板参数，如 { a: 123 }
   */
  public sql(sql: string, values: KVObject): query.QueryBuilder;
  /**
   * 执行 SQL 查询
   * @param sql SQL 语句模板
   * @param values 模板参数，如 [ 123 ]
   */
  public sql(sql: string, values: any[]): query.QueryBuilder;

  public sql(sql: string, values?: KVObject | any[]): query.QueryBuilder {
    assert.ok(arguments.length === 1 || arguments.length === 2, `expected 1 or 2 argument for sql() but got ${ arguments.length }`);
    assert.ok(typeof values !== "function", `sql() does not expected a callback function, maybe this is what you want: sql(str).exec(callback)`);
    return this.query({ format: !utils.isUpdateSQL(sql) }).sql(sql, values);
  }

  /**
   * 获取指定主键的数据，优先从缓存读取
   * @param query 键值对数据
   */
  public getByPrimary(query: KVObject): Promise<KVObject>;
  /**
   * 获取指定主键的数据，优先从缓存读取
   * @param query 查询条件
   * @param callback 回调函数
   */
  public getByPrimary(query: KVObject, callback: Callback<KVObject>): void;

  public getByPrimary(query: KVObject, callback?: Callback<KVObject>): Promise<KVObject> | void {
    callback = utils.wrapCallback(callback);
    query = this.keepPrimaryFields(query);
    // 先尝试从缓存中获取
    this.getCache(query, (err, list) => {
      if (err) {
        return callback(err);
      }
      const c = list && list[0];
      if (c) {
        return callback(err, c);
      }
      // 从数据库查询
      this.findOne().where(query).exec((err2, ret) => {
        if (err2) {
          return callback(err2);
        }
        // 保存到缓存
        this.saveCache(ret, err3 => callback(err3, ret));
      });
    });
    return callback.promise;
  }

  /**
   * 更新指定主键的数据，并更新缓存
   * @param query 查询条件
   * @param update 更新数据
   */
  public updateByPrimary(query: KVObject, update: KVObject): Promise<KVObject>;
  /**
   * 更新指定主键的数据，并更新缓存
   * @param query 查询条件
   * @param update 更新数据
   * @param callback 回调函数
   */
  public updateByPrimary(query: KVObject, update: KVObject, callback: Callback<KVObject>): Promise<KVObject> | void;

  public updateByPrimary(query: KVObject, update: KVObject, callback?: Callback<KVObject>): Promise<KVObject> | void {
    callback = utils.wrapCallback(callback);
    this.updateOne(update)
      .where(this.keepPrimaryFields(query))
      .exec((err, ret) => {
        if (err) {
          return callback(err);
        }
        this.removeCache(query, err2 => callback(err2, ret));
      });
    return callback.promise;
  }

  /**
   * 删除主键的数据，并删除缓存
   * @param query 查询条件
   */
  public deleteByPrimary(query: KVObject): Promise<KVObject>;
  /**
   * 删除主键的数据，并删除缓存
   * @param query 查询条件
   * @param callback 回调函数
   */
  public deleteByPrimary(query: KVObject, callback: Callback<KVObject>): Promise<KVObject> | void;

  public deleteByPrimary(query: KVObject, callback?: Callback<KVObject>): Promise<KVObject> | void {
    callback = utils.wrapCallback(callback);
    this.deleteOne()
      .where(this.keepPrimaryFields(query))
      .exec((err, ret) => {
        if (err) {
          return callback(err);
        }
        this.removeCache(query, err2 => callback(err2, ret));
      });
    return callback.promise;
  }

}
